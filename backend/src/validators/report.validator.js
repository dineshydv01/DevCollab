import { z } from "zod";
import mongoose from "mongoose";

export const createReportSchema = z.object({
  targetType: z.enum(["project", "user"]),
  targetId: z.string().refine((v) => mongoose.isValidObjectId(v), { message: "Invalid targetId" }),
  reason: z.enum(["Spam", "Harassment", "Inappropriate Content", "Fraud", "Other"]),
  description: z.string().trim().max(1000).optional(),
});
