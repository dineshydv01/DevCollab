import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  githubAuthRedirect,
  githubAuthCallback,
  googleAuthRedirect,
  googleAuthCallback,
} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginRateLimiter, registerRateLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// POST /api/auth/register
router.post("/register", registerRateLimiter, validate(registerSchema), register);

// POST /api/auth/login
router.post("/login", loginRateLimiter, validate(loginSchema), login);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me
router.get("/me", authenticate, getMe);

// --- OAuth: GitHub ---
// GET /api/auth/github
router.get("/github", githubAuthRedirect);
// GET /api/auth/github/callback
router.get("/github/callback", githubAuthCallback);

// --- OAuth: Google ---
// GET /api/auth/google
router.get("/google", googleAuthRedirect);
// GET /api/auth/google/callback
router.get("/google/callback", googleAuthCallback);

export default router;

