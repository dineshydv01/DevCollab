import { z } from "zod";
import mongoose from "mongoose";

export const applySchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export const inviteSchema = z.object({
  userId: z.string().refine((val) => mongoose.isValidObjectId(val), {
    message: "Invalid userId",
  }),
  message: z.string().trim().max(500).optional(),
});
