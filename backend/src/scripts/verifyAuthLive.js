// Boots the real app (from app.js) on a throwaway local port, against
// your REAL MongoDB, and drives it through the entire auth flow with
// real HTTP requests — not mocks. This is the closest thing to a true
// end-to-end test before Phase 17 introduces a proper test framework.
//
// Usage: cd backend && node src/scripts/verifyAuthLive.js

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import { User } from "../models/User.model.js";

const TEST_PORT = 5997;
const BASE = `http://localhost:${TEST_PORT}/api/auth`;
const TEST_EMAIL = "verify-auth-script@test.local";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

// Tiny helper: fetch() doesn't automatically persist cookies across
// requests like a browser does, so we manually carry the Set-Cookie
// header from one response into the next request's Cookie header.
function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : null;
}

async function run() {
  await connectDB();
  await User.deleteOne({ email: TEST_EMAIL }); // clean slate from any previous failed run

  const app = createApp();
  const server = app.listen(TEST_PORT);

  console.log("\n--- Register ---");
  const registerRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Verify Auth Script",
      username: "verify_auth_script",
      email: TEST_EMAIL,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    }),
  });
  const registerBody = await registerRes.json();
  check("register returns 201", registerRes.status === 201);
  check("register response has no password field", registerBody.data.password === undefined);
  const authCookie = extractCookie(registerRes);
  check("register sets an auth cookie", !!authCookie);

  console.log("\n--- Duplicate registration ---");
  const dupRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Duplicate",
      username: "someone_else",
      email: TEST_EMAIL, // same email
      password: "supersecret123",
      confirmPassword: "supersecret123",
    }),
  });
  check("duplicate email rejected with 409", dupRes.status === 409);

  console.log("\n--- Login with wrong password ---");
  const wrongLoginRes = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: "wrongpassword" }),
  });
  check("wrong password rejected with 401", wrongLoginRes.status === 401);

  console.log("\n--- Login with correct credentials ---");
  const loginRes = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: "supersecret123" }),
  });
  check("login returns 200", loginRes.status === 200);
  const loginCookie = extractCookie(loginRes);
  check("login sets an auth cookie", !!loginCookie);

  console.log("\n--- GET /me without a cookie ---");
  const noCookieRes = await fetch(`${BASE}/me`);
  check("rejected with 401 when no cookie sent", noCookieRes.status === 401);

  console.log("\n--- GET /me with the login cookie ---");
  const meRes = await fetch(`${BASE}/me`, { headers: { Cookie: loginCookie } });
  const meBody = await meRes.json();
  check("returns 200 with a valid cookie", meRes.status === 200);
  check("returns the correct user", meBody.data.email === TEST_EMAIL);

  console.log("\n--- Logout ---");
  const logoutRes = await fetch(`${BASE}/logout`, { method: "POST" });
  check("logout returns 200", logoutRes.status === 200);

  console.log("\n--- Cleaning up ---");
  await User.deleteOne({ email: TEST_EMAIL });
  console.log("  Test user removed.");

  server.close();
  await mongoose.disconnect();

  console.log(`\n${failures === 0 ? "All live auth checks passed." : `${failures} check(s) FAILED.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
