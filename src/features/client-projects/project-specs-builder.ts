import {
  type DocStatusVariant,
  type PdfDocumentSpec,
  downloadPdfBytes,
  generateDocumentPdf,
  generateSpkProjectCharterPdf,
} from "@/lib/pdf-generator";
import {
  downloadWordBlob,
  generateDocumentWord,
  generateSpkProjectCharterWord,
} from "@/lib/word-generator";
import { extractSpkCharterContent } from "@/lib/spk-defaults";
import {
  formatDocDateLong,
  formatDocEmpty,
  formatDocRupiah,
} from "@/lib/formatters";
import { recordExportLog } from "@/lib/operations-service";
import type {
  CompanyProfileRow,
  CustomerRow,
  HandoverReportRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectRow,
  QuotationRow,
  UatChecklistRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

export interface ProjectDocContext {
  project: ProjectRow | null;
  customer: CustomerRow | null;
  company: CompanyProfileRow | null;
  bundle: ProjectWorkspaceBundle | null;
}

export function makeQuotationSpec(
  qt: QuotationRow,
  ctx: ProjectDocContext,
): PdfDocumentSpec | null {
  const { customer, company, bundle } = ctx;
  if (!company || !bundle) return null;
  const qItems = bundle.quotationItems.filter((i) => i.quotation_id === qt.id);
  const statusText =
    qt.status === "accepted"
      ? "DISETUJUI"
      : qt.status === "sent"
        ? "TERKIRIM"
        : qt.status === "rejected"
          ? "DITOLAK"
          : "DRAF";
  const statusTone: DocStatusVariant =
    qt.status === "accepted"
      ? "success"
      : qt.status === "sent"
        ? "info"
        : qt.status === "rejected"
          ? "danger"
          : "neutral";

  const clientContactLine = customer?.contact_person
    ? `${customer.contact_person}${customer.contact_title ? ` (${customer.contact_title})` : ""}`
    : null;

  return {
    docTitle: "SURAT PENAWARAN HARGA (QUOTATION)",
    docSubtitle: `Masa Berlaku s.d. ${formatDocDateLong(qt.valid_until)}`,
    docNumber: qt.quotation_number,
    docDate: qt.quotation_date,
    statusBadge: { text: statusText, variant: statusTone },
    balanceDueBox: {
      label: "TOTAL PENAWARAN HARGA",
      amountText: formatDocRupiah(qt.total_amount),
      dueDateText: `Berlaku s.d. ${formatDocDateLong(qt.valid_until)}`,
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: "Kepada Yth.",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? "Klien Mitra",
      ...(clientContactLine ? [clientContactLine] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(qt.quotation_date) },
      { label: "Masa Berlaku s.d.", value: formatDocDateLong(qt.valid_until) },
      { label: "Judul Proyek", value: qt.project_title },
      { label: "Estimasi Durasi", value: `${qt.estimated_weeks} Minggu Kalender` },
      { label: "Batas Sesi Revisi", value: `${qt.revision_limit}x Sesi` },
    ],
    paragraphsBefore: qt.client_need_summary
      ? [`Ringkasan Kebutuhan Proyek: ${qt.client_need_summary}`]
      : undefined,
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Modul / Lingkup Fitur Pekerjaan", widthRatio: 0.62 },
      { header: "Biaya (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: qItems.map((it, idx) => [
      String(idx + 1),
      `${it.feature_name}${it.description ? ` - ${it.description}` : ""}`,
      formatDocRupiah(it.cost_amount),
    ]),
    summaryRows: [
      { label: "Total Penawaran Harga", value: formatDocRupiah(qt.total_amount) },
    ],
    terbilangAmount: qt.total_amount,
    notesTitle: "Ketentuan Penawaran Harga",
    notes: [
      company.pkp_enabled
        ? `Harga belum termasuk PPN ${company.ppn_rate}%.`
        : "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).",
      "Penawaran harga ini sah sebagai dasar penerbitan Purchase Order (PO) resmi oleh Pihak Klien.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Oleh (Klien),",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || "Perwakilan Klien"} - ${customer?.contact_title || "Pihak Klien"}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: `Hormat kami, ${company.company_name}`,
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: qt.quotation_number,
  };
}

export async function downloadQuotationPdf(
  qt: QuotationRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeQuotationSpec(qt, ctx);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${qt.quotation_number.replace(/\//g, "_")}.pdf`);
  await recordExportLog("QUOTATION", "PDF");
}

export async function downloadQuotationWord(
  qt: QuotationRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeQuotationSpec(qt, ctx);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${qt.quotation_number.replace(/\//g, "_")}.docx`);
  await recordExportLog("QUOTATION", "PDF");
}

export function makeSowDocSpec(
  doc: ProjectDocumentRow,
  ctx: ProjectDocContext,
): PdfDocumentSpec | null {
  const { project, customer, company, bundle } = ctx;
  if (!company || !project) return null;
  const summaryText =
    typeof doc.content_json === "object" &&
    doc.content_json !== null &&
    "summary" in doc.content_json
      ? String((doc.content_json as Record<string, unknown>).summary ?? "")
      : "";
  const cpo = bundle?.clientPos.find((c) => c.project_id === project.id);
  return {
    docTitle:
      doc.doc_type === "SOW"
        ? "STATEMENT OF WORK (SOW)"
        : "SURAT PERINTAH KERJA (SPK)",
    docSubtitle: "RUANG LINGKUP PEKERJAAN & KRITERIA PENERIMAAN",
    docNumber: doc.doc_number,
    docDate: doc.created_at.slice(0, 10),
    statusBadge: {
      text: doc.is_signed ? "DISETUJUI SAH" : "DRAF REVIEW",
      variant: doc.is_signed ? "success" : "neutral",
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? "Klien",
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: formatDocDateLong(doc.created_at.slice(0, 10)) },
      { label: "Kode & Nama Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: "Referensi PO Klien", value: cpo.po_number }] : []),
      { label: "Nilai Kontrak", value: formatDocRupiah(project.contract_value) },
      {
        label: "Target Penyelesaian",
        value: formatDocDateLong(project.target_end_date ?? doc.created_at.slice(0, 10)),
      },
      {
        label: "Status Pengesahan",
        value: doc.is_signed ? "Telah Ditandatangani Sah" : "Draf Review",
      },
    ],
    paragraphsBefore: [
      summaryText ||
        `Dokumen ${doc.doc_type} ini mengatur ruang lingkup teknis, kriteria penerimaan, hak kekayaan intelektual (source code beralih setelah pelunasan 100%), serta jadwal termin pelaksanaan pekerjaan proyek ${project.name}.`,
    ],
    notesTitle: "Ketentuan Pelaksanaan Pekerjaan:",
    notes: [
      "Perubahan di luar ruang lingkup yang telah disepakati akan diproses melalui mekanisme Change Request (CR) tertulis.",
      "Hak cipta kode sumber beralih sepenuhnya kepada Pihak Klien setelah pelunasan 100% nilai kontrak.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || "Perwakilan Klien"} - ${customer?.contact_title || "Pihak Klien"}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: `Pelaksana, ${company.company_name}`,
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: doc.doc_number,
  };
}

export async function downloadProjectDocPdf(
  doc: ProjectDocumentRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const { project, customer, company, bundle } = ctx;
  if (!company || !project || !bundle) return;
  if (doc.doc_type === "SPK") {
    const spkContent = extractSpkCharterContent(
      doc.content_json as Record<string, unknown> | null,
      { project, customer, company, milestones: bundle.milestones },
    );
    const bytes = await generateSpkProjectCharterPdf({
      docNumber: doc.doc_number,
      docDate: doc.created_at.slice(0, 10),
      docTitle: doc.title,
      company,
      content: spkContent,
    });
    downloadPdfBytes(bytes, `${doc.doc_number.replace(/\//g, "_")}.pdf`);
    return;
  }
  const spec = makeSowDocSpec(doc, ctx);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${doc.doc_number.replace(/\//g, "_")}.pdf`);
}

export async function downloadProjectDocWord(
  doc: ProjectDocumentRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const { project, customer, company, bundle } = ctx;
  if (!company || !project || !bundle) return;
  if (doc.doc_type === "SPK") {
    const spkContent = extractSpkCharterContent(
      doc.content_json as Record<string, unknown> | null,
      { project, customer, company, milestones: bundle.milestones },
    );
    const blob = await generateSpkProjectCharterWord({
      docNumber: doc.doc_number,
      docDate: doc.created_at.slice(0, 10),
      docTitle: doc.title,
      company,
      content: spkContent,
    });
    downloadWordBlob(blob, `${doc.doc_number.replace(/\//g, "_")}.docx`);
    return;
  }
  const spec = makeSowDocSpec(doc, ctx);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${doc.doc_number.replace(/\//g, "_")}.docx`);
}

export function makeBakpSpec(
  bakp: ProgressReportRow,
  ctx: ProjectDocContext,
): PdfDocumentSpec | null {
  const { project, customer, company, bundle } = ctx;
  if (!company || !project || !bundle) return null;
  const ms = bundle.milestones.find((m) => m.id === bakp.milestone_id);
  const cpo = bundle.clientPos.find((c) => c.project_id === project.id);
  const spkDoc = bundle.documents.find(
    (d) => d.project_id === project.id && d.doc_type === "SPK",
  );

  const deliverables = Array.isArray(bakp.deliverables_json)
    ? bakp.deliverables_json
    : [];

  return {
    docTitle: "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
    docSubtitle: "BUKTI CAPAIAN PROGRES TERMIN PEKERJAAN",
    docNumber: bakp.bakp_number,
    docDate: bakp.bakp_date,
    statusBadge: {
      text:
        bakp.status === "approved_by_client" ? "DISETUJUI KLIEN" : "DRAF",
      variant: bakp.status === "approved_by_client" ? "success" : "neutral",
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? "Klien",
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: "Tanggal Pemeriksaan", value: formatDocDateLong(bakp.bakp_date) },
      { label: "Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: "Referensi PO Klien", value: cpo.po_number }] : []),
      ...(spkDoc ? [{ label: "Referensi SPK / Kontrak", value: spkDoc.doc_number }] : []),
      { label: "Termin Terkait", value: ms?.name ?? "-" },
      { label: "Capaian Fisik", value: `${bakp.cumulative_percentage}%` },
      { label: "Nilai Tagihan Termin", value: formatDocRupiah(bakp.billable_amount) },
    ],
    paragraphsBefore: [
      bakp.findings_notes ||
        `Pada tanggal ${formatDocDateLong(bakp.bakp_date)}, telah dilakukan pemeriksaan bersama atas pencapaian pekerjaan termin ${ms?.name ?? ""} proyek ${project.name} dengan capaian fisik kumulatif sebesar ${bakp.cumulative_percentage}%. Hasil pemeriksaan dinyatakan memenuhi syarat dan dapat ditagihkan melalui Invoice Termin resmi.`,
    ],
    tableColumns:
      deliverables.length > 0
        ? [
            { header: "No", widthRatio: 0.1, align: "center" },
            { header: "Deliverable / Komponen Pekerjaan", widthRatio: 0.65 },
            { header: "Status Capaian", widthRatio: 0.25, align: "center" },
          ]
        : undefined,
    tableRows:
      deliverables.length > 0
        ? deliverables.map((d, i) => [
            String(i + 1),
            typeof d === "object" && d !== null && "name" in d ? String((d as { name: string }).name) : "",
            typeof d === "object" && d !== null && "status" in d ? String((d as { status: string }).status) : "",
          ])
        : undefined,
    notesTitle: "Catatan Pemeriksaan Capaian:",
    notes: [
      "Dokumen Berita Acara Kemajuan Pekerjaan (BAKP) ini sah sebagai dasar penagihan Invoice Termin.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || "Perwakilan Klien"} - ${customer?.contact_title || "Pihak Klien"}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: `Pelaksana, ${company.company_name}`,
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: bakp.bakp_number,
  };
}

export async function downloadBakpPdf(
  bakp: ProgressReportRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeBakpSpec(bakp, ctx);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${bakp.bakp_number.replace(/\//g, "_")}.pdf`);
}

export async function downloadBakpWord(
  bakp: ProgressReportRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeBakpSpec(bakp, ctx);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${bakp.bakp_number.replace(/\//g, "_")}.docx`);
}

export function makeUatSpec(
  uat: UatChecklistRow,
  ctx: ProjectDocContext,
): PdfDocumentSpec | null {
  const { project, customer, company, bundle } = ctx;
  if (!company || !project || !bundle) return null;
  const items = bundle.uatItems.filter((i) => i.uat_id === uat.id);
  const cpo = bundle.clientPos.find((c) => c.project_id === project.id);
  const spkDoc = bundle.documents.find(
    (d) => d.project_id === project.id && d.doc_type === "SPK",
  );

  const conclusionLabel =
    uat.conclusion === "accepted"
      ? "LULUS / SESUAI (ACCEPTED)"
      : uat.conclusion === "accepted_with_notes"
        ? "LULUS BERSYARAT (WITH NOTES)"
        : uat.conclusion === "rejected"
          ? "PERLU REVISI (REJECTED)"
          : "DALAM PENGUJIAN (PENDING)";

  const conclusionTone: DocStatusVariant =
    uat.conclusion === "accepted"
      ? "success"
      : uat.conclusion === "accepted_with_notes"
        ? "warning"
        : uat.conclusion === "rejected"
          ? "danger"
          : "neutral";

  return {
    docTitle: "USER ACCEPTANCE TEST (UAT) CHECKLIST",
    docSubtitle: "BERITA ACARA PENGUJIAN PENERIMAAN PENGGUNA",
    docNumber: uat.uat_number,
    docDate: uat.test_date,
    statusBadge: {
      text: conclusionLabel,
      variant: conclusionTone,
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: "Pihak Penguji (Klien):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? "Klien",
      `Penguji: ${uat.client_tester_name}`,
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: "Tanggal Pengujian", value: formatDocDateLong(uat.test_date) },
      { label: "Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: "Referensi PO Klien", value: cpo.po_number }] : []),
      ...(spkDoc ? [{ label: "Referensi SPK / Kontrak", value: spkDoc.doc_number }] : []),
      { label: "Lingkungan Uji (Staging)", value: uat.staging_url ?? "-" },
      { label: "Penguji Pihak Klien", value: uat.client_tester_name },
      { label: "Pendamping Altvira", value: uat.altvira_companion_name },
      { label: "Hasil Pengujian", value: conclusionLabel },
    ],
    paragraphsBefore: [
      `Pengujian User Acceptance Test (UAT) untuk proyek ${project.name} telah dilaksanakan bersama pada lingkungan ${uat.staging_url ?? "Staging"}. Seluruh skenario di bawah ini telah diuji dan diverifikasi langsung oleh perwakilan Klien.`,
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Fitur / Modul", widthRatio: 0.32 },
      { header: "Skenario Uji", widthRatio: 0.44 },
      { header: "Hasil Pengujian", widthRatio: 0.16, align: "center" },
    ],
    tableRows: items.map((it) => [
      String(it.line_no),
      it.feature_name,
      it.test_scenario,
      it.result === "pass" ? "SESUAI" : it.result === "fail" ? "REVISI" : "PENDING",
    ]),
    notesTitle: "Catatan Pengujian & Tindak Lanjut:",
    notes: [
      uat.conclusion === "accepted"
        ? "Seluruh skenario pengujian telah dinyatakan SESUAI oleh penguji klien dan siap dilanjutkan ke tahap serah terima (BAST)."
        : "Terdapat catatan perbaikan yang harus diselesaikan oleh tim pengembang sebelum penandatanganan Berita Acara Serah Terima (BAST).",
      "Dokumen UAT ini sah sebagai lampiran teknis Berita Acara Serah Terima (BAST).",
    ],
    leftSignatureLabel: "Penguji Pihak Klien,",
    leftSignatureName: uat.client_tester_name.includes(" - ")
      ? uat.client_tester_name
      : `${uat.client_tester_name} - Penguji Pihak Klien`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: "Pendamping Teknis Altvira,",
    rightSignatureName: uat.altvira_companion_name.includes(" - ")
      ? uat.altvira_companion_name
      : `${uat.altvira_companion_name} - Pendamping Teknis Altvira`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: uat.uat_number,
  };
}

export async function downloadUatPdf(
  uat: UatChecklistRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeUatSpec(uat, ctx);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${uat.uat_number.replace(/\//g, "_")}.pdf`);
}

export async function downloadUatWord(
  uat: UatChecklistRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeUatSpec(uat, ctx);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${uat.uat_number.replace(/\//g, "_")}.docx`);
}

export function makeBastSpec(
  bast: HandoverReportRow,
  ctx: ProjectDocContext,
): PdfDocumentSpec | null {
  const { project, customer, company, bundle } = ctx;
  if (!company || !project || !bundle) return null;
  const cpo = bundle.clientPos.find((c) => c.project_id === project.id);
  const spkDoc = bundle.documents.find(
    (d) => d.project_id === project.id && d.doc_type === "SPK",
  );
  const uatDoc = bundle.uatList.find((u) => u.id === bast.uat_id);
  const handoverItems = Array.isArray(bast.handover_items_json)
    ? bast.handover_items_json
    : [];

  return {
    docTitle: "BERITA ACARA SERAH TERIMA (BAST)",
    docSubtitle: "SERAH TERIMA HASIL PEKERJAAN PENGEMBANGAN SISTEM",
    docNumber: bast.bast_number,
    docDate: bast.bast_date,
    statusBadge: {
      text: bast.status === "signed" ? "DITANDATANGANI SAH" : "DRAF",
      variant: bast.status === "signed" ? "success" : "neutral",
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? "Klien",
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: "Tanggal Serah Terima", value: formatDocDateLong(bast.bast_date) },
      { label: "Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: "Referensi PO Klien", value: cpo.po_number }] : []),
      ...(spkDoc ? [{ label: "Referensi SPK / Kontrak", value: spkDoc.doc_number }] : []),
      ...(uatDoc ? [{ label: "Referensi Dokumen UAT", value: uatDoc.uat_number }] : []),
      { label: "Masa Garansi Bug-Fix", value: `${bast.warranty_days} Hari Kalender` },
    ],
    paragraphsBefore: [
      `Pada hari ini, ${formatDocDateLong(bast.bast_date)}, telah dilakukan serah terima penyelesaian pekerjaan proyek ${project.name} antara PIHAK PERTAMA (${company.company_name}) dan PIHAK KEDUA (${customer?.company_name ?? customer?.name ?? "Pihak Klien"}).`,
      `Kedua belah pihak menyatakan bahwa seluruh ruang lingkup pekerjaan pengembangan perangkat lunak telah diselesaikan 100%, seluruh item pengujian UAT telah disetujui, dan seluruh artefak hasil pekerjaan diserahkan dengan baik. Masa garansi bug-fix berlaku selama ${bast.warranty_days} hari kalender terhitung sejak tanggal dokumen ini ditandatangani.`,
    ],
    tableColumns:
      handoverItems.length > 0
        ? [
            { header: "No", widthRatio: 0.08, align: "center" },
            { header: "Objek / Komponen Serah Terima", widthRatio: 0.46 },
            { header: "Format / Media", widthRatio: 0.22 },
            { header: "Catatan Kelengkapan", widthRatio: 0.24 },
          ]
        : undefined,
    tableRows:
      handoverItems.length > 0
        ? handoverItems.map((h, i) => [
            String(i + 1),
            typeof h === "object" && h !== null && "item" in h ? String((h as { item: string }).item) : "",
            typeof h === "object" && h !== null && "format" in h ? String((h as { format: string }).format) : "",
            typeof h === "object" && h !== null && "note" in h && (h as { note?: string }).note ? String((h as { note?: string }).note) : formatDocEmpty(),
          ])
        : undefined,
    hasMeterai: true,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    notesTitle: "Catatan & Ketentuan Serah Terima:",
    notes: [
      "Berita Acara Serah Terima (BAST) ini merupakan dokumen sah penyelesaian pekerjaan dan menjadi syarat penerbitan Invoice Pelunasan.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Penerima Hasil Pekerjaan (Klien),",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || "Perwakilan Klien"} - ${customer?.contact_title || "Pihak Klien"}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: `Pelaksana, ${company.company_name}`,
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    rightSignatureImageUrl: company.signer_signature_path ?? null,
    footerDocNumber: bast.bast_number,
  };
}

export async function downloadBastPdf(
  bast: HandoverReportRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeBastSpec(bast, ctx);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${bast.bast_number.replace(/\//g, "_")}.pdf`);
}

export async function downloadBastWord(
  bast: HandoverReportRow,
  ctx: ProjectDocContext,
): Promise<void> {
  const spec = makeBastSpec(bast, ctx);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${bast.bast_number.replace(/\//g, "_")}.docx`);
}
