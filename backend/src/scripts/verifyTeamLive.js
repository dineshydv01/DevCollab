// Boots the real app against your real MongoDB. Builds a full team via
// the real apply/accept flow (so Mongoose's actual schema defaults
// apply, unlike the mock-based tests), then exercises team viewing,
// role assignment, and removal — including the reverse Active ->
// Recruiting transition.
//
// Usage: cd backend && node src/scripts/verifyTeamLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";

const TEST_PORT = 5991;
const BASE = `http://localhost:${TEST_PORT}/api`;

const EMAILS = {
  owner: "verify-team-owner@test.local",
  a: "verify-team-devA@test.local",
  b: "verify-team-devB@test.local",
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

  console.log("\n--- Setup: build a full 2-person team via the real apply/accept flow ---");
  const owner = await registerUser(EMAILS.owner, "verify_team_owner");
  const devA = await registerUser(EMAILS.a, "verify_team_devA");
  const devB = await registerUser(EMAILS.b, "verify_team_devB");

  const project = (
    await (
      await fetch(`${BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        body: JSON.stringify({
          title: "Team Management Test Project",
          description: "A project used to verify team viewing, roles, and removal.",
          category: "Web Development",
          requiredSkills: ["React"],
          teamSize: 2,
          difficulty: "Beginner",
        }),
      })
    ).json()
  ).data;
  const projectId = project._id;

  async function applyAndAccept(dev) {
    const applyRes = await fetch(`${BASE}/projects/${projectId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: dev.cookie },
      body: JSON.stringify({}),
    });
    const application = (await applyRes.json()).data;
    await fetch(`${BASE}/applications/${application._id}/accept`, {
      method: "PUT",
      headers: { Cookie: owner.cookie },
    });
  }

  await applyAndAccept(devA);
  await applyAndAccept(devB);

  const filledProjectRes = await fetch(`${BASE}/projects/${projectId}`);
  const filledProject = (await filledProjectRes.json()).data;
  check("setup: project is now 'Active' (team filled)", filledProject.status === "Active");

  console.log("\n--- GET /projects/:id/team (public) ---");
  const teamRes = await fetch(`${BASE}/projects/${projectId}/team`);
  const teamBody = await teamRes.json();
  check("team view returns 200 without login", teamRes.status === 200);
  check("both members present", teamBody.data.members.length === 2);
  check(
    "member user details are populated (not just raw IDs)",
    teamBody.data.members.every((m) => typeof m.user === "object" && m.user.username)
  );

  console.log("\n--- Assign role: access control ---");
  const nonOwnerRoleRes = await fetch(`${BASE}/projects/${projectId}/team/${devA.id}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: devA.cookie },
    body: JSON.stringify({ role: "Frontend Developer" }),
  });
  check("SECURITY: non-owner cannot assign roles (403)", nonOwnerRoleRes.status === 403);

  console.log("\n--- Assign role: as owner ---");
  const roleRes = await fetch(`${BASE}/projects/${projectId}/team/${devA.id}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ role: "Frontend Developer" }),
  });
  check("owner can assign a role", roleRes.status === 200);

  const teamAfterRoleRes = await fetch(`${BASE}/projects/${projectId}/team`);
  const teamAfterRoleBody = await teamAfterRoleRes.json();
  const devAMember = teamAfterRoleBody.data.members.find((m) => m.user._id === devA.id);
  check("role change is reflected in the team view", devAMember.role === "Frontend Developer");

  console.log("\n--- Remove member: access control ---");
  const nonOwnerRemoveRes = await fetch(`${BASE}/projects/${projectId}/team/${devB.id}`, {
    method: "DELETE",
    headers: { Cookie: devB.cookie },
  });
  check("SECURITY: non-owner cannot remove members (403)", nonOwnerRemoveRes.status === 403);

  console.log("\n--- Remove member: as owner ---");
  const removeRes = await fetch(`${BASE}/projects/${projectId}/team/${devB.id}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });
  check("owner can remove a member", removeRes.status === 200);

  const projectAfterRemovalRes = await fetch(`${BASE}/projects/${projectId}`);
  const projectAfterRemoval = (await projectAfterRemovalRes.json()).data;
  check(
    "BUSINESS RULE: project reverted from 'Active' to 'Recruiting' after dropping below capacity",
    projectAfterRemoval.status === "Recruiting"
  );

  const teamAfterRemovalRes = await fetch(`${BASE}/projects/${projectId}/team`);
  const teamAfterRemovalBody = await teamAfterRemovalRes.json();
  check(
    "removed member no longer appears in the active team view",
    teamAfterRemovalBody.data.members.length === 1 && teamAfterRemovalBody.data.members[0].user._id === devA.id
  );

  console.log("\n--- Removing an already-removed member fails cleanly ---");
  const doubleRemoveRes = await fetch(`${BASE}/projects/${projectId}/team/${devB.id}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });
  check("double-removal rejected with 404", doubleRemoveRes.status === 404);

  console.log("\n--- Cleaning up ---");
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live team management checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
