import { Router } from "express";
import { updateTask, deleteTask, updateTaskStatus } from "../controllers/task.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { loadTask } from "../middleware/loadTask.js";
import { isTaskProjectOwner } from "../middleware/isTaskProjectOwner.js";
import { isTaskAssigneeOrOwner } from "../middleware/isTaskAssigneeOrOwner.js";
import { updateTaskSchema, updateTaskStatusSchema } from "../validators/task.validator.js";

const router = Router();

// PUT /api/tasks/:id — full edit, owner only
router.put(
  "/:id",
  authenticate,
  validateObjectId("id"),
  loadTask,
  isTaskProjectOwner,
  validate(updateTaskSchema),
  updateTask
);

// DELETE /api/tasks/:id — owner only
router.delete("/:id", authenticate, validateObjectId("id"), loadTask, isTaskProjectOwner, deleteTask);

// PATCH /api/tasks/:id/status — the assignee OR the owner (this is
// the endpoint the Kanban board's drag-and-drop hits)
router.patch(
  "/:id/status",
  authenticate,
  validateObjectId("id"),
  loadTask,
  isTaskAssigneeOrOwner,
  validate(updateTaskStatusSchema),
  updateTaskStatus
);

export default router;
