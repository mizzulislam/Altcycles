import * as React from "react";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ClockIcon,
  ReceiptTextIcon,
  ScaleIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import {
  buildRupiahHistogramBins,
  ChartLegendRow,
  ChartSummaryFooter,
  ChartTypeSwitcher,
  ChartValueFooter,
  CompositionChart,
  HistogramChart,
  MultiSeriesChart,
  type MultiSeriesChartKind,
} from "@/components/shared/dashboard-charts";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { PageHeader, TruncatedTooltipText } from "@/components/shared/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  isDateInPeriod,
  PeriodFilter,
  type DashboardPeriodPreset,
} from "@/components/shared/dashboard-period-filter";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
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
  buildArAging,
  buildCashFlowStatement,
  buildIncomeStatement,
} from "@/lib/accounting-engine";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  getCompanyProfile,
  listAccounts,
  listCustomers,
  listPeriods,
  listProjects,
} from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  formatCompactRupiah,
  formatDateI18n,
  formatRupiah,
} from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import {
  getDashboardBillingSummary,
  listJournalsWithLines,
  listPaymentRequests,
  recordExportLog,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { renderDashboardChartsToPng } from "@/lib/pdf/dashboard-chart-renderer";
import { cn } from "@/lib/utils";
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

interface MonthlyFinancialPoint {
  monthKey: string;
  label: string;
  revenue: number;
  expense: number;
  netCash: number;
  txCount: number;
}

function buildMonthlySeries(
  accounts: AccountRow[],
  journals: JournalRow[],
  lines: JournalLineRow[],
  language: string = "id",
): MonthlyFinancialPoint[] {
  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const cashAccountIds = new Set(
    accounts
      .filter(
        (a) =>
          a.system_tag === "cash_bank" ||
          a.cash_flow_category === "cash_equivalent",
      )
      .map((a) => a.id),
  );

  const linesByJournal = new Map<string, JournalLineRow[]>();
  for (const l of lines) {
    const arr = linesByJournal.get(l.journal_id) ?? [];
    arr.push(l);
    linesByJournal.set(l.journal_id, arr);
  }

  const buckets = new Map<
    string,
    { revenue: number; expense: number; netCash: number; txCount: number }
  >();

  for (const j of journals) {
    if (j.status !== "posted") continue;
    const monthKey = j.journal_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;

    const current = buckets.get(monthKey) ?? {
      revenue: 0,
      expense: 0,
      netCash: 0,
      txCount: 0,
    };
    current.txCount += 1;

    const jLines = linesByJournal.get(j.id) ?? [];
    for (const l of jLines) {
      const acc = accMap.get(l.account_id);
      if (!acc) continue;
      if (j.journal_type !== "closing") {
        if (acc.account_type === "revenue") {
          current.revenue += l.credit - l.debit;
        } else if (acc.account_type === "expense") {
          current.expense += l.debit - l.credit;
        }
      }
      if (cashAccountIds.has(l.account_id)) {
        current.netCash += l.debit - l.credit;
      }
    }
    buckets.set(monthKey, current);
  }

  const locale = language === "en" ? "en-US" : "id-ID";

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, val]) => {
      const [yStr = "", mStr = ""] = monthKey.split("-");
      const mIdx = Number(mStr) - 1;
      const dateObj = new Date(Number(yStr), mIdx, 1);
      const monthName = !isNaN(dateObj.getTime())
        ? new Intl.DateTimeFormat(locale, { month: "short" }).format(dateObj)
        : mStr;
      return {
        monthKey,
        label: `${monthName} ${yStr.slice(2)}`,
        revenue: Math.max(0, val.revenue),
        expense: Math.max(0, val.expense),
        netCash: val.netCash,
        txCount: val.txCount,
      };
    });
}

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

  const agingBuckets = [
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

  // Ekspor Dokumen Ringkasan Dasbor Eksekutif (Excel, PDF, CSV)
  async function handleBackupExport() {
    const rows: Array<Array<string | number>> = [];

    // Seksi 1: Metrik Kunci & Posisi Keuangan
    rows.push([
      t("dashboard:export.col_indicator", "Indikator / Kategori"),
      t("dashboard:export.col_value", "Nilai (IDR)"),
      t("dashboard:export.col_unit", "Satuan / Keterangan"),
      t("dashboard:export.col_details", "Rincian"),
    ]);
    rows.push([
      t("dashboard.kpi.ending_cash", "Kas & Bank Terkini"),
      cashPosition.endingCash,
      "IDR",
      openPeriods > 0
        ? `${openPeriods} ${t("dashboard.kpi.open_periods", "periode buku aktif terbuka")}`
        : t("dashboard.kpi.all_periods_closed", "Seluruh periode buku ditutup"),
    ]);
    rows.push([
      t("dashboard.kpi.outstanding_receivables", "Piutang Belum Tertagih"),
      outstandingReceivable,
      "IDR",
      unpaidInvoiceCount > 0
        ? `${unpaidInvoiceCount} ${t("dashboard.kpi.invoices_awaiting_payment", "invoice menunggu pelunasan")}`
        : t("dashboard.kpi.all_receivables_managed", "Seluruh tagihan klien terkelola"),
    ]);
    rows.push([
      t("dashboard.kpi.contract_commitments", "Komitmen Kontrak"),
      totalContract,
      "IDR",
      `${t("dashboard.kpi.accumulated_from", "Akumulasi dari")} ${projects.length} ${t("dashboard.kpi.client_projects", "proyek klien")}`,
    ]);
    rows.push([
      t("dashboard.kpi.pending_approvals", "Antrean Pembayaran"),
      pendingApprovals + readyDisbursements,
      t("dashboard.kpi.submissions", "Pengajuan"),
      `${readyDisbursements} siap dicairkan, ${pendingApprovals} menunggu verifikasi`,
    ]);
    rows.push([
      t("dashboard:charts.revenue", "Total Pendapatan"),
      incomeStatement.totalRevenue,
      "IDR",
      "Akumulasi pendapatan operasional",
    ]);
    rows.push([
      t("dashboard:charts.direct_expense", "Beban Langsung"),
      incomeStatement.totalDirectExpense,
      "IDR",
      "Beban pokok proyek",
    ]);
    rows.push([
      t("dashboard:charts.shared_expense", "Beban Bersama"),
      incomeStatement.totalSharedExpense,
      "IDR",
      "Beban operasional & umum",
    ]);
    rows.push([
      t("accounting:reports.net_income", "Laba Bersih"),
      incomeStatement.netProfit,
      "IDR",
      "Laba/Rugi bersih periode berjalan",
    ]);
    rows.push(["", "", "", ""]);

    // Seksi 2: Tren Bulanan Pendapatan, Beban, & Arus Kas
    rows.push([
      t("dashboard:export.col_month", "Bulan / Periode"),
      t("dashboard:export.col_revenue", "Pendapatan"),
      t("dashboard:export.col_expense", "Beban Langsung"),
      t("dashboard:export.col_net_cash", "Arus Kas Bersih"),
    ]);
    for (const pt of monthlySeries) {
      rows.push([pt.label, pt.revenue, pt.expense, pt.netCash]);
    }
    rows.push(["", "", "", ""]);

    // Seksi 3: Ringkasan Realisasi Penagihan Proyek
    rows.push([
      t("dashboard:export.col_project_code", "Kode Proyek"),
      t("dashboard:export.col_project_name", "Nama Proyek"),
      t("dashboard:export.col_contract_val", "Nilai Kontrak"),
      `${t("dashboard:export.col_billed_val", "Tertagih")} (${t("dashboard:export.col_progress_pct", "Progres %")})`,
    ]);
    for (const p of projectBillingStats) {
      rows.push([p.code, p.name, p.contract, `${formatRupiah(p.billed)} (${p.pct}%)`]);
    }
    rows.push(["", "", "", ""]);

    // Seksi 4: 5 Transaksi Jurnal Terakhir
    rows.push([
      t("dashboard:charts.col_date", "Tanggal"),
      t("dashboard:charts.col_journal_no", "No. Jurnal"),
      t("dashboard:charts.col_desc", "Keterangan"),
      t("dashboard:charts.col_amount", "Nominal (IDR)"),
    ]);
    for (const j of recentJournals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
      const desc = getLocalizedTransactionDescription(j.description, language);
      rows.push([
        formatDateI18n(j.journal_date, language),
        j.journal_number,
        desc,
        totalDebit,
      ]);
    }

    await downloadExcelSheet({
      fileName: t("dashboard:export.excel_filename"),
      sheetName: t("dashboard:export.excel_sheet"),
      columns: [
        { header: t("dashboard:export.col_indicator", "Indikator / Kategori"), width: 35 },
        { header: t("dashboard:export.col_value", "Nilai (IDR)"), width: 22 },
        { header: t("dashboard:export.col_unit", "Satuan / Keterangan"), width: 18 },
        { header: t("dashboard:export.col_details", "Rincian"), width: 40 },
      ],
      rows,
    });
    await recordExportLog("DASHBOARD_EXECUTIVE_SUMMARY", "EXCEL", periodFilter);
    toast.success(t("dashboard:export.toast_excel_success"));
  }

  async function handleBackupExportPdf() {
    const comp = await getCompanyProfile();

    function makeAsciiBar(pct: number, _width = 6): string {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      return `${clamped}%`;
    }

    const trendRows: string[][] = monthlySeries.map((m) => {
      const marginPct = m.revenue > 0 ? Math.round(((m.revenue - m.expense) / m.revenue) * 100) : 0;
      return [
        m.label,
        formatRupiah(m.revenue),
        formatRupiah(m.expense),
        formatRupiah(m.netCash),
        `${m.txCount} trx`,
        makeAsciiBar(marginPct, 6),
      ];
    });

    const revTotal = Math.max(0, incomeStatement.totalRevenue);
    const directExpPct = revTotal > 0 ? Math.round((incomeStatement.totalDirectExpense / revTotal) * 100) : 0;
    const sharedExpPct = revTotal > 0 ? Math.round((incomeStatement.totalSharedExpense / revTotal) * 100) : 0;
    const netProfitPct = revTotal > 0 ? Math.round((incomeStatement.netProfit / revTotal) * 100) : 0;
    const opInflow = Math.max(0, cashPosition.operatingInflow);
    const opOutflowPct = opInflow > 0 ? Math.round((cashPosition.operatingOutflow / opInflow) * 100) : 0;

    const compositionRows: string[][] = [
      [t("dashboard:charts.revenue", "Pendapatan Usaha"), formatRupiah(incomeStatement.totalRevenue), "100%", makeAsciiBar(100, 6)],
      [t("dashboard:charts.direct_expense", "Beban Langsung Proyek"), formatRupiah(incomeStatement.totalDirectExpense), `${directExpPct}%`, makeAsciiBar(directExpPct, 6)],
      [t("dashboard:charts.shared_expense", "Beban Bersama & Operasional"), formatRupiah(incomeStatement.totalSharedExpense), `${sharedExpPct}%`, makeAsciiBar(sharedExpPct, 6)],
      ["Laba Bersih Berjalan", formatRupiah(incomeStatement.netProfit), `${netProfitPct}%`, makeAsciiBar(netProfitPct, 6)],
      [t("dashboard:charts.operating_inflow", "Kas Masuk Operasional"), formatRupiah(cashPosition.operatingInflow), "100%", makeAsciiBar(100, 6)],
      [t("dashboard:charts.operating_outflow", "Kas Keluar Operasional"), formatRupiah(cashPosition.operatingOutflow), `${opOutflowPct}%`, makeAsciiBar(opOutflowPct, 6)],
      [t("dashboard:charts.investing_financing", "Arus Kas Investasi & Pendanaan"), formatRupiah(cashPosition.netInvesting + cashPosition.netFinancing), "-", "-"],
    ];

    const projectRows: string[][] = (projects.length > 0 ? projects : []).map((p) => {
      const prjInvoices = invoices.filter((i) => i.project_id === p.id && i.doc_status === "issued");
      const billed = prjInvoices.reduce((s, i) => s + i.total_amount, 0);
      const pct = p.contract_value > 0 ? Math.min(100, Math.round((billed / p.contract_value) * 100)) : 0;
      return [
        p.code,
        p.name,
        formatRupiah(p.contract_value),
        formatRupiah(billed),
        makeAsciiBar(pct, 6),
      ];
    });

    const cashBankAccounts = accounts.filter(
      (a) => a.is_active && (a.system_tag === "cash_bank" || (a.account_type === "asset" && a.code.startsWith("1-11"))),
    );
    const cashAccountRows: string[][] = cashBankAccounts.map((a) => {
      const bal = filteredLines
        .filter((l) => l.account_id === a.id)
        .reduce((sum, l) => sum + (l.debit - l.credit), 0);
      return [
        a.code,
        a.name,
        formatRupiah(bal),
        bal >= 0 ? "Normal (Aktif)" : "Defisit",
      ];
    });

    const sections = [
      {
        title: "1. TREN KINERJA KEUANGAN & ARUS KAS BULANAN",
        subtitle: `Periode data: ${periodFilter === "all" ? t("dashboard:filter.all_periods", "Semua Periode") : periodFilter}`,
        tableColumns: [
          { header: t("dashboard:export.col_month", "Bulan / Periode"), widthRatio: 0.18, align: "left" as const },
          { header: t("dashboard:export.col_revenue", "Pendapatan"), widthRatio: 0.19, align: "right" as const },
          { header: t("dashboard:export.col_expense", "Beban Operasional"), widthRatio: 0.19, align: "right" as const },
          { header: t("dashboard:export.col_net_cash", "Arus Kas Bersih"), widthRatio: 0.19, align: "right" as const },
          { header: t("dashboard:export.col_tx_count", "Aktivitas"), widthRatio: 0.11, align: "center" as const },
          { header: "Grafik Margin", widthRatio: 0.14, align: "right" as const },
        ],
        tableRows: trendRows,
        summaryRows: [
          { label: t("dashboard:charts.revenue", "Total Pendapatan"), value: formatRupiah(incomeStatement.totalRevenue) },
          { label: "Total Realisasi Beban", value: formatRupiah(totalExpense) },
          { label: "Laba Bersih Akumulatif", value: formatRupiah(incomeStatement.netProfit) },
          { label: t("dashboard.kpi.ending_cash", "Kas & Bank Terkini"), value: formatRupiah(cashPosition.endingCash) },
        ],
      },
      {
        title: "2. KOMPOSISI FINANSIAL LABA RUGI & ARUS KAS",
        subtitle: "Rincian proporsi pendapatan, beban langsung, beban bersama, dan likuiditas operasional",
        tableColumns: [
          { header: "Pos Finansial / Indikator", widthRatio: 0.35, align: "left" as const },
          { header: "Nilai Nominal (IDR)", widthRatio: 0.25, align: "right" as const },
          { header: "Porsi", widthRatio: 0.15, align: "center" as const },
          { header: "Grafik Distribusi", widthRatio: 0.25, align: "left" as const },
        ],
        tableRows: compositionRows,
      },
      {
        title: "3. STATUS REALISASI & PENAGIHAN KONTRAK PROYEK",
        subtitle: "Realisasi penerbitan invoice penagihan dibandingkan komitmen kontrak per proyek",
        badge: `${projects.length} Proyek`,
        badgeLabel: "Total Proyek",
        tableColumns: [
          { header: t("dashboard:export.col_project_code", "Kode Proyek"), widthRatio: 0.18, align: "left" as const },
          { header: t("dashboard:export.col_project_name", "Nama Proyek"), widthRatio: 0.32, align: "left" as const },
          { header: t("dashboard:export.col_contract_val", "Nilai Kontrak"), widthRatio: 0.20, align: "right" as const },
          { header: t("dashboard:export.col_billed_val", "Tertagih"), widthRatio: 0.18, align: "right" as const },
          { header: "Grafik Termin", widthRatio: 0.12, align: "center" as const },
        ],
        tableRows: projectRows.length > 0 ? projectRows : [["-", "Tidak ada proyek aktif", "Rp0", "Rp0", "0%"]],
        summaryRows: [
          { label: "Total Komitmen Kontrak", value: formatRupiah(totalContract) },
          { label: "Total Tertagih", value: formatRupiah(totalInvoiced) },
          { label: "Sisa Belum Tertagih", value: formatRupiah(outstandingReceivable) },
        ],
      },
      {
        title: "4. POSISI KAS & LIKUIDITAS REKENING BANK",
        subtitle: "Rincian saldo berjalan pada seluruh rekening kas dan bank operasional perusahaan",
        badge: formatRupiah(cashPosition.endingCash),
        tableColumns: [
          { header: "Kode Akun", widthRatio: 0.18, align: "left" as const },
          { header: "Nama Rekening Kas / Bank", widthRatio: 0.44, align: "left" as const },
          { header: "Saldo Terkini", widthRatio: 0.23, align: "right" as const },
          { header: "Status", widthRatio: 0.15, align: "center" as const },
        ],
        tableRows: cashAccountRows.length > 0 ? cashAccountRows : [["1-1100", "Kas Utama", formatRupiah(cashPosition.endingCash), "Normal"]],
        summaryRows: [
          { label: "Total Saldo Kas & Bank", value: formatRupiah(cashPosition.endingCash) },
        ],
      },
      {
        title: "5. CATATAN 5 TRANSAKSI JURNAL TERAKHIR",
        subtitle: t("dashboard:charts.recent_5_tx_subtitle", "Catatan transaksi jurnal terposting paling mutakhir"),
        tableColumns: [
          { header: t("dashboard:charts.col_date", "Tanggal"), widthRatio: 0.14, align: "center" as const },
          { header: t("dashboard:charts.col_journal_no", "No. Jurnal"), widthRatio: 0.18, align: "center" as const },
          { header: t("dashboard:charts.col_desc", "Keterangan"), widthRatio: 0.36, align: "left" as const },
          { header: t("dashboard:charts.col_main_account", "Akun Utama"), widthRatio: 0.18, align: "left" as const },
          { header: t("dashboard:charts.col_amount", "Nominal"), widthRatio: 0.14, align: "right" as const },
        ],
        tableRows: recentJournals.map((j) => {
          const jLines = lines.filter((l) => l.journal_id === j.id);
          const firstLine = jLines[0];
          const mainAcc = firstLine ? accMap.get(firstLine.account_id) : null;
          const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
          const desc = getLocalizedTransactionDescription(j.description, language);
          return [
            formatDateI18n(j.journal_date, language),
            j.journal_number,
            desc,
            mainAcc ? `${mainAcc.code} - ${mainAcc.name}` : "-",
            formatRupiah(totalDebit),
          ];
        }),
      },
    ];

    const chartAttachments = await renderDashboardChartsToPng({
      monthlySeries,
      incomeStatement,
      agingBuckets,
      totalReceivable: outstandingReceivable,
      language,
    });

    const bytes = await generateDocumentPdf({
      orientation: "landscape",
      docTitle: t("dashboard:export.pdf_title"),
      docSubtitle: t("dashboard:export.pdf_subtitle", {
        period:
          periodFilter === "all"
            ? t("dashboard:filter.all_periods", "Semua Periode")
            : periodFilter,
      }),
      docNumber: `DSB/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        {
          label: t("dashboard.kpi.ending_cash", "Kas & Bank Terkini"),
          value: formatRupiah(cashPosition.endingCash),
        },
        {
          label: t("dashboard.kpi.outstanding_receivables", "Piutang Belum Tertagih"),
          value: formatRupiah(outstandingReceivable),
        },
        {
          label: t("dashboard.kpi.contract_commitments", "Komitmen Kontrak"),
          value: formatRupiah(totalContract),
        },
        {
          label: t("dashboard.kpi.pending_approvals", "Antrean Pembayaran"),
          value: `${pendingApprovals + readyDisbursements} ${t("dashboard.kpi.submissions", "Pengajuan")}`,
        },
      ],
      sections,
      chartAttachments,
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, t("dashboard:export.excel_filename").replace(".xlsx", ".pdf"));
    await recordExportLog("DASHBOARD_EXECUTIVE_SUMMARY", "PDF", periodFilter);
    toast.success(t("dashboard:export.toast_pdf_success"));
  }

  async function handleBackupExportCsv() {
    const rows: Array<Array<string | number>> = [];
    rows.push([
      t("dashboard.kpi.ending_cash", "Kas & Bank Terkini"),
      cashPosition.endingCash,
      "IDR",
      "Ending Cash",
    ]);
    rows.push([
      t("dashboard.kpi.outstanding_receivables", "Piutang Belum Tertagih"),
      outstandingReceivable,
      "IDR",
      "Outstanding Receivables",
    ]);
    rows.push([
      t("dashboard.kpi.contract_commitments", "Komitmen Kontrak"),
      totalContract,
      "IDR",
      "Contract Commitments",
    ]);
    rows.push([
      t("dashboard.kpi.pending_approvals", "Antrean Pembayaran"),
      pendingApprovals + readyDisbursements,
      "Submissions",
      "Pending Approvals",
    ]);
    rows.push([
      t("dashboard:charts.revenue", "Total Pendapatan"),
      incomeStatement.totalRevenue,
      "IDR",
      "Total Revenue",
    ]);
    rows.push([
      t("dashboard:charts.direct_expense", "Beban Langsung"),
      incomeStatement.totalDirectExpense,
      "IDR",
      "Direct Expense",
    ]);
    rows.push([
      t("dashboard:charts.shared_expense", "Beban Bersama"),
      incomeStatement.totalSharedExpense,
      "IDR",
      "Shared Expense",
    ]);
    rows.push([
      t("accounting:reports.net_income", "Laba Bersih"),
      incomeStatement.netProfit,
      "IDR",
      "Net Profit",
    ]);

    for (const pt of monthlySeries) {
      rows.push([pt.label, pt.revenue, pt.expense, `Net Cash: ${pt.netCash}`]);
    }
    for (const p of projectBillingStats) {
      rows.push([p.code, p.name, p.contract, `Billed: ${p.billed} (${p.pct}%)`]);
    }
    for (const j of recentJournals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
      const desc = getLocalizedTransactionDescription(j.description, language);
      rows.push([
        "5 Transaksi Terakhir",
        totalDebit,
        j.journal_number,
        `${formatDateI18n(j.journal_date, language)} - ${desc}`,
      ]);
    }

    downloadCsvFile(
      t("dashboard:export.excel_filename").replace(".xlsx", ".csv"),
      [
        t("dashboard:export.col_indicator", "Indikator / Kategori"),
        t("dashboard:export.col_value", "Nilai (IDR)"),
        t("dashboard:export.col_unit", "Satuan / Keterangan"),
        t("dashboard:export.col_details", "Rincian"),
      ],
      rows,
    );
    await recordExportLog("DASHBOARD_EXECUTIVE_SUMMARY", "CSV", periodFilter);
    toast.success(t("dashboard:export.toast_csv_success"));
  }

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
              onExportExcel={handleBackupExport}
              onExportPdf={handleBackupExportPdf}
              onExportCsv={handleBackupExportCsv}
            />
          </div>
        }
      />

      {/* A2: Baris 1, Empat Kartu KPI Utama (Flexbox Modern + Mobile Anti-Long Scroll Carousel) */}
      <div className="flexbox-kpi-grid mobile-kpi-carousel sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Kas & Bank */}
        <KpiCard
          label={t("dashboard.kpi.ending_cash", "Kas & Bank Terkini")}
          value={cashPosition.endingCash}
          formatter={formatRupiah}
          subtext={
            openPeriods > 0
              ? `${openPeriods} ${t("dashboard.kpi.open_periods", "periode buku aktif terbuka")}`
              : t("dashboard.kpi.all_periods_closed", "Seluruh periode buku ditutup")
          }
          icon={WalletIcon}
          iconTone="bg-primary/10 text-primary dark:text-cyan-400 border-primary/20"
          to="/admin/akuntansi/laporan"
          sparklineData={cashSparkline}
          changePercent={cashChangePct}
          changeLabel={t("dashboard:charts.vs_prev_period", "vs periode lalu")}
        />

        {/* KPI 2: Antrean Pembayaran */}
        <KpiCard
          label={t("dashboard.kpi.pending_approvals", "Antrean Pembayaran")}
          value={pendingApprovals + readyDisbursements}
          suffix={` ${t("dashboard.kpi.submissions", "Pengajuan")}`}
          subtext={
            readyDisbursements > 0
              ? `${readyDisbursements} ${t("dashboard.kpi.ready_disbursements", "siap dicairkan ke rekening")}`
              : pendingApprovals > 0
                ? `${pendingApprovals} ${t("dashboard.kpi.awaiting_verification", "menunggu verifikasi Anda")}`
                : t("dashboard.kpi.all_processed", "Semua pengajuan telah diproses")
          }
          icon={ClockIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          to="/admin/persetujuan"
          invertChangeTone
          sparklineData={[readyDisbursements, pendingApprovals]}
          changePercent={null}
        />

        {/* KPI 3: Piutang Belum Tertagih */}
        <KpiCard
          label={t("dashboard.kpi.outstanding_receivables", "Piutang Belum Tertagih")}
          value={outstandingReceivable}
          formatter={formatRupiah}
          subtext={
            unpaidInvoiceCount > 0
              ? `${unpaidInvoiceCount} ${t("dashboard.kpi.invoices_awaiting_payment", "invoice menunggu pelunasan")}`
              : pendingClientPos > 0
                ? `${pendingClientPos} ${t("dashboard.kpi.client_pos_need_verification", "PO klien perlu verifikasi")}`
                : t("dashboard.kpi.all_receivables_managed", "Seluruh tagihan klien terkelola")
          }
          icon={ReceiptTextIcon}
          iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
          to="/admin/penagihan"
          invertChangeTone
          sparklineData={agingBuckets.map((b) => b.amount)}
          changePercent={null}
        />

        {/* KPI 4: Komitmen Kontrak */}
        <KpiCard
          label={t("dashboard.kpi.contract_commitments", "Komitmen Kontrak")}
          value={totalContract}
          formatter={formatRupiah}
          subtext={`${t("dashboard.kpi.accumulated_from", "Akumulasi dari")} ${projects.length} ${t("dashboard.kpi.client_projects", "proyek klien")}`}
          icon={CheckCircle2Icon}
          iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          to="/admin/proyek"
          sparklineData={projects.length > 1 ? projects.map((p) => p.contract_value) : [0, totalContract]}
          changePercent={null}
        />
      </div>

      {/* A3: Baris 2, Tren Bulanan (2/3) & Komposisi Keuangan (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grafik 1: Tren Pendapatan, Beban, & Arus Kas Bulanan */}
        <ChartCard
          className="lg:col-span-2"
          title={t("dashboard.charts.trends_title", "Tren Pendapatan, Beban, & Arus Kas")}
          subtitle={t(
            "dashboard.charts.trends_subtitle",
            "Perbandingan pergerakan keuangan bulanan berdasarkan jurnal terposting.",
          )}
          controls={
            <ChartTypeSwitcher
              value={(trendChartType as string) === "bar" ? "column" : trendChartType}
              onChange={(val) => setTrendChartType((val as string) === "bar" ? "column" : val)}
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
          }
          legend={
            <ChartLegendRow
              series={[
                {
                  key: "revenue",
                  label: t("dashboard:charts.revenue", "Pendapatan"),
                  color: "#10b981",
                },
                {
                  key: "expense",
                  label: t("dashboard:charts.expense", "Beban"),
                  color: "#f59e0b",
                },
                {
                  key: "netCash",
                  label: t("dashboard:charts.net_cash", "Kas Bersih"),
                  color: "#0B43C8",
                },
              ]}
              hiddenKeys={hiddenTrendSeries}
              onToggleSeries={toggleTrendSeries}
            />
          }
          footer={
            <ChartSummaryFooter
              items={[
                {
                  label: t("dashboard:charts.total_revenue", "Total Pendapatan"),
                  value: formatRupiah(incomeStatement.totalRevenue),
                  valueClass: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: t("dashboard:charts.total_expense", "Total Beban"),
                  value: formatRupiah(totalExpense),
                  valueClass: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: t("dashboard:charts.net_profit_loss", "Laba / Rugi Bersih"),
                  value: (
                    <span className="inline-flex items-center gap-1">
                      {incomeStatement.netProfit >= 0 ? (
                        <TrendingUpIcon className="size-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <TrendingDownIcon className="size-3.5 text-rose-500 shrink-0" />
                      )}
                      {formatRupiah(incomeStatement.netProfit)}
                    </span>
                  ),
                  valueClass:
                    incomeStatement.netProfit >= 0
                      ? "text-foreground"
                      : "text-destructive",
                },
              ]}
            />
          }
        >
          <MultiSeriesChart
            chartType={(trendChartType as string) === "bar" ? "column" : trendChartType}
            data={monthlyChartData}
            series={[
              {
                key: "revenue",
                label: t("dashboard:charts.revenue", "Pendapatan"),
                color: "#10b981",
                textClass: "text-emerald-600 dark:text-emerald-400",
              },
              {
                key: "expense",
                label: t("dashboard:charts.expense", "Beban"),
                color: "#f59e0b",
                textClass: "text-amber-600 dark:text-amber-400",
              },
              {
                key: "netCash",
                label: t("dashboard:charts.net_cash", "Kas Bersih"),
                color: "#0B43C8",
                textClass: "text-primary dark:text-sky-400",
              },
            ]}
            hiddenKeys={hiddenTrendSeries}
            formatValue={formatRupiah}
            formatShortValue={formatCompactRupiah}
            emptyTitle={t("dashboard:charts.empty_trends_title", "Belum Ada Data Jurnal Terposting")}
            emptySubtitle={t(
              "dashboard:charts.empty_trends_desc",
              "Grafik tren bulanan otomatis muncul setelah transaksi pendapatan, beban, atau kas dicatat di buku jurnal.",
            )}
          />
        </ChartCard>

        {/* Grafik 2: Komposisi Keuangan (Pie 3D & Batang Horizontal Terintegrasi) */}
        <ChartCard
          title={t("dashboard.charts.composition_title", "Komposisi Keuangan")}
          subtitle={t(
            "dashboard.charts.composition_subtitle",
            "Proporsi struktur keuangan dan likuiditas kas.",
          )}
          controls={
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setDonutMode("profit")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  donutMode === "profit"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("dashboard:charts.tab_profit_loss", "Laba Rugi")}
              </button>
              <button
                type="button"
                onClick={() => setDonutMode("cash")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  donutMode === "cash"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("dashboard:charts.tab_cash_flow", "Arus Kas")}
              </button>
            </div>
          }
          footer={
            <ChartValueFooter
              label={
                donutMode === "profit"
                  ? t("dashboard:charts.center_net_profit", "Laba Bersih")
                  : t("dashboard:charts.center_cash_balance", "Saldo Kas")
              }
              value={formatRupiah(
                donutMode === "profit"
                  ? incomeStatement.netProfit
                  : cashPosition.endingCash,
              )}
              trend={
                (donutMode === "profit" ? incomeStatement.netProfit : cashPosition.endingCash) >= 0
                  ? "up"
                  : "down"
              }
            />
          }
        >
          <CompositionChart
            chartType="pie3d"
            slices={donutSegments}
            centerLabel={
              donutMode === "profit"
                ? t("dashboard:charts.center_net_profit", "Laba Bersih")
                : t("dashboard:charts.center_cash_balance", "Saldo Kas")
            }
            centerValue={formatCompactRupiah(
              donutMode === "profit"
                ? incomeStatement.netProfit
                : cashPosition.endingCash,
            )}
            formatValue={formatRupiah}
            emptyTitle={t("dashboard:charts.empty_composition_title", "Belum Ada Komposisi Keuangan")}
            emptySubtitle={t(
              "dashboard:charts.empty_composition_desc",
              "Grafik proporsi otomatis terisi setelah transaksi dibukukan.",
            )}
          />
        </ChartCard>
      </div>

      {/* A4: Baris 3, Dua Kartu Sejajar: Frekuensi Transaksi & Realisasi Penagihan */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Kartu 1: Frekuensi Transaksi (B2) */}
        <ChartCard
          title={t("dashboard:charts.tx_frequency_title", "Frekuensi Transaksi")}
          subtitle={t(
            "dashboard:charts.tx_frequency_subtitle",
            "Jumlah jurnal terposting per bulan kalender.",
          )}
          controls={
            <ChartTypeSwitcher
              value={txFreqMode}
              onChange={(val) => setTxFreqMode(val as "area" | "histogram")}
              options={[
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
                  icon: BarChart3Icon,
                },
              ]}
            />
          }
          footer={
            txFreqMode === "histogram" ? (
              <ChartSummaryFooter
                items={[
                  {
                    label: t("dashboard:charts.sample_count", "Jumlah Sampel"),
                    value: `${journalHistogram.totalCount} ${t("dashboard:charts.unit_journals", "Jurnal")}`,
                  },
                  {
                    label: t("dashboard:charts.average_amount", "Rata-Rata"),
                    value: formatRupiah(journalHistogram.average),
                  },
                  {
                    label: t("dashboard:charts.median_amount", "Median"),
                    value: formatRupiah(journalHistogram.median),
                  },
                ]}
              />
            ) : (
              <ChartSummaryFooter
                items={[
                  {
                    label: t("dashboard:charts.total_tx", "Total Transaksi"),
                    value: `${totalTxCount} ${t("dashboard:charts.tx_unit", "Jurnal")}`,
                  },
                  {
                    label: t("dashboard:charts.avg_monthly_tx", "Rata-Rata / Bulan"),
                    value: `${avgTxPerMonth} ${t("dashboard:charts.tx_unit", "Jurnal")}`,
                    valueClass: "text-primary dark:text-cyan-400",
                  },
                ]}
              />
            )
          }
        >
          {txFreqMode === "histogram" ? (
            <HistogramChart
              bins={journalHistogram.bins}
              average={journalHistogram.average}
              median={journalHistogram.median}
              totalCount={journalHistogram.totalCount}
              unitLabel={t("dashboard:charts.unit_journals", "Jurnal")}
              accentColor="#0B43C8"
              emptyTitle={t("dashboard:charts.empty_trends_title", "Belum Ada Data Jurnal Terposting")}
              emptySubtitle={t("dashboard:charts.empty_trends_desc", "Histogram sebaran nominal muncul otomatis setelah transaksi dicatat.")}
              showFooter={false}
            />
          ) : (
            <MultiSeriesChart
              chartType="area"
              data={txFreqChartData}
              series={[
                {
                  key: "count",
                  label: t("dashboard:charts.tx_unit", "Jurnal"),
                  color: "#0B43C8",
                  textClass: "text-primary dark:text-sky-400",
                },
              ]}
              formatValue={(v) => `${v} ${t("dashboard:charts.tx_unit", "Jurnal")}`}
              formatShortValue={(v) => `${v}`}
              emptyTitle={t("dashboard:charts.empty_trends_title", "Belum Ada Transaksi")}
              emptySubtitle={t("dashboard:charts.empty_trends_desc", "Visualisasi frekuensi transaksi akan muncul otomatis setelah jurnal dibukukan.")}
            />
          )}
        </ChartCard>

        {/* Kartu 3: Penagihan & Umur Piutang */}
        <ChartCard
          title={t("dashboard:charts.billing_title", "Realisasi Penagihan & Piutang")}
          subtitle={t(
            "dashboard:charts.billing_subtitle",
            "Perbandingan nilai kontrak terhadap invoice terbit serta sebaran jatuh tempo.",
          )}
          controls={
            <Link
              to="/admin/penagihan"
              className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline shrink-0"
            >
              {t("dashboard:charts.link_manage_invoices", "Kelola Tagihan")}
            </Link>
          }
          footer={
            <ChartSummaryFooter
              items={agingBuckets.map((b) => ({
                tooltip: `${b.label}: ${formatCompactRupiah(b.amount)}`,
                label: (
                  <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap min-w-0">
                    <span className={cn("size-2 rounded-full shrink-0", b.dotColor)} />
                    <TruncatedTooltipText
                      as="span"
                      tooltipText={b.label}
                      className="text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap truncate min-w-0 block"
                    >
                      {b.label}
                    </TruncatedTooltipText>
                  </div>
                ),
                value: formatCompactRupiah(b.amount),
                valueClass: b.amount > 0 ? "text-foreground" : "text-muted-foreground",
              }))}
            />
          }
        >
          <div className="flex flex-col justify-center flex-1 space-y-5 py-2">
            {projectBillingStats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                {t("dashboard:charts.empty_projects_billing", "Belum ada proyek klien aktif untuk dianalisis.")}
              </p>
            ) : (
              <div className="space-y-3">
                {projectBillingStats.map((pb) => (
                  <div key={pb.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <Link
                        to={`/admin/proyek/${pb.id}`}
                        className="font-semibold text-foreground hover:text-primary min-w-0 flex-1"
                      >
                        <TruncatedTooltipText
                          as="span"
                          tooltipText={`${pb.code} \u2014 ${pb.name}`}
                        >
                          {pb.code} &mdash; {pb.name}
                        </TruncatedTooltipText>
                      </Link>
                      <span className="text-muted-foreground shrink-0 tabular-nums text-[11px]">
                        {formatCompactRupiah(pb.billed)} / {formatCompactRupiah(pb.contract)} ({pb.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-none bg-muted/60 overflow-hidden">
                      <div
                        style={{ width: `${pb.pct}%` }}
                        className="h-full rounded-none bg-primary transition-all duration-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress Bar Umur Piutang */}
            <div className="pt-3 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {t("dashboard:charts.aging_title", "Sebaran Umur Piutang")}
                </span>
                <span className="text-muted-foreground tabular-nums text-[11px]">
                  Total: {formatRupiah(outstandingReceivable)}
                </span>
              </div>
              <div className="flex h-2 w-full rounded-none bg-muted/50 overflow-hidden gap-0.5">
                {outstandingReceivable > 0
                  ? agingBuckets.map((b) =>
                      b.amount > 0 ? (
                        <ActionTooltip
                          key={b.label}
                          content={`${b.label}: ${formatRupiah(b.amount)}`}
                          side="top"
                        >
                          <div
                            style={{
                              width: `${Math.max(4, (b.amount / outstandingReceivable) * 100)}%`,
                            }}
                            className={cn("h-full rounded-none", b.color)}
                          />
                        </ActionTooltip>
                      ) : null,
                    )
                  : null}
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* A5: Baris 4, 5 Transaksi Terakhir (Lebar Penuh) */}
      <ChartCard
        title={t("dashboard:charts.recent_5_tx_title", "5 Transaksi Terakhir")}
        subtitle={t(
          "dashboard:charts.recent_5_tx_subtitle",
          "Catatan transaksi jurnal terposting paling mutakhir.",
        )}
        footer={
          <div className="flex items-center justify-end px-6 py-3 border-t border-border/70 bg-muted/10">
            <Link
              to="/admin/akuntansi?tab=jurnal"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
            >
              <span>{t("dashboard:charts.view_all_journals", "Lihat Semua Jurnal")}</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        }
        contentClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 text-center font-semibold text-xs whitespace-nowrap">
                {t("dashboard:charts.col_date", "Tanggal")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold text-xs whitespace-nowrap">
                {t("dashboard:charts.col_journal_no", "No. Jurnal")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold text-xs min-w-[220px]">
                {t("dashboard:charts.col_desc", "Keterangan")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold text-xs whitespace-nowrap">
                {t("dashboard:charts.col_main_account", "Akun Utama")}
              </TableHead>
              <TableHead className="pl-3 pr-6 text-center font-semibold text-xs whitespace-nowrap">
                {t("dashboard:charts.col_amount", "Nominal")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentJournals.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <ScaleIcon className="size-8 text-muted-foreground/60 mb-2" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("dashboard:charts.empty_tx_title", "Belum Ada Transaksi")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      {t("dashboard:charts.empty_tx_desc", "Transaksi jurnal terposting akan otomatis muncul di sini.")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recentJournals.map((j) => {
                const jLines = lines.filter((l) => l.journal_id === j.id);
                const firstLine = jLines[0];
                const mainAcc = firstLine ? accMap.get(firstLine.account_id) : null;
                const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
                const desc = getLocalizedTransactionDescription(j.description, language);

                return (
                  <TableRow key={j.id}>
                    <TableCell className="pl-6 pr-3 text-center align-top whitespace-nowrap tabular-nums text-xs sm:text-sm leading-5">
                      {formatDateI18n(j.journal_date, language)}
                    </TableCell>
                    <TableCell className="px-3 text-center align-top whitespace-nowrap font-mono text-xs sm:text-sm font-semibold leading-5 text-foreground">
                      {j.journal_number}
                    </TableCell>
                    <TableCell className="px-3 text-left align-top text-xs sm:text-sm leading-5 text-foreground/90 max-w-sm">
                      <TruncatedTooltipText as="p" tooltipText={desc}>
                        {desc}
                      </TruncatedTooltipText>
                    </TableCell>
                    <TableCell className="px-3 text-left align-top text-xs sm:text-sm leading-5 text-muted-foreground whitespace-nowrap">
                      {mainAcc ? (
                        <span>
                          <span className="font-mono text-foreground/75 font-semibold">{mainAcc.code}</span>
                          {" \u2014 "}
                          {getLocalizedAccountName(mainAcc, language)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="pl-3 pr-6 text-right align-top whitespace-nowrap text-xs sm:text-sm leading-5">
                      <MonetaryCell amount={totalDebit} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}
