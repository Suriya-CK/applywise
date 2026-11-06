import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Wraps pages that need login. Not logged in -> redirect to /login. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />; // render the matched child route
}
