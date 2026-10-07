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

// WHAT: login now accepts EITHER an email address OR a username in
// the same field.
// WHY the field is still called "email" (not renamed to something
// like "identifier"): every existing client and test script already
// sends { email, password } to this endpoint — renaming the field
// would be a breaking change across ~14 already-verified test scripts
// and the Vitest integration suite for a convenience feature that
// doesn't require it. Strict .email() format validation was dropped
// here specifically (registerSchema's email field above is unchanged
// and still requires real email format) since a username wouldn't
// pass it. The login controller checks the value against BOTH
// User.email and User.username.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});
