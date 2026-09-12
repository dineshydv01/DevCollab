// WHAT: The single place that turns a thrown/passed error into a
//       consistent JSON response.
// WHY: Spec section 35 — consistent { success, message } shape, correct
//      HTTP status codes, and never leaking stack traces to the client
//      in production. This is a working baseline for Phase 3; Phase 16
//      will add custom error classes (e.g. NotFoundError, ForbiddenError)
//      for more precise status codes across the whole app.
//
// Express recognizes this as error-handling middleware specifically
// because it has FOUR parameters (err, req, res, next) — that's not
// optional, Express checks the function's arity.

import { env } from "../config/env.js";

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Mongoose validation errors (e.g. failed schema validators)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // Mongoose duplicate key error (e.g. unique email/username violated)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ success: false, message: `That ${field} is already in use` });
  }

  // JWT errors from jsonwebtoken (expired/invalid token)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? "Internal server error" : err.message;

  if (status === 500) {
    // Always log the real error server-side, even though we hide it from the client.
    console.error("[Unhandled error]", err);
  }

  res.status(status).json({
    success: false,
    message,
    // Stack traces only ever appear outside production, and only here.
    ...(env.nodeEnv !== "production" && status === 500 ? { stack: err.stack } : {}),
  });
}
