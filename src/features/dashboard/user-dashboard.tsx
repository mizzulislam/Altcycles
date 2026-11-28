import * as React from "react";
import { buildRupiahHistogramBins } from "@/components/shared/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import {
  isDateInPeriod,
  PeriodFilter,
  type DashboardPeriodPreset,
} from "@/components/shared/dashboard-period-filter";
import { PageLoader } from "@/components/ui/loader";
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import { listProjects } from "@/lib/data-service";
import {
  getProfitSharingBundle,
  listPaymentRequests,
  listPurchaseOrders,
} from "@/lib/operations-service";
import type {
  PaymentRequestRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";
import {
  exportUserDashboardCsv,
  exportUserDashboardExcel,
  exportUserDashboardPdf,
  type UserDashboardExportContext,
} from "./user-dashboard/user-dashboard-export-handlers";
import { UserDashboardKpiGrid } from "./user-dashboard/user-dashboard-kpi-grid";
import { UserDashboardShortcuts } from "./user-dashboard/user-dashboard-shortcuts";
import { UserDashboardCharts } from "./user-dashboard/user-dashboard-charts";
import { UserDashboardClaimsProgress } from "./user-dashboard/user-dashboard-claims-progress";
import { UserDashboardProjectsTable } from "./user-dashboard/user-dashboard-projects-table";
import { UserDashboardSharingTable } from "./user-dashboard/user-dashboard-sharing-table";

export function UserDashboardPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [pos, setPos] = React.useState<PurchaseOrderRow[]>([]);
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [sharingLines, setSharingLines] = React.useState<ProfitSharingLineRow[]>([]);
  const [sharingResults, setSharingResults] = React.useState<ProfitSharingResultRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activityChartType, setActivityChartType] = React.useState<
    "column" | "area" | "histogram"
  >("column");
  const [hiddenActivitySeries, setHiddenActivitySeries] = React.useState<Set<string>>(new Set());
  const toggleActivitySeries = React.useCallback((key: string) => {
    setHiddenActivitySeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size < 2) next.add(key);
      }
      return next;
    });
  }, []);
  const [compDataset, setCompDataset] = React.useState<"claims" | "sharing">("claims");

  // Filter Periode Terpadu Anggota Tim
  const [periodFilter, setPeriodFilter] = React.useState<DashboardPeriodPreset>("all");
  const [filterStartDate, setFilterStartDate] = React.useState<string>("");
  const [filterEndDate, setFilterEndDate] = React.useState<string>("");

  const filteredPos = React.useMemo(() => {
    return pos.filter((p) =>
      isDateInPeriod(p.po_date, periodFilter, filterStartDate, filterEndDate),
    );
  }, [pos, periodFilter, filterStartDate, filterEndDate]);

  const filteredRequests = React.useMemo(() => {
    return requests.filter((r) => {
      const d = r.submitted_at ?? r.created_at;
      return isDateInPeriod(d, periodFilter, filterStartDate, filterEndDate);
    });
  }, [requests, periodFilter, filterStartDate, filterEndDate]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prjRes, poRes, paRes, psRes] = await Promise.all([
          listProjects(),
          listPurchaseOrders(),
          listPaymentRequests(),
          getProfitSharingBundle(),
        ]);
        setProjects(prjRes.projects);
        setPos(poRes.orders);
        setRequests(paRes.requests);
        setSharingLines(psRes.lines);
        setSharingResults(psRes.results);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <PageLoader
        message={t(
          "dashboard:user_dashboard.loading",
          "Memuat ringkasan portal anggota tim...",
        )}
      />
    );
  }

  const pendingPa = filteredRequests.filter((r) => r.status === "submitted").length;
  const approvedPa = filteredRequests.filter((r) => r.status === "approved").length;
  const paidPa = filteredRequests.filter((r) => r.status === "paid").length;
  const rejectedPa = filteredRequests.filter((r) => r.status === "rejected").length;
  const totalMyShare = sharingLines.reduce((s, l) => s + l.share_amount, 0);

  // Agregasi aktivitas bulanan PO Pembelian & Pengajuan Pembayaran
  const activityMonthMap = new Map<
    string,
    { poTotal: number; reqTotal: number; paidTotal: number }
  >();
  for (const po of filteredPos) {
    const mk = po.po_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mk)) continue;
    const cur = activityMonthMap.get(mk) ?? {
      poTotal: 0,
      reqTotal: 0,
      paidTotal: 0,
    };
    cur.poTotal += po.total_amount;
    activityMonthMap.set(mk, cur);
  }
  for (const req of filteredRequests) {
    const reqDate = req.submitted_at ?? req.created_at;
    const mk = reqDate.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mk)) continue;
    const cur = activityMonthMap.get(mk) ?? {
      poTotal: 0,
      reqTotal: 0,
      paidTotal: 0,
    };
    cur.reqTotal += req.amount;
    if (req.status === "paid") {
      cur.paidTotal += req.amount;
    }
    activityMonthMap.set(mk, cur);
  }

  const userMonthlyData = [...activityMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, values]) => {
      const [yStr = "", mStr = ""] = monthKey.split("-");
      const monthDate = new Date(Number(yStr), Number(mStr) - 1, 1);
      const monthName = !Number.isNaN(monthDate.getTime())
        ? new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", {
            month: "short",
          }).format(monthDate)
        : mStr;
      return {
        key: monthKey,
        label: `${monthName} ${yStr.slice(2)}`,
        values,
      };
    });

  const totalPoNominal = filteredPos.reduce((s, p) => s + p.total_amount, 0);
  const totalReqNominal = filteredRequests.reduce((s, r) => s + r.amount, 0);
  const totalPaidNominal = filteredRequests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  const userTxHistogram = buildRupiahHistogramBins([
    ...filteredPos.map((p) => p.total_amount),
    ...filteredRequests.map((r) => r.amount),
  ]);

  const claimStatusSlices = [
    {
      label: t("dashboard:user_dashboard.status_paid", "Lunas Dicairkan"),
      value: totalPaidNominal,
      count: paidPa,
      color: "#10b981",
      dotClass: "bg-emerald-500",
    },
    {
      label: t("dashboard:user_dashboard.status_approved", "Disetujui / Siap Cair"),
      value: filteredRequests
        .filter((r) => r.status === "approved")
        .reduce((s, r) => s + r.amount, 0),
      count: approvedPa,
      color: "#f59e0b",
      dotClass: "bg-amber-500",
    },
    {
      label: t("dashboard:user_dashboard.status_submitted", "Menunggu Admin"),
      value: filteredRequests
        .filter((r) => r.status === "submitted")
        .reduce((s, r) => s + r.amount, 0),
      count: pendingPa,
      color: "#0ea5e9",
      dotClass: "bg-sky-500",
    },
    {
      label: t("dashboard:user_dashboard.status_rejected", "Perlu Revisi"),
      value: filteredRequests
        .filter((r) => r.status === "rejected")
        .reduce((s, r) => s + r.amount, 0),
      count: rejectedPa,
      color: "#f43f5e",
      dotClass: "bg-rose-500",
    },
  ];

  const sharingPalette = [
    { color: "#10b981", dotClass: "bg-emerald-500" },
    { color: "#0B43C8", dotClass: "bg-primary" },
    { color: "#8b5cf6", dotClass: "bg-violet-500" },
    { color: "#f59e0b", dotClass: "bg-amber-500" },
    { color: "#0ea5e9", dotClass: "bg-sky-500" },
  ];

  const sharingSlices = sharingLines.map((line, idx) => {
    const res = sharingResults.find((r) => r.id === line.result_id);
    const prj = projects.find((p) => p.id === res?.project_id);
    const palette = sharingPalette[idx % sharingPalette.length] ?? {
      color: "#10b981",
      dotClass: "bg-emerald-500",
    };
    return {
      label: prj
        ? `${prj.code} — ${prj.name}`
        : `${t("projects:title", "Proyek")} #${idx + 1}`,
      value: line.share_amount,
      color: palette.color,
      dotClass: palette.dotClass,
    };
  });

  const welcomeFullText = `${t("user_portal.welcome", "Selamat datang")}, ${profile?.full_name ?? "Rekan"}. ${t("user_portal.dashboard_desc", "Pantau penugasan proyek, pembayaran, dan hak bagi hasil Anda.")}`;

  const exportContext: UserDashboardExportContext = {
    t,
    periodFilter,
    projects,
    filteredPos,
    totalPaidNominal,
    paidPa,
    totalMyShare,
    sharingLines,
    sharingResults,
    filteredRequests,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <PageHeader
        title={t("user_portal.dashboard_title", "Dasbor Anggota Tim")}
        description={
          <>
            {t("user_portal.welcome", "Selamat datang")},{" "}
            <span className="font-semibold text-foreground">
              {profile?.full_name ?? "Rekan"}
            </span>
            . {t("user_portal.dashboard_desc", "Pantau penugasan proyek, pembayaran, dan hak bagi hasil Anda.")}
          </>
        }
        descriptionTooltip={welcomeFullText}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              onExportExcel={() => exportUserDashboardExcel(exportContext)}
              onExportPdf={() => exportUserDashboardPdf(exportContext)}
              onExportCsv={() => exportUserDashboardCsv(exportContext)}
            />
          </div>
        }
      />

      {/* 4 Kartu KPI Utama */}
      <UserDashboardKpiGrid
        projects={projects}
        filteredPos={filteredPos}
        filteredRequests={filteredRequests}
        sharingLines={sharingLines}
        pendingPa={pendingPa}
        approvedPa={approvedPa}
        totalMyShare={totalMyShare}
      />

      {/* Pintasan Cepat Anggota Tim */}
      <UserDashboardShortcuts
        pos={pos}
        projects={projects}
        pendingPa={pendingPa}
        rejectedPa={rejectedPa}
      />

      {/* Baris Grafik Visualisasi Anggota Tim */}
      <UserDashboardCharts
        activityChartType={activityChartType}
        setActivityChartType={setActivityChartType}
        hiddenActivitySeries={hiddenActivitySeries}
        toggleActivitySeries={toggleActivitySeries}
        totalPoNominal={totalPoNominal}
        totalReqNominal={totalReqNominal}
        totalPaidNominal={totalPaidNominal}
        userTxHistogram={userTxHistogram}
        userMonthlyData={userMonthlyData}
        compDataset={compDataset}
        setCompDataset={setCompDataset}
        claimStatusSlices={claimStatusSlices}
        sharingSlices={sharingSlices}
        totalMyShare={totalMyShare}
      />

      {/* Ringkasan Status Pengajuan */}
      <UserDashboardClaimsProgress
        requests={requests}
        paidPa={paidPa}
        approvedPa={approvedPa}
        pendingPa={pendingPa}
        rejectedPa={rejectedPa}
      />

      {/* Daftar Proyek Aktif Saya */}
      <UserDashboardProjectsTable projects={projects} />

      {/* Rincian Hak Bagi Hasil Saya */}
      <UserDashboardSharingTable
        sharingLines={sharingLines}
        sharingResults={sharingResults}
        projects={projects}
      />
    </div>
  );
}
