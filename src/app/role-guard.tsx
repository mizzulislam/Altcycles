import { Navigate, Outlet } from "react-router-dom";
import { FullScreenLoader } from "@/components/ui/loader";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import type { UserRole } from "@/types/database.types";

export function RoleGuard({ allowedRole = "any" }: { allowedRole?: UserRole | "any" }) {
  const { profile, activeRole, availableRoles, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader messageKey="status.checking_session" />;
  }

  if (!profile || !profile.is_active) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole !== "any" && !availableRoles.includes(allowedRole)) {
    return <Navigate to={portalHomeForRole(activeRole || profile.role)} replace />;
  }

  if (allowedRole !== "any" && profile.role !== allowedRole) {
    return <FullScreenLoader messageKey="status.aligning_role" />;
  }

  return <Outlet />;
}

