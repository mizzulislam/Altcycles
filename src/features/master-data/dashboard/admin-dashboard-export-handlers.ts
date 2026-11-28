import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { getLocalizedTransactionDescription } from "@/lib/glossary";
import { recordExportLog } from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { renderDashboardChartsToPng } from "@/lib/pdf/dashboard-chart-renderer";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
  ProjectRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import type {
  AgingBucketItem,
  MonthlyFinancialPoint,
  ProjectBillingStat,
} from "./dashboard-types";

export interface DashboardExportContext {
  t: (key: string, optionsOrFallback?: any, fallback?: string) => string;
  language: "id" | "en";
  periodFilter: string;
  cashPosition: {
    endingCash: number;
    operatingInflow: number;
    operatingOutflow: number;
    netInvesting: number;
    netFinancing: number;
  };
  incomeStatement: {
    totalRevenue: number;
    totalDirectExpense: number;
    totalSharedExpense: number;
    netProfit: number;
  };
  openPeriods: number;
  totalContract: number;
  outstandingReceivable: number;
  unpaidInvoiceCount: number;
  pendingApprovals: number;
  readyDisbursements: number;
  monthlySeries: MonthlyFinancialPoint[];
  projectBillingStats: ProjectBillingStat[];
  recentJournals: JournalRow[];
  lines: JournalLineRow[];
  projects: ProjectRow[];
  invoices: SalesInvoiceRow[];
  accounts: AccountRow[];
  filteredLines: JournalLineRow[];
  accMap: Map<string, AccountRow>;
  totalExpense: number;
  totalInvoiced: number;
  agingBuckets: AgingBucketItem[];
}

export async function exportDashboardExcel(ctx: DashboardExportContext) {
  const {
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
  } = ctx;

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

export async function exportDashboardPdf(ctx: DashboardExportContext) {
  const {
    t,
    language,
    periodFilter,
    cashPosition,
    incomeStatement,
    totalContract,
    outstandingReceivable,
    pendingApprovals,
    readyDisbursements,
    monthlySeries,
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
  } = ctx;

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
    } as any),
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

export async function exportDashboardCsv(ctx: DashboardExportContext) {
  const {
    t,
    language,
    periodFilter,
    cashPosition,
    incomeStatement,
    totalContract,
    outstandingReceivable,
    pendingApprovals,
    readyDisbursements,
    monthlySeries,
    projectBillingStats,
    recentJournals,
    lines,
  } = ctx;

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
