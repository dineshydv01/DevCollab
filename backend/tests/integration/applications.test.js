import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.model.js";
import { Project } from "../../src/models/Project.model.js";
import { CollaborationRequest } from "../../src/models/CollaborationRequest.model.js";
import { registerTestUser } from "../helpers.js";

const app = createApp();
const EMAILS = {
  owner: "vitest-apps-owner@test.local",
  a: "vitest-apps-devA@test.local",
  b: "vitest-apps-devB@test.local",
};

let owner, devA, devB, projectId;

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  owner = await registerTestUser(app, { email: EMAILS.owner, username: "vitest_apps_owner" });
  devA = await registerTestUser(app, { email: EMAILS.a, username: "vitest_apps_devA" });
  devB = await registerTestUser(app, { email: EMAILS.b, username: "vitest_apps_devB" });

  const projRes = await request(app).post("/api/projects").set("Cookie", owner.cookie).send({
    title: "Vitest Applications Test Project",
    description: "A project used to test the application flow and its edge cases.",
    category: "Web Development",
    requiredSkills: ["React"],
    teamSize: 1, // deliberately tiny, to trigger "team full" (spec section 47) easily
    difficulty: "Beginner",
  });
  projectId = projRes.body.data._id;
});

afterAll(async () => {
  await CollaborationRequest.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  await mongoose.disconnect();
});

describe("Project application", () => {
  let applicationId;

  it("edge case: applying to a nonexistent project returns 404", async () => {
    const res = await request(app)
      .post(`/api/projects/${new mongoose.Types.ObjectId()}/apply`)
      .set("Cookie", devA.cookie)
      .send({});
    expect(res.status).toBe(404);
  });

  it("lets a developer apply", async () => {
    const res = await request(app).post(`/api/projects/${projectId}/apply`).set("Cookie", devA.cookie).send({ message: "Pick me!" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    applicationId = res.body.data._id;
  });

  it("edge case: rejects a duplicate pending application", async () => {
    const res = await request(app).post(`/api/projects/${projectId}/apply`).set("Cookie", devA.cookie).send({});
    expect(res.status).toBe(409);
  });

  it("blocks an unrelated user from accepting someone else's application (unauthorized access)", async () => {
    const res = await request(app).put(`/api/applications/${applicationId}/accept`).set("Cookie", devB.cookie);
    expect(res.status).toBe(403);
  });

  it("lets the owner accept the application, filling the 1-person team", async () => {
    const res = await request(app).put(`/api/applications/${applicationId}/accept`).set("Cookie", owner.cookie);
    expect(res.status).toBe(200);

    const projectRes = await request(app).get(`/api/projects/${projectId}`);
    expect(projectRes.body.data.status).toBe("Active");
  });

  it("edge case: a new application is rejected once the team is already full", async () => {
    const res = await request(app).post(`/api/projects/${projectId}/apply`).set("Cookie", devB.cookie).send({});
    expect(res.status).toBe(400); // project is no longer "Recruiting"
  });
});
