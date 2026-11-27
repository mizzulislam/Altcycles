import { toast } from "sonner";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  getLocalizedAccountName,
  getLocalizedJournalType,
  getLocalizedPeriodName,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import { getActiveLanguage } from "@/lib/i18n";
import {
  buildJournalsPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { formatDateID } from "@/lib/formatters";
import { recordExportLog } from "@/lib/operations-service";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  ProjectRow,
} from "@/types/database.types";

interface ExportJournalsPdfParams {
  company: CompanyProfileRow | null;
  filterMode: "all" | "adjusting" | "project";
  sortedJournals: JournalRow[];
  lines: JournalLineRow[];
  accountMap: Map<string, AccountRow>;
  periodFilter: string;
  printPeriodLabel: string;
}

export async function exportJournalsToPdf({
  company,
  filterMode,
  sortedJournals,
  lines,
  accountMap,
  periodFilter,
  printPeriodLabel,
}: ExportJournalsPdfParams): Promise<void> {
  try {
    const lang = getActiveLanguage();
    const isEn = lang === "en";
    const comp = company ?? (await getCompanyProfile());
    const isAdj = filterMode === "adjusting";

    const rows: Array<{
      date: string;
      description: string;
      ref: string;
      debit: number;
      credit: number;
    }> = [];

    for (const j of sortedJournals) {
      const jLines = lines
        .filter((l) => l.journal_id === j.id)
        .sort((a, b) => a.line_no - b.line_no);
      const debitLines = jLines.filter((l) => l.debit > 0);
      const creditLines = jLines.filter((l) => l.credit > 0);

      debitLines.forEach((l, idx) => {
        const acc = accountMap.get(l.account_id);
        rows.push({
          date: idx === 0 ? formatDateID(j.journal_date) : "",
          description: acc
            ? getLocalizedAccountName(acc, lang)
            : isEn
              ? "Debit Account"
              : "Akun Debit",
          ref: acc?.code ?? "-",
          debit: l.debit,
          credit: 0,
        });
      });

      creditLines.forEach((l) => {
        const acc = accountMap.get(l.account_id);
        rows.push({
          date: "",
          description: `   ${
            acc
              ? getLocalizedAccountName(acc, lang)
              : isEn
                ? "Credit Account"
                : "Akun Kredit"
          }`,
          ref: acc?.code ?? "-",
          debit: 0,
          credit: l.credit,
        });
      });

      const memo = j.description
        ? getLocalizedTransactionDescription(j.description, lang)
        : "";
      if (memo) {
        rows.push({
          date: "",
          description: `(${memo})`,
          ref: "",
          debit: 0,
          credit: 0,
        });
      }
    }

    const spec = buildJournalsPdfSpec({
      company: comp,
      isAdjusting: isAdj,
      periodLabel: getLocalizedPeriodName(printPeriodLabel, lang),
      rows,
      lang,
    });

    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(
      bytes,
      isAdj
        ? isEn
          ? "Adjusting_Entries_Altcycles.pdf"
          : "Jurnal_Penyesuaian_Altcycles.pdf"
        : isEn
          ? "General_Journal_Altcycles.pdf"
          : "Jurnal_Umum_Altcycles.pdf",
    );
    void recordExportLog("JOURNALS", "PDF", periodFilter);
    toast.success(
      isAdj
        ? isEn
          ? "Adjusting entries successfully downloaded in PDF (.pdf) format."
          : "Jurnal Penyesuaian berhasil diunduh dalam format PDF (.pdf)."
        : isEn
          ? "General journal successfully downloaded in PDF (.pdf) format."
          : "Jurnal Umum berhasil diunduh dalam format PDF (.pdf).",
    );
  } catch (err) {
    console.error("Gagal mengunduh PDF jurnal:", err);
    toast.error(
      getActiveLanguage() === "en"
        ? "Failed to generate accounting journal PDF file."
        : "Gagal membuat berkas PDF jurnal akuntansi.",
    );
  }
}

interface ExportJournalsExcelParams {
  filteredJournals: JournalRow[];
  lines: JournalLineRow[];
  accountMap: Map<string, AccountRow>;
  projectMap: Map<string, ProjectRow>;
  periodFilter: string;
}

export async function exportJournalsToExcel({
  filteredJournals,
  lines,
  accountMap,
  projectMap,
  periodFilter,
}: ExportJournalsExcelParams): Promise<void> {
  try {
    const lang = getActiveLanguage();
    const isEn = lang === "en";
    const exportRows: Array<Array<string | number>> = [];
    for (const j of filteredJournals) {
      const jLines = lines
        .filter((l) => l.journal_id === j.id)
        .sort((a, b) => a.line_no - b.line_no);
      const prj = j.project_id ? projectMap.get(j.project_id) : undefined;
      for (const l of jLines) {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          j.journal_number,
          formatDateID(j.journal_date),
          getLocalizedJournalType(j.journal_type, lang),
          prj ? prj.code : "-",
          acc ? `${acc.code}: ${getLocalizedAccountName(acc, lang)}` : "-",
          getLocalizedTransactionDescription(l.description || j.description, lang),
          l.debit,
          l.credit,
        ]);
      }
    }

    await downloadExcelSheet({
      fileName: isEn ? "General_Journals_Altcycles.xlsx" : "Jurnal_Akuntansi_Altcycles.xlsx",
      sheetName: isEn ? "Accounting Journals" : "Jurnal Akuntansi",
      columns: [
        { header: isEn ? "Journal No." : "No. Jurnal", width: 20 },
        { header: isEn ? "Date" : "Tanggal", width: 14 },
        { header: isEn ? "Journal Type" : "Jenis Jurnal", width: 24 },
        { header: isEn ? "Project" : "Proyek", width: 16 },
        { header: isEn ? "Account" : "Akun", width: 32 },
        { header: isEn ? "Description" : "Uraian", width: 36 },
        { header: isEn ? "Debit (IDR)" : "Debit (Rp)", width: 18 },
        { header: isEn ? "Credit (IDR)" : "Kredit (Rp)", width: 18 },
      ],
      rows: exportRows,
    });
    await recordExportLog("JOURNALS", "EXCEL", periodFilter);
    toast.success(
      isEn
        ? "Accounting journals exported to Excel (.xlsx) successfully."
        : "Jurnal akuntansi berhasil diekspor ke Excel (.xlsx).",
    );
  } catch (err) {
    console.error("Gagal mengekspor Excel jurnal:", err);
    toast.error(
      getActiveLanguage() === "en"
        ? "Failed to export accounting journals to Excel."
        : "Gagal mengekspor jurnal akuntansi ke Excel.",
    );
  }
}

interface ExportJournalsCsvParams {
  sortedJournals: JournalRow[];
  lines: JournalLineRow[];
  accountMap: Map<string, AccountRow>;
  filterMode: "all" | "adjusting" | "project";
  periodFilter: string;
}

export async function exportJournalsToCsv({
  sortedJournals,
  lines,
  accountMap,
  filterMode,
  periodFilter,
}: ExportJournalsCsvParams): Promise<void> {
  try {
    const lang = getActiveLanguage();
    const isEn = lang === "en";
    const exportRows: Array<Array<string | number>> = [];
    for (const j of sortedJournals) {
      const jLines = lines
        .filter((l) => l.journal_id === j.id)
        .sort((a, b) => a.line_no - b.line_no);
      const debitLines = jLines.filter((l) => l.debit > 0);
      const creditLines = jLines.filter((l) => l.credit > 0);

      debitLines.forEach((l, idx) => {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          idx === 0 ? formatDateID(j.journal_date) : "",
          acc
            ? getLocalizedAccountName(acc, lang)
            : isEn
              ? "Debit Account"
              : "Akun Debit",
          acc?.code ?? "-",
          l.debit,
          "",
        ]);
      });

      creditLines.forEach((l) => {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          "",
          `    ${
            acc
              ? getLocalizedAccountName(acc, lang)
              : isEn
                ? "Credit Account"
                : "Akun Kredit"
          }`,
          acc?.code ?? "-",
          "",
          Math.abs(l.credit),
        ]);
      });

      if (j.description) {
        exportRows.push([
          "",
          `(${getLocalizedTransactionDescription(j.description, lang)})`,
          "",
          "",
          "",
        ]);
      }
    }
    downloadCsvFile(
      filterMode === "adjusting"
        ? isEn
          ? "Adjusting_Entries_Altcycles.csv"
          : "Jurnal_Penyesuaian_Altcycles.csv"
        : isEn
          ? "General_Journal_Altcycles.csv"
          : "Jurnal_Umum_Altcycles.csv",
      isEn
        ? ["Date", "Description", "Ref", "Debit", "Credit"]
        : ["Tanggal", "Deskripsi", "Ref", "Debit", "Kredit"],
      exportRows,
    );
    await recordExportLog("JOURNALS", "CSV", periodFilter);
    toast.success(
      isEn
        ? "Accounting journals exported to CSV (.csv) format successfully."
        : "Jurnal akuntansi berhasil diekspor ke format CSV (.csv).",
    );
  } catch (err) {
    console.error("Gagal mengekspor CSV jurnal:", err);
    toast.error(
      getActiveLanguage() === "en"
        ? "Failed to export accounting journals to CSV."
        : "Gagal mengekspor jurnal akuntansi ke CSV.",
    );
  }
}
