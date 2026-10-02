// WHAT: A small helper shared across integration test files.
// WHY: Every integration test needs at least one registered user with
//      a valid auth cookie before it can test anything protected —
//      writing that register-and-extract-cookie boilerplate in every
//      single test file (the way the earlier verify*.js scripts did)
//      is exactly the kind of repetition worth extracting once.

import request from "supertest";

export async function registerTestUser(app, { email, username, fullName = "Test User" }) {
  const res = await request(app).post("/api/auth/register").send({
    fullName,
    username,
    email,
    password: "supersecret123",
    confirmPassword: "supersecret123",
  });

  return {
    cookie: res.headers["set-cookie"]?.[0],
    id: res.body?.data?._id,
    res,
  };
}
