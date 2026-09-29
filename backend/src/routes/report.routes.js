import { Router } from "express";
import { submitReport } from "../controllers/report.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { createReportSchema } from "../validators/report.validator.js";

const router = Router();

// POST /api/reports — any logged-in user can file a report. The
// admin-side management routes (list/resolve/dismiss) live in
// admin.routes.js instead, under the admin-only router-level guard.
router.post("/", authenticate, validate(createReportSchema), submitReport);

export default router;
