// WHAT: Wraps jsonwebtoken's sign/verify so nothing else in the app
//       needs to import `jsonwebtoken` directly or remember the secret.
// WHY: If we ever change what goes INSIDE the token payload, or switch
//      signing algorithms, this is the one place to change it.

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Creates a signed JWT containing just the user's ID.
 * Deliberately minimal payload — the token is a proof of identity,
 * not a place to cache user data (that goes stale; always re-fetch
 * fresh user data from MongoDB when needed).
 */
export function generateAccessToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * Verifies a token and returns its decoded payload.
 * Throws if the token is invalid or expired — callers (the auth
 * middleware) are expected to catch this and respond with 401.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
