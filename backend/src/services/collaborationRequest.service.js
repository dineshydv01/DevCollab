// WHAT: Enforces the business rules around creating and resolving
//       collaboration requests (spec sections 15, 16, 53).
// WHY these rules live here, not in the controller: there are several
//      of them, they're genuinely "business logic" rather than HTTP
//      plumbing, and resolveRequest()'s accept/reject/cancel
//      authorization branches on `type` in a way that's much clearer
//      read as one function than scattered across three controller
//      handlers.

import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { addMemberToProject } from "./project.service.js";
import { createHttpError } from "../utils/httpError.js";

function getOwnerId(project) {
  // project.owner may be populated (has ._id) or a raw ObjectId,
  // depending on how the caller fetched it.
  return project.owner._id ? project.owner._id : project.owner;
}

function activeMemberIdSet(project) {
  return new Set(
    project.members.filter((m) => m.status === "active").map((m) => m.user.toString())
  );
}

/**
 * A developer applies to a project (spec section 15).
 */
export async function createApplication({ project, applicant, message }) {
  if (project.status !== "Recruiting") {
    throw createHttpError(400, "This project is not currently accepting applications");
  }

  if (getOwnerId(project).toString() === applicant._id.toString()) {
    throw createHttpError(400, "You cannot apply to your own project");
  }

  const memberIds = activeMemberIdSet(project);
  if (memberIds.has(applicant._id.toString())) {
    throw createHttpError(409, "You are already a member of this project");
  }
  if (memberIds.size >= project.teamSize) {
    throw createHttpError(409, "This project's team is already full");
  }

  const existing = await CollaborationRequest.findOne({
    project: project._id,
    applicant: applicant._id,
    type: "application",
    status: "pending",
  });
  if (existing) {
    throw createHttpError(409, "You already have a pending application for this project");
  }

  return CollaborationRequest.create({
    project: project._id,
    applicant: applicant._id,
    owner: getOwnerId(project),
    type: "application",
    message: message || "",
  });
}

/**
 * A project owner invites a specific developer (spec section 16).
 */
export async function createInvitation({ project, owner, applicantId, message }) {
  if (project.status !== "Recruiting") {
    throw createHttpError(400, "This project is not currently open for new invitations");
  }

  if (owner._id.toString() === applicantId.toString()) {
    throw createHttpError(400, "You cannot invite yourself");
  }

  const memberIds = activeMemberIdSet(project);
  if (memberIds.has(applicantId.toString())) {
    throw createHttpError(409, "This user is already a member of the project");
  }
  if (memberIds.size >= project.teamSize) {
    throw createHttpError(409, "This project's team is already full");
  }

  const existing = await CollaborationRequest.findOne({
    project: project._id,
    applicant: applicantId,
    type: "invitation",
    status: "pending",
  });
  if (existing) {
    throw createHttpError(409, "This user already has a pending invitation for this project");
  }

  return CollaborationRequest.create({
    project: project._id,
    applicant: applicantId,
    owner: owner._id,
    type: "invitation",
    message: message || "",
  });
}

/**
 * Accepts, rejects, or cancels a pending request.
 *
 * WHY one function for all three actions and both types, instead of
 * six near-duplicate handlers: the authorization rule has a clean,
 * symmetric shape once you see it —
 *
 *   accept/reject -> the OTHER party responds:
 *     application -> the owner responds (they received it)
 *     invitation  -> the applicant responds (they received it)
 *
 *   cancel -> the INITIATOR withdraws:
 *     application -> the applicant withdraws (they created it)
 *     invitation  -> the owner withdraws (they created it)
 *
 * Writing that out as a table like this, once, is clearer and less
 * error-prone than re-deriving "who's allowed to do this?" separately
 * in three different controller functions.
 */
export async function resolveRequest({ request, project, actorId, action }) {
  if (request.status !== "pending") {
    throw createHttpError(409, `This request has already been ${request.status}`);
  }

  const isOwnerActor = request.owner.toString() === actorId.toString();
  const isApplicantActor = request.applicant.toString() === actorId.toString();

  let authorized;
  if (action === "accept" || action === "reject") {
    authorized = request.type === "application" ? isOwnerActor : isApplicantActor;
  } else {
    // action === "cancel"
    authorized = request.type === "application" ? isApplicantActor : isOwnerActor;
  }

  if (!authorized) {
    throw createHttpError(403, "You are not authorized to perform this action on this request");
  }

  if (action === "accept") {
    // addMemberToProject does its OWN capacity/duplicate re-check —
    // see the comment there on why that matters even though we
    // checked capacity when the request was first created.
    await addMemberToProject(project, request.applicant);
    request.status = "accepted";
  } else if (action === "reject") {
    request.status = "rejected";
  } else {
    request.status = "cancelled";
  }

  await request.save();
  return request;
}
