// Boots the real app against your real MongoDB and proves project CRUD
// AND ownership enforcement work end-to-end — specifically, that User B
// genuinely cannot edit or delete User A's project, not just that the
// frontend hides a button.
//
// Usage: cd backend && node src/scripts/verifyProjectsLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";

const TEST_PORT = 5995;
const BASE = `http://localhost:${TEST_PORT}/api`;
const OWNER_EMAIL = "verify-project-owner@test.local";
const OTHER_EMAIL = "verify-project-other@test.local";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : null;
}

async function registerUser(base, email, username) {
  const res = await fetch(`${base}/auth/register`, {
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
  await User.deleteMany({ email: { $in: [OWNER_EMAIL, OTHER_EMAIL] } });

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Setup: register two separate users ---");
  const owner = await registerUser(BASE, OWNER_EMAIL, "verify_project_owner");
  const other = await registerUser(BASE, OTHER_EMAIL, "verify_project_other");

  console.log("\n--- POST /projects (create, without login) ---");
  const noAuthCreateRes = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Should fail" }),
  });
  check("create without login returns 401", noAuthCreateRes.status === 401);

  console.log("\n--- POST /projects (create, as owner) ---");
  const createRes = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      title: "AI Resume Analyzer",
      description: "A tool that analyzes resumes using NLP to score fit for job roles.",
      category: "AI/ML",
      requiredSkills: ["Python", "reactjs"],
      teamSize: 4,
      difficulty: "Intermediate",
      owner: other.id, // security check: must be ignored, real owner is the logged-in user
    }),
  });
  const createBody = await createRes.json();
  check("create returns 201", createRes.status === 201);
  check("SECURITY: owner is the actual logged-in user, not the injected one", createBody.data.owner === owner.id);
  check(
    "skills normalized on create",
    JSON.stringify(createBody.data.requiredSkills) === JSON.stringify(["Python", "React"])
  );
  const projectId = createBody.data._id;

  console.log("\n--- GET /projects/:id (public view) ---");
  const viewRes = await fetch(`${BASE}/projects/${projectId}`);
  const viewBody = await viewRes.json();
  check("public view returns 200 without login", viewRes.status === 200);
  check("owner is populated with basic info", viewBody.data.owner.username === "verify_project_owner");

  console.log("\n--- PUT /projects/:id as a DIFFERENT user (should be blocked) ---");
  const otherUpdateRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: other.cookie },
    body: JSON.stringify({ title: "Hijacked title" }),
  });
  check("SECURITY: non-owner update rejected with 403", otherUpdateRes.status === 403);

  console.log("\n--- DELETE /projects/:id as a DIFFERENT user (should be blocked) ---");
  const otherDeleteRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: "DELETE",
    headers: { Cookie: other.cookie },
  });
  check("SECURITY: non-owner delete rejected with 403", otherDeleteRes.status === 403);

  console.log("\n--- PUT /projects/:id as the actual owner (should succeed) ---");
  const ownerUpdateRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ title: "AI Resume Analyzer v2" }),
  });
  const ownerUpdateBody = await ownerUpdateRes.json();
  check("owner update returns 200", ownerUpdateRes.status === 200);
  check("title actually changed", ownerUpdateBody.data.title === "AI Resume Analyzer v2");

  console.log("\n--- GET /projects (paginated listing) ---");
  const listRes = await fetch(`${BASE}/projects?page=1&limit=5`);
  const listBody = await listRes.json();
  check("listing returns 200 without login", listRes.status === 200);
  check("listing includes pagination metadata", typeof listBody.totalPages === "number");
  check(
    "our test project appears in the list",
    listBody.data.some((p) => p._id === projectId)
  );

  console.log("\n--- DELETE /projects/:id as the actual owner (should succeed) ---");
  const ownerDeleteRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });
  check("owner delete returns 200", ownerDeleteRes.status === 200);

  const confirmGoneRes = await fetch(`${BASE}/projects/${projectId}`);
  check("project is actually gone (404)", confirmGoneRes.status === 404);

  console.log("\n--- Cleaning up ---");
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: [OWNER_EMAIL, OTHER_EMAIL] } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live project checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
