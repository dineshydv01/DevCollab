// This file's ONLY job is: configure the Express app, connect to
// MongoDB, and start listening. No business logic lives here.
// (Rule from spec section 66: "Do NOT put all backend logic in index.js")

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import healthRoutes from "./routes/health.routes.js";
import { notFound } from "./middleware/notFound.js";

const app = express();

// ---- Core middleware ----
// cors: only allow requests from our known frontend origin, and allow
// cookies to be sent cross-origin (needed for our HTTP-only JWT cookie
// once auth exists in Phase 3).
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(express.json()); // parses incoming JSON request bodies
app.use(cookieParser()); // parses cookies into req.cookies

// ---- Routes ----
app.use("/api/health", healthRoutes);

// ---- 404 handler (must be last) ----
app.use(notFound);

// ---- Startup sequence ----
// We connect to MongoDB BEFORE starting the HTTP listener. This way,
// the server never accepts traffic while the database is unreachable.
async function start() {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`[Server] DevCollab API running on http://localhost:${env.port}`);
    console.log(`[Server] Environment: ${env.nodeEnv}`);
  });
}

start();
