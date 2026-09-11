// WHAT: A collaborative project someone wants to build a team around.
// WHY: This is the second core entity — almost everything from Phase 7
//      onward (matching, applications, tasks, chat) revolves around a
//      Project document.
// HOW: A schema with an embedded `members` sub-document array (see the
//      "why embedded, not a separate collection" reasoning above the
//      code), a text index for search, and category/status enums that
//      encode the business rules from spec section 52.

import mongoose from "mongoose";
import { normalizeSkills } from "../utils/normalizeSkill.js";

// Sub-schema for a single team member. `_id: false` because we don't
// need to reference a member independently of its parent project —
// we always access members through project.members.
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String, // e.g. "Frontend Developer", "Backend Developer"
      trim: true,
      default: "",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      minlength: 20,
      maxlength: 3000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Web Development",
        "Mobile Development",
        "AI/ML",
        "Data Science",
        "DevOps",
        "Blockchain",
        "Cybersecurity",
        "Open Source",
        "Other",
      ],
    },
    requiredSkills: {
      type: [String],
      default: [],
      set: normalizeSkills,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one required skill must be specified",
      },
    },
    teamSize: {
      type: Number,
      required: [true, "Team size is required"],
      min: [1, "Team size must be at least 1"],
      max: 50,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      required: true,
    },
    duration: {
      type: String, // free text, e.g. "4 weeks", "2 months" — no fixed unit imposed
      trim: true,
      default: "",
    },
    preferredRoles: {
      type: [String],
      default: [],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: {
      type: [memberSchema],
      default: [],
    },

    // Lifecycle state — business rules for each are enforced in the
    // Project service layer (Phase 5/9), not here. The schema only
    // constrains which values are *valid*, not when transitions
    // between them are *allowed*.
    status: {
      type: String,
      enum: ["Recruiting", "Active", "Completed", "Archived"],
      default: "Recruiting",
    },

    repositoryUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---
// Text index on title + description powers the project search feature
// (spec section 11) — lets MongoDB do relevance-ranked text search
// instead of us writing manual regex matching.
projectSchema.index({ title: "text", description: "text" });

// Supports filtering by category/status/skills on the discovery page
// (section 10) without a full collection scan.
projectSchema.index({ category: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ requiredSkills: 1 });
projectSchema.index({ owner: 1 });

projectSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Project = mongoose.model("Project", projectSchema);
