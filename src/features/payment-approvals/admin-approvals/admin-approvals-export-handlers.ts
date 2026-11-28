import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  buildPaymentApprovalPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { getCompanyProfile } from "@/lib/data-service";
import { recordExportLog } from "@/lib/operations-service";
import type {
  AttachmentRow,
  PaymentRequestRow,
} from "@/types/database.types";
import { getPaStatusMeta } from "./admin-approvals-types";

export interface AdminApprovalsExportContext {
  filteredRequests: PaymentRequestRow[];
  attachments: AttachmentRow[];
  profileMap: Map<string, string>;
  projectMap: Map<string, string>;
  accountMap: Map<string, string>;
  t: (k: string, fb?: string | Record<string, unknown>) => string;
  language?: "id" | "en";
}

export async function makePaDocSpec(
  req: PaymentRequestRow,
  attachments: AttachmentRow[],
  profileMap: Map<string, string>,
  projectMap: Map<string, string>,
  accountMap: Map<string, string>,
  t: (k: string, fb?: string | Record<string, unknown>) => string,
) {
  const comp = await getCompanyProfile();
  const reqAttachments = attachments.filter((a) => a.entity_id === req.id);
  return buildPaymentApprovalPdfSpec({
    company: comp,
    requestNumber: req.request_number,
    revisionNo: req.revision_no,
    requestDate: (req.submitted_at ?? req.created_at).slice(0, 10),
    requesterName: profileMap.get(req.requester_id) ?? (t("common:role.user", "Pengguna") as string),
    projectName: projectMap.get(req.project_id) ?? (t("approvals:modals.general_operations", "Operasional Umum") as string),
    expenseAccountName: accountMap.get(req.expense_account_id) ?? "-",
    recipientName: req.recipient_name,
    recipientBankInfo: req.recipient_bank_info ?? null,
    purpose: req.purpose,
    amount: req.amount,
    status: req.status,
    statusLabel: getPaStatusMeta(req.status, t as any).label,
    approverName: req.approver_id ? profileMap.get(req.approver_id) ?? (t("common:role.admin", "Admin") as string) : null,
    approvedAt: req.decided_at ?? null,
    paidDate: req.paid_date ?? null,
    rejectionReason: req.rejection_reason ?? null,
    attachmentNames: reqAttachments.map((a) => a.file_name),
  });
}

export async function handleDownloadPaPdf(
  req: PaymentRequestRow,
  attachments: AttachmentRow[],
  profileMap: Map<string, string>,
  projectMap: Map<string, string>,
  accountMap: Map<string, string>,
  t: (k: string, fb?: string | Record<string, unknown>) => string,
) {
  const spec = await makePaDocSpec(req, attachments, profileMap, projectMap, accountMap, t);
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `PA_${req.request_number.replace(/\//g, "-")}.pdf`);
  await recordExportLog("PAYMENT_APPROVALS", "PDF");
}

export async function handleDownloadPaWord(
  req: PaymentRequestRow,
  attachments: AttachmentRow[],
  profileMap: Map<string, string>,
  projectMap: Map<string, string>,
  accountMap: Map<string, string>,
  t: (k: string, fb?: string | Record<string, unknown>) => string,
) {
  const spec = await makePaDocSpec(req, attachments, profileMap, projectMap, accountMap, t);
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `PA_${req.request_number.replace(/\//g, "-")}.docx`);
  await recordExportLog("PAYMENT_APPROVALS", "PDF");
  toast.success(`Form PA ${req.request_number} (Word) berhasil diunduh.`);
}

export async function handleExportExcel(ctx: AdminApprovalsExportContext) {
  const { filteredRequests, profileMap, projectMap, accountMap, t, language } = ctx;
  await downloadExcelSheet({
    fileName: t("approvals:export.admin_excel_filename") as string,
    sheetName: t("approvals:export.admin_excel_sheet") as string,
    columns: [
      { header: t("approvals:admin.col_number_date") as string, width: 20 },
      { header: "Revisi", width: 10 },
      { header: t("approvals:modals.requester_name") as string, width: 22 },
      { header: t("approvals:modals.project_name") as string, width: 28 },
      { header: t("approvals:modals.approve_expense_account") as string, width: 28 },
      { header: t("approvals:modals.recipient_name") as string, width: 24 },
      { header: t("approvals:modals.purpose") as string, width: 34 },
      { header: t("approvals:admin.col_amount") as string, width: 18 },
      { header: t("approvals:admin.col_status") as string, width: 20 },
      { header: t("approvals:modals.disburse_date") as string, width: 16 },
    ],
    rows: filteredRequests.map((r) => [
      r.request_number,
      r.revision_no,
      profileMap.get(r.requester_id) ?? (t("common:role.user") as string),
      projectMap.get(r.project_id) ?? "-",
      accountMap.get(r.expense_account_id) ?? "-",
      r.recipient_name,
      r.purpose,
      r.amount,
      getPaStatusMeta(r.status, t as any).label,
      r.paid_date ? formatDateI18n(r.paid_date, language) : "-",
    ]),
  });
  await recordExportLog("PAYMENT_APPROVALS", "EXCEL");
  toast.success(t("approvals:export.toast_excel_success") as string);
}

export async function handleExportPdf(ctx: AdminApprovalsExportContext) {
  const { filteredRequests, profileMap, t, language } = ctx;
  const comp = await getCompanyProfile();
  const bytes = await generateDocumentPdf({
    docTitle: t("approvals:export.admin_pdf_title") as string,
    docSubtitle: t("approvals:export.admin_pdf_subtitle") as string,
    docNumber: `PA-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    docDate: new Date().toISOString().slice(0, 10),
    orientation: "landscape",
    company: comp,
    tableColumns: [
      { header: t("approvals:admin.col_number_date") as string, widthRatio: 0.16 },
      { header: t("approvals:modals.requester_name") as string, widthRatio: 0.16 },
      { header: t("approvals:modals.purpose") as string, widthRatio: 0.28 },
      { header: t("approvals:admin.col_amount") as string, widthRatio: 0.16, align: "right" },
      { header: t("approvals:admin.col_status") as string, widthRatio: 0.10, align: "center" },
      { header: t("approvals:modals.disburse_date") as string, widthRatio: 0.14, align: "center" },
    ],
    tableRows: filteredRequests.map((r) => [
      r.request_number,
      profileMap.get(r.requester_id) ?? (t("common:role.user") as string),
      `${r.recipient_name} - ${r.purpose}`,
      formatRupiah(r.amount),
      getPaStatusMeta(r.status, t as any).label,
      r.paid_date ? formatDateI18n(r.paid_date, language) : "-",
    ]),
    rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
  });
  downloadPdfBytes(bytes, t("approvals:export.admin_pdf_filename") as string);
  await recordExportLog("PAYMENT_APPROVALS", "PDF");
}

export async function handleExportCsv(ctx: AdminApprovalsExportContext) {
  const { filteredRequests, profileMap, projectMap, accountMap, t } = ctx;
  downloadCsvFile(
    t("approvals:export.admin_csv_filename") as string,
    [
      t("approvals:admin.col_number_date") as string,
      "Revisi",
      t("approvals:modals.requester_name") as string,
      t("approvals:modals.project_name") as string,
      t("approvals:modals.approve_expense_account") as string,
      t("approvals:modals.recipient_name") as string,
      t("approvals:modals.purpose") as string,
      t("approvals:admin.col_amount") as string,
      t("approvals:admin.col_status") as string,
      t("approvals:modals.disburse_date") as string,
    ],
    filteredRequests.map((r) => [
      r.request_number,
      r.revision_no,
      profileMap.get(r.requester_id) ?? (t("common:role.user") as string),
      projectMap.get(r.project_id) ?? "-",
      accountMap.get(r.expense_account_id) ?? "-",
      r.recipient_name,
      r.purpose,
      r.amount,
      getPaStatusMeta(r.status, t as any).label,
      r.paid_date ?? "-",
    ]),
  );
  await recordExportLog("PAYMENT_APPROVALS", "CSV");
  toast.success(t("approvals:export.toast_csv_success") as string);
}
