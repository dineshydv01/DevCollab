import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import {
  getStats,
  listAllUsers,
  suspendUser,
  restoreUser,
  listAllProjects,
  removeProject,
} from "../controllers/admin.controller.js";
import { listReports, resolveReport, dismissReport } from "../controllers/report.controller.js";

const router = Router();

// Every route in this file needs BOTH "logged in" and "is an admin."
// Applying them once here with router.use() — instead of repeating
// authenticate + authorize("admin") on every route below, the way
// every other router in this project has done per-route — means it's
// structurally impossible to add a new admin route and forget the
// authorization check. This is the first router in the project to
// use router-level middleware.
router.use(authenticate, authorize("admin"));

router.get("/stats", getStats);

router.get("/users", listAllUsers);
router.put("/users/:id/suspend", validateObjectId("id"), suspendUser);
router.put("/users/:id/restore", validateObjectId("id"), restoreUser);

router.get("/projects", listAllProjects);
router.delete("/projects/:id", validateObjectId("id"), removeProject);

router.get("/reports", listReports);
router.put("/reports/:id/resolve", validateObjectId("id"), resolveReport);
router.put("/reports/:id/dismiss", validateObjectId("id"), dismissReport);

export default router;
