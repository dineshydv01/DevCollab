// WHAT: Fetches the project referenced by :id and attaches it to
//       req.project for downstream middleware/controllers to use.
// WHY: Update, delete, and (later) apply/invite/task routes all start
//      with "does this project exist?" — doing that fetch once here
//      means the controller never repeats it, and ownership checks
//      (isProjectOwner, below) can run BEFORE the controller, without
//      a second database round trip.
// Must run AFTER validateObjectId in the middleware chain, so we're
// guaranteed req.params.id is already a syntactically valid ObjectId
// by the time this queries the database.

import { Project } from "../models/Project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const loadProject = asyncHandler(async function loadProject(req, res, next) {
  const project = await Project.findById(req.params.id).populate(
    "owner",
    "fullName username profileImage"
  );

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  req.project = project;
  next();
});
