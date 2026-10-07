import { User } from "../models/User.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "../utils/cookieOptions.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const register = asyncHandler(async function register(req, res) {
  const { fullName, username, email, password } = req.body;

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
    data: user,
  });
});

export const login = asyncHandler(async function login(req, res) {
  // "email" may actually be a username here — see loginSchema's
  // comment in auth.validator.js for why the field name stayed the
  // same while what it accepts was relaxed.
  const { email, password } = req.body;

  const user = await User.findOne({ $or: [{ email }, { username: email }] }).select("+password");

  // Deliberately vague error message — "account not found" vs "wrong
  // password" as separate messages lets an attacker enumerate which
  // emails/usernames are registered. Always say the same thing for
  // both cases.
  const invalidMessage = "Invalid email/username or password";

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
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const getMe = asyncHandler(async function getMe(req, res) {
  res.status(200).json({ success: true, data: req.user });
});
