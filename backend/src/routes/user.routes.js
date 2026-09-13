import { Router } from "express";
import { getUserById, updateProfile, listUsers } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { updateProfileSchema } from "../validators/user.validator.js";

const router = Router();

// GET /api/users  — developer directory (requires login; see chat explanation)
router.get("/", authenticate, listUsers);

// PUT /api/users/profile — update YOUR OWN profile (no :id — see chat explanation)
// IMPORTANT: this must be registered BEFORE the "/:id" route below,
// otherwise Express would try to match "profile" as if it were an :id
// value and this route would never be reached.
router.put("/profile", authenticate, validate(updateProfileSchema), updateProfile);

// GET /api/users/:id — public profile view
router.get("/:id", validateObjectId("id"), getUserById);

export default router;
