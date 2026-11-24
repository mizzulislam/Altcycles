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
  ChartLegendFooter,
  ChartTypeSwitcher,
  CompositionChart,
  HistogramChart,
  MultiSeriesChart,
  type MultiSeriesChartKind,
} from "@/components/shared/dashboard-charts";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import {
  PeriodFilter,
  type DashboardPeriodPreset,
} from "@/components/shared/dashboard-period-filter";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { Spinner } from "@/components/ui/empty";
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
  getProjectWorkspace,
  listJournalsWithLines,
  listPaymentRequests,
  recordExportLog,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
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
        const [accs, pers, prjs, csts, jRes, paRes, ws] = await Promise.all([
          listAccounts(),
          listPeriods(),
          listProjects(),
          listCustomers(),
          listJournalsWithLines(),
          listPaymentRequests(),
          getProjectWorkspace(),
        ]);
        setAccounts(accs);
        setPeriods(pers);
        setProjects(prjs.projects);
        setCustomers(csts);
        setJournals(jRes.journals);
        setLines(jRes.lines);
        setPaymentRequests(paRes.requests);
        setInvoices(ws.invoices);
        setPendingClientPos(
          ws.clientPos.filter((c) => c.status === "pending_verification").length,
        );
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
    if (periodFilter === "all") return journals;
    const now = new Date();
    if (periodFilter === "this_month") {
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return journals.filter((j) => j.journal_date.startsWith(curMonth));
    }
    if (periodFilter === "last_month") {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      return journals.filter((j) => j.journal_date.startsWith(prevMonth));
    }
    if (periodFilter === "this_year") {
      const curYear = String(now.getFullYear());
      return journals.filter((j) => j.journal_date.startsWith(curYear));
    }
    const matchedPeriod = periods.find((p) => p.id === periodFilter);
    if (matchedPeriod) {
      return journals.filter(
        (j) =>
          j.period_id === matchedPeriod.id ||
          (j.journal_date >= matchedPeriod.start_date &&
            j.journal_date <= matchedPeriod.end_date),
      );
    }
    return journals;
  }, [journals, periodFilter, periods]);

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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Spinner />
        <span>{t("dashboard:charts.loading", "Memuat dasbor keuangan & akuntansi...")}</span>
      </div>
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

  // Ekspor Dokumen
  async function handleBackupExport() {
    const rows: Array<Array<string | number>> = [];
    for (const j of journals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      for (const l of jLines) {
        const acc = accMap.get(l.account_id);
        rows.push([
          j.journal_number,
          formatDateI18n(j.journal_date, language),
          j.journal_type,
          j.status,
          acc ? `${acc.code} - ${getLocalizedAccountName(acc, language)}` : "-",
          getLocalizedTransactionDescription(l.description ?? j.description, language),
          l.debit,
          l.credit,
        ]);
      }
    }
    await downloadExcelSheet({
      fileName: t("dashboard:export.excel_filename"),
      sheetName: t("dashboard:export.excel_sheet"),
      columns: [
        { header: t("dashboard:export.col_journal_no"), width: 22 },
        { header: t("dashboard:export.col_date"), width: 14 },
        { header: t("dashboard:export.col_type"), width: 18 },
        { header: t("dashboard:export.col_status"), width: 14 },
        { header: t("dashboard:export.col_account"), width: 32 },
        { header: t("dashboard:export.col_description"), width: 38 },
        { header: t("dashboard:export.col_debit"), width: 18 },
        { header: t("dashboard:export.col_credit"), width: 18 },
      ],
      rows,
    });
    await recordExportLog("FULL_BACKUP_LEDGER", "EXCEL");
    toast.success(t("dashboard:export.toast_excel_success"));
  }

  async function handleBackupExportPdf() {
    const comp = await getCompanyProfile();
    const tableRows: string[][] = [];
    for (const j of journals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      for (const l of jLines) {
        const acc = accMap.get(l.account_id);
        tableRows.push([
          formatDateI18n(j.journal_date, language),
          j.journal_number,
          acc ? `${acc.code} - ${getLocalizedAccountName(acc, language)}` : "-",
          getLocalizedTransactionDescription(l.description ?? j.description, language),
          l.debit > 0 ? formatRupiah(l.debit) : "-",
          l.credit > 0 ? formatRupiah(l.credit) : "-",
        ]);
      }
    }
    const bytes = await generateDocumentPdf({
      orientation: "landscape",
      docTitle: t("dashboard:export.pdf_title"),
      docSubtitle: t("dashboard:export.pdf_subtitle", { count: journals.length }),
      docNumber: `BKP/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: t("dashboard:export.col_date"), widthRatio: 0.12, align: "center" },
        { header: t("dashboard:export.col_journal_no"), widthRatio: 0.18, align: "left" },
        { header: t("dashboard:export.col_account"), widthRatio: 0.26, align: "left" },
        { header: t("dashboard:export.col_description"), widthRatio: 0.24, align: "left" },
        { header: t("dashboard:export.col_debit"), widthRatio: 0.10, align: "right" },
        { header: t("dashboard:export.col_credit"), widthRatio: 0.10, align: "right" },
      ],
      tableRows,
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, t("dashboard:export.excel_filename").replace(".xlsx", ".pdf"));
    await recordExportLog("FULL_BACKUP_LEDGER", "PDF");
  }

  async function handleBackupExportCsv() {
    const rows: Array<Array<string | number>> = [];
    for (const j of journals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      for (const l of jLines) {
        const acc = accMap.get(l.account_id);
        rows.push([
          j.journal_number,
          formatDateI18n(j.journal_date, language),
          j.journal_type,
          j.status,
          acc ? `${acc.code} - ${getLocalizedAccountName(acc, language)}` : "-",
          getLocalizedTransactionDescription(l.description ?? j.description, language),
          l.debit,
          l.credit,
        ]);
      }
    }
    downloadCsvFile(
      t("dashboard:export.excel_filename").replace(".xlsx", ".csv"),
      [
        t("dashboard:export.col_journal_no"),
        t("dashboard:export.col_date"),
        t("dashboard:export.col_type"),
        t("dashboard:export.col_status"),
        t("dashboard:export.col_account"),
        t("dashboard:export.col_description"),
        t("dashboard:export.col_debit"),
        t("dashboard:export.col_credit"),
      ],
      rows,
    );
    await recordExportLog("FULL_BACKUP_LEDGER", "CSV");
    toast.success(t("dashboard:export.toast_csv_success"));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* A1: Header Halaman + Filter Periode Global + Unduh/Ekspor */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("dashboard.title", "Dasbor Keuangan & Akuntansi")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t(
              "dashboard.subtitle",
              "Pantau likuiditas kas, kinerja laba rugi, piutang, dan aktivitas jurnal perusahaan.",
            )}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2.5">
          <PeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            periods={periods}
          />
          <ExportDownloadMenu
            label={t("common:action.export_download", "Unduh / Ekspor")}
            onExportExcel={handleBackupExport}
            onExportPdf={handleBackupExportPdf}
            onExportCsv={handleBackupExportCsv}
          />
        </div>
      </div>

      {/* A2: Baris 1, Empat Kartu KPI Utama (KpiCard) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          footer={
            <ChartLegendFooter
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

          {/* Footer Ringkasan Laba Rugi Edge-to-Edge */}
          <div className="-mx-6 -mb-6 mt-auto border-t border-border/70 bg-muted/10 grid grid-cols-3 divide-x divide-border/60 min-h-[64px]">
            <div className="pl-6 pr-4 py-3.5">
              <p className="text-[11px] text-muted-foreground">
                {t("dashboard:charts.total_revenue", "Total Pendapatan")}
              </p>
              <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                {formatRupiah(incomeStatement.totalRevenue)}
              </p>
            </div>
            <div className="p-3.5">
              <p className="text-[11px] text-muted-foreground">
                {t("dashboard:charts.total_expense", "Total Beban")}
              </p>
              <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                {formatRupiah(totalExpense)}
              </p>
            </div>
            <div className="pl-3.5 pr-6 py-3.5">
              <p className="text-[11px] text-muted-foreground">
                {t("dashboard:charts.net_profit_loss", "Laba / Rugi Bersih")}
              </p>
              <p
                className={cn(
                  "text-xs sm:text-sm font-bold tabular-nums mt-0.5 inline-flex items-center gap-1",
                  incomeStatement.netProfit >= 0
                    ? "text-foreground"
                    : "text-destructive",
                )}
              >
                {incomeStatement.netProfit >= 0 ? (
                  <TrendingUpIcon className="size-3.5 text-emerald-500" />
                ) : (
                  <TrendingDownIcon className="size-3.5 text-rose-500" />
                )}
                {formatRupiah(incomeStatement.netProfit)}
              </p>
            </div>
          </div>
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
            <div className="flex items-center justify-between px-6 py-3 border-t border-border/70 bg-muted/10 text-xs">
              <span className="text-xs font-medium text-muted-foreground">
                {donutMode === "profit"
                  ? t("dashboard:charts.center_net_profit", "Laba Bersih")
                  : t("dashboard:charts.center_cash_balance", "Saldo Kas")}
              </span>
              <span
                className={cn(
                  "text-xs sm:text-sm font-bold tabular-nums inline-flex items-center gap-1.5",
                  (donutMode === "profit" ? incomeStatement.netProfit : cashPosition.endingCash) >= 0
                    ? "text-foreground"
                    : "text-destructive",
                )}
              >
                {(donutMode === "profit" ? incomeStatement.netProfit : cashPosition.endingCash) >= 0 ? (
                  <TrendingUpIcon className="size-3.5 text-emerald-500" />
                ) : (
                  <TrendingDownIcon className="size-3.5 text-rose-500" />
                )}
                {formatRupiah(donutMode === "profit" ? incomeStatement.netProfit : cashPosition.endingCash)}
              </span>
            </div>
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

          <div className="-mx-6 -mb-6 mt-auto border-t border-border/70 bg-muted/10 px-6 py-3.5 flex items-center justify-between text-xs min-h-[64px]">
            <span className="font-medium text-muted-foreground">
              {donutMode === "profit"
                ? t("dashboard:charts.center_net_profit", "Laba Bersih")
                : t("dashboard:charts.center_cash_balance", "Saldo Kas")}
            </span>
            <span className="font-bold tabular-nums text-foreground text-xs sm:text-sm">
              {formatRupiah(
                donutMode === "profit"
                  ? incomeStatement.netProfit
                  : cashPosition.endingCash,
              )}
            </span>
          </div>
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
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setTxFreqMode("area")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  txFreqMode === "area"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("dashboard:charts.types.area", "Area")}
              </button>
              <button
                type="button"
                onClick={() => setTxFreqMode("histogram")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  txFreqMode === "histogram"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("dashboard:charts.types.histogram", "Histogram")}
              </button>
            </div>
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
            />
          ) : (
            <div className="flex flex-col h-full justify-between space-y-4">
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
              <div className="-mx-6 -mb-6 mt-auto border-t border-border/70 bg-muted/10 grid grid-cols-2 divide-x divide-border/60 min-h-[58px] items-center">
                <div className="pl-6 pr-4 py-3">
                  <p className="text-[10px] text-muted-foreground">
                    {t("dashboard:charts.total_tx", "Total Transaksi")}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums mt-0.5">
                    {totalTxCount} {t("dashboard:charts.tx_unit", "Jurnal")}
                  </p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-muted-foreground">
                    {t("dashboard:charts.avg_monthly_tx", "Rata-Rata / Bulan")}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-primary dark:text-cyan-400 tabular-nums mt-0.5">
                    {avgTxPerMonth} {t("dashboard:charts.tx_unit", "Jurnal")}
                  </p>
                </div>
              </div>
            </div>
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
        >
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
                      className="font-semibold text-foreground hover:text-primary truncate"
                      title={pb.name}
                    >
                      {pb.code} &mdash; {pb.name}
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
                      <div
                        key={b.label}
                        style={{
                          width: `${Math.max(4, (b.amount / outstandingReceivable) * 100)}%`,
                        }}
                        className={cn("h-full rounded-none", b.color)}
                        title={`${b.label}: ${formatRupiah(b.amount)}`}
                      />
                    ) : null,
                  )
                : null}
            </div>
          </div>

          {/* Strip Ringkasan Edge-to-Edge 4 Kolom di Bawah Kartu */}
          <div className="-mx-6 -mb-6 mt-auto border-t border-border/70 bg-muted/10 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-border/60 text-xs">
            {agingBuckets.map((b, idx) => (
              <div
                key={b.label}
                className={cn(
                  "py-3",
                  idx === 0 && "pl-6 pr-3",
                  idx > 0 && idx < 3 && "p-3",
                  idx === 3 && "pl-3 pr-6",
                )}
              >
                <div className="flex items-center gap-1.5 text-muted-foreground whitespace-normal leading-tight">
                  <span className={cn("size-2 rounded-none shrink-0", b.dotColor)} />
                  <span className="text-[10px]">{b.label}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums mt-1">
                  {formatCompactRupiah(b.amount)}
                </p>
              </div>
            ))}
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
                      <p className="truncate" title={desc}>
                        {desc}
                      </p>
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
