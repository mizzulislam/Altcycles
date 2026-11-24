import { Navigate, Outlet } from "react-router-dom";
import { FullScreenLoader, PageLoader } from "@/components/ui/loader";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import type { UserRole } from "@/types/database.types";

export function RoleGuard({ allowedRole = "any" }: { allowedRole?: UserRole | "any" }) {
  const { profile, activeRole, availableRoles, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    if (allowedRole === "any") {
      return (
        <FullScreenLoader
          message={t("common:status.checking_session", "Memeriksa sesi pengguna...")}
        />
      );
    }
    return (
      <PageLoader
        message={t("common:status.checking_session", "Memeriksa sesi pengguna...")}
      />
    );
  }

  if (!profile || !profile.is_active) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole !== "any" && !availableRoles.includes(allowedRole)) {
    return <Navigate to={portalHomeForRole(activeRole || profile.role)} replace />;
  }

  if (allowedRole !== "any" && profile.role !== allowedRole) {
    return (
      <PageLoader
        message={t("common:status.aligning_role", "Menyelaraskan peran aktif...")}
      />
    );
  }

  return <Outlet />;
}

