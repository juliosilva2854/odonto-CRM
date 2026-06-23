import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/auth";

/**
 * Route guard — redirects unauthenticated users to /login, preserving the
 * intended destination so the LoginPage can bounce them back after success.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
