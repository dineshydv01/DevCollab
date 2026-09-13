// WHAT: Blocks the request unless req.user is the owner of req.project.
// WHY: This is the backend enforcement spec section 53 requires
//      ("Only project owners can delete projects", etc.) — it's not
//      optional or advisory, and it doesn't matter what the frontend
//      UI does or doesn't show.
// Must run AFTER both authenticate (sets req.user) and loadProject
// (sets req.project) in the middleware chain.

export function isProjectOwner(req, res, next) {
  const isOwner = req.project.owner._id
    ? req.project.owner._id.equals(req.user._id) // populated owner (has ._id)
    : req.project.owner.equals(req.user._id); // unpopulated owner (raw ObjectId)

  if (!isOwner) {
    return res.status(403).json({ success: false, message: "Only the project owner can do this" });
  }

  next();
}
