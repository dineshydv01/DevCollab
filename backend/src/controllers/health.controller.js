import mongoose from "mongoose";

// Even a "trivial" health-check controller follows the same
// Routes -> Controllers pattern we'll use for everything else,
// so the convention is established from day one.
export function getHealth(req, res) {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

  res.status(200).json({
    success: true,
    message: "DevCollab API is running",
    data: {
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStates[mongoose.connection.readyState] || "unknown",
      timestamp: new Date().toISOString(),
    },
  });
}
