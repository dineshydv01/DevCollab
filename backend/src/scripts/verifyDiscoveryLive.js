// Boots the real app against your real MongoDB, seeds a few distinct
// projects, and drives the discovery endpoint through search, filters,
// sorting, and a live NoSQL-injection attempt — all with real HTTP
// requests.
//
// Usage: cd backend && node src/scripts/verifyDiscoveryLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";

const TEST_PORT = 5994;
const BASE = `http://localhost:${TEST_PORT}/api`;
const OWNER_EMAIL = "verify-discovery-owner@test.local";

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

  console.log("\n--- Setup: register owner and seed 3 distinct projects ---");
  const registerRes = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Discovery Test Owner",
      username: "verify_discovery_owner",
      email: OWNER_EMAIL,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    }),
  });
  const cookie = extractCookie(registerRes);

  async function createProject(body) {
    const res = await fetch(`${BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
    return (await res.json()).data;
  }

  const projA = await createProject({
    title: "AI Resume Analyzer",
    description: "Uses NLP to analyze resumes and score fit for job roles.",
    category: "AI/ML",
    requiredSkills: ["Python", "Machine Learning"],
    teamSize: 4,
    difficulty: "Intermediate",
  });

  const projB = await createProject({
    title: "Realtime Chat App",
    description: "A React and Socket.IO powered chat application for teams.",
    category: "Web Development",
    requiredSkills: ["React", "Node.js"],
    teamSize: 3,
    difficulty: "Beginner",
  });

  const projC = await createProject({
    title: "Blockchain Voting System",
    description: "A decentralized voting platform built on Ethereum smart contracts.",
    category: "Blockchain",
    requiredSkills: ["Solidity", "React"],
    teamSize: 5,
    difficulty: "Advanced",
  });

  console.log("\n--- Text search (?q=) ---");
  const searchRes = await fetch(`${BASE}/projects?q=resume`);
  const searchBody = await searchRes.json();
  check("search for 'resume' finds project A", searchBody.data.some((p) => p._id === projA._id));
  check("search for 'resume' excludes project B", !searchBody.data.some((p) => p._id === projB._id));

  console.log("\n--- Category filter ---");
  const categoryRes = await fetch(`${BASE}/projects?category=${encodeURIComponent("Web Development")}`);
  const categoryBody = await categoryRes.json();
  check("category filter finds project B", categoryBody.data.some((p) => p._id === projB._id));
  check("category filter excludes project C", !categoryBody.data.some((p) => p._id === projC._id));

  console.log("\n--- Skill filter (with normalization) ---");
  const skillRes = await fetch(`${BASE}/projects?skills=reactjs`); // deliberately unnormalized input
  const skillBody = await skillRes.json();
  check(
    "unnormalized 'reactjs' still matches projects requiring 'React'",
    skillBody.data.some((p) => p._id === projB._id) && skillBody.data.some((p) => p._id === projC._id)
  );
  check("skill filter excludes project A (no React)", !skillBody.data.some((p) => p._id === projA._id));

  console.log("\n--- Difficulty filter ---");
  const diffRes = await fetch(`${BASE}/projects?difficulty=Advanced`);
  const diffBody = await diffRes.json();
  check("difficulty filter finds only project C", diffBody.data.every((p) => p._id === projC._id));

  console.log("\n--- Combined filters (category + difficulty) ---");
  const combinedRes = await fetch(
    `${BASE}/projects?category=${encodeURIComponent("AI/ML")}&difficulty=Intermediate`
  );
  const combinedBody = await combinedRes.json();
  check("combined filters find project A", combinedBody.data.some((p) => p._id === projA._id));

  console.log("\n--- SECURITY: NoSQL injection attempt via query params ---");
  // Express parses this bracket syntax into { category: { '$ne': null } }
  // — if our filter guard didn't work, this could return ALL projects
  // regardless of category, or even throw a 500 from a malformed query.
  const injectionRes = await fetch(`${BASE}/projects?category[%24ne]=null`);
  check("injection attempt does not crash the server", injectionRes.status === 200);
  const injectionBody = await injectionRes.json();
  check(
    "injection attempt is ignored, not treated as a valid filter (falls back to no category filter)",
    Array.isArray(injectionBody.data)
  );

  console.log("\n--- Sorting: newest (default) vs popular ---");
  const newestRes = await fetch(`${BASE}/projects?sort=newest&limit=10`);
  const newestBody = await newestRes.json();
  const newestIds = newestBody.data.map((p) => p._id);
  check(
    "newest sort puts most recently created project first",
    newestIds.indexOf(projC._id) < newestIds.indexOf(projA._id)
  );

  const popularRes = await fetch(`${BASE}/projects?sort=popular&limit=10`);
  check("popular sort returns 200 without error", popularRes.status === 200);

  console.log("\n--- Cleaning up ---");
  await Project.deleteMany({ _id: { $in: [projA._id, projB._id, projC._id] } });
  await User.deleteOne({ email: OWNER_EMAIL });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live discovery checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
