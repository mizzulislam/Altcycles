import * as React from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/page-header";
import {
  isDateInPeriod,
  PeriodFilter,
  type DashboardPeriodPreset,
} from "@/components/shared/dashboard-period-filter";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { PageLoader } from "@/components/ui/loader";
import {
  buildRupiahHistogramBins,
  type MultiSeriesChartKind,
} from "@/components/shared/dashboard-charts";
import {
  buildArAging,
  buildCashFlowStatement,
  buildIncomeStatement,
} from "@/lib/accounting-engine";
import {
  listAccounts,
  listCustomers,
  listPeriods,
  listProjects,
} from "@/lib/data-service";
import {
  getDashboardBillingSummary,
  listJournalsWithLines,
  listPaymentRequests,
} from "@/lib/operations-service";
import type {
  AccountRow,
  CustomerRow,
  JournalLineRow,
  JournalRow,
  PaymentRequestRow,
  PeriodRow,
  ProjectRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import {
  buildMonthlySeries,
  type AgingBucketItem,
} from "./dashboard/dashboard-types";
import {
  exportDashboardCsv,
  exportDashboardExcel,
  exportDashboardPdf,
  type DashboardExportContext,
} from "./dashboard/admin-dashboard-export-handlers";
import { AdminDashboardKpiGrid } from "./dashboard/admin-dashboard-kpi-grid";
import { AdminDashboardChartsRow } from "./dashboard/admin-dashboard-charts-row";
import { AdminDashboardSecondaryCharts } from "./dashboard/admin-dashboard-secondary-charts";
import { AdminDashboardRecentActivity } from "./dashboard/admin-dashboard-recent-activity";

export function AdminDashboardPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [invoices, setInvoices] = React.useState<SalesInvoiceRow[]>([]);
  const [paymentRequests, setPaymentRequests] = React.useState<PaymentRequestRow[]>([]);
  const [pendingClientPos, setPendingClientPos] = React.useState(0);

  // Filter Periode Global Terpadu
  const [periodFilter, setPeriodFilter] = React.useState<DashboardPeriodPreset>("all");
  const [filterStartDate, setFilterStartDate] = React.useState<string>("");
  const [filterEndDate, setFilterEndDate] = React.useState<string>("");

  // Kontrol Switcher Tampilan Grafik
  const [trendChartType, setTrendChartType] = React.useState<MultiSeriesChartKind>("column");
  const [hiddenTrendSeries, setHiddenTrendSeries] = React.useState<Set<string>>(new Set());
  const toggleTrendSeries = React.useCallback((key: string) => {
    setHiddenTrendSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Jangan sembunyikan semua seri (harus ada minimal 1 yang aktif)
        if (next.size < 2) {
          next.add(key);
        }
      }
      return next;
    });
  }, []);
  const [donutMode, setDonutMode] = React.useState<"profit" | "cash">("profit");
  const [txFreqMode, setTxFreqMode] = React.useState<"area" | "histogram">("area");

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accs, pers, prjs, csts, jRes, paRes, billingSummary] = await Promise.all([
          listAccounts(),
          listPeriods(),
          listProjects(),
          listCustomers(),
          listJournalsWithLines(),
          listPaymentRequests(),
          getDashboardBillingSummary(),
        ]);
        setAccounts(accs);
        setPeriods(pers);
        setProjects(prjs.projects);
        setCustomers(csts);
        setJournals(jRes.journals);
        setLines(jRes.lines);
        setPaymentRequests(paRes.requests);
        setInvoices(billingSummary.invoices);
        setPendingClientPos(billingSummary.pendingClientPosCount);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Gagal memuat data dasbor keuangan.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Filter Data berdasarkan PeriodFilter Global
  const filteredJournals = React.useMemo(() => {
    return journals.filter((j) =>
      isDateInPeriod(
        j.journal_date,
        periodFilter,
        filterStartDate,
        filterEndDate,
        periods,
      ),
    );
  }, [journals, periodFilter, filterStartDate, filterEndDate, periods]);

  const filteredJournalIds = React.useMemo(
    () => new Set(filteredJournals.map((j) => j.id)),
    [filteredJournals],
  );
  const filteredLines = React.useMemo(
    () => lines.filter((l) => filteredJournalIds.has(l.journal_id)),
    [lines, filteredJournalIds],
  );

  const accMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  if (loading) {
    return (
      <PageLoader
        message={t(
          "dashboard:charts.loading",
          "Memuat dasbor keuangan & akuntansi...",
        )}
      />
    );
  }

  // Perhitungan Data Keuangan Terfilter
  const cashPosition = buildCashFlowStatement(accounts, filteredJournals, filteredLines);
  const incomeStatement = buildIncomeStatement(accounts, filteredJournals, filteredLines);
  const openPeriods = periods.filter((p) => p.status === "open").length;
  const totalContract = projects.reduce((sum, p) => sum + p.contract_value, 0);

  const pendingApprovals = paymentRequests.filter(
    (r) => r.status === "submitted",
  ).length;
  const readyDisbursements = paymentRequests.filter(
    (r) => r.status === "approved",
  ).length;

  const issuedInvoices = invoices.filter((i) => i.doc_status === "issued");
  const totalInvoiced = issuedInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalCollected = issuedInvoices.reduce((s, i) => s + i.paid_amount, 0);
  const outstandingReceivable = Math.max(0, totalInvoiced - totalCollected);
  const unpaidInvoiceCount = issuedInvoices.filter(
    (i) => i.total_amount - i.paid_amount > 0,
  ).length;

  // AR Aging
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));
  const projectCodeMap = new Map(projects.map((p) => [p.id, p.code]));
  const arAging = buildArAging(
    invoices,
    customerMap,
    projectCodeMap,
    new Date().toISOString().slice(0, 10),
  );

  const agingBuckets: AgingBucketItem[] = [
    {
      label: t("dashboard:charts.aging_current", "Belum Jatuh Tempo"),
      bucketKey: "Belum Jatuh Tempo",
      color: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      amount: arAging
        .filter((a) => a.agingBucket === "Belum Jatuh Tempo")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: t("dashboard:charts.aging_1_30", "1–30 Hari"),
      bucketKey: "1–30 Hari",
      color: "bg-sky-500",
      dotColor: "bg-sky-500",
      amount: arAging
        .filter((a) => a.agingBucket === "1–30 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: t("dashboard:charts.aging_31_60", "31–60 Hari"),
      bucketKey: "31–60 Hari",
      color: "bg-amber-500",
      dotColor: "bg-amber-500",
      amount: arAging
        .filter((a) => a.agingBucket === "31–60 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: t("dashboard:charts.aging_over_60", "> 60 Hari"),
      bucketKey: "> 60 Hari",
      color: "bg-rose-500",
      dotColor: "bg-rose-500",
      amount: arAging
        .filter((a) => a.agingBucket === "> 60 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
  ];

  // Tren Bulanan MultiSeriesChart
  const monthlySeries = buildMonthlySeries(accounts, journals, lines, language);
  const monthlyChartData = monthlySeries.map((pt) => ({
    key: pt.monthKey,
    label: pt.label,
    values: {
      revenue: pt.revenue,
      expense: pt.expense,
      netCash: pt.netCash,
    },
  }));

  // Sparkline data array untuk kartu KPI
  const cashSparkline = monthlySeries.map((m) => m.netCash);
  const prevCash = monthlySeries.length >= 2 ? monthlySeries[monthlySeries.length - 2]?.netCash ?? 0 : null;
  const cashChangePct =
    prevCash !== null && prevCash !== 0
      ? ((cashPosition.endingCash - prevCash) / Math.abs(prevCash)) * 100
      : null;

  // Frekuensi Transaksi Jurnal (B2)
  const totalTxCount = filteredJournals.filter((j) => j.status === "posted").length;
  const activeMonthsCount = Math.max(1, monthlySeries.length);
  const avgTxPerMonth = Math.round((totalTxCount / activeMonthsCount) * 10) / 10;
  const txFreqChartData = monthlySeries.map((pt) => ({
    key: pt.monthKey,
    label: pt.label,
    values: {
      count: pt.txCount,
    },
  }));

  // Histogram Distribusi Nominal Transaksi
  const postedJournalAmounts = filteredJournals
    .filter((j) => j.status === "posted" && j.journal_type !== "closing")
    .map((j) =>
      lines
        .filter((l) => l.journal_id === j.id)
        .reduce((s, l) => s + l.debit, 0),
    )
    .filter((amt) => amt > 0);
  const journalHistogram = buildRupiahHistogramBins(postedJournalAmounts);

  // Total Realisasi Beban
  const totalExpense =
    incomeStatement.totalDirectExpense + incomeStatement.totalSharedExpense;

  // 5 Transaksi Terakhir (B3)
  const recentJournals = filteredJournals
    .filter((j) => j.status === "posted")
    .sort((a, b) => b.journal_date.localeCompare(a.journal_date))
    .slice(0, 5);

  // Komposisi Segments
  const donutSegments =
    donutMode === "profit"
      ? [
          {
            label: t("dashboard:charts.revenue", "Pendapatan"),
            value: Math.max(0, incomeStatement.totalRevenue),
            color: "#10b981",
            dotClass: "bg-emerald-500",
          },
          {
            label: t("dashboard:charts.direct_expense", "Beban Langsung"),
            value: Math.max(0, incomeStatement.totalDirectExpense),
            color: "#f59e0b",
            dotClass: "bg-amber-500",
          },
          {
            label: t("dashboard:charts.shared_expense", "Beban Bersama"),
            value: Math.max(0, incomeStatement.totalSharedExpense),
            color: "#0B43C8",
            dotClass: "bg-primary",
          },
        ]
      : [
          {
            label: t("dashboard:charts.operating_inflow", "Kas Masuk Operasi"),
            value: Math.max(0, cashPosition.operatingInflow),
            color: "#10b981",
            dotClass: "bg-emerald-500",
          },
          {
            label: t("dashboard:charts.operating_outflow", "Kas Keluar Operasi"),
            value: Math.max(0, cashPosition.operatingOutflow),
            color: "#f43f5e",
            dotClass: "bg-rose-500",
          },
          {
            label: t("dashboard:charts.investing_financing", "Investasi & Pendanaan"),
            value: Math.abs(cashPosition.netInvesting + cashPosition.netFinancing),
            color: "#0B43C8",
            dotClass: "bg-primary",
          },
        ];

  // Proyek Progress Penagihan
  const projectBillingStats = projects.slice(0, 4).map((p) => {
    const prjInvoices = invoices.filter(
      (i) => i.project_id === p.id && i.doc_status === "issued",
    );
    const billed = prjInvoices.reduce((s, i) => s + i.total_amount, 0);
    const paid = prjInvoices.reduce((s, i) => s + i.paid_amount, 0);
    const pct =
      p.contract_value > 0
        ? Math.min(100, Math.round((billed / p.contract_value) * 100))
        : 0;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      contract: p.contract_value,
      billed,
      paid,
      pct,
    };
  });

  const exportContext: DashboardExportContext = {
    t,
    language,
    periodFilter,
    cashPosition,
    incomeStatement,
    openPeriods,
    totalContract,
    outstandingReceivable,
    unpaidInvoiceCount,
    pendingApprovals,
    readyDisbursements,
    monthlySeries,
    projectBillingStats,
    recentJournals,
    lines,
    projects,
    invoices,
    accounts,
    filteredLines,
    accMap,
    totalExpense,
    totalInvoiced,
    agingBuckets,
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* A1: Header Halaman + Filter Periode Global + Unduh/Ekspor */}
      <PageHeader
        title={t("dashboard.title", "Dasbor Keuangan & Akuntansi")}
        description={t(
          "dashboard.subtitle",
          "Pantau likuiditas kas, kinerja laba rugi, piutang, dan aktivitas jurnal perusahaan.",
        )}
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
              periods={periods}
            />
            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={() => exportDashboardExcel(exportContext)}
              onExportPdf={() => exportDashboardPdf(exportContext)}
              onExportCsv={() => exportDashboardCsv(exportContext)}
            />
          </div>
        }
      />

      {/* A2: Baris 1, Empat Kartu KPI Utama */}
      <AdminDashboardKpiGrid
        endingCash={cashPosition.endingCash}
        openPeriods={openPeriods}
        cashSparkline={cashSparkline}
        cashChangePct={cashChangePct}
        pendingApprovals={pendingApprovals}
        readyDisbursements={readyDisbursements}
        outstandingReceivable={outstandingReceivable}
        unpaidInvoiceCount={unpaidInvoiceCount}
        pendingClientPos={pendingClientPos}
        agingBuckets={agingBuckets}
        totalContract={totalContract}
        projects={projects}
      />

      {/* A3: Baris 2, Tren Bulanan (2/3) & Komposisi Keuangan (1/3) */}
      <AdminDashboardChartsRow
        trendChartType={trendChartType}
        setTrendChartType={setTrendChartType}
        hiddenTrendSeries={hiddenTrendSeries}
        toggleTrendSeries={toggleTrendSeries}
        incomeStatement={incomeStatement}
        totalExpense={totalExpense}
        monthlyChartData={monthlyChartData}
        donutMode={donutMode}
        setDonutMode={setDonutMode}
        cashEndingBalance={cashPosition.endingCash}
        donutSegments={donutSegments}
      />

      {/* A4: Baris 3, Dua Kartu Sejajar: Frekuensi Transaksi & Realisasi Penagihan */}
      <AdminDashboardSecondaryCharts
        txFreqMode={txFreqMode}
        setTxFreqMode={setTxFreqMode}
        journalHistogram={journalHistogram}
        totalTxCount={totalTxCount}
        avgTxPerMonth={avgTxPerMonth}
        txFreqChartData={txFreqChartData}
        agingBuckets={agingBuckets}
        projectBillingStats={projectBillingStats}
        outstandingReceivable={outstandingReceivable}
      />

      {/* A5: Baris 4, 5 Transaksi Terakhir (Lebar Penuh) */}
      <AdminDashboardRecentActivity
        recentJournals={recentJournals}
        lines={lines}
        accMap={accMap}
      />
    </div>
  );
}
