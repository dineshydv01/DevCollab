import { Router } from "express";
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  updateProjectStatus,
  deleteProject,
} from "../controllers/project.controller.js";
import { updateProjectStatusSchema } from "../validators/projectStatus.validator.js";
import { getProjectMatches } from "../controllers/matching.controller.js";
import {
  applyToProject,
  inviteToProject,
  listProjectApplications,
} from "../controllers/collaborationRequest.controller.js";
import { applySchema, inviteSchema } from "../validators/collaborationRequest.validator.js";
import { getProjectTeam, updateMemberRole, removeMember } from "../controllers/team.controller.js";
import { assignRoleSchema } from "../validators/team.validator.js";
import { isProjectMemberOrOwner } from "../middleware/isProjectMemberOrOwner.js";
import { createProjectTask, listProjectTasks } from "../controllers/task.controller.js";
import { createTaskSchema } from "../validators/task.validator.js";
import { listProjectMessages } from "../controllers/message.controller.js";
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

// POST /api/projects/:id/apply — any logged-in developer (business
// rules like "not your own project" / "team not full" are enforced
// inside createApplication, not here)
router.post(
  "/:id/apply",
  authenticate,
  validateObjectId("id"),
  loadProject,
  validate(applySchema),
  applyToProject
);

// POST /api/projects/:id/invite — owner only
router.post(
  "/:id/invite",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectOwner,
  validate(inviteSchema),
  inviteToProject
);

// GET /api/projects/:id/applications — owner only (both applications
// AND invitations for this project; filter with ?type=)
router.get(
  "/:id/applications",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectOwner,
  listProjectApplications
);

// GET /api/projects/:id/team — public: current active team, with
// member user details populated
router.get("/:id/team", validateObjectId("id"), loadProject, getProjectTeam);

// PUT /api/projects/:id/team/:userId/role — owner only
router.put(
  "/:id/team/:userId/role",
  authenticate,
  validateObjectId("id"),
  validateObjectId("userId"),
  loadProject,
  isProjectOwner,
  validate(assignRoleSchema),
  updateMemberRole
);

// DELETE /api/projects/:id/team/:userId — owner only
router.delete(
  "/:id/team/:userId",
  authenticate,
  validateObjectId("id"),
  validateObjectId("userId"),
  loadProject,
  isProjectOwner,
  removeMember
);

// POST /api/projects/:id/tasks — owner only
router.post(
  "/:id/tasks",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectOwner,
  validate(createTaskSchema),
  createProjectTask
);

// GET /api/projects/:id/tasks — owner or any active team member
router.get(
  "/:id/tasks",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectMemberOrOwner,
  listProjectTasks
);

// GET /api/projects/:id/messages — owner or any active team member;
// chat SENDING happens over Socket.IO, not REST (see message.controller.js)
router.get(
  "/:id/messages",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectMemberOrOwner,
  listProjectMessages
);

// PATCH /api/projects/:id/status — owner only, Completed/Archived only
router.patch(
  "/:id/status",
  authenticate,
  validateObjectId("id"),
  loadProject,
  isProjectOwner,
  validate(updateProjectStatusSchema),
  updateProjectStatus
);

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
