import { Review } from "../models/Review.model.js";
import { createReview } from "../services/review.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

export const createProjectReview = asyncHandler(async function createProjectReview(req, res) {
  const review = await createReview({
    project: req.project,
    reviewer: req.user,
    reviewedUserId: req.body.reviewedUser,
    data: {
      rating: req.body.rating,
      technicalSkills: req.body.technicalSkills,
      communication: req.body.communication,
      teamwork: req.body.teamwork,
      reliability: req.body.reliability,
      comment: req.body.comment || "",
    },
  });

  res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    data: review,
  });
});

// GET /api/users/:id/reviews — public, like the profile page itself
export const listUserReviews = asyncHandler(async function listUserReviews(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { reviewedUser: req.params.id };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("reviewer", "fullName username profileImage")
      .populate("project", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: reviews,
    ...buildPaginationMeta(page, limit, total),
  });
});
