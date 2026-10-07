import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth();

  // While we don't yet know the session state, render nothing rather
  // than redirecting prematurely — redirecting here would bounce a
  // genuinely logged-in user to /login for a split second on every
  // page load.
  if (isCheckingSession) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
