import * as React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RoleGuard } from "@/app/role-guard";
import { PortalShell } from "@/components/layout/portal-shell";
import { Spinner } from "@/components/ui/empty";
import { AuthProvider, portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

const lazyPage = <P extends object = Record<string, never>>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
) =>
  React.lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as React.ComponentType<P> };
  });

const LoginPage = lazyPage(() => import("@/features/auth/login-page"), "LoginPage");
const ForgotPasswordPage = lazyPage(
  () => import("@/features/auth/password-reset-pages"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazyPage(
  () => import("@/features/auth/password-reset-pages"),
  "ResetPasswordPage",
);
const BuyerPortalPage = lazyPage(
  () => import("@/features/buyer-portal/buyer-portal-page"),
  "BuyerPortalPage",
);
const ProfileOverviewPage = lazyPage(
  () => import("@/features/profile/profile-overview-page"),
  "ProfileOverviewPage",
);
const ProfileSettingsPage = lazyPage(
  () => import("@/features/profile/profile-settings-page"),
  "ProfileSettingsPage",
);
const SuperAdminDashboardPage = lazyPage(
  () => import("@/features/system-config/super-admin-dashboard"),
  "SuperAdminDashboardPage",
);
const CompanyProfilePage = lazyPage(
  () => import("@/features/system-config/company-profile-page"),
  "CompanyProfilePage",
);
const AdminSettingsPage = lazyPage(
  () => import("@/features/system-config/admin-settings-page"),
  "AdminSettingsPage",
);
const UsersManagementPage = lazyPage(
  () => import("@/features/system-config/users-management-page"),
  "UsersManagementPage",
);
const SystemConfigPage = lazyPage(
  () => import("@/features/system-config/system-config-page"),
  "SystemConfigPage",
);
const MasterReadonlyPage = lazyPage(
  () => import("@/features/system-config/master-readonly-page"),
  "MasterReadonlyPage",
);
const AuditTrailPage = lazyPage(
  () => import("@/features/system-config/audit-trail-page"),
  "AuditTrailPage",
);
const LoginMediaPage = lazyPage(
  () => import("@/features/system-config/login-media-page"),
  "LoginMediaPage",
);
const AdminDashboardPage = lazyPage(
  () => import("@/features/master-data/admin-dashboard"),
  "AdminDashboardPage",
);
const AdminApprovalsPage = lazyPage(
  () => import("@/features/payment-approvals/admin-approvals-page"),
  "AdminApprovalsPage",
);
const PurchaseOrdersPage = lazyPage<{ mode: "admin" | "user" }>(
  () => import("@/features/purchase-orders/po-page"),
  "PurchaseOrdersPage",
);
const ProjectsPage = lazyPage(
  () => import("@/features/master-data/projects-page"),
  "ProjectsPage",
);
const ProjectDetailPage = lazyPage(
  () => import("@/features/client-projects/project-detail-page"),
  "ProjectDetailPage",
);
const InvoicingPage = lazyPage(
  () => import("@/features/invoicing/invoicing-page"),
  "InvoicingPage",
);
const BudgetPage = lazyPage<{ mode: "admin" | "user" }>(
  () => import("@/features/budgeting/budget-page"),
  "BudgetPage",
);
const AccountingPage = lazyPage(
  () => import("@/features/accounting/accounting-page"),
  "AccountingPage",
);
const ProfitSharingPage = lazyPage(
  () => import("@/features/profit-sharing/profit-sharing-page"),
  "ProfitSharingPage",
);
const PartiesMasterPage = lazyPage(
  () => import("@/features/master-data/parties-master-page"),
  "PartiesMasterPage",
);
const UserDashboardPage = lazyPage(
  () => import("@/features/dashboard/user-dashboard"),
  "UserDashboardPage",
);
const UserPaymentsPage = lazyPage(
  () => import("@/features/payment-approvals/user-payments-page"),
  "UserPaymentsPage",
);

function RouteFallback() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      <span>Memuat halaman...</span>
    </div>
  );
}

function AuthenticatedIndexRedirect() {
  const { profile, activeRole, loading } = useAuth();
  if (loading) return null;
  if (!profile || !profile.is_active) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={portalHomeForRole(activeRole || profile.role)} replace />;
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <React.Suspense fallback={<RouteFallback />}>
            <Routes>
            <Route path="/" element={<AuthenticatedIndexRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/lupa-kata-sandi" element={<ForgotPasswordPage />} />
            <Route path="/reset-kata-sandi" element={<ResetPasswordPage />} />

            {/* Portal Pembeli Klien Tanpa Login (UC-34..36) */}
            <Route path="/portal-pembeli" element={<BuyerPortalPage />} />

            {/* Rute Bersama Terautentikasi (Semua Peran Aktif) */}
            <Route element={<RoleGuard allowedRole="any" />}>
              <Route element={<PortalShell />}>
                {/* Halaman Profil & Pengaturan Profil Pengguna (Referensi: My Tax) */}
                <Route path="/profil" element={<ProfileOverviewPage />} />
                <Route path="/pengaturan/profil" element={<ProfileSettingsPage />} />

                {/* Portal Super Admin */}
                <Route element={<RoleGuard allowedRole="super_admin" />}>
                  <Route
                    path="/super-admin/dashboard"
                    element={<SuperAdminDashboardPage />}
                  />
                  <Route
                    path="/super-admin/profil-perusahaan"
                    element={<CompanyProfilePage />}
                  />
                  <Route
                    path="/super-admin/administrasi"
                    element={<AdminSettingsPage />}
                  />
                  <Route
                    path="/super-admin/pengguna"
                    element={<UsersManagementPage />}
                  />
                  <Route
                    path="/super-admin/konfigurasi"
                    element={<SystemConfigPage />}
                  />
                  <Route
                    path="/super-admin/master-tinjau"
                    element={<MasterReadonlyPage />}
                  />
                  <Route
                    path="/super-admin/audit-trail"
                    element={<AuditTrailPage />}
                  />
                  <Route
                    path="/super-admin/media-login"
                    element={<LoginMediaPage />}
                  />
                </Route>

                {/* Portal Admin (Bendahara / Akuntan) */}
                <Route element={<RoleGuard allowedRole="admin" />}>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route
                    path="/admin/persetujuan"
                    element={<AdminApprovalsPage />}
                  />
                  <Route
                    path="/admin/po-internal"
                    element={<PurchaseOrdersPage mode="admin" />}
                  />
                  <Route path="/admin/proyek" element={<ProjectsPage />} />
                  <Route
                    path="/admin/proyek/:projectId"
                    element={<ProjectDetailPage />}
                  />
                  <Route path="/admin/penagihan" element={<InvoicingPage />} />
                  <Route
                    path="/admin/anggaran"
                    element={<BudgetPage mode="admin" />}
                  />
                  <Route
                    path="/admin/akuntansi"
                    element={<AccountingPage />}
                  />
                  <Route
                    path="/admin/akuntansi/jurnal"
                    element={<Navigate to="/admin/akuntansi?tab=jurnal" replace />}
                  />
                  <Route
                    path="/admin/akuntansi/laporan"
                    element={<Navigate to="/admin/akuntansi?tab=laporan" replace />}
                  />
                  <Route
                    path="/admin/akuntansi/periode"
                    element={<Navigate to="/admin/akuntansi?tab=tutup_buku" replace />}
                  />
                  <Route path="/admin/bagi-hasil" element={<ProfitSharingPage />} />
                  <Route
                    path="/admin/akuntansi/akun"
                    element={<Navigate to="/admin/akuntansi?tab=coa" replace />}
                  />
                  <Route
                    path="/admin/master/coa"
                    element={<Navigate to="/admin/akuntansi?tab=coa" replace />}
                  />
                  <Route path="/admin/master" element={<PartiesMasterPage />} />
                </Route>

                {/* Portal User (Anggota Tim Internal) */}
                <Route element={<RoleGuard allowedRole="user" />}>
                  <Route path="/user/dashboard" element={<UserDashboardPage />} />
                  <Route
                    path="/user/po"
                    element={<PurchaseOrdersPage mode="user" />}
                  />
                  <Route path="/user/pembayaran" element={<UserPaymentsPage />} />
                  <Route
                    path="/user/anggaran"
                    element={<BudgetPage mode="user" />}
                  />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
          <Toaster richColors position="bottom-right" />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
