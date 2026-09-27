// WHAT: A peer review one teammate leaves for another, after a
//       project wraps up.
// WHY the compound unique index: this is the database-level backstop
//      for "prevent duplicate reviews for the same project/member
//      combination" (spec section 26) — the application-level check
//      in review.service.js gives a clean error message in the normal
//      case, but this index is what actually guarantees correctness
//      if two identical requests ever race each other.

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    technicalSkills: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, required: true, min: 1, max: 5 },
    teamwork: { type: Number, required: true, min: 1, max: 5 },
    reliability: { type: Number, required: true, min: 1, max: 5 },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

// The database-level guarantee against duplicate reviews (see file
// comment above). `unique: true` on a compound index means the THREE
// fields together must be unique, not each one individually.
reviewSchema.index({ project: 1, reviewer: 1, reviewedUser: 1 }, { unique: true });

// Supports "show me this developer's reviews" — the dominant read
// pattern for a public profile page.
reviewSchema.index({ reviewedUser: 1 });

reviewSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Review = mongoose.model("Review", reviewSchema);
