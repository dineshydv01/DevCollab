// WHAT: A tiny helper for throwing an Error that already carries the
//       HTTP status code it should map to.
// WHY: Service functions (like the ones in this phase) need to signal
//      "this specific business rule was violated, respond with 409"
//      without importing Express or `res` — services shouldn't know
//      anything about HTTP. Throwing a plain Error with a .statusCode
//      property, then letting errorHandler.js read that property, is
//      the mechanism that already exists (see errorHandler.js's
//      `const status = err.statusCode || 500` line) — this just makes
//      creating those errors a one-liner instead of three.

export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
