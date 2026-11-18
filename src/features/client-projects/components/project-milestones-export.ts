import { toast } from "sonner";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  type PdfDocumentSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { formatDateID, formatRupiah } from "@/lib/formatters";
import { getActiveLanguage } from "@/lib/i18n";
import { recordExportLog } from "@/lib/operations-service";
import type {
  CompanyProfileRow,
  CustomerRow,
  ProjectRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

export interface ProjectMilestonesExportData {
  project: ProjectRow | null;
  customer: CustomerRow | null;
  company: CompanyProfileRow | null;
  bundle: ProjectWorkspaceBundle | null;
}

export async function exportMilestonesToExcel(data: ProjectMilestonesExportData): Promise<void> {
  const { project, bundle } = data;
  const isEn = getActiveLanguage() === "en";
  if (!project || !bundle || bundle.milestones.length === 0) {
    toast.error(isEn ? "No milestone schedule data to export." : "Belum ada data jadwal termin untuk diekspor.");
    return;
  }
  await downloadExcelSheet({
    sheetName: isEn ? "Milestone Schedule" : "Jadwal Termin Proyek",
    fileName: isEn
      ? `Milestone_Schedule_${project.code}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Jadwal_Termin_${project.code}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    columns: [
      { header: isEn ? "Milestone No" : "Termin Ke", width: 14 },
      { header: isEn ? "Milestone Description" : "Keterangan Termin", width: 36 },
      { header: isEn ? "Share (%)" : "Porsi (%)", width: 14 },
      { header: isEn ? "Amount (IDR)" : "Nominal (IDR)", width: 22 },
      { header: isEn ? "Billing Status" : "Status Penagihan", width: 18 },
    ],
    rows: bundle.milestones.map((m) => {
      const isBilled = bundle.invoices.some((inv) => inv.milestone_id === m.id);
      const isPaid = bundle.invoices.some(
        (inv) => inv.milestone_id === m.id && inv.payment_status === "paid",
      );
      const statusLabel = isPaid
        ? isEn ? "PAID" : "LUNAS"
        : isBilled
          ? isEn ? "BILLED" : "DITAGIHKAN"
          : isEn ? "DRAFT" : "DRAFT";
      return [
        isEn ? `Milestone ${m.sequence_no}` : `Termin ${m.sequence_no}`,
        m.name,
        `${m.percentage}%`,
        m.amount,
        statusLabel,
      ];
    }),
  });
  await recordExportLog("PROJECT_WORKSPACE", "EXCEL");
  toast.success(isEn ? "Milestone schedule successfully exported to Excel (.xlsx)." : "Jadwal termin proyek berhasil diekspor ke Excel (.xlsx).");
}

export async function exportMilestonesToPdf(data: ProjectMilestonesExportData): Promise<void> {
  const { project, customer, company, bundle } = data;
  const isEn = getActiveLanguage() === "en";
  if (!company || !project || !bundle || bundle.milestones.length === 0) {
    toast.error(isEn ? "No milestone schedule data to export." : "Belum ada data jadwal termin untuk diekspor.");
    return;
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const docNum = `SCH/${project.code}/${new Date().getFullYear()}`;
  const spec: PdfDocumentSpec = {
    docTitle: isEn ? "PROJECT MILESTONE BILLING SCHEDULE" : "JADWAL TERMIN PENAGIHAN PROYEK",
    docSubtitle: `${project.code} - ${project.name}`,
    docNumber: docNum,
    docDate: todayStr,
    statusBadge: {
      text: isEn ? "ACTIVE SCHEDULE" : "JADWAL AKTIF",
      variant: "info",
    },
    company,
    recipientTitle: isEn ? "Project & Client Information:" : "Informasi Proyek & Klien:",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? (isEn ? "Internal Project" : "Proyek Internal"),
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: isEn ? "Print Date" : "Tanggal Cetak", value: formatDateID(todayStr) },
      { label: isEn ? "Project Code & Name" : "Kode & Nama Proyek", value: `${project.code} - ${project.name}` },
      { label: isEn ? "Total Contract Value" : "Total Nilai Kontrak", value: formatRupiah(project.contract_value) },
    ],
    tableColumns: [
      { header: isEn ? "Milestone" : "Termin", widthRatio: 0.16, align: "center" },
      { header: isEn ? "Milestone Description" : "Keterangan Termin", widthRatio: 0.44 },
      { header: isEn ? "Share" : "Porsi", widthRatio: 0.16, align: "center" },
      { header: isEn ? "Amount (IDR)" : "Nominal (IDR)", widthRatio: 0.24, align: "right" },
    ],
    tableRows: bundle.milestones.map((m) => [
      isEn ? `Milestone ${m.sequence_no}` : `Termin ${m.sequence_no}`,
      m.name,
      `${m.percentage}%`,
      formatRupiah(m.amount),
    ]),
    summaryRows: [
      {
        label: isEn ? "Total Milestones Value" : "Total Nilai Termin",
        value: formatRupiah(
          bundle.milestones.reduce((sum, m) => sum + m.amount, 0),
        ),
      },
    ],
    terbilangAmount: bundle.milestones.reduce((sum, m) => sum + m.amount, 0),
    notes: isEn
      ? [
          "This milestone billing schedule serves as the basis for Work Progress Reports (BAKP) and official project milestone invoices.",
          "This document is officially generated by the Altcycles Financial ERP system.",
        ]
      : [
          "Jadwal termin penagihan ini menjadi dasar penerbitan Berita Acara Kemajuan Pekerjaan (BAKP) dan Invoice resmi termin proyek.",
          "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira.",
        ],
    rightSignatureLabel: isEn ? `Issued By, ${company.company_name}` : `Dikeluarkan Oleh, ${company.company_name}`,
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: docNum,
  };
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(
    bytes,
    isEn
      ? `Milestone_Schedule_${project.code}_${new Date().toISOString().slice(0, 10)}.pdf`
      : `Jadwal_Termin_${project.code}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
  await recordExportLog("PROJECT_WORKSPACE", "PDF");
}

export async function exportMilestonesToCsv(data: ProjectMilestonesExportData): Promise<void> {
  const { project, bundle } = data;
  const isEn = getActiveLanguage() === "en";
  if (!project || !bundle || bundle.milestones.length === 0) {
    toast.error(isEn ? "No milestone schedule data to export." : "Belum ada data jadwal termin untuk diekspor.");
    return;
  }
  downloadCsvFile(
    isEn
      ? `Milestone_Schedule_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`
      : `Jadwal_Termin_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`,
    isEn
      ? [
          "Milestone No",
          "Milestone Description",
          "Share (%)",
          "Amount (IDR)",
          "Billing Status",
        ]
      : [
          "Termin Ke",
          "Keterangan Termin",
          "Porsi (%)",
          "Nominal (IDR)",
          "Status Penagihan",
        ],
    bundle.milestones.map((m) => {
      const isBilled = bundle.invoices.some((inv) => inv.milestone_id === m.id);
      const isPaid = bundle.invoices.some(
        (inv) => inv.milestone_id === m.id && inv.payment_status === "paid",
      );
      const statusLabel = isPaid
        ? isEn ? "PAID" : "LUNAS"
        : isBilled
          ? isEn ? "BILLED" : "DITAGIHKAN"
          : isEn ? "DRAFT" : "DRAFT";
      return [
        isEn ? `Milestone ${m.sequence_no}` : `Termin ${m.sequence_no}`,
        m.name,
        m.percentage,
        m.amount,
        statusLabel,
      ];
    }),
  );
  await recordExportLog("PROJECT_WORKSPACE", "CSV");
  toast.success(isEn ? "Milestone schedule successfully exported to CSV (.csv)." : "Jadwal termin proyek berhasil diekspor ke CSV (.csv).");
}
