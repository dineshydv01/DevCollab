// Boots the real app against your real MongoDB and hits the real
// GitHub API through the full HTTP path (route -> loadProject ->
// controller -> service), using github.com/octocat/Hello-World — a
// small, stable, official GitHub test repository that's safe to
// depend on in a test.
//
// Usage: cd backend && node src/scripts/verifyGithubLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";

const TEST_PORT = 5985;
const BASE = `http://localhost:${TEST_PORT}/api`;
const OWNER_EMAIL = "verify-github-owner@test.local";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : null;
}

async function run() {
  await connectDB();
  await User.deleteOne({ email: OWNER_EMAIL });

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Setup: register owner and create a project with no repo yet ---");
  const registerRes = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "GitHub Test Owner",
      username: "verify_github_owner",
      email: OWNER_EMAIL,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    }),
  });
  const cookie = extractCookie(registerRes);

  const project = (
    await (
      await fetch(`${BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          title: "GitHub Integration Test Project",
          description: "A project used to verify the live GitHub integration endpoint.",
          category: "Open Source",
          requiredSkills: ["JavaScript"],
          teamSize: 1,
          difficulty: "Beginner",
        }),
      })
    ).json()
  ).data;
  const projectId = project._id;

  console.log("\n--- No repository attached yet ---");
  const noRepoRes = await fetch(`${BASE}/projects/${projectId}/github`);
  check("returns 400 when no repositoryUrl is set", noRepoRes.status === 400);

  console.log("\n--- Attach a real, well-known public repo ---");
  const attachRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ repositoryUrl: "https://github.com/octocat/Hello-World" }),
  });
  const attachBody = await attachRes.json();
  check("attaching the repositoryUrl succeeded", attachRes.status === 200);
  if (attachRes.status !== 200) console.log("  PUT response body:", JSON.stringify(attachBody));
  console.log("  repositoryUrl now set to:", attachBody.data?.repositoryUrl);

  console.log("\n--- Fetch GitHub info (public — no login needed) ---");
  const githubRes = await fetch(`${BASE}/projects/${projectId}/github`);
  const githubBody = await githubRes.json();
  check("returns 200 without login", githubRes.status === 200);
  if (githubRes.status !== 200) {
    console.log("  GET /github response body:", JSON.stringify(githubBody));
  } else {
    check("returns real repo data", githubBody.data.name === "Hello-World");
    check("includes star count as a number", typeof githubBody.data.stars === "number");
    check("first fetch is NOT served from cache", githubBody.data.cached === false);
  }

  console.log("\n--- Second fetch immediately after: should hit the cache ---");
  if (githubRes.status === 200) {
    const cachedRes = await fetch(`${BASE}/projects/${projectId}/github`);
    const cachedBody = await cachedRes.json();
    check("second fetch IS served from cache", cachedBody.data.cached === true);
    check("cached data matches the live data", cachedBody.data.stars === githubBody.data.stars);
  } else {
    console.log("  skipped — first fetch didn't succeed");
  }

  console.log("\n--- Attach a non-GitHub URL ---");
  await fetch(`${BASE}/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ repositoryUrl: "https://gitlab.com/someuser/somerepo" }),
  });
  const nonGithubRes = await fetch(`${BASE}/projects/${projectId}/github`);
  check("rejects a syntactically valid but non-GitHub URL with 400", nonGithubRes.status === 400);

  console.log("\n--- Attach a GitHub URL pointing to a repo that doesn't exist ---");
  await fetch(`${BASE}/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ repositoryUrl: "https://github.com/this-should-not-exist-abc123/nonexistent-xyz" }),
  });
  const notFoundRes = await fetch(`${BASE}/projects/${projectId}/github`);
  check(
    "a repo that doesn't exist returns 404 (or 429 if GitHub's rate limit is already exhausted on this network)",
    notFoundRes.status === 404 || notFoundRes.status === 429
  );

  console.log("\n--- Cleaning up ---");
  await Project.deleteOne({ _id: projectId });
  await User.deleteOne({ email: OWNER_EMAIL });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live GitHub integration checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
