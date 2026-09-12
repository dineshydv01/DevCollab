// Boots the real app against your real MongoDB and drives the profile
// endpoints with real HTTP requests: view, update (including a
// security check that malicious fields get stripped), and the
// paginated directory listing.
//
// Usage: cd backend && node src/scripts/verifyProfileLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";

const TEST_PORT = 5996;
const BASE = `http://localhost:${TEST_PORT}/api`;
const TEST_EMAIL = "verify-profile-script@test.local";

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
  await User.deleteOne({ email: TEST_EMAIL });

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Setup: register a test user ---");
  const registerRes = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Verify Profile Script",
      username: "verify_profile_script",
      email: TEST_EMAIL,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    }),
  });
  const registerBody = await registerRes.json();
  const cookie = extractCookie(registerRes);
  const userId = registerBody.data._id;

  console.log("\n--- GET /users/:id (public profile view) ---");
  const viewRes = await fetch(`${BASE}/users/${userId}`);
  const viewBody = await viewRes.json();
  check("returns 200 for a valid, existing user", viewRes.status === 200);
  check("returns correct user", viewBody.data.email === TEST_EMAIL);

  const badIdRes = await fetch(`${BASE}/users/not-a-real-id`);
  check("malformed ID returns 400 (not a 500 crash)", badIdRes.status === 400);

  const fakeIdRes = await fetch(`${BASE}/users/${new mongoose.Types.ObjectId()}`);
  check("valid-format but non-existent ID returns 404", fakeIdRes.status === 404);

  console.log("\n--- PUT /users/profile (update own profile) ---");
  const noAuthUpdateRes = await fetch(`${BASE}/users/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bio: "Should be rejected" }),
  });
  check("update without login returns 401", noAuthUpdateRes.status === 401);

  const updateRes = await fetch(`${BASE}/users/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      bio: "Full-stack developer who loves DSA",
      skills: ["ReactJS", "react.js", "Node"],
      availability: 15,
      role: "admin", // security check: this must be stripped, not applied
    }),
  });
  const updateBody = await updateRes.json();
  check("valid update returns 200", updateRes.status === 200);
  check("bio was updated", updateBody.data.bio === "Full-stack developer who loves DSA");
  check(
    "skills normalized and deduplicated",
    JSON.stringify(updateBody.data.skills) === JSON.stringify(["React", "Node.js"])
  );
  check("SECURITY: role was NOT changed to admin", updateBody.data.role === "developer");

  console.log("\n--- GET /users (paginated directory) ---");
  const noAuthListRes = await fetch(`${BASE}/users`);
  check("listing without login returns 401", noAuthListRes.status === 401);

  const listRes = await fetch(`${BASE}/users?page=1&limit=5`, {
    headers: { Cookie: cookie },
  });
  const listBody = await listRes.json();
  check("listing with login returns 200", listRes.status === 200);
  check("response has pagination metadata", typeof listBody.total === "number" && typeof listBody.totalPages === "number");
  check("our test user appears in the list", listBody.data.some((u) => u.email === TEST_EMAIL));

  console.log("\n--- Cleaning up ---");
  await User.deleteOne({ email: TEST_EMAIL });
  console.log("  Test user removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live profile checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
