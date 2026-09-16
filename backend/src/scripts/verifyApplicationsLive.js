// Boots the real app against your real MongoDB and drives a realistic
// sequence: applications, an invitation, acceptance (including the
// auto-transition to "Active" once the team fills), a capacity
// re-check race-condition guard, and cancel/accept authorization
// symmetry between applications and invitations.
//
// Usage: cd backend && node src/scripts/verifyApplicationsLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";

const TEST_PORT = 5992;
const BASE = `http://localhost:${TEST_PORT}/api`;

const EMAILS = {
  owner: "verify-apps-owner@test.local",
  a: "verify-apps-devA@test.local",
  b: "verify-apps-devB@test.local",
  c: "verify-apps-devC@test.local",
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

  console.log("\n--- Setup: owner + 3 developers, project with teamSize=2 ---");
  const owner = await registerUser(EMAILS.owner, "verify_apps_owner");
  const devA = await registerUser(EMAILS.a, "verify_apps_devA");
  const devB = await registerUser(EMAILS.b, "verify_apps_devB");
  const devC = await registerUser(EMAILS.c, "verify_apps_devC");

  const createProjectRes = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      title: "Small Team Project",
      description: "A project with a deliberately small team size to test capacity rules.",
      category: "Web Development",
      requiredSkills: ["React"],
      teamSize: 2,
      difficulty: "Beginner",
    }),
  });
  const project = (await createProjectRes.json()).data;
  const projectId = project._id;

  console.log("\n--- Business rule: owner cannot apply to their own project ---");
  const selfApplyRes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({}),
  });
  check("owner self-apply rejected with 400", selfApplyRes.status === 400);

  console.log("\n--- devA applies ---");
  const applyARes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devA.cookie },
    body: JSON.stringify({ message: "I would love to help with the frontend." }),
  });
  const applicationA = (await applyARes.json()).data;
  check("devA application created with 201", applyARes.status === 201);
  check("application status is pending", applicationA.status === "pending");

  console.log("\n--- Business rule: duplicate application blocked ---");
  const dupApplyRes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devA.cookie },
    body: JSON.stringify({}),
  });
  check("duplicate pending application rejected with 409", dupApplyRes.status === 409);

  console.log("\n--- Access control on applications list ---");
  const nonOwnerListRes = await fetch(`${BASE}/projects/${projectId}/applications`, {
    headers: { Cookie: devA.cookie },
  });
  check("SECURITY: non-owner cannot list applications (403)", nonOwnerListRes.status === 403);

  const ownerListRes = await fetch(`${BASE}/projects/${projectId}/applications`, {
    headers: { Cookie: owner.cookie },
  });
  const ownerListBody = await ownerListRes.json();
  check("owner can list applications", ownerListRes.status === 200);
  check("devA's application appears in the list", ownerListBody.data.some((r) => r._id === applicationA._id));

  console.log("\n--- Business rule: wrong actor cannot accept an application ---");
  const wrongActorAcceptRes = await fetch(`${BASE}/applications/${applicationA._id}/accept`, {
    method: "PUT",
    headers: { Cookie: devB.cookie }, // devB is neither the owner nor the applicant
  });
  check("SECURITY: unrelated user cannot accept an application (403)", wrongActorAcceptRes.status === 403);

  console.log("\n--- Owner accepts devA's application ---");
  const acceptARes = await fetch(`${BASE}/applications/${applicationA._id}/accept`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });
  check("owner accept returns 200", acceptARes.status === 200);

  const projectAfterA = await (await fetch(`${BASE}/projects/${projectId}`)).json();
  check(
    "devA is now an active project member",
    projectAfterA.data.members.some((m) => m.user._id === devA.id || m.user === devA.id)
  );
  check("project still 'Recruiting' (team not full yet, 1/2)", projectAfterA.data.status === "Recruiting");

  console.log("\n--- devB applies; owner invites devC ---");
  const applyBRes = await fetch(`${BASE}/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devB.cookie },
    body: JSON.stringify({}),
  });
  const applicationB = (await applyBRes.json()).data;
  check("devB application created", applyBRes.status === 201);

  const inviteRes = await fetch(`${BASE}/projects/${projectId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ userId: devC.id, message: "Want to join as backend dev?" }),
  });
  const invitationC = (await inviteRes.json()).data;
  check("invitation to devC created with 201", inviteRes.status === 201);
  check("invitation type is 'invitation'", invitationC.type === "invitation");

  console.log("\n--- Business rule: only the invited user can accept their invitation ---");
  const wrongAcceptInviteRes = await fetch(`${BASE}/applications/${invitationC._id}/accept`, {
    method: "PUT",
    headers: { Cookie: devB.cookie },
  });
  check("SECURITY: unrelated user cannot accept devC's invitation (403)", wrongAcceptInviteRes.status === 403);

  console.log("\n--- devC accepts their invitation (fills the team: 2/2) ---");
  const acceptInviteRes = await fetch(`${BASE}/applications/${invitationC._id}/accept`, {
    method: "PUT",
    headers: { Cookie: devC.cookie },
  });
  check("devC accept returns 200", acceptInviteRes.status === 200);

  const projectAfterC = await (await fetch(`${BASE}/projects/${projectId}`)).json();
  check("team now has 2 members", projectAfterC.data.members.length === 2);
  check(
    "BUSINESS RULE: project auto-transitioned to 'Active' once team filled",
    projectAfterC.data.status === "Active"
  );

  console.log("\n--- Race-condition guard: accepting devB now must fail (team already full) ---");
  const acceptBAfterFullRes = await fetch(`${BASE}/applications/${applicationB._id}/accept`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });
  check(
    "accepting a still-pending application into a full team is rejected with 409",
    acceptBAfterFullRes.status === 409
  );

  console.log("\n--- Cancel authorization symmetry ---");
  const ownerCancelsApplicationRes = await fetch(`${BASE}/applications/${applicationB._id}/cancel`, {
    method: "PUT",
    headers: { Cookie: owner.cookie }, // owner did NOT create this application — devB did
  });
  check(
    "SECURITY: owner cannot cancel devB's application (only the applicant can) — 403",
    ownerCancelsApplicationRes.status === 403
  );

  const devBCancelsOwnRes = await fetch(`${BASE}/applications/${applicationB._id}/cancel`, {
    method: "PUT",
    headers: { Cookie: devB.cookie },
  });
  check("devB can cancel their own application", devBCancelsOwnRes.status === 200);

  console.log("\n--- Acting on an already-resolved request is blocked ---");
  const acceptCancelledRes = await fetch(`${BASE}/applications/${applicationB._id}/accept`, {
    method: "PUT",
    headers: { Cookie: owner.cookie },
  });
  check("accepting an already-cancelled request is rejected with 409", acceptCancelledRes.status === 409);

  console.log("\n--- GET /applications/me ---");
  const meRes = await fetch(`${BASE}/applications/me`, { headers: { Cookie: devA.cookie } });
  const meBody = await meRes.json();
  check("devA's personal request list returns 200", meRes.status === 200);
  check(
    "devA's accepted application appears in their personal list",
    meBody.data.some((r) => r._id === applicationA._id)
  );

  console.log("\n--- Cleaning up ---");
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live application/invitation checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
