// This file's ONLY job now is: connect to MongoDB, then start
// listening using the app built in app.js. All middleware/route
// configuration lives in app.js so it can be reused by test scripts
// without duplicating this startup logic.

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

async function start() {
  await connectDB();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[Server] DevCollab API running on http://localhost:${env.port}`);
    console.log(`[Server] Environment: ${env.nodeEnv}`);
  });
}

start();
