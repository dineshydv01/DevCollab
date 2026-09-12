// WHAT: Restricts a route to specific User.role values (e.g. "admin").
// WHY: Separate from `authenticate` on purpose — authenticate answers
//      "who is this?", authorize answers "are they allowed here?".
//      Keeping them separate means a route can require login without
//      requiring a specific role, or vice versa isn't even meaningful
//      (you can't check a role without knowing who they are first) —
//      which is exactly why authorize() always runs AFTER authenticate()
//      in the route chain, never before.
//
// Usage: router.get('/admin/stats', authenticate, authorize('admin'), handler)
//
// Note: this only exists usefully starting Phase 15 (Admin Dashboard),
// but it's a two-line addition to make now while the auth middleware
// is fresh in context, rather than revisiting this file later.

export function authorize(...allowedRoles) {
  return function authorizeRole(req, res, next) {
    if (!req.user) {
      // Defensive check — should never trigger if authenticate() ran first.
      return res.status(401).json({ success: false, message: "You must be logged in" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to do this" });
    }

    next();
  };
}
