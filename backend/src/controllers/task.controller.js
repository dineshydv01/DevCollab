import mongoose from "mongoose";
import { Task } from "../models/Task.model.js";
import { createTask, assertValidAssignee } from "../services/task.service.js";
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
  if (Object.prototype.hasOwnProperty.call(req.body, "assignedTo")) {
    assertValidAssignee(req.task.project, req.body.assignedTo);
  }

  Object.assign(req.task, req.body);
  await req.task.save();

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

  res.status(200).json({
    success: true,
    message: "Task status updated successfully",
    data: req.task,
  });
});
