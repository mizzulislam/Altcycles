import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  buildPaymentApprovalPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import { formatRupiah } from "@/lib/formatters";
import { getCompanyProfile } from "@/lib/data-service";
import { recordExportLog } from "@/lib/operations-service";
import type {
  AttachmentRow,
  PaymentRequestRow,
} from "@/types/database.types";
import { getPaUserStatusMeta } from "./user-payments-types";

export interface UserPaymentsExportContext {
  requests: PaymentRequestRow[];
  attachments: AttachmentRow[];
  projectMap: Map<string, string>;
  accountMap: Map<string, string>;
  t: (key: string, params?: Record<string, unknown>) => string;
  language?: "id" | "en";
}

export async function makePaDocSpec(
  req: PaymentRequestRow,
  attachments: AttachmentRow[],
  projectMap: Map<string, string>,
  accountMap: Map<string, string>,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  const comp = await getCompanyProfile();
  const reqAttachments = attachments.filter((a) => a.entity_id === req.id);
  return buildPaymentApprovalPdfSpec({
    company: comp,
    requestNumber: req.request_number,
    revisionNo: req.revision_no,
    requestDate: (req.submitted_at ?? req.created_at).slice(0, 10),
    requesterName: t("approvals:doc_requester", { defaultValue: "Pengaju" }),
    projectName: req.project_id
      ? projectMap.get(req.project_id) ?? t("approvals:doc_project_ops", { defaultValue: "Operasional Proyek" })
      : t("approvals:doc_general_ops", { defaultValue: "Operasional Umum" }),
    expenseAccountName: req.expense_account_id
      ? accountMap.get(req.expense_account_id) ?? "-"
      : "-",
    recipientName: req.recipient_name,
    recipientBankInfo: req.recipient_bank_info ?? null,
    purpose: req.purpose,
    amount: req.amount,
    status: req.status,
    statusLabel: getPaUserStatusMeta(req.status, t as (k: string) => string).label,
    approverName: req.approver_id ? t("approvals:doc_financial_admin", { defaultValue: "Admin Keuangan" }) : null,
    approvedAt: req.decided_at ?? null,
    paidDate: req.paid_date ?? null,
    rejectionReason: req.rejection_reason ?? null,
    attachmentNames: reqAttachments.map((a) => a.file_name),
  });
}

export async function handleDownloadPaPdf(
  req: PaymentRequestRow,
  attachments: AttachmentRow[],
  projectMap: Map<string, string>,
  accountMap: Map<string, string>,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  const spec = await makePaDocSpec(req, attachments, projectMap, accountMap, t);
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `PA_${req.request_number.replace(/\//g, "-")}.pdf`);
  await recordExportLog("PAYMENT_APPROVALS", "PDF");
}

export async function handleDownloadPaWord(
  req: PaymentRequestRow,
  attachments: AttachmentRow[],
  projectMap: Map<string, string>,
  accountMap: Map<string, string>,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  const spec = await makePaDocSpec(req, attachments, projectMap, accountMap, t);
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `PA_${req.request_number.replace(/\//g, "-")}.docx`);
  await recordExportLog("PAYMENT_APPROVALS", "PDF");
  toast.success(
    t("approvals:word_download_success", {
      number: req.request_number,
      defaultValue: `Form PA ${req.request_number} (Word) berhasil diunduh.`,
    }),
  );
}

export async function handleExportExcel(ctx: UserPaymentsExportContext) {
  const { requests, projectMap, accountMap, t } = ctx;
  if (requests.length === 0) {
    toast.error(t("approvals:user.empty_title"));
    return;
  }
  await downloadExcelSheet({
    sheetName: t("approvals:export.user_excel_sheet"),
    fileName: t("approvals:export.user_excel_filename"),
    columns: [
      { header: t("approvals:user.col_number"), width: 22 },
      { header: t("approvals:modals.request_date"), width: 14 },
      { header: t("approvals:user.col_project"), width: 28 },
      { header: t("approvals:modals.approve_expense_account"), width: 28 },
      { header: t("approvals:modals.recipient_name"), width: 24 },
      { header: t("approvals:modals.purpose"), width: 34 },
      { header: t("approvals:user.col_amount"), width: 18 },
      { header: t("approvals:admin.col_status"), width: 24 },
      { header: t("approvals:modals.disburse_date"), width: 16 },
    ],
    rows: requests.map((r) => [
      r.request_number,
      (r.submitted_at ?? r.created_at).slice(0, 10),
      r.project_id ? (projectMap.get(r.project_id) ?? "-") : t("approvals:modals.general_operations"),
      r.expense_account_id ? (accountMap.get(r.expense_account_id) ?? "-") : "-",
      r.recipient_name,
      r.purpose,
      r.amount,
      getPaUserStatusMeta(r.status, t as (k: string) => string).label,
      r.paid_date ?? "-",
    ]),
  });
  await recordExportLog("PAYMENT_APPROVALS", "EXCEL");
  toast.success(t("approvals:export.toast_excel_success"));
}

export async function handleExportPdf(ctx: UserPaymentsExportContext) {
  const { requests, t } = ctx;
  if (requests.length === 0) {
    toast.error(t("approvals:user.empty_title"));
    return;
  }
  const comp = await getCompanyProfile();
  const bytes = await generateDocumentPdf({
    docTitle: t("approvals:export.user_pdf_title"),
    docSubtitle: t("approvals:export.user_pdf_subtitle"),
    docNumber: `REKAP-PA-${new Date().toISOString().slice(0, 10)}`,
    docDate: new Date().toISOString().slice(0, 10),
    company: comp,
    metaRows: [
      {
        label: t("approvals:user.unit_submissions"),
        value: `${requests.length} ${t("approvals:user.unit_submissions")}`,
      },
      {
        label: t("approvals:user.kpi_paid"),
        value: formatRupiah(requests.reduce((s, r) => s + r.amount, 0)),
      },
    ],
    tableColumns: [
      { header: t("approvals:user.col_number"), widthRatio: 0.16 },
      { header: t("approvals:modals.request_date"), widthRatio: 0.12, align: "center" },
      { header: t("approvals:modals.recipient_name"), widthRatio: 0.18 },
      { header: t("approvals:modals.purpose"), widthRatio: 0.26 },
      { header: t("approvals:admin.col_status"), widthRatio: 0.12, align: "center" },
      { header: t("approvals:user.col_amount"), widthRatio: 0.16, align: "right" },
    ],
    tableRows: requests.map((r) => [
      r.request_number,
      (r.submitted_at ?? r.created_at).slice(0, 10),
      r.recipient_name,
      r.purpose,
      getPaUserStatusMeta(r.status, t as (k: string) => string).label,
      formatRupiah(r.amount),
    ]),
  });
  downloadPdfBytes(bytes, t("approvals:export.user_pdf_filename"));
  await recordExportLog("PAYMENT_APPROVALS", "PDF");
}

export async function handleExportCsv(ctx: UserPaymentsExportContext) {
  const { requests, projectMap, accountMap, t } = ctx;
  if (requests.length === 0) {
    toast.error(t("approvals:user.empty_title"));
    return;
  }
  downloadCsvFile(
    t("approvals:export.user_csv_filename"),
    [
      t("approvals:user.col_number"),
      t("approvals:modals.request_date"),
      t("approvals:user.col_project"),
      t("approvals:modals.approve_expense_account"),
      t("approvals:modals.recipient_name"),
      t("approvals:modals.purpose"),
      t("approvals:user.col_amount"),
      t("approvals:admin.col_status"),
      t("approvals:modals.disburse_date"),
    ],
    requests.map((r) => [
      r.request_number,
      (r.submitted_at ?? r.created_at).slice(0, 10),
      r.project_id ? (projectMap.get(r.project_id) ?? "-") : t("approvals:modals.general_operations"),
      r.expense_account_id ? (accountMap.get(r.expense_account_id) ?? "-") : "-",
      r.recipient_name,
      r.purpose,
      r.amount,
      getPaUserStatusMeta(r.status, t as (k: string) => string).label,
      r.paid_date ?? "-",
    ]),
  );
  await recordExportLog("PAYMENT_APPROVALS", "CSV");
  toast.success(t("approvals:export.toast_csv_success"));
}
