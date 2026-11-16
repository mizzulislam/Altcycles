import { toast } from "sonner";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  type PdfDocumentSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { formatDateID, formatRupiah } from "@/lib/formatters";
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
  if (!project || !bundle || bundle.milestones.length === 0) {
    toast.error("Belum ada data jadwal termin untuk diekspor.");
    return;
  }
  await downloadExcelSheet({
    sheetName: "Jadwal Termin Proyek",
    fileName: `Jadwal_Termin_${project.code}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    columns: [
      { header: "Termin Ke", width: 14 },
      { header: "Keterangan Termin", width: 36 },
      { header: "Porsi (%)", width: 14 },
      { header: "Nominal (IDR)", width: 22 },
      { header: "Status Penagihan", width: 18 },
    ],
    rows: bundle.milestones.map((m) => {
      const isBilled = bundle.invoices.some((inv) => inv.milestone_id === m.id);
      const isPaid = bundle.invoices.some(
        (inv) => inv.milestone_id === m.id && inv.payment_status === "paid",
      );
      return [
        `Termin ${m.sequence_no}`,
        m.name,
        `${m.percentage}%`,
        m.amount,
        isPaid ? "LUNAS" : isBilled ? "DITAGIHKAN" : "DRAFT",
      ];
    }),
  });
  await recordExportLog("PROJECT_WORKSPACE", "EXCEL");
  toast.success("Jadwal termin proyek berhasil diekspor ke Excel (.xlsx).");
}

export async function exportMilestonesToPdf(data: ProjectMilestonesExportData): Promise<void> {
  const { project, customer, company, bundle } = data;
  if (!company || !project || !bundle || bundle.milestones.length === 0) {
    toast.error("Belum ada data jadwal termin untuk diekspor.");
    return;
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const docNum = `SCH/${project.code}/${new Date().getFullYear()}`;
  const spec: PdfDocumentSpec = {
    docTitle: "JADWAL TERMIN PENAGIHAN PROYEK",
    docSubtitle: `${project.code} - ${project.name}`,
    docNumber: docNum,
    docDate: todayStr,
    statusBadge: {
      text: "JADWAL AKTIF",
      variant: "info",
    },
    company,
    recipientTitle: "Informasi Proyek & Klien:",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? "Proyek Internal",
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: "Tanggal Cetak", value: formatDateID(todayStr) },
      { label: "Kode & Nama Proyek", value: `${project.code} - ${project.name}` },
      { label: "Total Nilai Kontrak", value: formatRupiah(project.contract_value) },
    ],
    tableColumns: [
      { header: "Termin", widthRatio: 0.16, align: "center" },
      { header: "Keterangan Termin", widthRatio: 0.44 },
      { header: "Porsi", widthRatio: 0.16, align: "center" },
      { header: "Nominal (IDR)", widthRatio: 0.24, align: "right" },
    ],
    tableRows: bundle.milestones.map((m) => [
      `Termin ${m.sequence_no}`,
      m.name,
      `${m.percentage}%`,
      formatRupiah(m.amount),
    ]),
    summaryRows: [
      {
        label: "Total Nilai Termin",
        value: formatRupiah(
          bundle.milestones.reduce((sum, m) => sum + m.amount, 0),
        ),
      },
    ],
    terbilangAmount: bundle.milestones.reduce((sum, m) => sum + m.amount, 0),
    notes: [
      "Jadwal termin penagihan ini menjadi dasar penerbitan Berita Acara Kemajuan Pekerjaan (BAKP) dan Invoice resmi termin proyek.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira.",
    ],
    rightSignatureLabel: `Dikeluarkan Oleh, ${company.company_name}`,
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: docNum,
  };
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(
    bytes,
    `Jadwal_Termin_${project.code}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
  await recordExportLog("PROJECT_WORKSPACE", "PDF");
}

export async function exportMilestonesToCsv(data: ProjectMilestonesExportData): Promise<void> {
  const { project, bundle } = data;
  if (!project || !bundle || bundle.milestones.length === 0) {
    toast.error("Belum ada data jadwal termin untuk diekspor.");
    return;
  }
  downloadCsvFile(
    `Jadwal_Termin_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`,
    [
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
      return [
        `Termin ${m.sequence_no}`,
        m.name,
        m.percentage,
        m.amount,
        isPaid ? "LUNAS" : isBilled ? "DITAGIHKAN" : "DRAFT",
      ];
    }),
  );
  await recordExportLog("PROJECT_WORKSPACE", "CSV");
  toast.success("Jadwal termin proyek berhasil diekspor ke CSV (.csv).");
}
