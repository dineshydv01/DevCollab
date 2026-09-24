// Boots the real app + Socket.IO against your real MongoDB and drives
// notification triggers across almost every previous phase: applications,
// invitations, task assignment/reassignment/status changes, project
// completion, and chat (mentions vs. plain messages, and skipping
// anyone actively viewing the chat room). Also verifies real-time
// delivery via each user's personal socket room, and the REST
// notification-management endpoints.
//
// Usage: cd backend && node src/scripts/verifyNotificationsLive.js

import http from "http";
import mongoose from "mongoose";
import { io as ioClient } from "socket.io-client";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { initializeSocket } from "../sockets/index.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { Task } from "../models/Task.model.js";
import { Message } from "../models/Message.model.js";
import { Notification } from "../models/Notification.model.js";

const TEST_PORT = 5986;
const BASE = `http://localhost:${TEST_PORT}/api`;
const SOCKET_URL = `http://localhost:${TEST_PORT}`;

const EMAILS = {
  owner: "verify-notif-owner@test.local",
  a: "verify-notif-devA@test.local",
  b: "verify-notif-devB@test.local",
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
  return { cookie: extractCookie(res), id: body.data._id, username };
}

function connectSocket(cookie) {
  return ioClient(SOCKET_URL, { transports: ["websocket"], reconnection: false, extraHeaders: { Cookie: cookie } });
}

function emitWithAck(socket, event, payload, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ack on ${event}`)), timeoutMs);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

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

  console.log("\n--- Setup: owner + 2 developers, project with teamSize=2, all sockets connected ---");
  const owner = await registerUser(EMAILS.owner, "verify_notif_owner");
  const devA = await registerUser(EMAILS.a, "verify_notif_devA");
  const devB = await registerUser(EMAILS.b, "verify_notif_devB");

  const ownerSocket = connectSocket(owner.cookie);
  const aSocket = connectSocket(devA.cookie);
  const bSocket = connectSocket(devB.cookie);
  await Promise.all([ownerSocket, aSocket, bSocket].map((s) => new Promise((r) => s.on("connect", r))));

  const project = (
    await (
      await fetch(`${BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        body: JSON.stringify({
          title: "Notification Test Project",
          description: "A project used to verify the notification system across every trigger point.",
          category: "Web Development",
          requiredSkills: ["React"],
          teamSize: 2,
          difficulty: "Beginner",
        }),
      })
    ).json()
  ).data;
  const projectId = project._id;

  console.log("\n--- application_received: real-time push to a connected owner ---");
  const applicationReceivedPromise = waitForEvent(ownerSocket, "notification:new");
  const applyARes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devA.cookie },
    body: JSON.stringify({}),
  });
  const applicationA = (await applyARes.json()).data;
  const applicationReceivedEvent = await applicationReceivedPromise;
  check(
    "BUSINESS RULE: owner receives a real-time push the moment devA applies",
    applicationReceivedEvent && applicationReceivedEvent.type === "application_received"
  );

  console.log("\n--- application_rejected: real-time push to devA ---");
  const applicationRejectedPromise = waitForEvent(aSocket, "notification:new");
  await fetch(`${BASE}/applications/${applicationA._id}/reject`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });
  const applicationRejectedEvent = await applicationRejectedPromise;
  check(
    "devA is notified in real time when their application is rejected",
    applicationRejectedEvent && applicationRejectedEvent.type === "application_rejected"
  );

  console.log("\n--- invitation_received + invitation_accepted + team_joined ---");
  const invitationReceivedPromise = waitForEvent(bSocket, "notification:new");
  const inviteRes = await fetch(`${BASE}/projects/${projectId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ userId: devB.id }),
  });
  const invitation = (await inviteRes.json()).data;
  const invitationReceivedEvent = await invitationReceivedPromise;
  check("devB notified in real time when invited", invitationReceivedEvent?.type === "invitation_received");

  const invitationAcceptedPromise = waitForEvent(ownerSocket, "notification:new");
  const teamJoinedPromise = waitForEvent(bSocket, "notification:new");
  await fetch(`${BASE}/applications/${invitation._id}/accept`, {
    method: "PUT",
    headers: { Cookie: devB.cookie },
  });
  const [invitationAcceptedEvent, teamJoinedEvent] = await Promise.all([invitationAcceptedPromise, teamJoinedPromise]);
  check("owner notified that the invitation was accepted", invitationAcceptedEvent?.type === "invitation_accepted");
  check("devB notified that they joined the team", teamJoinedEvent?.type === "team_joined");

  console.log("\n--- devA re-applies and gets accepted (fills the team) ---");
  const reapplyRes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devA.cookie },
    body: JSON.stringify({}),
  });
  const reapplication = (await reapplyRes.json()).data;
  await fetch(`${BASE}/applications/${reapplication._id}/accept`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });
  const teamCheck = await (await fetch(`${BASE}/projects/${projectId}`)).json();
  check("team is now full and Active", teamCheck.data.status === "Active");

  console.log("\n--- task_assigned on creation ---");
  const taskAssignedPromise = waitForEvent(bSocket, "notification:new");
  const taskRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ title: "Build login page", assignedTo: devB.id }),
  });
  const task = (await taskRes.json()).data;
  const taskAssignedEvent = await taskAssignedPromise;
  check("devB notified in real time when assigned a task", taskAssignedEvent?.type === "task_assigned");

  console.log("\n--- task_assigned on reassignment ---");
  const reassignPromise = waitForEvent(aSocket, "notification:new");
  await fetch(`${BASE}/tasks/${task._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ assignedTo: devA.id }),
  });
  const reassignEvent = await reassignPromise;
  check("devA notified when reassigned to the task", reassignEvent?.type === "task_assigned");

  console.log("\n--- task_status_changed: both directions ---");
  const ownerNotifiedPromise = waitForEvent(ownerSocket, "notification:new");
  await fetch(`${BASE}/tasks/${task._id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: devA.cookie },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  const ownerNotifiedEvent = await ownerNotifiedPromise;
  check(
    "owner notified when the ASSIGNEE changes status",
    ownerNotifiedEvent?.type === "task_status_changed"
  );

  const assigneeNotifiedPromise = waitForEvent(aSocket, "notification:new");
  await fetch(`${BASE}/tasks/${task._id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ status: "COMPLETED" }),
  });
  const assigneeNotifiedEvent = await assigneeNotifiedPromise;
  check(
    "assignee notified when the OWNER changes status",
    assigneeNotifiedEvent?.type === "task_status_changed"
  );

  console.log("\n--- project_completed: notifies all active members ---");
  const aProjectDonePromise = waitForEvent(aSocket, "notification:new");
  const bProjectDonePromise = waitForEvent(bSocket, "notification:new");
  await fetch(`${BASE}/projects/${projectId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ status: "Completed" }),
  });
  const [aDone, bDone] = await Promise.all([aProjectDonePromise, bProjectDonePromise]);
  check("devA notified when project marked completed", aDone?.type === "project_completed");
  check("devB notified when project marked completed", bDone?.type === "project_completed");

  console.log("\n--- Chat notifications: skip active viewers, mention vs plain message ---");
  // devB joins the chat room (actively viewing); devA does NOT join —
  // simulating someone who's away from the chat.
  await emitWithAck(ownerSocket, "project:join", projectId);
  await emitWithAck(bSocket, "project:join", projectId);

  const mentionPromise = waitForEvent(aSocket, "notification:new");
  const bShouldNotBeNotifiedPromise = waitForEvent(bSocket, "notification:new", 1500);
  await emitWithAck(ownerSocket, "chat:send", {
    projectId,
    content: `Hey @${devA.username}, can you review this?`,
  });
  const [mentionEvent, bWronglyNotified] = await Promise.all([mentionPromise, bShouldNotBeNotifiedPromise]);
  check("devA (not in the room) gets a 'mention' notification", mentionEvent?.type === "mention");
  check(
    "BUSINESS RULE: devB (actively viewing the room) is NOT notified",
    bWronglyNotified === null
  );

  const plainMessagePromise = waitForEvent(aSocket, "notification:new");
  await emitWithAck(ownerSocket, "chat:send", { projectId, content: "Just a regular update, no mentions." });
  const plainMessageEvent = await plainMessagePromise;
  check(
    "a non-mention message to an offline-from-the-room user is 'new_message', not 'mention'",
    plainMessageEvent?.type === "new_message"
  );

  console.log("\n--- REST: list, unread count, mark read, mark all read ---");
  const listRes = await fetch(`${BASE}/notifications`, { headers: { Cookie: devA.cookie } });
  const listBody = await listRes.json();
  check("devA can list their notifications", listRes.status === 200 && listBody.data.length > 0);

  const unreadRes = await fetch(`${BASE}/notifications/unread-count`, { headers: { Cookie: devA.cookie } });
  const unreadBody = await unreadRes.json();
  check("unread count is greater than zero", unreadBody.data.count > 0);

  const oneNotificationId = listBody.data[0]._id;
  const markReadRes = await fetch(`${BASE}/notifications/${oneNotificationId}/read`, {
    method: "PUT",
    headers: { Cookie: devA.cookie },
  });
  check("marking a single notification read succeeds", markReadRes.status === 200);

  const otherUserMarkReadRes = await fetch(`${BASE}/notifications/${oneNotificationId}/read`, {
    method: "PUT",
    headers: { Cookie: devB.cookie },
  });
  check("SECURITY: a different user cannot mark someone else's notification as read", otherUserMarkReadRes.status === 404);

  await fetch(`${BASE}/notifications/read-all`, { method: "PUT", headers: { Cookie: devA.cookie } });
  const unreadAfterRes = await fetch(`${BASE}/notifications/unread-count`, { headers: { Cookie: devA.cookie } });
  const unreadAfterBody = await unreadAfterRes.json();
  check("mark-all-read brings unread count to zero", unreadAfterBody.data.count === 0);

  console.log("\n--- Cleaning up ---");
  ownerSocket.close();
  aSocket.close();
  bSocket.close();
  await Notification.deleteMany({ recipient: { $in: [owner.id, devA.id, devB.id] } });
  await Task.deleteMany({ project: projectId });
  await Message.deleteMany({ project: projectId });
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  httpServer.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live notification checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
