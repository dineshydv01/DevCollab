import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.model.js";

const app = createApp();
const GOOGLE_EMAIL = "google-oauth-test@test.local";

beforeAll(async () => {
  await connectDB();
  await User.deleteOne({ email: GOOGLE_EMAIL });
});

afterAll(async () => {
  await User.deleteOne({ email: GOOGLE_EMAIL });
  await mongoose.disconnect();
});

describe("Google OAuth endpoints and user model integration", () => {
  it("redirects to login error when /api/auth/google/callback is called without code", async () => {
    const res = await request(app).get("/api/auth/google/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=");
  });

  it("handles cancelled Google authorization", async () => {
    const res = await request(app).get("/api/auth/google/callback?error=access_denied");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("access_denied");
  });

  it("allows creating a Google OAuth user without requiring a password", async () => {
    const googleUser = await User.create({
      fullName: "Google Test User",
      username: "google_test_user_unique",
      email: GOOGLE_EMAIL,
      googleId: "google_test_id_9999",
      authProvider: "google",
    });

    expect(googleUser._id).toBeDefined();
    expect(googleUser.email).toBe(GOOGLE_EMAIL);
    expect(googleUser.googleId).toBe("google_test_id_9999");
    expect(googleUser.authProvider).toBe("google");
    expect(googleUser.password).toBeUndefined();

    // Cleaning up
    await User.deleteOne({ _id: googleUser._id });
  });

  it("fails comparePassword safely when a Google OAuth user has no password", async () => {
    const googleUser = await User.create({
      fullName: "Google Test User 2",
      username: "google_test_user_unique_2",
      email: GOOGLE_EMAIL,
      googleId: "google_test_id_8888",
      authProvider: "google",
    });

    const isMatch = await googleUser.comparePassword("anyPassword");
    expect(isMatch).toBe(false);

    // Cleaning up
    await User.deleteOne({ _id: googleUser._id });
  });

  it("does not have GitHub OAuth callback routes mounted", async () => {
    const res = await request(app).get("/api/auth/github/callback");
    // Should be 404 because GitHub OAuth routes were completely removed
    expect(res.status).toBe(404);
  });
});
