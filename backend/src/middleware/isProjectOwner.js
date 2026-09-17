// WHAT: Blocks the request unless req.user is the owner of req.project.
// WHY: This is the backend enforcement spec section 53 requires
//      ("Only project owners can delete projects", etc.) — it's not
//      optional or advisory, and it doesn't matter what the frontend
//      UI does or doesn't show.
// Must run AFTER both authenticate (sets req.user) and loadProject
// (sets req.project) in the middleware chain.

import { isOwnerOf } from "../utils/projectAuth.js";

export function isProjectOwner(req, res, next) {
  if (!isOwnerOf(req.project, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only the project owner can do this" });
  }

  next();
}
