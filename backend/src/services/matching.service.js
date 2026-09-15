// WHAT: Computes a 0-100 compatibility score between a developer and
//       a project, and returns the top K best-matching developers for
//       a given project.
// WHY this lives in its own service: this is real algorithmic logic —
//      exactly the kind of thing spec section 13 wants isolated from
//      controllers so it can be unit tested independently (Phase 17)
//      and explained on its own in the README's DSA section.
//
// --- Scoring weights (spec section 12) ---
// Skill Match:       50%  (up to 50 points)
// Experience Level:  20%  (up to 20 points)
// Availability:      15%  (up to 15 points)
// Preferred Role:    15%  (up to 15 points)
// Total:            100%  (up to 100 points)

import { getTopKByScore } from "../utils/minHeap.js";

const EXPERIENCE_LEVEL_VALUE = { Beginner: 1, Intermediate: 2, Advanced: 3 };

// ---------------------------------------------------------------------
// Skill Match (50 points)
// ---------------------------------------------------------------------
/**
 * WHY a Set here: converting the developer's skills into a Set turns
 * "does this developer have skill X?" into an O(1) average-case
 * lookup. Without it, checking each of the project's required skills
 * against the developer's skill list would mean re-scanning that list
 * every time — O(required * developerSkills) instead of
 * O(required + developerSkills).
 *
 * Skills are assumed already normalized (both User.skills and
 * Project.requiredSkills run through normalizeSkills() via their
 * schema `set` functions on save — see Phase 2), so no re-normalization
 * is needed here.
 */
function calculateSkillMatch(developerSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) {
    // Defensive fallback — the Project schema requires at least one
    // skill, so this shouldn't happen in practice, but a project with
    // no real skill requirement shouldn't be penalized for it.
    return { score: 50, matchedSkills: [], missingSkills: [] };
  }

  const devSkillSet = new Set(developerSkills || []);
  const matchedSkills = [];
  const missingSkills = [];

  for (const skill of requiredSkills) {
    if (devSkillSet.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const score = (matchedSkills.length / requiredSkills.length) * 50;
  return { score, matchedSkills, missingSkills };
}

// ---------------------------------------------------------------------
// Experience Level (20 points)
// ---------------------------------------------------------------------
/**
 * The Project model doesn't have a separate "required experience"
 * field — its `difficulty` (Beginner/Intermediate/Advanced) plays that
 * role. We compare the developer's self-reported experienceLevel
 * against it: an exact match gets full credit, one level off gets
 * partial credit, and a two-level gap (e.g. Beginner developer on an
 * Advanced project) gets minimal credit rather than zero — someone
 * can still meaningfully contribute even if not perfectly matched.
 */
function calculateExperienceScore(developerLevel, projectDifficulty) {
  const devValue = EXPERIENCE_LEVEL_VALUE[developerLevel] || 1;
  const projectValue = EXPERIENCE_LEVEL_VALUE[projectDifficulty] || 1;
  const diff = Math.abs(devValue - projectValue);

  if (diff === 0) return 20;
  if (diff === 1) return 12;
  return 4; // diff === 2
}

// ---------------------------------------------------------------------
// Availability (15 points)
// ---------------------------------------------------------------------
/**
 * The Project model doesn't currently track an expected weekly time
 * commitment, so this scores the developer's stated availability on
 * its own tiered scale rather than comparing it against a project
 * requirement. (A natural future enhancement — noted in the README's
 * "Future Improvements" — would add a `weeklyHoursExpected` field to
 * Project and score the gap between the two, the same way experience
 * is scored above.)
 */
function calculateAvailabilityScore(availability) {
  const hours = availability || 0;
  if (hours >= 15) return 15;
  if (hours >= 8) return 10;
  if (hours >= 1) return 5;
  return 0;
}

// ---------------------------------------------------------------------
// Preferred Role (15 points)
// ---------------------------------------------------------------------
/**
 * Partial credit based on the FRACTION of the project's preferred
 * roles the developer also lists — mirrors the skill-match formula's
 * shape for consistency. A project with no specific role preference
 * imposes no penalty (full credit), since there's nothing to mismatch.
 */
function calculateRoleScore(developerRoles, projectRoles) {
  if (!projectRoles || projectRoles.length === 0) return 15;

  const devRoleSet = new Set(developerRoles || []);
  const matched = projectRoles.filter((role) => devRoleSet.has(role));

  return (matched.length / projectRoles.length) * 15;
}

// ---------------------------------------------------------------------
// Combined score
// ---------------------------------------------------------------------
/**
 * Computes the full match breakdown for one developer against one
 * project. Returns everything the API response needs (spec section 14).
 */
export function computeMatchScore(developer, project) {
  const skill = calculateSkillMatch(developer.skills, project.requiredSkills);
  const experienceScore = calculateExperienceScore(developer.experienceLevel, project.difficulty);
  const availabilityScore = calculateAvailabilityScore(developer.availability);
  const roleScore = calculateRoleScore(developer.preferredRoles, project.preferredRoles);

  const matchScore = skill.score + experienceScore + availabilityScore + roleScore;

  return {
    user: developer,
    matchScore: Math.round(matchScore * 10) / 10, // one decimal place
    matchedSkills: skill.matchedSkills,
    missingSkills: skill.missingSkills,
    skillScore: Math.round(skill.score * 10) / 10,
    experienceScore,
    availabilityScore,
    roleScore: Math.round(roleScore * 10) / 10,
  };
}

// ---------------------------------------------------------------------
// Candidate pool + Top-K selection
// ---------------------------------------------------------------------
/**
 * Given a project and its full list of candidate developers (already
 * filtered to exclude the owner, existing members, and suspended
 * accounts — see matching.controller.js), computes every candidate's
 * score and returns only the top `limit` (default 10, per spec
 * section 13's "Return the top 10 developers").
 *
 * WHY getTopKByScore instead of `.sort().slice(0, limit)`: sorting the
 * ENTIRE candidate list is O(n log n) even though we only keep the
 * top `limit` of them. getTopKByScore's min-heap approach is
 * O(n log limit) — with limit fixed at 10 and n potentially in the
 * thousands, this avoids doing far more sorting work than the result
 * actually needs.
 */
export function findTopMatches(project, candidates, limit = 10) {
  const scored = candidates.map((developer) => computeMatchScore(developer, project));
  return getTopKByScore(scored, limit, (result) => result.matchScore);
}
