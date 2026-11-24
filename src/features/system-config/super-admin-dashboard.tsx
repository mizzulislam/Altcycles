import * as React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import {
  ChartLegendFooter,
  ChartSummaryRow,
  ChartTypeSwitcher,
  ChartValueFooter,
  CompositionChart,
  MultiSeriesChart,
} from "@/components/shared/dashboard-charts";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { PageLoader } from "@/components/ui/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCompanyProfile,
  listAccounts,
  listAuditLogs,
  listProfiles,
} from "@/lib/data-service";
import { formatDateTimeID } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  AuditLogRow,
  CompanyProfileRow,
  ProfileRow,
} from "@/types/database.types";

export function SuperAdminDashboardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [allLogs, setAllLogs] = React.useState<AuditLogRow[]>([]);
  const [recentLogs, setRecentLogs] = React.useState<AuditLogRow[]>([]);

  const [auditViewMode, setAuditViewMode] = React.useState<"daily" | "entity">("daily");
  const [auditChartType, setAuditChartType] = React.useState<"column" | "area">("column");
  const [hiddenAuditSeries, setHiddenAuditSeries] = React.useState<Set<string>>(new Set());
  const toggleAuditSeries = React.useCallback((key: string) => {
    setHiddenAuditSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size < 2) next.add(key);
      }
      return next;
    });
  }, []);

  const [compDataset, setCompDataset] = React.useState<"roles" | "coa">("roles");

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, c, accs, logs] = await Promise.all([
          listProfiles(),
          getCompanyProfile(),
          listAccounts(),
          listAuditLogs(),
        ]);
        setProfiles(p);
        setCompany(c);
        setAccounts(accs);
        setAllLogs(logs);
        setRecentLogs(logs.slice(0, 8));
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

  for (const log of allLogs) {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("settings:super_admin.dashboard_title", "Dasbor Pengelola Sistem")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("settings:super_admin.dashboard_desc", "Pantau kesehatan sistem, aktivitas pengguna internal, dan konfigurasi master aplikasi.")}
          </p>
        </div>
      </div>

      {/* 4 Kartu KPI Utama Terstandar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Baris Grafik Visualisasi Sistem */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grafik 1: Aktivitas Audit Sistem (Harian vs Entitas) */}
        <ChartCard
          className="lg:col-span-2"
          title={t("settings:super_admin.card_audit_title", "Aktivitas Audit & Perubahan Data")}
          subtitle={
            auditViewMode === "daily"
              ? t("settings:super_admin.card_audit_desc_daily", "Frekuensi operasi tambah, ubah, dan hapus data per hari.")
              : t("settings:super_admin.card_audit_desc_entity", "Distribusi operasi audit berdasarkan entitas sistem teraktif.")
          }
          controls={
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAuditViewMode("daily")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                    auditViewMode === "daily"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("settings:super_admin.audit_daily", "Harian")}
                </button>
                <button
                  type="button"
                  onClick={() => setAuditViewMode("entity")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                    auditViewMode === "entity"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("settings:super_admin.audit_entity", "Entitas")}
                </button>
              </div>
              <ChartTypeSwitcher
                value={auditChartType}
                onChange={(val) => setAuditChartType(val as "column" | "area")}
                options={[
                  {
                    value: "column",
                    label: t("dashboard:charts.types.column", "Kolom"),
                    title: t("dashboard:charts.types.column_title", "Column Chart"),
                    icon: BarChart3Icon,
                  },
                  {
                    value: "area",
                    label: t("dashboard:charts.types.area", "Area"),
                    title: t("dashboard:charts.types.area_title", "Area Chart"),
                    icon: ActivityIcon,
                  },
                ]}
              />
            </div>
          }
          summary={
            <ChartSummaryRow
              items={[
                {
                  label: (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{t("settings:super_admin.op_insert_label", "Operasi Tambah")}</span>
                    </div>
                  ),
                  value: `${totalInserts} ${t("settings:super_admin.logs", "Log")}`,
                  valueClass: "text-emerald-600 dark:text-emerald-400",
                  onClick: () => toggleAuditSeries("insert"),
                  active: !hiddenAuditSeries.has("insert"),
                },
                {
                  label: (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#0B43C8] shrink-0" />
                      <span>{t("settings:super_admin.op_update_label", "Operasi Ubah")}</span>
                    </div>
                  ),
                  value: `${totalUpdates} ${t("settings:super_admin.logs", "Log")}`,
                  valueClass: "text-primary dark:text-sky-400",
                  onClick: () => toggleAuditSeries("update"),
                  active: !hiddenAuditSeries.has("update"),
                },
                {
                  label: (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                      <span>{t("settings:super_admin.op_delete_label", "Operasi Hapus")}</span>
                    </div>
                  ),
                  value: `${totalDeletes} ${t("settings:super_admin.logs", "Log")}`,
                  valueClass: "text-rose-600 dark:text-rose-400",
                  onClick: () => toggleAuditSeries("delete"),
                  active: !hiddenAuditSeries.has("delete"),
                },
              ]}
            />
          }
          footer={
            <ChartLegendFooter
              series={[
                {
                  key: "insert",
                  label: t("settings:super_admin.op_insert_label", "Operasi Tambah"),
                  color: "#10b981",
                  textClass: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  key: "update",
                  label: t("settings:super_admin.op_update_label", "Operasi Ubah"),
                  color: "#0B43C8",
                  textClass: "text-primary dark:text-sky-400",
                },
                {
                  key: "delete",
                  label: t("settings:super_admin.op_delete_label", "Operasi Hapus"),
                  color: "#f43f5e",
                  textClass: "text-rose-600 dark:text-rose-400",
                },
              ]}
              hiddenKeys={hiddenAuditSeries}
              onToggleSeries={toggleAuditSeries}
            />
          }
        >
          <MultiSeriesChart
            chartType={auditChartType}
            data={auditViewMode === "daily" ? auditDailyData : auditEntityData}
            series={[
              {
                key: "insert",
                label: t("settings:super_admin.op_insert_label", "Operasi Tambah"),
                color: "#10b981",
                textClass: "text-emerald-600 dark:text-emerald-400",
              },
              {
                key: "update",
                label: t("settings:super_admin.op_update_label", "Operasi Ubah"),
                color: "#0B43C8",
                textClass: "text-primary dark:text-sky-400",
              },
              {
                key: "delete",
                label: t("settings:super_admin.op_delete_label", "Operasi Hapus"),
                color: "#f43f5e",
                textClass: "text-rose-600 dark:text-rose-400",
              },
            ].filter((s) => !hiddenAuditSeries.has(s.key))}
            formatValue={(v) => `${v} ${t("settings:super_admin.logs", "Log")}`}
            formatShortValue={(v) => `${v}`}
            emptyTitle={t("settings:super_admin.audit_chart_empty_title", "Belum Ada Aktivitas Audit")}
            emptySubtitle={t("settings:super_admin.audit_chart_empty_sub", "Grafik tren audit otomatis muncul saat aktivitas pengguna dan perubahan data terekam.")}
          />
        </ChartCard>

        {/* Grafik 2: Komposisi Peran Pengguna & Bagan Akun */}
        <ChartCard
          title={t("settings:super_admin.card_master_title", "Komposisi Master Sistem")}
          subtitle={
            compDataset === "roles"
              ? t("settings:super_admin.card_master_desc_roles", "Sebaran hak akses peran pengguna internal.")
              : t("settings:super_admin.card_master_desc_coa", "Struktur klasifikasi bagan akun.")
          }
          controls={
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setCompDataset("roles")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "roles"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("settings:super_admin.comp_roles", "Peran")}
              </button>
              <button
                type="button"
                onClick={() => setCompDataset("coa")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "coa"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("settings:super_admin.comp_coa", "Bagan Akun")}
              </button>
            </div>
          }
          footer={
            <ChartValueFooter
              label={
                compDataset === "roles"
                  ? t("settings:super_admin.center_active_users", "Pengguna Aktif")
                  : t("settings:super_admin.center_total_accounts", "Total Akun")
              }
              value={
                compDataset === "roles"
                  ? `${activeUsers} / ${profiles.length} ${t("settings:super_admin.users_unit", "Orang")}`
                  : `${accounts.length} ${t("settings:super_admin.accounts_unit", "Akun")}`
              }
            />
          }
        >
          <CompositionChart
            chartType="donut"
            slices={
              compDataset === "roles"
                ? roleCompositionSlices
                : coaCompositionSlices
            }
            centerLabel={
              compDataset === "roles"
                ? t("settings:super_admin.center_active_users", "Pengguna Aktif")
                : t("settings:super_admin.center_total_accounts", "Total Akun")
            }
            centerValue={
              compDataset === "roles"
                ? `${activeUsers} ${t("settings:super_admin.users_unit", "Orang")}`
                : `${accounts.length} ${t("settings:super_admin.accounts_unit", "Akun")}`
            }
            formatValue={(v) =>
              compDataset === "roles"
                ? `${v} ${t("settings:super_admin.users_unit", "Orang")}`
                : `${v} COA`
            }
            emptyTitle={t("settings:super_admin.comp_empty_title", "Belum Ada Data Master")}
            emptySubtitle={t("settings:super_admin.comp_empty_sub", "Proporsi akan muncul otomatis saat pengguna atau bagan akun tersedia.")}
          />
        </ChartCard>
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("settings:super_admin.card_recent_audit", "Jejak Audit Terbaru")}
          description={t("settings:super_admin.card_recent_audit_desc", "Setiap perubahan konfigurasi, master data, dan status periode tercatat otomatis.")}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_time", "Waktu")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_actor_role", "Peran Pelaku")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_action", "Aksi")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_entity", "Entitas")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_record_id", "ID Rekaman")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <ActivityIcon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("settings:super_admin.empty_audit_title", "Belum Ada Jejak Audit")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("settings:super_admin.empty_audit_desc", "Rekaman perubahan konfigurasi dan transaksi akan tampil otomatis di sini.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6 pr-3 whitespace-nowrap tabular-nums text-muted-foreground align-middle">
                      {formatDateTimeID(log.created_at)}
                    </TableCell>
                    <TableCell className="px-3 text-center font-medium align-middle">
                      {log.actor_role ?? "sistem"}
                    </TableCell>
                    <TableCell className="px-3 text-center whitespace-nowrap align-middle">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone={
                            log.action.toUpperCase() === "INSERT"
                              ? "success"
                              : log.action.toUpperCase() === "DELETE"
                                ? "destructive"
                                : "info"
                          }
                          label={log.action}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 font-mono font-medium text-xs align-middle">
                      {log.entity_name}
                    </TableCell>
                    <TableCell className="pl-2 pr-6 font-mono text-xs text-muted-foreground truncate max-w-44 align-middle">
                      {log.entity_id}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end px-6 py-3 border-t border-border/70 bg-muted/10">
            <Link
              to="/super-admin/audit-trail"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
            >
              <span>{t("settings:super_admin.btn_all_audits", "Semua Audit")}</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

