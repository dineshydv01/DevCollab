// WHAT: Defines exactly which profile fields a user may update, and
//       what valid values for each look like.
// WHY: Every field NOT listed here (email, username, password, role,
//      rating, completedProjects, isSuspended) is automatically
//      stripped by Zod's default "strip unrecognized keys" behavior
//      when this schema parses req.body — see the explanation in chat
//      for why this matters as a real security boundary, not just
//      convenience.
// All fields are .optional() because this is a PARTIAL update — a user
// might only want to change their bio, not resubmit their entire profile.

import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(300).optional(),
  location: z.string().trim().max(100).optional(),
  profileImage: z.string().trim().url("profileImage must be a valid URL").optional().or(z.literal("")),

  skills: z.array(z.string().trim().min(1)).max(30, "Maximum 30 skills").optional(),

  experienceLevel: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),

  preferredRoles: z.array(z.string().trim().min(1)).max(10).optional(),

  availability: z.number().min(0).max(168).optional(),

  githubUsername: z.string().trim().max(40).optional(),
  linkedinUrl: z.string().trim().url("linkedinUrl must be a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().trim().url("portfolioUrl must be a valid URL").optional().or(z.literal("")),

  interests: z.array(z.string().trim().min(1)).max(20).optional(),
});
