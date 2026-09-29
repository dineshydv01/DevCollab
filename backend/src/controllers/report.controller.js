import { Report } from "../models/Report.model.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { createReport } from "../services/report.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const REPORT_STATUSES = ["pending", "resolved", "dismissed"];

export const submitReport = asyncHandler(async function submitReport(req, res) {
  const report = await createReport({ reporter: req.user, ...req.body });

  res.status(201).json({
    success: true,
    message: "Report submitted successfully",
    data: report,
  });
});

export const listReports = asyncHandler(async function listReports(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {};
  if (REPORT_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const [reports, total] = await Promise.all([
    Report.find(filter).populate("reporter", "fullName username").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);

  // Enrich each report with a snapshot of its target. targetId is a
  // generic reference (it could point at a User OR a Project
  // depending on targetType), which Mongoose's .populate() can't
  // resolve on its own — same limitation as Notification.referenceId
  // from Phase 12. An admin queue is paginated and small, so a
  // per-report lookup here is perfectly reasonable.
  const enriched = await Promise.all(
    reports.map(async (report) => {
      const TargetModel = report.targetType === "project" ? Project : User;
      const fields = report.targetType === "project" ? "title status" : "fullName username isSuspended";
      const target = await TargetModel.findById(report.targetId).select(fields);
      return { ...report.toObject(), target };
    })
  );

  res.status(200).json({
    success: true,
    data: enriched,
    ...buildPaginationMeta(page, limit, total),
  });
});

// Resolve and dismiss share one implementation — they differ only in
// the status they set (same factory pattern as accept/reject/cancel
// in Phase 8).
function markReport(status) {
  return asyncHandler(async function mark(req, res) {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    report.status = status;
    await report.save();

    res.status(200).json({
      success: true,
      message: `Report marked as ${status}`,
      data: report,
    });
  });
}

export const resolveReport = markReport("resolved");
export const dismissReport = markReport("dismissed");
