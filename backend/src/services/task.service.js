// WHAT: Enforces that a task's assignedTo, if set, is either the
//       project owner or an active team member — never an outsider.
// WHY this needs a service function at all: Zod can validate that
//      assignedTo LOOKS like a valid ObjectId, but it has no way to
//      know whether that ID actually belongs to someone on this
//      project's team — that requires the project document, which
//      only exists once we're past validation, inside the controller.

import { Task } from "../models/Task.model.js";
import { isOwnerOf, isActiveMemberOf } from "../utils/projectAuth.js";
import { createHttpError } from "../utils/httpError.js";
import { createNotification } from "./notification.service.js";

export function assertValidAssignee(project, assignedTo) {
  if (!assignedTo) return; // unassigned is always fine

  const valid = isOwnerOf(project, assignedTo) || isActiveMemberOf(project, assignedTo);
  if (!valid) {
    throw createHttpError(400, "assignedTo must be the project owner or an active team member");
  }
}

export async function createTask({ project, createdBy, data }) {
  assertValidAssignee(project, data.assignedTo);

  const task = await Task.create({
    ...data,
    project: project._id,
    createdBy,
  });

  if (task.assignedTo && task.assignedTo.toString() !== createdBy.toString()) {
    await createNotification({
      recipient: task.assignedTo,
      type: "task_assigned",
      message: `You were assigned to "${task.title}" in "${project.title}"`,
      referenceId: task._id,
    });
  }

  return task;
}
