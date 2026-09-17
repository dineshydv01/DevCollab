import { z } from "zod";
import mongoose from "mongoose";

const objectIdString = z.string().refine((v) => mongoose.isValidObjectId(v), { message: "Invalid id" });

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  // null is a valid, deliberate value here — it means "leave unassigned."
  assignedTo: objectIdString.nullable().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  // z.coerce.date() accepts ISO strings (or anything Date can parse)
  // and converts to a real Date — simpler than requiring the client
  // to send a strict ISO-8601 string.
  deadline: z.coerce.date().optional(),
});

// Same fields, all optional — this is a partial update. Deliberately
// does NOT include `status` — status changes go through the dedicated
// PATCH /api/tasks/:id/status endpoint instead, which has different
// (looser) authorization. Keeping them separate means this schema
// can't accidentally be used to sneak a status change past the
// owner-only PUT route's intent.
export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  assignedTo: objectIdString.nullable().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  deadline: z.coerce.date().nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"]),
});
