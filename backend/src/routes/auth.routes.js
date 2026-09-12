import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginRateLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// POST /api/auth/register
router.post("/register", validate(registerSchema), register);

// POST /api/auth/login
router.post("/login", loginRateLimiter, validate(loginSchema), login);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me
router.get("/me", authenticate, getMe);

export default router;
