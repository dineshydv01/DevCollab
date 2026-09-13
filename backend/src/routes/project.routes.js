import { Router } from "express";
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
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
