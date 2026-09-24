// WHAT: A single notification event for one user.
// WHY referenceId is untyped (no `ref:` pointing at one specific
//      collection): a notification's subject varies by `type` — an
//      "application_received" notification points at a
//      CollaborationRequest, a "task_assigned" one points at a Task,
//      a "new_message" one points at a Message. A single `ref` can
//      only ever populate one collection, so a generic ObjectId here
//      (resolved by the frontend based on `type`) is more honest than
//      picking one collection arbitrarily.

import mongoose from "mongoose";

const NOTIFICATION_TYPES = [
  "application_received",
  "application_rejected",
  "invitation_received",
  "invitation_accepted",
  "invitation_rejected",
  "team_joined",
  "task_assigned",
  "task_status_changed",
  "new_message",
  "mention",
  "project_completed",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Supports the dominant query shape: "this user's notifications,
// unread first, newest first" — exactly what a notification bell needs.
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
export { NOTIFICATION_TYPES };
