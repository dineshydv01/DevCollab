// Boots the real app against your real MongoDB. Builds a real team,
// removes one member before completion (to test that removed members
// are still review-eligible), marks the project Completed, and drives
// the review flow end to end: gating on completion, self-review
// prevention, eligibility, duplicate prevention, and rating
// recalculation.
//
// Usage: cd backend && node src/scripts/verifyReviewsLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";
import { CollaborationRequest } from "../models/CollaborationRequest.model.js";
import { Review } from "../models/Review.model.js";

const TEST_PORT = 5984;
const BASE = `http://localhost:${TEST_PORT}/api`;

const EMAILS = {
  owner: "verify-review-owner@test.local",
  a: "verify-review-devA@test.local",
  b: "verify-review-devB@test.local",
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

  console.log("\n--- Setup: build a team of 2, then remove devB before completion ---");
  const owner = await registerUser(EMAILS.owner, "verify_review_owner");
  const devA = await registerUser(EMAILS.a, "verify_review_devA");
  const devB = await registerUser(EMAILS.b, "verify_review_devB");

  const project = (
    await (
      await fetch(`${BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        body: JSON.stringify({
          title: "Review Test Project",
          description: "A project used to verify the review and reputation system end to end.",
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

  // Remove devB from the team BEFORE completion — they should still
  // be review-eligible afterward (the isEverPartOfTeam distinction).
  await fetch(`${BASE}/projects/${projectId}/team/${devB.id}`, {
    method: "DELETE",
    headers: { Cookie: owner.cookie },
  });

  console.log("\n--- Attempting to review BEFORE the project is completed ---");
  const tooEarlyRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      reviewedUser: devA.id,
      rating: 5,
      technicalSkills: 5,
      communication: 5,
      teamwork: 5,
      reliability: 5,
    }),
  });
  check("reviewing before completion is rejected with 400", tooEarlyRes.status === 400);

  console.log("\n--- Mark the project Completed ---");
  await fetch(`${BASE}/projects/${projectId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({ status: "Completed" }),
  });

  console.log("\n--- Business rule: cannot review yourself ---");
  const selfReviewRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      reviewedUser: owner.id,
      rating: 5,
      technicalSkills: 5,
      communication: 5,
      teamwork: 5,
      reliability: 5,
    }),
  });
  check("self-review rejected with 400", selfReviewRes.status === 400);

  console.log("\n--- Business rule: reviewer must be part of the team ---");
  const outsider = await registerUser("verify-review-outsider@test.local", "verify_review_outsider");
  const outsiderReviewRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: outsider.cookie },
    body: JSON.stringify({
      reviewedUser: devA.id,
      rating: 5,
      technicalSkills: 5,
      communication: 5,
      teamwork: 5,
      reliability: 5,
    }),
  });
  check("SECURITY: an outsider cannot leave a review (403)", outsiderReviewRes.status === 403);

  console.log("\n--- BUSINESS RULE: a REMOVED member is still review-eligible (both directions) ---");
  const reviewRemovedMemberRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      reviewedUser: devB.id, // devB was removed before completion
      rating: 4,
      technicalSkills: 4,
      communication: 4,
      teamwork: 3,
      reliability: 4,
    }),
  });
  check("owner CAN review devB even though devB was removed before completion", reviewRemovedMemberRes.status === 201);

  const removedMemberReviewsRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devB.cookie },
    body: JSON.stringify({
      reviewedUser: owner.id,
      rating: 5,
      technicalSkills: 5,
      communication: 5,
      teamwork: 5,
      reliability: 5,
    }),
  });
  check("devB (removed) CAN still leave a review about the owner", removedMemberReviewsRes.status === 201);

  console.log("\n--- Owner reviews devA ---");
  const reviewRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      reviewedUser: devA.id,
      rating: 5,
      technicalSkills: 5,
      communication: 4,
      teamwork: 5,
      reliability: 5,
      comment: "Great work on the frontend!",
    }),
  });
  check("review created with 201", reviewRes.status === 201);

  console.log("\n--- Duplicate review prevention ---");
  const dupReviewRes = await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      reviewedUser: devA.id,
      rating: 3,
      technicalSkills: 3,
      communication: 3,
      teamwork: 3,
      reliability: 3,
    }),
  });
  check("duplicate review from the same reviewer rejected with 409", dupReviewRes.status === 409);

  console.log("\n--- Rating recalculation ---");
  const devAProfileRes = await fetch(`${BASE}/users/${devA.id}`);
  const devAProfile = (await devAProfileRes.json()).data;
  check("devA's aggregate rating updated to 5 after their first review", devAProfile.rating === 5);

  await fetch(`${BASE}/projects/${projectId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: devB.cookie },
    body: JSON.stringify({
      reviewedUser: devA.id,
      rating: 3,
      technicalSkills: 3,
      communication: 3,
      teamwork: 3,
      reliability: 3,
    }),
  });
  const devAProfileAfterRes = await fetch(`${BASE}/users/${devA.id}`);
  const devAProfileAfter = (await devAProfileAfterRes.json()).data;
  check(
    "BUSINESS RULE: rating correctly averages to 4 after a second review (5 and 3)",
    devAProfileAfter.rating === 4
  );

  console.log("\n--- completedProjects incremented for owner and active members on completion ---");
  const ownerProfileRes = await fetch(`${BASE}/users/${owner.id}`);
  const ownerProfile = (await ownerProfileRes.json()).data;
  check("owner's completedProjects incremented", ownerProfile.completedProjects >= 1);

  console.log("\n--- GET /users/:id/reviews ---");
  const listRes = await fetch(`${BASE}/users/${devA.id}/reviews`);
  const listBody = await listRes.json();
  check("public review listing returns 200 without login", listRes.status === 200);
  check("devA's reviews list includes both reviews", listBody.data.length === 2);
  check("reviewer info is populated", typeof listBody.data[0].reviewer === "object");

  console.log("\n--- Cleaning up ---");
  await Review.deleteMany({ project: projectId });
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: [...Object.values(EMAILS), "verify-review-outsider@test.local"] } });
  console.log("  Test data removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live review checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
