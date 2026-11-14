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
  SHORT_MONTHS_ID,
  formatCompactRupiah,
  formatDateID,
  formatRupiah,
} from "@/lib/formatters";
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

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, val]) => {
      const [yStr = "", mStr = ""] = monthKey.split("-");
      const mIdx = Number(mStr) - 1;
      const monthName = SHORT_MONTHS_ID[mIdx] ?? mStr;
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
        <span>Memuat dasbor keuangan &amp; akuntansi...</span>
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
      label: "Belum Jatuh Tempo",
      color: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      amount: arAging
        .filter((a) => a.agingBucket === "Belum Jatuh Tempo")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: "1–30 Hari",
      color: "bg-sky-500",
      dotColor: "bg-sky-500",
      amount: arAging
        .filter((a) => a.agingBucket === "1–30 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: "31–60 Hari",
      color: "bg-amber-500",
      dotColor: "bg-amber-500",
      amount: arAging
        .filter((a) => a.agingBucket === "31–60 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
    {
      label: "> 60 Hari",
      color: "bg-rose-500",
      dotColor: "bg-rose-500",
      amount: arAging
        .filter((a) => a.agingBucket === "> 60 Hari")
        .reduce((s, a) => s + a.outstandingAmount, 0),
    },
  ];

  const monthlySeries = buildMonthlySeries(accounts, journals, lines);
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
          formatDateID(j.journal_date),
          j.journal_type,
          j.status,
          acc ? `${acc.code} - ${acc.name}` : "-",
          l.description ?? j.description,
          l.debit,
          l.credit,
        ]);
      }
    }
    await downloadExcelSheet({
      fileName: "Cadangan_Buku_Jurnal_Altcycles.xlsx",
      sheetName: "Backup Jurnal",
      columns: [
        { header: "No. Jurnal", width: 22 },
        { header: "Tanggal", width: 14 },
        { header: "Tipe", width: 18 },
        { header: "Status", width: 14 },
        { header: "Akun", width: 32 },
        { header: "Keterangan", width: 38 },
        { header: "Debit", width: 18 },
        { header: "Kredit", width: 18 },
      ],
      rows,
    });
    await recordExportLog("FULL_BACKUP_LEDGER", "EXCEL");
    toast.success("Cadangan data jurnal berhasil diunduh ke Excel (.xlsx).");
  }

  async function handleBackupExportPdf() {
    const comp = await getCompanyProfile();
    const tableRows: string[][] = [];
    for (const j of journals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      for (const l of jLines) {
        const acc = accMap.get(l.account_id);
        tableRows.push([
          formatDateID(j.journal_date),
          j.journal_number,
          acc ? `${acc.code} - ${acc.name}` : "-",
          l.description ?? j.description,
          l.debit > 0 ? formatRupiah(l.debit) : "-",
          l.credit > 0 ? formatRupiah(l.credit) : "-",
        ]);
      }
    }
    const bytes = await generateDocumentPdf({
      docTitle: "CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES",
      docSubtitle: `Total Entri Jurnal: ${journals.length} transaksi`,
      docNumber: `BKP/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: "Tanggal", widthRatio: 0.14 },
        { header: "No. Jurnal", widthRatio: 0.18 },
        { header: "Akun", widthRatio: 0.28 },
        { header: "Keterangan", widthRatio: 0.20 },
        { header: "Debit", widthRatio: 0.10, align: "right" },
        { header: "Kredit", widthRatio: 0.10, align: "right" },
      ],
      tableRows,
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, "Cadangan_Buku_Jurnal_Altcycles.pdf");
    await recordExportLog("FULL_BACKUP_LEDGER", "PDF");
    toast.success("Cadangan data jurnal berhasil diunduh ke PDF (.pdf).");
  }

  async function handleBackupExportCsv() {
    const rows: Array<Array<string | number>> = [];
    for (const j of journals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      for (const l of jLines) {
        const acc = accMap.get(l.account_id);
        rows.push([
          j.journal_number,
          j.journal_date,
          j.journal_type,
          j.status,
          acc ? `${acc.code} - ${acc.name}` : "-",
          l.description ?? j.description,
          l.debit,
          l.credit,
        ]);
      }
    }
    downloadCsvFile(
      "Cadangan_Buku_Jurnal_Altcycles.csv",
      [
        "No. Jurnal",
        "Tanggal",
        "Tipe",
        "Status",
        "Akun",
        "Keterangan",
        "Debit",
        "Kredit",
      ],
      rows,
    );
    await recordExportLog("FULL_BACKUP_LEDGER", "CSV");
    toast.success("Cadangan data jurnal berhasil diunduh ke CSV (.csv).");
  }

  const totalExpense =
    incomeStatement.totalDirectExpense + incomeStatement.totalSharedExpense;
  const donutSegments =
    donutMode === "profit"
      ? [
          {
            label: "Pendapatan",
            value: Math.max(0, incomeStatement.totalRevenue),
            color: "#10b981",
            dotClass: "bg-emerald-500",
          },
          {
            label: "Beban Langsung",
            value: Math.max(0, incomeStatement.totalDirectExpense),
            color: "#f59e0b",
            dotClass: "bg-amber-500",
          },
          {
            label: "Beban Bersama",
            value: Math.max(0, incomeStatement.totalSharedExpense),
            color: "#3b82f6",
            dotClass: "bg-blue-500",
          },
        ]
      : [
          {
            label: "Kas Masuk Operasi",
            value: Math.max(0, cashPosition.operatingInflow),
            color: "#10b981",
            dotClass: "bg-emerald-500",
          },
          {
            label: "Kas Keluar Operasi",
            value: Math.max(0, cashPosition.operatingOutflow),
            color: "#f43f5e",
            dotClass: "bg-rose-500",
          },
          {
            label: "Investasi & Pendanaan",
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
      label: `${exp.code} — ${exp.name}`,
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
      label: "Persetujuan Dana",
      desc: "Verifikasi & cairkan",
      icon: HandCoinsIcon,
      tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      badge:
        pendingApprovals + readyDisbursements > 0
          ? `${pendingApprovals + readyDisbursements} Antrean`
          : null,
    },
    {
      to: "/admin/proyek",
      label: "Proyek & Termin",
      desc: "SPK, BAKP, & UAT",
      icon: FolderKanbanIcon,
      tone: "text-primary dark:text-cyan-400 bg-primary/10 border-primary/20",
      badge:
        pendingClientPos > 0 ? `${pendingClientPos} PO Baru` : null,
    },
    {
      to: "/admin/penagihan",
      label: "Invoice & Piutang",
      desc: "Tagihan & kuitansi",
      icon: ReceiptTextIcon,
      tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
      badge: unpaidInvoiceCount > 0 ? `${unpaidInvoiceCount} Belum Lunas` : null,
    },
    {
      to: "/admin/akuntansi",
      label: "Jurnal & Buku Besar",
      desc: "Catat transaksi keuangan",
      icon: ScaleIcon,
      tone: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      badge: null,
    },
    {
      to: "/admin/akuntansi/laporan",
      label: "Laporan Keuangan",
      desc: "Laba Rugi & Neraca",
      icon: BarChart3Icon,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      badge: null,
    },
    {
      to: "/admin/po-internal",
      label: "PO Vendor",
      desc: "Pengadaan internal",
      icon: ShoppingCartIcon,
      tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      badge: activePoCount > 0 ? `${activePoCount} Aktif` : null,
    },
    {
      to: "/admin/anggaran",
      label: "Budgeting Proyek",
      desc: "Pagu & realisasi",
      icon: PiggyBankIcon,
      tone: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
      badge: null,
    },
    {
      to: "/admin/bagi-hasil",
      label: "Bagi Hasil & Master",
      desc: "Distribusi tim",
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
            Dasbor Keuangan &amp; Akuntansi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Pantau likuiditas kas, kinerja laba rugi, piutang, dan aktivitas jurnal perusahaan.
          </p>
        </div>
        <div className="shrink-0">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
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
              Kas &amp; Bank Terkini
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(cashPosition.endingCash)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {openPeriods > 0
                ? `${openPeriods} periode buku aktif terbuka`
                : "Seluruh periode buku ditutup"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Antrean Pembayaran
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {pendingApprovals} Pengajuan
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {readyDisbursements > 0
                ? `${readyDisbursements} siap dicairkan ke rekening`
                : pendingApprovals > 0
                  ? `${pendingApprovals} menunggu verifikasi Anda`
                  : "Semua pengajuan telah diproses"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ClockIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Piutang Belum Tertagih
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(outstandingReceivable)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {unpaidInvoiceCount > 0
                ? `${unpaidInvoiceCount} invoice menunggu pelunasan`
                : pendingClientPos > 0
                  ? `${pendingClientPos} PO klien perlu verifikasi`
                  : "Seluruh tagihan klien terkelola"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <ReceiptTextIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Komitmen Kontrak
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalContract)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Akumulasi dari {projects.length} proyek klien
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
              Pintasan Cepat Modul Keuangan
            </h2>
            <p className="text-xs text-muted-foreground">
              Akses langsung ke menu operasional, penagihan, dan pelaporan utama.
            </p>
          </div>
          <Link
            to="/admin/master"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-cyan-400 hover:underline shrink-0"
          >
            <ClipboardListIcon className="size-3.5" />
            <span>Master Vendor &amp; Klien</span>
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
                Tren Pendapatan, Beban, &amp; Arus Kas
              </CardTitle>
              <CardDescription>
                Perbandingan pergerakan keuangan bulanan berdasarkan jurnal terposting.
              </CardDescription>
            </div>
            {trendChartType !== "bubble" ? (
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-emerald-500" />
                  Pendapatan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-amber-500" />
                  Beban
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-primary" />
                  Kas Bersih
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
                  label: "Pendapatan",
                  color: "#10b981",
                  textClass: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  key: "expense",
                  label: "Beban",
                  color: "#f59e0b",
                  textClass: "text-amber-600 dark:text-amber-400",
                },
                {
                  key: "netCash",
                  label: "Kas Bersih",
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
                xLabel: "Pendapatan",
                yLabel: "Beban",
                sizeLabel: "Skala Kas Bersih",
                showBreakEvenLine: true,
              }}
              emptyTitle="Belum Ada Data Jurnal Terposting"
              emptySubtitle="Grafik tren bulanan otomatis muncul setelah transaksi pendapatan, beban, atau kas dicatat di buku jurnal."
            />

            {/* Footer Ringkasan Laba Rugi */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  Total Pendapatan
                </p>
                <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {formatRupiah(incomeStatement.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total Beban</p>
                <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                  {formatRupiah(totalExpense)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  Laba / Rugi Bersih
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
                { value: "column", label: "Column", title: "Column Chart (Batang Vertikal)", icon: BarChart3Icon },
                { value: "bar", label: "Bar", title: "Bar Chart (Batang Horizontal)", icon: BarChartHorizontalIcon },
                { value: "line", label: "Line", title: "Line Chart (Garis Tren)", icon: TrendingUpIcon },
                { value: "area", label: "Area", title: "Area Chart (Kurva Area)", icon: ActivityIcon },
                { value: "bubble", label: "Bubble", title: "Bubble Chart (Pendapatan vs Beban)", icon: CircleDotIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>

        {/* Grafik 2: Komposisi Laba Rugi / Arus Kas (Donut, Pie, Bar) */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                Komposisi Keuangan
              </CardTitle>
              <CardDescription>
                Proporsi struktur {donutMode === "profit" ? "laba rugi" : "arus kas"}.
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
                Laba Rugi
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
                Arus Kas
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            <CompositionChart
              chartType={compositionChartType}
              slices={donutSegments}
              centerLabel={donutMode === "profit" ? "Laba Bersih" : "Saldo Kas"}
              centerValue={formatCompactRupiah(
                donutMode === "profit"
                  ? incomeStatement.netProfit
                  : cashPosition.endingCash,
              )}
              formatValue={formatRupiah}
              emptyTitle="Belum Ada Komposisi Keuangan"
              emptySubtitle="Grafik proporsi otomatis terisi setelah transaksi pendapatan, beban, atau kas dibukukan."
            />
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={compositionChartType}
              onChange={setCompositionChartType}
              options={[
                { value: "donut", label: "Donut", icon: CircleDotIcon },
                { value: "pie", label: "Pie", icon: PieChartIcon },
                { value: "bar", label: "Bar", icon: BarChartHorizontalIcon },
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
                Realisasi Penagihan Proyek &amp; Umur Piutang
              </CardTitle>
              <CardDescription>
                Perbandingan nilai kontrak terhadap invoice terbit serta sebaran jatuh tempo.
              </CardDescription>
            </div>
            <Link
              to="/admin/penagihan"
              className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline shrink-0"
            >
              Kelola Tagihan
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            {billingChartType === "pie" ? (
              <CompositionChart
                chartType="pie"
                slices={agingPieSlices}
                formatValue={formatRupiah}
                emptyTitle="Tidak Ada Piutang Jatuh Tempo"
                emptySubtitle="Seluruh invoice proyek yang diterbitkan sudah lunas atau belum ada penagihan berjalan."
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
                      label: "Kontrak",
                      color: "#64748b",
                      textClass: "text-muted-foreground",
                    },
                    {
                      key: "billed",
                      label: "Tertagih",
                      color: "#0B43C8",
                      textClass: "text-primary dark:text-sky-400",
                    },
                    {
                      key: "paid",
                      label: "Terbayar",
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
                    xLabel: "Nilai Kontrak",
                    yLabel: "Invoice Terbit",
                    sizeLabel: "Dana Terbayar",
                    showBreakEvenLine: true,
                  }}
                  emptyTitle="Belum Ada Proyek Klien Aktif"
                  emptySubtitle="Tambahkan proyek klien untuk memvisualisasikan perbandingan nilai kontrak dan invoice."
                />
                {billingChartType === "column" ? (
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-slate-500" />
                      Kontrak
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-primary" />
                      Invoice Terbit
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-emerald-500" />
                      Sudah Dibayar
                    </span>
                  </div>
                ) : null}
              </div>
            ) : projectBillingStats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Belum ada proyek klien aktif untuk dianalisis.
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
                  Sebaran Umur Piutang Usaha
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
                { value: "bar", label: "Progress", icon: BarChartHorizontalIcon },
                { value: "column", label: "Column", title: "Perbandingan Kontrak vs Tertagih", icon: BarChart3Icon },
                { value: "pie", label: "Pie Piutang", title: "Pie Chart Sebaran Umur Piutang", icon: PieChartIcon },
                { value: "bubble", label: "Bubble", title: "Bubble Chart Nilai Kontrak vs Tertagih", icon: CircleDotIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>

        {/* Grafik 4: Pos Beban Terbesar, Histogram Transaksi, & Aktivitas Jurnal Terbaru */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                Pos Beban Terbesar &amp; Distribusi Transaksi
              </CardTitle>
              <CardDescription>
                {expenseChartType === "histogram"
                  ? "Histogram sebaran nilai nominal seluruh transaksi jurnal terposting."
                  : "Distribusi pengeluaran per akun dan catatan transaksi terkini."}
              </CardDescription>
            </div>
            <Link
              to="/admin/akuntansi"
              className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline shrink-0"
            >
              Buku Jurnal
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            {expenseChartType === "histogram" ? (
              <HistogramChart
                bins={journalHistogram.bins}
                average={journalHistogram.average}
                median={journalHistogram.median}
                totalCount={journalHistogram.totalCount}
                unitLabel="Jurnal"
                accentColor="#0B43C8"
                emptyTitle="Belum Ada Sampel Jurnal Terposting"
                emptySubtitle="Histogram sebaran nominal transaksi otomatis terbentuk setelah ada jurnal akuntansi berstatus posted."
              />
            ) : expenseChartType === "pie" ? (
              <CompositionChart
                chartType="pie"
                slices={expenseSlices}
                formatValue={formatRupiah}
                emptyTitle="Belum Ada Pengeluaran Beban Terposting"
                emptySubtitle="Pie Chart pos beban tampil setelah ada pengeluaran beban tercatat di buku jurnal."
              />
            ) : topExpenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 py-6 px-4 text-center">
                <p className="text-xs font-medium text-foreground">
                  Belum Ada Pengeluaran Beban Terposting
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pos beban terbesar akan tampil otomatis setelah persetujuan pembayaran atau jurnal beban dicatat.
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
                          &mdash; {exp.name}
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
                  Aktivitas Jurnal Terakhir
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {journals.length} entri buku besar
                </span>
              </div>
              {recentJournals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Belum ada entri jurnal tercatat.
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
                            {j.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                            {j.journal_number} &bull; {formatDateID(j.journal_date)}
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
                { value: "bar", label: "Bar Beban", icon: BarChartHorizontalIcon },
                { value: "pie", label: "Pie Beban", icon: PieChartIcon },
                { value: "histogram", label: "Histogram", title: "Histogram Distribusi Nominal Jurnal", icon: BarChart2Icon },
              ]}
            />
          </ChartCardFooter>
        </Card>
      </div>
    </div>
  );
}
