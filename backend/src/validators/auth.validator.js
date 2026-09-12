// WHAT: Defines exactly what a valid register/login request body looks
//       like, using Zod — a schema library, similar in spirit to how
//       Mongoose schemas describe valid documents.
// WHY: Section 34 requires backend validation regardless of what the
//      frontend does. Centralizing the RULES here (separate from the
//      middleware that RUNS them) means the same schema could also be
//      reused in tests, or on the frontend with React Hook Form later.

import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
    email: z.string().trim().toLowerCase().email("Please provide a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});
