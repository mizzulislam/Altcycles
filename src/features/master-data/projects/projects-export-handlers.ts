import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { getLocalizedRevenueMethod } from "@/lib/glossary";
import { getCompanyProfile } from "@/lib/data-service";
import { recordExportLog } from "@/lib/operations-service";
import type { ProjectMemberRow, ProjectRow } from "@/types/database.types";
import { PROJECT_STATUS_META } from "./projects-types";

export interface ProjectsExportContext {
  filteredProjects: ProjectRow[];
  members: ProjectMemberRow[];
  language?: "id" | "en";
  t: (k: string, fb?: string | Record<string, unknown>) => string;
}

export async function handleExportProjectsExcel(ctx: ProjectsExportContext) {
  const { filteredProjects, members, language, t } = ctx;
  await downloadExcelSheet({
    fileName: t("projects:export.excel_filename") as string,
    sheetName: t("projects:export.excel_sheet") as string,
    columns: [
      { header: t("projects:col_code") as string, width: 18 },
      { header: t("projects:col_name") as string, width: 36 },
      { header: t("projects:modal.field_start_date") as string, width: 14 },
      { header: t("projects:modal.field_end_date") as string, width: 14 },
      { header: t("projects:modal.field_contract_value") as string, width: 20 },
      { header: t("projects:col_milestones") as string, width: 14 },
      { header: t("projects:modal.field_revenue_method") as string, width: 32 },
      { header: t("projects:col_team") as string, width: 14 },
      { header: t("projects:col_status") as string, width: 14 },
    ],
    rows: filteredProjects.map((p) => {
      const countMembers = members.filter((m) => m.project_id === p.id).length;
      const statusLabel = t(`projects:status.${p.status}`, PROJECT_STATUS_META[p.status]?.label ?? p.status);
      return [
        p.code,
        p.name,
        formatDateI18n(p.start_date, language),
        formatDateI18n(p.target_end_date, language),
        p.contract_value,
        p.term_count,
        getLocalizedRevenueMethod(p.revenue_method, (language ?? "id") as "id" | "en"),
        `${countMembers} ${t("projects:members_count")}`,
        statusLabel,
      ];
    }),
  });
  await recordExportLog("PROJECTS_MASTER", "EXCEL");
  toast.success(t("projects:export.toast_excel_success") as string);
}

export async function handleExportProjectsPdf(ctx: ProjectsExportContext) {
  const { filteredProjects, members, language, t } = ctx;
  const comp = await getCompanyProfile();
  const bytes = await generateDocumentPdf({
    docTitle: t("projects:export.pdf_title") as string,
    docSubtitle: t("projects:export.pdf_subtitle", { count: filteredProjects.length }) as string,
    docNumber: `PRJ-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    docDate: new Date().toISOString().slice(0, 10),
    company: comp,
    orientation: "landscape",
    tableColumns: [
      { header: t("projects:col_code") as string, widthRatio: 0.12, align: "center" },
      { header: t("projects:col_name") as string, widthRatio: 0.28 },
      { header: t("projects:col_period") as string, widthRatio: 0.18, align: "center" },
      { header: t("projects:col_contract_val") as string, widthRatio: 0.14, align: "right" },
      { header: t("projects:col_milestones") as string, widthRatio: 0.08, align: "center" },
      { header: t("projects:col_team") as string, widthRatio: 0.10, align: "center" },
      { header: t("projects:col_status") as string, widthRatio: 0.10, align: "center" },
    ],
    tableRows: filteredProjects.map((p) => {
      const countMembers = members.filter((m) => m.project_id === p.id).length;
      const statusLabel = t(`projects:status.${p.status}`, PROJECT_STATUS_META[p.status]?.label ?? p.status);
      return [
        p.code,
        p.name,
        `${formatDateI18n(p.start_date, language)} - ${formatDateI18n(p.target_end_date, language)}`,
        formatRupiah(p.contract_value),
        `${p.term_count} ${t("projects:milestones_count", "Termin")}`,
        `${countMembers} ${t("projects:members_count", "Anggota")}`,
        statusLabel,
      ];
    }),
    rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
  });
  downloadPdfBytes(bytes, t("projects:export.pdf_filename") as string);
  await recordExportLog("PROJECTS_MASTER", "PDF");
}

export async function handleExportProjectsCsv(ctx: ProjectsExportContext) {
  const { filteredProjects, members, language, t } = ctx;
  downloadCsvFile(
    t("projects:export.csv_filename") as string,
    [
      t("projects:col_code") as string,
      t("projects:col_name") as string,
      t("projects:modal.field_start_date") as string,
      t("projects:modal.field_end_date") as string,
      t("projects:modal.field_contract_value") as string,
      t("projects:col_milestones") as string,
      t("projects:modal.field_revenue_method") as string,
      t("projects:col_team") as string,
      t("projects:col_status") as string,
    ],
    filteredProjects.map((p) => {
      const countMembers = members.filter((m) => m.project_id === p.id).length;
      const statusLabel = t(`projects:status.${p.status}`, PROJECT_STATUS_META[p.status]?.label ?? p.status);
      return [
        p.code,
        p.name,
        p.start_date ? formatDateI18n(p.start_date, language) : "-",
        p.target_end_date ? formatDateI18n(p.target_end_date, language) : "-",
        p.contract_value,
        p.term_count,
        getLocalizedRevenueMethod(p.revenue_method, (language ?? "id") as "id" | "en"),
        countMembers,
        statusLabel,
      ];
    }),
  );
  await recordExportLog("PROJECTS_MASTER", "CSV");
  toast.success(t("projects:export.toast_csv_success") as string);
}
