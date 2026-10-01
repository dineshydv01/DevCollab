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
import helmet from "helmet";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import projectRoutes from "./routes/project.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import taskRoutes from "./routes/task.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sanitizeInput } from "./middleware/sanitizeInput.js";
import { globalApiRateLimiter } from "./middleware/rateLimiters.js";

export function createApp() {
  const app = express();

  // Phase 16: needed in production so req.ip (used by the rate
  // limiters below) reflects the real client IP rather than the
  // reverse proxy's (Render/Railway/etc. all sit in front of the app
  // as a proxy) — without this, every request would appear to come
  // from the same IP and rate limiting would be meaningless. Not
  // needed in local dev, where there's no proxy in front of us.
  if (env.nodeEnv === "production") {
    app.set("trust proxy", 1);
  }

  // Phase 16: Helmet sets a range of security-related response
  // headers (X-Content-Type-Options, a baseline Content-Security-
  // Policy, HSTS, etc.). The one override we NEED: Helmet's default
  // Cross-Origin-Resource-Policy is "same-origin", which would block
  // our own frontend (a separate origin/port) from loading this API's
  // responses — the opposite of what a deliberately cross-origin API
  // needs. Every other Helmet default is left as-is.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );

  // Phase 16: a size limit on the JSON body parser. Without one,
  // express.json() accepts arbitrarily large request bodies — a
  // trivial DoS vector. 100kb is generous headroom over our largest
  // legitimate payload (a project description tops out at 3000
  // characters, well under 100kb).
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Phase 16: strips any "$"-prefixed or dot-containing object key
  // from req.body/req.query, as a global backstop against NoSQL
  // operator injection — see sanitizeInput.js for why this is
  // defense-in-depth rather than the primary protection (Zod
  // validation and the Phase 6 discovery-filter guards already cover
  // every real input path). Must run AFTER express.json()/
  // cookieParser() populate req.body/req.query, and BEFORE any route.
  app.use(sanitizeInput);

  // Phase 16: a generous rate limit across the whole API, to cut off
  // obvious scripted abuse. The tighter, endpoint-specific limiters
  // (login, register — see rateLimiters.js) still apply on TOP of
  // this for those two routes specifically.
  app.use(globalApiRateLimiter);

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/reports", reportRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
