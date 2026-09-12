// WHAT: Builds and configures the Express app object — but does NOT
//       start listening or connect to MongoDB.
// WHY: Separating "how the app is put together" from "starting it up"
//      means test scripts (and eventually real test suites in Phase 17)
//      can import this app and make requests against it directly,
//      without needing a real network port or worrying about port
//      conflicts with a dev server that might already be running.

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
