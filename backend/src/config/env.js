// Loads environment variables once, in one place, and exports them
// as a plain object. Every other file imports from HERE instead of
// calling `process.env.X` directly all over the codebase.
//
// Why centralize this?
// 1. Single source of truth — if a variable name ever changes, we
//    only update it in one file.
// 2. We can validate required variables exist at startup and fail
//    fast with a clear error, instead of getting a confusing crash
//    deep inside some controller three requests later.

import dotenv from "dotenv";

dotenv.config();

const required = ["PORT", "MONGO_URI", "CLIENT_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    // Fail loudly at startup rather than silently limping along.
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const env = {
  port: process.env.PORT,
  mongoUri: process.env.MONGO_URI,
  clientUrl: process.env.CLIENT_URL,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // --- Added in Phase 13 (GitHub Integration) ---
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
};
