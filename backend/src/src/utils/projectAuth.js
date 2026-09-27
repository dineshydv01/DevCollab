// WHAT: The actual comparison logic behind "is this user the project
//       owner?", "is this user an ACTIVE member?", and (new in Phase
//       14) "was this user EVER on the team, active or not?"
// WHY framework-free (no req/res here): pure comparison logic, not an
//      HTTP concern — reusable by any middleware or service that
//      needs to answer these questions, and trivially unit-testable
//      with plain objects.

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

/**
 * WHY this differs from isActiveMemberOf: review eligibility (Phase
 * 14) needs to include someone who was REMOVED from the team before
 * the project finished — they were still genuinely part of that
 * collaboration and should be reviewable / able to review others,
 * even though they no longer count toward team capacity.
 */
export function isEverPartOfTeam(project, userId) {
  return project.members.some((m) => {
    const memberId = m.user && m.user._id ? m.user._id : m.user;
    return memberId.toString() === userId.toString();
  });
}
