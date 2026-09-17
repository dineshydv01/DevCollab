// WHAT: Allows status changes from EITHER the project owner OR
//       whoever the task is currently assigned to.
// WHY this is looser than isTaskProjectOwner: this is the whole point
//      of a Kanban board — the person doing the work moves their own
//      card across columns. Full edits (title, priority, reassigning)
//      stay owner-only via isTaskProjectOwner on PUT /api/tasks/:id;
//      this middleware guards ONLY the dedicated
//      PATCH /api/tasks/:id/status route.

import { isOwnerOf } from "../utils/projectAuth.js";

export function isTaskAssigneeOrOwner(req, res, next) {
  const isOwner = isOwnerOf(req.task.project, req.user._id);
  const isAssignee = req.task.assignedTo && req.task.assignedTo.toString() === req.user._id.toString();

  if (!isOwner && !isAssignee) {
    return res.status(403).json({
      success: false,
      message: "Only the assigned member or the project owner can update this task's status",
    });
  }

  next();
}
