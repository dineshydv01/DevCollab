// Catches any request that didn't match a route above it.
// This is intentionally tiny for Phase 1 — a full centralized
// error-handling middleware (with proper status codes, consistent
// JSON shape, and stack-trace hiding in production) is built out
// in Phase 16 per the project plan. For now this just prevents
// Express's default ugly HTML 404 page.
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
