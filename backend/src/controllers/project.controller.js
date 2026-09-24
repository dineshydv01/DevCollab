// WHAT: CRUD operations on projects.
// WHY controllers stay thin here: by the time updateProject/deleteProject
//      run, the middleware chain (authenticate -> validateObjectId ->
//      loadProject -> isProjectOwner) has already done all the checking.
//      These functions only need to do the one thing they're named for.

import { Project } from "../models/Project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { searchProjects } from "../services/project.service.js";
import { createNotification } from "../services/notification.service.js";

export const createProject = asyncHandler(async function createProject(req, res) {
  const project = await Project.create({
    ...req.body,
    owner: req.user._id, // never trust a client-supplied owner field — always the logged-in user
  });

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: project,
  });
});

export const getProjectById = asyncHandler(async function getProjectById(req, res) {
  // req.project was already fetched (with owner populated) by loadProject
  res.status(200).json({ success: true, data: req.project });
});

export const listProjects = asyncHandler(async function listProjects(req, res) {
  // Handles search (?q=), filters (?category=, ?skills=, ?difficulty=,
  // ?status=), and sorting (?sort=newest|popular) — see
  // services/project.service.js for how each of those works.
  const { projects, meta } = await searchProjects(req.query);

  res.status(200).json({
    success: true,
    data: projects,
    ...meta,
  });
});

export const updateProject = asyncHandler(async function updateProject(req, res) {
  // Object.assign + .save() (rather than findByIdAndUpdate) so that
  // schema `set` functions — like requiredSkills' normalizeSkills —
  // actually run on the new values, the same as they do on create.
  Object.assign(req.project, req.body);
  await req.project.save();

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
    data: req.project,
  });
});

export const deleteProject = asyncHandler(async function deleteProject(req, res) {
  await req.project.deleteOne();

  res.status(200).json({
    success: true,
    message: "Project deleted successfully",
  });
});

// PATCH /api/projects/:id/status — a deliberately separate, narrow
// endpoint from the general updateProject above. See
// projectStatus.validator.js for why only Completed/Archived are
// accepted here.
export const updateProjectStatus = asyncHandler(async function updateProjectStatus(req, res) {
  req.project.status = req.body.status;
  await req.project.save();

  // Notify the whole active team when a project wraps up — this is
  // the one trigger point spec section 22's "project is completed"
  // needs, which didn't exist before this endpoint did.
  if (req.body.status === "Completed") {
    const activeMembers = req.project.members.filter((m) => m.status === "active");
    for (const member of activeMembers) {
      await createNotification({
        recipient: member.user._id || member.user,
        type: "project_completed",
        message: `The project "${req.project.title}" has been marked as completed.`,
        referenceId: req.project._id,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Project status updated successfully",
    data: req.project,
  });
});
