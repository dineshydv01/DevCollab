// WHAT: Allows the request through if req.user is EITHER the project
//       owner OR an active team member — blocks everyone else.
// WHY: Task lists (and, in Phase 11, project chat) are private to the
//      team, not public like the project's own listing/detail pages.
//      "Owner or member" is a distinct, looser relationship than the
//      owner-only check isProjectOwner enforces.

import { isOwnerOf, isActiveMemberOf } from "../utils/projectAuth.js";

export function isProjectMemberOrOwner(req, res, next) {
  const authorized = isOwnerOf(req.project, req.user._id) || isActiveMemberOf(req.project, req.user._id);

  if (!authorized) {
    return res.status(403).json({ success: false, message: "Only project members can do this" });
  }

  next();
}
