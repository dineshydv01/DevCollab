import { z } from "zod";

// Roles are freeform strings (e.g. "Frontend Developer") rather than a
// fixed enum, since projects define their own role vocabulary. Empty
// string is allowed deliberately — it's how an owner clears a
// previously assigned role.
export const assignRoleSchema = z.object({
  role: z.string().trim().max(50),
});
