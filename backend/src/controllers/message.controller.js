// WHAT: Read-only access to a project's persisted chat history.
// WHY no POST here: sending a message is inherently a real-time
//      interaction — the whole point is that other participants see
//      it immediately. Routing "send" through REST first (write to
//      Mongo, then separately notify sockets) would just add a network
//      hop with no benefit over having the socket handler itself
//      create the Message directly (see sockets/index.js). REST here
//      exists for exactly one job: let a client load history it wasn't
//      connected in real time to see (e.g. on first opening the chat,
//      or after being offline).

import { Message } from "../models/Message.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

export const listProjectMessages = asyncHandler(async function listProjectMessages(req, res) {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { project: req.project._id };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .populate("sender", "fullName username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments(filter),
  ]);

  // Fetching history is treated as "viewing" the chat — mark every
  // message the requester didn't send themselves as read. This covers
  // the initial page load; the Socket.IO project:join handler does
  // the equivalent for the live session that follows.
  await Message.updateMany(
    { project: req.project._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  res.status(200).json({
    success: true,
    data: messages,
    ...buildPaginationMeta(page, limit, total),
  });
});
