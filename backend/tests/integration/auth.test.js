import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.model.js";

const app = createApp();
const EMAIL = "vitest-auth@test.local";

beforeAll(async () => {
  await connectDB();
  await User.deleteOne({ email: EMAIL });
});

afterAll(async () => {
  await User.deleteOne({ email: EMAIL });
  await mongoose.disconnect();
});

describe("Auth: registration and login", () => {
  let cookie;

  it("registers a new user and never returns the password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Vitest User",
      username: "vitest_auth_user",
      email: EMAIL,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.password).toBeUndefined();
    cookie = res.headers["set-cookie"][0];
  });

  it("rejects duplicate registration with the same email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Someone Else",
      username: "someone_else_vitest",
      email: EMAIL,
      password: "supersecret123",
      confirmPassword: "supersecret123",
    });
    expect(res.status).toBe(409);
  });

  it("rejects login with the wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("logs in successfully with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: "supersecret123" });
    expect(res.status).toBe(200);
  });

  it("rejects /me when no cookie is sent (unauthorized access)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the correct user when a valid cookie is sent", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(EMAIL);
  });
});
