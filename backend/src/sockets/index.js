// WHAT: All real-time chat behavior — authentication, joining a
//       project's room, sending messages, typing indicators, and
//       online presence.
// WHY this all lives in one file rather than split like the REST
//      layer (routes/controllers/services): Socket.IO's event-handler
//      style doesn't map cleanly onto that split — there's no "route"
//      to separate from "controller" when everything is one
//      `socket.on(eventName, handler)` registration. This file plays
//      the role routes+controllers play together for REST.

import { Server } from "socket.io";
import { parseCookie } from "cookie";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME } from "../utils/cookieOptions.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { Message } from "../models/Message.model.js";
import { isOwnerOf, isActiveMemberOf } from "../utils/projectAuth.js";
import { setIO } from "./ioInstance.js";
import { createNotification } from "../services/notification.service.js";

const roomName = (projectId) => `project:${projectId}`;

// socket.id -> { id, fullName, username, profileImage }
// WHY a plain in-memory Map instead of a database table: presence is
// inherently ephemeral, scoped to THIS server process's live
// connections. Persisting it to MongoDB would be meaningless after a
// restart and would need its own cleanup logic for crashed
// connections — an in-memory map that's naturally emptied by
// disconnect handlers is the honest representation of what this data
// actually is.
const socketUsers = new Map();

export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  // Makes this exact `io` instance reachable from REST controllers/
  // services (e.g. notification.service.js) that have no other way to
  // get at it — see ioInstance.js for why this exists.
  setIO(io);

  // --- Authentication ---
  // Deliberately mirrors the REST `authenticate` middleware: same
  // cookie, same JWT verification, same "re-fetch the user rather
  // than trust the token payload" principle — so there's exactly ONE
  // login system in this app to reason about, not a separate one for
  // sockets. A rejected connection here surfaces as a 'connect_error'
  // event on the client.
  io.use(async (socket, next) => {
    try {
      const rawCookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookie(rawCookieHeader);
      const token = cookies[AUTH_COOKIE_NAME];

      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);

      if (!user || user.isSuspended) return next(new Error("Unauthorized"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socketUsers.set(socket.id, {
      id: socket.user._id.toString(),
      fullName: socket.user.fullName,
      username: socket.user.username,
      profileImage: socket.user.profileImage,
    });
    socket.data.joinedRooms = new Set();

    // Every authenticated socket automatically joins its OWN personal
    // room, separate from any project room it joins later. This is
    // what lets notification.service.js reach "all of this user's
    // active tabs/devices" with io.to(`user:${id}`).emit(...),
    // regardless of which project chats they do or don't have open.
    socket.join(`user:${socket.user._id}`);

    // --- Join a project's chat room ---
    // Spec section 48's exact requirement: authenticate the socket
    // (already done above), identify the user (socket.user), check
    // project membership, and ONLY THEN allow the room join.
    socket.on("project:join", async (projectId, callback) => {
      try {
        const project = await Project.findById(projectId);
        if (!project) {
          return callback?.({ success: false, message: "Project not found" });
        }

        const authorized = isOwnerOf(project, socket.user._id) || isActiveMemberOf(project, socket.user._id);
        if (!authorized) {
          return callback?.({ success: false, message: "Only project members can join this chat" });
        }

        const room = roomName(projectId);
        socket.join(room);
        socket.data.joinedRooms.add(room);

        // Joining the room counts as "viewing" the chat — same
        // mark-as-read behavior as the REST history endpoint.
        await Message.updateMany(
          { project: projectId, sender: { $ne: socket.user._id }, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );

        // Who else is currently in this room? Deduped by user, since
        // the same person could have multiple tabs/sockets open.
        const socketIdsInRoom = io.sockets.adapter.rooms.get(room) || new Set();
        const onlineByUserId = new Map();
        for (const sid of socketIdsInRoom) {
          const info = socketUsers.get(sid);
          if (info) onlineByUserId.set(info.id, info);
        }
        const onlineUsers = Array.from(onlineByUserId.values());

        callback?.({ success: true, onlineUsers });

        // Only announce "just came online" if this is the user's ONLY
        // connection in this room — if they already had another tab
        // open here, they were already visible as online.
        const connectionsForThisUser = Array.from(socketIdsInRoom).filter(
          (sid) => socketUsers.get(sid)?.id === socket.user._id.toString()
        ).length;
        if (connectionsForThisUser === 1) {
          socket.to(room).emit("chat:presence:join", {
            userId: socket.user._id.toString(),
            username: socket.user.username,
          });
        }
      } catch (err) {
        callback?.({ success: false, message: "Failed to join chat" });
      }
    });

    // --- Send a message ---
    socket.on("chat:send", async ({ projectId, content } = {}, callback) => {
      try {
        const room = roomName(projectId);

        // DEFENSE IN DEPTH: don't trust that the client only emits
        // chat:send for rooms it legitimately joined — re-verify
        // membership in Socket.IO's OWN room bookkeeping on every
        // single message, the same "never trust the frontend"
        // principle applied everywhere else in this app.
        if (!socket.rooms.has(room)) {
          return callback?.({
            success: false,
            message: "You must join the project chat before sending messages",
          });
        }

        const trimmed = typeof content === "string" ? content.trim() : "";
        if (!trimmed || trimmed.length > 2000) {
          return callback?.({ success: false, message: "Message must be between 1 and 2000 characters" });
        }

        const message = await Message.create({
          project: projectId,
          sender: socket.user._id,
          content: trimmed,
          readBy: [socket.user._id], // the sender has implicitly "read" their own message
        });

        const payload = {
          _id: message._id.toString(),
          project: projectId,
          content: message.content,
          createdAt: message.createdAt,
          sender: {
            _id: socket.user._id.toString(),
            fullName: socket.user.fullName,
            username: socket.user.username,
            profileImage: socket.user.profileImage,
          },
        };

        // Broadcast to EVERYONE in the room, including the sender —
        // simpler client logic (always render from the event, never
        // optimistically render your own message differently).
        io.to(room).emit("chat:message", payload);
        callback?.({ success: true, data: payload });

        // --- Notifications ---
        // Deliberately skip anyone CURRENTLY connected to this room —
        // they're already seeing the message live, a notification
        // would just be noise. This reuses the exact same "who's in
        // this room right now" lookup as the presence logic above,
        // for a genuinely different purpose.
        const project = await Project.findById(projectId)
          .populate("members.user", "username")
          .populate("owner", "username");

        if (project) {
          const mentionedUsernames = new Set(
            (trimmed.match(/@([a-z0-9_]+)/gi) || []).map((m) => m.slice(1).toLowerCase())
          );

          const socketIdsInRoom = io.sockets.adapter.rooms.get(room) || new Set();
          const onlineUserIds = new Set(
            Array.from(socketIdsInRoom)
              .map((sid) => socketUsers.get(sid)?.id)
              .filter(Boolean)
          );

          const recipients = project.members
            .filter((m) => m.status === "active")
            .map((m) => ({
              id: (m.user._id || m.user).toString(),
              username: m.user.username,
            }));

          const ownerId = (project.owner._id || project.owner).toString();
          if (!recipients.some((r) => r.id === ownerId)) {
            recipients.push({ id: ownerId, username: project.owner.username });
          }

          for (const recipient of recipients) {
            if (recipient.id === socket.user._id.toString()) continue; // never notify yourself
            if (onlineUserIds.has(recipient.id)) continue; // actively viewing this chat right now

            const isMentioned = recipient.username && mentionedUsernames.has(recipient.username.toLowerCase());

            await createNotification({
              recipient: recipient.id,
              type: isMentioned ? "mention" : "new_message",
              message: isMentioned
                ? `${socket.user.username} mentioned you in "${project.title}"`
                : `New message from ${socket.user.username} in "${project.title}"`,
              referenceId: message._id,
            });
          }
        }
      } catch (err) {
        callback?.({ success: false, message: "Failed to send message" });
      }
    });

    // --- Typing indicator ---
    socket.on("chat:typing", ({ projectId, isTyping } = {}) => {
      const room = roomName(projectId);
      if (!socket.rooms.has(room)) return; // silently ignore — same defense-in-depth as chat:send

      // socket.to() (not io.to()) excludes the sender — you don't
      // need to see your own typing indicator.
      socket.to(room).emit("chat:typing", {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        isTyping: !!isTyping,
      });
    });

    // --- Disconnect: presence cleanup ---
    socket.on("disconnect", () => {
      // Deliberately checked AFTER Socket.IO has already removed this
      // socket from its rooms (which happens before 'disconnect'
      // fires) — so io.sockets.adapter.rooms.get(room) here correctly
      // reflects "who's left," not "who was there including me."
      for (const room of socket.data.joinedRooms) {
        const socketIdsInRoom = io.sockets.adapter.rooms.get(room) || new Set();
        const stillOnlineElsewhere = Array.from(socketIdsInRoom).some(
          (sid) => socketUsers.get(sid)?.id === socket.user._id.toString()
        );

        if (!stillOnlineElsewhere) {
          io.to(room).emit("chat:presence:leave", { userId: socket.user._id.toString() });
        }
      }

      socketUsers.delete(socket.id);
    });
  });

  return io;
}
