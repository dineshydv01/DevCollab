// This file's job: connect to MongoDB, then start listening — using an
// explicit http.Server that BOTH Express (via app.js) and Socket.IO
// (via sockets/index.js) attach to. Previously this just called
// app.listen(...), which creates an http.Server internally and hides
// it — that was fine when only Express needed it, but Socket.IO needs
// direct access to the same underlying server to attach its own
// upgrade handling (for the WebSocket handshake) alongside Express's
// normal HTTP request handling.

import http from "http";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { initializeSocket } from "./sockets/index.js";

async function start() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[Server] DevCollab API running on http://localhost:${env.port}`);
    console.log(`[Server] Socket.IO attached to the same server`);
    console.log(`[Server] Environment: ${env.nodeEnv}`);
  });
}

start();
