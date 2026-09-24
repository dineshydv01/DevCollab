import { z } from "zod";

// Deliberately restricted to just these two values: Recruiting and
// Active are fully AUTOMATIC transitions driven by team capacity
// (see addMemberToProject / removeMemberFromProject in
// project.service.js). Letting an owner manually force those two
// would let them bypass the capacity invariants those functions
// enforce. Completed and Archived are the only states that make
// sense as a deliberate, manual, owner-driven decision.
export const updateProjectStatusSchema = z.object({
  status: z.enum(["Completed", "Archived"]),
});
