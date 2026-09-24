import { Router } from "express";
import { listNotifications, markRead, markAllRead, getUnreadCount } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();

router.get("/", authenticate, listNotifications);
router.get("/unread-count", authenticate, getUnreadCount);
router.put("/read-all", authenticate, markAllRead);
router.put("/:id/read", authenticate, validateObjectId("id"), markRead);

export default router;
