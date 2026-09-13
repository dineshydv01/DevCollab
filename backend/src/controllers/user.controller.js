// WHAT: Read/update operations on developer profiles.
// WHY no service layer yet: like auth.controller.js, this logic is a
//      handful of direct DB calls — not complex enough to justify a
//      service file. That changes in Phase 7, where matching involves
//      real algorithmic work worth isolating.

import { User } from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

export const getUserById = asyncHandler(async function getUserById(req, res) {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user || user.isSuspended) {
    // Suspended accounts are treated as "not found" publicly — we
    // don't want to reveal that a specific profile was moderated.
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.status(200).json({ success: true, data: user });
});

export const updateProfile = asyncHandler(async function updateProfile(req, res) {
  // req.user comes from the `authenticate` middleware — this is always
  // "my own profile," never someone else's, by construction (no :id
  // in this route at all).
  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: req.body },
    { returnDocument: "after", runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updated,
  });
});

export const listUsers = asyncHandler(async function listUsers(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { isSuspended: false };

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    ...buildPaginationMeta(page, limit, total),
  });
});
