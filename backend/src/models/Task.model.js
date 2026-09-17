// WHAT: A single unit of work within a project's Kanban board.
// WHY status is a fixed 4-value enum (not freeform): the Kanban board
//      (frontend work, later) renders one column per status value —
//      an unconstrained status field would make "which column does
//      this render in?" an open-ended parsing problem instead of a
//      simple lookup.

import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // a task can exist unassigned
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"],
      default: "TODO",
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Supports the two most common queries: "show me this project's board"
// filtered by column (status), and "show me tasks assigned to me."
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });

taskSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Task = mongoose.model("Task", taskSchema);
