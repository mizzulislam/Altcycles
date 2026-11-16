import {
  formatDocDateLong,
  formatDocNumber,
  formatDocRupiah,
  simplifyLedgerDescription,
} from "@/lib/formatters";
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
}): PdfDocumentSpec {
  const isAdj = Boolean(params.isAdjusting);
  const docTitle = isAdj
    ? "JURNAL PENYESUAIAN & KOREKSI"
    : "JURNAL UMUM";
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ??
    `${isAdj ? "AJP" : "JRN"}/${docDate.replace(/-/g, "")}`;

  const tableRows = params.rows.map((r) => [
    r.date,
    r.description,
    r.ref || "-",
    r.debit > 0 ? formatDocRupiah(r.debit) : "-",
    r.credit > 0 ? formatDocRupiah(r.credit) : "-",
  ]);

  const totDeb = params.totalDebit ?? params.rows.reduce((s, r) => s + r.debit, 0);
  const totCred = params.totalCredit ?? params.rows.reduce((s, r) => s + r.credit, 0);

  if (params.rows.length > 0) {
    tableRows.push([
      "",
      "TOTAL KESELURUHAN",
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
    recipientTitle: "Entitas & Siklus",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isAdj
        ? "Siklus: Ayat Jurnal Penyesuaian & Koreksi Transaksi"
        : "Siklus: Buku Jurnal Transaksi Kronologis",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      { label: "Status Verifikasi", value: "Terposting Lengkap" },
    ],
    tableColumns: [
      { header: "Tanggal", widthRatio: 0.13 },
      { header: "Deskripsi", widthRatio: 0.39 },
      { header: "Ref", widthRatio: 0.16, align: "center" },
      { header: "Debit", widthRatio: 0.16, align: "right" },
      { header: "Kredit", widthRatio: 0.16, align: "right" },
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
}): PdfDocumentSpec {
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `GL/${docDate.replace(/-/g, "")}`;

  const sections: PdfDocumentSection[] = params.accounts.map((acc) => {
    const tableRows = acc.rows.map((r) => [
      r.date,
      simplifyLedgerDescription(r.description),
      r.ref || "-",
      r.debit > 0 ? formatDocNumber(r.debit) : "-",
      r.credit > 0 ? formatDocNumber(r.credit) : "-",
      formatDocNumber(r.runningBalance),
    ]);

    return {
      title: `${acc.code} - ${acc.name}`,
      subtitle: `Tipe: ${acc.type} | Saldo Normal: ${acc.normalBalance}`,
      badge: formatDocRupiah(acc.endingBalance),
      tableColumns: [
        { header: "Tanggal", widthRatio: 0.15 },
        { header: "Keterangan", widthRatio: 0.28 },
        { header: "Ref", widthRatio: 0.14, align: "center" },
        { header: "Debit", widthRatio: 0.14, align: "right" },
        { header: "Kredit", widthRatio: 0.14, align: "right" },
        { header: "Balance", widthRatio: 0.15, align: "right" },
      ],
      tableRows,
    };
  });

  return {
    docTitle: "BUKU BESAR (GENERAL LEDGER)",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Buku Besar Entitas",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      params.isAllAccounts
        ? "Cakupan: Seluruh Akun Buku Besar"
        : `Akun: ${params.accountName || "Akun Terpilih"}`,
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      { label: "Status Rekonsiliasi", value: "Selesai Direkonsiliasi" },
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
}): PdfDocumentSpec {
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
      "TOTAL KESELURUHAN",
      formatDocRupiah(sumDeb),
      formatDocRupiah(sumCred),
    ]);
  }

  return {
    docTitle: "NERACA SALDO (TRIAL BALANCE)",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Dasar Pelaporan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      isAdjusted
        ? "Dasar: Setelah Penyesuaian (Adjusted Trial Balance)"
        : "Dasar: Sebelum Penyesuaian (Unadjusted Trial Balance)",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      {
        label: "Status Keseimbangan",
        value: isBalanced ? "Seimbang (Balanced)" : "Tidak Seimbang",
      },
    ],
    bannerBox: !isBalanced
      ? {
          text: "⚠ Buku Besar Tidak Seimbang - Terdapat selisih antara Total Debit dan Total Kredit",
          variant: "warning",
        }
      : undefined,
    tableColumns: [
      { header: "No. Akun", widthRatio: 0.11 },
      { header: "Nama Akun", widthRatio: 0.43 },
      { header: "Debit", widthRatio: 0.23, align: "right" },
      { header: "Kredit", widthRatio: 0.23, align: "right" },
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
}): PdfDocumentSpec {
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `IS/${docDate.replace(/-/g, "")}`;

  const tableRows: string[][] = [];

  // PENDAPATAN USAHA
  tableRows.push(["PENDAPATAN USAHA", ""]);
  for (const r of params.revenueRows) {
    tableRows.push([`  ${r.label}`, formatDocRupiah(r.amount)]);
  }
  tableRows.push(["TOTAL PENDAPATAN USAHA", formatDocRupiah(params.totalRevenue)]);

  // BEBAN LANGSUNG PROYEK
  tableRows.push(["BEBAN LANGSUNG PROYEK", ""]);
  if (params.cogsRows && params.cogsRows.length > 0) {
    for (const c of params.cogsRows) {
      tableRows.push([`  ${c.label}`, formatDocRupiah(c.amount)]);
    }
  } else {
    tableRows.push(["  Belum ada beban langsung proyek pada periode ini.", "-"]);
  }
  const gross = params.grossProfit ?? params.totalRevenue;
  tableRows.push(["LABA KOTOR PROYEK", formatDocRupiah(gross)]);

  // BEBAN OPERASIONAL BERSAMA
  tableRows.push(["BEBAN OPERASIONAL BERSAMA", ""]);
  if (params.opexRows && params.opexRows.length > 0) {
    for (const o of params.opexRows) {
      tableRows.push([`  ${o.label}`, formatDocRupiah(o.amount)]);
    }
    if (params.totalOpex !== undefined) {
      tableRows.push(["TOTAL BEBAN OPERASIONAL BERSAMA", formatDocRupiah(params.totalOpex)]);
    }
  } else {
    tableRows.push(["  Belum ada beban operasional bersama pada periode ini.", "-"]);
  }

  // LABA (RUGI) BERSIH
  tableRows.push([
    "LABA (RUGI) BERSIH PERIODE BERJALAN",
    formatDocRupiah(params.netIncome),
  ]);

  return {
    docTitle: "LAPORAN LABA RUGI BASIS AKRUAL",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      "Basis Akuntansi: Akrual (Accrual Basis)",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      { label: "Mata Uang", value: "Rupiah (IDR)" },
    ],
    tableColumns: [
      { header: "Komponen / Keterangan", widthRatio: 0.68 },
      { header: "Nominal (IDR)", widthRatio: 0.32, align: "right" },
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
}): PdfDocumentSpec {
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `EQ/${docDate.replace(/-/g, "")}`;

  const tableRows = params.rows.map((r) => [
    r.label.toUpperCase(),
    formatDocRupiah(r.amount),
  ]);
  tableRows.push([
    "TOTAL SALDO LABA DITAHAN AKHIR",
    formatDocRupiah(params.endingRetainedEarnings),
  ]);

  return {
    docTitle: "LAPORAN PERUBAHAN EKUITAS",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      "Komponen: Modal Disetor & Saldo Laba Ditahan",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      { label: "Mata Uang", value: "Rupiah (IDR)" },
    ],
    tableColumns: [
      { header: "Komponen Ekuitas & Saldo Laba", widthRatio: 0.68 },
      { header: "Nominal (IDR)", widthRatio: 0.32, align: "right" },
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
}): PdfDocumentSpec {
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `BS/${docDate.replace(/-/g, "")}`;
  const isBalanced = params.isBalanced ?? true;

  const tableRows: string[][] = [];

  // 1. ASET
  tableRows.push(["ASET LANCAR", ""]);
  for (const a of params.currentAssetRows) {
    tableRows.push([`  ${a.label}`, formatDocRupiah(a.amount)]);
  }
  tableRows.push(["TOTAL ASET LANCAR", formatDocRupiah(params.totalCurrentAssets)]);

  if (params.nonCurrentAssetRows.length > 0) {
    tableRows.push(["ASET TIDAK LANCAR", ""]);
    for (const na of params.nonCurrentAssetRows) {
      tableRows.push([`  ${na.label}`, formatDocRupiah(na.amount)]);
    }
    tableRows.push([
      "TOTAL ASET TIDAK LANCAR",
      formatDocRupiah(params.totalNonCurrentAssets),
    ]);
  }
  tableRows.push(["TOTAL ASET", formatDocRupiah(params.totalAssets)]);

  // 2. LIABILITAS
  tableRows.push(["LIABILITAS JANGKA PENDEK", ""]);
  for (const l of params.currentLiabRows) {
    tableRows.push([`  ${l.label}`, formatDocRupiah(l.amount)]);
  }
  tableRows.push([
    "TOTAL LIABILITAS JANGKA PENDEK",
    formatDocRupiah(params.totalCurrentLiabilities),
  ]);

  if (params.nonCurrentLiabRows.length > 0) {
    tableRows.push(["LIABILITAS JANGKA PANJANG", ""]);
    for (const nl of params.nonCurrentLiabRows) {
      tableRows.push([`  ${nl.label}`, formatDocRupiah(nl.amount)]);
    }
    tableRows.push([
      "TOTAL LIABILITAS JANGKA PANJANG",
      formatDocRupiah(params.totalNonCurrentLiabilities),
    ]);
  }
  tableRows.push(["TOTAL LIABILITAS", formatDocRupiah(params.totalLiabilities)]);

  // 3. EKUITAS
  tableRows.push(["EKUITAS", ""]);
  for (const eq of params.equityRows) {
    tableRows.push([`  ${eq.label}`, formatDocRupiah(eq.amount)]);
  }
  tableRows.push(["TOTAL EKUITAS", formatDocRupiah(params.totalEquity)]);

  tableRows.push([
    "TOTAL LIABILITAS & EKUITAS",
    formatDocRupiah(params.totalLiabilitiesAndEquity),
  ]);

  return {
    docTitle: "LAPORAN POSISI KEUANGAN (NERACA)",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Dasar Posisi Keuangan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      "Struktur: Aset = Liabilitas + Ekuitas",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Posisi Per", value: params.periodLabel },
      {
        label: "Status Keseimbangan",
        value: isBalanced ? "Seimbang (Balanced)" : "Selisih Perhitungan",
      },
    ],
    bannerBox: !isBalanced
      ? {
          text: "⚠ Posisi Keuangan Tidak Seimbang - Terdapat selisih antara Aset dan Pasiva",
          variant: "warning",
        }
      : undefined,
    tableColumns: [
      { header: "Akun / Komponen Posisi Keuangan", widthRatio: 0.68 },
      { header: "Nominal (IDR)", widthRatio: 0.32, align: "right" },
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
}): PdfDocumentSpec {
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `CF/${docDate.replace(/-/g, "")}`;

  const tableRows: string[][] = [];

  tableRows.push(["SALDO KAS AWAL PERIODE", formatDocRupiah(params.beginningCash)]);

  tableRows.push(["AKTIVITAS OPERASI", ""]);
  for (const o of params.operatingRows) {
    tableRows.push([`  ${o.label}`, formatDocRupiah(o.amount)]);
  }
  tableRows.push([
    "ARUS KAS BERSIH DARI AKTIVITAS OPERASI",
    formatDocRupiah(params.netOperating),
  ]);

  tableRows.push(["AKTIVITAS INVESTASI", ""]);
  if (params.investingRows && params.investingRows.length > 0) {
    for (const inv of params.investingRows) {
      tableRows.push([`  ${inv.label}`, formatDocRupiah(inv.amount)]);
    }
  } else {
    tableRows.push(["  Tidak ada mutasi aktivitas investasi pada periode ini.", "-"]);
  }
  tableRows.push([
    "ARUS KAS BERSIH DARI AKTIVITAS INVESTASI",
    formatDocRupiah(params.netInvesting ?? 0),
  ]);

  tableRows.push(["AKTIVITAS PENDANAAN", ""]);
  if (params.financingRows && params.financingRows.length > 0) {
    for (const fin of params.financingRows) {
      tableRows.push([`  ${fin.label}`, formatDocRupiah(fin.amount)]);
    }
  } else {
    tableRows.push(["  Tidak ada mutasi aktivitas pendanaan pada periode ini.", "-"]);
  }
  tableRows.push([
    "ARUS KAS BERSIH DARI AKTIVITAS PENDANAAN",
    formatDocRupiah(params.netFinancing ?? 0),
  ]);

  tableRows.push([
    "KENAIKAN (PENURUNAN) BERSIH KAS",
    formatDocRupiah(params.netCashChange),
  ]);
  tableRows.push([
    "SALDO KAS AKHIR PERIODE",
    formatDocRupiah(params.endingCash),
  ]);

  return {
    docTitle: "LAPORAN ARUS KAS METODE LANGSUNG",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      "Metode: Langsung (Direct Cash Flow Method)",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      { label: "Mata Uang", value: "Rupiah (IDR)" },
    ],
    tableColumns: [
      { header: "Aktivitas Arus Kas", widthRatio: 0.68 },
      { header: "Nominal (IDR)", widthRatio: 0.32, align: "right" },
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
}): PdfDocumentSpec {
  const docDate = params.docDate ?? new Date().toISOString().slice(0, 10);
  const docNumber =
    params.refNumber ?? `FS/${docDate.replace(/-/g, "")}`;

  const stdCols: PdfTableColumn[] = [
    { header: "Komponen / Pos Laporan", widthRatio: 0.68 },
    { header: "Nominal (IDR)", widthRatio: 0.32, align: "right" },
  ];

  const sections: PdfDocumentSection[] = [
    {
      title: "1. LAPORAN LABA RUGI BASIS AKRUAL",
      subtitle: "Pendapatan Usaha, Beban Langsung & Beban Operasional",
      tableColumns: stdCols,
      tableRows: params.incomeStatementRows,
    },
    {
      title: "2. LAPORAN PERUBAHAN EKUITAS",
      subtitle: "Modal Disetor dan Mutasi Saldo Laba Ditahan",
      tableColumns: stdCols,
      tableRows: params.retainedEarningsRows,
      pageBreakBefore: true,
    },
    {
      title: "3. LAPORAN POSISI KEUANGAN (NERACA)",
      subtitle: "Posisi Aset, Liabilitas, dan Ekuitas Per Akhir Periode",
      tableColumns: stdCols,
      tableRows: params.balanceSheetRows,
      pageBreakBefore: true,
    },
    {
      title: "4. LAPORAN ARUS KAS METODE LANGSUNG",
      subtitle: "Aktivitas Operasi, Investasi, dan Pendanaan Kas",
      tableColumns: stdCols,
      tableRows: params.cashFlowRows,
      pageBreakBefore: true,
    },
  ];

  return {
    docTitle: "LAPORAN KEUANGAN LENGKAP",
    docNumber,
    docDate,
    company: params.company,
    recipientTitle: "Dasar Penyusunan",
    recipientLines: [
      params.company.legal_entity_name || "PT Representasi Mitra Mandiri",
      "Paket Lengkap: Laba Rugi, Ekuitas, Neraca, dan Arus Kas",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(docDate) },
      { label: "Periode", value: params.periodLabel },
      { label: "Standar Pelaporan", value: "SAK Entitas Privat" },
    ],
    sections,
  };
}
