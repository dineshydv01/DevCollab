// WHAT: Fetches the task referenced by :id and populates its project
//       (just the fields needed for authorization) onto req.task.project.
// WHY populate project here specifically: PUT/DELETE/PATCH on
//      /api/tasks/:id have no project ID in the URL at all — unlike
//      loadProject.js, which works when the URL already contains a
//      project ID. This is the flat-resource equivalent: the only way
//      to know "who owns this task's project?" is to look it up
//      through the task itself.

import { Task } from "../models/Task.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const loadTask = asyncHandler(async function loadTask(req, res, next) {
  const task = await Task.findById(req.params.id).populate("project", "owner members teamSize status title");

  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }

  req.task = task;
  next();
});
