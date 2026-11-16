import { toast } from "sonner";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  buildBalanceSheetPdfSpec,
  buildCashFlowPdfSpec,
  buildCompleteFinancialStatementsPdfSpec,
  buildGeneralLedgerPdfSpec,
  buildIncomeStatementPdfSpec,
  buildRetainedEarningsPdfSpec,
  buildTrialBalancePdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import {
  ACCOUNT_TYPE_LABELS,
  formatDateID,
  formatRupiah,
} from "@/lib/formatters";
import { recordExportLog } from "@/lib/operations-service";
import type {
  AccountRow,
  CompanyProfileRow,
} from "@/types/database.types";
import type { ActiveReportTab } from "../reports-page";

export interface ReportExportData {
  company: CompanyProfileRow | null;
  activeTab: ActiveReportTab;
  mode: "all" | "ledger" | "trial_balance" | "statements";
  layoutMode: "grid" | "single" | "sheet";
  startDate: string;
  endDate: string;
  isAllAccounts: boolean;
  allLedgers: Array<{
    account: AccountRow;
    endingBalance: number;
    rows: Array<{
      journalDate: string;
      journalNumber: string;
      referenceNumber?: string | null;
      projectCode?: string | null;
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }>;
  }>;
  selectedAccount?: AccountRow;
  selectedLedgerEndingBalance: number;
  ledgerRows: Array<{
    journalDate: string;
    journalNumber: string;
    referenceNumber?: string | null;
    projectCode?: string | null;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }>;
  trialBalance: {
    sumEndingDebit: number;
    sumEndingCredit: number;
    rows: Array<{
      code: string;
      name: string;
      accountType: any;
      totalDebit: number;
      totalCredit: number;
      endingDebit: number;
      endingCredit: number;
    }>;
  };
  balanceType: "adjusted" | "unadjusted";
  incomeStatement: {
    revenues: Array<{ code: string; name: string; amount: number }>;
    totalRevenue: number;
    directExpenses: Array<{ code: string; name: string; amount: number }>;
    totalDirectExpense: number;
    grossProfit: number;
    sharedExpenses: Array<{ code: string; name: string; amount: number }>;
    totalSharedExpense: number;
    netProfit: number;
  };
  beginningRetainedEarnings: number;
  endingRetainedEarnings: number;
  dividends: number;
  balanceSheet: {
    assets: Array<{ code: string; name: string; amount: number }>;
    contractAssets: Array<{
      projectCode: string;
      projectName: string;
      netContractPosition: number;
    }>;
    totalAssets: number;
    liabilities: Array<{ code: string; name: string; amount: number }>;
    contractLiabilities: Array<{
      projectCode: string;
      projectName: string;
      netContractPosition: number;
    }>;
    equities: Array<{ code: string; name: string; amount: number }>;
    currentUnclosedEarnings: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  };
  totalLiabilities: number;
  currentAssets: Array<{ code: string; name: string; amount: number }>;
  currentLiabilities: Array<{ code: string; name: string; amount: number }>;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  totalEquity: number;
  cashFlow: {
    beginningCash: number;
    operatingInflow: number;
    operatingOutflow: number;
    netOperating: number;
    netInvesting: number;
    netFinancing: number;
    netChangeInCash: number;
    endingCash: number;
  };
  modalDisetorBalance: number;
  totalEndingEquity: number;
}

export async function exportReportToPdf(data: ReportExportData): Promise<void> {
  const {
    company,
    activeTab,
    mode,
    layoutMode,
    startDate,
    endDate,
    isAllAccounts,
    allLedgers,
    selectedAccount,
    selectedLedgerEndingBalance,
    ledgerRows,
    trialBalance,
    balanceType,
    incomeStatement,
    beginningRetainedEarnings,
    endingRetainedEarnings,
    dividends,
    balanceSheet,
    totalLiabilities,
    currentAssets,
    currentLiabilities,
    totalCurrentAssets,
    totalCurrentLiabilities,
    totalEquity,
    cashFlow,
  } = data;

  try {
    const comp = company ?? (await getCompanyProfile());
    const periodLabel =
      activeTab === "neraca" && mode !== "ledger" && mode !== "trial_balance"
        ? `Per ${formatDateID(endDate)}`
        : `${formatDateID(startDate)} s.d. ${formatDateID(endDate)}`;

    let spec;
    let fileName = "Laporan_Keuangan_Altcycles.pdf";
    let successMsg = "Laporan keuangan berhasil diunduh dalam format PDF (.pdf).";

    if (mode === "ledger" || activeTab === "buku_besar") {
      const isAll = isAllAccounts;
      const targetAccounts = isAll
        ? allLedgers.map((l) => ({
            code: l.account.code,
            name: l.account.name,
            type: ACCOUNT_TYPE_LABELS[l.account.account_type] ?? l.account.account_type,
            normalBalance: l.account.normal_balance === "debit" ? "Debit" : "Kredit",
            endingBalance: l.endingBalance,
            rows: l.rows.map((r) => ({
              date: formatDateID(r.journalDate),
              description: r.description,
              ref: (r as any).referenceNumber || r.journalNumber || "-",
              debit: r.debit,
              credit: r.credit,
              runningBalance: r.runningBalance,
            })),
          }))
        : selectedAccount
          ? [
              {
                code: selectedAccount.code,
                name: selectedAccount.name,
                type:
                  ACCOUNT_TYPE_LABELS[selectedAccount.account_type] ??
                  selectedAccount.account_type,
                normalBalance:
                  selectedAccount.normal_balance === "debit" ? "Debit" : "Kredit",
                endingBalance: selectedLedgerEndingBalance,
                rows: ledgerRows.map((r) => ({
                  date: formatDateID(r.journalDate),
                  description: r.description,
                  ref: (r as any).referenceNumber || r.journalNumber || "-",
                  debit: r.debit,
                  credit: r.credit,
                  runningBalance: r.runningBalance,
                })),
              },
            ]
          : [];

      spec = buildGeneralLedgerPdfSpec({
        company: comp,
        periodLabel,
        accountName: selectedAccount
          ? `${selectedAccount.code} - ${selectedAccount.name}`
          : undefined,
        isAllAccounts: isAll,
        accounts: targetAccounts,
      });
      fileName = "Buku_Besar_Altcycles.pdf";
      successMsg = "Buku Besar berhasil diunduh dalam format PDF (.pdf).";
    } else if (mode === "trial_balance" || activeTab === "neraca_saldo") {
      spec = buildTrialBalancePdfSpec({
        company: comp,
        periodLabel,
        isAdjusted: balanceType === "adjusted",
        isBalanced: trialBalance.sumEndingDebit === trialBalance.sumEndingCredit,
        rows: trialBalance.rows.map((r) => ({
          code: r.code,
          name: r.name,
          debit: r.endingDebit,
          credit: r.endingCredit,
        })),
        sumDebit: trialBalance.sumEndingDebit,
        sumCredit: trialBalance.sumEndingCredit,
      });
      fileName = "Neraca_Saldo_Altcycles.pdf";
      successMsg = "Neraca Saldo berhasil diunduh dalam format PDF (.pdf).";
    } else if (mode === "statements" && layoutMode === "grid") {
      const isRows = [
        ...incomeStatement.revenues.map((r) => [r.name, formatRupiah(r.amount)]),
        ["Total Pendapatan Usaha", formatRupiah(incomeStatement.totalRevenue)],
        ...incomeStatement.directExpenses.map((c) => [c.name, formatRupiah(c.amount)]),
        ["Laba Kotor Proyek", formatRupiah(incomeStatement.grossProfit)],
        ...incomeStatement.sharedExpenses.map((o) => [o.name, formatRupiah(o.amount)]),
        ["Laba (Rugi) Bersih", formatRupiah(incomeStatement.netProfit)],
      ];
      const eqRows = [
        ["Saldo Laba Ditahan Awal", formatRupiah(beginningRetainedEarnings)],
        ["Laba Bersih Berjalan", formatRupiah(incomeStatement.netProfit)],
        ["Dividen / Prive", formatRupiah(dividends)],
        ["Saldo Laba Ditahan Akhir", formatRupiah(endingRetainedEarnings)],
      ];
      const bsRows = [
        ...balanceSheet.assets.map((a) => [a.name, formatRupiah(a.amount)]),
        ["Total Aset", formatRupiah(balanceSheet.totalAssets)],
        ...balanceSheet.liabilities.map((l) => [l.name, formatRupiah(l.amount)]),
        ["Total Liabilitas", formatRupiah(totalLiabilities)],
        ...balanceSheet.equities.map((e) => [e.name, formatRupiah(e.amount)]),
        ["Total Liabilitas & Ekuitas", formatRupiah(balanceSheet.totalLiabilitiesAndEquity)],
      ];
      const cfRows = [
        ["Saldo Kas Awal", formatRupiah(cashFlow.beginningCash)],
        ["Kas Bersih dari Aktivitas Operasi", formatRupiah(cashFlow.netOperating)],
        ["Kas Bersih dari Aktivitas Investasi", formatRupiah(cashFlow.netInvesting)],
        ["Kas Bersih dari Aktivitas Pendanaan", formatRupiah(cashFlow.netFinancing)],
        ["Saldo Kas Akhir", formatRupiah(cashFlow.endingCash)],
      ];
      spec = buildCompleteFinancialStatementsPdfSpec({
        company: comp,
        periodLabel,
        incomeStatementRows: isRows,
        retainedEarningsRows: eqRows,
        balanceSheetRows: bsRows,
        cashFlowRows: cfRows,
      });
      fileName = "Laporan_Keuangan_Lengkap_Altcycles.pdf";
      successMsg = "Laporan Keuangan Lengkap berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "laba_rugi") {
      spec = buildIncomeStatementPdfSpec({
        company: comp,
        periodLabel,
        revenueRows: incomeStatement.revenues.map((r) => ({
          label: `${r.code} - ${r.name}`,
          amount: r.amount,
        })),
        totalRevenue: incomeStatement.totalRevenue,
        cogsRows: incomeStatement.directExpenses.map((c) => ({
          label: `${c.code} - ${c.name}`,
          amount: c.amount,
        })),
        grossProfit: incomeStatement.grossProfit,
        opexRows: incomeStatement.sharedExpenses.map((o) => ({
          label: `${o.code} - ${o.name}`,
          amount: o.amount,
        })),
        totalOpex: incomeStatement.totalSharedExpense,
        netIncome: incomeStatement.netProfit,
      });
      fileName = "Laba_Rugi_Altcycles.pdf";
      successMsg = "Laporan Laba Rugi berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "ekuitas") {
      spec = buildRetainedEarningsPdfSpec({
        company: comp,
        periodLabel,
        rows: [
          {
            label: "Saldo Laba Ditahan Awal Periode",
            amount: beginningRetainedEarnings,
          },
          {
            label: "Laba (Rugi) Bersih Periode Berjalan",
            amount: incomeStatement.netProfit,
          },
          {
            label: "Dividen / Penarikan Modal Pemilik (Prive)",
            amount: -Math.abs(dividends),
          },
        ],
        endingRetainedEarnings,
      });
      fileName = "Perubahan_Ekuitas_Altcycles.pdf";
      successMsg = "Laporan Perubahan Ekuitas berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "neraca") {
      const sumContractAssets = balanceSheet.contractAssets.reduce(
        (s, ca) => s + ca.netContractPosition,
        0,
      );
      const sumContractLiabilities = balanceSheet.contractLiabilities.reduce(
        (s, cl) => s + Math.abs(cl.netContractPosition),
        0,
      );
      spec = buildBalanceSheetPdfSpec({
        company: comp,
        periodLabel,
        isBalanced: balanceSheet.isBalanced,
        currentAssetRows: currentAssets.map((a) => ({
          label: `${a.code} - ${a.name}`,
          amount: a.amount,
        })),
        totalCurrentAssets: totalCurrentAssets,
        nonCurrentAssetRows: balanceSheet.contractAssets.map((ca) => ({
          label: `${ca.projectCode} - ${ca.projectName}`,
          amount: ca.netContractPosition,
        })),
        totalNonCurrentAssets: sumContractAssets,
        totalAssets: balanceSheet.totalAssets,
        currentLiabRows: currentLiabilities.map((l) => ({
          label: `${l.code} - ${l.name}`,
          amount: l.amount,
        })),
        totalCurrentLiabilities: totalCurrentLiabilities,
        nonCurrentLiabRows: balanceSheet.contractLiabilities.map((cl) => ({
          label: `${cl.projectCode} - ${cl.projectName}`,
          amount: Math.abs(cl.netContractPosition),
        })),
        totalNonCurrentLiabilities: sumContractLiabilities,
        totalLiabilities: totalLiabilities,
        equityRows: [
          ...balanceSheet.equities.map((e) => ({
            label: `${e.code} - ${e.name}`,
            amount: e.amount,
          })),
          {
            label: "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            amount: balanceSheet.currentUnclosedEarnings,
          },
        ],
        totalEquity: totalEquity,
        totalLiabilitiesAndEquity: balanceSheet.totalLiabilitiesAndEquity,
      });
      fileName = "Posisi_Keuangan_Neraca_Altcycles.pdf";
      successMsg =
        "Laporan Posisi Keuangan (Neraca) berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "arus_kas") {
      spec = buildCashFlowPdfSpec({
        company: comp,
        periodLabel,
        operatingRows: [
          {
            label: "Penerimaan Kas dari Pelanggan & Klien",
            amount: cashFlow.operatingInflow,
          },
          {
            label: "Pembayaran Kas untuk Beban Operasional & Vendor",
            amount: -Math.abs(cashFlow.operatingOutflow),
          },
        ],
        netOperating: cashFlow.netOperating,
        investingRows: [],
        netInvesting: cashFlow.netInvesting,
        financingRows: [],
        netFinancing: cashFlow.netFinancing,
        netCashChange: cashFlow.netChangeInCash,
        beginningCash: cashFlow.beginningCash,
        endingCash: cashFlow.endingCash,
      });
      fileName = "Arus_Kas_Altcycles.pdf";
      successMsg = "Laporan Arus Kas berhasil diunduh dalam format PDF (.pdf).";
    }

    if (spec) {
      const bytes = await generateDocumentPdf(spec);
      downloadPdfBytes(bytes, fileName);
      toast.success(successMsg);
    }
    const logScope =
      mode === "ledger"
        ? "GENERAL_LEDGER"
        : mode === "trial_balance"
          ? "TRIAL_BALANCE"
          : "FINANCIAL_STATEMENTS";
    void recordExportLog(logScope, "PDF", periodLabel);
  } catch (err) {
    console.error("Gagal mengunduh PDF laporan akuntansi:", err);
    toast.error("Gagal membuat berkas PDF laporan keuangan.");
  }
}

export async function exportReportToExcel(data: ReportExportData): Promise<void> {
  const {
    activeTab,
    startDate,
    endDate,
    isAllAccounts,
    allLedgers,
    selectedAccount,
    ledgerRows,
    trialBalance,
    incomeStatement,
    beginningRetainedEarnings,
    endingRetainedEarnings,
    dividends,
    balanceSheet,
    cashFlow,
    modalDisetorBalance,
    totalEndingEquity,
  } = data;

  try {
    if (activeTab === "neraca") {
      await downloadExcelSheet({
        fileName: `Neraca_${endDate}.xlsx`,
        sheetName: "Neraca",
        columns: [
          { header: "Kelompok", width: 28 },
          { header: "Kode / Proyek", width: 18 },
          { header: "Nama Akun / Proyek", width: 34 },
          { header: "Nominal (Rp)", width: 20 },
        ],
        rows: [
          ...balanceSheet.assets.map((a) => ["Aset", a.code, a.name, a.amount]),
          ...balanceSheet.contractAssets.map((ca) => [
            "Aset Kontrak",
            ca.projectCode,
            ca.projectName,
            ca.netContractPosition,
          ]),
          ["TOTAL ASET", "", "", balanceSheet.totalAssets],
          ...balanceSheet.liabilities.map((l) => [
            "Liabilitas",
            l.code,
            l.name,
            l.amount,
          ]),
          ...balanceSheet.contractLiabilities.map((cl) => [
            "Liabilitas Kontrak",
            cl.projectCode,
            cl.projectName,
            Math.abs(cl.netContractPosition),
          ]),
          ...balanceSheet.equities.map((e) => ["Ekuitas", e.code, e.name, e.amount]),
          [
            "Ekuitas",
            "-",
            "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            balanceSheet.currentUnclosedEarnings,
          ],
          [
            "TOTAL LIABILITAS + EKUITAS",
            "",
            "",
            balanceSheet.totalLiabilitiesAndEquity,
          ],
        ],
      });
      await recordExportLog("BALANCE_SHEET", "EXCEL", endDate);
      toast.success("Neraca berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "laba_rugi") {
      await downloadExcelSheet({
        fileName: `Laba_Rugi_${startDate}_${endDate}.xlsx`,
        sheetName: "Laba Rugi",
        columns: [
          { header: "Kategori", width: 26 },
          { header: "Kode Akun", width: 14 },
          { header: "Nama Akun", width: 34 },
          { header: "Nominal (Rp)", width: 20 },
        ],
        rows: [
          ...incomeStatement.revenues.map((r) => [
            "Pendapatan",
            r.code,
            r.name,
            r.amount,
          ]),
          ["Subtotal Pendapatan", "", "", incomeStatement.totalRevenue],
          ...incomeStatement.directExpenses.map((e) => [
            "Beban Langsung",
            e.code,
            e.name,
            e.amount,
          ]),
          ["Laba Kotor", "", "", incomeStatement.grossProfit],
          ...incomeStatement.sharedExpenses.map((s) => [
            "Beban Bersama",
            s.code,
            s.name,
            s.amount,
          ]),
          ["LABA BERSIH", "", "", incomeStatement.netProfit],
        ],
      });
      await recordExportLog("INCOME_STATEMENT", "EXCEL", `${startDate}..${endDate}`);
      toast.success("Laporan Laba Rugi berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "ekuitas") {
      await downloadExcelSheet({
        fileName: `Perubahan_Ekuitas_${startDate}_${endDate}.xlsx`,
        sheetName: "Perubahan Ekuitas",
        columns: [
          { header: "Komponen Ekuitas", width: 38 },
          { header: "Nominal (Rp)", width: 22 },
        ],
        rows: [
          ["Saldo Laba Ditahan Awal Periode", beginningRetainedEarnings],
          ["Ditambah: Laba Bersih Periode Berjalan", incomeStatement.netProfit],
          ["Dikurangi: Prive Pemilik (Dividen)", -dividends],
          ["Saldo Laba Ditahan Akhir Periode", endingRetainedEarnings],
          ["Modal Disetor Pemilik", modalDisetorBalance],
          ["TOTAL EKUITAS AKHIR PERIODE", totalEndingEquity],
        ],
      });
      await recordExportLog("EQUITY_STATEMENT", "EXCEL", `${startDate}..${endDate}`);
      toast.success("Laporan Perubahan Ekuitas berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "neraca_saldo") {
      await downloadExcelSheet({
        fileName: `Neraca_Saldo_${endDate}.xlsx`,
        sheetName: "Neraca Saldo",
        columns: [
          { header: "Kode Akun", width: 14 },
          { header: "Nama Akun", width: 32 },
          { header: "Kelompok", width: 16 },
          { header: "Mutasi Debit", width: 18 },
          { header: "Mutasi Kredit", width: 18 },
          { header: "Saldo Akhir Debit", width: 18 },
          { header: "Saldo Akhir Kredit", width: 18 },
        ],
        rows: trialBalance.rows.map((r) => [
          r.code,
          r.name,
          (ACCOUNT_TYPE_LABELS as Record<string, string>)[r.accountType] || r.accountType,
          r.totalDebit,
          r.totalCredit,
          r.endingDebit,
          r.endingCredit,
        ]),
      });
      await recordExportLog("TRIAL_BALANCE", "EXCEL", endDate);
      toast.success("Neraca Saldo berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "arus_kas") {
      await downloadExcelSheet({
        fileName: `Arus_Kas_${startDate}_${endDate}.xlsx`,
        sheetName: "Arus Kas",
        columns: [
          { header: "Uraian Komponen Arus Kas", width: 38 },
          { header: "Nominal (Rp)", width: 22 },
        ],
        rows: [
          ["Saldo Kas Awal Periode", cashFlow.beginningCash],
          ["Penerimaan Kas Aktivitas Operasi", cashFlow.operatingInflow],
          ["Pengeluaran Kas Aktivitas Operasi", -cashFlow.operatingOutflow],
          ["Arus Kas Bersih Aktivitas Operasi", cashFlow.netOperating],
          ["Arus Kas Bersih Aktivitas Investasi", cashFlow.netInvesting],
          ["Arus Kas Bersih Aktivitas Pendanaan", cashFlow.netFinancing],
          ["Perubahan Bersih Kas", cashFlow.netChangeInCash],
          ["Saldo Kas Akhir Periode", cashFlow.endingCash],
        ],
      });
      await recordExportLog("CASH_FLOW", "EXCEL", `${startDate}..${endDate}`);
      toast.success("Laporan Arus Kas berhasil diekspor ke Excel.");
      return;
    }

    // Buku Besar
    const exportRows = isAllAccounts
      ? allLedgers.flatMap((l) =>
          l.rows.map((r) => [
            formatDateID(r.journalDate),
            r.journalNumber,
            `${l.account.code} - ${l.account.name}`,
            r.projectCode ?? "-",
            r.description,
            r.debit,
            r.credit,
            r.runningBalance,
          ]),
        )
      : ledgerRows.map((r) => [
          formatDateID(r.journalDate),
          r.journalNumber,
          selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "-",
          r.projectCode ?? "-",
          r.description,
          r.debit,
          r.credit,
          r.runningBalance,
        ]);

    await downloadExcelSheet({
      fileName: `Buku_Besar_${selectedAccount ? selectedAccount.code : "Kompilasi"}_${endDate}.xlsx`,
      sheetName: "Buku Besar",
      columns: [
        { header: "Tanggal", width: 14 },
        { header: "No. Jurnal", width: 20 },
        { header: "Akun", width: 28 },
        { header: "Proyek", width: 16 },
        { header: "Uraian", width: 36 },
        { header: "Debit", width: 18 },
        { header: "Kredit", width: 18 },
        { header: "Saldo Berjalan", width: 20 },
      ],
      rows: exportRows,
    });
    await recordExportLog("GENERAL_LEDGER", "EXCEL", `${startDate}..${endDate}`);
    toast.success("Buku Besar berhasil diekspor ke Excel.");
  } catch (err) {
    console.error("Gagal mengekspor laporan ke Excel:", err);
    toast.error("Gagal mengekspor laporan keuangan ke Excel.");
  }
}

export async function exportReportToCsv(data: ReportExportData): Promise<void> {
  const {
    activeTab,
    startDate,
    endDate,
    isAllAccounts,
    allLedgers,
    selectedAccount,
    ledgerRows,
    trialBalance,
    incomeStatement,
    balanceSheet,
    cashFlow,
  } = data;

  try {
    if (activeTab === "neraca") {
      downloadCsvFile(
        `Neraca_SAK_${endDate}.csv`,
        ["Kelompok", "Kode / Proyek", "Nama Akun / Proyek", "Nominal"],
        [
          ...balanceSheet.assets.map((a) => ["Aset", a.code, a.name, a.amount]),
          ...balanceSheet.contractAssets.map((ca) => [
            "Aset Kontrak",
            ca.projectCode,
            ca.projectName,
            ca.netContractPosition,
          ]),
          ["TOTAL ASET", "", "", balanceSheet.totalAssets],
          ...balanceSheet.liabilities.map((l) => [
            "Liabilitas",
            l.code,
            l.name,
            l.amount,
          ]),
          ...balanceSheet.contractLiabilities.map((cl) => [
            "Liabilitas Kontrak",
            cl.projectCode,
            cl.projectName,
            Math.abs(cl.netContractPosition),
          ]),
          ...balanceSheet.equities.map((e) => ["Ekuitas", e.code, e.name, e.amount]),
          [
            "Ekuitas",
            "-",
            "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            balanceSheet.currentUnclosedEarnings,
          ],
          [
            "TOTAL LIABILITAS + EKUITAS",
            "",
            "",
            balanceSheet.totalLiabilitiesAndEquity,
          ],
        ],
      );
      await recordExportLog("BALANCE_SHEET", "CSV", endDate);
      toast.success("Neraca berhasil diekspor ke CSV.");
      return;
    }

    if (activeTab === "laba_rugi") {
      downloadCsvFile(
        `Laba_Rugi_${startDate}_${endDate}.csv`,
        ["Kategori", "Kode Akun", "Nama Akun", "Nominal"],
        [
          ...incomeStatement.revenues.map((r) => [
            "Pendapatan",
            r.code,
            r.name,
            r.amount,
          ]),
          ["Subtotal Pendapatan", "", "", incomeStatement.totalRevenue],
          ...incomeStatement.directExpenses.map((e) => [
            "Beban Langsung",
            e.code,
            e.name,
            e.amount,
          ]),
          ["Laba Kotor", "", "", incomeStatement.grossProfit],
          ...incomeStatement.sharedExpenses.map((s) => [
            "Beban Bersama",
            s.code,
            s.name,
            s.amount,
          ]),
          ["LABA BERSIH", "", "", incomeStatement.netProfit],
        ],
      );
      await recordExportLog("INCOME_STATEMENT", "CSV", `${startDate}..${endDate}`);
      toast.success("Laporan Laba Rugi berhasil diekspor ke CSV.");
      return;
    }

    if (activeTab === "neraca_saldo") {
      downloadCsvFile(
        `Neraca_Saldo_${endDate}.csv`,
        [
          "Kode Akun",
          "Nama Akun",
          "Kelompok",
          "Mutasi Debit",
          "Mutasi Kredit",
          "Saldo Akhir Debit",
          "Saldo Akhir Kredit",
        ],
        trialBalance.rows.map((r) => [
          r.code,
          r.name,
          (ACCOUNT_TYPE_LABELS as Record<string, string>)[r.accountType] || r.accountType,
          r.totalDebit,
          r.totalCredit,
          r.endingDebit,
          r.endingCredit,
        ]),
      );
      await recordExportLog("TRIAL_BALANCE", "CSV", endDate);
      toast.success("Neraca Saldo berhasil diekspor ke CSV.");
      return;
    }

    if (activeTab === "arus_kas") {
      downloadCsvFile(
        `Arus_Kas_${startDate}_${endDate}.csv`,
        ["Uraian Komponen Arus Kas", "Nominal"],
        [
          ["Saldo Kas Awal Periode", cashFlow.beginningCash],
          ["Penerimaan Kas Aktivitas Operasi", cashFlow.operatingInflow],
          ["Pengeluaran Kas Aktivitas Operasi", -cashFlow.operatingOutflow],
          ["Arus Kas Bersih Aktivitas Operasi", cashFlow.netOperating],
          ["Arus Kas Bersih Aktivitas Investasi", cashFlow.netInvesting],
          ["Arus Kas Bersih Aktivitas Pendanaan", cashFlow.netFinancing],
          ["Perubahan Bersih Kas", cashFlow.netChangeInCash],
          ["Saldo Kas Akhir Periode", cashFlow.endingCash],
        ],
      );
      await recordExportLog("CASH_FLOW", "CSV", `${startDate}..${endDate}`);
      toast.success("Laporan Arus Kas berhasil diekspor ke CSV.");
      return;
    }

    const exportCsvRows = isAllAccounts
      ? allLedgers.flatMap((l) =>
          l.rows.map((r) => [
            formatDateID(r.journalDate),
            r.journalNumber,
            `${l.account.code} - ${l.account.name}`,
            r.projectCode ?? "-",
            r.description,
            r.debit,
            r.credit,
            r.runningBalance,
          ]),
        )
      : ledgerRows.map((r) => [
          formatDateID(r.journalDate),
          r.journalNumber,
          selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "-",
          r.projectCode ?? "-",
          r.description,
          r.debit,
          r.credit,
          r.runningBalance,
        ]);

    downloadCsvFile(
      `Buku_Besar_${selectedAccount?.code ?? "Kompilasi"}.csv`,
      [
        "Tanggal",
        "No. Jurnal",
        "Akun",
        "Proyek",
        "Uraian",
        "Debit",
        "Kredit",
        "Saldo Berjalan",
      ],
      exportCsvRows,
    );
    await recordExportLog("GENERAL_LEDGER", "CSV", `${startDate}..${endDate}`);
    toast.success("Buku Besar berhasil diekspor ke CSV.");
  } catch (err) {
    console.error("Gagal mengekspor laporan ke CSV:", err);
    toast.error("Gagal mengekspor laporan keuangan ke CSV.");
  }
}
