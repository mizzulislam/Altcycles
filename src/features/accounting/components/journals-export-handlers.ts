import { toast } from "sonner";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
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
import { JOURNAL_TYPE_LABELS } from "../journals-page";

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
          description: acc ? acc.name : "Akun Debit",
          ref: acc?.code ?? "-",
          debit: l.debit,
          credit: 0,
        });
      });

      creditLines.forEach((l) => {
        const acc = accountMap.get(l.account_id);
        rows.push({
          date: "",
          description: `   ${acc ? acc.name : "Akun Kredit"}`,
          ref: acc?.code ?? "-",
          debit: 0,
          credit: l.credit,
        });
      });

      const memo = j.description || "";
      if (memo) {
        rows.push({
          date: "",
          description: `   (${memo})`,
          ref: "",
          debit: 0,
          credit: 0,
        });
      }
    }

    const spec = buildJournalsPdfSpec({
      company: comp,
      isAdjusting: isAdj,
      periodLabel: printPeriodLabel,
      rows,
    });

    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(
      bytes,
      isAdj ? "Jurnal_Penyesuaian_Altcycles.pdf" : "Jurnal_Umum_Altcycles.pdf",
    );
    void recordExportLog("JOURNALS", "PDF", periodFilter);
    toast.success(
      isAdj
        ? "Jurnal Penyesuaian berhasil diunduh dalam format PDF (.pdf)."
        : "Jurnal Umum berhasil diunduh dalam format PDF (.pdf).",
    );
  } catch (err) {
    console.error("Gagal mengunduh PDF jurnal:", err);
    toast.error("Gagal membuat berkas PDF jurnal akuntansi.");
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
          JOURNAL_TYPE_LABELS[j.journal_type].label,
          prj ? prj.code : "-",
          acc ? `${acc.code}: ${acc.name}` : "-",
          l.description || j.description,
          l.debit,
          l.credit,
        ]);
      }
    }

    await downloadExcelSheet({
      fileName: "Jurnal_Akuntansi_Altcycles.xlsx",
      sheetName: "Jurnal Akuntansi",
      columns: [
        { header: "No. Jurnal", width: 20 },
        { header: "Tanggal", width: 14 },
        { header: "Jenis Jurnal", width: 24 },
        { header: "Proyek", width: 16 },
        { header: "Akun", width: 32 },
        { header: "Uraian", width: 36 },
        { header: "Debit (Rp)", width: 18 },
        { header: "Kredit (Rp)", width: 18 },
      ],
      rows: exportRows,
    });
    await recordExportLog("JOURNALS", "EXCEL", periodFilter);
    toast.success("Jurnal akuntansi berhasil diekspor ke Excel (.xlsx).");
  } catch (err) {
    console.error("Gagal mengekspor Excel jurnal:", err);
    toast.error("Gagal mengekspor jurnal akuntansi ke Excel.");
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
          acc?.name ?? "Akun Debit",
          acc?.code ?? "-",
          l.debit,
          "",
        ]);
      });

      creditLines.forEach((l) => {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          "",
          `    ${acc?.name ?? "Akun Kredit"}`,
          acc?.code ?? "-",
          "",
          Math.abs(l.credit),
        ]);
      });

      if (j.description) {
        exportRows.push([
          "",
          `(${j.description})`,
          "",
          "",
          "",
        ]);
      }
    }
    downloadCsvFile(
      filterMode === "adjusting"
        ? "Jurnal_Penyesuaian_Altcycles.csv"
        : "Jurnal_Umum_Altcycles.csv",
      [
        "Tanggal",
        "Deskripsi",
        "Ref",
        "Debit",
        "Kredit",
      ],
      exportRows,
    );
    await recordExportLog("JOURNALS", "CSV", periodFilter);
    toast.success("Jurnal akuntansi berhasil diekspor ke format CSV (.csv).");
  } catch (err) {
    console.error("Gagal mengekspor CSV jurnal:", err);
    toast.error("Gagal mengekspor jurnal akuntansi ke CSV.");
  }
}
