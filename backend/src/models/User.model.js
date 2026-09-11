// WHAT: The developer profile — every person who signs up, whether
//       they're browsing projects, owning one, or moderating as admin.
// WHY: Almost every other model references this one (Project.owner,
//      Task.assignedTo, Message.sender, Review.reviewer, etc.), so its
//      shape needs to be right before we build on top of it.
// HOW: A Mongoose schema with validation, two indexes for search
//      (Phase 11) and matching (Phase 7), a pre-save hook that hashes
//      passwords automatically, and an instance method to check a
//      login attempt against the stored hash.

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { normalizeSkills } from "../utils/normalizeSkill.js";

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 80,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      // select: false means .find()/.findOne() never return this field
      // unless a query explicitly asks for it with .select('+password').
      // This makes it hard to accidentally leak password hashes in an
      // API response.
      select: false,
    },

    // Site-wide role — NOT the same as "project owner" (see explanation
    // above). Only two values needed here; "Project Owner" is contextual.
    role: {
      type: String,
      enum: ["developer", "admin"],
      default: "developer",
    },

    // --- Profile fields (spec section 7) ---
    profileImage: { type: String, default: "" },
    bio: { type: String, maxlength: 300, default: "" },
    location: { type: String, trim: true, default: "" },

    skills: {
      type: [String],
      default: [],
      set: normalizeSkills, // runs automatically whenever `skills` is assigned
    },

    experienceLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    preferredRoles: {
      type: [String],
      default: [],
    },

    // Hours per week the developer says they can commit — used directly
    // by the matching algorithm's "Availability" score in Phase 7.
    availability: {
      type: Number,
      min: 0,
      max: 168, // can't commit more hours than exist in a week
      default: 0,
    },

    githubUsername: { type: String, trim: true, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    portfolioUrl: { type: String, trim: true, default: "" },

    interests: {
      type: [String],
      default: [],
    },

    // Computed fields — never set directly by user input. Reviews
    // (Phase 14) recalculate `rating`; project completion (Phase 10/17
    // logic) increments `completedProjects`.
    rating: { type: Number, min: 0, max: 5, default: 0 },
    completedProjects: { type: Number, min: 0, default: 0 },

    // Admin moderation (spec section 27)
    isSuspended: { type: Boolean, default: false },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// --- Indexes (explained in detail in the README's DB section) ---
// email/username already get unique indexes from `unique: true` above.
// This one supports the "search developers by skills" feature (section 11).
userSchema.index({ skills: 1 });

// --- Password hashing ---
// Runs automatically before every .save() call, but ONLY re-hashes if
// the password field actually changed — otherwise updating a user's
// bio would re-hash an already-hashed password and break their login.
userSchema.pre("save", async function hashPasswordIfChanged() {
  if (!this.isModified("password")) return;

  // No next() here on purpose: this is an async function, so Mongoose
  // treats its returned Promise as the completion signal. Mixing
  // `async function(next)` with calling next() — the old Mongoose
  // callback style — causes "next is not a function", because
  // Mongoose doesn't pass a next argument to async hooks at all.
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// Instance method: compares a plaintext login attempt against the
// stored hash. Lives on the model (not in a controller) because
// "how do I verify this user's password" is inherently a User
// concern — keeping it here means Phase 3's auth controller stays
// thin and just calls `user.comparePassword(...)`.
userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip sensitive/internal fields whenever a User document is
// converted to JSON (i.e. sent in an API response), so no controller
// has to remember to do this manually every time.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
