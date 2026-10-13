import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth();

  // While we don't yet know the session state, render nothing rather
  // than redirecting prematurely — redirecting here would bounce a
  // genuinely logged-in user to /login for a split second on every
  // page load.
  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-ink" />
          <span className="font-mono text-xs text-ink-muted">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
