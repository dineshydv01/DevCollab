import { Router } from "express";
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import { getProjectMatches } from "../controllers/matching.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { loadProject } from "../middleware/loadProject.js";
import { isProjectOwner } from "../middleware/isProjectOwner.js";
import { createProjectSchema, updateProjectSchema } from "../validators/project.validator.js";

const router = Router();

// GET /api/projects — public listing
router.get("/", listProjects);

// POST /api/projects — create (must be logged in)
router.post("/", authenticate, validate(createProjectSchema), createProject);

// GET /api/projects/:id — public single-project view
router.get("/:id", validateObjectId("id"), loadProject, getProjectById);

// GET /api/projects/:id/matches — owner only (spec section 14:
// "Only project owners should be allowed to access recommended
// candidates for their project.") Reuses the exact same
// loadProject/isProjectOwner chain as PUT/DELETE below — this is the
// payoff of having extracted that middleware in Phase 5 instead of
// writing ownership checks inline.
router.get("/:id/matches", authenticate, validateObjectId("id"), loadProject, isProjectOwner, getProjectMatches);

// PUT /api/projects/:id — owner only
router.put(
  "/:id",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectOwner,
  validate(updateProjectSchema),
  updateProject
);

// DELETE /api/projects/:id — owner only
router.delete("/:id", authenticate, validateObjectId("id"), loadProject, isProjectOwner, deleteProject);

export default router;
