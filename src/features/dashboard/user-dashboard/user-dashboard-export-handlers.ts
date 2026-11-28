import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatRupiah } from "@/lib/formatters";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  PaymentRequestRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";

export interface UserDashboardExportContext {
  t: (key: string, optionsOrFallback?: any, fallback?: string) => string;
  periodFilter: string;
  projects: ProjectRow[];
  filteredPos: PurchaseOrderRow[];
  totalPaidNominal: number;
  paidPa: number;
  totalMyShare: number;
  sharingLines: ProfitSharingLineRow[];
  sharingResults: ProfitSharingResultRow[];
  filteredRequests: PaymentRequestRow[];
}

export async function exportUserDashboardExcel(ctx: UserDashboardExportContext) {
  const {
    t,
    projects,
    filteredPos,
    totalPaidNominal,
    paidPa,
    totalMyShare,
    sharingLines,
    sharingResults,
    filteredRequests,
  } = ctx;

  const rows: Array<Array<string | number>> = [];
  rows.push([
    t("dashboard:export.col_indicator", "Indikator / Kategori"),
    t("dashboard:export.col_value", "Nilai (IDR) / Jumlah"),
    t("dashboard:export.col_unit", "Satuan / Keterangan"),
    t("dashboard:export.col_details", "Rincian Tambahan"),
  ]);
  rows.push([
    t("user_portal.kpi_projects", "Proyek Ditugaskan"),
    projects.length,
    "Proyek",
    projects.length > 0
      ? t("user_portal.kpi_projects_sub", "Terdaftar sebagai pelaksana proyek aktif")
      : t("user_portal.kpi_projects_empty", "Belum ada penugasan aktif"),
  ]);
  rows.push([
    t("user_portal.kpi_po", "PO Pembelian Vendor"),
    filteredPos.length,
    "Dokumen",
    "Dokumen PO pengadaan barang & vendor",
  ]);
  rows.push([
    t("user_portal.kpi_paid", "Pengajuan Dana Dicairkan"),
    totalPaidNominal,
    "IDR",
    `${paidPa} pengajuan selesai dicairkan`,
  ]);
  rows.push([
    t("user_portal.kpi_sharing", "Total Hak Bagi Hasil"),
    totalMyShare,
    "IDR",
    `${sharingLines.length} alokasi bagi hasil proyek`,
  ]);

  rows.push(["", "", "", ""]);
  rows.push(["DAFTAR PENGAJUAN PEMBAYARAN", "", "", ""]);
  rows.push(["Nomor Pengajuan", "Keperluan", "Nominal (IDR)", "Status"]);
  filteredRequests.forEach((r) => {
    rows.push([
      r.request_number,
      r.purpose ?? "-",
      r.amount,
      r.status.toUpperCase(),
    ]);
  });

  if (sharingLines.length > 0) {
    rows.push(["", "", "", ""]);
    rows.push(["ALOKASI BAGI HASIL PROYEK", "", "", ""]);
    rows.push(["Proyek", "Nominal Bagi Hasil (IDR)", "Porsi (%)", "Status"]);
    sharingLines.forEach((l, idx) => {
      const res = sharingResults.find((r) => r.id === l.result_id);
      const prj = projects.find((p) => p.id === res?.project_id);
      rows.push([
        prj ? `${prj.code} — ${prj.name}` : `Proyek #${idx + 1}`,
        l.share_amount,
        `${l.percentage}%`,
        "Teralokasi",
      ]);
    });
  }

  await downloadExcelSheet({
    fileName: `Ringkasan-Dasbor-User-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: "Dasbor Anggota Tim",
    columns: [
      { header: t("dashboard:export.col_indicator", "Indikator / Kategori"), width: 35 },
      { header: t("dashboard:export.col_value", "Nilai (IDR) / Jumlah"), width: 25 },
      { header: t("dashboard:export.col_unit", "Satuan / Keterangan"), width: 20 },
      { header: t("dashboard:export.col_details", "Rincian Tambahan"), width: 45 },
    ],
    rows,
  });
  toast.success(t("dashboard:export.toast_excel_success", "Ringkasan dasbor berhasil diekspor ke Excel"));
}

export async function exportUserDashboardCsv(ctx: UserDashboardExportContext) {
  const {
    t,
    projects,
    filteredPos,
    totalPaidNominal,
    paidPa,
    totalMyShare,
    sharingLines,
  } = ctx;

  const rows: Array<Array<string | number>> = [];
  rows.push([
    t("user_portal.kpi_projects", "Proyek Ditugaskan"),
    projects.length,
    "Proyek",
    "Penugasan proyek aktif",
  ]);
  rows.push([
    t("user_portal.kpi_po", "PO Pembelian Vendor"),
    filteredPos.length,
    "Dokumen",
    "PO pembelian vendor",
  ]);
  rows.push([
    t("user_portal.kpi_paid", "Pengajuan Dana Dicairkan"),
    totalPaidNominal,
    "IDR",
    `${paidPa} pengajuan dicairkan`,
  ]);
  rows.push([
    t("user_portal.kpi_sharing", "Total Hak Bagi Hasil"),
    totalMyShare,
    "IDR",
    `${sharingLines.length} alokasi bagi hasil`,
  ]);

  downloadCsvFile(
    `Ringkasan-Dasbor-User-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      t("dashboard:export.col_indicator", "Indikator / Kategori"),
      t("dashboard:export.col_value", "Nilai (IDR) / Jumlah"),
      t("dashboard:export.col_unit", "Satuan / Keterangan"),
      t("dashboard:export.col_details", "Rincian Tambahan"),
    ],
    rows,
  );
  toast.success(t("dashboard:export.toast_csv_success", "Ringkasan dasbor berhasil diekspor ke CSV"));
}

export async function exportUserDashboardPdf(ctx: UserDashboardExportContext) {
  const {
    t,
    periodFilter,
    projects,
    filteredPos,
    totalPaidNominal,
    totalMyShare,
    filteredRequests,
  } = ctx;

  const comp = await getCompanyProfile();
  const bytes = await generateDocumentPdf({
    orientation: "landscape",
    docTitle: t("user_portal.pdf_title", "Ringkasan Dasbor Portal Anggota Tim"),
    docSubtitle: `${t("common:action.period", "Periode")}: ${periodFilter === "all" ? t("dashboard:filter.all_periods", "Semua Periode") : periodFilter}`,
    docNumber: `USR-DSB/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    docDate: new Date().toISOString().slice(0, 10),
    company: comp,
    metaRows: [
      { label: t("user_portal.kpi_projects", "Proyek Ditugaskan"), value: `${projects.length} Proyek` },
      { label: t("user_portal.kpi_po", "PO Pembelian"), value: `${filteredPos.length} Dokumen` },
      { label: t("user_portal.kpi_paid", "Dana Dicairkan"), value: formatRupiah(totalPaidNominal) },
      { label: t("user_portal.kpi_sharing", "Total Bagi Hasil"), value: formatRupiah(totalMyShare) },
    ],
    sections: [
      {
        title: t("user_portal.recent_requests", "Daftar Pengajuan Pembayaran Aktif"),
        tableColumns: [
          { header: t("user_portal.col_code", "Nomor Pengajuan"), widthRatio: 0.20, align: "left" },
          { header: t("user_portal.col_purpose", "Keperluan"), widthRatio: 0.35, align: "left" },
          { header: t("user_portal.col_amount", "Nominal (IDR)"), widthRatio: 0.25, align: "right" },
          { header: t("user_portal.col_status", "Status"), widthRatio: 0.20, align: "center" },
        ],
        tableRows: filteredRequests.slice(0, 15).map((r) => [
          r.request_number,
          r.purpose ?? "-",
          formatRupiah(r.amount),
          r.status.toUpperCase(),
        ]),
      },
      {
        title: "LAMPIRAN A: REKAPITULASI PENUGASAN PROYEK AKTIF",
        tableColumns: [
          { header: "Kode Proyek", widthRatio: 0.22, align: "left" },
          { header: "Nama Proyek", widthRatio: 0.40, align: "left" },
          { header: "Nilai Kontrak (IDR)", widthRatio: 0.23, align: "right" },
          { header: "Status", widthRatio: 0.15, align: "center" },
        ],
        tableRows:
          projects.length > 0
            ? projects.slice(0, 10).map((p) => [
                p.code,
                p.name,
                formatRupiah(p.contract_value),
                p.status.toUpperCase(),
              ])
            : [["-", "Belum ada penugasan proyek aktif", "-", "-"]],
      },
      {
        title: "LAMPIRAN B: REKAPITULASI PURCHASE ORDER (PO) PEMBELIAN VENDOR",
        tableColumns: [
          { header: "Nomor PO", widthRatio: 0.25, align: "left" },
          { header: "Tanggal Dokumen", widthRatio: 0.25, align: "center" },
          { header: "Total Nilai PO (IDR)", widthRatio: 0.30, align: "right" },
          { header: "Status Dokumen", widthRatio: 0.20, align: "center" },
        ],
        tableRows:
          filteredPos.length > 0
            ? filteredPos.slice(0, 10).map((po) => [
                po.po_number,
                po.po_date ?? "-",
                formatRupiah(po.total_amount),
                po.status.toUpperCase(),
              ])
            : [["-", "-", "Rp0", "NIHIL"]],
      },
    ],
    rightSignatureLabel: "Penerima Laporan / Anggota Tim Terkait,",
    rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
  });
  downloadPdfBytes(bytes, `Ringkasan-Dasbor-User-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success(t("dashboard:export.toast_pdf_success", "Ringkasan dasbor berhasil diekspor ke PDF"));
}
