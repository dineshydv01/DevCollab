// WHAT: Strips any object key starting with "$" or containing "."
//       from req.body and req.query, recursively.
// WHY this is a BACKSTOP, not the primary defense: every actual input
//      path in this app is already protected — Zod schemas reject
//      non-string types outright (z.string() fails validation if
//      given an object), and the discovery search filters got their
//      own explicit safeString/safeStringArray guards in Phase 6.
//      This middleware exists so that a FUTURE route added without
//      remembering to Zod-validate its input still can't be used to
//      smuggle a raw MongoDB operator (e.g. ?category[$ne]=null)
//      through — defense in depth, not a replacement for validation.
//
// WHY req.query is mutated IN PLACE instead of reassigned: this is
// the exact incompatibility that ruled out express-mongo-sanitize
// back in Phase 6 — Express 5 made req.query a getter-only property
// backed by the parsed URL, so `req.query = sanitized` throws. Mutating
// its existing object's keys works fine; replacing the object itself
// does not.

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue; // drop dangerous keys entirely
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }

  return value;
}

export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    const sanitizedQuery = sanitizeValue(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, sanitizedQuery);
  }

  next();
}
