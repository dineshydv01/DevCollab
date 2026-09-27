// WHAT: Business rules for submitting a review and keeping a user's
//       aggregate rating in sync with their received reviews.
// WHY all the eligibility logic lives here rather than in route
//      middleware: unlike isProjectOwner or isProjectMemberOrOwner
//      (which only need req.project + req.user), review eligibility
//      also depends on the REQUEST BODY's reviewedUser — middleware
//      runs before body validation resolves that value in a form the
//      rest of the chain can use, so it's cleaner to do all of it here
//      in one place, in the order the business rules actually read in.

import { Review } from "../models/Review.model.js";
import { User } from "../models/User.model.js";
import { isOwnerOf, isEverPartOfTeam } from "../utils/projectAuth.js";
import { createHttpError } from "../utils/httpError.js";

export async function createReview({ project, reviewer, reviewedUserId, data }) {
  if (project.status !== "Completed") {
    throw createHttpError(400, "Reviews can only be left after a project is marked as completed");
  }

  if (reviewer._id.toString() === reviewedUserId.toString()) {
    throw createHttpError(400, "You cannot review yourself");
  }

  const reviewerEligible = isOwnerOf(project, reviewer._id) || isEverPartOfTeam(project, reviewer._id);
  if (!reviewerEligible) {
    throw createHttpError(403, "Only teammates from this project can leave a review");
  }

  const targetEligible = isOwnerOf(project, reviewedUserId) || isEverPartOfTeam(project, reviewedUserId);
  if (!targetEligible) {
    throw createHttpError(400, "The reviewed user was not part of this project's team");
  }

  // Application-level duplicate check, for a clean specific error
  // message. The unique index on the Review model is the backstop
  // against a race condition producing two reviews anyway.
  const existing = await Review.findOne({
    project: project._id,
    reviewer: reviewer._id,
    reviewedUser: reviewedUserId,
  });
  if (existing) {
    throw createHttpError(409, "You have already reviewed this teammate for this project");
  }

  const review = await Review.create({
    project: project._id,
    reviewer: reviewer._id,
    reviewedUser: reviewedUserId,
    ...data,
  });

  await recalculateUserRating(reviewedUserId);

  return review;
}

/**
 * Recomputes a user's aggregate `rating` field from ALL reviews
 * they've received. Deliberately plain JavaScript (fetch + reduce),
 * not a MongoDB aggregation pipeline — at the scale of "reviews one
 * developer has received," that's simpler to read and reason about
 * without any real performance cost, which matters more here than
 * using a fancier tool for its own sake (spec section 66).
 */
export async function recalculateUserRating(userId) {
  const reviews = await Review.find({ reviewedUser: userId }).select("rating");

  if (reviews.length === 0) {
    await User.findByIdAndUpdate(userId, { rating: 0 });
    return;
  }

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await User.findByIdAndUpdate(userId, { rating: Math.round(average * 10) / 10 });
}
