// WHAT: A collaborative project someone wants to build a team around.
// WHY this schema shape: see the "why embedded, not a separate
//      collection" reasoning for `members` discussed in Phase 5, and
//      the GitHub cache fields' own comment below for a bug fix made
//      in Phase 13.

import mongoose from "mongoose";
import { normalizeSkills } from "../utils/normalizeSkill.js";

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
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
      type: String,
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

    // --- GitHub integration cache (Phase 13) ---
    // WHY cache lives on the Project document, not in memory: unlike
    // Socket.IO presence (truly ephemeral, meaningless after a
    // restart), GitHub stats are worth persisting — they let us serve
    // "last known good" data if a live refresh fails (rate limit,
    // network error, GitHub outage), which is real graceful
    // degradation rather than just showing an error.
    //
    // WHY githubCacheUrl exists (bug fix): the cache is only valid
    // for the SPECIFIC repositoryUrl it was fetched for. Without
    // this field, changing which repo is attached would still serve
    // the OLD repo's cached stats for up to 15 minutes, because the
    // freshness check only looked at a timestamp — not at whether the
    // cached data was even for the right repository anymore.
    githubCache: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    githubCacheUpdatedAt: {
      type: Date,
      default: null,
    },
    githubCacheUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ title: "text", description: "text" });
projectSchema.index({ category: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ requiredSkills: 1 });
projectSchema.index({ owner: 1 });

// Phase 18 optimization: githubCache/githubCacheUpdatedAt/githubCacheUrl
// are internal bookkeeping for the caching strategy in github.service.js
// — they're read directly off the Mongoose DOCUMENT in server-side code
// (never via JSON), so hiding them from the client-facing response has
// zero effect on server logic. What it DOES do: shrinks every project
// API response (list and detail) by excluding a field that can hold a
// non-trivial GitHub API snapshot, and steers clients toward the
// dedicated GET /:id/github endpoint — which correctly handles
// freshness/staleness — rather than reading a cache blob embedded in
// an unrelated response that might be stale without any indication.
projectSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.githubCache;
    delete ret.githubCacheUpdatedAt;
    delete ret.githubCacheUrl;
    return ret;
  },
});

export const Project = mongoose.model("Project", projectSchema);
