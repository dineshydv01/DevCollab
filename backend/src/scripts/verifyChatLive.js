// Boots the REAL app + Socket.IO server against your real MongoDB, then
// drives actual socket.io-client connections through the full chat
// flow: auth rejection, room-join authorization (owner, member,
// outsider), sending a message and having it broadcast + persisted,
// the defense-in-depth re-check on chat:send, typing indicators, and
// presence join/leave events.
//
// Usage: cd backend && node src/scripts/verifyChatLive.js

import http from "http";
import mongoose from "mongoose";
import { io as ioClient } from "socket.io-client";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { initializeSocket } from "../sockets/index.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { Message } from "../models/Message.model.js";

const TEST_PORT = 5988;
const BASE = `http://localhost:${TEST_PORT}/api`;
const SOCKET_URL = `http://localhost:${TEST_PORT}`;

const EMAILS = {
  owner: "verify-chat-owner@test.local",
  member: "verify-chat-member@test.local",
  outsider: "verify-chat-outsider@test.local",
};

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : null;
}

async function registerUser(email, username) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Test User",
      username,
      email,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    }),
  });
  const body = await res.json();
  return { cookie: extractCookie(res), id: body.data._id };
}

function connectSocket(cookie) {
  return ioClient(SOCKET_URL, {
    transports: ["websocket"],
    reconnection: false,
    extraHeaders: { Cookie: cookie },
  });
}

// Wraps a socket.emit(...) that expects an acknowledgment callback
// into a Promise, with a timeout so a hung server doesn't hang the test.
function emitWithAck(socket, event, payload, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ack on ${event}`)), timeoutMs);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

// Waits for a specific event, with a timeout that resolves to null
// instead of hanging forever (useful for "assert this does NOT fire").
function waitForEvent(socket, event, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function run() {
  await connectDB();
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });

  const app = createApp();
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(TEST_PORT, resolve));

  console.log("\n--- Setup: owner + team member + outsider, plus a real team ---");
  const owner = await registerUser(EMAILS.owner, "verify_chat_owner");
  const member = await registerUser(EMAILS.member, "verify_chat_member");
  const outsider = await registerUser(EMAILS.outsider, "verify_chat_outsider");

  const project = (
    await (
      await fetch(`${BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        body: JSON.stringify({
          title: "Chat Test Project",
          description: "A project used to verify Socket.IO chat behavior end to end.",
          category: "Web Development",
          requiredSkills: ["React"],
          teamSize: 1,
          difficulty: "Beginner",
        }),
      })
    ).json()
  ).data;
  const projectId = project._id;

  const applyRes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member.cookie },
    body: JSON.stringify({}),
  });
  const application = (await applyRes.json()).data;
  await fetch(`${BASE}/applications/${application._id}/accept`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });

  console.log("\n--- Socket auth: connection with an invalid cookie is rejected ---");
  const badAuthSocket = connectSocket("devcollab_token=garbage.invalid.token");
  const badAuthResult = await new Promise((resolve) => {
    badAuthSocket.on("connect", () => resolve("connected"));
    badAuthSocket.on("connect_error", (err) => resolve(err.message));
  });
  check("SECURITY: invalid token rejected at the socket layer", badAuthResult === "Unauthorized");
  badAuthSocket.close();

  console.log("\n--- Connect real sockets for owner, member, and outsider ---");
  const ownerSocket = connectSocket(owner.cookie);
  const memberSocket = connectSocket(member.cookie);
  const outsiderSocket = connectSocket(outsider.cookie);
  await Promise.all(
    [ownerSocket, memberSocket, outsiderSocket].map(
      (s) => new Promise((resolve) => s.on("connect", resolve))
    )
  );
  check("all three authenticated sockets connected", true);

  console.log("\n--- Room join: authorization ---");
  const outsiderJoinResult = await emitWithAck(outsiderSocket, "project:join", projectId);
  check("SECURITY: outsider cannot join the project chat room", outsiderJoinResult.success === false);

  const ownerJoinResult = await emitWithAck(ownerSocket, "project:join", projectId);
  check("owner can join the room", ownerJoinResult.success === true);

  const memberJoinPromise = emitWithAck(memberSocket, "project:join", projectId);
  const presenceJoinPromise = waitForEvent(ownerSocket, "chat:presence:join");
  const [memberJoinResult, presenceJoinEvent] = await Promise.all([memberJoinPromise, presenceJoinPromise]);
  check("team member can join the room", memberJoinResult.success === true);
  check(
    "BUSINESS RULE: owner is notified in real time when member joins (presence)",
    presenceJoinEvent && presenceJoinEvent.userId === member.id
  );

  console.log("\n--- Sending a message ---");
  const messagePromise = waitForEvent(memberSocket, "chat:message");
  const sendResult = await emitWithAck(ownerSocket, "chat:send", {
    projectId,
    content: "Welcome to the team!",
  });
  const receivedMessage = await messagePromise;
  check("send acknowledgment reports success", sendResult.success === true);
  check("the OTHER connected client received the message in real time", receivedMessage && receivedMessage.content === "Welcome to the team!");
  check("broadcast message includes sender info", receivedMessage.sender.username === "verify_chat_owner");

  const persistedMessage = await Message.findOne({ project: projectId, content: "Welcome to the team!" });
  check("message was actually persisted to MongoDB, not just broadcast", !!persistedMessage);

  console.log("\n--- Defense in depth: chat:send is re-checked even for a socket that never joined ---");
  const neverJoinedSocket = connectSocket(outsider.cookie);
  await new Promise((resolve) => neverJoinedSocket.on("connect", resolve));
  const unauthorizedSendResult = await emitWithAck(neverJoinedSocket, "chat:send", {
    projectId,
    content: "I was never authorized to be here",
  });
  check(
    "SECURITY: sending to a room you never joined is rejected, even with a valid login",
    unauthorizedSendResult.success === false
  );
  neverJoinedSocket.close();

  console.log("\n--- Typing indicator ---");
  const typingPromise = waitForEvent(ownerSocket, "chat:typing");
  memberSocket.emit("chat:typing", { projectId, isTyping: true });
  const typingEvent = await typingPromise;
  check("typing event received by the other participant", typingEvent && typingEvent.userId === member.id);
  check("typing event carries isTyping: true", typingEvent.isTyping === true);

  console.log("\n--- REST: chat history + read receipts ---");
  const historyRes = await fetch(`${BASE}/projects/${projectId}/messages`, {
    headers: { Cookie: member.cookie },
  });
  const historyBody = await historyRes.json();
  check("member can fetch chat history via REST", historyRes.status === 200);
  check("history includes the message sent earlier", historyBody.data.some((m) => m.content === "Welcome to the team!"));

  const messageAfterRead = await Message.findOne({ project: projectId, content: "Welcome to the team!" });
  check(
    "BUSINESS RULE: fetching history marks the message as read by the member",
    messageAfterRead.readBy.map((id) => id.toString()).includes(member.id)
  );

  console.log("\n--- Presence: leave on disconnect ---");
  const presenceLeavePromise = waitForEvent(ownerSocket, "chat:presence:leave");
  memberSocket.close();
  const presenceLeaveEvent = await presenceLeavePromise;
  check(
    "owner is notified in real time when member disconnects",
    presenceLeaveEvent && presenceLeaveEvent.userId === member.id
  );

  console.log("\n--- Cleaning up ---");
  ownerSocket.close();
  outsiderSocket.close();
  await Message.deleteMany({ project: projectId });
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  httpServer.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live chat checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
