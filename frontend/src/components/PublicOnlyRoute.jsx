import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function PublicOnlyRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth();

  if (isCheckingSession) return null;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
