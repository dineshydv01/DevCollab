import mongoose from "mongoose";
import { Task } from "../models/Task.model.js";
import { createTask, assertValidAssignee } from "../services/task.service.js";
import { createNotification } from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"];

export const createProjectTask = asyncHandler(async function createProjectTask(req, res) {
  const task = await createTask({
    project: req.project,
    createdBy: req.user._id,
    data: req.body,
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
});

export const listProjectTasks = asyncHandler(async function listProjectTasks(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { project: req.project._id };
  if (TASK_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (typeof req.query.assignedTo === "string" && mongoose.isValidObjectId(req.query.assignedTo)) {
    filter.assignedTo = req.query.assignedTo;
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("assignedTo", "fullName username profileImage")
      .populate("createdBy", "fullName username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: tasks,
    ...buildPaginationMeta(page, limit, total),
  });
});

export const updateTask = asyncHandler(async function updateTask(req, res) {
  // Only re-validate assignedTo if the request actually touches it —
  // no reason to re-check an unchanged field.
  const previousAssignee = req.task.assignedTo ? req.task.assignedTo.toString() : null;

  if (Object.prototype.hasOwnProperty.call(req.body, "assignedTo")) {
    assertValidAssignee(req.task.project, req.body.assignedTo);
  }

  Object.assign(req.task, req.body);
  await req.task.save();

  const newAssignee = req.task.assignedTo ? req.task.assignedTo.toString() : null;
  if (newAssignee && newAssignee !== previousAssignee && newAssignee !== req.user._id.toString()) {
    await createNotification({
      recipient: newAssignee,
      type: "task_assigned",
      message: `You were assigned to "${req.task.title}" in "${req.task.project.title}"`,
      referenceId: req.task._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: req.task,
  });
});

export const deleteTask = asyncHandler(async function deleteTask(req, res) {
  await req.task.deleteOne();

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});

export const updateTaskStatus = asyncHandler(async function updateTaskStatus(req, res) {
  req.task.status = req.body.status;
  await req.task.save();

  // Notify "the other party" — same shape as the collaboration
  // request notifications: whoever DIDN'T make this change should
  // hear about it. isTaskAssigneeOrOwner already guaranteed the actor
  // is one of these two, so exactly one of these branches applies.
  const ownerId = (req.task.project.owner._id || req.task.project.owner).toString();
  const assigneeId = req.task.assignedTo ? req.task.assignedTo.toString() : null;
  const actorId = req.user._id.toString();

  const recipient = actorId === ownerId ? assigneeId : ownerId;
  if (recipient && recipient !== actorId) {
    await createNotification({
      recipient,
      type: "task_status_changed",
      message: `"${req.task.title}" was moved to ${req.task.status}`,
      referenceId: req.task._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Task status updated successfully",
    data: req.task,
  });
});
