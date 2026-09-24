import { Notification } from "../models/Notification.model.js";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

export const listNotifications = asyncHandler(async function listNotifications(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { recipient: req.user._id };
  if (req.query.isRead === "true") filter.isRead = true;
  if (req.query.isRead === "false") filter.isRead = false;

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: notifications,
    ...buildPaginationMeta(page, limit, total),
  });
});

export const markRead = asyncHandler(async function markRead(req, res) {
  const notification = await markNotificationAsRead(req.params.id, req.user._id);
  res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
});

export const markAllRead = asyncHandler(async function markAllRead(req, res) {
  await markAllNotificationsAsRead(req.user._id);
  res.status(200).json({ success: true, message: "All notifications marked as read" });
});

export const getUnreadCount = asyncHandler(async function getUnreadCount(req, res) {
  const count = await getUnreadNotificationCount(req.user._id);
  res.status(200).json({ success: true, data: { count } });
});
