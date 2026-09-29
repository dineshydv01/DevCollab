import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { Report } from "../models/Report.model.js";
import { deleteProjectCascade } from "../services/project.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
import { createHttpError } from "../utils/httpError.js";

// Exactly the stat list from spec section 27: total users, active
// users, total projects, active projects, completed projects,
// reported projects, suspended users.
export const getStats = asyncHandler(async function getStats(req, res) {
  const [totalUsers, suspendedUsers, totalProjects, activeProjects, completedProjects, reportedProjectIds] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSuspended: true }),
      Project.countDocuments(),
      Project.countDocuments({ status: "Active" }),
      Project.countDocuments({ status: "Completed" }),
      // DISTINCT project IDs with at least one pending report — a
      // project reported five times is still one reported project,
      // not five.
      Report.distinct("targetId", { targetType: "project", status: "pending" }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers: totalUsers - suspendedUsers,
      suspendedUsers,
      totalProjects,
      activeProjects,
      completedProjects,
      reportedProjects: reportedProjectIds.length,
    },
  });
});

// Unlike the public directory (Phase 4's listUsers, which hides
// suspended accounts), the admin view shows EVERYONE — including
// suspended users, who are exactly who an admin needs to see in
// order to restore them.
export const listAllUsers = asyncHandler(async function listAllUsers(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {};
  if (req.query.isSuspended === "true") filter.isSuspended = true;
  if (req.query.isSuspended === "false") filter.isSuspended = false;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    ...buildPaginationMeta(page, limit, total),
  });
});

export const suspendUser = asyncHandler(async function suspendUser(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (target._id.toString() === req.user._id.toString()) {
    throw createHttpError(400, "You cannot suspend your own account");
  }
  if (target.role === "admin") {
    throw createHttpError(400, "Admin accounts cannot be suspended through this endpoint");
  }

  target.isSuspended = true;
  await target.save();

  // No separate "invalidate their session" step needed: Phase 3's
  // authenticate middleware re-fetches the user and checks
  // isSuspended on EVERY request, so this takes effect on their very
  // next request automatically.
  res.status(200).json({ success: true, message: "User suspended successfully", data: target });
});

export const restoreUser = asyncHandler(async function restoreUser(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  target.isSuspended = false;
  await target.save();

  res.status(200).json({ success: true, message: "User restored successfully", data: target });
});

export const listAllProjects = asyncHandler(async function listAllProjects(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const [projects, total] = await Promise.all([
    Project.find().populate("owner", "fullName username").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: projects,
    ...buildPaginationMeta(page, limit, total),
  });
});

// Admin override: removes ANY project regardless of ownership (the
// owner-only deleteProject in project.controller.js is unaffected).
// Uses the same shared cascade as owner deletion, so a moderated
// project doesn't leave orphaned tasks/messages/applications/reviews.
export const removeProject = asyncHandler(async function removeProject(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  await deleteProjectCascade(project);

  res.status(200).json({ success: true, message: "Project removed successfully" });
});
