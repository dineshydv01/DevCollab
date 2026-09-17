// WHAT: The actual comparison logic behind "is this user the project
//       owner?" and "is this user an active member of this project?" —
//       extracted from isProjectOwner.js so it can be reused by
//       middleware that doesn't have req.project (e.g. loadTask.js,
//       which works off a flat /api/tasks/:id route with no project
//       ID in the URL at all).
// WHY framework-free (no req/res here): this is pure comparison logic,
//      not HTTP concern — keeping it decoupled from Express means it's
//      trivially unit-testable with plain objects, and reusable
//      wherever "does this user relate to this project this way?"
//      comes up next (Phase 11's chat room authorization will need
//      isActiveMemberOf too).

export function isOwnerOf(project, userId) {
  const ownerId = project.owner && project.owner._id ? project.owner._id : project.owner;
  return ownerId.toString() === userId.toString();
}

export function isActiveMemberOf(project, userId) {
  return project.members.some((m) => {
    if (m.status !== "active") return false;
    const memberId = m.user && m.user._id ? m.user._id : m.user;
    return memberId.toString() === userId.toString();
  });
}
