import * as React from "react";
import { toast } from "sonner";
import {
  isDateInPeriod,
  PeriodFilter,
  type DashboardPeriodPreset,
} from "@/components/shared/dashboard-period-filter";
import { PageHeader } from "@/components/shared/page-header";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { PageLoader } from "@/components/ui/loader";
import {
  getCompanyProfile,
  listAccounts,
  listAuditLogsSummary,
  listProfiles,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import type {
  AccountRow,
  AuditLogRow,
  CompanyProfileRow,
  ProfileRow,
} from "@/types/database.types";
import {
  exportSuperAdminCsv,
  exportSuperAdminExcel,
  exportSuperAdminPdf,
} from "./dashboard/super-admin-dashboard-export-handlers";
import { SuperAdminDashboardKpiGrid } from "./dashboard/super-admin-dashboard-kpi-grid";
import { SuperAdminDashboardCharts } from "./dashboard/super-admin-dashboard-charts";
import { SuperAdminDashboardAuditTable } from "./dashboard/super-admin-dashboard-audit-table";

export function SuperAdminDashboardPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [allLogs, setAllLogs] = React.useState<AuditLogRow[]>([]);

  // Filter Periode Terpadu Super Admin
  const [periodFilter, setPeriodFilter] = React.useState<DashboardPeriodPreset>("all");
  const [filterStartDate, setFilterStartDate] = React.useState<string>("");
  const [filterEndDate, setFilterEndDate] = React.useState<string>("");

  const filteredLogs = React.useMemo(() => {
    return allLogs.filter((log) =>
      isDateInPeriod(log.created_at, periodFilter, filterStartDate, filterEndDate),
    );
  }, [allLogs, periodFilter, filterStartDate, filterEndDate]);

  const recentLogs = React.useMemo(() => filteredLogs.slice(0, 8), [filteredLogs]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, c, accs, logs] = await Promise.all([
          listProfiles(),
          getCompanyProfile(),
          listAccounts(),
          listAuditLogsSummary(300),
        ]);
        setProfiles(p);
        setCompany(c);
        setAccounts(accs);
        setAllLogs(logs);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal memuat ringkasan sistem.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <PageLoader
        message={t("settings:super_admin.loading", "Menghitung metrik sistem...")}
      />
    );
  }

  const activeUsers = profiles.filter((u) => u.is_active).length;

  // Agregasi jejak audit harian & per entitas
  const auditDailyMap = new Map<
    string,
    { insert: number; update: number; delete: number }
  >();
  const auditEntityMap = new Map<
    string,
    { insert: number; update: number; delete: number }
  >();

  let totalInserts = 0;
  let totalUpdates = 0;
  let totalDeletes = 0;

  for (const log of filteredLogs) {
    const act = log.action.toUpperCase();
    const isIns = act === "INSERT";
    const isUpd = act === "UPDATE";
    const isDel = act === "DELETE";
    if (isIns) totalInserts += 1;
    else if (isUpd) totalUpdates += 1;
    else if (isDel) totalDeletes += 1;

    const dateKey = log.created_at.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      const cur = auditDailyMap.get(dateKey) ?? {
        insert: 0,
        update: 0,
        delete: 0,
      };
      if (isIns) cur.insert += 1;
      else if (isUpd) cur.update += 1;
      else if (isDel) cur.delete += 1;
      auditDailyMap.set(dateKey, cur);
    }

    const entName = log.entity_name || "lainnya";
    const entCur = auditEntityMap.get(entName) ?? {
      insert: 0,
      update: 0,
      delete: 0,
    };
    if (isIns) entCur.insert += 1;
    else if (isUpd) entCur.update += 1;
    else if (isDel) entCur.delete += 1;
    auditEntityMap.set(entName, entCur);
  }

  const auditDailyData = [...auditDailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([dateKey, val]) => {
      const [, m = "", d = ""] = dateKey.split("-");
      return {
        key: dateKey,
        label: `${d}/${m}`,
        values: val,
      };
    });

  const auditEntityData = [...auditEntityMap.entries()]
    .sort(
      ([, a], [, b]) =>
        b.insert + b.update + b.delete - (a.insert + a.update + a.delete),
    )
    .slice(0, 6)
    .map(([entity, val]) => ({
      key: entity,
      label: entity,
      values: val,
    }));

  // Komposisi peran pengguna & tipe bagan akun
  let superAdminRoles = 0;
  let adminRoles = 0;
  let userRoles = 0;
  for (const p of profiles) {
    const roleList =
      Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : [p.role];
    if (roleList.includes("super_admin")) superAdminRoles += 1;
    if (roleList.includes("admin")) adminRoles += 1;
    if (roleList.includes("user")) userRoles += 1;
  }

  const roleCompositionSlices = [
    {
      label: "Super Admin",
      value: superAdminRoles,
      color: "#0B43C8",
      dotClass: "bg-primary",
    },
    {
      label: t("settings:super_admin.role_treasurer", "Bendahara"),
      value: adminRoles,
      color: "#10b981",
      dotClass: "bg-emerald-500",
    },
    {
      label: t("settings:super_admin.role_team_member", "Anggota Tim"),
      value: userRoles,
      color: "#0ea5e9",
      dotClass: "bg-sky-500",
    },
  ];

  const coaCompositionSlices = [
    {
      label: t("settings:super_admin.account_type_asset", "Aset"),
      value: accounts.filter((a) => a.account_type === "asset").length,
      color: "#0B43C8",
      dotClass: "bg-primary",
    },
    {
      label: t("settings:super_admin.account_type_liability", "Liabilitas"),
      value: accounts.filter((a) => a.account_type === "liability").length,
      color: "#f59e0b",
      dotClass: "bg-amber-500",
    },
    {
      label: t("settings:super_admin.account_type_equity", "Ekuitas"),
      value: accounts.filter((a) => a.account_type === "equity").length,
      color: "#8b5cf6",
      dotClass: "bg-violet-500",
    },
    {
      label: t("settings:super_admin.account_type_revenue", "Pendapatan"),
      value: accounts.filter((a) => a.account_type === "revenue").length,
      color: "#10b981",
      dotClass: "bg-emerald-500",
    },
    {
      label: t("settings:super_admin.account_type_expense", "Beban"),
      value: accounts.filter((a) => a.account_type === "expense").length,
      color: "#f43f5e",
      dotClass: "bg-rose-500",
    },
  ];

  const exportContext = {
    profiles,
    activeUsers,
    company,
    accounts,
    allLogs,
    recentLogs,
    coaCompositionSlices,
    periodFilter,
    t,
    language: (language ?? "id") as "id" | "en",
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("settings:super_admin.dashboard_title", "Dasbor Pengelola Sistem")}
        description={t("settings:super_admin.dashboard_desc", "Pantau kesehatan sistem, aktivitas pengguna internal, dan konfigurasi master aplikasi.")}
        actions={
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center">
            <PeriodFilter
              value={periodFilter}
              onChange={(val, start, end) => {
                setPeriodFilter(val);
                setFilterStartDate(start ?? "");
                setFilterEndDate(end ?? "");
              }}
              startDate={filterStartDate}
              endDate={filterEndDate}
            />
            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={() => exportSuperAdminExcel(exportContext)}
              onExportPdf={() => exportSuperAdminPdf(exportContext)}
              onExportCsv={() => exportSuperAdminCsv(exportContext)}
            />
          </div>
        }
      />

      {/* 4 Kartu KPI Utama Terstandar */}
      <SuperAdminDashboardKpiGrid
        profiles={profiles}
        activeUsers={activeUsers}
        company={company}
        accounts={accounts}
        allLogs={allLogs}
        auditDailyData={auditDailyData}
        t={t}
      />

      {/* Baris Grafik Visualisasi Sistem */}
      <SuperAdminDashboardCharts
        auditDailyData={auditDailyData}
        auditEntityData={auditEntityData}
        totalInserts={totalInserts}
        totalUpdates={totalUpdates}
        totalDeletes={totalDeletes}
        activeUsers={activeUsers}
        profilesCount={profiles.length}
        accountsCount={accounts.length}
        roleCompositionSlices={roleCompositionSlices}
        coaCompositionSlices={coaCompositionSlices}
        t={t}
      />

      {/* Jejak Audit Terbaru */}
      <SuperAdminDashboardAuditTable recentLogs={recentLogs} t={t} />
    </div>
  );
}
