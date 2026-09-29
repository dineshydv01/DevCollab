// WHAT: A user-filed report against a project or another user.
// WHY targetId is untyped (no `ref:`): same reasoning as
//      Notification.referenceId (Phase 12) — the target varies by
//      targetType, so a single `ref` pointing at one collection would
//      be dishonest about what this field actually contains.

import mongoose from "mongoose";

const REASONS = ["Spam", "Harassment", "Inappropriate Content", "Fraud", "Other"];

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["project", "user"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      enum: REASONS,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

reportSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Report = mongoose.model("Report", reportSchema);
export { REASONS };
