// WHAT: Builds and runs the MongoDB query behind the project discovery
//       page — search, filters, and sorting, all in one place.
// WHY a service file (unlike the plain CRUD in project.controller.js):
//      this is genuinely non-trivial logic — dynamic filter building,
//      full-text search scoring, and an aggregation pipeline for
//      "popular" sorting. Isolating it here means it can be unit
//      tested on its own (Phase 17) without spinning up Express, and
//      the controller stays a one-line pass-through.
//
// SECURITY NOTE: every value pulled from req.query is validated to be
// a plain string (or array of strings) before it's used to build a
// MongoDB filter. Express's query parser turns bracket syntax like
// ?category[$ne]=null into a nested OBJECT, not a string — if we
// didn't check the type here, that object could smuggle a raw MongoDB
// operator into our filter. This is what spec section 36 means by
// "MongoDB query safety."

import { Project } from "../models/Project.model.js";
import { normalizeSkills } from "../utils/normalizeSkill.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
import { createHttpError } from "../utils/httpError.js";
import { CATEGORIES, DIFFICULTIES, STATUSES } from "../validators/project.validator.js";

// Only accept the value if it's actually a string — silently ignore
// anything else (objects, arrays where a scalar was expected, etc.)
// rather than letting it reach a Mongo query.
export function safeString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// Accepts either a single string or an array (Express parses repeated
// query keys like ?skills=React&skills=Node into an array already).
// Filters out anything that isn't a plain string.
export function safeStringArray(value) {
  const arr = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return arr.filter((item) => typeof item === "string" && item.trim());
}

export async function searchProjects(query) {
  const { page, limit, skip } = parsePagination(query);

  const match = {};

  const category = safeString(query.category);
  if (category && CATEGORIES.includes(category)) {
    match.category = category;
  }

  const difficulty = safeString(query.difficulty);
  if (difficulty && DIFFICULTIES.includes(difficulty)) {
    match.difficulty = difficulty;
  }

  const status = safeString(query.status);
  if (status && STATUSES.includes(status)) {
    match.status = status;
  }

  const skillsInput = safeStringArray(query.skills);
  if (skillsInput.length > 0) {
    const normalized = normalizeSkills(skillsInput);
    if (normalized.length > 0) {
      match.requiredSkills = { $in: normalized };
    }
  }

  const searchTerm = safeString(query.q);
  if (searchTerm) {
    // Uses the text index created on Project (title + description) in
    // Phase 2. $text must be part of the pipeline's first $match stage.
    match.$text = { $search: searchTerm };
  }

  const sortParam = safeString(query.sort);

  const pipeline = [{ $match: match }];

  // Compute fields we might need to sort by. Only added when relevant,
  // so we're not paying for $size/textScore computation on every query.
  const computedFields = {};
  if (searchTerm) computedFields.searchScore = { $meta: "textScore" };
  if (sortParam === "popular") computedFields.memberCount = { $size: "$members" };
  if (Object.keys(computedFields).length > 0) {
    pipeline.push({ $addFields: computedFields });
  }

  let sortStage;
  if (sortParam === "popular") {
    sortStage = { memberCount: -1, createdAt: -1 };
  } else if (searchTerm && !sortParam) {
    // If someone is searching by keyword and didn't ask for a specific
    // sort, relevance beats recency.
    sortStage = { searchScore: -1 };
  } else {
    sortStage = { createdAt: -1 }; // "newest" — also the default
  }
  pipeline.push({ $sort: sortStage });

  // $facet runs both the paginated data AND the total count in a
  // single database round trip, instead of two separate queries.
  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: "$owner" },
        {
          $project: {
            title: 1,
            description: 1,
            category: 1,
            requiredSkills: 1,
            teamSize: 1,
            difficulty: 1,
            duration: 1,
            preferredRoles: 1,
            status: 1,
            repositoryUrl: 1,
            createdAt: 1,
            updatedAt: 1,
            "owner._id": 1,
            "owner.fullName": 1,
            "owner.username": 1,
            "owner.profileImage": 1,
          },
        },
      ],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await Project.aggregate(pipeline);
  const projects = result.data;
  const total = result.totalCount[0]?.count ?? 0;

  return {
    projects,
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ---------------------------------------------------------------------
// Team membership
// ---------------------------------------------------------------------
/**
 * WHAT: Adds a user to a project's team, with the capacity/duplicate
 *       checks spec section 53 requires ("Team size cannot exceed the
 *       project limit", no duplicate members).
 * WHY it lives here, not in collaborationRequest.service.js: accepting
 *      an application/invitation (Phase 8) isn't the only way someone
 *      joins a team — Phase 9's dedicated Team Management will reuse
 *      this exact function too. Membership mutation is fundamentally
 *      a PROJECT concern, regardless of what triggered it.
 * WHY re-check capacity here even though the caller may have checked
 *      already: this is the function that actually performs the
 *      mutation, so it's the last line of defense against a race
 *      condition — e.g. two pending applications both being accepted
 *      in quick succession, each having seen "space available" before
 *      the other's write landed.
 */
export async function addMemberToProject(project, userId) {
  const alreadyMember = project.members.some(
    (m) => m.status === "active" && m.user.toString() === userId.toString()
  );
  if (alreadyMember) {
    throw createHttpError(409, "User is already a member of this project");
  }

  const activeMemberCount = project.members.filter((m) => m.status === "active").length;
  if (activeMemberCount >= project.teamSize) {
    throw createHttpError(409, "This project's team is already full");
  }

  project.members.push({ user: userId });

  // Business rule (spec section 52): once the team reaches full
  // capacity, the project automatically transitions out of
  // "Recruiting" — there's no reason to keep accepting new interest
  // in a team that's already complete.
  const newActiveCount = activeMemberCount + 1;
  if (newActiveCount >= project.teamSize && project.status === "Recruiting") {
    project.status = "Active";
  }

  await project.save();
  return project;
}
