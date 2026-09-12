// WHAT: The four auth operations.
// WHY these live in a controller, not a route file: routes should only
//      describe "which URL maps to which function" — the actual logic
//      belongs here, per the Routes -> Controllers -> Services -> Models
//      layering from spec section 5.
// Note: there's no separate auth.service.js yet — this logic is thin
//      enough (a few DB calls + token generation) to live directly in
//      the controller. We'll introduce a service layer for genuinely
//      complex logic like matching.service.js in Phase 7. Not every
//      controller needs a service underneath it — that would be
//      over-engineering for logic this simple (see spec section 66).

import { User } from "../models/User.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "../utils/cookieOptions.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const register = asyncHandler(async function register(req, res) {
  const { fullName, username, email, password } = req.body;
  // confirmPassword was already validated to match and isn't needed beyond that.

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return res.status(409).json({ success: false, message: `That ${field} is already in use` });
  }

  const user = await User.create({ fullName, username, email, password });

  const token = generateAccessToken(user._id);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: user, // password is stripped automatically by the toJSON transform on the model
  });
});

export const login = asyncHandler(async function login(req, res) {
  const { email, password } = req.body;

  // .select('+password') is required because the schema marks password
  // as select:false by default — we need it here JUST to compare, then
  // it's never included in the response (toJSON strips it either way).
  const user = await User.findOne({ email }).select("+password");

  // Deliberately vague error message — "email not found" vs "wrong
  // password" as separate messages lets an attacker enumerate which
  // emails are registered. Always say the same thing for both cases.
  const invalidMessage = "Invalid email or password";

  if (!user) {
    return res.status(401).json({ success: false, message: invalidMessage });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: invalidMessage });
  }

  if (user.isSuspended) {
    return res.status(403).json({ success: false, message: "This account has been suspended" });
  }

  const token = generateAccessToken(user._id);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: user,
  });
});

export const logout = asyncHandler(async function logout(req, res) {
  // Must pass the SAME options (minus maxAge) used when setting the
  // cookie, or some browsers won't recognize it as the same cookie
  // and won't actually clear it.
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const getMe = asyncHandler(async function getMe(req, res) {
  // req.user was already attached by the `authenticate` middleware —
  // this route can't even be reached without a valid session.
  res.status(200).json({ success: true, data: req.user });
});
