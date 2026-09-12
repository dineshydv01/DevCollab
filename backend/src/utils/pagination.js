// WHAT: Turns req.query.page/limit into safe values, and builds the
//       consistent pagination metadata shape used everywhere (section 39).
// WHY centralize this: every paginated list (users, projects, tasks,
//      notifications, messages, applications) needs the EXACT same
//      { data, page, limit, total, totalPages } response shape. Writing
//      this logic once here means it can't drift between endpoints.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50; // hard ceiling — prevents someone requesting ?limit=100000

/**
 * Reads page/limit from query params with safe defaults and bounds.
 * Returns { page, limit, skip } ready to pass to .skip()/.limit().
 */
export function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Builds the metadata object returned alongside `data` in every
 * paginated response.
 */
export function buildPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
