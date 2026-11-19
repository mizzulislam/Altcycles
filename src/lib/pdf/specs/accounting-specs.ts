import {
  formatAccountRef,
  formatDocDateLong,
  formatDocNumber,
  formatDocRupiah,
  simplifyLedgerDescription,
} from "@/lib/formatters";
import { getActiveLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";
import type {
  PdfDocumentSection,
  PdfDocumentSpec,
  PdfTableColumn,
} from "../pdf-types";

/**
 * Builder Spesifikasi PDF: Jurnal Umum & Jurnal Penyesuaian
 */
export function buildJournalsPdfSpec(params: {
  company: CompanyProfileRow;
  isAdjusting?: boolean;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  rows: Array<{
    date: string;
    description: string;
    ref?: string;
    debit: number;
    credit: number;
  }>;
  totalDebit?: number;
  totalCredit?: number;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const isAdj = Boolean(params.isAdjusting);
  const docTitle = isAdj
    ? isEn
      ? "ADJUSTING & CORRECTION ENTRIES"
      : "JURNAL PENYESUAIAN & KOREKSI"
    : isEn
      ? "GENERAL JOURNAL"
      : "JURNAL UMUM";
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ??
    `${isAdj ? (isEn ? "AJE" : "AJP") : (isEn ? "GJN" : "JRN")}/${docDate.replace(/-/g, "")}`;

  const tableRows = params.rows.map((r) => {
    const isMemo =
      (!r.ref && r.debit === 0 && r.credit === 0) ||
      r.description.trim().startsWith("(");
    return [
      r.date,
      r.description,
      isMemo ? "" : r.ref ? formatAccountRef(r.ref) : "-",
      isMemo ? "" : r.debit > 0 ? formatDocRupiah(r.debit) : "-",
      isMemo ? "" : r.credit > 0 ? formatDocRupiah(r.credit) : "-",
    ];
  });

  const totDeb = params.totalDebit ?? params.rows.reduce((s, r) => s + r.debit, 0);
  const totCred = params.totalCredit ?? params.rows.reduce((s, r) => s + r.credit, 0);

  if (params.rows.length > 0) {
    tableRows.push([
      "",
      isEn ? "GRAND TOTAL" : "TOTAL KESELURUHAN",
      "",
      formatDocRupiah(totDeb),
      formatDocRupiah(totCred),
    ]);
  }

  return {
    docTitle,
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Entity & Cycle" : "Entitas & Siklus",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isAdj
        ? isEn
          ? "Cycle: Adjusting & Correction Entries"
          : "Siklus: Ayat Jurnal Penyesuaian & Koreksi Transaksi"
        : isEn
          ? "Cycle: Chronological Journal Transactions"
          : "Siklus: Buku Jurnal Transaksi Kronologis",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      {
        label: isEn ? "Verification Status" : "Status Verifikasi",
        value: isEn ? "Fully Posted" : "Terposting Lengkap",
      },
    ],
    tableColumns: [
      { header: isEn ? "Date" : "Tanggal", widthRatio: 0.13 },
      { header: isEn ? "Description" : "Deskripsi", widthRatio: 0.39 },
      { header: "Ref", widthRatio: 0.16, align: "center" },
      { header: "Debit", widthRatio: 0.16, align: "right" },
      { header: isEn ? "Credit" : "Kredit", widthRatio: 0.16, align: "right" },
    ],
    tableRows,
  };
}

/**
 * Builder Spesifikasi PDF: Buku Besar (General Ledger)
 */
export function buildGeneralLedgerPdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  accountName?: string;
  isAllAccounts?: boolean;
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    normalBalance: string;
    endingBalance: number;
    rows: Array<{
      date: string;
      description: string;
      ref: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }>;
  }>;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `GL/${docDate.replace(/-/g, "")}`;

  const sections: PdfDocumentSection[] = params.accounts.map((acc) => {
    const tableRows = acc.rows.map((r) => [
      r.date,
      simplifyLedgerDescription(r.description),
      r.ref ? formatAccountRef(r.ref) : "-",
      r.debit > 0 ? formatDocNumber(r.debit) : "-",
      r.credit > 0 ? formatDocNumber(r.credit) : "-",
      formatDocNumber(r.runningBalance),
    ]);

    return {
      title: `${formatAccountRef(acc.code)} - ${acc.name}`,
      subtitle: isEn
        ? `Type: ${acc.type} | Normal Balance: ${acc.normalBalance}`
        : `Tipe: ${acc.type} | Saldo Normal: ${acc.normalBalance}`,
      badge: formatDocRupiah(acc.endingBalance),
      tableColumns: [
        { header: isEn ? "Date" : "Tanggal", widthRatio: 0.15 },
        { header: isEn ? "Description" : "Keterangan", widthRatio: 0.28 },
        { header: "Ref", widthRatio: 0.14, align: "center" },
        { header: "Debit", widthRatio: 0.14, align: "right" },
        { header: isEn ? "Credit" : "Kredit", widthRatio: 0.14, align: "right" },
        { header: isEn ? "Balance" : "Balance", widthRatio: 0.15, align: "right" },
      ],
      tableRows,
    };
  });

  return {
    docTitle: isEn ? "GENERAL LEDGER" : "BUKU BESAR (GENERAL LEDGER)",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Entity General Ledger" : "Buku Besar Entitas",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      params.isAllAccounts
        ? isEn
          ? "Scope: All General Ledger Accounts"
          : "Cakupan: Seluruh Akun Buku Besar"
        : isEn
          ? `Account: ${params.accountName || "Selected Account"}`
          : `Akun: ${params.accountName || "Akun Terpilih"}`,
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      {
        label: isEn ? "Reconciliation Status" : "Status Rekonsiliasi",
        value: isEn ? "Fully Reconciled" : "Selesai Direkonsiliasi",
      },
    ],
    sections,
  };
}

/**
 * Builder Spesifikasi PDF: Neraca Saldo (Trial Balance)
 */
export function buildTrialBalancePdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  isAdjusted?: boolean;
  isBalanced?: boolean;
  rows: Array<{
    code: string;
    name: string;
    debit: number;
    credit: number;
  }>;
  sumDebit?: number;
  sumCredit?: number;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `TB/${docDate.replace(/-/g, "")}`;
  const isBalanced = params.isBalanced ?? true;
  const isAdjusted = params.isAdjusted ?? true;

  const tableRows = params.rows.map((r) => [
    r.code,
    r.name,
    r.debit > 0 ? formatDocRupiah(r.debit) : "-",
    r.credit > 0 ? formatDocRupiah(r.credit) : "-",
  ]);

  const sumDeb = params.sumDebit ?? params.rows.reduce((s, r) => s + r.debit, 0);
  const sumCred = params.sumCredit ?? params.rows.reduce((s, r) => s + r.credit, 0);

  if (params.rows.length > 0) {
    tableRows.push([
      "",
      isEn ? "GRAND TOTAL" : "TOTAL KESELURUHAN",
      formatDocRupiah(sumDeb),
      formatDocRupiah(sumCred),
    ]);
  }

  return {
    docTitle: isEn ? "TRIAL BALANCE" : "NERACA SALDO (TRIAL BALANCE)",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Reporting Basis" : "Dasar Pelaporan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isAdjusted
        ? isEn
          ? "Basis: Adjusted Trial Balance"
          : "Dasar: Setelah Penyesuaian (Adjusted Trial Balance)"
        : isEn
          ? "Basis: Unadjusted Trial Balance"
          : "Dasar: Sebelum Penyesuaian (Unadjusted Trial Balance)",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      {
        label: isEn ? "Balance Status" : "Status Keseimbangan",
        value: isBalanced
          ? isEn
            ? "Balanced"
            : "Seimbang (Balanced)"
          : isEn
            ? "Unbalanced"
            : "Tidak Seimbang",
      },
    ],
    bannerBox: !isBalanced
      ? {
          text: isEn
            ? "⚠ General Ledger Unbalanced - Difference detected between Total Debit and Total Credit"
            : "⚠ Buku Besar Tidak Seimbang - Terdapat selisih antara Total Debit dan Total Kredit",
          variant: "warning",
        }
      : undefined,
    tableColumns: [
      { header: isEn ? "Account No." : "No. Akun", widthRatio: 0.11 },
      { header: isEn ? "Account Name" : "Nama Akun", widthRatio: 0.43 },
      { header: "Debit", widthRatio: 0.23, align: "right" },
      { header: isEn ? "Credit" : "Kredit", widthRatio: 0.23, align: "right" },
    ],
    tableRows,
  };
}

/**
 * Builder Spesifikasi PDF: Laporan Laba Rugi Basis Akrual
 */
export function buildIncomeStatementPdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  revenueRows: Array<{ label: string; amount: number }>;
  totalRevenue: number;
  cogsRows?: Array<{ label: string; amount: number }>;
  grossProfit?: number;
  opexRows?: Array<{ label: string; amount: number }>;
  totalOpex?: number;
  netIncome: number;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `IS/${docDate.replace(/-/g, "")}`;

  const tableRows: string[][] = [];

  // PENDAPATAN USAHA
  tableRows.push([isEn ? "OPERATING REVENUE" : "PENDAPATAN USAHA", ""]);
  for (const r of params.revenueRows) {
    tableRows.push([`  ${r.label}`, formatDocRupiah(r.amount)]);
  }
  tableRows.push([
    isEn ? "TOTAL OPERATING REVENUE" : "TOTAL PENDAPATAN USAHA",
    formatDocRupiah(params.totalRevenue),
  ]);

  // BEBAN LANGSUNG PROYEK
  tableRows.push([isEn ? "DIRECT PROJECT COSTS" : "BEBAN LANGSUNG PROYEK", ""]);
  if (params.cogsRows && params.cogsRows.length > 0) {
    for (const c of params.cogsRows) {
      tableRows.push([`  ${c.label}`, formatDocRupiah(c.amount)]);
    }
  } else {
    tableRows.push([
      isEn
        ? "  No direct project costs in this period."
        : "  Belum ada beban langsung proyek pada periode ini.",
      "-",
    ]);
  }
  const gross = params.grossProfit ?? params.totalRevenue;
  tableRows.push([
    isEn ? "PROJECT GROSS PROFIT" : "LABA KOTOR PROYEK",
    formatDocRupiah(gross),
  ]);

  // BEBAN OPERASIONAL BERSAMA
  tableRows.push([
    isEn ? "SHARED OPERATING EXPENSES" : "BEBAN OPERASIONAL BERSAMA",
    "",
  ]);
  if (params.opexRows && params.opexRows.length > 0) {
    for (const o of params.opexRows) {
      tableRows.push([`  ${o.label}`, formatDocRupiah(o.amount)]);
    }
    if (params.totalOpex !== undefined) {
      tableRows.push([
        isEn ? "TOTAL SHARED OPERATING EXPENSES" : "TOTAL BEBAN OPERASIONAL BERSAMA",
        formatDocRupiah(params.totalOpex),
      ]);
    }
  } else {
    tableRows.push([
      isEn
        ? "  No shared operating expenses in this period."
        : "  Belum ada beban operasional bersama pada periode ini.",
      "-",
    ]);
  }

  // LABA (RUGI) BERSIH
  tableRows.push([
    isEn
      ? "NET INCOME (LOSS) FOR THE PERIOD"
      : "LABA (RUGI) BERSIH PERIODE BERJALAN",
    formatDocRupiah(params.netIncome),
  ]);

  return {
    docTitle: isEn ? "STATEMENT OF PROFIT OR LOSS" : "LAPORAN LABA RUGI BASIS AKRUAL",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Basis of Preparation" : "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isEn
        ? "Accounting Basis: Accrual Basis"
        : "Basis Akuntansi: Akrual (Accrual Basis)",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      { label: isEn ? "Currency" : "Mata Uang", value: "Rupiah (IDR)" },
    ],
    tableColumns: [
      {
        header: isEn ? "Description" : "Keterangan",
        widthRatio: 0.68,
      },
      {
        header: isEn ? "Amount (IDR)" : "Nominal (IDR)",
        widthRatio: 0.32,
        align: "right",
      },
    ],
    tableRows,
  };
}

/**
 * Builder Spesifikasi PDF: Laporan Perubahan Ekuitas
 */
export function buildRetainedEarningsPdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  rows: Array<{ label: string; amount: number }>;
  endingRetainedEarnings: number;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `EQ/${docDate.replace(/-/g, "")}`;

  const tableRows = params.rows.map((r) => [
    r.label.toUpperCase(),
    formatDocRupiah(r.amount),
  ]);
  tableRows.push([
    isEn ? "TOTAL ENDING RETAINED EARNINGS" : "TOTAL SALDO LABA DITAHAN AKHIR",
    formatDocRupiah(params.endingRetainedEarnings),
  ]);

  return {
    docTitle: isEn ? "STATEMENT OF CHANGES IN EQUITY" : "LAPORAN PERUBAHAN EKUITAS",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Basis of Preparation" : "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isEn
        ? "Components: Paid-in Capital & Retained Earnings"
        : "Komponen: Modal Disetor & Saldo Laba Ditahan",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      { label: isEn ? "Currency" : "Mata Uang", value: "Rupiah (IDR)" },
    ],
    tableColumns: [
      {
        header: isEn
          ? "Equity & Retained Earnings Component"
          : "Komponen Ekuitas & Saldo Laba",
        widthRatio: 0.68,
      },
      {
        header: isEn ? "Amount (IDR)" : "Nominal (IDR)",
        widthRatio: 0.32,
        align: "right",
      },
    ],
    tableRows,
  };
}

/**
 * Builder Spesifikasi PDF: Laporan Posisi Keuangan (Neraca)
 */
export function buildBalanceSheetPdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  isBalanced?: boolean;
  currentAssetRows: Array<{ label: string; amount: number }>;
  totalCurrentAssets: number;
  nonCurrentAssetRows: Array<{ label: string; amount: number }>;
  totalNonCurrentAssets: number;
  totalAssets: number;
  currentLiabRows: Array<{ label: string; amount: number }>;
  totalCurrentLiabilities: number;
  nonCurrentLiabRows: Array<{ label: string; amount: number }>;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  equityRows: Array<{ label: string; amount: number }>;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `BS/${docDate.replace(/-/g, "")}`;
  const isBalanced = params.isBalanced ?? true;

  const tableRows: string[][] = [];

  // 1. ASET
  tableRows.push([isEn ? "CURRENT ASSETS" : "ASET LANCAR", ""]);
  for (const a of params.currentAssetRows) {
    tableRows.push([`  ${a.label}`, formatDocRupiah(a.amount)]);
  }
  tableRows.push([
    isEn ? "TOTAL CURRENT ASSETS" : "TOTAL ASET LANCAR",
    formatDocRupiah(params.totalCurrentAssets),
  ]);

  if (params.nonCurrentAssetRows.length > 0) {
    tableRows.push([isEn ? "NON-CURRENT ASSETS" : "ASET TIDAK LANCAR", ""]);
    for (const na of params.nonCurrentAssetRows) {
      tableRows.push([`  ${na.label}`, formatDocRupiah(na.amount)]);
    }
    tableRows.push([
      isEn ? "TOTAL NON-CURRENT ASSETS" : "TOTAL ASET TIDAK LANCAR",
      formatDocRupiah(params.totalNonCurrentAssets),
    ]);
  }
  tableRows.push([
    isEn ? "TOTAL ASSETS" : "TOTAL ASET",
    formatDocRupiah(params.totalAssets),
  ]);

  // 2. LIABILITAS
  tableRows.push([
    isEn ? "CURRENT LIABILITIES" : "LIABILITAS JANGKA PENDEK",
    "",
  ]);
  for (const l of params.currentLiabRows) {
    tableRows.push([`  ${l.label}`, formatDocRupiah(l.amount)]);
  }
  tableRows.push([
    isEn ? "TOTAL CURRENT LIABILITIES" : "TOTAL LIABILITAS JANGKA PENDEK",
    formatDocRupiah(params.totalCurrentLiabilities),
  ]);

  if (params.nonCurrentLiabRows.length > 0) {
    tableRows.push([
      isEn ? "NON-CURRENT LIABILITIES" : "LIABILITAS JANGKA PANJANG",
      "",
    ]);
    for (const nl of params.nonCurrentLiabRows) {
      tableRows.push([`  ${nl.label}`, formatDocRupiah(nl.amount)]);
    }
    tableRows.push([
      isEn ? "TOTAL NON-CURRENT LIABILITIES" : "TOTAL LIABILITAS JANGKA PANJANG",
      formatDocRupiah(params.totalNonCurrentLiabilities),
    ]);
  }
  tableRows.push([
    isEn ? "TOTAL LIABILITIES" : "TOTAL LIABILITAS",
    formatDocRupiah(params.totalLiabilities),
  ]);

  // 3. EKUITAS
  tableRows.push([isEn ? "EQUITY" : "EKUITAS", ""]);
  for (const eq of params.equityRows) {
    tableRows.push([`  ${eq.label}`, formatDocRupiah(eq.amount)]);
  }
  tableRows.push([
    isEn ? "TOTAL EQUITY" : "TOTAL EKUITAS",
    formatDocRupiah(params.totalEquity),
  ]);

  tableRows.push([
    isEn ? "TOTAL LIABILITIES & EQUITY" : "TOTAL LIABILITAS & EKUITAS",
    formatDocRupiah(params.totalLiabilitiesAndEquity),
  ]);

  return {
    docTitle: isEn ? "STATEMENT OF FINANCIAL POSITION" : "LAPORAN POSISI KEUANGAN (NERACA)",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Financial Position Basis" : "Dasar Posisi Keuangan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isEn
        ? "Structure: Assets = Liabilities + Equity"
        : "Struktur: Aset = Liabilitas + Ekuitas",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "As of" : "Posisi Per", value: params.periodLabel },
      {
        label: isEn ? "Balance Status" : "Status Keseimbangan",
        value: isBalanced
          ? isEn
            ? "Balanced"
            : "Seimbang (Balanced)"
          : isEn
            ? "Calculation Imbalance"
            : "Selisih Perhitungan",
      },
    ],
    bannerBox: !isBalanced
      ? {
          text: isEn
            ? "⚠ Financial Position Unbalanced - Difference detected between Assets and Total Liabilities & Equity"
            : "⚠ Posisi Keuangan Tidak Seimbang - Terdapat selisih antara Aset dan Pasiva",
          variant: "warning",
        }
      : undefined,
    tableColumns: [
      {
        header: isEn
          ? "Financial Position Component"
          : "Komponen Posisi Keuangan",
        widthRatio: 0.68,
      },
      {
        header: isEn ? "Amount (IDR)" : "Nominal (IDR)",
        widthRatio: 0.32,
        align: "right",
      },
    ],
    tableRows,
  };
}

/**
 * Builder Spesifikasi PDF: Laporan Arus Kas Metode Langsung
 */
export function buildCashFlowPdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  operatingRows: Array<{ label: string; amount: number }>;
  netOperating: number;
  investingRows?: Array<{ label: string; amount: number }>;
  netInvesting?: number;
  financingRows?: Array<{ label: string; amount: number }>;
  netFinancing?: number;
  netCashChange: number;
  beginningCash: number;
  endingCash: number;
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `CF/${docDate.replace(/-/g, "")}`;

  const tableRows: string[][] = [];

  tableRows.push([
    isEn ? "BEGINNING CASH BALANCE" : "SALDO KAS AWAL PERIODE",
    formatDocRupiah(params.beginningCash),
  ]);

  tableRows.push([isEn ? "OPERATING ACTIVITIES" : "AKTIVITAS OPERASI", ""]);
  for (const o of params.operatingRows) {
    tableRows.push([`  ${o.label}`, formatDocRupiah(o.amount)]);
  }
  tableRows.push([
    isEn
      ? "NET CASH FLOWS FROM OPERATING ACTIVITIES"
      : "ARUS KAS BERSIH DARI AKTIVITAS OPERASI",
    formatDocRupiah(params.netOperating),
  ]);

  tableRows.push([isEn ? "INVESTING ACTIVITIES" : "AKTIVITAS INVESTASI", ""]);
  if (params.investingRows && params.investingRows.length > 0) {
    for (const inv of params.investingRows) {
      tableRows.push([`  ${inv.label}`, formatDocRupiah(inv.amount)]);
    }
  } else {
    tableRows.push([
      isEn
        ? "  No investing activities in this period."
        : "  Tidak ada mutasi aktivitas investasi pada periode ini.",
      "-",
    ]);
  }
  tableRows.push([
    isEn
      ? "NET CASH FLOWS FROM INVESTING ACTIVITIES"
      : "ARUS KAS BERSIH DARI AKTIVITAS INVESTASI",
    formatDocRupiah(params.netInvesting ?? 0),
  ]);

  tableRows.push([isEn ? "FINANCING ACTIVITIES" : "AKTIVITAS PENDANAAN", ""]);
  if (params.financingRows && params.financingRows.length > 0) {
    for (const fin of params.financingRows) {
      tableRows.push([`  ${fin.label}`, formatDocRupiah(fin.amount)]);
    }
  } else {
    tableRows.push([
      isEn
        ? "  No financing activities in this period."
        : "  Tidak ada mutasi aktivitas pendanaan pada periode ini.",
      "-",
    ]);
  }
  tableRows.push([
    isEn
      ? "NET CASH FLOWS FROM FINANCING ACTIVITIES"
      : "ARUS KAS BERSIH DARI AKTIVITAS PENDANAAN",
    formatDocRupiah(params.netFinancing ?? 0),
  ]);

  tableRows.push([
    isEn
      ? "NET INCREASE (DECREASE) IN CASH"
      : "KENAIKAN (PENURUNAN) BERSIH KAS",
    formatDocRupiah(params.netCashChange),
  ]);
  tableRows.push([
    isEn ? "ENDING CASH BALANCE" : "SALDO KAS AKHIR PERIODE",
    formatDocRupiah(params.endingCash),
  ]);

  return {
    docTitle: isEn ? "STATEMENT OF CASH FLOWS" : "LAPORAN ARUS KAS METODE LANGSUNG",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Basis of Preparation" : "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isEn
        ? "Method: Direct Cash Flow Method"
        : "Metode: Langsung (Direct Cash Flow Method)",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      { label: isEn ? "Currency" : "Mata Uang", value: "Rupiah (IDR)" },
    ],
    tableColumns: [
      {
        header: isEn ? "Cash Flow Activity" : "Aktivitas Arus Kas",
        widthRatio: 0.68,
      },
      {
        header: isEn ? "Amount (IDR)" : "Nominal (IDR)",
        widthRatio: 0.32,
        align: "right",
      },
    ],
    tableRows,
  };
}

/**
 * Builder Spesifikasi PDF: Laporan Keuangan Lengkap
 */
export function buildCompleteFinancialStatementsPdfSpec(params: {
  company: CompanyProfileRow;
  periodLabel: string;
  docDate?: string;
  refNumber?: string;
  incomeStatementRows: string[][];
  retainedEarningsRows: string[][];
  balanceSheetRows: string[][];
  cashFlowRows: string[][];
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `FS/${docDate.replace(/-/g, "")}`;

  const stdCols: PdfTableColumn[] = [
    {
      header: isEn ? "Report Line" : "Pos Laporan",
      widthRatio: 0.68,
    },
    {
      header: isEn ? "Amount (IDR)" : "Nominal (IDR)",
      widthRatio: 0.32,
      align: "right",
    },
  ];

  const sections: PdfDocumentSection[] = [
    {
      title: isEn
        ? "1. STATEMENT OF PROFIT OR LOSS (ACCRUAL BASIS)"
        : "1. LAPORAN LABA RUGI BASIS AKRUAL",
      subtitle: isEn
        ? "Operating Revenue, Direct Costs & Operating Expenses"
        : "Pendapatan Usaha, Beban Langsung & Beban Operasional",
      tableColumns: stdCols,
      tableRows: params.incomeStatementRows,
    },
    {
      title: isEn
        ? "2. STATEMENT OF CHANGES IN EQUITY"
        : "2. LAPORAN PERUBAHAN EKUITAS",
      subtitle: isEn
        ? "Paid-in Capital and Retained Earnings Movements"
        : "Modal Disetor dan Mutasi Saldo Laba Ditahan",
      tableColumns: stdCols,
      tableRows: params.retainedEarningsRows,
      pageBreakBefore: true,
    },
    {
      title: isEn
        ? "3. STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)"
        : "3. LAPORAN POSISI KEUANGAN (NERACA)",
      subtitle: isEn
        ? "Assets, Liabilities, and Equity Position at Period End"
        : "Posisi Aset, Liabilitas, dan Ekuitas Per Akhir Periode",
      tableColumns: stdCols,
      tableRows: params.balanceSheetRows,
      pageBreakBefore: true,
    },
    {
      title: isEn
        ? "4. STATEMENT OF CASH FLOWS (DIRECT METHOD)"
        : "4. LAPORAN ARUS KAS METODE LANGSUNG",
      subtitle: isEn
        ? "Operating, Investing, and Financing Cash Activities"
        : "Aktivitas Operasi, Investasi, dan Pendanaan Kas",
      tableColumns: stdCols,
      tableRows: params.cashFlowRows,
      pageBreakBefore: true,
    },
  ];

  return {
    docTitle: isEn ? "COMPLETE FINANCIAL STATEMENTS" : "LAPORAN KEUANGAN LENGKAP",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: isEn ? "Basis of Preparation" : "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isEn
        ? "Complete Package: Profit & Loss, Equity, Balance Sheet, and Cash Flows"
        : "Paket Lengkap: Laba Rugi, Ekuitas, Neraca, dan Arus Kas",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(docDate, lang),
      },
      { label: isEn ? "Period" : "Periode", value: params.periodLabel },
      {
        label: isEn ? "Reporting Standard" : "Standar Pelaporan",
        value: isEn
          ? "Indonesian Financial Accounting Standards for Private Entities (SAK EP)"
          : "SAK Entitas Privat",
      },
    ],
    sections,
  };
}
