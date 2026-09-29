// WHAT: Business rules for filing a report.
// WHY these three rules specifically:
//   1. No self-reports — reporting yourself is never meaningful.
//   2. The target must actually exist — a report about a nonexistent
//      user/project isn't actionable, and is far more likely a stale
//      ID or client bug than something an admin needs to review.
//   3. No duplicate PENDING reports from the same person for the same
//      target — the same "don't let someone spam the same request"
//      pattern as duplicate applications (Phase 8). Once an earlier
//      report is resolved or dismissed, filing a new one is allowed —
//      circumstances may have changed.

import { Report } from "../models/Report.model.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { createHttpError } from "../utils/httpError.js";

export async function createReport({ reporter, targetType, targetId, reason, description }) {
  if (targetType === "user" && targetId.toString() === reporter._id.toString()) {
    throw createHttpError(400, "You cannot report yourself");
  }

  const TargetModel = targetType === "project" ? Project : User;
  const target = await TargetModel.findById(targetId);
  if (!target) {
    throw createHttpError(404, `The ${targetType} being reported was not found`);
  }

  const existing = await Report.findOne({
    reporter: reporter._id,
    targetType,
    targetId,
    status: "pending",
  });
  if (existing) {
    throw createHttpError(409, "You already have a pending report for this");
  }

  return Report.create({
    reporter: reporter._id,
    targetType,
    targetId,
    reason,
    description: description || "",
  });
}
