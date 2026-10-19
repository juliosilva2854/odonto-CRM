import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/auth";

/**
 * Route guard for platform-level (cross-tenant) pages. Requires an authenticated
 * user whose role is `super_admin`. Non-super users are bounced to their clinic
 * dashboard; unauthenticated users go to /login (preserving the destination).
 */
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const isSuper = Boolean(user?.is_super_admin || user?.role === "super_admin");
  if (!isSuper) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
