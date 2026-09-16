// WHAT: A single model representing both "a developer applied to a
//       project" and "an owner invited a developer to a project."
// WHY one model instead of two: an Application and an Invitation are
//      the same underlying concept — a proposal for someone to join a
//      project, awaiting the OTHER party's response. The `type` field
//      is what differentiates them; everything else (status lifecycle,
//      the project/applicant/owner relationship) is identical. Two
//      near-duplicate schemas would violate DRY for no real benefit.

import mongoose from "mongoose";

const collaborationRequestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    // The developer this request is ABOUT — the one applying, or the
    // one being invited. Never the actor for both directions of the
    // flow; see type below.
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Denormalized copy of project.owner at creation time. This lets
    // us query "all requests I own" (as a project owner) directly,
    // without a separate lookup/populate of the project for every
    // request just to find its owner.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who proposed this: the applicant proposed themselves
    // ("application"), or the owner proposed the applicant
    // ("invitation"). This single field is what the accept/reject/
    // cancel authorization logic in collaborationRequest.service.js
    // branches on.
    type: {
      type: String,
      enum: ["application", "invitation"],
      required: true,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Supports the most common queries: "does this developer already have
// a pending request of this type for this project?" (duplicate
// prevention), and listing a project's requests.
collaborationRequestSchema.index({ project: 1, applicant: 1, type: 1, status: 1 });
// Supports "all requests I own" (as a project owner) and "all requests
// about me" (as an applicant/invitee) — both used by the personal
// dashboard endpoint.
collaborationRequestSchema.index({ owner: 1, status: 1 });
collaborationRequestSchema.index({ applicant: 1, status: 1 });

collaborationRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const CollaborationRequest = mongoose.model("CollaborationRequest", collaborationRequestSchema);
