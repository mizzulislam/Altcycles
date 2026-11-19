import { toast } from "sonner";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  getLocalizedAccountName,
  getLocalizedAccountType,
  getLocalizedNormalBalance,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import { getActiveLanguage } from "@/lib/i18n";
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
  const lang = getActiveLanguage();
  const isEn = lang === "en";
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
        ? isEn
          ? `As of ${formatDateID(endDate)}`
          : `Per ${formatDateID(endDate)}`
        : isEn
          ? `${formatDateID(startDate)} to ${formatDateID(endDate)}`
          : `${formatDateID(startDate)} s.d. ${formatDateID(endDate)}`;

    let spec;
    let fileName = isEn ? "Financial_Report_Altcycles.pdf" : "Laporan_Keuangan_Altcycles.pdf";
    let successMsg = isEn
      ? "Financial report successfully downloaded in PDF (.pdf) format."
      : "Laporan keuangan berhasil diunduh dalam format PDF (.pdf).";

    if (mode === "ledger" || activeTab === "buku_besar") {
      const isAll = isAllAccounts;
      const targetAccounts = isAll
        ? allLedgers.map((l) => ({
            code: l.account.code,
            name: getLocalizedAccountName(l.account, lang),
            type: getLocalizedAccountType(l.account.account_type, lang),
            normalBalance: getLocalizedNormalBalance(l.account.normal_balance, lang),
            endingBalance: l.endingBalance,
            rows: l.rows.map((r) => ({
              date: formatDateID(r.journalDate),
              description: getLocalizedTransactionDescription(r.description, lang),
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
                name: getLocalizedAccountName(selectedAccount, lang),
                type: getLocalizedAccountType(selectedAccount.account_type, lang),
                normalBalance: getLocalizedNormalBalance(
                  selectedAccount.normal_balance,
                  lang,
                ),
                endingBalance: selectedLedgerEndingBalance,
                rows: ledgerRows.map((r) => ({
                  date: formatDateID(r.journalDate),
                  description: getLocalizedTransactionDescription(r.description, lang),
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
          ? `${selectedAccount.code} - ${getLocalizedAccountName(selectedAccount, lang)}`
          : undefined,
        isAllAccounts: isAll,
        accounts: targetAccounts,
        lang,
      });
      fileName = isEn ? "General_Ledger_Altcycles.pdf" : "Buku_Besar_Altcycles.pdf";
      successMsg = isEn
        ? "General Ledger successfully downloaded in PDF (.pdf) format."
        : "Buku Besar berhasil diunduh dalam format PDF (.pdf).";
    } else if (mode === "trial_balance" || activeTab === "neraca_saldo") {
      spec = buildTrialBalancePdfSpec({
        company: comp,
        periodLabel,
        isAdjusted: balanceType === "adjusted",
        isBalanced: trialBalance.sumEndingDebit === trialBalance.sumEndingCredit,
        rows: trialBalance.rows.map((r) => ({
          code: r.code,
          name: getLocalizedAccountName(r, lang),
          debit: r.endingDebit,
          credit: r.endingCredit,
        })),
        sumDebit: trialBalance.sumEndingDebit,
        sumCredit: trialBalance.sumEndingCredit,
        lang,
      });
      fileName = isEn ? "Trial_Balance_Altcycles.pdf" : "Neraca_Saldo_Altcycles.pdf";
      successMsg = isEn
        ? "Trial Balance successfully downloaded in PDF (.pdf) format."
        : "Neraca Saldo berhasil diunduh dalam format PDF (.pdf).";
    } else if (mode === "statements" && layoutMode === "grid") {
      const isRows = [
        ...incomeStatement.revenues.map((r) => [
          getLocalizedAccountName(r, lang),
          formatRupiah(r.amount),
        ]),
        [isEn ? "Total Operating Revenue" : "Total Pendapatan Usaha", formatRupiah(incomeStatement.totalRevenue)],
        ...incomeStatement.directExpenses.map((c) => [
          getLocalizedAccountName(c, lang),
          formatRupiah(c.amount),
        ]),
        [isEn ? "Gross Profit" : "Laba Kotor Proyek", formatRupiah(incomeStatement.grossProfit)],
        ...incomeStatement.sharedExpenses.map((o) => [
          getLocalizedAccountName(o, lang),
          formatRupiah(o.amount),
        ]),
        [isEn ? "Net Income (Loss)" : "Laba (Rugi) Bersih", formatRupiah(incomeStatement.netProfit)],
      ];
      const eqRows = [
        [isEn ? "Beginning Retained Earnings" : "Saldo Laba Ditahan Awal", formatRupiah(beginningRetainedEarnings)],
        [isEn ? "Current Net Income" : "Laba Bersih Berjalan", formatRupiah(incomeStatement.netProfit)],
        [isEn ? "Dividends / Drawings" : "Dividen / Prive", formatRupiah(dividends)],
        [isEn ? "Ending Retained Earnings" : "Saldo Laba Ditahan Akhir", formatRupiah(endingRetainedEarnings)],
      ];
      const bsRows = [
        ...balanceSheet.assets.map((a) => [
          getLocalizedAccountName(a, lang),
          formatRupiah(a.amount),
        ]),
        [isEn ? "Total Assets" : "Total Aset", formatRupiah(balanceSheet.totalAssets)],
        ...balanceSheet.liabilities.map((l) => [
          getLocalizedAccountName(l, lang),
          formatRupiah(l.amount),
        ]),
        [isEn ? "Total Liabilities" : "Total Liabilitas", formatRupiah(totalLiabilities)],
        ...balanceSheet.equities.map((e) => [
          getLocalizedAccountName(e, lang),
          formatRupiah(e.amount),
        ]),
        [isEn ? "Total Liabilities & Equity" : "Total Liabilitas & Ekuitas", formatRupiah(balanceSheet.totalLiabilitiesAndEquity)],
      ];
      const cfRows = [
        [isEn ? "Beginning Cash Balance" : "Saldo Kas Awal", formatRupiah(cashFlow.beginningCash)],
        [isEn ? "Net Cash from Operating Activities" : "Kas Bersih dari Aktivitas Operasi", formatRupiah(cashFlow.netOperating)],
        [isEn ? "Net Cash from Investing Activities" : "Kas Bersih dari Aktivitas Investasi", formatRupiah(cashFlow.netInvesting)],
        [isEn ? "Net Cash from Financing Activities" : "Kas Bersih dari Aktivitas Pendanaan", formatRupiah(cashFlow.netFinancing)],
        [isEn ? "Ending Cash Balance" : "Saldo Kas Akhir", formatRupiah(cashFlow.endingCash)],
      ];
      spec = buildCompleteFinancialStatementsPdfSpec({
        company: comp,
        periodLabel,
        incomeStatementRows: isRows,
        retainedEarningsRows: eqRows,
        balanceSheetRows: bsRows,
        cashFlowRows: cfRows,
        lang,
      });
      fileName = isEn ? "Complete_Financial_Statements_Altcycles.pdf" : "Laporan_Keuangan_Lengkap_Altcycles.pdf";
      successMsg = isEn
        ? "Complete Financial Statements successfully downloaded in PDF (.pdf) format."
        : "Laporan Keuangan Lengkap berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "laba_rugi") {
      spec = buildIncomeStatementPdfSpec({
        company: comp,
        periodLabel,
        revenueRows: incomeStatement.revenues.map((r) => ({
          label: `${r.code} - ${getLocalizedAccountName(r, lang)}`,
          amount: r.amount,
        })),
        totalRevenue: incomeStatement.totalRevenue,
        cogsRows: incomeStatement.directExpenses.map((c) => ({
          label: `${c.code} - ${getLocalizedAccountName(c, lang)}`,
          amount: c.amount,
        })),
        grossProfit: incomeStatement.grossProfit,
        opexRows: incomeStatement.sharedExpenses.map((o) => ({
          label: `${o.code} - ${getLocalizedAccountName(o, lang)}`,
          amount: o.amount,
        })),
        totalOpex: incomeStatement.totalSharedExpense,
        netIncome: incomeStatement.netProfit,
        lang,
      });
      fileName = isEn ? "Income_Statement_Altcycles.pdf" : "Laba_Rugi_Altcycles.pdf";
      successMsg = isEn
        ? "Statement of Profit or Loss successfully downloaded in PDF (.pdf) format."
        : "Laporan Laba Rugi berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "ekuitas") {
      spec = buildRetainedEarningsPdfSpec({
        company: comp,
        periodLabel,
        rows: [
          {
            label: isEn ? "Beginning Retained Earnings" : "Saldo Laba Ditahan Awal Periode",
            amount: beginningRetainedEarnings,
          },
          {
            label: isEn ? "Net Income (Loss) for the Period" : "Laba (Rugi) Bersih Periode Berjalan",
            amount: incomeStatement.netProfit,
          },
          {
            label: isEn ? "Dividends / Owner Withdrawals (Drawings)" : "Dividen / Penarikan Modal Pemilik (Prive)",
            amount: -Math.abs(dividends),
          },
        ],
        endingRetainedEarnings,
        lang,
      });
      fileName = isEn ? "Statement_of_Changes_in_Equity_Altcycles.pdf" : "Perubahan_Ekuitas_Altcycles.pdf";
      successMsg = isEn
        ? "Statement of Changes in Equity successfully downloaded in PDF (.pdf) format."
        : "Laporan Perubahan Ekuitas berhasil diunduh dalam format PDF (.pdf).";
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
          label: `${a.code} - ${getLocalizedAccountName(a, lang)}`,
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
          label: `${l.code} - ${getLocalizedAccountName(l, lang)}`,
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
            label: `${e.code} - ${getLocalizedAccountName(e, lang)}`,
            amount: e.amount,
          })),
          {
            label: isEn ? "Current Unclosed Net Income (Loss)" : "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            amount: balanceSheet.currentUnclosedEarnings,
          },
        ],
        totalEquity: totalEquity,
        totalLiabilitiesAndEquity: balanceSheet.totalLiabilitiesAndEquity,
        lang,
      });
      fileName = isEn ? "Statement_of_Financial_Position_Altcycles.pdf" : "Posisi_Keuangan_Neraca_Altcycles.pdf";
      successMsg = isEn
        ? "Statement of Financial Position (Balance Sheet) successfully downloaded in PDF (.pdf) format."
        : "Laporan Posisi Keuangan (Neraca) berhasil diunduh dalam format PDF (.pdf).";
    } else if (activeTab === "arus_kas") {
      spec = buildCashFlowPdfSpec({
        company: comp,
        periodLabel,
        operatingRows: [
          {
            label: isEn ? "Cash Receipts from Customers & Clients" : "Penerimaan Kas dari Pelanggan & Klien",
            amount: cashFlow.operatingInflow,
          },
          {
            label: isEn ? "Cash Payments for Operating Expenses & Vendors" : "Pembayaran Kas untuk Beban Operasional & Vendor",
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
        lang,
      });
      fileName = isEn ? "Statement_of_Cash_Flows_Altcycles.pdf" : "Arus_Kas_Altcycles.pdf";
      successMsg = isEn
        ? "Statement of Cash Flows successfully downloaded in PDF (.pdf) format."
        : "Laporan Arus Kas berhasil diunduh dalam format PDF (.pdf).";
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
    toast.error(
      isEn
        ? "Failed to generate financial report PDF file."
        : "Gagal membuat berkas PDF laporan keuangan.",
    );
  }
}

export async function exportReportToExcel(data: ReportExportData): Promise<void> {
  const lang = getActiveLanguage();
  const isEn = lang === "en";
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
        fileName: isEn ? `Balance_Sheet_${endDate}.xlsx` : `Neraca_${endDate}.xlsx`,
        sheetName: isEn ? "Balance Sheet" : "Neraca",
        columns: isEn
          ? [
              { header: "Category", width: 28 },
              { header: "Code / Project", width: 18 },
              { header: "Account / Project Name", width: 34 },
              { header: "Amount (IDR)", width: 20 },
            ]
          : [
              { header: "Kelompok", width: 28 },
              { header: "Kode / Proyek", width: 18 },
              { header: "Nama Akun / Proyek", width: 34 },
              { header: "Nominal (Rp)", width: 20 },
            ],
        rows: [
          ...balanceSheet.assets.map((a) => [
            isEn ? "Assets" : "Aset",
            a.code,
            getLocalizedAccountName(a, lang),
            a.amount,
          ]),
          ...balanceSheet.contractAssets.map((ca) => [
            isEn ? "Contract Assets" : "Aset Kontrak",
            ca.projectCode,
            ca.projectName,
            ca.netContractPosition,
          ]),
          [isEn ? "TOTAL ASSETS" : "TOTAL ASET", "", "", balanceSheet.totalAssets],
          ...balanceSheet.liabilities.map((l) => [
            isEn ? "Liabilities" : "Liabilitas",
            l.code,
            getLocalizedAccountName(l, lang),
            l.amount,
          ]),
          ...balanceSheet.contractLiabilities.map((cl) => [
            isEn ? "Contract Liabilities" : "Liabilitas Kontrak",
            cl.projectCode,
            cl.projectName,
            Math.abs(cl.netContractPosition),
          ]),
          ...balanceSheet.equities.map((e) => [
            isEn ? "Equity" : "Ekuitas",
            e.code,
            getLocalizedAccountName(e, lang),
            e.amount,
          ]),
          [
            isEn ? "Equity" : "Ekuitas",
            "-",
            isEn
              ? "Current Period Net Income (Unclosed)"
              : "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            balanceSheet.currentUnclosedEarnings,
          ],
          [
            isEn ? "TOTAL LIABILITIES & EQUITY" : "TOTAL LIABILITAS + EKUITAS",
            "",
            "",
            balanceSheet.totalLiabilitiesAndEquity,
          ],
        ],
      });
      await recordExportLog("BALANCE_SHEET", "EXCEL", endDate);
      toast.success(
        isEn
          ? "Balance sheet exported to Excel successfully."
          : "Neraca berhasil diekspor ke Excel.",
      );
      return;
    }

    if (activeTab === "laba_rugi") {
      await downloadExcelSheet({
        fileName: isEn
          ? `Income_Statement_${startDate}_${endDate}.xlsx`
          : `Laba_Rugi_${startDate}_${endDate}.xlsx`,
        sheetName: isEn ? "Income Statement" : "Laba Rugi",
        columns: isEn
          ? [
              { header: "Category", width: 26 },
              { header: "Account Code", width: 14 },
              { header: "Account Name", width: 34 },
              { header: "Amount (IDR)", width: 20 },
            ]
          : [
              { header: "Kategori", width: 26 },
              { header: "Kode Akun", width: 14 },
              { header: "Nama Akun", width: 34 },
              { header: "Nominal (Rp)", width: 20 },
            ],
        rows: [
          ...incomeStatement.revenues.map((r) => [
            isEn ? "Revenue" : "Pendapatan",
            r.code,
            getLocalizedAccountName(r, lang),
            r.amount,
          ]),
          [isEn ? "Subtotal Operating Revenue" : "Subtotal Pendapatan", "", "", incomeStatement.totalRevenue],
          ...incomeStatement.directExpenses.map((e) => [
            isEn ? "Direct Costs" : "Beban Langsung",
            e.code,
            getLocalizedAccountName(e, lang),
            e.amount,
          ]),
          [isEn ? "Gross Profit" : "Laba Kotor", "", "", incomeStatement.grossProfit],
          ...incomeStatement.sharedExpenses.map((s) => [
            isEn ? "Operating Expenses" : "Beban Bersama",
            s.code,
            getLocalizedAccountName(s, lang),
            s.amount,
          ]),
          [isEn ? "NET INCOME (LOSS)" : "LABA BERSIH", "", "", incomeStatement.netProfit],
        ],
      });
      await recordExportLog("INCOME_STATEMENT", "EXCEL", `${startDate}..${endDate}`);
      toast.success(
        isEn
          ? "Income statement exported to Excel successfully."
          : "Laporan Laba Rugi berhasil diekspor ke Excel.",
      );
      return;
    }

    if (activeTab === "ekuitas") {
      await downloadExcelSheet({
        fileName: isEn
          ? `Equity_Changes_${startDate}_${endDate}.xlsx`
          : `Perubahan_Ekuitas_${startDate}_${endDate}.xlsx`,
        sheetName: isEn ? "Equity Changes" : "Perubahan Ekuitas",
        columns: isEn
          ? [
              { header: "Equity Component", width: 38 },
              { header: "Amount (IDR)", width: 22 },
            ]
          : [
              { header: "Komponen Ekuitas", width: 38 },
              { header: "Nominal (Rp)", width: 22 },
            ],
        rows: [
          [isEn ? "Beginning Retained Earnings" : "Saldo Laba Ditahan Awal Periode", beginningRetainedEarnings],
          [isEn ? "Add: Net Income for the Period" : "Ditambah: Laba Bersih Periode Berjalan", incomeStatement.netProfit],
          [isEn ? "Less: Owner Withdrawals / Dividends" : "Dikurangi: Prive Pemilik (Dividen)", -dividends],
          [isEn ? "Ending Retained Earnings" : "Saldo Laba Ditahan Akhir Periode", endingRetainedEarnings],
          [isEn ? "Owner Paid-in Capital" : "Modal Disetor Pemilik", modalDisetorBalance],
          [isEn ? "TOTAL ENDING EQUITY" : "TOTAL EKUITAS AKHIR PERIODE", totalEndingEquity],
        ],
      });
      await recordExportLog("EQUITY_STATEMENT", "EXCEL", `${startDate}..${endDate}`);
      toast.success(
        isEn
          ? "Statement of changes in equity exported to Excel successfully."
          : "Laporan Perubahan Ekuitas berhasil diekspor ke Excel.",
      );
      return;
    }

    if (activeTab === "neraca_saldo") {
      await downloadExcelSheet({
        fileName: isEn ? `Trial_Balance_${endDate}.xlsx` : `Neraca_Saldo_${endDate}.xlsx`,
        sheetName: isEn ? "Trial Balance" : "Neraca Saldo",
        columns: isEn
          ? [
              { header: "Account Code", width: 14 },
              { header: "Account Name", width: 32 },
              { header: "Group", width: 16 },
              { header: "Debit Mutation", width: 18 },
              { header: "Credit Mutation", width: 18 },
              { header: "Ending Debit", width: 18 },
              { header: "Ending Credit", width: 18 },
            ]
          : [
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
          getLocalizedAccountName(r, lang),
          getLocalizedAccountType(r.accountType, lang),
          r.totalDebit,
          r.totalCredit,
          r.endingDebit,
          r.endingCredit,
        ]),
      });
      await recordExportLog("TRIAL_BALANCE", "EXCEL", endDate);
      toast.success(
        isEn
          ? "Trial balance exported to Excel successfully."
          : "Neraca Saldo berhasil diekspor ke Excel.",
      );
      return;
    }

    if (activeTab === "arus_kas") {
      await downloadExcelSheet({
        fileName: isEn
          ? `Cash_Flow_${startDate}_${endDate}.xlsx`
          : `Arus_Kas_${startDate}_${endDate}.xlsx`,
        sheetName: isEn ? "Cash Flows" : "Arus Kas",
        columns: isEn
          ? [
              { header: "Cash Flow Component Description", width: 38 },
              { header: "Amount (IDR)", width: 22 },
            ]
          : [
              { header: "Uraian Komponen Arus Kas", width: 38 },
              { header: "Nominal (Rp)", width: 22 },
            ],
        rows: [
          [isEn ? "Beginning Cash Balance" : "Saldo Kas Awal Periode", cashFlow.beginningCash],
          [isEn ? "Operating Cash Inflows" : "Penerimaan Kas Aktivitas Operasi", cashFlow.operatingInflow],
          [isEn ? "Operating Cash Outflows" : "Pengeluaran Kas Aktivitas Operasi", -cashFlow.operatingOutflow],
          [isEn ? "Net Cash from Operating Activities" : "Arus Kas Bersih Aktivitas Operasi", cashFlow.netOperating],
          [isEn ? "Net Cash from Investing Activities" : "Arus Kas Bersih Aktivitas Investasi", cashFlow.netInvesting],
          [isEn ? "Net Cash from Financing Activities" : "Arus Kas Bersih Aktivitas Pendanaan", cashFlow.netFinancing],
          [isEn ? "Net Change in Cash" : "Perubahan Bersih Kas", cashFlow.netChangeInCash],
          [isEn ? "Ending Cash Balance" : "Saldo Kas Akhir Periode", cashFlow.endingCash],
        ],
      });
      await recordExportLog("CASH_FLOW", "EXCEL", `${startDate}..${endDate}`);
      toast.success(
        isEn
          ? "Statement of cash flows exported to Excel successfully."
          : "Laporan Arus Kas berhasil diekspor ke Excel.",
      );
      return;
    }

    // Buku Besar
    const exportRows = isAllAccounts
      ? allLedgers.flatMap((l) =>
          l.rows.map((r) => [
            formatDateID(r.journalDate),
            r.journalNumber,
            `${l.account.code} - ${getLocalizedAccountName(l.account, lang)}`,
            r.projectCode ?? "-",
            getLocalizedTransactionDescription(r.description, lang),
            r.debit,
            r.credit,
            r.runningBalance,
          ]),
        )
      : ledgerRows.map((r) => [
          formatDateID(r.journalDate),
          r.journalNumber,
          selectedAccount
            ? `${selectedAccount.code} - ${getLocalizedAccountName(selectedAccount, lang)}`
            : "-",
          r.projectCode ?? "-",
          getLocalizedTransactionDescription(r.description, lang),
          r.debit,
          r.credit,
          r.runningBalance,
        ]);

    await downloadExcelSheet({
      fileName: isEn
        ? `General_Ledger_${selectedAccount ? selectedAccount.code : "Compilation"}_${endDate}.xlsx`
        : `Buku_Besar_${selectedAccount ? selectedAccount.code : "Kompilasi"}_${endDate}.xlsx`,
      sheetName: isEn ? "General Ledger" : "Buku Besar",
      columns: isEn
        ? [
            { header: "Date", width: 14 },
            { header: "Journal No.", width: 20 },
            { header: "Account", width: 28 },
            { header: "Project", width: 16 },
            { header: "Description", width: 36 },
            { header: "Debit", width: 18 },
            { header: "Credit", width: 18 },
            { header: "Running Balance", width: 20 },
          ]
        : [
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
    toast.success(
      isEn
        ? "General ledger exported to Excel successfully."
        : "Buku Besar berhasil diekspor ke Excel.",
    );
  } catch (err) {
    console.error("Gagal mengekspor laporan ke Excel:", err);
    toast.error(
      isEn
        ? "Failed to export financial report to Excel."
        : "Gagal mengekspor laporan keuangan ke Excel.",
    );
  }
}

export async function exportReportToCsv(data: ReportExportData): Promise<void> {
  const lang = getActiveLanguage();
  const isEn = lang === "en";
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
      downloadCsvFile(
        isEn ? `Balance_Sheet_SAK_${endDate}.csv` : `Neraca_SAK_${endDate}.csv`,
        isEn
          ? ["Category", "Code / Project", "Account / Project Name", "Amount"]
          : ["Kelompok", "Kode / Proyek", "Nama Akun / Proyek", "Nominal"],
        [
          ...balanceSheet.assets.map((a) => [
            isEn ? "Assets" : "Aset",
            a.code,
            getLocalizedAccountName(a, lang),
            a.amount,
          ]),
          ...balanceSheet.contractAssets.map((ca) => [
            isEn ? "Contract Assets" : "Aset Kontrak",
            ca.projectCode,
            ca.projectName,
            ca.netContractPosition,
          ]),
          [isEn ? "TOTAL ASSETS" : "TOTAL ASET", "", "", balanceSheet.totalAssets],
          ...balanceSheet.liabilities.map((l) => [
            isEn ? "Liabilities" : "Liabilitas",
            l.code,
            getLocalizedAccountName(l, lang),
            l.amount,
          ]),
          ...balanceSheet.contractLiabilities.map((cl) => [
            isEn ? "Contract Liabilities" : "Liabilitas Kontrak",
            cl.projectCode,
            cl.projectName,
            Math.abs(cl.netContractPosition),
          ]),
          ...balanceSheet.equities.map((e) => [
            isEn ? "Equity" : "Ekuitas",
            e.code,
            getLocalizedAccountName(e, lang),
            e.amount,
          ]),
          [
            isEn ? "Equity" : "Ekuitas",
            "-",
            isEn
              ? "Current Period Net Income (Unclosed)"
              : "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            balanceSheet.currentUnclosedEarnings,
          ],
          [
            isEn ? "TOTAL LIABILITIES & EQUITY" : "TOTAL LIABILITAS + EKUITAS",
            "",
            "",
            balanceSheet.totalLiabilitiesAndEquity,
          ],
        ],
      );
      await recordExportLog("BALANCE_SHEET", "CSV", endDate);
      toast.success(
        isEn
          ? "Balance sheet exported to CSV successfully."
          : "Neraca berhasil diekspor ke CSV.",
      );
      return;
    }

    if (activeTab === "laba_rugi") {
      downloadCsvFile(
        isEn
          ? `Income_Statement_${startDate}_${endDate}.csv`
          : `Laba_Rugi_${startDate}_${endDate}.csv`,
        isEn
          ? ["Category", "Account Code", "Account Name", "Amount"]
          : ["Kategori", "Kode Akun", "Nama Akun", "Nominal"],
        [
          ...incomeStatement.revenues.map((r) => [
            isEn ? "Revenue" : "Pendapatan",
            r.code,
            getLocalizedAccountName(r, lang),
            r.amount,
          ]),
          [isEn ? "Subtotal Operating Revenue" : "Subtotal Pendapatan", "", "", incomeStatement.totalRevenue],
          ...incomeStatement.directExpenses.map((e) => [
            isEn ? "Direct Costs" : "Beban Langsung",
            e.code,
            getLocalizedAccountName(e, lang),
            e.amount,
          ]),
          [isEn ? "Gross Profit" : "Laba Kotor", "", "", incomeStatement.grossProfit],
          ...incomeStatement.sharedExpenses.map((s) => [
            isEn ? "Operating Expenses" : "Beban Bersama",
            s.code,
            getLocalizedAccountName(s, lang),
            s.amount,
          ]),
          [isEn ? "NET INCOME (LOSS)" : "LABA BERSIH", "", "", incomeStatement.netProfit],
        ],
      );
      await recordExportLog("INCOME_STATEMENT", "CSV", `${startDate}..${endDate}`);
      toast.success(
        isEn
          ? "Income statement exported to CSV successfully."
          : "Laporan Laba Rugi berhasil diekspor ke CSV.",
      );
      return;
    }

    if (activeTab === "ekuitas") {
      downloadCsvFile(
        isEn
          ? `Equity_Changes_${startDate}_${endDate}.csv`
          : `Perubahan_Ekuitas_${startDate}_${endDate}.csv`,
        isEn
          ? ["Equity Component", "Amount"]
          : ["Komponen Ekuitas", "Nominal"],
        [
          [isEn ? "Beginning Retained Earnings" : "Saldo Laba Ditahan Awal Periode", beginningRetainedEarnings],
          [isEn ? "Add: Net Income for the Period" : "Ditambah: Laba Bersih Periode Berjalan", incomeStatement.netProfit],
          [isEn ? "Less: Owner Withdrawals / Dividends" : "Dikurangi: Prive Pemilik (Dividen)", -dividends],
          [isEn ? "Ending Retained Earnings" : "Saldo Laba Ditahan Akhir Periode", endingRetainedEarnings],
          [isEn ? "Owner Paid-in Capital" : "Modal Disetor Pemilik", modalDisetorBalance],
          [isEn ? "TOTAL ENDING EQUITY" : "TOTAL EKUITAS AKHIR PERIODE", totalEndingEquity],
        ],
      );
      await recordExportLog("EQUITY_STATEMENT", "CSV", `${startDate}..${endDate}`);
      toast.success(
        isEn
          ? "Statement of changes in equity exported to CSV successfully."
          : "Laporan Perubahan Ekuitas berhasil diekspor ke CSV.",
      );
      return;
    }

    if (activeTab === "neraca_saldo") {
      downloadCsvFile(
        isEn ? `Trial_Balance_${endDate}.csv` : `Neraca_Saldo_${endDate}.csv`,
        isEn
          ? [
              "Account Code",
              "Account Name",
              "Group",
              "Debit Mutation",
              "Credit Mutation",
              "Ending Debit",
              "Ending Credit",
            ]
          : [
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
          getLocalizedAccountName(r, lang),
          getLocalizedAccountType(r.accountType, lang),
          r.totalDebit,
          r.totalCredit,
          r.endingDebit,
          r.endingCredit,
        ]),
      );
      await recordExportLog("TRIAL_BALANCE", "CSV", endDate);
      toast.success(
        isEn
          ? "Trial balance exported to CSV successfully."
          : "Neraca Saldo berhasil diekspor ke CSV.",
      );
      return;
    }

    if (activeTab === "arus_kas") {
      downloadCsvFile(
        isEn
          ? `Cash_Flow_${startDate}_${endDate}.csv`
          : `Arus_Kas_${startDate}_${endDate}.csv`,
        isEn
          ? ["Cash Flow Component Description", "Amount"]
          : ["Uraian Komponen Arus Kas", "Nominal"],
        [
          [isEn ? "Beginning Cash Balance" : "Saldo Kas Awal Periode", cashFlow.beginningCash],
          [isEn ? "Operating Cash Inflows" : "Penerimaan Kas Aktivitas Operasi", cashFlow.operatingInflow],
          [isEn ? "Operating Cash Outflows" : "Pengeluaran Kas Aktivitas Operasi", -cashFlow.operatingOutflow],
          [isEn ? "Net Cash from Operating Activities" : "Arus Kas Bersih Aktivitas Operasi", cashFlow.netOperating],
          [isEn ? "Net Cash from Investing Activities" : "Arus Kas Bersih Aktivitas Investasi", cashFlow.netInvesting],
          [isEn ? "Net Cash from Financing Activities" : "Arus Kas Bersih Aktivitas Pendanaan", cashFlow.netFinancing],
          [isEn ? "Net Change in Cash" : "Perubahan Bersih Kas", cashFlow.netChangeInCash],
          [isEn ? "Ending Cash Balance" : "Saldo Kas Akhir Periode", cashFlow.endingCash],
        ],
      );
      await recordExportLog("CASH_FLOW", "CSV", `${startDate}..${endDate}`);
      toast.success(
        isEn
          ? "Statement of cash flows exported to CSV successfully."
          : "Laporan Arus Kas berhasil diekspor ke CSV.",
      );
      return;
    }

    const exportCsvRows = isAllAccounts
      ? allLedgers.flatMap((l) =>
          l.rows.map((r) => [
            formatDateID(r.journalDate),
            r.journalNumber,
            `${l.account.code} - ${getLocalizedAccountName(l.account, lang)}`,
            r.projectCode ?? "-",
            getLocalizedTransactionDescription(r.description, lang),
            r.debit,
            r.credit,
            r.runningBalance,
          ]),
        )
      : ledgerRows.map((r) => [
          formatDateID(r.journalDate),
          r.journalNumber,
          selectedAccount
            ? `${selectedAccount.code} - ${getLocalizedAccountName(selectedAccount, lang)}`
            : "-",
          r.projectCode ?? "-",
          getLocalizedTransactionDescription(r.description, lang),
          r.debit,
          r.credit,
          r.runningBalance,
        ]);

    downloadCsvFile(
      isEn
        ? `General_Ledger_${selectedAccount?.code ?? "Compilation"}.csv`
        : `Buku_Besar_${selectedAccount?.code ?? "Kompilasi"}.csv`,
      isEn
        ? [
            "Date",
            "Journal No.",
            "Account",
            "Project",
            "Description",
            "Debit",
            "Credit",
            "Running Balance",
          ]
        : [
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
    toast.success(
      isEn
        ? "General ledger exported to CSV successfully."
        : "Buku Besar berhasil diekspor ke CSV.",
    );
  } catch (err) {
    console.error("Gagal mengekspor laporan ke CSV:", err);
    toast.error(
      isEn
        ? "Failed to export financial report to CSV."
        : "Gagal mengekspor laporan keuangan ke CSV.",
    );
  }
}
