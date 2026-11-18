import * as React from "react";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart2Icon,
  BarChart3Icon,
  BarChartHorizontalIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClipboardListIcon,
  ClockIcon,
  CoinsIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  PieChartIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  ScaleIcon,
  ShoppingCartIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import {
  buildRupiahHistogramBins,
  ChartCardFooter,
  ChartTypeSwitcher,
  CompositionChart,
  HistogramChart,
  MultiSeriesChart,
  type CompositionChartKind,
  type MultiSeriesChartKind,
} from "@/components/shared/dashboard-charts";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { AnimatedNumber } from "@/components/shared/animated-number";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
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
  listPurchaseOrders,
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
  PurchaseOrderRow,
  SalesInvoiceRow,
} from "@/types/database.types";

interface MonthlyFinancialPoint {
  monthKey: string;
  label: string;
  revenue: number;
  expense: number;
  netCash: number;
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
    { revenue: number; expense: number; netCash: number }
  >();

  for (const j of journals) {
    if (j.status !== "posted") continue;
    const monthKey = j.journal_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;

    const current = buckets.get(monthKey) ?? {
      revenue: 0,
      expense: 0,
      netCash: 0,
    };

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
  const [paymentRequests, setPaymentRequests] = React.useState<
    PaymentRequestRow[]
  >([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<
    PurchaseOrderRow[]
  >([]);
  const [pendingClientPos, setPendingClientPos] = React.useState(0);

  const [trendChartType, setTrendChartType] =
    React.useState<MultiSeriesChartKind>("column");
  const [donutMode, setDonutMode] = React.useState<"profit" | "cash">("profit");
  const [compositionChartType, setCompositionChartType] =
    React.useState<CompositionChartKind>("donut");
  const [billingChartType, setBillingChartType] = React.useState<
    "bar" | "column" | "pie" | "bubble"
  >("bar");
  const [expenseChartType, setExpenseChartType] = React.useState<
    "bar" | "pie" | "histogram"
  >("bar");

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accs, pers, prjs, csts, jRes, paRes, ws, poRes] =
          await Promise.all([
            listAccounts(),
            listPeriods(),
            listProjects(),
            listCustomers(),
            listJournalsWithLines(),
            listPaymentRequests(),
            getProjectWorkspace(),
            listPurchaseOrders(),
          ]);
        setAccounts(accs);
        setPeriods(pers);
        setProjects(prjs.projects);
        setCustomers(csts);
        setJournals(jRes.journals);
        setLines(jRes.lines);
        setPaymentRequests(paRes.requests);
        setInvoices(ws.invoices);
        setPurchaseOrders(poRes.orders);
        setPendingClientPos(
          ws.clientPos.filter((c) => c.status === "pending_verification")
            .length,
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>{t("dashboard:charts.loading")}</span>
      </div>
    );
  }

  const cashPosition = buildCashFlowStatement(accounts, journals, lines);
  const incomeStatement = buildIncomeStatement(accounts, journals, lines);
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

  const activePoCount = purchaseOrders.filter(
    (p) => p.status === "issued" || p.status === "draft",
  ).length;

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
      label: t("dashboard:charts.aging_current"),
      bucketKey: "Belum Jatuh Tempo",
      color: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      amount: arAging
        .filter((a) => a.agingBucket === "Belum Jatuh Tempo")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: t("dashboard:charts.aging_1_30"),
      bucketKey: "1–30 Hari",
      color: "bg-sky-500",
      dotColor: "bg-sky-500",
      amount: arAging
        .filter((a) => a.agingBucket === "1–30 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: t("dashboard:charts.aging_31_60"),
      bucketKey: "31–60 Hari",
      color: "bg-amber-500",
      dotColor: "bg-amber-500",
      amount: arAging
        .filter((a) => a.agingBucket === "31–60 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: t("dashboard:charts.aging_over_60"),
      bucketKey: "> 60 Hari",
      color: "bg-rose-500",
      dotColor: "bg-rose-500",
      amount: arAging
        .filter((a) => a.agingBucket === "> 60 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
  ];

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

  const postedJournalAmounts = journals
    .filter((j) => j.status === "posted" && j.journal_type !== "closing")
    .map((j) =>
      lines
        .filter((l) => l.journal_id === j.id)
        .reduce((s, l) => s + l.debit, 0),
    )
    .filter((amt) => amt > 0);
  const journalHistogram = buildRupiahHistogramBins(postedJournalAmounts);

  const topExpenses = [
    ...incomeStatement.directExpenses,
    ...incomeStatement.sharedExpenses,
  ]
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const maxExpenseItem = Math.max(1, ...(topExpenses.map((e) => e.amount)));

  const projectBillingStats = projects.slice(0, 4).map((p) => {
    const pInvoices = issuedInvoices.filter((i) => i.project_id === p.id);
    const billed = pInvoices.reduce((s, i) => s + i.subtotal_amount, 0);
    const paid = pInvoices.reduce((s, i) => s + i.paid_amount, 0);
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

  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const recentJournals = [...journals]
    .filter((j) => j.status === "posted")
    .sort((a, b) => b.journal_date.localeCompare(a.journal_date))
    .slice(0, 4);

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

  const totalExpense =
    incomeStatement.totalDirectExpense + incomeStatement.totalSharedExpense;
  const donutSegments =
    donutMode === "profit"
      ? [
          {
            label: t("dashboard:charts.revenue"),
            value: Math.max(0, incomeStatement.totalRevenue),
            color: "#10b981",
            dotClass: "bg-emerald-500",
          },
          {
            label: t("dashboard:charts.direct_expense"),
            value: Math.max(0, incomeStatement.totalDirectExpense),
            color: "#f59e0b",
            dotClass: "bg-amber-500",
          },
          {
            label: t("dashboard:charts.shared_expense"),
            value: Math.max(0, incomeStatement.totalSharedExpense),
            color: "#3b82f6",
            dotClass: "bg-blue-500",
          },
        ]
      : [
          {
            label: t("dashboard:charts.operating_inflow"),
            value: Math.max(0, cashPosition.operatingInflow),
            color: "#10b981",
            dotClass: "bg-emerald-500",
          },
          {
            label: t("dashboard:charts.operating_outflow"),
            value: Math.max(0, cashPosition.operatingOutflow),
            color: "#f43f5e",
            dotClass: "bg-rose-500",
          },
          {
            label: t("dashboard:charts.investing_financing"),
            value: Math.abs(
              cashPosition.netInvesting + cashPosition.netFinancing,
            ),
            color: "#3b82f6",
            dotClass: "bg-blue-500",
          },
        ];

  const expensePalette = [
    { color: "#f59e0b", dotClass: "bg-amber-500" },
    { color: "#0B43C8", dotClass: "bg-primary" },
    { color: "#10b981", dotClass: "bg-emerald-500" },
    { color: "#0ea5e9", dotClass: "bg-sky-500" },
    { color: "#8b5cf6", dotClass: "bg-violet-500" },
  ];

  const expenseSlices = topExpenses.map((exp, idx) => {
    const palette = expensePalette[idx % expensePalette.length] ?? {
      color: "#f59e0b",
      dotClass: "bg-amber-500",
    };
    return {
      label: `${exp.code} — ${getLocalizedAccountName({ code: exp.code, name: exp.name }, language)}`,
      value: exp.amount,
      color: palette.color,
      dotClass: palette.dotClass,
    };
  });

  const agingColors = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e"];
  const agingPieSlices = agingBuckets.map((b, idx) => ({
    label: b.label,
    value: b.amount,
    color: agingColors[idx % agingColors.length] ?? "#10b981",
    dotClass: b.dotColor,
  }));

  const quickShortcuts = [
    {
      to: "/admin/persetujuan",
      label: t("dashboard.shortcuts.fund_approval", "Persetujuan Dana"),
      desc: t("dashboard.shortcuts.fund_approval_desc", "Verifikasi & cairkan"),
      icon: HandCoinsIcon,
      tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      badge:
        pendingApprovals + readyDisbursements > 0
          ? `${pendingApprovals + readyDisbursements} ${t("dashboard:shortcuts.badge_queue")}`
          : null,
    },
    {
      to: "/admin/proyek",
      label: t("dashboard.shortcuts.projects_milestones", "Proyek & Termin"),
      desc: t("dashboard.shortcuts.projects_milestones_desc", "SPK, BAKP, & UAT"),
      icon: FolderKanbanIcon,
      tone: "text-primary dark:text-cyan-400 bg-primary/10 border-primary/20",
      badge:
        pendingClientPos > 0 ? `${pendingClientPos} ${t("dashboard:shortcuts.badge_new_po")}` : null,
    },
    {
      to: "/admin/penagihan",
      label: t("dashboard.shortcuts.invoices_receivables", "Invoice & Piutang"),
      desc: t("dashboard.shortcuts.invoices_receivables_desc", "Tagihan & kuitansi"),
      icon: ReceiptTextIcon,
      tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
      badge: unpaidInvoiceCount > 0 ? `${unpaidInvoiceCount} ${t("dashboard:shortcuts.badge_unpaid")}` : null,
    },
    {
      to: "/admin/akuntansi",
      label: t("dashboard.shortcuts.journals_gl", "Jurnal & Buku Besar"),
      desc: t("dashboard.shortcuts.journals_gl_desc", "Catat transaksi keuangan"),
      icon: ScaleIcon,
      tone: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      badge: null,
    },
    {
      to: "/admin/akuntansi/laporan",
      label: t("dashboard.shortcuts.financial_reports", "Laporan Keuangan"),
      desc: t("dashboard.shortcuts.financial_reports_desc", "Laba Rugi & Neraca"),
      icon: BarChart3Icon,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      badge: null,
    },
    {
      to: "/admin/po-internal",
      label: t("dashboard.shortcuts.vendor_po", "PO Vendor"),
      desc: t("dashboard.shortcuts.vendor_po_desc", "Pengadaan internal"),
      icon: ShoppingCartIcon,
      tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      badge: activePoCount > 0 ? `${activePoCount} ${t("dashboard:shortcuts.badge_active")}` : null,
    },
    {
      to: "/admin/anggaran",
      label: t("dashboard.shortcuts.project_budget", "Budgeting Proyek"),
      desc: t("dashboard.shortcuts.project_budget_desc", "Pagu & realisasi"),
      icon: PiggyBankIcon,
      tone: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
      badge: null,
    },
    {
      to: "/admin/bagi-hasil",
      label: t("dashboard.shortcuts.profit_sharing", "Bagi Hasil & Master"),
      desc: t("dashboard.shortcuts.profit_sharing_desc", "Distribusi tim"),
      icon: CoinsIcon,
      tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      badge: null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
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
        <div className="shrink-0">
          <ExportDownloadMenu
            label={t("common:action.export_download", "Unduh / Ekspor")}
            onExportExcel={handleBackupExport}
            onExportPdf={handleBackupExportPdf}
            onExportCsv={handleBackupExportCsv}
          />
        </div>
      </div>

      {/* 4 Kartu KPI Utama (Proper Case + Ikon Semantik) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpi.ending_cash", "Kas & Bank Terkini")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              <AnimatedNumber value={cashPosition.endingCash} formatter={formatRupiah} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {openPeriods > 0
                ? `${openPeriods} ${t("dashboard.kpi.open_periods", "periode buku aktif terbuka")}`
                : t("dashboard.kpi.all_periods_closed", "Seluruh periode buku ditutup")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpi.pending_approvals", "Antrean Pembayaran")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              <AnimatedNumber
                value={pendingApprovals}
                suffix={` ${t("dashboard.kpi.submissions", "Pengajuan")}`}
              />
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {readyDisbursements > 0
                ? `${readyDisbursements} ${t("dashboard.kpi.ready_disbursements", "siap dicairkan ke rekening")}`
                : pendingApprovals > 0
                  ? `${pendingApprovals} ${t("dashboard.kpi.awaiting_verification", "menunggu verifikasi Anda")}`
                  : t("dashboard.kpi.all_processed", "Semua pengajuan telah diproses")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ClockIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpi.outstanding_receivables", "Piutang Belum Tertagih")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              <AnimatedNumber value={outstandingReceivable} formatter={formatRupiah} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {unpaidInvoiceCount > 0
                ? `${unpaidInvoiceCount} ${t("dashboard.kpi.invoices_awaiting_payment", "invoice menunggu pelunasan")}`
                : pendingClientPos > 0
                  ? `${pendingClientPos} ${t("dashboard.kpi.client_pos_need_verification", "PO klien perlu verifikasi")}`
                  : t("dashboard.kpi.all_receivables_managed", "Seluruh tagihan klien terkelola")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <ReceiptTextIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpi.contract_commitments", "Komitmen Kontrak")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              <AnimatedNumber value={totalContract} formatter={formatRupiah} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("dashboard.kpi.accumulated_from", "Akumulasi dari")} {projects.length}{" "}
              {t("dashboard.kpi.client_projects", "proyek klien")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2Icon className="size-5" />
          </div>
        </Card>
      </div>

      {/* Bilah Pintasan Cepat ke Halaman Penting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {t("dashboard.shortcuts.title", "Pintasan Cepat Modul Keuangan")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "dashboard.shortcuts.subtitle",
                "Akses langsung ke menu operasional, penagihan, dan pelaporan utama.",
              )}
            </p>
          </div>
          <Link
            to="/admin/master"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-cyan-400 hover:underline shrink-0"
          >
            <ClipboardListIcon className="size-3.5" />
            <span>
              {t("dashboard.shortcuts.master_link", "Master Vendor & Klien")}
            </span>
            <ArrowRightIcon className="size-3" />
          </Link>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {quickShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-2xs transition-all duration-150 hover:border-primary/50 hover:bg-muted/30"
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {item.desc}
                    </span>
                    {item.badge ? (
                      <span className="shrink-0 rounded-full bg-primary/12 text-primary dark:text-cyan-400 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
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
      </div>

      {/* Baris Grafik Analisis Utama: Tren Bulanan + Komposisi Laba Rugi / Arus Kas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grafik 1: Tren Pendapatan, Beban, & Arus Kas Bulanan */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden lg:col-span-2 flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                {t("dashboard.charts.trends_title", "Tren Pendapatan, Beban, & Arus Kas")}
              </CardTitle>
              <CardDescription>
                {t(
                  "dashboard.charts.trends_subtitle",
                  "Perbandingan pergerakan keuangan bulanan berdasarkan jurnal terposting.",
                )}
              </CardDescription>
            </div>
            {trendChartType !== "bubble" ? (
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-emerald-500" />
                  {t("dashboard:charts.revenue")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-amber-500" />
                  {t("dashboard:charts.expense")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-primary" />
                  {t("dashboard:charts.net_cash")}
                </span>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            <MultiSeriesChart
              chartType={trendChartType}
              data={monthlyChartData}
              series={[
                {
                  key: "revenue",
                  label: t("dashboard:charts.revenue"),
                  color: "#10b981",
                  textClass: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  key: "expense",
                  label: t("dashboard:charts.expense"),
                  color: "#f59e0b",
                  textClass: "text-amber-600 dark:text-amber-400",
                },
                {
                  key: "netCash",
                  label: t("dashboard:charts.net_cash"),
                  color: "#0B43C8",
                  textClass: "text-primary dark:text-sky-400",
                },
              ]}
              formatValue={formatRupiah}
              formatShortValue={formatCompactRupiah}
              bubbleConfig={{
                xKey: "revenue",
                yKey: "expense",
                sizeKey: "netCash",
                xLabel: t("dashboard:charts.revenue"),
                yLabel: t("dashboard:charts.expense"),
                sizeLabel: t("dashboard:charts.net_cash_scale"),
                showBreakEvenLine: true,
              }}
              emptyTitle={t("dashboard:charts.empty_trends_title")}
              emptySubtitle={t("dashboard:charts.empty_trends_desc")}
            />

            {/* Footer Ringkasan Laba Rugi */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {t("dashboard:charts.total_revenue")}
                </p>
                <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {formatRupiah(incomeStatement.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {t("dashboard:charts.total_expense")}
                </p>
                <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                  {formatRupiah(totalExpense)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {t("dashboard:charts.net_profit_loss")}
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
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={trendChartType}
              onChange={setTrendChartType}
              options={[
                { value: "column", label: t("dashboard:charts.types.column"), title: t("dashboard:charts.types.column_title"), icon: BarChart3Icon },
                { value: "bar", label: t("dashboard:charts.types.bar"), title: t("dashboard:charts.types.bar_title"), icon: BarChartHorizontalIcon },
                { value: "line", label: t("dashboard:charts.types.line"), title: t("dashboard:charts.types.line_title"), icon: TrendingUpIcon },
                { value: "area", label: t("dashboard:charts.types.area"), title: t("dashboard:charts.types.area_title"), icon: ActivityIcon },
                { value: "bubble", label: t("dashboard:charts.types.bubble"), title: t("dashboard:charts.types.bubble_title"), icon: CircleDotIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>

        {/* Grafik 2: Komposisi Laba Rugi / Arus Kas (Donut, Pie, Bar) */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                {t("dashboard.charts.composition_title", "Komposisi Keuangan")}
              </CardTitle>
              <CardDescription>
                {t(
                  "dashboard.charts.composition_subtitle",
                  "Proporsi struktur keuangan dan likuiditas kas.",
                )}
              </CardDescription>
            </div>
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
                {t("dashboard:charts.tab_profit_loss")}
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
                {t("dashboard:charts.tab_cash_flow")}
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            <CompositionChart
              chartType={compositionChartType}
              slices={donutSegments}
              centerLabel={donutMode === "profit" ? t("dashboard:charts.center_net_profit") : t("dashboard:charts.center_cash_balance")}
              centerValue={formatCompactRupiah(
                donutMode === "profit"
                  ? incomeStatement.netProfit
                  : cashPosition.endingCash,
              )}
              formatValue={formatRupiah}
              emptyTitle={t("dashboard:charts.empty_composition_title")}
              emptySubtitle={t("dashboard:charts.empty_composition_desc")}
            />
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={compositionChartType}
              onChange={setCompositionChartType}
              options={[
                { value: "donut", label: t("dashboard:charts.types.donut"), icon: CircleDotIcon },
                { value: "pie", label: t("dashboard:charts.types.pie"), icon: PieChartIcon },
                { value: "bar", label: t("dashboard:charts.types.bar"), icon: BarChartHorizontalIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>
      </div>

      {/* Baris Grafik Analisis Kedua: Penagihan & Piutang + Pos Beban & Jurnal Terbaru */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Grafik 3: Progress Penagihan Proyek & Umur Piutang */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                {t("dashboard:charts.billing_title")}
              </CardTitle>
              <CardDescription>
                {t("dashboard:charts.billing_subtitle")}
              </CardDescription>
            </div>
            <Link
              to="/admin/penagihan"
              className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline shrink-0"
            >
              {t("dashboard:charts.link_manage_invoices")}
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            {billingChartType === "pie" ? (
              <CompositionChart
                chartType="pie"
                slices={agingPieSlices}
                formatValue={formatRupiah}
                emptyTitle={t("dashboard:charts.empty_aging_title")}
                emptySubtitle={t("dashboard:charts.empty_aging_desc")}
              />
            ) : billingChartType === "column" || billingChartType === "bubble" ? (
              <div className="space-y-4">
                <MultiSeriesChart
                  chartType={billingChartType}
                  data={projectBillingStats.map((pb) => ({
                    key: pb.id,
                    label: pb.code,
                    values: {
                      contract: pb.contract,
                      billed: pb.billed,
                      paid: pb.paid,
                    },
                  }))}
                  series={[
                    {
                      key: "contract",
                      label: t("dashboard:charts.contract"),
                      color: "#64748b",
                      textClass: "text-muted-foreground",
                    },
                    {
                      key: "billed",
                      label: t("dashboard:charts.billed"),
                      color: "#0B43C8",
                      textClass: "text-primary dark:text-sky-400",
                    },
                    {
                      key: "paid",
                      label: t("dashboard:charts.paid"),
                      color: "#10b981",
                      textClass: "text-emerald-600 dark:text-emerald-400",
                    },
                  ]}
                  formatValue={formatRupiah}
                  formatShortValue={formatCompactRupiah}
                  bubbleConfig={{
                    xKey: "contract",
                    yKey: "billed",
                    sizeKey: "paid",
                    xLabel: t("dashboard:charts.contract"),
                    yLabel: t("dashboard:charts.billed"),
                    sizeLabel: t("dashboard:charts.paid"),
                    showBreakEvenLine: true,
                  }}
                  emptyTitle={t("dashboard:charts.empty_projects_title")}
                  emptySubtitle={t("dashboard:charts.empty_projects_desc")}
                />
                {billingChartType === "column" ? (
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-slate-500" />
                      {t("dashboard:charts.contract")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-primary" />
                      {t("dashboard:charts.billed")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-emerald-500" />
                      {t("dashboard:charts.paid")}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : projectBillingStats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {t("dashboard:charts.empty_projects_billing")}
              </p>
            ) : (
              <div className="space-y-3.5">
                {projectBillingStats.map((pb) => (
                  <div key={pb.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <Link
                        to={`/admin/proyek/${pb.id}`}
                        className="font-semibold text-foreground hover:text-primary truncate"
                        title={pb.name}
                      >
                        {pb.code} &mdash; {pb.name}
                      </Link>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {formatCompactRupiah(pb.billed)} /{" "}
                        {formatCompactRupiah(pb.contract)} ({pb.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        style={{ width: `${pb.pct}%` }}
                        className="h-full rounded-full bg-primary transition-all duration-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {t("dashboard:charts.aging_title")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  Total: {formatRupiah(outstandingReceivable)}
                </span>
              </div>
              <div className="flex h-2.5 w-full rounded-full bg-muted/50 overflow-hidden gap-0.5">
                {outstandingReceivable > 0
                  ? agingBuckets.map((b) =>
                      b.amount > 0 ? (
                        <div
                          key={b.label}
                          style={{
                            width: `${Math.max(4, (b.amount / outstandingReceivable) * 100)}%`,
                          }}
                          className={cn("h-full", b.color)}
                          title={`${b.label}: ${formatRupiah(b.amount)}`}
                        />
                      ) : null,
                    )
                  : null}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {agingBuckets.map((b) => (
                  <div key={b.label} className="text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className={cn("size-2 rounded-full shrink-0", b.dotColor)}
                      />
                      <span className="truncate">{b.label}</span>
                    </div>
                    <p className="font-semibold text-foreground tabular-nums mt-0.5">
                      {formatCompactRupiah(b.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={billingChartType}
              onChange={setBillingChartType}
              options={[
                { value: "bar", label: t("dashboard:charts.types.progress"), icon: BarChartHorizontalIcon },
                { value: "column", label: t("dashboard:charts.types.column"), title: t("dashboard:charts.chart_contract_vs_billed_title"), icon: BarChart3Icon },
                { value: "pie", label: t("dashboard:charts.types.pie_receivables"), title: t("dashboard:charts.chart_ar_aging_title"), icon: PieChartIcon },
                { value: "bubble", label: t("dashboard:charts.types.bubble"), title: t("dashboard:charts.chart_bubble_contract_billed_title"), icon: CircleDotIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>

        {/* Grafik 4: Pos Beban Terbesar, Histogram Transaksi, & Aktivitas Jurnal Terbaru */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                {t("dashboard:charts.top_expenses_title")}
              </CardTitle>
              <CardDescription>
                {expenseChartType === "histogram"
                  ? t("dashboard:charts.chart_histogram_desc")
                  : t("dashboard:charts.top_expenses_subtitle")}
              </CardDescription>
            </div>
            <Link
              to="/admin/akuntansi"
              className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline shrink-0"
            >
              {t("dashboard:charts.link_general_journal")}
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            {expenseChartType === "histogram" ? (
              <HistogramChart
                bins={journalHistogram.bins}
                average={journalHistogram.average}
                median={journalHistogram.median}
                totalCount={journalHistogram.totalCount}
                unitLabel={t("dashboard:charts.unit_journals")}
                accentColor="#0B43C8"
                emptyTitle={t("dashboard:charts.empty_trends_title")}
                emptySubtitle={t("dashboard:charts.empty_trends_desc")}
              />
            ) : expenseChartType === "pie" ? (
              <CompositionChart
                chartType="pie"
                slices={expenseSlices}
                formatValue={formatRupiah}
                emptyTitle={t("dashboard:charts.empty_expenses_title")}
                emptySubtitle={t("dashboard:charts.empty_expenses_pie_desc")}
              />
            ) : topExpenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 py-6 px-4 text-center">
                <p className="text-xs font-medium text-foreground">
                  {t("dashboard:charts.empty_expenses_title")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("dashboard:charts.empty_expenses_desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topExpenses.map((exp) => {
                  const widthPct = Math.max(
                    6,
                    Math.round((exp.amount / maxExpenseItem) * 100),
                  );
                  return (
                    <div key={exp.code} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-foreground truncate">
                          <span className="font-mono text-muted-foreground">
                            {exp.code}
                          </span>{" "}
                          &mdash; {getLocalizedAccountName({ code: exp.code, name: exp.name }, language)}
                        </span>
                        <span className="font-semibold text-foreground tabular-nums shrink-0">
                          {formatRupiah(exp.amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full rounded-full bg-amber-500/85"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-border/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {t("dashboard:charts.recent_journals_title")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {journals.length} {t("dashboard:charts.ledger_entries_count")}
                </span>
              </div>
              {recentJournals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {t("dashboard:charts.no_journals")}
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentJournals.map((j) => {
                    const totalDebit = lines
                      .filter((l) => l.journal_id === j.id)
                      .reduce((s, l) => s + l.debit, 0);
                    return (
                      <div
                        key={j.id}
                        className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {getLocalizedTransactionDescription(j.description, language)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                            {j.journal_number} &bull; {formatDateI18n(j.journal_date, language)}
                          </p>
                        </div>
                        <span className="font-semibold text-foreground tabular-nums shrink-0">
                          {formatRupiah(totalDebit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={expenseChartType}
              onChange={setExpenseChartType}
              options={[
                { value: "bar", label: t("dashboard:charts.types.bar_expenses"), icon: BarChartHorizontalIcon },
                { value: "pie", label: t("dashboard:charts.types.pie_expenses"), icon: PieChartIcon },
                { value: "histogram", label: t("dashboard:charts.types.histogram"), title: t("dashboard:charts.chart_histogram_title"), icon: BarChart2Icon },
              ]}
            />
          </ChartCardFooter>
        </Card>
      </div>
    </div>
  );
}
