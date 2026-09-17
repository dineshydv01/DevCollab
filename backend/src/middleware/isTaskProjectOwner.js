import { isOwnerOf } from "../utils/projectAuth.js";

export function isTaskProjectOwner(req, res, next) {
  if (!isOwnerOf(req.task.project, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only the project owner can do this" });
  }

  next();
}
