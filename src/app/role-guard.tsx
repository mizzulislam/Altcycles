import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/empty";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import type { UserRole } from "@/types/database.types";

export function RoleGuard({ allowedRole = "any" }: { allowedRole?: UserRole | "any" }) {
  const { profile, activeRole, availableRoles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        <span>Memeriksa sesi pengguna...</span>
      </div>
    );
  }

  if (!profile || !profile.is_active) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole !== "any" && !availableRoles.includes(allowedRole)) {
    return <Navigate to={portalHomeForRole(activeRole || profile.role)} replace />;
  }

  return <Outlet />;
}

