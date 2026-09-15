// Boots the real app against your real MongoDB, seeds a project and
// several distinct developer profiles (a perfect match, a partial
// match, a no-match, and a team member who should be EXCLUDED), and
// confirms the matches endpoint scores and ranks them correctly.
//
// Usage: cd backend && node src/scripts/verifyMatchingLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";

const TEST_PORT = 5993;
const BASE = `http://localhost:${TEST_PORT}/api`;

const EMAILS = {
  owner: "verify-matching-owner@test.local",
  perfect: "verify-matching-perfect@test.local",
  partial: "verify-matching-partial@test.local",
  none: "verify-matching-none@test.local",
  member: "verify-matching-member@test.local",
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

async function registerUser(email, username, profile = {}) {
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
  const cookie = extractCookie(res);

  if (Object.keys(profile).length > 0) {
    await fetch(`${BASE}/users/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(profile),
    });
  }

  return { cookie, id: body.data._id };
}

async function run() {
  await connectDB();
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Setup: register owner + 4 distinct developer profiles ---");
  const owner = await registerUser(EMAILS.owner, "verify_match_owner");

  const perfect = await registerUser(EMAILS.perfect, "verify_match_perfect", {
    skills: ["React", "Node.js", "MongoDB", "Socket.IO"],
    experienceLevel: "Intermediate",
    availability: 20,
  });

  const partial = await registerUser(EMAILS.partial, "verify_match_partial", {
    skills: ["React"],
    experienceLevel: "Beginner",
    availability: 3,
  });

  const noMatch = await registerUser(EMAILS.none, "verify_match_none", {
    skills: ["COBOL", "Fortran"],
    experienceLevel: "Advanced",
    availability: 0,
  });

  // This user has great matching skills, but will be added as an
  // existing project MEMBER below — they must NOT appear in results.
  const futureMember = await registerUser(EMAILS.member, "verify_match_member", {
    skills: ["React", "Node.js", "MongoDB", "Socket.IO"],
    experienceLevel: "Intermediate",
    availability: 20,
  });

  console.log("\n--- Create the project (as owner) ---");
  const createRes = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      title: "Team Chat Platform",
      description: "A real-time chat platform for distributed engineering teams.",
      category: "Web Development",
      requiredSkills: ["React", "Node.js", "MongoDB", "Socket.IO"],
      teamSize: 5,
      difficulty: "Intermediate",
    }),
  });
  const project = (await createRes.json()).data;

  // Manually add futureMember to the project's team directly via the
  // model (there's no "add member" API yet — that's Phase 9) so we
  // can prove the matches endpoint excludes existing members.
  await Project.findByIdAndUpdate(project._id, {
    $push: { members: { user: futureMember.id, role: "Backend Developer" } },
  });

  console.log("\n--- Access control ---");
  const noAuthRes = await fetch(`${BASE}/projects/${project._id}/matches`);
  check("no login returns 401", noAuthRes.status === 401);

  const nonOwnerRes = await fetch(`${BASE}/projects/${project._id}/matches`, {
    headers: { Cookie: partial.cookie },
  });
  check("SECURITY: non-owner (even a candidate) gets 403", nonOwnerRes.status === 403);

  console.log("\n--- Fetch matches as the actual owner ---");
  const matchesRes = await fetch(`${BASE}/projects/${project._id}/matches`, {
    headers: { Cookie: owner.cookie },
  });
  const matchesBody = await matchesRes.json();
  const matches = matchesBody.data;

  check("owner request returns 200", matchesRes.status === 200);

  const resultIds = matches.map((m) => m.user._id);
  check("perfect-match candidate is included", resultIds.includes(perfect.id));
  check("SECURITY: existing team member is EXCLUDED from results", !resultIds.includes(futureMember.id));

  const perfectResult = matches.find((m) => m.user._id === perfect.id);
  const partialResult = matches.find((m) => m.user._id === partial.id);
  const noMatchResult = matches.find((m) => m.user._id === noMatch.id);

  check("perfect candidate has matchScore 100", perfectResult && perfectResult.matchScore === 100);
  check("perfect candidate has all 4 skills matched, none missing", perfectResult.matchedSkills.length === 4 && perfectResult.missingSkills.length === 0);

  check(
    "no-match candidate scores lowest of the three",
    noMatchResult.matchScore < partialResult.matchScore && partialResult.matchScore < perfectResult.matchScore
  );
  check("no-match candidate has all 4 required skills listed as missing", noMatchResult.missingSkills.length === 4);

  check(
    "results are sorted descending by matchScore",
    matches.every((m, i) => i === 0 || matches[i - 1].matchScore >= m.matchScore)
  );

  console.log("\n--- Limit parameter ---");
  const limitedRes = await fetch(`${BASE}/projects/${project._id}/matches?limit=2`, {
    headers: { Cookie: owner.cookie },
  });
  const limitedBody = await limitedRes.json();
  check("?limit=2 returns exactly 2 results", limitedBody.data.length === 2);
  check(
    "limited results are still the highest scorers (perfect candidate included)",
    limitedBody.data.some((m) => m.user._id === perfect.id)
  );

  console.log("\n--- Cleaning up ---");
  await Project.deleteOne({ _id: project._id });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live matching checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
