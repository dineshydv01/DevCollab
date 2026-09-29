// Boots the real app against your real MongoDB and drives the whole
// admin surface: access control, the report flow (including its
// business rules), platform stats, user suspend/restore (including
// the "takes effect on their very next request" property), and
// project moderation with cascade cleanup.
//
// Admins can't be created through the API (there's deliberately no
// open admin registration), so this script creates them directly via
// the User model — the same way you'd seed a real admin.
//
// Usage: cd backend && node src/scripts/verifyAdminLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { Task } from "../models/Task.model.js";
import { Message } from "../models/Message.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { Report } from "../models/Report.model.js";
import { Notification } from "../models/Notification.model.js";

const TEST_PORT = 5983;
const BASE = `http://localhost:${TEST_PORT}/api`;

const EMAILS = {
  admin: "verify-admin-root@test.local",
  admin2: "verify-admin-second@test.local",
  owner: "verify-admin-owner@test.local",
  reporter: "verify-admin-reporter@test.local",
  other: "verify-admin-other@test.local",
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

// Admins are created directly in the database (no API path exists to
// self-register as one), then log in normally.
async function createAdmin(email, username) {
  const admin = await User.create({
    fullName: "Test Admin",
    username,
    email,
    password: "supersecret123",
    role: "admin",
  });
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "supersecret123" }),
  });
  return { cookie: extractCookie(loginRes), id: admin._id.toString() };
}

async function createProject(cookie, title) {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title,
      description: "A project used to verify the admin dashboard and moderation flow.",
      category: "Web Development",
      requiredSkills: ["React"],
      teamSize: 2,
      difficulty: "Beginner",
    }),
  });
  return (await res.json()).data;
}

async function run() {
  await connectDB();
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Setup: 2 admins + owner, reporter, and another regular user ---");
  const admin = await createAdmin(EMAILS.admin, "verify_admin_root");
  const admin2 = await createAdmin(EMAILS.admin2, "verify_admin_second");
  const owner = await registerUser(EMAILS.owner, "verify_admin_owner");
  const reporter = await registerUser(EMAILS.reporter, "verify_admin_reporter");
  const other = await registerUser(EMAILS.other, "verify_admin_other");

  const project = await createProject(owner.cookie, "Admin Moderation Test Project");
  const projectId = project._id;

  console.log("\n--- Admin access control ---");
  const noAuthRes = await fetch(`${BASE}/admin/stats`);
  check("no login returns 401", noAuthRes.status === 401);

  const regularUserRes = await fetch(`${BASE}/admin/stats`, { headers: { Cookie: owner.cookie } });
  check("SECURITY: a regular user cannot access admin stats (403)", regularUserRes.status === 403);

  const regularUserSuspendRes = await fetch(`${BASE}/admin/users/${other.id}/suspend`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });
  check("SECURITY: a regular user cannot suspend anyone (403)", regularUserSuspendRes.status === 403);

  console.log("\n--- Report flow: business rules ---");
  const reportRes = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({
      targetType: "project",
      targetId: projectId,
      reason: "Spam",
      description: "This looks like spam to me.",
    }),
  });
  const projectReport = (await reportRes.json()).data;
  check("filing a project report returns 201", reportRes.status === 201);

  const dupReportRes = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({ targetType: "project", targetId: projectId, reason: "Spam" }),
  });
  check("duplicate PENDING report rejected with 409", dupReportRes.status === 409);

  const selfReportRes = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({ targetType: "user", targetId: reporter.id, reason: "Other" }),
  });
  check("reporting yourself rejected with 400", selfReportRes.status === 400);

  const ghostReportRes = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({
      targetType: "project",
      targetId: new mongoose.Types.ObjectId().toString(),
      reason: "Spam",
    }),
  });
  check("reporting a nonexistent project rejected with 404", ghostReportRes.status === 404);

  const userReportRes = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({ targetType: "user", targetId: other.id, reason: "Harassment" }),
  });
  const userReport = (await userReportRes.json()).data;
  check("filing a user report returns 201", userReportRes.status === 201);

  console.log("\n--- Platform stats ---");
  const statsRes = await fetch(`${BASE}/admin/stats`, { headers: { Cookie: admin.cookie } });
  const stats = (await statsRes.json()).data;
  check("admin can fetch stats", statsRes.status === 200);
  check(
    "stats include every field from spec section 27",
    ["totalUsers", "activeUsers", "suspendedUsers", "totalProjects", "activeProjects", "completedProjects", "reportedProjects"].every(
      (k) => typeof stats[k] === "number"
    )
  );
  check("reportedProjects reflects our pending project report", stats.reportedProjects >= 1);

  console.log("\n--- Admin report queue ---");
  const queueRes = await fetch(`${BASE}/admin/reports?status=pending`, { headers: { Cookie: admin.cookie } });
  const queue = (await queueRes.json()).data;
  const queuedProjectReport = queue.find((r) => r._id === projectReport._id);
  check("pending project report appears in the admin queue", !!queuedProjectReport);
  check(
    "report is enriched with its target (project title)",
    queuedProjectReport?.target?.title === "Admin Moderation Test Project"
  );

  const resolveRes = await fetch(`${BASE}/admin/reports/${projectReport._id}/resolve`, {
    method: "PUT",
    headers: { Cookie: admin.cookie },
  });
  check("admin can resolve a report", resolveRes.status === 200 && (await resolveRes.json()).data.status === "resolved");

  const dismissRes = await fetch(`${BASE}/admin/reports/${userReport._id}/dismiss`, {
    method: "PUT",
    headers: { Cookie: admin.cookie },
  });
  check("admin can dismiss a report", dismissRes.status === 200 && (await dismissRes.json()).data.status === "dismissed");

  const rereportRes = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({ targetType: "project", targetId: projectId, reason: "Fraud" }),
  });
  check("once a report is resolved, the same user CAN file a fresh one", rereportRes.status === 201);

  console.log("\n--- User suspension ---");
  const listUsersRes = await fetch(`${BASE}/admin/users`, { headers: { Cookie: admin.cookie } });
  check("admin can list all users", listUsersRes.status === 200);

  const selfSuspendRes = await fetch(`${BASE}/admin/users/${admin.id}/suspend`, {
    method: "PUT",
    headers: { Cookie: admin.cookie },
  });
  check("an admin cannot suspend themselves (400)", selfSuspendRes.status === 400);

  const suspendAdminRes = await fetch(`${BASE}/admin/users/${admin2.id}/suspend`, {
    method: "PUT",
    headers: { Cookie: admin.cookie },
  });
  check("an admin cannot suspend another admin (400)", suspendAdminRes.status === 400);

  const beforeSuspendRes = await fetch(`${BASE}/auth/me`, { headers: { Cookie: other.cookie } });
  check("setup: 'other' user can use the API before suspension", beforeSuspendRes.status === 200);

  const suspendRes = await fetch(`${BASE}/admin/users/${other.id}/suspend`, {
    method: "PUT",
    headers: { Cookie: admin.cookie },
  });
  check("admin can suspend a regular user", suspendRes.status === 200);

  const afterSuspendRes = await fetch(`${BASE}/auth/me`, { headers: { Cookie: other.cookie } });
  check(
    "BUSINESS RULE: suspension takes effect on their VERY NEXT request, with the same still-valid cookie (403)",
    afterSuspendRes.status === 403
  );

  const suspendedFilterRes = await fetch(`${BASE}/admin/users?isSuspended=true`, { headers: { Cookie: admin.cookie } });
  const suspendedList = (await suspendedFilterRes.json()).data;
  check("suspended user appears in the admin's suspended-only filter", suspendedList.some((u) => u._id === other.id));

  const restoreRes = await fetch(`${BASE}/admin/users/${other.id}/restore`, {
    method: "PUT",
    headers: { Cookie: admin.cookie },
  });
  check("admin can restore a user", restoreRes.status === 200);

  const afterRestoreRes = await fetch(`${BASE}/auth/me`, { headers: { Cookie: other.cookie } });
  check("restored user can use the API again with the same cookie", afterRestoreRes.status === 200);

  console.log("\n--- Project moderation with cascade cleanup ---");
  // Give the project some related data so we can prove cascade works.
  await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ title: "A task that should be cleaned up" }),
  });
  await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reporter.cookie },
    body: JSON.stringify({}),
  });
  await Message.create({
    project: projectId,
    sender: owner.id,
    content: "A message that should be cleaned up",
    readBy: [owner.id],
  });

  check(
    "setup: project has a task, an application, and a message",
    (await Task.countDocuments({ project: projectId })) === 1 &&
      (await CollaborationRequest.countDocuments({ project: projectId })) === 1 &&
      (await Message.countDocuments({ project: projectId })) === 1
  );

  const listProjectsRes = await fetch(`${BASE}/admin/projects`, { headers: { Cookie: admin.cookie } });
  check("admin can list all projects", listProjectsRes.status === 200);

  const nonAdminRemoveRes = await fetch(`${BASE}/admin/projects/${projectId}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });
  check("SECURITY: even the project's OWNER cannot use the admin removal route (403)", nonAdminRemoveRes.status === 403);

  const adminRemoveRes = await fetch(`${BASE}/admin/projects/${projectId}`, {
    method: "DELETE",
    headers: { Cookie: admin.cookie },
  });
  check("admin can remove any project", adminRemoveRes.status === 200);

  check("project is actually gone", (await Project.countDocuments({ _id: projectId })) === 0);
  check(
    "BUSINESS RULE: its tasks, applications, and messages were cascade-deleted (no orphans)",
    (await Task.countDocuments({ project: projectId })) === 0 &&
      (await CollaborationRequest.countDocuments({ project: projectId })) === 0 &&
      (await Message.countDocuments({ project: projectId })) === 0
  );

  console.log("\n--- Owner-initiated deletion now cascades too (Phase 5's deleteProject, fixed) ---");
  const ownedProject = await createProject(owner.cookie, "Owner Deletion Cascade Test");
  await fetch(`${BASE}/projects/${ownedProject._id}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ title: "Task that should vanish with its project" }),
  });
  check("setup: second project has a task", (await Task.countDocuments({ project: ownedProject._id })) === 1);

  const ownerDeleteRes = await fetch(`${BASE}/projects/${ownedProject._id}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });
  check("owner delete still works", ownerDeleteRes.status === 200);
  check(
    "owner deletion ALSO cascades to the project's tasks",
    (await Task.countDocuments({ project: ownedProject._id })) === 0
  );

  console.log("\n--- Cleaning up ---");
  const userIds = [admin.id, admin2.id, owner.id, reporter.id, other.id];
  await Notification.deleteMany({ recipient: { $in: userIds } });
  await Report.deleteMany({ reporter: { $in: userIds } });
  await Project.deleteMany({ owner: { $in: userIds } });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live admin checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
