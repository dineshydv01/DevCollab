// WHAT: A wrapper for async Express route handlers.
// WHY: Express does NOT automatically catch errors thrown inside an
//      `async` function — an unhandled rejection there just hangs the
//      request or crashes the process, depending on Node version.
//      Wrapping every controller in try/catch manually is repetitive
//      and easy to forget. This wrapper does it once, generically.
// HOW: Calls the handler, and if the returned promise rejects, passes
//      the error to next(), which routes it to our centralized
//      errorHandler middleware.

export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
