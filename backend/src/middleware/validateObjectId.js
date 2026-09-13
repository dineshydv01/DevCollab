// WHAT: Checks that a route param (e.g. :id) is a syntactically valid
//       MongoDB ObjectId, BEFORE any database query touches it.
// WHY: Extracted from what was inline logic in Phase 4's getUserById —
//      now every route needing this (projects, and eventually tasks,
//      applications, etc.) shares one implementation instead of
//      repeating the same isValidObjectId check everywhere (DRY,
//      spec section 44).

import mongoose from "mongoose";

export function validateObjectId(paramName = "id") {
  return function validateObjectIdMiddleware(req, res, next) {
    const value = req.params[paramName];

    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({ success: false, message: `Invalid ${paramName}` });
    }

    next();
  };
}
