import * as React from "react";
import { AccountingPrintLayout } from "@/features/accounting/components/accounting-print-layout";
import {
  formatDateID,
  formatRupiah,
} from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedAccountType,
  getLocalizedNormalBalance,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import type {
  AccountRow,
  CompanyProfileRow,
} from "@/types/database.types";
import type { ActiveReportTab } from "../reports-page";
import type { IncomeStatementData } from "./income-statement-view";
import type { BalanceSheetData } from "./balance-sheet-view";
import type { CashFlowData } from "./cash-flow-view";
import type { TrialBalanceData } from "./trial-balance-view";
import type { AccountLedgerData, LedgerRowData } from "./general-ledger-view";

interface ReportsPrintContentProps {
  company: CompanyProfileRow | null;
  activeTab: ActiveReportTab;
  mode: "all" | "ledger" | "trial_balance" | "statements";
  layoutMode: "grid" | "single" | "sheet";
  startDate: string;
  endDate: string;
  isAllAccounts: boolean;
  allLedgers: AccountLedgerData[];
  selectedAccount?: AccountRow;
  postableAccounts: AccountRow[];
  selectedLedgerEndingBalance: number;
  ledgerRows: LedgerRowData[];
  trialBalance: TrialBalanceData;
  balanceType: "adjusted" | "unadjusted";
  isBalanced: boolean;
  incomeStatement: IncomeStatementData;
  beginningRetainedEarnings: number;
  netIncome: number;
  dividends: number;
  endingRetainedEarnings: number;
  modalDisetorBalance: number;
  totalEndingEquity: number;
  currentAssets: Array<{ code: string; name: string; amount: number }>;
  fixedAssets: Array<{ code: string; name: string; amount: number }>;
  totalCurrentAssets: number;
  totalFixedAssets: number;
  currentLiabilities: Array<{ code: string; name: string; amount: number }>;
  longTermLiabilities: Array<{ code: string; name: string; amount: number }>;
  totalCurrentLiabilities: number;
  totalLongTermLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
}

export function ReportsPrintContent({
  company,
  activeTab,
  mode,
  layoutMode,
  startDate,
  endDate,
  isAllAccounts,
  allLedgers,
  selectedAccount,
  postableAccounts,
  selectedLedgerEndingBalance,
  ledgerRows,
  trialBalance,
  balanceType,
  isBalanced,
  incomeStatement,
  beginningRetainedEarnings,
  netIncome,
  dividends,
  endingRetainedEarnings,
  modalDisetorBalance,
  totalEndingEquity,
  currentAssets,
  fixedAssets,
  totalCurrentAssets,
  totalFixedAssets,
  currentLiabilities,
  longTermLiabilities,
  totalCurrentLiabilities,
  totalLongTermLiabilities,
  totalLiabilities,
  totalEquity,
  balanceSheet,
  cashFlow,
}: ReportsPrintContentProps) {
  const { language: lang } = useLanguage();
  const isEn = lang === "en";
  const printAreaId = "accounting-reports-print";
  const printPeriodLabel =
    activeTab === "neraca" && mode !== "ledger" && mode !== "trial_balance"
      ? isEn
        ? `As of ${formatDateID(endDate)}`
        : `Per ${formatDateID(endDate)}`
      : isEn
        ? `${formatDateID(startDate)} to ${formatDateID(endDate)}`
        : `${formatDateID(startDate)} s.d. ${formatDateID(endDate)}`;

  let printDocTitle = isEn ? "FINANCIAL REPORTS" : "LAPORAN KEUANGAN";
  let printDocSubtitle: string | undefined = undefined;

  if (mode === "ledger" || activeTab === "buku_besar") {
    printDocTitle = isEn ? "GENERAL LEDGER" : "BUKU BESAR (GENERAL LEDGER)";
    printDocSubtitle = isAllAccounts
      ? isEn
        ? "All General Ledger Accounts"
        : "Semua Akun Buku Besar"
      : `${selectedAccount?.code ?? ""} - ${selectedAccount ? getLocalizedAccountName(selectedAccount, lang) : ""}`;
  } else if (mode === "trial_balance" || activeTab === "neraca_saldo") {
    printDocTitle = isEn ? "TRIAL BALANCE" : "NERACA SALDO (TRIAL BALANCE)";
    printDocSubtitle =
      balanceType === "unadjusted"
        ? isEn
          ? "Unadjusted Trial Balance"
          : "Sebelum Penyesuaian"
        : isEn
          ? "Adjusted Trial Balance"
          : "Setelah Penyesuaian";
  } else if (mode === "statements") {
    if (layoutMode === "grid") {
      printDocTitle = isEn ? "COMPLETE FINANCIAL STATEMENTS" : "LAPORAN KEUANGAN LENGKAP";
      printDocSubtitle = isEn
        ? "Income Statement, Statement of Changes in Equity, Balance Sheet, and Cash Flow Statement"
        : "Laporan Laba Rugi, Perubahan Ekuitas, Neraca, dan Arus Kas";
    } else {
      if (activeTab === "laba_rugi") {
        printDocTitle = isEn ? "STATEMENT OF PROFIT OR LOSS" : "LAPORAN LABA RUGI BASIS AKRUAL";
        printDocSubtitle = isEn ? "Operating Revenue and Expenses" : "Pendapatan Usaha dan Beban";
      } else if (activeTab === "ekuitas") {
        printDocTitle = isEn ? "STATEMENT OF CHANGES IN EQUITY" : "LAPORAN PERUBAHAN EKUITAS";
        printDocSubtitle = isEn ? "Paid-in Capital and Retained Earnings" : "Modal Disetor dan Saldo Laba Ditahan";
      } else if (activeTab === "neraca") {
        printDocTitle = isEn ? "STATEMENT OF FINANCIAL POSITION" : "LAPORAN POSISI KEUANGAN (NERACA)";
        printDocSubtitle = isEn
          ? `Position of Assets, Liabilities, and Equity as of ${formatDateID(endDate)}`
          : `Posisi Aset, Liabilitas, dan Ekuitas per ${formatDateID(endDate)}`;
      } else if (activeTab === "arus_kas") {
        printDocTitle = isEn ? "STATEMENT OF CASH FLOWS" : "LAPORAN ARUS KAS METODE LANGSUNG";
        printDocSubtitle = isEn
          ? "Operating, Investing, and Financing Activities"
          : "Aktivitas Operasi, Investasi, dan Pendanaan";
      }
    }
  }

  const renderPrintAmount = (amount: number, isParenthesis = false) => {
    if (amount === 0) return <span style={{ color: "#94a3b8" }}>-</span>;
    const absVal = Math.abs(amount);
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(absVal);
    const isNegative = amount < 0 || isParenthesis;

    return (
      <div className="print-amount-row">
        <span className="print-currency">{isNegative ? "(Rp" : "Rp"}</span>
        <span className="print-val">
          {formatted}
          {isNegative ? ")" : ""}
        </span>
      </div>
    );
  };

  const renderPrintIncomeStatement = () => (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: "11px",
          color: "#0B43C8",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {isEn ? "Statement of Profit or Loss (Accrual Basis)" : "Laporan Laba Rugi Basis Akrual"}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "72%" }} />
          <col style={{ width: "28%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: "8px" }}>
              {isEn ? "Component / Description" : "Komponen / Keterangan"}
            </th>
            <th style={{ textAlign: "right", paddingRight: "8px" }}>
              {isEn ? "Amount" : "Nominal"}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td colSpan={2} style={{ color: "#0f172a" }}>
              {isEn ? "OPERATING REVENUE" : "PENDAPATAN USAHA"}
            </td>
          </tr>
          {incomeStatement.revenues.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn
                  ? "No revenue recognized in this date range."
                  : "Belum ada pendapatan diakui pada rentang tanggal ini."}
              </td>
            </tr>
          ) : (
            incomeStatement.revenues.map((r) => (
              <tr key={r.code}>
                <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(r, lang)}</td>
                <td>{renderPrintAmount(r.amount)}</td>
              </tr>
            ))
          )}
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td>{isEn ? "Total Operating Revenue" : "Total Pendapatan Usaha"}</td>
            <td>{renderPrintAmount(incomeStatement.totalRevenue)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td colSpan={2} style={{ color: "#0f172a" }}>
              {isEn ? "DIRECT PROJECT COSTS" : "BEBAN LANGSUNG PROYEK"}
            </td>
          </tr>
          {incomeStatement.directExpenses.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn
                  ? "No direct project costs in this period."
                  : "Belum ada beban langsung proyek pada periode ini."}
              </td>
            </tr>
          ) : (
            incomeStatement.directExpenses.map((e) => (
              <tr key={e.code}>
                <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(e, lang)}</td>
                <td>{renderPrintAmount(e.amount, true)}</td>
              </tr>
            ))
          )}
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td>{isEn ? "Project Gross Profit" : "Laba Kotor Proyek"}</td>
            <td>{renderPrintAmount(incomeStatement.grossProfit)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td colSpan={2} style={{ color: "#0f172a" }}>
              {isEn ? "SHARED OPERATING EXPENSES" : "BEBAN OPERASIONAL BERSAMA"}
            </td>
          </tr>
          {incomeStatement.sharedExpenses.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn
                  ? "No shared operating expenses in this period."
                  : "Belum ada beban operasional bersama pada periode ini."}
              </td>
            </tr>
          ) : (
            incomeStatement.sharedExpenses.map((s) => (
              <tr key={s.code}>
                <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(s, lang)}</td>
                <td>{renderPrintAmount(s.amount, true)}</td>
              </tr>
            ))
          )}
          <tr
            style={{
              backgroundColor: "#e2e8f0",
              fontWeight: 800,
              borderTop: "2px solid #94a3b8",
              borderBottom: "3px double #0f172a",
            }}
          >
            <td style={{ color: "#0f172a" }}>
              {isEn ? "NET INCOME (LOSS) FOR THE PERIOD" : "LABA (RUGI) BERSIH PERIODE BERJALAN"}
            </td>
            <td>{renderPrintAmount(incomeStatement.netProfit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPrintRetainedEarnings = () => (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: "11px",
          color: "#0B43C8",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {isEn ? "Statement of Changes in Equity" : "Laporan Perubahan Ekuitas"}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "72%" }} />
          <col style={{ width: "28%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: "8px" }}>
              {isEn ? "Equity Component" : "Komponen Ekuitas"}
            </th>
            <th style={{ textAlign: "right", paddingRight: "8px" }}>
              {isEn ? "Amount" : "Nominal"}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {isEn
                ? "Beginning Retained Earnings"
                : "Saldo Awal Laba Ditahan (Retained Earnings Awal)"}
            </td>
            <td>{renderPrintAmount(beginningRetainedEarnings)}</td>
          </tr>
          <tr>
            <td style={{ paddingLeft: "16px" }}>
              {isEn ? "Net Income (Loss) for the Period" : "Laba (Rugi) Bersih Periode Berjalan"}
            </td>
            <td>{renderPrintAmount(netIncome)}</td>
          </tr>
          <tr>
            <td style={{ paddingLeft: "16px" }}>
              {isEn ? "Dividend Distribution / Owner's Drawings" : "Distribusi Deviden / Prive Pemilik"}
            </td>
            <td>{renderPrintAmount(dividends, true)}</td>
          </tr>
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td>{isEn ? "Ending Retained Earnings" : "Saldo Akhir Laba Ditahan"}</td>
            <td>{renderPrintAmount(endingRetainedEarnings)}</td>
          </tr>
          <tr>
            <td>{isEn ? "Paid-in Capital / Owner's Equity" : "Modal Disetor / Ekuitas Pemilik"}</td>
            <td>{renderPrintAmount(modalDisetorBalance)}</td>
          </tr>
          <tr
            style={{
              backgroundColor: "#e2e8f0",
              fontWeight: 800,
              borderTop: "2px solid #94a3b8",
              borderBottom: "3px double #0f172a",
            }}
          >
            <td style={{ color: "#0f172a" }}>
              {isEn ? "TOTAL ENDING EQUITY FOR PERIOD" : "TOTAL EKUITAS AKHIR PERIODE"}
            </td>
            <td>{renderPrintAmount(totalEndingEquity)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPrintBalanceSheet = () => (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: "11px",
          color: "#0B43C8",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {isEn ? "Statement of Financial Position (Balance Sheet)" : "Laporan Posisi Keuangan (Neraca)"}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "72%" }} />
          <col style={{ width: "28%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: "8px" }}>
              {isEn ? "Financial Position Component" : "Komponen Posisi Keuangan"}
            </th>
            <th style={{ textAlign: "right", paddingRight: "8px" }}>
              {isEn ? "Amount" : "Nominal"}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* ASET */}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 800 }}>
            <td colSpan={2} style={{ color: "#0f172a", textTransform: "uppercase" }}>
              {isEn ? "ASSETS" : "ASET (HARTA)"}
            </td>
          </tr>
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={2} style={{ paddingLeft: "12px", color: "#334155" }}>
              {isEn ? "CURRENT ASSETS" : "ASET LANCAR"}
            </td>
          </tr>
          {currentAssets.length === 0 && balanceSheet.contractAssets.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn ? "No current assets" : "Belum ada aset lancar"}
              </td>
            </tr>
          ) : (
            <>
              {currentAssets.map((a) => (
                <tr key={a.code}>
                  <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(a, lang)}</td>
                  <td>{renderPrintAmount(a.amount)}</td>
                </tr>
              ))}
              {balanceSheet.contractAssets.map((ca) => (
                <tr key={ca.projectId}>
                  <td style={{ paddingLeft: "16px" }}>
                    <div>
                      {isEn ? "Contract Asset" : "Aset Kontrak"}: {ca.projectName}
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#64748b" }}>
                      WIP {formatRupiah(ca.wipBalance)} &minus; {isEn ? "Billings" : "Penagihan"} {formatRupiah(ca.billingsBalance)}
                    </div>
                  </td>
                  <td>{renderPrintAmount(ca.netContractPosition)}</td>
                </tr>
              ))}
            </>
          )}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td style={{ paddingLeft: "12px" }}>
              {isEn ? "Total Current Assets" : "Total Aset Lancar"}
            </td>
            <td>{renderPrintAmount(totalCurrentAssets)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={2} style={{ paddingLeft: "12px", color: "#334155" }}>
              {isEn ? "NON-CURRENT / FIXED ASSETS" : "ASET TETAP"}
            </td>
          </tr>
          {fixedAssets.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn ? "No fixed assets" : "Tidak ada aset tetap"}
              </td>
            </tr>
          ) : (
            fixedAssets.map((a) => (
              <tr key={a.code}>
                <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(a, lang)}</td>
                <td>{renderPrintAmount(a.amount)}</td>
              </tr>
            ))
          )}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td style={{ paddingLeft: "12px" }}>
              {isEn ? "Total Fixed Assets (Net)" : "Total Aset Tetap (Net)"}
            </td>
            <td>{renderPrintAmount(totalFixedAssets)}</td>
          </tr>

          <tr style={{ backgroundColor: "#e2e8f0", fontWeight: 800, borderTop: "2px solid #94a3b8" }}>
            <td style={{ color: "#0f172a" }}>{isEn ? "TOTAL ASSETS" : "TOTAL ASET"}</td>
            <td>{renderPrintAmount(balanceSheet.totalAssets)}</td>
          </tr>

          {/* LIABILITAS */}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 800 }}>
            <td colSpan={2} style={{ color: "#0f172a", textTransform: "uppercase" }}>
              {isEn ? "LIABILITIES" : "LIABILITAS (KEWAJIBAN)"}
            </td>
          </tr>
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={2} style={{ paddingLeft: "12px", color: "#334155" }}>
              {isEn ? "CURRENT LIABILITIES" : "LIABILITAS JANGKA PENDEK"}
            </td>
          </tr>
          {currentLiabilities.length === 0 && balanceSheet.contractLiabilities.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn ? "No current liabilities" : "Belum ada liabilitas jangka pendek"}
              </td>
            </tr>
          ) : (
            <>
              {currentLiabilities.map((l) => (
                <tr key={l.code}>
                  <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(l, lang)}</td>
                  <td>{renderPrintAmount(l.amount)}</td>
                </tr>
              ))}
              {balanceSheet.contractLiabilities.map((cl) => (
                <tr key={cl.projectId}>
                  <td style={{ paddingLeft: "16px" }}>
                    <div>
                      {isEn ? "Contract Liability" : "Liabilitas Kontrak"}: {cl.projectName}
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#64748b" }}>
                      {isEn ? "Billings" : "Penagihan"} {formatRupiah(cl.billingsBalance)} &minus; WIP {formatRupiah(cl.wipBalance)}
                    </div>
                  </td>
                  <td>{renderPrintAmount(Math.abs(cl.netContractPosition))}</td>
                </tr>
              ))}
            </>
          )}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td style={{ paddingLeft: "12px" }}>
              {isEn ? "Total Current Liabilities" : "Total Liabilitas Jangka Pendek"}
            </td>
            <td>{renderPrintAmount(totalCurrentLiabilities)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={2} style={{ paddingLeft: "12px", color: "#334155" }}>
              {isEn ? "LONG-TERM LIABILITIES" : "LIABILITAS JANGKA PANJANG"}
            </td>
          </tr>
          {longTermLiabilities.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", color: "#64748b", paddingLeft: "16px" }}>
                {isEn ? "No long-term liabilities" : "Tidak ada liabilitas jangka panjang"}
              </td>
            </tr>
          ) : (
            longTermLiabilities.map((l) => (
              <tr key={l.code}>
                <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(l, lang)}</td>
                <td>{renderPrintAmount(l.amount)}</td>
              </tr>
            ))
          )}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td style={{ paddingLeft: "12px" }}>
              {isEn ? "Total Long-Term Liabilities" : "Total Liabilitas Jangka Panjang"}
            </td>
            <td>{renderPrintAmount(totalLongTermLiabilities)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 800 }}>
            <td style={{ color: "#0f172a" }}>
              {isEn ? "TOTAL LIABILITIES" : "TOTAL LIABILITAS"}
            </td>
            <td>{renderPrintAmount(totalLiabilities)}</td>
          </tr>

          {/* EKUITAS */}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 800 }}>
            <td colSpan={2} style={{ color: "#0f172a", textTransform: "uppercase" }}>
              {isEn ? "EQUITY" : "EKUITAS (MODAL)"}
            </td>
          </tr>
          {balanceSheet.equities.map((eq) => (
            <tr key={eq.code}>
              <td style={{ paddingLeft: "16px" }}>{getLocalizedAccountName(eq, lang)}</td>
              <td>{renderPrintAmount(eq.amount)}</td>
            </tr>
          ))}
          {balanceSheet.currentUnclosedEarnings !== 0 ? (
            <tr>
              <td style={{ paddingLeft: "16px", fontStyle: "italic", color: "#475569" }}>
                {isEn
                  ? "Current Period Net Income / Loss (Unclosed)"
                  : "Laba (Rugi) Periode Berjalan (Belum Ditutup)"}
              </td>
              <td>{renderPrintAmount(balanceSheet.currentUnclosedEarnings)}</td>
            </tr>
          ) : null}
          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td style={{ paddingLeft: "12px" }}>
              {isEn ? "TOTAL EQUITY" : "TOTAL EKUITAS"}
            </td>
            <td>{renderPrintAmount(totalEquity)}</td>
          </tr>

          <tr
            style={{
              backgroundColor: "#e2e8f0",
              fontWeight: 800,
              borderTop: "2px solid #94a3b8",
              borderBottom: "3px double #0f172a",
            }}
          >
            <td style={{ color: "#0f172a" }}>
              {isEn ? "TOTAL LIABILITIES AND EQUITY" : "TOTAL LIABILITAS DAN EKUITAS"}
            </td>
            <td>{renderPrintAmount(balanceSheet.totalLiabilitiesAndEquity)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPrintCashFlow = () => (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: "11px",
          color: "#0B43C8",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {isEn ? "Statement of Cash Flows (Direct Method)" : "Laporan Arus Kas Metode Langsung"}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "72%" }} />
          <col style={{ width: "28%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: "8px" }}>
              {isEn ? "Cash Flow Activity" : "Aktivitas Arus Kas"}
            </th>
            <th style={{ textAlign: "right", paddingRight: "8px" }}>
              {isEn ? "Amount" : "Nominal"}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{isEn ? "Beginning Cash Balance" : "Saldo Kas Awal Periode"}</td>
            <td>{renderPrintAmount(cashFlow.beginningCash)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td colSpan={2} style={{ color: "#0f172a" }}>
              {isEn ? "CASH FLOWS FROM OPERATING ACTIVITIES" : "ARUS KAS DARI AKTIVITAS OPERASI"}
            </td>
          </tr>
          <tr>
            <td style={{ paddingLeft: "16px" }}>
              {isEn ? "Operating Cash Receipts (Inflow)" : "Penerimaan Kas Operasional (Inflow)"}
            </td>
            <td>{renderPrintAmount(cashFlow.operatingInflow)}</td>
          </tr>
          <tr>
            <td style={{ paddingLeft: "16px" }}>
              {isEn ? "Operating Cash Payments (Outflow)" : "Pengeluaran Kas Operasional (Outflow)"}
            </td>
            <td>{renderPrintAmount(cashFlow.operatingOutflow, true)}</td>
          </tr>
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td>
              {isEn
                ? "Net Cash Flows from Operating Activities"
                : "Arus Kas Bersih dari Aktivitas Operasi"}
            </td>
            <td>{renderPrintAmount(cashFlow.netOperating)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td colSpan={2} style={{ color: "#0f172a" }}>
              {isEn ? "CASH FLOWS FROM INVESTING ACTIVITIES" : "ARUS KAS DARI AKTIVITAS INVESTASI"}
            </td>
          </tr>
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td>
              {isEn
                ? "Net Cash Flows from Investing Activities"
                : "Arus Kas Bersih dari Aktivitas Investasi"}
            </td>
            <td>{renderPrintAmount(cashFlow.netInvesting)}</td>
          </tr>

          <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
            <td colSpan={2} style={{ color: "#0f172a" }}>
              {isEn ? "CASH FLOWS FROM FINANCING ACTIVITIES" : "ARUS KAS DARI AKTIVITAS PENDANAAN"}
            </td>
          </tr>
          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
            <td>
              {isEn
                ? "Net Cash Flows from Financing Activities"
                : "Arus Kas Bersih dari Aktivitas Pendanaan"}
            </td>
            <td>{renderPrintAmount(cashFlow.netFinancing)}</td>
          </tr>

          <tr>
            <td style={{ fontWeight: 600 }}>
              {isEn ? "Net Increase (Decrease) in Cash" : "Kenaikan (Penurunan) Bersih Kas"}
            </td>
            <td>{renderPrintAmount(cashFlow.netChangeInCash)}</td>
          </tr>

          <tr
            style={{
              backgroundColor: "#e2e8f0",
              fontWeight: 800,
              borderTop: "2px solid #94a3b8",
              borderBottom: "3px double #0f172a",
            }}
          >
            <td style={{ color: "#0f172a" }}>
              {isEn ? "ENDING CASH BALANCE" : "SALDO KAS AKHIR PERIODE"}
            </td>
            <td>{renderPrintAmount(cashFlow.endingCash)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPrintTrialBalance = () => (
    <div>
      <div
        style={{
          padding: "6px 10px",
          border: `1px solid ${isBalanced ? "#10b981" : "#ef4444"}`,
          backgroundColor: isBalanced ? "#ecfdf5" : "#fef2f2",
          color: isBalanced ? "#065f46" : "#991b1b",
          fontSize: "9.5px",
          fontWeight: 700,
          borderRadius: "6px",
          marginBottom: "10px",
        }}
      >
        {isBalanced
          ? isEn
            ? "✓ General Ledger Balanced - Total Debit equals Total Credit"
            : "✓ Buku Besar Seimbang (Balanced) - Total Debit sama dengan Total Kredit"
          : isEn
            ? "⚠ Warning: Discrepancy detected between Debit and Credit Balances!"
            : "⚠ Peringatan: Terdapat selisih antara Saldo Debit dan Kredit!"}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "42%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>{isEn ? "Account No." : "No. Akun"}</th>
            <th>{isEn ? "Account Name" : "Nama Akun"}</th>
            <th>Debit</th>
            <th>{isEn ? "Credit" : "Kredit"}</th>
          </tr>
        </thead>
        <tbody>
          {trialBalance.rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                {isEn
                  ? "No trial balance data in this period."
                  : "Belum ada data neraca saldo pada periode ini."}
              </td>
            </tr>
          ) : (
            trialBalance.rows.map((r) => (
              <tr key={r.code}>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{r.code}</td>
                <td>{getLocalizedAccountName(r, lang)}</td>
                <td>{renderPrintAmount(r.endingDebit)}</td>
                <td>{renderPrintAmount(r.endingCredit)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr
            style={{
              backgroundColor: "#f1f5f9",
              fontWeight: 800,
              borderTop: "2px solid #94a3b8",
              borderBottom: "3px double #0f172a",
            }}
          >
            <td colSpan={2} style={{ textAlign: "right", paddingRight: "10px", color: "#0f172a" }}>
              {isEn ? "GRAND TOTAL" : "TOTAL KESELURUHAN"}
            </td>
            <td>{renderPrintAmount(trialBalance.sumEndingDebit)}</td>
            <td>{renderPrintAmount(trialBalance.sumEndingCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderPrintLedger = () => {
    if (isAllAccounts) {
      if (allLedgers.length === 0) {
        return (
          <div style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>
            {isEn
              ? "No transactions for any general ledger accounts in this period."
              : "Belum ada transaksi pada akun buku besar di periode ini."}
          </div>
        );
      }
      return (
        <div>
          {allLedgers.map((item, idx) => (
            <div key={item.account.id} className={idx > 0 ? "page-break-before" : ""}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  marginTop: idx > 0 ? "14px" : "0",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
                    {item.account.code} - {getLocalizedAccountName(item.account, lang)}
                  </div>
                  <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "2px" }}>
                    {isEn ? "Type" : "Tipe"}: {getLocalizedAccountType(item.account.account_type, lang)} | {isEn ? "Normal Balance" : "Saldo Normal"}: {getLocalizedNormalBalance(item.account.normal_balance, lang)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "8px", color: "#64748b", fontWeight: 600 }}>
                    {isEn ? "Ending Balance" : "Saldo Akhir"}
                  </span>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0B43C8" }}>
                    {formatRupiah(item.endingBalance)}
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "18%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{isEn ? "Date" : "Tanggal"}</th>
                    <th>{isEn ? "Description" : "Keterangan"}</th>
                    <th>Debit</th>
                    <th>{isEn ? "Credit" : "Kredit"}</th>
                    <th>{isEn ? "Running Balance" : "Saldo Berjalan"}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((r, rIdx) => (
                    <tr key={rIdx}>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{formatDateID(r.journalDate)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {getLocalizedTransactionDescription(r.description, lang)}
                        </div>
                        {(r as any).journalNumber && (
                          <div style={{ fontSize: "8px", color: "#64748b" }}>{(r as any).journalNumber}</div>
                        )}
                      </td>
                      <td>{renderPrintAmount(r.debit)}</td>
                      <td>{renderPrintAmount(r.credit)}</td>
                      <td>{renderPrintAmount(r.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      );
    }

    const targetAccount = selectedAccount ?? postableAccounts[0];
    const targetRows = ledgerRows;

    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            border: "1px solid #cbd5e1",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "8px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
              {targetAccount?.code} - {targetAccount ? getLocalizedAccountName(targetAccount, lang) : ""}
            </div>
            <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "2px" }}>
              {isEn ? "Type" : "Tipe"}: {targetAccount ? getLocalizedAccountType(targetAccount.account_type, lang) : "-"} | {isEn ? "Normal Balance" : "Saldo Normal"}: {targetAccount ? getLocalizedNormalBalance(targetAccount.normal_balance, lang) : "-"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "8px", color: "#64748b", fontWeight: 600 }}>
              {isEn ? "Ending Balance" : "Saldo Akhir"}
            </span>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#0B43C8" }}>
              {formatRupiah(selectedLedgerEndingBalance)}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>{isEn ? "Date" : "Tanggal"}</th>
              <th>{isEn ? "Description" : "Keterangan"}</th>
              <th>Debit</th>
              <th>{isEn ? "Credit" : "Kredit"}</th>
              <th>{isEn ? "Running Balance" : "Saldo Berjalan"}</th>
            </tr>
          </thead>
          <tbody>
            {targetRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                  {isEn
                    ? "No transactions for this account in the selected period."
                    : "Belum ada mutasi untuk akun ini pada periode terpilih."}
                </td>
              </tr>
            ) : (
              targetRows.map((r, rIdx) => (
                <tr key={rIdx}>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{formatDateID(r.journalDate)}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {getLocalizedTransactionDescription(r.description, lang)}
                    </div>
                    {(r as any).journalNumber && (
                      <div style={{ fontSize: "8px", color: "#64748b" }}>{(r as any).journalNumber}</div>
                    )}
                  </td>
                  <td>{renderPrintAmount(r.debit)}</td>
                  <td>{renderPrintAmount(r.credit)}</td>
                  <td>{renderPrintAmount(r.runningBalance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  let printBodyContent: React.ReactNode = null;
  if (mode === "ledger" || activeTab === "buku_besar") {
    printBodyContent = renderPrintLedger();
  } else if (mode === "trial_balance" || activeTab === "neraca_saldo") {
    printBodyContent = renderPrintTrialBalance();
  } else if (mode === "statements") {
    if (layoutMode === "grid") {
      printBodyContent = (
        <div>
          {renderPrintIncomeStatement()}
          <div className="page-break-before" />
          {renderPrintRetainedEarnings()}
          <div className="page-break-before" />
          {renderPrintBalanceSheet()}
          <div className="page-break-before" />
          {renderPrintCashFlow()}
        </div>
      );
    } else {
      if (activeTab === "laba_rugi") {
        printBodyContent = renderPrintIncomeStatement();
      } else if (activeTab === "ekuitas") {
        printBodyContent = renderPrintRetainedEarnings();
      } else if (activeTab === "neraca") {
        printBodyContent = renderPrintBalanceSheet();
      } else if (activeTab === "arus_kas") {
        printBodyContent = renderPrintCashFlow();
      }
    }
  }

  return (
    <AccountingPrintLayout
      printAreaId={printAreaId}
      company={company}
      docTitle={printDocTitle}
      docSubtitle={printDocSubtitle}
      periodLabel={printPeriodLabel}
    >
      {printBodyContent}
    </AccountingPrintLayout>
  );
}
