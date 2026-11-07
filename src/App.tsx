import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RoleGuard } from "@/app/role-guard";
import { PortalShell } from "@/components/layout/portal-shell";
import { JournalsPage } from "@/features/accounting/journals-page";
import { AccountingReportsPage } from "@/features/accounting/reports-page";
import { AuthProvider } from "@/features/auth/auth-context";
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
import { CoaAccountsPage } from "@/features/master-data/coa-accounts-page";
import { PartiesMasterPage } from "@/features/master-data/parties-master-page";
import { PeriodsPage } from "@/features/master-data/periods-page";
import { ProjectsPage } from "@/features/master-data/projects-page";
import { AdminApprovalsPage } from "@/features/payment-approvals/admin-approvals-page";
import { UserPaymentsPage } from "@/features/payment-approvals/user-payments-page";
import { ProfitSharingPage } from "@/features/profit-sharing/profit-sharing-page";
import { PurchaseOrdersPage } from "@/features/purchase-orders/po-page";
import { AuditTrailPage } from "@/features/system-config/audit-trail-page";
import { MasterReadonlyPage } from "@/features/system-config/master-readonly-page";
import { SuperAdminDashboardPage } from "@/features/system-config/super-admin-dashboard";
import { ThemeProvider } from "@/lib/theme-context";
import { SystemConfigPage } from "@/features/system-config/system-config-page";
import { UsersManagementPage } from "@/features/system-config/users-management-page";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lupa-kata-sandi" element={<ForgotPasswordPage />} />
          <Route path="/reset-kata-sandi" element={<ResetPasswordPage />} />

          {/* Portal Pembeli Klien Tanpa Login (UC-34..36) */}
          <Route path="/portal-pembeli" element={<BuyerPortalPage />} />

          {/* Portal Super Admin */}
          <Route element={<RoleGuard allowedRole="super_admin" />}>
            <Route element={<PortalShell />}>
              <Route
                path="/super-admin/dashboard"
                element={<SuperAdminDashboardPage />}
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
            </Route>
          </Route>

          {/* Portal Admin (Bendahara / Akuntan) */}
          <Route element={<RoleGuard allowedRole="admin" />}>
            <Route element={<PortalShell />}>
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
                path="/admin/akuntansi/jurnal"
                element={<JournalsPage />}
              />
              <Route
                path="/admin/akuntansi/laporan"
                element={<AccountingReportsPage />}
              />
              <Route path="/admin/bagi-hasil" element={<ProfitSharingPage />} />
              <Route
                path="/admin/akuntansi/periode"
                element={<PeriodsPage />}
              />
              <Route
                path="/admin/akuntansi/akun"
                element={<CoaAccountsPage />}
              />
              <Route path="/admin/master" element={<PartiesMasterPage />} />
            </Route>
          </Route>

          {/* Portal User (Anggota Tim Internal) */}
          <Route element={<RoleGuard allowedRole="user" />}>
            <Route element={<PortalShell />}>
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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
