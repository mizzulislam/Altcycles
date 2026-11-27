import { toast } from "sonner";
import { getCompanyProfile } from "@/lib/data-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  formatDateID,
  formatDocDateLong,
  formatDocRupiah,
  formatRupiah,
} from "@/lib/formatters";
import { getActiveLanguage } from "@/lib/i18n";
import { recordExportLog } from "@/lib/operations-service";
import { resolveDocumentSigner } from "@/lib/pdf/document-signer-config";
import {
  downloadPdfBytes,
  generateDocumentPdf,
  type DocStatusVariant,
  type PdfDocumentSpec,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import type {
  CompanyProfileRow,
  PoItemRow,
  ProjectRow,
  PurchaseOrderRow,
  VendorRow,
} from "@/types/database.types";
import { PO_STATUS_META } from "./po-table";

type TranslateFn = (
  k: string,
  optsOrFallback?: string | Record<string, unknown>,
) => string;

export function makePoDocSpec({
  po,
  company,
  vendors,
  projects,
  items,
  t,
}: {
  po: PurchaseOrderRow;
  company: CompanyProfileRow | null;
  vendors: VendorRow[];
  projects: ProjectRow[];
  items: PoItemRow[];
  t: TranslateFn;
}): PdfDocumentSpec | null {
  if (!company) return null;
  const lang = getActiveLanguage();

  const vendor = vendors.find((v) => v.id === po.vendor_id);
  const prj = projects.find((p) => p.id === po.project_id);
  const poLines = items.filter((i) => i.po_id === po.id);

  const statusTone: DocStatusVariant =
    po.status === "completed"
      ? "success"
      : po.status === "issued"
        ? "info"
        : po.status === "cancelled"
          ? "danger"
          : "neutral";

  const statusText = t(`po:status_${po.status}`).toUpperCase();

  return {
    docTitle: t("po:doc_spec.title", "PURCHASE ORDER (PO PEMBELIAN VENDOR)"),
    docSubtitle: t(
      "po:doc_spec.subtitle",
      "PESANAN PENGADAAN BARANG / JASA INTERNAL",
    ),
    docNumber: po.po_number,
    docDate: po.po_date,
    statusBadge: {
      text: statusText,
      variant: statusTone,
    },
    balanceDueBox: {
      label: t("po:doc_spec.total_order_value", "TOTAL NILAI PESANAN (PO)"),
      amountText: formatDocRupiah(po.total_amount),
      dueDateText: t(
        "po:doc_spec.payment_terms_standard",
        "Syarat Pembayaran: Transfer Bank Resmi",
      ),
    },
    company,
    recipientTitle: t("po:doc_spec.recipient_title", "Kepada Vendor / Pemasok"),
    recipientLines: [
      vendor?.name ?? t("po:doc_spec.default_vendor_name", "Vendor Mitra"),
      vendor?.address ?? "-",
      `${t("parties:vendors.col_pic", "Kontak")}: ${vendor?.contact_name ?? "-"} · Telp: ${vendor?.phone ?? "-"}`,
    ],
    metaRows: [
      {
        label: t("po:doc_spec.issue_date", "Tanggal Terbit"),
        value: formatDocDateLong(po.po_date, lang),
      },
      { label: t("po:doc_spec.po_number", "Nomor PO"), value: po.po_number },
      {
        label: t("po:doc_spec.related_project", "Proyek Terkait"),
        value: prj ? `${prj.code} - ${prj.name}` : "-",
      },
      {
        label: t("po:doc_spec.delivery_address", "Alamat Pengiriman"),
        value: company.address,
      },
      {
        label: t("po:doc_spec.receiving_contact", "Kontak Penerima"),
        value: `${company.signer_name} (${company.phone})`,
      },
      {
        label: t("po:doc_spec.additional_notes", "Catatan Tambahan"),
        value: po.notes ?? "-",
      },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.07, align: "center" },
      {
        header: t("po:doc_spec.item_desc", "Deskripsi Barang"),
        widthRatio: 0.43,
      },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      {
        header: t("po:doc_spec.unit_price", "Harga Satuan"),
        widthRatio: 0.19,
        align: "right",
      },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ],
    tableRows: poLines.map((l) => [
      String(l.line_no),
      l.description,
      `${l.quantity} ${l.unit}`,
      formatDocRupiah(l.unit_price),
      formatDocRupiah(l.line_total),
    ]),
    summaryRows: [
      {
        label: t("po:doc_spec.total_po_value", "Total Nilai PO"),
        value: formatDocRupiah(po.total_amount),
      },
    ],
    terbilangAmount: po.total_amount,
    notes: [
      t(
        "po:doc_spec.notes_standard",
        "Harap cantumkan Nomor PO ini pada setiap surat jalan, tanda terima, dan tagihan/invoice vendor.",
      ),
    ],
    leftSignatureLabel: t("po:doc_spec.sig_prepared_by", "Dibuat Oleh,"),
    leftSignatureName: company.signer_name,
    leftSignatureImageUrl: resolveDocumentSigner({
      docType: "POP",
      slot: "left",
      company,
      signerUserId: po.created_by,
      signerName: company.signer_name,
      signerJobTitle: company.signer_title,
    }).signatureImageUrl,
    thirdSignatureLabel: t(
      "po:doc_spec.sig_reviewed_by",
      "Diverifikasi & Disetujui,",
    ),
    thirdSignatureName: t(
      "po:doc_spec.sig_finance_director",
      "Direktur Keuangan",
    ),
    thirdSignatureImageUrl: resolveDocumentSigner({
      docType: "POP",
      slot: "third",
      company,
      signerJobTitle: "Direktur Keuangan",
    }).signatureImageUrl,
    rightSignatureLabel: `${t("po:doc_spec.sig_vendor_accepted", "Disetujui Rekanan,")} ${vendor?.name ?? ""}`,
    rightSignatureName:
      vendor?.contact_name ??
      t("po:doc_spec.sig_vendor_rep", "Perwakilan Vendor"),
    footerDocNumber: po.po_number,
  };
}

export async function downloadPoPdf({
  po,
  company,
  vendors,
  projects,
  items,
  t,
}: {
  po: PurchaseOrderRow;
  company: CompanyProfileRow | null;
  vendors: VendorRow[];
  projects: ProjectRow[];
  items: PoItemRow[];
  t: TranslateFn;
}): Promise<void> {
  const spec = makePoDocSpec({ po, company, vendors, projects, items, t });
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, po.po_number.replace(/\//g, "-"));
  await recordExportLog("PO_INTERNAL", "PDF");
}

export async function downloadPoWord({
  po,
  company,
  vendors,
  projects,
  items,
  t,
}: {
  po: PurchaseOrderRow;
  company: CompanyProfileRow | null;
  vendors: VendorRow[];
  projects: ProjectRow[];
  items: PoItemRow[];
  t: TranslateFn;
}): Promise<void> {
  const spec = makePoDocSpec({ po, company, vendors, projects, items, t });
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${po.po_number.replace(/\//g, "-")}.docx`);
  await recordExportLog("PO_INTERNAL", "PDF");
  toast.success(
    t("po:doc_spec.toast_word_success", {
      number: po.po_number,
      defaultValue: `Dokumen PO ${po.po_number} (Word) berhasil diunduh.`,
    }),
  );
}

export async function exportPoListToExcel({
  filtered,
  vendors,
  projects,
  t,
}: {
  filtered: PurchaseOrderRow[];
  vendors: VendorRow[];
  projects: ProjectRow[];
  t: TranslateFn;
}): Promise<void> {
  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.code]));
  await downloadExcelSheet({
    fileName: t("po:export.excel_filename", "Daftar-PO-Pembelian-Internal.xlsx"),
    sheetName: t("po:export.excel_sheet", "PO Pembelian"),
    columns: [
      { header: t("po:col_po_number", "Nomor PO"), width: 22 },
      { header: t("po:col_date", "Tanggal"), width: 14 },
      { header: t("po:col_vendor", "Vendor"), width: 28 },
      { header: t("po:col_project", "Kode Proyek"), width: 18 },
      { header: t("po:col_total", "Total (IDR)"), width: 18 },
      { header: t("po:col_status", "Status"), width: 16 },
    ],
    rows: filtered.map((o) => [
      o.po_number,
      formatDateID(o.po_date),
      vendorMap.get(o.vendor_id) ?? "-",
      projectMap.get(o.project_id) ?? "-",
      o.total_amount,
      t(`po:status_${o.status}`, PO_STATUS_META[o.status].label),
    ]),
  });
  await recordExportLog("PO_INTERNAL", "EXCEL");
  toast.success(
    t(
      "po:export.toast_excel_success",
      "Daftar PO berhasil diekspor ke Excel (.xlsx).",
    ),
  );
}

export async function exportPoListToPdf({
  filtered,
  company,
  vendors,
  projects,
  t,
}: {
  filtered: PurchaseOrderRow[];
  company: CompanyProfileRow | null;
  vendors: VendorRow[];
  projects: ProjectRow[];
  t: TranslateFn;
}): Promise<void> {
  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.code]));
  const comp = company ?? (await getCompanyProfile());
  const bytes = await generateDocumentPdf({
    docTitle: t(
      "po:export.pdf_title",
      "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR",
    ),
    docSubtitle: t(
      "po:export.pdf_subtitle",
      "Daftar riwayat penerbitan PO pengadaan barang dan jasa vendor Altvira.",
    ),
    docNumber: `PO-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    docDate: new Date().toISOString().slice(0, 10),
    company: comp,
    tableColumns: [
      { header: t("po:col_po_number", "Nomor PO"), widthRatio: 0.2 },
      { header: t("po:col_date", "Tanggal"), widthRatio: 0.14 },
      { header: t("po:col_vendor", "Vendor"), widthRatio: 0.24 },
      { header: t("po:col_project", "Proyek"), widthRatio: 0.14 },
      {
        header: t("po:col_total", "Total (IDR)"),
        widthRatio: 0.16,
        align: "right",
      },
      { header: t("po:col_status", "Status"), widthRatio: 0.12 },
    ],
    tableRows: filtered.map((o) => [
      o.po_number,
      formatDateID(o.po_date),
      vendorMap.get(o.vendor_id) ?? "-",
      projectMap.get(o.project_id) ?? "-",
      formatRupiah(o.total_amount),
      t(`po:status_${o.status}`, PO_STATUS_META[o.status].label),
    ]),
    rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
  });
  downloadPdfBytes(
    bytes,
    t("po:export.pdf_filename", "Daftar_Purchase_Order_Altcycles.pdf"),
  );
  await recordExportLog("PO_INTERNAL", "PDF");
}

export async function exportPoListToCsv({
  filtered,
  vendors,
  projects,
  t,
}: {
  filtered: PurchaseOrderRow[];
  vendors: VendorRow[];
  projects: ProjectRow[];
  t: TranslateFn;
}): Promise<void> {
  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.code]));
  downloadCsvFile(
    t("po:export.csv_filename", "Daftar_Purchase_Order_Altcycles.csv"),
    [
      t("po:col_po_number", "Nomor PO"),
      t("po:col_date", "Tanggal"),
      t("po:col_vendor", "Vendor"),
      t("po:col_project", "Kode Proyek"),
      t("po:col_total", "Total (IDR)"),
      t("po:col_status", "Status"),
    ],
    filtered.map((o) => [
      o.po_number,
      o.po_date,
      vendorMap.get(o.vendor_id) ?? "-",
      projectMap.get(o.project_id) ?? "-",
      o.total_amount,
      t(`po:status_${o.status}`, PO_STATUS_META[o.status].label),
    ]),
  );
  await recordExportLog("PO_INTERNAL", "CSV");
  toast.success(
    t("po:export.toast_csv_success", "Daftar PO berhasil diekspor ke CSV (.csv)."),
  );
}
