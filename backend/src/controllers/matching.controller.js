// WHAT: Assembles the candidate developer pool for a project and
//       returns the top-scoring matches.
// WHY this logic lives here, not in matching.service.js: fetching
//      candidates from MongoDB is a database concern; SCORING them is
//      a pure algorithmic concern. Keeping them separate means
//      matching.service.js has zero dependency on Mongoose and can be
//      unit tested with plain JavaScript objects (as we just did).

import { User } from "../models/User.model.js";
import { findTopMatches } from "../services/matching.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function clampLimit(rawLimit) {
  const parsed = parseInt(rawLimit, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 10; // spec default
  return Math.min(parsed, 50); // hard ceiling, same reasoning as pagination.js
}

export const getProjectMatches = asyncHandler(async function getProjectMatches(req, res) {
  const project = req.project; // attached by loadProject; isProjectOwner already confirmed ownership
  const limit = clampLimit(req.query.limit);

  // WHY a Set here: project.members is a small embedded array, but
  // checking "is this candidate already a member?" against it with
  // .some()/.includes() inside a loop over every candidate would be
  // O(candidates * members). Building the Set ONCE up front makes
  // each exclusion check O(1), so the whole filter is
  // O(candidates + members) instead.
  const excludedIds = new Set(project.members.map((m) => m.user.toString()));
  excludedIds.add(project.owner._id ? project.owner._id.toString() : project.owner.toString());

  // Pull the full candidate pool: real developers, not suspended.
  // We can't push the "already a member" exclusion into this MongoDB
  // query efficiently (it would need an $nin against a possibly large,
  // frequently-changing array), so it's applied in memory via the Set
  // built above instead.
  const allDevelopers = await User.find({ role: "developer", isSuspended: false });
  const candidates = allDevelopers.filter((dev) => !excludedIds.has(dev._id.toString()));

  const matches = findTopMatches(project, candidates, limit);

  res.status(200).json({
    success: true,
    data: matches,
  });
});
