// Boots the real app against your real MongoDB. Builds a real 2-person
// team, then proves: only the owner can create/edit/delete tasks; only
// the owner or a project OUTSIDER cannot see tasks at all; and status
// changes are allowed for the assignee too — but nobody else.
//
// Usage: cd backend && node src/scripts/verifyTasksLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { Task } from "../models/Task.model.js";

const TEST_PORT = 5990;
const BASE = `http://localhost:${TEST_PORT}/api`;

const EMAILS = {
  owner: "verify-tasks-owner@test.local",
  member: "verify-tasks-member@test.local",
  outsider: "verify-tasks-outsider@test.local",
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

async function run() {
  await connectDB();
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Setup: owner + 1 team member + 1 outsider ---");
  const owner = await registerUser(EMAILS.owner, "verify_tasks_owner");
  const member = await registerUser(EMAILS.member, "verify_tasks_member");
  const outsider = await registerUser(EMAILS.outsider, "verify_tasks_outsider");

  const project = (
    await (
      await fetch(`${BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        body: JSON.stringify({
          title: "Task Board Test Project",
          description: "A project used to verify task CRUD and Kanban authorization.",
          category: "Web Development",
          requiredSkills: ["React"],
          teamSize: 1,
          difficulty: "Beginner",
        }),
      })
    ).json()
  ).data;
  const projectId = project._id;

  // Get member onto the team via the real apply/accept flow.
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

  console.log("\n--- Business rule: assignedTo must be a real team member ---");
  const badAssigneeRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ title: "Should fail", assignedTo: outsider.id }),
  });
  check("assigning an outsider is rejected with 400", badAssigneeRes.status === 400);

  console.log("\n--- Create task: access control ---");
  const nonOwnerCreateRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member.cookie },
    body: JSON.stringify({ title: "Should fail" }),
  });
  check("SECURITY: non-owner cannot create tasks (403)", nonOwnerCreateRes.status === 403);

  console.log("\n--- Create task: as owner, assigned to the member ---");
  const createRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      title: "Build the login page",
      description: "Implement the login form with validation.",
      assignedTo: member.id,
      priority: "High",
      deadline: "2026-12-31",
    }),
  });
  const task = (await createRes.json()).data;
  check("task created with 201", createRes.status === 201);
  check("task defaults to TODO status", task.status === "TODO");
  const taskId = task._id;

  console.log("\n--- List tasks: access control ---");
  const outsiderListRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    headers: { Cookie: outsider.cookie },
  });
  check("SECURITY: outsider cannot list project tasks (403)", outsiderListRes.status === 403);

  const memberListRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    headers: { Cookie: member.cookie },
  });
  const memberListBody = await memberListRes.json();
  check("team member CAN list project tasks", memberListRes.status === 200);
  check("the created task appears in the list", memberListBody.data.some((t) => t._id === taskId));

  console.log("\n--- Update task (full edit): access control ---");
  const memberEditRes = await fetch(`${BASE}/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: member.cookie },
    body: JSON.stringify({ title: "Hijacked title" }),
  });
  check("SECURITY: assignee cannot do a full edit (403 — owner only)", memberEditRes.status === 403);

  const ownerEditRes = await fetch(`${BASE}/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ priority: "Critical" }),
  });
  check("owner full edit succeeds", ownerEditRes.status === 200);

  console.log("\n--- Update task status: the KEY authorization difference ---");
  const outsiderStatusRes = await fetch(`${BASE}/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: outsider.cookie },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  check("SECURITY: an outsider cannot change status (403)", outsiderStatusRes.status === 403);

  const memberStatusRes = await fetch(`${BASE}/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: member.cookie },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  check(
    "BUSINESS RULE: the ASSIGNEE (not owner) CAN change status, unlike full edit above",
    memberStatusRes.status === 200
  );
  const memberStatusBody = await memberStatusRes.json();
  check("status actually changed to IN_PROGRESS", memberStatusBody.data.status === "IN_PROGRESS");

  const ownerStatusRes = await fetch(`${BASE}/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ status: "COMPLETED" }),
  });
  check("owner can also change status", ownerStatusRes.status === 200);

  console.log("\n--- Delete task: access control ---");
  const memberDeleteRes = await fetch(`${BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Cookie: member.cookie },
  });
  check("SECURITY: assignee cannot delete the task (403 — owner only)", memberDeleteRes.status === 403);

  const ownerDeleteRes = await fetch(`${BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });
  check("owner can delete the task", ownerDeleteRes.status === 200);

  console.log("\n--- Cleaning up ---");
  await Task.deleteMany({ project: projectId });
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live task checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
