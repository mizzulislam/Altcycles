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
import { getActiveLanguage } from "@/lib/i18n";
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
  const isEn = getActiveLanguage() === "en";
  const qItems = bundle.quotationItems.filter((i) => i.quotation_id === qt.id);
  const statusText = isEn
    ? qt.status === "accepted"
      ? "ACCEPTED"
      : qt.status === "sent"
        ? "SENT"
        : qt.status === "rejected"
          ? "REJECTED"
          : "DRAFT"
    : qt.status === "accepted"
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
    docTitle: isEn ? "PRICE QUOTATION" : "SURAT PENAWARAN HARGA (QUOTATION)",
    docSubtitle: isEn
      ? `Valid until ${formatDocDateLong(qt.valid_until, "en")}`
      : `Masa Berlaku s.d. ${formatDocDateLong(qt.valid_until)}`,
    docNumber: qt.quotation_number,
    docDate: qt.quotation_date,
    statusBadge: { text: statusText, variant: statusTone },
    balanceDueBox: {
      label: isEn ? "TOTAL PRICE QUOTATION" : "TOTAL PENAWARAN HARGA",
      amountText: formatDocRupiah(qt.total_amount),
      dueDateText: isEn
        ? `Valid until ${formatDocDateLong(qt.valid_until, "en")}`
        : `Berlaku s.d. ${formatDocDateLong(qt.valid_until)}`,
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: isEn ? "Addressed To:" : "Kepada Yth.",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? (isEn ? "Client Partner" : "Klien Mitra"),
      ...(clientContactLine ? [clientContactLine] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: isEn ? "Issue Date" : "Tanggal Terbit", value: formatDocDateLong(qt.quotation_date, isEn ? "en" : "id") },
      { label: isEn ? "Valid Until" : "Masa Berlaku s.d.", value: formatDocDateLong(qt.valid_until, isEn ? "en" : "id") },
      { label: isEn ? "Project Title" : "Judul Proyek", value: qt.project_title },
      { label: isEn ? "Estimated Duration" : "Estimasi Durasi", value: isEn ? `${qt.estimated_weeks} Calendar Weeks` : `${qt.estimated_weeks} Minggu Kalender` },
      { label: isEn ? "Revision Limit" : "Batas Sesi Revisi", value: isEn ? `${qt.revision_limit}x Sessions` : `${qt.revision_limit}x Sesi` },
    ],
    paragraphsBefore: qt.client_need_summary
      ? [isEn ? `Project Needs Summary: ${qt.client_need_summary}` : `Ringkasan Kebutuhan Proyek: ${qt.client_need_summary}`]
      : undefined,
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: isEn ? "Scope of Work" : "Lingkup Pekerjaan", widthRatio: 0.62 },
      { header: isEn ? "Cost (IDR)" : "Biaya (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: qItems.map((it, idx) => [
      String(idx + 1),
      `${it.feature_name}${it.description ? ` - ${it.description}` : ""}`,
      formatDocRupiah(it.cost_amount),
    ]),
    summaryRows: [
      { label: isEn ? "Total Price Quotation" : "Total Penawaran Harga", value: formatDocRupiah(qt.total_amount) },
    ],
    terbilangAmount: qt.total_amount,
    notesTitle: isEn ? "Quotation Terms & Conditions" : "Ketentuan Penawaran Harga",
    notes: isEn
      ? [
          company.pkp_enabled
            ? `Price excludes VAT ${company.ppn_rate}%.`
            : "Price is not subject to VAT as Altvira Technology (PT Representasi Mitra Mandiri) is not yet registered as a Taxable Enterprise (Non-PKP).",
          "This price quotation is official as the basis for official Purchase Order (PO) issuance by the Client.",
          "This document is officially generated by the Altcycles Financial ERP system and is valid without wet signature.",
        ]
      : [
          company.pkp_enabled
            ? `Harga belum termasuk PPN ${company.ppn_rate}%.`
            : "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).",
          "Penawaran harga ini sah sebagai dasar penerbitan Purchase Order (PO) resmi oleh Pihak Klien.",
          "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
        ],
    leftSignatureLabel: isEn ? "Approved By (Client)," : "Disetujui Oleh (Klien),",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || (isEn ? "Client Representative" : "Perwakilan Klien")} - ${customer?.contact_title || (isEn ? "Client Party" : "Pihak Klien")}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: isEn ? `Sincerely, ${company.company_name}` : `Hormat kami, ${company.company_name}`,
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
  const isEn = getActiveLanguage() === "en";
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
        : isEn
          ? "WORK ORDER (SPK)"
          : "SURAT PERINTAH KERJA (SPK)",
    docSubtitle: isEn
      ? "SCOPE OF WORK & ACCEPTANCE CRITERIA"
      : "RUANG LINGKUP PEKERJAAN & KRITERIA PENERIMAAN",
    docNumber: doc.doc_number,
    docDate: doc.created_at.slice(0, 10),
    statusBadge: {
      text: doc.is_signed
        ? isEn ? "OFFICIALLY SIGNED" : "DISETUJUI SAH"
        : isEn ? "DRAFT REVIEW" : "DRAF REVIEW",
      variant: doc.is_signed ? "success" : "neutral",
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: isEn ? "Client Party (Employer):" : "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? (isEn ? "Client" : "Klien"),
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: isEn ? "Issue Date" : "Tanggal Terbit", value: formatDocDateLong(doc.created_at.slice(0, 10), isEn ? "en" : "id") },
      { label: isEn ? "Project Code & Name" : "Kode & Nama Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: isEn ? "Client PO Ref" : "Referensi PO Klien", value: cpo.po_number }] : []),
      { label: isEn ? "Contract Value" : "Nilai Kontrak", value: formatDocRupiah(project.contract_value) },
      {
        label: isEn ? "Target Completion" : "Target Penyelesaian",
        value: formatDocDateLong(project.target_end_date ?? doc.created_at.slice(0, 10), isEn ? "en" : "id"),
      },
      {
        label: isEn ? "Approval Status" : "Status Pengesahan",
        value: doc.is_signed ? (isEn ? "Officially Signed" : "Telah Ditandatangani Sah") : (isEn ? "Draft Review" : "Draf Review"),
      },
    ],
    paragraphsBefore: [
      summaryText ||
        (isEn
          ? `This ${doc.doc_type} document governs the technical scope of work, acceptance criteria, intellectual property rights (source code copyright fully transfers to the Client after 100% payment settlement), and milestone schedules for project ${project.name}.`
          : `Dokumen ${doc.doc_type} ini mengatur ruang lingkup teknis, kriteria penerimaan, hak kekayaan intelektual (source code beralih setelah pelunasan 100%), serta jadwal termin pelaksanaan pekerjaan proyek ${project.name}.`),
    ],
    notesTitle: isEn ? "Execution Terms & Conditions:" : "Ketentuan Pelaksanaan Pekerjaan:",
    notes: isEn
      ? [
          "Changes outside the agreed scope will be processed through written Change Request (CR) mechanism.",
          "Source code copyright fully transfers to the Client after 100% contract settlement.",
          "This document is officially generated by the Altcycles Financial ERP system and is valid without wet signature.",
        ]
      : [
          "Perubahan di luar ruang lingkup yang telah disepakati akan diproses melalui mekanisme Change Request (CR) tertulis.",
          "Hak cipta kode sumber beralih sepenuhnya kepada Pihak Klien setelah pelunasan 100% nilai kontrak.",
          "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
        ],
    leftSignatureLabel: isEn ? "Approved by Client," : "Disetujui Pihak Klien,",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || (isEn ? "Client Representative" : "Perwakilan Klien")} - ${customer?.contact_title || (isEn ? "Client Party" : "Pihak Klien")}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: isEn ? `Contractor, ${company.company_name}` : `Pelaksana, ${company.company_name}`,
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
  const isEn = getActiveLanguage() === "en";
  const ms = bundle.milestones.find((m) => m.id === bakp.milestone_id);
  const cpo = bundle.clientPos.find((c) => c.project_id === project.id);
  const spkDoc = bundle.documents.find(
    (d) => d.project_id === project.id && d.doc_type === "SPK",
  );

  const deliverables = Array.isArray(bakp.deliverables_json)
    ? bakp.deliverables_json
    : [];

  return {
    docTitle: isEn ? "WORK PROGRESS REPORT (BAKP)" : "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
    docSubtitle: isEn ? "PROOF OF MILESTONE PROGRESS COMPLETION" : "BUKTI CAPAIAN PROGRES TERMIN PEKERJAAN",
    docNumber: bakp.bakp_number,
    docDate: bakp.bakp_date,
    statusBadge: {
      text:
        bakp.status === "approved_by_client"
          ? isEn ? "CLIENT APPROVED" : "DISETUJUI KLIEN"
          : isEn ? "DRAFT" : "DRAF",
      variant: bakp.status === "approved_by_client" ? "success" : "neutral",
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: isEn ? "Client Party (Employer):" : "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? (isEn ? "Client" : "Klien"),
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: isEn ? "Inspection Date" : "Tanggal Pemeriksaan", value: formatDocDateLong(bakp.bakp_date, isEn ? "en" : "id") },
      { label: isEn ? "Project" : "Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: isEn ? "Client PO Ref" : "Referensi PO Klien", value: cpo.po_number }] : []),
      ...(spkDoc ? [{ label: isEn ? "Contract / SPK Ref" : "Referensi SPK / Kontrak", value: spkDoc.doc_number }] : []),
      { label: isEn ? "Related Milestone" : "Termin Terkait", value: ms?.name ?? "-" },
      { label: isEn ? "Physical Progress" : "Capaian Fisik", value: `${bakp.cumulative_percentage}%` },
      { label: isEn ? "Milestone Billable Amount" : "Nilai Tagihan Termin", value: formatDocRupiah(bakp.billable_amount) },
    ],
    paragraphsBefore: [
      bakp.findings_notes ||
        (isEn
          ? `On ${formatDocDateLong(bakp.bakp_date, "en")}, a joint inspection was conducted on the progress of milestone ${ms?.name ?? ""} for project ${project.name} with cumulative physical progress of ${bakp.cumulative_percentage}%. The inspection results are declared eligible for official Milestone Invoice billing.`
          : `Pada tanggal ${formatDocDateLong(bakp.bakp_date)}, telah dilakukan pemeriksaan bersama atas pencapaian pekerjaan termin ${ms?.name ?? ""} proyek ${project.name} dengan capaian fisik kumulatif sebesar ${bakp.cumulative_percentage}%. Hasil pemeriksaan dinyatakan memenuhi syarat dan dapat ditagihkan melalui Invoice Termin resmi.`),
    ],
    tableColumns:
      deliverables.length > 0
        ? [
            { header: "No", widthRatio: 0.1, align: "center" },
            { header: isEn ? "Work Component" : "Komponen Pekerjaan", widthRatio: 0.65 },
            { header: isEn ? "Progress Status" : "Status Capaian", widthRatio: 0.25, align: "center" },
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
    notesTitle: isEn ? "Progress Inspection Notes:" : "Catatan Pemeriksaan Capaian:",
    notes: isEn
      ? [
          "This Work Progress Report (BAKP) document is official as the basis for milestone invoice billing.",
          "This document is officially generated by the Altcycles Financial ERP system and is valid without wet signature.",
        ]
      : [
          "Dokumen Berita Acara Kemajuan Pekerjaan (BAKP) ini sah sebagai dasar penagihan Invoice Termin.",
          "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
        ],
    leftSignatureLabel: isEn ? "Approved by Client," : "Disetujui Pihak Klien,",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || (isEn ? "Client Representative" : "Perwakilan Klien")} - ${customer?.contact_title || (isEn ? "Client Party" : "Pihak Klien")}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: isEn ? `Contractor, ${company.company_name}` : `Pelaksana, ${company.company_name}`,
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
  const isEn = getActiveLanguage() === "en";
  const items = bundle.uatItems.filter((i) => i.uat_id === uat.id);
  const cpo = bundle.clientPos.find((c) => c.project_id === project.id);
  const spkDoc = bundle.documents.find(
    (d) => d.project_id === project.id && d.doc_type === "SPK",
  );

  const conclusionLabel = isEn
    ? uat.conclusion === "accepted"
      ? "ACCEPTED (PASS)"
      : uat.conclusion === "accepted_with_notes"
        ? "ACCEPTED WITH NOTES"
        : uat.conclusion === "rejected"
          ? "REJECTED (NEEDS REVISION)"
          : "PENDING (UNDER TEST)"
    : uat.conclusion === "accepted"
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
    docSubtitle: isEn
      ? "USER ACCEPTANCE TESTING REPORT"
      : "BERITA ACARA PENGUJIAN PENERIMAAN PENGGUNA",
    docNumber: uat.uat_number,
    docDate: uat.test_date,
    statusBadge: {
      text: conclusionLabel,
      variant: conclusionTone,
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: isEn ? "Testing Party (Client):" : "Pihak Penguji (Klien):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? (isEn ? "Client" : "Klien"),
      isEn ? `Tester: ${uat.client_tester_name}` : `Penguji: ${uat.client_tester_name}`,
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: isEn ? "Testing Date" : "Tanggal Pengujian", value: formatDocDateLong(uat.test_date, isEn ? "en" : "id") },
      { label: isEn ? "Project" : "Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: isEn ? "Client PO Ref" : "Referensi PO Klien", value: cpo.po_number }] : []),
      ...(spkDoc ? [{ label: isEn ? "Contract / SPK Ref" : "Referensi SPK / Kontrak", value: spkDoc.doc_number }] : []),
      { label: isEn ? "Staging Environment" : "Lingkungan Uji (Staging)", value: uat.staging_url ?? "-" },
      { label: isEn ? "Client Tester" : "Penguji Pihak Klien", value: uat.client_tester_name },
      { label: isEn ? "Altvira Companion" : "Pendamping Altvira", value: uat.altvira_companion_name },
      { label: isEn ? "Test Result" : "Hasil Pengujian", value: conclusionLabel },
    ],
    paragraphsBefore: [
      isEn
        ? `User Acceptance Test (UAT) for project ${project.name} was conducted jointly on the ${uat.staging_url ?? "Staging"} environment. All scenarios below have been tested and verified directly by the Client's representatives.`
        : `Pengujian User Acceptance Test (UAT) untuk proyek ${project.name} telah dilaksanakan bersama pada lingkungan ${uat.staging_url ?? "Staging"}. Seluruh skenario di bawah ini telah diuji dan diverifikasi langsung oleh perwakilan Klien.`,
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: isEn ? "Module" : "Modul", widthRatio: 0.32 },
      { header: isEn ? "Test Scenario" : "Skenario Uji", widthRatio: 0.44 },
      { header: isEn ? "Test Result" : "Hasil Pengujian", widthRatio: 0.16, align: "center" },
    ],
    tableRows: items.map((it) => [
      String(it.line_no),
      it.feature_name,
      it.test_scenario,
      it.result === "pass"
        ? isEn ? "PASS" : "SESUAI"
        : it.result === "fail"
          ? isEn ? "REVISION" : "REVISI"
          : isEn ? "PENDING" : "PENDING",
    ]),
    notesTitle: isEn ? "Testing Notes & Follow-up:" : "Catatan Pengujian & Tindak Lanjut:",
    notes: isEn
      ? [
          uat.conclusion === "accepted"
            ? "All test scenarios have been declared PASS by client testers and are ready for handover (BAST)."
            : "There are improvement notes that must be resolved by the development team prior to signing the Handover Certificate (BAST).",
          "This UAT document is valid as a technical appendix to the Handover Certificate (BAST).",
        ]
      : [
          uat.conclusion === "accepted"
            ? "Seluruh skenario pengujian telah dinyatakan SESUAI oleh penguji klien dan siap dilanjutkan ke tahap serah terima (BAST)."
            : "Terdapat catatan perbaikan yang harus diselesaikan oleh tim pengembang sebelum penandatanganan Berita Acara Serah Terima (BAST).",
          "Dokumen UAT ini sah sebagai lampiran teknis Berita Acara Serah Terima (BAST).",
        ],
    leftSignatureLabel: isEn ? "Client Tester," : "Penguji Pihak Klien,",
    leftSignatureName: uat.client_tester_name.includes(" - ")
      ? uat.client_tester_name
      : isEn
        ? `${uat.client_tester_name} - Client Tester`
        : `${uat.client_tester_name} - Penguji Pihak Klien`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: isEn ? "Altvira Technical Companion," : "Pendamping Teknis Altvira,",
    rightSignatureName: uat.altvira_companion_name.includes(" - ")
      ? uat.altvira_companion_name
      : isEn
        ? `${uat.altvira_companion_name} - Altvira Technical Companion`
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
  const isEn = getActiveLanguage() === "en";
  const cpo = bundle.clientPos.find((c) => c.project_id === project.id);
  const spkDoc = bundle.documents.find(
    (d) => d.project_id === project.id && d.doc_type === "SPK",
  );
  const uatDoc = bundle.uatList.find((u) => u.id === bast.uat_id);
  const handoverItems = Array.isArray(bast.handover_items_json)
    ? bast.handover_items_json
    : [];

  return {
    docTitle: isEn ? "WORK HANDOVER CERTIFICATE (BAST)" : "BERITA ACARA SERAH TERIMA (BAST)",
    docSubtitle: isEn ? "SYSTEM DEVELOPMENT WORK COMPLETION & HANDOVER" : "SERAH TERIMA HASIL PEKERJAAN PENGEMBANGAN SISTEM",
    docNumber: bast.bast_number,
    docDate: bast.bast_date,
    statusBadge: {
      text: bast.status === "signed" ? (isEn ? "OFFICIALLY SIGNED" : "DITANDATANGANI SAH") : (isEn ? "DRAFT" : "DRAF"),
      variant: bast.status === "signed" ? "success" : "neutral",
    },
    company,
    clientLogoUrl: customer?.logo_storage_path ?? null,
    recipientTitle: isEn ? "Client Party (Employer):" : "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      customer?.company_name ?? customer?.name ?? (isEn ? "Client" : "Klien"),
      ...(customer?.contact_person ? [customer.contact_person] : []),
      customer?.address ?? "-",
    ],
    metaRows: [
      { label: isEn ? "Handover Date" : "Tanggal Serah Terima", value: formatDocDateLong(bast.bast_date, isEn ? "en" : "id") },
      { label: isEn ? "Project" : "Proyek", value: `${project.code} - ${project.name}` },
      ...(cpo ? [{ label: isEn ? "Client PO Ref" : "Referensi PO Klien", value: cpo.po_number }] : []),
      ...(spkDoc ? [{ label: isEn ? "Contract / SPK Ref" : "Referensi SPK / Kontrak", value: spkDoc.doc_number }] : []),
      ...(uatDoc ? [{ label: isEn ? "UAT Document Ref" : "Referensi Dokumen UAT", value: uatDoc.uat_number }] : []),
      { label: isEn ? "Bug-Fix Warranty Period" : "Masa Garansi Bug-Fix", value: isEn ? `${bast.warranty_days} Calendar Days` : `${bast.warranty_days} Hari Kalender` },
    ],
    paragraphsBefore: [
      isEn
        ? `On this day, ${formatDocDateLong(bast.bast_date, "en")}, the handover of completed development work for project ${project.name} was conducted between FIRST PARTY (${company.company_name}) and SECOND PARTY (${customer?.company_name ?? customer?.name ?? "Client Party"}).`
        : `Pada hari ini, ${formatDocDateLong(bast.bast_date)}, telah dilakukan serah terima penyelesaian pekerjaan proyek ${project.name} antara PIHAK PERTAMA (${company.company_name}) dan PIHAK KEDUA (${customer?.company_name ?? customer?.name ?? "Pihak Klien"}).`,
      isEn
        ? `Both parties declare that 100% of software development scope has been accomplished, all UAT testing items have been approved, and all work deliverables and artifacts are properly handed over. The bug-fix warranty period is valid for ${bast.warranty_days} calendar days from the date of this signed document.`
        : `Kedua belah pihak menyatakan bahwa seluruh ruang lingkup pekerjaan pengembangan perangkat lunak telah diselesaikan 100%, seluruh item pengujian UAT telah disetujui, dan seluruh artefak hasil pekerjaan diserahkan dengan baik. Masa garansi bug-fix berlaku selama ${bast.warranty_days} hari kalender terhitung sejak tanggal dokumen ini ditandatangani.`,
    ],
    tableColumns:
      handoverItems.length > 0
        ? [
            { header: "No", widthRatio: 0.08, align: "center" },
            { header: isEn ? "Handover Component" : "Komponen Serah Terima", widthRatio: 0.46 },
            { header: isEn ? "Media Format" : "Format Media", widthRatio: 0.22 },
            { header: isEn ? "Completeness Notes" : "Catatan Kelengkapan", widthRatio: 0.24 },
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
    meteraiLabel: isEn ? "E-METERAI Rp10,000" : "TEMPAT E-METERAI Rp10.000",
    notesTitle: isEn ? "Handover Notes & Provisions:" : "Catatan & Ketentuan Serah Terima:",
    notes: isEn
      ? [
          "This Handover Certificate (BAST) is an official document of work completion and a prerequisite for final invoice billing.",
          "This document is officially generated by the Altcycles Financial ERP system and is valid without wet signature.",
        ]
      : [
          "Berita Acara Serah Terima (BAST) ini merupakan dokumen sah penyelesaian pekerjaan dan menjadi syarat penerbitan Invoice Pelunasan.",
          "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
        ],
    leftSignatureLabel: isEn ? "Deliverables Recipient (Client)," : "Penerima Hasil Pekerjaan (Klien),",
    leftSignatureName: `${customer?.contact_person || customer?.company_name || customer?.name || (isEn ? "Client Representative" : "Perwakilan Klien")} - ${customer?.contact_title || (isEn ? "Client Party" : "Pihak Klien")}`,
    leftSignatureImageUrl: customer?.signature_storage_path ?? null,
    rightSignatureLabel: isEn ? `Contractor, ${company.company_name}` : `Pelaksana, ${company.company_name}`,
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
