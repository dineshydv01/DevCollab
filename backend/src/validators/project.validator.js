// WHAT: Valid shapes for project create/update requests.
// WHY: Same reasoning as user.validator.js — fields not listed here
//      (owner, members, status) are automatically stripped, so a
//      malicious update request can't reassign ownership or fake a
//      "Completed" status through this endpoint. Status transitions
//      get their own deliberate logic once applications/team
//      management exist to make those rules meaningful (spec section 52).

import { z } from "zod";

const CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "AI/ML",
  "Data Science",
  "DevOps",
  "Blockchain",
  "Cybersecurity",
  "Open Source",
  "Other",
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const STATUSES = ["Recruiting", "Active", "Completed", "Archived"];

export { CATEGORIES, DIFFICULTIES, STATUSES };

export const createProjectSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(3000),
  category: z.enum(CATEGORIES),
  requiredSkills: z
    .array(z.string().trim().min(1))
    .min(1, "At least one required skill must be specified")
    .max(20),
  teamSize: z.number().int().min(1).max(50),
  difficulty: z.enum(DIFFICULTIES),
  duration: z.string().trim().max(50).optional(),
  preferredRoles: z.array(z.string().trim().min(1)).max(10).optional(),
  repositoryUrl: z.string().trim().url("repositoryUrl must be a valid URL").optional().or(z.literal("")),
});

// Same fields, all optional — a partial update shouldn't require
// resubmitting the entire project.
export const updateProjectSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(20).max(3000).optional(),
  category: z.enum(CATEGORIES).optional(),
  requiredSkills: z.array(z.string().trim().min(1)).min(1).max(20).optional(),
  teamSize: z.number().int().min(1).max(50).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  duration: z.string().trim().max(50).optional(),
  preferredRoles: z.array(z.string().trim().min(1)).max(10).optional(),
  repositoryUrl: z.string().trim().url("repositoryUrl must be a valid URL").optional().or(z.literal("")),
});
