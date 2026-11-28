import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { getCompanyProfile } from "@/lib/data-service";
import { formatDateTimeID } from "@/lib/formatters";
import type { DashboardPeriodPreset } from "@/components/shared/dashboard-period-filter";
import type {
  AccountRow,
  AuditLogRow,
  CompanyProfileRow,
  ProfileRow,
} from "@/types/database.types";

export interface SuperAdminDashboardExportContext {
  profiles: ProfileRow[];
  activeUsers: number;
  company: CompanyProfileRow | null;
  accounts: AccountRow[];
  allLogs: AuditLogRow[];
  recentLogs: AuditLogRow[];
  coaCompositionSlices: Array<{ label: string; value: number }>;
  periodFilter: DashboardPeriodPreset;
  t: (key: string, fallback: string) => string;
  language: "id" | "en";
}

export async function exportSuperAdminExcel(ctx: SuperAdminDashboardExportContext): Promise<void> {
  const { profiles, activeUsers, company, accounts, allLogs, recentLogs, coaCompositionSlices, t } = ctx;
  const rows: Array<Array<string | number>> = [];
  rows.push([
    t("dashboard:export.col_indicator", "Indikator / Kategori"),
    t("dashboard:export.col_value", "Nilai / Status"),
    t("dashboard:export.col_unit", "Satuan / Keterangan"),
    t("dashboard:export.col_details", "Rincian Tambahan"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_users", "Pengguna Internal"),
    `${activeUsers} / ${profiles.length}`,
    "Akun",
    t("settings:super_admin.kpi_users_sub", "Akses peran aktif dan terverifikasi"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_tax", "Status Perpajakan"),
    company?.pkp_enabled
      ? t("settings:super_admin.pkp_active", "PKP Aktif")
      : t("settings:super_admin.non_pkp", "Non-PKP"),
    company?.pkp_enabled ? `PPN ${company.ppn_rate}%` : "-",
    company?.pkp_enabled
      ? t("settings:super_admin.vat_applied", "Faktur menyertakan PPN")
      : t("settings:super_admin.vat_none", "Faktur tanpa PPN"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_coa", "Bagan Akun (COA)"),
    accounts.length,
    "Akun",
    t("settings:super_admin.sak_standard", "Standar Akuntansi Keuangan"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_audit", "Total Jejak Audit"),
    allLogs.length,
    "Log",
    t("settings:super_admin.audit_saved", "Rekaman audit aktivitas tersimpan"),
  ]);

  rows.push(["", "", "", ""]);
  rows.push(["KOMPOSISI BAGAN AKUN (COA)", "", "", ""]);
  coaCompositionSlices.forEach((c) => {
    rows.push([c.label, c.value, "Akun", `Tipe akun ${c.label}`]);
  });

  rows.push(["", "", "", ""]);
  rows.push(["JEJAK AUDIT TERBARU", "", "", ""]);
  rows.push(["Waktu", "Aktor", "Aksi", "Entitas"]);
  recentLogs.slice(0, 20).forEach((l) => {
    rows.push([
      formatDateTimeID(l.created_at),
      l.actor_role ?? "sistem",
      l.action,
      `${l.entity_name} (#${l.entity_id ? l.entity_id.slice(0, 8) : "-"})`,
    ]);
  });

  await downloadExcelSheet({
    fileName: `Ringkasan-Dasbor-Super-Admin-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: "Dasbor Super Admin",
    columns: [
      { header: t("dashboard:export.col_indicator", "Indikator / Kategori"), width: 35 },
      { header: t("dashboard:export.col_value", "Nilai / Status"), width: 25 },
      { header: t("dashboard:export.col_unit", "Satuan / Keterangan"), width: 20 },
      { header: t("dashboard:export.col_details", "Rincian Tambahan"), width: 45 },
    ],
    rows,
  });
  toast.success(t("dashboard:export.toast_excel_success", "Ringkasan dasbor berhasil diekspor ke Excel"));
}

export function exportSuperAdminCsv(ctx: SuperAdminDashboardExportContext): void {
  const { profiles, activeUsers, company, accounts, allLogs, coaCompositionSlices, t } = ctx;
  const rows: Array<Array<string | number>> = [];
  rows.push([
    t("settings:super_admin.kpi_users", "Pengguna Internal"),
    `${activeUsers} / ${profiles.length}`,
    "Akun",
    t("settings:super_admin.kpi_users_sub", "Akses peran aktif dan terverifikasi"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_tax", "Status Perpajakan"),
    company?.pkp_enabled
      ? t("settings:super_admin.pkp_active", "PKP Aktif")
      : t("settings:super_admin.non_pkp", "Non-PKP"),
    company?.pkp_enabled ? `PPN ${company.ppn_rate}%` : "-",
    company?.pkp_enabled
      ? t("settings:super_admin.vat_applied", "Faktur menyertakan PPN")
      : t("settings:super_admin.vat_none", "Faktur tanpa PPN"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_coa", "Bagan Akun (COA)"),
    accounts.length,
    "Akun",
    t("settings:super_admin.sak_standard", "Standar Akuntansi Keuangan"),
  ]);
  rows.push([
    t("settings:super_admin.kpi_audit", "Total Jejak Audit"),
    allLogs.length,
    "Log",
    t("settings:super_admin.audit_saved", "Rekaman audit aktivitas tersimpan"),
  ]);
  coaCompositionSlices.forEach((c) => {
    rows.push([`COA - ${c.label}`, c.value, "Akun", `Tipe akun ${c.label}`]);
  });

  downloadCsvFile(
    `Ringkasan-Dasbor-Super-Admin-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      t("dashboard:export.col_indicator", "Indikator / Kategori"),
      t("dashboard:export.col_value", "Nilai / Status"),
      t("dashboard:export.col_unit", "Satuan / Keterangan"),
      t("dashboard:export.col_details", "Rincian Tambahan"),
    ],
    rows,
  );
  toast.success(t("dashboard:export.toast_csv_success", "Ringkasan dasbor berhasil diekspor ke CSV"));
}

export async function exportSuperAdminPdf(ctx: SuperAdminDashboardExportContext): Promise<void> {
  const { profiles, activeUsers, company, accounts, allLogs, recentLogs, periodFilter, t, language } = ctx;
  const comp = await getCompanyProfile();
  const bytes = await generateDocumentPdf({
    orientation: "landscape",
    docTitle: t("settings:super_admin.pdf_title", "Ringkasan Dasbor Pengelola Sistem"),
    docSubtitle: `${t("common:action.period", "Periode")}: ${periodFilter === "all" ? t("dashboard:filter.all_periods", "Semua Periode") : periodFilter}`,
    docNumber: `SYS-DSB/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    docDate: new Date().toISOString().slice(0, 10),
    company: comp,
    language,
    metaRows: [
      { label: t("settings:super_admin.kpi_users", "Pengguna Internal"), value: `${activeUsers} / ${profiles.length} Pengguna` },
      { label: t("settings:super_admin.kpi_tax", "Status Perpajakan"), value: company?.pkp_enabled ? `PKP (PPN ${company.ppn_rate}%)` : "Non-PKP" },
      { label: t("settings:super_admin.kpi_coa", "Bagan Akun (COA)"), value: `${accounts.length} Akun` },
      { label: t("settings:super_admin.kpi_audit", "Total Jejak Audit"), value: `${allLogs.length} Log Aktivitas` },
    ],
    sections: [
      {
        title: t("settings:super_admin.card_recent_audit", "Jejak Audit Terbaru"),
        tableColumns: [
          { header: t("settings:audit.col_timestamp", "Waktu Kejadian"), widthRatio: 0.22, align: "left" },
          { header: t("settings:audit.col_actor", "Pelaku & Peran"), widthRatio: 0.28, align: "left" },
          { header: t("settings:audit.col_action", "Tindakan"), widthRatio: 0.20, align: "center" },
          { header: t("settings:audit.col_entity", "Entitas / Modul"), widthRatio: 0.30, align: "left" },
        ],
        tableRows: recentLogs.slice(0, 15).map((log) => [
          formatDateTimeID(log.created_at),
          log.actor_role ?? "sistem",
          log.action,
          `${log.entity_name} (#${log.entity_id ? log.entity_id.slice(0, 8) : "-"})`,
        ]),
      },
    ],
  });
  downloadPdfBytes(bytes, `Ringkasan-Dasbor-Super-Admin-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success(t("dashboard:export.toast_pdf_success", "Ringkasan dasbor berhasil diekspor ke PDF"));
}
