// WHAT: Limits how many login attempts a single IP can make.
// WHY: Without this, someone could script thousands of password
//      guesses against one account per minute. This is a targeted
//      limiter for the highest-risk endpoint; a broader, app-wide
//      rate limiter (covering all routes) is part of Phase 16's
//      security hardening pass.

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
