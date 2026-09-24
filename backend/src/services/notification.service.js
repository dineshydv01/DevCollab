// WHAT: The reusable functions every other part of the app calls to
//       notify a user, and the ones the notification bell UI calls to
//       manage read state.
// WHY centralized here (spec section 49): every trigger point across
//      the app (applications, invitations, tasks, chat) needs the
//      EXACT same behavior — write to MongoDB, then push in real time
//      if the recipient is currently connected. Writing that logic
//      once here, instead of "create a Notification doc + emit a
//      socket event" copy-pasted at every trigger site, is what makes
//      those trigger sites a one-line call.

import { Notification } from "../models/Notification.model.js";
import { getIO } from "../sockets/ioInstance.js";
import { createHttpError } from "../utils/httpError.js";

export async function createNotification({ recipient, type, message, referenceId = null }) {
  const notification = await Notification.create({ recipient, type, message, referenceId });

  // If the recipient has no active connection, getIO().to(...).emit()
  // is a harmless no-op — Socket.IO simply has no sockets in that
  // room. The notification is still safely in MongoDB either way,
  // ready for GET /api/notifications whenever they next log in.
  const io = getIO();
  if (io) {
    io.to(`user:${recipient}`).emit("notification:new", notification);
  }

  return notification;
}

export async function markNotificationAsRead(notificationId, userId) {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });

  if (!notification) {
    // Deliberately the same 404 whether the notification doesn't
    // exist OR belongs to someone else — never reveal which case it
    // is, the same principle as login's "invalid email or password."
    throw createHttpError(404, "Notification not found");
  }

  notification.isRead = true;
  await notification.save();
  return notification;
}

export async function markAllNotificationsAsRead(userId) {
  await Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
}

export async function getUnreadNotificationCount(userId) {
  return Notification.countDocuments({ recipient: userId, isRead: false });
}
