// Run this against your REAL MongoDB (the one in your .env) to confirm
// the models actually persist correctly end-to-end — not just pass
// local schema validation.
//
// Usage:  cd backend && node src/scripts/verifyModelsLive.js
//
// It creates one test User and one test Project, checks the important
// behaviors, then deletes both so your database stays clean.

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.model.js";
import { Project } from "../models/Project.model.js";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

async function run() {
  await connectDB();

  // Clean up any leftovers from a previous failed run
  await User.deleteOne({ email: "verify-script@test.local" });

  console.log("\n--- Creating test user ---");
  const user = await User.create({
    fullName: "Verify Script",
    username: "verify_script_user",
    email: "verify-script@test.local",
    password: "supersecret123",
    skills: ["ReactJS", "react.js", "Node"],
  });

  check("password was hashed, not stored as plaintext", user.password !== "supersecret123");
  check("comparePassword() accepts the correct password", await user.comparePassword("supersecret123"));
  check("comparePassword() rejects a wrong password", !(await user.comparePassword("wrongpassword")));
  check(
    "skills normalized and deduplicated on save",
    JSON.stringify(user.skills) === JSON.stringify(["React", "Node.js"])
  );

  console.log("\n--- Creating test project owned by that user ---");
  const project = await Project.create({
    title: "Verify Script Project",
    description: "Temporary project created by verifyModelsLive.js for testing purposes only.",
    category: "Web Development",
    requiredSkills: ["react", "nodejs"],
    teamSize: 3,
    difficulty: "Beginner",
    owner: user._id,
  });

  check("project saved with default status 'Recruiting'", project.status === "Recruiting");
  check("project owner matches the created user", project.owner.equals(user._id));

  console.log("\n--- Cleaning up test data ---");
  await Project.deleteOne({ _id: project._id });
  await User.deleteOne({ _id: user._id });
  console.log("  Test documents removed.");

  console.log(`\n${failures === 0 ? "All live checks passed." : `${failures} check(s) FAILED.`}\n`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error("Script crashed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
