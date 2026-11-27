import * as React from "react";
import {
  CheckCircle2Icon,
  ClockIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  GoogleDriveIcon,
  GoogleDrivePickerDialog,
  type GoogleDriveSelectResult,
} from "@/components/shared/google-drive-picker-dialog";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import {
  getCompanyProfile,
  listAccounts,
  listProjects,
} from "@/lib/data-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { useLanguage } from "@/lib/i18n";
import {
  buildPaymentApprovalPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import {
  createAndSubmitPaymentRequest,
  getAttachmentSignedUrl,
  getProjectBudgetComparison,
  listPaymentRequests,
  listPurchaseOrders,
  recordExportLog,
  resubmitRejectedPaymentRequest,
} from "@/lib/operations-service";
import type {
  AccountRow,
  AttachmentRow,
  PaymentRequestRow,
  PaymentRequestStatus,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";

function getPaUserStatusMeta(
  status: PaymentRequestStatus,
  t: (key: string) => string,
): { label: string; tone: "secondary" | "info" | "success" | "destructive" | "warning" } {
  switch (status) {
    case "draft":
      return { label: t("approvals:status.draft"), tone: "secondary" };
    case "submitted":
      return { label: t("approvals:status.submitted"), tone: "info" };
    case "approved":
      return { label: t("approvals:status.approved"), tone: "warning" };
    case "rejected":
      return { label: t("approvals:status.rejected"), tone: "destructive" };
    case "paid":
      return { label: t("approvals:status.paid"), tone: "success" };
  }
}

const FRIENDLY_EXPENSE_KEYS: Record<string, { labelKey: string; hintKey: string }> = {
  "5-1101": { labelKey: "cat_5_1101_label", hintKey: "cat_5_1101_hint" },
  "5-1201": { labelKey: "cat_5_1201_label", hintKey: "cat_5_1201_hint" },
  "5-1301": { labelKey: "cat_5_1301_label", hintKey: "cat_5_1301_hint" },
  "5-1401": { labelKey: "cat_5_1401_label", hintKey: "cat_5_1401_hint" },
  "6-1101": { labelKey: "cat_6_1101_label", hintKey: "cat_6_1101_hint" },
  "6-1201": { labelKey: "cat_6_1201_label", hintKey: "cat_6_1201_hint" },
  "6-1301": { labelKey: "cat_6_1301_label", hintKey: "cat_6_1301_hint" },
  "6-1401": { labelKey: "cat_6_1401_label", hintKey: "cat_6_1401_hint" },
};

function getFriendlyExpenseCategory(
  acc: AccountRow,
  t: (key: string) => string,
): {
  label: string;
  hint: string;
} {
  const mapped = FRIENDLY_EXPENSE_KEYS[acc.code];
  if (mapped) {
    return {
      label: t(`approvals:categories.${mapped.labelKey}`),
      hint: t(`approvals:categories.${mapped.hintKey}`),
    };
  }
  const cleanName = acc.name
    .replace(/^Beban\s+/i, "")
    .replace(/\s+Proyek$/i, "")
    .trim();
  return {
    label: cleanName || acc.name,
    hint: acc.description ?? t("approvals:categories.default_hint"),
  };
}

export function UserPaymentsPage() {
  const { t, language } = useLanguage();
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [attachments, setAttachments] = React.useState<AttachmentRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [expenseAccounts, setExpenseAccounts] = React.useState<AccountRow[]>([]);
  const [myPos, setMyPos] = React.useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [purpose, setPurpose] = React.useState("");
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientBankInfo, setRecipientBankInfo] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [projectId, setProjectId] = React.useState("");
  const [expenseAccountId, setExpenseAccountId] = React.useState("");
  const [poId, setPoId] = React.useState("none");
  const [proofSource, setProofSource] = React.useState<"local" | "gdrive">("local");
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [gdriveProof, setGdriveProof] = React.useState<GoogleDriveSelectResult | null>(null);
  const [drivePickerOpen, setDrivePickerOpen] = React.useState(false);
  const [budgetRemaining, setBudgetRemaining] = React.useState<number | null>(null);
  const [ackWarning, setAckWarning] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [reviseTarget, setReviseTarget] = React.useState<PaymentRequestRow | null>(
    null,
  );
  const [revPurpose, setRevPurpose] = React.useState("");
  const [revBank, setRevBank] = React.useState("");
  const [revAmount, setRevAmount] = React.useState(0);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [paRes, prjRes, accs, poRes] = await Promise.all([
        listPaymentRequests(),
        listProjects(),
        listAccounts(),
        listPurchaseOrders(),
      ]);
      setRequests(paRes.requests);
      setAttachments(paRes.attachments);
      setProjects(prjRes.projects);
      const allExpense = accs.filter(
        (a) => a.is_active && a.is_postable && a.account_type === "expense",
      );
      const claimableExpense = allExpense.filter(
        (a) => a.system_tag !== "profit_sharing_expense" && a.code !== "6-1401",
      );
      const expOnly = claimableExpense.length > 0 ? claimableExpense : allExpense;
      setExpenseAccounts(expOnly);
      setMyPos(poRes.orders.filter((o) => o.status === "issued"));
      if (!projectId && prjRes.projects[0]) setProjectId(prjRes.projects[0].id);
      if (!expenseAccountId && expOnly[0]) setExpenseAccountId(expOnly[0].id);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("approvals:load_error", "Gagal memuat pengajuan pembayaran."),
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, expenseAccountId, t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!projectId || !expenseAccountId || !createOpen) {
      setBudgetRemaining(null);
      return;
    }
    void getProjectBudgetComparison(projectId)
      .then((rows) => {
        const match = rows.find((r) => r.account_id === expenseAccountId);
        setBudgetRemaining(match ? match.remaining_amount : null);
      })
      .catch(() => setBudgetRemaining(null));
  }, [projectId, expenseAccountId, createOpen]);

  const exceedsBudget =
    budgetRemaining !== null && amount > budgetRemaining;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (proofSource === "local") {
      if (!proofFile) {
        toast.error("Wajib memilih berkas lampiran bukti tagihan/invoice (PDF/JPG/PNG).");
        return;
      }
      if (proofFile.size > 5 * 1024 * 1024) {
        toast.error("Ukuran berkas bukti maksimal 5 MB.");
        return;
      }
    } else {
      if (!gdriveProof) {
        toast.error("Wajib memilih berkas lampiran dari Google Drive.");
        return;
      }
    }

    if (exceedsBudget && !ackWarning) {
      toast.error("Centang konfirmasi peringatan anggaran terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const proofPayload =
        proofSource === "local" && proofFile
          ? {
              name: proofFile.name,
              mimeType: proofFile.type || "application/pdf",
              sizeBytes: proofFile.size,
              blob: proofFile,
            }
          : {
              name: gdriveProof!.customName || `Google_Drive_${gdriveProof!.fileId}.pdf`,
              mimeType: "application/pdf",
              sizeBytes: 1024,
              storagePathOverride: gdriveProof!.viewUrl,
            };

      const created = await createAndSubmitPaymentRequest({
        purpose,
        recipientName,
        recipientBankInfo,
        amount,
        projectId,
        expenseAccountId,
        poId: poId === "none" ? null : poId,
        proofFile: proofPayload,
        budgetWarningAcknowledged: ackWarning,
      });
      toast.success(
        t("approvals:submit_success", {
          number: created.request_number,
          defaultValue: `Pengajuan ${created.request_number} berhasil dikirim ke antrean Admin.`,
        }),
      );
      setCreateOpen(false);
      setPurpose("");
      setRecipientName("");
      setRecipientBankInfo("");
      setAmount(0);
      setProofFile(null);
      setGdriveProof(null);
      setAckWarning(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("approvals:submit_error", "Gagal mengirim pengajuan."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviseTarget) return;
    setSubmitting(true);
    try {
      await resubmitRejectedPaymentRequest({
        requestId: reviseTarget.id,
        purpose: revPurpose,
        recipientBankInfo: revBank,
        amount: revAmount,
      });
      toast.success(
        t("approvals:resubmit_success", {
          number: reviseTarget.request_number,
          defaultValue: `Pengajuan ${reviseTarget.request_number} berhasil diajukan ulang.`,
        }),
      );
      setReviseTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("approvals:submit_error", "Gagal mengajukan ulang."));
    } finally {
      setSubmitting(false);
    }
  }

  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, `${p.code} - ${p.name}`])),
    [projects],
  );
  const accountMap = React.useMemo(
    () => new Map(expenseAccounts.map((a) => [a.id, `${a.code} - ${a.name}`])),
    [expenseAccounts],
  );

  async function makePaDocSpec(req: PaymentRequestRow) {
    const comp = await getCompanyProfile();
    const reqAttachments = attachments.filter((a) => a.entity_id === req.id);
    return buildPaymentApprovalPdfSpec({
      company: comp,
      requestNumber: req.request_number,
      revisionNo: req.revision_no,
      requestDate: (req.submitted_at ?? req.created_at).slice(0, 10),
      requesterName: t("approvals:doc_requester", "Pengaju"),
      projectName: req.project_id
        ? projectMap.get(req.project_id) ?? t("approvals:doc_project_ops", "Operasional Proyek")
        : t("approvals:doc_general_ops", "Operasional Umum"),
      expenseAccountName: req.expense_account_id
        ? accountMap.get(req.expense_account_id) ?? "-"
        : "-",
      recipientName: req.recipient_name,
      recipientBankInfo: req.recipient_bank_info ?? null,
      purpose: req.purpose,
      amount: req.amount,
      status: req.status,
      statusLabel: getPaUserStatusMeta(req.status, t).label,
      approverName: req.approver_id ? t("approvals:doc_financial_admin", "Admin Keuangan") : null,
      approvedAt: req.decided_at ?? null,
      paidDate: req.paid_date ?? null,
      rejectionReason: req.rejection_reason ?? null,
      attachmentNames: reqAttachments.map((a) => a.file_name),
    });
  }

  async function handleDownloadPaPdf(req: PaymentRequestRow) {
    const spec = await makePaDocSpec(req);
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `PA_${req.request_number.replace(/\//g, "-")}.pdf`);
    await recordExportLog("PAYMENT_APPROVALS", "PDF");
  }

  async function handleDownloadPaWord(req: PaymentRequestRow) {
    const spec = await makePaDocSpec(req);
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

  async function handleExportExcel() {
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
        getPaUserStatusMeta(r.status, t).label,
        r.paid_date ?? "-",
      ]),
    });
    await recordExportLog("PAYMENT_APPROVALS", "EXCEL");
    toast.success(t("approvals:export.toast_excel_success"));
  }

  async function handleExportPdf() {
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
        getPaUserStatusMeta(r.status, t).label,
        formatRupiah(r.amount),
      ]),
    });
    downloadPdfBytes(bytes, t("approvals:export.user_pdf_filename"));
    await recordExportLog("PAYMENT_APPROVALS", "PDF");
  }

  async function handleExportCsv() {
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
        getPaUserStatusMeta(r.status, t).label,
        r.paid_date ?? "-",
      ]),
    );
    await recordExportLog("PAYMENT_APPROVALS", "CSV");
    toast.success(t("approvals:export.toast_csv_success"));
  }

  const pendingCount = requests.filter((r) => r.status === "submitted").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const totalPaidAmount = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("approvals:user.page_title")}
        description={t("approvals:user.page_desc")}
        actions={
          <>
            <ExportDownloadMenu
              label={t("common:action.export_download")}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
              mobileFloating
            />
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 max-sm:size-9 max-sm:p-0 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs w-auto"
            >
              <PlusIcon className="size-4" />
              <span className="max-sm:hidden">{t("approvals:user.btn_create")}</span>
            </Button>
          </>
        }
      />

      {/* Ringkasan KPI Pengajuan Pembayaran */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard
          label={t("approvals:user.kpi_pending")}
          value={pendingCount}
          suffix={` ${t("approvals:user.unit_submissions")}`}
          subtext={
            pendingCount > 0
              ? t("approvals:user.kpi_pending_desc_active")
              : t("approvals:user.kpi_pending_desc_empty")
          }
          icon={ClockIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        />

        <KpiCard
          label={t("approvals:user.kpi_ready")}
          value={approvedCount}
          suffix={` ${t("approvals:user.unit_submissions")}`}
          subtext={
            approvedCount > 0
              ? t("approvals:user.kpi_ready_desc_active")
              : t("approvals:user.kpi_ready_desc_empty")
          }
          icon={WalletIcon}
          iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        />

        <KpiCard
          label={t("approvals:user.kpi_paid")}
          displayValue={formatRupiah(totalPaidAmount)}
          subtext={t("approvals:user.kpi_paid_desc")}
          icon={CheckCircle2Icon}
          iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        />
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("approvals:user.card_title")}
          description={t("approvals:user.card_desc")}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_number")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_purpose_recipient")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_project")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap w-40 max-sm:w-32">{t("approvals:user.col_amount")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_attachments")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_status_notes")}</TableHead>
                <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap w-28 max-sm:w-20">{t("approvals:user.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow
                  colSpan={7}
                  message={t("approvals:user.loading")}
                />
              ) : requests.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ReceiptTextIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("approvals:user.empty_title")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          {t("approvals:user.empty_desc")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                  const prj = projects.find((p) => p.id === req.project_id);
                  const meta = getPaUserStatusMeta(req.status, t);
                  const files = attachments.filter((a) => a.entity_id === req.id);
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="align-top pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3.5 max-sm:py-2.5 font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        <div>{req.request_number}</div>
                        {req.revision_no > 0 ? (
                          <div className="text-[11px] font-sans font-normal text-muted-foreground mt-0.5">
                            {t("approvals:user.revision_label", { count: req.revision_no })}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                        <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                          {req.purpose}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {t("approvals:user.recipient_label", { name: req.recipient_name })}{" "}
                          {req.recipient_bank_info
                            ? `(${req.recipient_bank_info})`
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {prj?.code ?? "-"}
                      </TableCell>
                      <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                        <MonetaryCell amount={req.amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                        {files.length === 0 ? (
                          <span className="text-xs sm:text-sm leading-5 text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {files.map((f) => {
                              const isGdrive = f.storage_path.includes("drive.google.com");
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  className="flex items-center gap-1.5 text-left text-xs sm:text-sm leading-5 text-primary hover:underline cursor-pointer"
                                  onClick={() => {
                                    void getAttachmentSignedUrl(f.storage_path)
                                      .then((url) => {
                                        if (url) {
                                          window.open(url, "_blank", "noopener,noreferrer");
                                        } else {
                                          toast.info(
                                            `Lampiran contoh lokal: ${f.file_name} (unduhan nyata aktif setelah terhubung ke Supabase Storage).`,
                                          );
                                        }
                                      })
                                      .catch((err: unknown) =>
                                        toast.error(
                                          err instanceof Error
                                            ? err.message
                                            : "Gagal membuka lampiran.",
                                        ),
                                      );
                                  }}
                                >
                                  {isGdrive ? (
                                    <GoogleDriveIcon className="size-3.5 shrink-0" />
                                  ) : (
                                    <PaperclipIcon className="size-3 shrink-0" />
                                  )}
                                  <span className="max-w-36 truncate">{f.file_name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                        <div className="inline-flex flex-col items-start gap-1 min-h-5 -my-px">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                          {req.status === "rejected" && req.rejection_reason ? (
                            <p className="text-xs text-destructive leading-snug">
                              {t("approvals:user.rejected_reason_prefix", { reason: req.rejection_reason })}
                            </p>
                          ) : null}
                          {req.status === "paid" && req.paid_date ? (
                            <p className="text-xs text-muted-foreground leading-snug">
                              {t("approvals:user.paid_date_prefix", { date: formatDateI18n(req.paid_date, language) })}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <DocumentDownloadMenu
                            title={t("approvals:user.download_form_menu_title")}
                            onDownloadPdf={() => void handleDownloadPaPdf(req)}
                            onDownloadWord={() => void handleDownloadPaWord(req)}
                          />
                          {req.status === "rejected" ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={t("approvals:user.btn_revise_tooltip")}
                              onClick={() => {
                                setReviseTarget(req);
                                setRevPurpose(req.purpose);
                                setRevBank(req.recipient_bank_info ?? "");
                                setRevAmount(req.amount);
                              }}
                              className="size-8 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <RotateCcwIcon className="size-4" />
                              <span className="sr-only">{t("approvals:user.btn_revise_tooltip")}</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("approvals:modals.create_title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="min-w-0">
            <FieldGroup className="gap-3.5">
              <Field>
                <FieldLabel htmlFor="pa-purpose" required>{t("approvals:modals.field_purpose")}</FieldLabel>
                <Input
                  id="pa-purpose"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t("approvals:modals.placeholder_purpose")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-rec" required>{t("approvals:modals.field_recipient_name")}</FieldLabel>
                  <Input
                    id="pa-rec"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pa-bank" required>{t("approvals:modals.field_bank_info")}</FieldLabel>
                  <Input
                    id="pa-bank"
                    required
                    value={recipientBankInfo}
                    onChange={(e) => setRecipientBankInfo(e.target.value)}
                    placeholder={t("approvals:modals.placeholder_bank")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>{t("approvals:modals.field_project")}</FieldLabel>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("approvals:modals.select_project_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            {t("approvals:modals.no_projects_assigned")}
                          </SelectItem>
                        ) : (
                          projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel required>{t("approvals:modals.field_expense_category")}</FieldLabel>
                  <Select
                    value={expenseAccountId}
                    onValueChange={setExpenseAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("approvals:modals.placeholder_expense_category")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {expenseAccounts.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            {t("approvals:modals.no_expense_categories")}
                          </SelectItem>
                        ) : (
                          expenseAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getFriendlyExpenseCategory(a, t).label}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {(() => {
                    const selectedAcc = expenseAccounts.find(
                      (a) => a.id === expenseAccountId,
                    );
                    if (!selectedAcc) return null;
                    return (
                      <FieldDescription>
                        {t("approvals:modals.example_prefix", {
                          hint: getFriendlyExpenseCategory(selectedAcc, t).hint,
                        })}
                      </FieldDescription>
                    );
                  })()}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-amt" required>{t("approvals:modals.field_amount")}</FieldLabel>
                  <NumberInput
                    id="pa-amt"
                    allowDecimal={false}
                    min={1}
                    required
                    value={amount}
                    onValueChange={setAmount}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("approvals:modals.field_link_po")}</FieldLabel>
                  <Select value={poId} onValueChange={setPoId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{t("approvals:modals.po_none")}</SelectItem>
                        {myPos.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number} ({formatRupiah(po.total_amount)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {exceedsBudget ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("approvals:modals.budget_warning_title")}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      {t("approvals:modals.budget_warning_desc", {
                        amount: formatRupiah(amount),
                        budget: formatRupiah(budgetRemaining ?? 0),
                      })}
                    </span>
                    <div className="flex items-center gap-2.5 text-xs font-medium">
                      <Checkbox
                        id="ack-payment-budget-warning"
                        checked={ackWarning}
                        onCheckedChange={setAckWarning}
                      />
                      <label
                        htmlFor="ack-payment-budget-warning"
                        className="cursor-pointer select-none leading-relaxed"
                      >
                        {t("approvals:modals.budget_warning_ack")}
                      </label>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel required>{t("approvals:modals.field_attachments")}</FieldLabel>
                  <div className="inline-flex rounded-xl p-0.5 bg-muted/60 border border-border/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setProofSource("local")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        proofSource === "local"
                          ? "bg-card shadow-2xs font-bold text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("approvals:modals.proof_local")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofSource("gdrive")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        proofSource === "gdrive"
                          ? "bg-card shadow-2xs font-bold text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <GoogleDriveIcon className="size-3.5" />
                      <span>{t("approvals:modals.proof_gdrive")}</span>
                    </button>
                  </div>
                </div>

                {proofSource === "local" ? (
                  <>
                    <Input
                      id="pa-file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      required={proofSource === "local"}
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                    <FieldDescription>
                      {t("approvals:modals.proof_local_hint")}
                    </FieldDescription>
                  </>
                ) : (
                  <div className="space-y-2">
                    {gdriveProof ? (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-primary/35 dark:border-sky-500/40 bg-primary/5 dark:bg-sky-950/20 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GoogleDriveIcon className="size-5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {gdriveProof.customName || `Berkas_Drive_${gdriveProof.fileId}`}
                            </p>
                            <a
                              href={gdriveProof.viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline truncate block"
                            >
                              {t("approvals:modals.proof_gdrive_view")}
                            </a>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDrivePickerOpen(true)}
                          className="text-xs h-8 rounded-xl shrink-0"
                        >
                          {t("approvals:modals.proof_gdrive_change")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDrivePickerOpen(true)}
                        className="w-full h-11 rounded-xl border-dashed border-2 border-primary/40 dark:border-sky-500/40 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-primary/5 dark:hover:bg-sky-950/20 cursor-pointer"
                      >
                        <GoogleDriveIcon className="size-4" />
                        <span>{t("approvals:modals.proof_gdrive_btn")}</span>
                      </Button>
                    )}
                    <FieldDescription>
                      {t("approvals:modals.proof_gdrive_hint")}
                    </FieldDescription>
                  </div>
                )}
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  {t("approvals:modals.btn_cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  {t("approvals:modals.btn_submit")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviseTarget)}
        onOpenChange={(o) => {
          if (!o) setReviseTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("approvals:modals.revise_title", { number: reviseTarget?.request_number ?? "" })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResubmit}>
            <FieldGroup>
              {reviseTarget?.rejection_reason ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <span className="font-semibold block">{t("approvals:modals.revise_admin_note")}</span>
                  {reviseTarget.rejection_reason}
                </div>
              ) : null}
              <Field>
                <FieldLabel htmlFor="rev-purpose" required>{t("approvals:modals.purpose")}</FieldLabel>
                <Input
                  id="rev-purpose"
                  required
                  value={revPurpose}
                  onChange={(e) => setRevPurpose(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-bank" required>{t("approvals:modals.field_bank_info")}</FieldLabel>
                <Input
                  id="rev-bank"
                  required
                  value={revBank}
                  onChange={(e) => setRevBank(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-amt" required>{t("approvals:modals.field_amount")}</FieldLabel>
                <NumberInput
                  id="rev-amt"
                  allowDecimal={false}
                  min={1}
                  required
                  value={revAmount}
                  onValueChange={setRevAmount}
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviseTarget(null)}
                >
                  {t("approvals:modals.btn_cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {t("approvals:modals.revise_btn")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <GoogleDrivePickerDialog
        open={drivePickerOpen}
        onOpenChange={setDrivePickerOpen}
        mode="document"
        onSelect={(res) => {
          setGdriveProof(res);
        }}
      />
    </div>
  );
}
