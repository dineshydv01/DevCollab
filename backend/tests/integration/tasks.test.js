import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.model.js";
import { Project } from "../../src/models/Project.model.js";
import { Task } from "../../src/models/Task.model.js";
import { registerTestUser } from "../helpers.js";

const app = createApp();
const EMAILS = {
  owner: "vitest-tasks-owner@test.local",
  outsider: "vitest-tasks-outsider@test.local",
};

let owner, outsider, projectId;

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  owner = await registerTestUser(app, { email: EMAILS.owner, username: "vitest_tasks_owner" });
  outsider = await registerTestUser(app, { email: EMAILS.outsider, username: "vitest_tasks_outsider" });

  const projRes = await request(app).post("/api/projects").set("Cookie", owner.cookie).send({
    title: "Vitest Tasks Test Project",
    description: "A project used to test task creation and unauthorized access.",
    category: "Web Development",
    requiredSkills: ["React"],
    teamSize: 2,
    difficulty: "Beginner",
  });
  projectId = projRes.body.data._id;
});

afterAll(async () => {
  await Task.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
  await User.deleteMany({ email: { $in: Object.values(EMAILS) } });
  await mongoose.disconnect();
});

describe("Task creation", () => {
  it("rejects task creation from a non-owner (unauthorized access)", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set("Cookie", outsider.cookie)
      .send({ title: "Should fail" });
    expect(res.status).toBe(403);
  });

  it("edge case: rejects assigning a task to a user who isn't on the team", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set("Cookie", owner.cookie)
      .send({ title: "Bad assignee", assignedTo: outsider.id });
    expect(res.status).toBe(400);
  });

  it("creates a task as the owner, defaulting to TODO status", async () => {
    const res = await request(app).post(`/api/projects/${projectId}/tasks`).set("Cookie", owner.cookie).send({ title: "A valid task" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("TODO");
  });

  it("rejects an outsider from listing the project's tasks (unauthorized access)", async () => {
    const res = await request(app).get(`/api/projects/${projectId}/tasks`).set("Cookie", outsider.cookie);
    expect(res.status).toBe(403);
  });

  it("allows the owner to list the project's tasks", async () => {
    const res = await request(app).get(`/api/projects/${projectId}/tasks`).set("Cookie", owner.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
