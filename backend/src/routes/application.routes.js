import { Router } from "express";
import {
  listMyRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
} from "../controllers/collaborationRequest.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();

// GET /api/applications/me — everything involving me, as either the
// applicant or the project owner. Registered BEFORE "/:id/..." routes
// for the same reason as PUT /users/profile in Phase 4 — otherwise
// Express would try to treat "me" as an :id value.
router.get("/me", authenticate, listMyRequests);

// PUT /api/applications/:id/accept
router.put("/:id/accept", authenticate, validateObjectId("id"), acceptRequest);

// PUT /api/applications/:id/reject
router.put("/:id/reject", authenticate, validateObjectId("id"), rejectRequest);

// PUT /api/applications/:id/cancel — not in the original spec's API
// list, but a natural and necessary extension: without it, an
// applicant can never withdraw their own application, nor can an
// owner retract an invitation they no longer want to offer.
router.put("/:id/cancel", authenticate, validateObjectId("id"), cancelRequest);

export default router;
