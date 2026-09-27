import { z } from "zod";
import mongoose from "mongoose";

export const createReviewSchema = z.object({
  reviewedUser: z.string().refine((v) => mongoose.isValidObjectId(v), { message: "Invalid reviewedUser" }),
  rating: z.number().int().min(1).max(5),
  technicalSkills: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  teamwork: z.number().int().min(1).max(5),
  reliability: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
