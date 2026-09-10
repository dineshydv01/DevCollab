// Handles connecting to MongoDB via Mongoose.
//
// WHY a separate file: index.js should only be responsible for
// "start the server". Connection logic, retry behavior, and event
// listeners belong here so they can be reused/tested independently
// and so index.js stays readable.

import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log(`[MongoDB] Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error.message);
    // If the database can't connect, the app is useless — exit instead
    // of pretending to run and failing on every single request later.
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Runtime error:", err.message);
  });
}
