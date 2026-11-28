import * as React from "react";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart2Icon,
  BarChart3Icon,
  CoinsIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  PiggyBankIcon,
  PlusIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
} from "lucide-react";
import {
  buildRupiahHistogramBins,
  ChartLegendRow,
  ChartSummaryFooter,
  ChartTypeSwitcher,
  ChartValueFooter,
  CompositionChart,
  HistogramChart,
  MultiSeriesChart,
} from "@/components/shared/dashboard-charts";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { getCompanyProfile } from "@/lib/data-service";
import {
  isDateInPeriod,
  PeriodFilter,
  type DashboardPeriodPreset,
} from "@/components/shared/dashboard-period-filter";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import { listProjects } from "@/lib/data-service";
import {
  formatCompactRupiah,
  formatDateI18n,
  formatRupiah,
} from "@/lib/formatters";
import {
  getProfitSharingBundle,
  listPaymentRequests,
  listPurchaseOrders,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type {
  PaymentRequestRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";

const PROJECT_STATUS_LABELS: Record<
  string,
  { label: string; tone: "success" | "info" | "warning" | "secondary" }
> = {
  active: { label: "Aktif", tone: "success" },
  completed: { label: "Selesai", tone: "info" },
  on_hold: { label: "Ditunda", tone: "warning" },
};

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

  const shortcuts = [
    {
      to: "/user/po",
      label: t("nav.vendor_po", "PO Pembelian Vendor"),
      desc: t("dashboard:user_dashboard.shortcut_po_desc", "Buat & pantau dokumen PO"),
      icon: ShoppingCartIcon,
      tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      badge: pos.length > 0 ? `${pos.length} PO` : null,
    },
    {
      to: "/user/pembayaran",
      label: t("nav.my_payments", "Pengajuan Pembayaran"),
      desc: t("dashboard:user_dashboard.shortcut_pay_desc", "Kirim klaim & lampiran bukti"),
      icon: HandCoinsIcon,
      tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      badge:
        rejectedPa > 0
          ? `${rejectedPa} ${t("dashboard:user_dashboard.needs_revision", "Perlu Revisi")}`
          : pendingPa > 0
            ? `${pendingPa} ${t("dashboard:user_dashboard.processing", "Proses")}`
            : null,
    },
    {
      to: "/user/anggaran",
      label: t("dashboard:user_dashboard.budget_vs_realization", "Anggaran vs Realisasi"),
      desc: t("dashboard:user_dashboard.shortcut_budget_desc", "Pantau sisa pagu proyek"),
      icon: PiggyBankIcon,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      badge:
        projects.length > 0
          ? `${projects.length} ${t("dashboard:user_dashboard.projects_count", "Proyek")}`
          : null,
    },
  ];

  const welcomeFullText = `${t("user_portal.welcome", "Selamat datang")}, ${profile?.full_name ?? "Rekan"}. ${t("user_portal.dashboard_desc", "Pantau penugasan proyek, pembayaran, dan hak bagi hasil Anda.")}`;

  // Export handlers
  async function handleExportExcel() {
    const rows: Array<Array<string | number>> = [];
    rows.push([
      t("dashboard:export.col_indicator", "Indikator / Kategori"),
      t("dashboard:export.col_value", "Nilai (IDR) / Jumlah"),
      t("dashboard:export.col_unit", "Satuan / Keterangan"),
      t("dashboard:export.col_details", "Rincian Tambahan"),
    ]);
    rows.push([
      t("user_portal.kpi_projects", "Proyek Ditugaskan"),
      projects.length,
      "Proyek",
      projects.length > 0
        ? t("user_portal.kpi_projects_sub", "Terdaftar sebagai pelaksana proyek aktif")
        : t("user_portal.kpi_projects_empty", "Belum ada penugasan aktif"),
    ]);
    rows.push([
      t("user_portal.kpi_po", "PO Pembelian Vendor"),
      filteredPos.length,
      "Dokumen",
      "Dokumen PO pengadaan barang & vendor",
    ]);
    rows.push([
      t("user_portal.kpi_paid", "Pengajuan Dana Dicairkan"),
      totalPaidNominal,
      "IDR",
      `${paidPa} pengajuan selesai dicairkan`,
    ]);
    rows.push([
      t("user_portal.kpi_sharing", "Total Hak Bagi Hasil"),
      totalMyShare,
      "IDR",
      `${sharingLines.length} alokasi bagi hasil proyek`,
    ]);

    rows.push(["", "", "", ""]);
    rows.push(["DAFTAR PENGAJUAN PEMBAYARAN", "", "", ""]);
    rows.push(["Nomor Pengajuan", "Keperluan", "Nominal (IDR)", "Status"]);
    filteredRequests.forEach((r) => {
      rows.push([
        r.request_number,
        r.purpose ?? "-",
        r.amount,
        r.status.toUpperCase(),
      ]);
    });

    if (sharingLines.length > 0) {
      rows.push(["", "", "", ""]);
      rows.push(["ALOKASI BAGI HASIL PROYEK", "", "", ""]);
      rows.push(["Proyek", "Nominal Bagi Hasil (IDR)", "Porsi (%)", "Status"]);
      sharingLines.forEach((l, idx) => {
        const res = sharingResults.find((r) => r.id === l.result_id);
        const prj = projects.find((p) => p.id === res?.project_id);
        rows.push([
          prj ? `${prj.code} — ${prj.name}` : `Proyek #${idx + 1}`,
          l.share_amount,
          `${l.percentage}%`,
          "Teralokasi",
        ]);
      });
    }

    await downloadExcelSheet({
      fileName: `Ringkasan-Dasbor-User-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Dasbor Anggota Tim",
      columns: [
        { header: t("dashboard:export.col_indicator", "Indikator / Kategori"), width: 35 },
        { header: t("dashboard:export.col_value", "Nilai (IDR) / Jumlah"), width: 25 },
        { header: t("dashboard:export.col_unit", "Satuan / Keterangan"), width: 20 },
        { header: t("dashboard:export.col_details", "Rincian Tambahan"), width: 45 },
      ],
      rows,
    });
    toast.success(t("dashboard:export.toast_excel_success", "Ringkasan dasbor berhasil diekspor ke Excel"));
  }

  async function handleExportCsv() {
    const rows: Array<Array<string | number>> = [];
    rows.push([
      t("user_portal.kpi_projects", "Proyek Ditugaskan"),
      projects.length,
      "Proyek",
      "Penugasan proyek aktif",
    ]);
    rows.push([
      t("user_portal.kpi_po", "PO Pembelian Vendor"),
      filteredPos.length,
      "Dokumen",
      "PO pembelian vendor",
    ]);
    rows.push([
      t("user_portal.kpi_paid", "Pengajuan Dana Dicairkan"),
      totalPaidNominal,
      "IDR",
      `${paidPa} pengajuan dicairkan`,
    ]);
    rows.push([
      t("user_portal.kpi_sharing", "Total Hak Bagi Hasil"),
      totalMyShare,
      "IDR",
      `${sharingLines.length} alokasi bagi hasil`,
    ]);

    downloadCsvFile(
      `Ringkasan-Dasbor-User-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("dashboard:export.col_indicator", "Indikator / Kategori"),
        t("dashboard:export.col_value", "Nilai (IDR) / Jumlah"),
        t("dashboard:export.col_unit", "Satuan / Keterangan"),
        t("dashboard:export.col_details", "Rincian Tambahan"),
      ],
      rows,
    );
    toast.success(t("dashboard:export.toast_csv_success", "Ringkasan dasbor berhasil diekspor ke CSV"));
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      orientation: "landscape",
      docTitle: t("user_portal.pdf_title", "Ringkasan Dasbor Portal Anggota Tim"),
      docSubtitle: `${t("common:action.period", "Periode")}: ${periodFilter === "all" ? t("dashboard:filter.all_periods", "Semua Periode") : periodFilter}`,
      docNumber: `USR-DSB/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        { label: t("user_portal.kpi_projects", "Proyek Ditugaskan"), value: `${projects.length} Proyek` },
        { label: t("user_portal.kpi_po", "PO Pembelian"), value: `${filteredPos.length} Dokumen` },
        { label: t("user_portal.kpi_paid", "Dana Dicairkan"), value: formatRupiah(totalPaidNominal) },
        { label: t("user_portal.kpi_sharing", "Total Bagi Hasil"), value: formatRupiah(totalMyShare) },
      ],
      sections: [
        {
          title: t("user_portal.recent_requests", "Daftar Pengajuan Pembayaran"),
          tableColumns: [
            { header: t("user_portal.col_code", "Nomor Pengajuan"), widthRatio: 0.20, align: "left" },
            { header: t("user_portal.col_purpose", "Keperluan"), widthRatio: 0.35, align: "left" },
            { header: t("user_portal.col_amount", "Nominal (IDR)"), widthRatio: 0.25, align: "right" },
            { header: t("user_portal.col_status", "Status"), widthRatio: 0.20, align: "center" },
          ],
          tableRows: filteredRequests.slice(0, 15).map((r) => [
            r.request_number,
            r.purpose ?? "-",
            formatRupiah(r.amount),
            r.status.toUpperCase(),
          ]),
        },
      ],
    });
    downloadPdfBytes(bytes, `Ringkasan-Dasbor-User-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(t("dashboard:export.toast_pdf_success", "Ringkasan dasbor berhasil diekspor ke PDF"));
  }

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
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
            <Button
              type="button"
              size="sm"
              asChild
              className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs"
            >
              <Link to="/user/pembayaran">
                <PlusIcon className="size-4" />
                <span>{t("user_portal.submit_payment", "Ajukan Pembayaran")}</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* 4 Kartu KPI Utama (Flexbox Modern + Mobile Anti-Long Scroll Carousel) */}
      <div className="flexbox-kpi-grid mobile-kpi-carousel sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("user_portal.kpi_projects", "Proyek Ditugaskan")}
          value={projects.length}
          suffix={` ${t("user_portal.projects_count", "Proyek")}`}
          subtext={
            projects.length > 0
              ? t("user_portal.kpi_projects_sub", "Terdaftar sebagai pelaksana proyek")
              : t("user_portal.kpi_projects_empty", "Belum ada penugasan aktif")
          }
          icon={FolderKanbanIcon}
          to="/user/anggaran"
          sparklineData={projects.length > 0 ? [0, projects.length] : [0, 0]}
          changePercent={null}
        />

        <KpiCard
          label={t("user_portal.kpi_po", "PO Pembelian Vendor")}
          value={filteredPos.length}
          suffix={` ${t("user_portal.documents", "Dokumen")}`}
          subtext={
            filteredPos.length > 0
              ? t("user_portal.kpi_po_sub", "Dokumen pengadaan barang/jasa")
              : t("user_portal.kpi_po_empty", "Belum ada PO pembelian tercatat")
          }
          icon={ShoppingCartIcon}
          iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
          to="/user/po"
          sparklineData={filteredPos.length > 1 ? filteredPos.map((p) => p.total_amount) : [0, filteredPos.length]}
          changePercent={null}
        />

        <KpiCard
          label={t("user_portal.kpi_claims", "Pengajuan Pembayaran")}
          value={filteredRequests.length}
          suffix={` ${t("user_portal.submissions", "Pengajuan")}`}
          subtext={
            pendingPa > 0
              ? `${pendingPa} ${t("user_portal.pending_approval", "menunggu persetujuan Admin")}`
              : approvedPa > 0
                ? `${approvedPa} ${t("user_portal.approved_waiting", "disetujui menunggu transfer")}`
                : t("user_portal.all_processed", "Semua pengajuan telah diproses")
          }
          icon={ReceiptTextIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          to="/user/pembayaran"
          sparklineData={filteredRequests.length > 1 ? filteredRequests.map((r) => r.amount) : [0, filteredRequests.length]}
          changePercent={null}
        />

        <KpiCard
          label={t("user_portal.kpi_sharing", "Hak Bagi Hasil")}
          value={totalMyShare}
          formatter={formatRupiah}
          subtext={
            sharingLines.length > 0
              ? `${t("user_portal.from", "Dari")} ${sharingLines.length} ${t("user_portal.projects_completed", "proyek diselesaikan")}`
              : t("dashboard:user_dashboard.no_sharing_allocation", "Belum ada alokasi bagi hasil")
          }
          icon={CoinsIcon}
          iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          to="/user/pembayaran"
          sparklineData={sharingLines.length > 1 ? sharingLines.map((l) => l.share_amount) : [0, totalMyShare]}
          changePercent={null}
        />
      </div>

      {/* Pintasan Cepat Anggota Tim */}
      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 [&>*:nth-child(3)]:max-sm:col-span-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-2xs transition-all duration-150 hover:border-primary/50 hover:bg-muted/30"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-150 group-hover:scale-105",
                  item.tone,
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-semibold text-foreground block truncate">
                  {item.label}
                </span>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {item.desc}
                  </span>
                  {item.badge ? (
                    <span className="shrink-0 rounded-full bg-primary/12 text-primary dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              </div>
              <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      {/* Baris Grafik Visualisasi Anggota Tim */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grafik 1: Tren Bulanan & Histogram Pengajuan Pembayaran / PO */}
        <ChartCard
          className="lg:col-span-2"
          title={t("dashboard:user_dashboard.chart_activity_title", "Aktivitas PO & Pengajuan Pembayaran")}
          subtitle={
            activityChartType === "histogram"
              ? t("dashboard:user_dashboard.chart_histogram_desc", "Histogram sebaran nominal seluruh PO pembelian dan pengajuan klaim Anda.")
              : t("dashboard:user_dashboard.chart_activity_desc", "Perbandingan bulanan nilai PO pembelian, klaim diajukan, dan dana dicairkan.")
          }
          controls={
            <ChartTypeSwitcher
              value={activityChartType}
              onChange={(val) => setActivityChartType(val)}
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
                {
                  value: "histogram",
                  label: t("dashboard:charts.types.histogram", "Histogram"),
                  title: t("dashboard:charts.types.histogram_title", "Histogram"),
                  icon: BarChart2Icon,
                },
              ]}
            />
          }
          legend={
            <ChartLegendRow
              series={[
                {
                  key: "poTotal",
                  label: t("dashboard:user_dashboard.legend_po", "PO Pembelian"),
                  color: "#8b5cf6",
                },
                {
                  key: "reqTotal",
                  label: t("dashboard:user_dashboard.legend_req", "Pengajuan Dana"),
                  color: "#f59e0b",
                },
                {
                  key: "paidTotal",
                  label: t("dashboard:user_dashboard.disbursed", "Dicairkan"),
                  color: "#10b981",
                },
              ]}
              hiddenKeys={hiddenActivitySeries}
              onToggleSeries={toggleActivitySeries}
            />
          }
          footer={
            <ChartSummaryFooter
              items={[
                {
                  label: t("dashboard:user_dashboard.total_po_val", "Total Nilai PO"),
                  value: formatRupiah(totalPoNominal),
                  valueClass: "text-violet-600 dark:text-violet-400",
                },
                {
                  label: t("dashboard:user_dashboard.total_req_val", "Total Diajukan"),
                  value: formatRupiah(totalReqNominal),
                  valueClass: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: t("dashboard:user_dashboard.total_paid_val", "Sudah Dicairkan"),
                  value: formatRupiah(totalPaidNominal),
                  valueClass: "text-emerald-600 dark:text-emerald-400",
                },
              ]}
            />
          }
        >
          {activityChartType === "histogram" ? (
            <HistogramChart
              bins={userTxHistogram.bins}
              average={userTxHistogram.average}
              median={userTxHistogram.median}
              totalCount={userTxHistogram.totalCount}
              unitLabel={t("dashboard:user_dashboard.unit_docs", "Dokumen")}
              accentColor="#0B43C8"
              emptyTitle={t("dashboard:user_dashboard.no_claims_tx", "Belum Ada Transaksi Pengajuan")}
              emptySubtitle={t("dashboard:user_dashboard.no_claims_tx_desc", "Histogram distribusi nominal otomatis muncul setelah Anda membuat PO pembelian atau pengajuan pembayaran.")}
            />
          ) : (
            <MultiSeriesChart
              chartType={activityChartType}
              data={userMonthlyData}
              series={[
                {
                  key: "poTotal",
                  label: t("dashboard:user_dashboard.legend_po", "PO Pembelian"),
                  color: "#8b5cf6",
                  textClass: "text-violet-600 dark:text-violet-400",
                },
                {
                  key: "reqTotal",
                  label: t("dashboard:user_dashboard.legend_req", "Pengajuan Dana"),
                  color: "#f59e0b",
                  textClass: "text-amber-600 dark:text-amber-400",
                },
                {
                  key: "paidTotal",
                  label: t("dashboard:user_dashboard.disbursed", "Dicairkan"),
                  color: "#10b981",
                  textClass: "text-emerald-600 dark:text-emerald-400",
                },
              ]}
              hiddenKeys={hiddenActivitySeries}
              formatValue={formatRupiah}
              formatShortValue={formatCompactRupiah}
              emptyTitle={t("dashboard:user_dashboard.no_claims_history", "Belum Ada Riwayat Pengajuan")}
              emptySubtitle={t("dashboard:user_dashboard.no_claims_history_desc", "Grafik bulanan otomatis tampil setelah PO pembelian atau pengajuan pembayaran tercatat.")}
            />
          )}
        </ChartCard>

        {/* Grafik 2: Status Klaim Pembayaran & Porsi Bagi Hasil */}
        <ChartCard
          title={t("dashboard:user_dashboard.chart_claims_sharing_title", "Status Klaim & Bagi Hasil")}
          subtitle={
            compDataset === "claims"
              ? t("dashboard:user_dashboard.chart_claims_desc", "Proporsi nominal pengajuan pembayaran per status.")
              : t("dashboard:user_dashboard.chart_sharing_desc", "Alokasi nominal hak bagi hasil per proyek.")
          }
          controls={
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setCompDataset("claims")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "claims"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("dashboard:user_dashboard.tab_claims", "Klaim")}
              </button>
              <button
                type="button"
                onClick={() => setCompDataset("sharing")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "sharing"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("dashboard:user_dashboard.tab_sharing", "Bagi Hasil")}
              </button>
            </div>
          }
          footer={
            <ChartValueFooter
              label={
                compDataset === "claims"
                  ? t("dashboard:user_dashboard.total_claims", "Total Klaim")
                  : t("dashboard:user_dashboard.total_sharing", "Total Bagi Hasil")
              }
              value={formatRupiah(
                compDataset === "claims" ? totalReqNominal : totalMyShare,
              )}
            />
          }
        >
          <CompositionChart
            chartType="donut"
            slices={compDataset === "claims" ? claimStatusSlices : sharingSlices}
            centerLabel={
              compDataset === "claims"
                ? t("dashboard:user_dashboard.total_claims", "Total Klaim")
                : t("dashboard:user_dashboard.total_sharing", "Total Bagi Hasil")
            }
            centerValue={formatCompactRupiah(
              compDataset === "claims" ? totalReqNominal : totalMyShare,
            )}
            formatValue={formatRupiah}
            emptyTitle={
              compDataset === "claims"
                ? t("dashboard:user_dashboard.no_claims_empty", "Belum Ada Pengajuan Pembayaran")
                : t("dashboard:user_dashboard.no_sharing_empty", "Belum Ada Alokasi Bagi Hasil")
            }
            emptySubtitle={
              compDataset === "claims"
                ? t("dashboard:user_dashboard.no_claims_empty_desc", "Proporsi status pengajuan dana tampil setelah Anda mengajukan klaim pembayaran.")
                : t("dashboard:user_dashboard.no_sharing_empty_desc", "Grafik porsi bagi hasil muncul setelah proyek selesai difinalisasi.")
            }
          />
        </ChartCard>
      </div>

      {/* Ringkasan Status Pengajuan (tampil ringkas jika sudah ada pengajuan) */}
      {requests.length > 0 ? (
        <Card className="rounded-2xl border-border/80 bg-card px-6 py-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              {t("dashboard:user_dashboard.claims_progress", {
                count: requests.length,
                defaultValue: `Progres Pengajuan Pembayaran Anda (${requests.length} total)`,
              })}
            </span>
            <Link
              to="/user/pembayaran"
              className="font-semibold text-primary dark:text-cyan-400 hover:underline"
            >
              {t("dashboard:user_dashboard.view_history", "Lihat Riwayat")}
            </Link>
          </div>
          <div className="flex h-2.5 w-full rounded-full bg-muted/50 overflow-hidden gap-0.5">
            {paidPa > 0 ? (
              <div
                style={{ width: `${(paidPa / requests.length) * 100}%` }}
                className="h-full bg-emerald-500"
                aria-label={`${t("dashboard:user_dashboard.status_paid", "Dibayar Lunas")}: ${paidPa}`}
              />
            ) : null}
            {approvedPa > 0 ? (
              <div
                style={{ width: `${(approvedPa / requests.length) * 100}%` }}
                className="h-full bg-amber-500"
                aria-label={`${t("dashboard:user_dashboard.status_approved", "Disetujui / Siap Cair")}: ${approvedPa}`}
              />
            ) : null}
            {pendingPa > 0 ? (
              <div
                style={{ width: `${(pendingPa / requests.length) * 100}%` }}
                className="h-full bg-sky-500"
                aria-label={`${t("dashboard:user_dashboard.status_submitted", "Menunggu Admin")}: ${pendingPa}`}
              />
            ) : null}
            {rejectedPa > 0 ? (
              <div
                style={{ width: `${(rejectedPa / requests.length) * 100}%` }}
                className="h-full bg-rose-500"
                aria-label={`${t("dashboard:user_dashboard.status_rejected", "Perlu Revisi")}: ${rejectedPa}`}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              {t("dashboard:user_dashboard.badge_paid", "Lunas:")} <strong className="text-foreground">{paidPa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              {t("dashboard:user_dashboard.badge_approved", "Siap Cair:")} <strong className="text-foreground">{approvedPa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-500" />
              {t("dashboard:user_dashboard.badge_submitted", "Menunggu:")} <strong className="text-foreground">{pendingPa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500" />
              {t("dashboard:user_dashboard.badge_rejected", "Perlu Revisi:")} <strong className="text-foreground">{rejectedPa}</strong>
            </span>
          </div>
        </Card>
      ) : null}

      {/* Daftar Proyek Aktif Saya */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("dashboard:user_dashboard.my_active_projects", "Proyek Aktif Saya")}
          description={t("dashboard:user_dashboard.my_active_projects_desc", "Daftar proyek di mana Anda terdaftar aktif sebagai pelaksana tugas.")}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                  {t("projects:col_code", "Kode Proyek")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                  {t("projects:col_name", "Nama Proyek")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                  {t("dashboard:user_dashboard.execution_schedule", "Jadwal Pelaksanaan")}
                </TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">
                  {t("common:table.status", "Status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <FolderKanbanIcon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("dashboard:user_dashboard.no_projects_assigned", "Belum Ada Penugasan Proyek")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                        {t("dashboard:user_dashboard.no_projects_assigned_desc", "Anda belum terdaftar dalam proyek aktif mana pun. Hubungi Admin atau manajer proyek untuk penugasan tim.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => {
                  const pMeta = PROJECT_STATUS_LABELS[p.status] ?? {
                    label: p.status,
                    tone: "secondary" as const,
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-center font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {p.code}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {p.name}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap tabular-nums">
                        {formatDateI18n(p.start_date, language)} &ndash;{" "}
                        {formatDateI18n(p.target_end_date, language)}
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge tone={pMeta.tone} label={t(`projects:status.${p.status}`, pMeta.label)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end px-6 py-3 border-t border-border/70 bg-muted/10">
            <Link
              to="/user/anggaran"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
            >
              <span>{t("dashboard:user_dashboard.view_project_details", "Lihat Detail Proyek")}</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Rincian Hak Bagi Hasil Saya */}
      {sharingLines.length > 0 ? (
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeaderWithInfo
            title={t("dashboard:user_dashboard.my_sharing_detail", "Rincian Hak Bagi Hasil Saya")}
            description={t("dashboard:user_dashboard.my_sharing_detail_desc", "Daftar alokasi pembagian hasil dari proyek yang telah selesai dan disetujui.")}
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                    {t("projects:title", "Proyek")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("dashboard:user_dashboard.portion_pct", "Porsi (%)")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">
                    {t("dashboard:user_dashboard.sharing_amount", "Nominal Hak Bagi Hasil")}
                  </TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">
                    {t("dashboard:user_dashboard.calc_status", "Status Perhitungan")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharingLines.map((line) => {
                  const res = sharingResults.find((r) => r.id === line.result_id);
                  const prj = projects.find((p) => p.id === res?.project_id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {prj ? `${prj.code}: ${prj.name}` : t("projects:title", "Proyek")}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                        {line.percentage}%
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={line.share_amount} />
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={res?.status === "finalized" ? "success" : "warning"}
                            label={
                              res?.status === "finalized"
                                ? t("profit_sharing:badge_finalized", "Difinalisasi & Terkunci")
                                : t("profit_sharing:badge_draft", "Simulasi Draf")
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
