import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.model.js";

const app = createApp();
const OAUTH_EMAIL = "oauth-test-user@test.local";

beforeAll(async () => {
  await connectDB();
  await User.deleteOne({ email: OAUTH_EMAIL });
});

afterAll(async () => {
  await User.deleteOne({ email: OAUTH_EMAIL });
  await mongoose.disconnect();
});

describe("OAuth authentication endpoints", () => {
  it("redirects to login error when /api/auth/github/callback is called without code", async () => {
    const res = await request(app).get("/api/auth/github/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=");
  });

  it("redirects to login error when /api/auth/google/callback is called without code", async () => {
    const res = await request(app).get("/api/auth/google/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=");
  });

  it("allows creating an OAuth user without requiring a password", async () => {
    const oauthUser = await User.create({
      fullName: "OAuth GitHub User",
      username: "oauth_github_user_test",
      email: OAUTH_EMAIL,
      githubId: "12345678",
      authProvider: "github",
    });

    expect(oauthUser._id).toBeDefined();
    expect(oauthUser.email).toBe(OAUTH_EMAIL);
    expect(oauthUser.githubId).toBe("12345678");
    expect(oauthUser.authProvider).toBe("github");
    expect(oauthUser.password).toBeUndefined();

    // Cleaning up
    await User.deleteOne({ _id: oauthUser._id });
  });

  it("fails comparePassword safely when an OAuth user has no password", async () => {
    const oauthUser = await User.create({
      fullName: "OAuth Google User",
      username: "oauth_google_user_test",
      email: OAUTH_EMAIL,
      googleId: "87654321",
      authProvider: "google",
    });

    const isMatch = await oauthUser.comparePassword("anyPassword");
    expect(isMatch).toBe(false);

    // Cleaning up
    await User.deleteOne({ _id: oauthUser._id });
  });
});
