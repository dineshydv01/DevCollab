import { Project } from "../models/Project.model.js";
import { User } from "../models/User.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { createApplication, createInvitation, resolveRequest } from "../services/collaborationRequest.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const REQUEST_TYPES = ["application", "invitation"];
const REQUEST_STATUSES = ["pending", "accepted", "rejected", "cancelled"];

export const applyToProject = asyncHandler(async function applyToProject(req, res) {
  const request = await createApplication({
    project: req.project,
    applicant: req.user,
    message: req.body.message,
  });

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: request,
  });
});

export const inviteToProject = asyncHandler(async function inviteToProject(req, res) {
  const { userId, message } = req.body;

  const invitedUser = await User.findOne({ _id: userId, role: "developer", isSuspended: false });
  if (!invitedUser) {
    return res.status(404).json({ success: false, message: "Developer not found" });
  }

  const request = await createInvitation({
    project: req.project,
    owner: req.user,
    applicantId: userId,
    message,
  });

  res.status(201).json({
    success: true,
    message: "Invitation sent successfully",
    data: request,
  });
});

export const listProjectApplications = asyncHandler(async function listProjectApplications(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { project: req.project._id };
  if (REQUEST_TYPES.includes(req.query.type)) filter.type = req.query.type;
  if (REQUEST_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const [requests, total] = await Promise.all([
    CollaborationRequest.find(filter)
      .populate("applicant", "fullName username profileImage skills experienceLevel")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CollaborationRequest.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: requests,
    ...buildPaginationMeta(page, limit, total),
  });
});

// "My" requests: everything where I'm either the applicant (my sent
// applications + invitations I've received) or the owner (invitations
// I've sent + applications I've received) — one personal dashboard
// query rather than four separate endpoints the frontend would have
// to stitch together itself.
export const listMyRequests = asyncHandler(async function listMyRequests(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {
    $or: [{ applicant: req.user._id }, { owner: req.user._id }],
  };
  if (REQUEST_TYPES.includes(req.query.type)) filter.type = req.query.type;
  if (REQUEST_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const [requests, total] = await Promise.all([
    CollaborationRequest.find(filter)
      .populate("project", "title status")
      .populate("applicant", "fullName username profileImage")
      .populate("owner", "fullName username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CollaborationRequest.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: requests,
    ...buildPaginationMeta(page, limit, total),
  });
});

// One factory for accept/reject/cancel — see resolveRequest()'s doc
// comment for why these three share a single implementation.
function respondToRequest(action) {
  return asyncHandler(async function respond(req, res) {
    const request = await CollaborationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const project = await Project.findById(request.project);
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project no longer exists" });
    }

    const updated = await resolveRequest({ request, project, actorId: req.user._id, action });

    res.status(200).json({
      success: true,
      message: `Request ${action}ed successfully`,
      data: updated,
    });
  });
}

export const acceptRequest = respondToRequest("accept");
export const rejectRequest = respondToRequest("reject");
export const cancelRequest = respondToRequest("cancel");
