import {
  ActivityIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import type {
  AccountRow,
  AuditLogRow,
  CompanyProfileRow,
  ProfileRow,
} from "@/types/database.types";

export interface SuperAdminDashboardKpiGridProps {
  profiles: ProfileRow[];
  activeUsers: number;
  company: CompanyProfileRow | null;
  accounts: AccountRow[];
  allLogs: AuditLogRow[];
  auditDailyData: Array<{ key: string; label: string; values: { insert: number; update: number; delete: number } }>;
  t: (key: string, fallback: string) => string;
}

export function SuperAdminDashboardKpiGrid({
  profiles,
  activeUsers,
  company,
  accounts,
  allLogs,
  auditDailyData,
  t,
}: SuperAdminDashboardKpiGridProps) {
  return (
    <div className="flexbox-kpi-grid mobile-kpi-carousel sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={t("settings:super_admin.kpi_users", "Pengguna Internal")}
        value={activeUsers}
        suffix={`/ ${profiles.length} ${t("settings:users.status_active", "Aktif")}`}
        subtext={t("settings:super_admin.kpi_users_sub", "Akses peran aktif dan terverifikasi")}
        icon={UsersIcon}
        iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        to="/super-admin/pengguna"
        sparklineData={[profiles.length - activeUsers, activeUsers]}
        changePercent={null}
      />

      <KpiCard
        label={t("settings:super_admin.kpi_tax", "Status Perpajakan")}
        displayValue={company?.pkp_enabled ? t("settings:super_admin.pkp_active", "PKP Aktif") : t("settings:super_admin.non_pkp", "Non-PKP")}
        subtext={
          company?.pkp_enabled
            ? `${t("settings:super_admin.vat_rate", "Tarif PPN")} ${company.ppn_rate}% ${t("settings:super_admin.vat_applied", "berlaku pada invoice")}`
            : t("settings:super_admin.vat_none", "Faktur diterbitkan tanpa PPN")
        }
        icon={ShieldCheckIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        to="/super-admin/profil"
        changePercent={null}
      />

      <KpiCard
        label={t("settings:super_admin.kpi_coa", "Bagan Akun Keuangan")}
        value={accounts.length}
        suffix={` ${t("settings:super_admin.accounts", "Akun")}`}
        subtext={t("settings:super_admin.sak_standard", "Standar Akuntansi Keuangan")}
        icon={BookOpenIcon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        to="/admin/akuntansi"
        sparklineData={accounts.length > 1 ? [accounts.length * 0.9, accounts.length] : undefined}
        changePercent={null}
      />

      <KpiCard
        label={t("settings:super_admin.kpi_audit", "Jejak Audit Terbaru")}
        value={allLogs.length}
        suffix={` ${t("settings:super_admin.logs", "Log")}`}
        subtext={t("settings:super_admin.audit_saved", "Rekaman audit aktivitas tersimpan")}
        icon={ActivityIcon}
        iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
        to="/super-admin/audit-trail"
        sparklineData={
          auditDailyData.length > 1
            ? auditDailyData.map((d) => d.values.insert + d.values.update + d.values.delete)
            : undefined
        }
        changePercent={null}
      />
    </div>
  );
}
