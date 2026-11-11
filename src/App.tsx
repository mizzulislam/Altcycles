import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RoleGuard } from "@/app/role-guard";
import { PortalShell } from "@/components/layout/portal-shell";
import { AccountingPage } from "@/features/accounting/accounting-page";
import { AuthProvider, portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import { LoginPage } from "@/features/auth/login-page";
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from "@/features/auth/password-reset-pages";
import { BudgetPage } from "@/features/budgeting/budget-page";
import { BuyerPortalPage } from "@/features/buyer-portal/buyer-portal-page";
import { ProjectDetailPage } from "@/features/client-projects/project-detail-page";
import { UserDashboardPage } from "@/features/dashboard/user-dashboard";
import { InvoicingPage } from "@/features/invoicing/invoicing-page";
import { AdminDashboardPage } from "@/features/master-data/admin-dashboard";
import { PartiesMasterPage } from "@/features/master-data/parties-master-page";
import { ProjectsPage } from "@/features/master-data/projects-page";
import { AdminApprovalsPage } from "@/features/payment-approvals/admin-approvals-page";
import { UserPaymentsPage } from "@/features/payment-approvals/user-payments-page";
import { ProfileOverviewPage } from "@/features/profile/profile-overview-page";
import { ProfileSettingsPage } from "@/features/profile/profile-settings-page";
import { ProfitSharingPage } from "@/features/profit-sharing/profit-sharing-page";
import { PurchaseOrdersPage } from "@/features/purchase-orders/po-page";
import { AuditTrailPage } from "@/features/system-config/audit-trail-page";
import { AdminSettingsPage } from "@/features/system-config/admin-settings-page";
import { CompanyProfilePage } from "@/features/system-config/company-profile-page";
import { LoginMediaPage } from "@/features/system-config/login-media-page";
import { MasterReadonlyPage } from "@/features/system-config/master-readonly-page";
import { SuperAdminDashboardPage } from "@/features/system-config/super-admin-dashboard";
import { ThemeProvider } from "@/lib/theme-context";
import { SystemConfigPage } from "@/features/system-config/system-config-page";
import { UsersManagementPage } from "@/features/system-config/users-management-page";

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
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
