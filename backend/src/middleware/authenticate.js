// WHAT: Protects routes by requiring a valid JWT cookie.
// WHY: This is the backend enforcement spec section 6/36 insists on —
//      "never rely only on frontend authorization." Any route that
//      uses this middleware is guaranteed req.user exists and is real,
//      regardless of what the frontend does or doesn't check.
// HOW: Read the token from the cookie (never from a header or body —
//      we deliberately only accept it via the HTTP-only cookie), verify
//      its signature, then load the actual current user from MongoDB.
//      We re-fetch from the DB rather than trusting the token's payload
//      alone, so a suspended user (isSuspended: true) is blocked
//      immediately rather than staying valid until their token expires.

import { verifyAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME } from "../utils/cookieOptions.js";
import { User } from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async function authenticate(req, res, next) {
  const token = req.cookies[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ success: false, message: "You must be logged in" });
  }

  // verifyAccessToken throws on invalid/expired tokens; asyncHandler
  // catches that and forwards it to errorHandler, which already knows
  // how to turn JsonWebTokenError/TokenExpiredError into a 401.
  const payload = verifyAccessToken(token);

  const user = await User.findById(payload.sub);

  if (!user) {
    return res.status(401).json({ success: false, message: "Account no longer exists" });
  }

  if (user.isSuspended) {
    return res.status(403).json({ success: false, message: "This account has been suspended" });
  }

  req.user = user;
  next();
});
