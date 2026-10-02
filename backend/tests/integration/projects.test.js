import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.model.js";
import { Project } from "../../src/models/Project.model.js";
import { registerTestUser } from "../helpers.js";

const app = createApp();
const OWNER_EMAIL = "vitest-proj-owner@test.local";
const OTHER_EMAIL = "vitest-proj-other@test.local";

let owner, other, projectId;

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({ email: { $in: [OWNER_EMAIL, OTHER_EMAIL] } });
  owner = await registerTestUser(app, { email: OWNER_EMAIL, username: "vitest_proj_owner" });
  other = await registerTestUser(app, { email: OTHER_EMAIL, username: "vitest_proj_other" });
});

afterAll(async () => {
  if (projectId) await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: [OWNER_EMAIL, OTHER_EMAIL] } });
  await mongoose.disconnect();
});

describe("Project creation", () => {
  it("rejects creation without login (unauthorized access)", async () => {
    const res = await request(app).post("/api/projects").send({ title: "Should fail" });
    expect(res.status).toBe(401);
  });

  it("creates a project as the logged-in user, ignoring an injected owner field", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", owner.cookie)
      .send({
        title: "Vitest Project Auth Test",
        description: "A project created to test authorization rules end to end.",
        category: "Web Development",
        requiredSkills: ["React"],
        teamSize: 3,
        difficulty: "Beginner",
        owner: "some-injected-id",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.owner).toBe(owner.id);
    projectId = res.body.data._id;
  });
});

describe("Project authorization", () => {
  it("allows public read access without login", async () => {
    const res = await request(app).get(`/api/projects/${projectId}`);
    expect(res.status).toBe(200);
  });

  it("blocks a non-owner from updating the project (unauthorized access)", async () => {
    const res = await request(app).put(`/api/projects/${projectId}`).set("Cookie", other.cookie).send({ title: "Hijacked" });
    expect(res.status).toBe(403);
  });

  it("blocks a non-owner from deleting the project (unauthorized access)", async () => {
    const res = await request(app).delete(`/api/projects/${projectId}`).set("Cookie", other.cookie);
    expect(res.status).toBe(403);
  });

  it("allows the real owner to update the project", async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Vitest Project Updated" });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Vitest Project Updated");
  });

  it("edge case: invalid project ID format returns 400, not a crash", async () => {
    const res = await request(app).get("/api/projects/not-a-real-id");
    expect(res.status).toBe(400);
  });

  it("edge case: well-formed but nonexistent project ID returns 404", async () => {
    const res = await request(app).get(`/api/projects/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});
