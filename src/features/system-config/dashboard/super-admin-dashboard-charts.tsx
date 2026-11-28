import * as React from "react";
import { ActivityIcon, BarChart3Icon } from "lucide-react";
import {
  ChartLegendRow,
  ChartSummaryFooter,
  ChartTypeSwitcher,
  ChartValueFooter,
  CompositionChart,
  MultiSeriesChart,
} from "@/components/shared/dashboard-charts";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SuperAdminDashboardChartsProps {
  auditDailyData: Array<{ key: string; label: string; values: { insert: number; update: number; delete: number } }>;
  auditEntityData: Array<{ key: string; label: string; values: { insert: number; update: number; delete: number } }>;
  totalInserts: number;
  totalUpdates: number;
  totalDeletes: number;
  activeUsers: number;
  profilesCount: number;
  accountsCount: number;
  roleCompositionSlices: Array<{ label: string; value: number; color: string; dotClass: string }>;
  coaCompositionSlices: Array<{ label: string; value: number; color: string; dotClass: string }>;
  t: (key: string, fallback: string) => string;
}

export function SuperAdminDashboardCharts({
  auditDailyData,
  auditEntityData,
  totalInserts,
  totalUpdates,
  totalDeletes,
  activeUsers,
  profilesCount,
  accountsCount,
  roleCompositionSlices,
  coaCompositionSlices,
  t,
}: SuperAdminDashboardChartsProps) {
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

  return (
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
              <Button
                type="button"
                variant={auditViewMode === "daily" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAuditViewMode("daily")}
                className={cn(
                  "px-2.5 py-1 h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                  auditViewMode === "daily"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("settings:super_admin.audit_daily", "Harian")}
              </Button>
              <Button
                type="button"
                variant={auditViewMode === "entity" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAuditViewMode("entity")}
                className={cn(
                  "px-2.5 py-1 h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                  auditViewMode === "entity"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("settings:super_admin.audit_entity", "Entitas")}
              </Button>
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
        legend={
          <ChartLegendRow
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
        footer={
          <ChartSummaryFooter
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
            <Button
              type="button"
              variant={compDataset === "roles" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCompDataset("roles")}
              className={cn(
                "px-2.5 py-1 h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                compDataset === "roles"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("settings:super_admin.comp_roles", "Peran")}
            </Button>
            <Button
              type="button"
              variant={compDataset === "coa" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCompDataset("coa")}
              className={cn(
                "px-2.5 py-1 h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                compDataset === "coa"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("settings:super_admin.comp_coa", "Bagan Akun")}
            </Button>
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
                ? `${activeUsers} / ${profilesCount} ${t("settings:super_admin.users_unit", "Orang")}`
                : `${accountsCount} ${t("settings:super_admin.accounts_unit", "Akun")}`
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
              : `${accountsCount} ${t("settings:super_admin.accounts_unit", "Akun")}`
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
  );
}
