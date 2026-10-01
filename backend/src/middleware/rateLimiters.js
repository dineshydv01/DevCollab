// WHAT: Rate limiters for specific high-risk endpoints, plus one
//       general-purpose limiter for the whole API.
// WHY three separate limiters rather than one: login and registration
//      face a fundamentally different risk (credential stuffing /
//      automated account creation) than the rest of the API, and
//      deserve tighter, purpose-specific limits. A single global
//      number would have to be loose enough not to block normal use
//      of those two endpoints, which would make it too loose to
//      actually protect them.

import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in a few minutes.",
  },
});

// New in Phase 16: registration had NO rate limiting at all until
// now — the one auth endpoint that was fully exposed to automated
// account-creation spam.
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 new accounts per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many accounts created from this network. Please try again later.",
  },
});

// New in Phase 16: applied globally in app.js, ahead of every route.
// Deliberately generous — this isn't meant to shape normal traffic,
// just to cut off obvious abuse (a script hammering the API) that the
// endpoint-specific limiters above don't cover, since those only
// guard two routes.
export const globalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per window across the whole API
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this network. Please slow down and try again shortly.",
  },
});
