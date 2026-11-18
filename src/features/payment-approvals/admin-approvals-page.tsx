import * as React from "react";
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ClockIcon,
  LockIcon,
  PaperclipIcon,
  ReceiptTextIcon,
  ShieldAlertIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { GoogleDriveIcon } from "@/components/shared/google-drive-picker-dialog";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import { getCompanyProfile, listAccounts, listProfiles, listProjects } from "@/lib/data-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateI18n, formatDateTimeI18n, formatRupiah } from "@/lib/formatters";
import {
  decidePaymentRequest,
  getAttachmentSignedUrl,
  listPaymentRequests,
  recordExportLog,
  recordPaymentDisbursement,
} from "@/lib/operations-service";
import {
  buildPaymentApprovalPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import type {
  AccountRow,
  AttachmentRow,
  PaymentRequestRow,
  PaymentRequestStatus,
  ProfileRow,
  ProjectRow,
} from "@/types/database.types";

function getPaStatusMeta(status: PaymentRequestStatus, t: (k: string, fb?: string) => string): { label: string; tone: SemanticTone } {
  switch (status) {
    case "draft":
      return { label: t("approvals:status.draft", "Draf"), tone: "secondary" };
    case "submitted":
      return { label: t("approvals:status.submitted", "Menunggu Persetujuan"), tone: "info" };
    case "approved":
      return { label: t("approvals:status.approved", "Disetujui (Siap Cair)"), tone: "warning" };
    case "rejected":
      return { label: t("approvals:status.rejected", "Ditolak"), tone: "destructive" };
    case "paid":
      return { label: t("approvals:status.paid", "Dibayar Lunas"), tone: "success" };
  }
}

export function AdminApprovalsPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [attachments, setAttachments] = React.useState<AttachmentRow[]>([]);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState(true);

  // Dialog Persetujuan (dengan tanggal akuntansi untuk posting akrual D Beban / K Utang)
  const [approveTarget, setApproveTarget] =
    React.useState<PaymentRequestRow | null>(null);
  const [accountingDate, setAccountingDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [approving, setApproving] = React.useState(false);

  // Dialog Penolakan (wajib alasan BR-5)
  const [rejectTarget, setRejectTarget] =
    React.useState<PaymentRequestRow | null>(null);

  // Dialog Pencairan Dana / Realisasi Pembayaran (D Utang / K Kas-Bank)
  const [disburseTarget, setDisburseTarget] =
    React.useState<PaymentRequestRow | null>(null);
  const [paidDate, setPaidDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [sourceCashAccountId, setSourceCashAccountId] = React.useState("");
  const [disbursing, setDisbursing] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [paRes, profs, prjRes, accs] = await Promise.all([
        listPaymentRequests(),
        listProfiles(),
        listProjects(),
        listAccounts(),
      ]);
      setRequests(paRes.requests);
      setAttachments(paRes.attachments);
      setProfiles(profs);
      setProjects(prjRes.projects);
      setAccounts(accs);

      const firstCash = accs.find(
        (a) => a.is_active && a.is_postable && a.system_tag === "cash_bank",
      );
      if (firstCash) {
        setSourceCashAccountId((prev) => prev || firstCash.id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar persetujuan pembayaran.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const cashAccounts = React.useMemo(
    () =>
      accounts.filter(
        (a) => a.is_active && a.is_postable && a.system_tag === "cash_bank",
      ),
    [accounts],
  );

  const profileMap = React.useMemo(
    () => new Map(profiles.map((p) => [p.id, p.full_name])),
    [profiles],
  );
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, `${p.code}: ${p.name}`])),
    [projects],
  );
  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, `${a.code}: ${a.name}`])),
    [accounts],
  );

  const filteredRequests = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? requests
        : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter],
  );

  async function handleConfirmApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approveTarget) return;
    setApproving(true);
    try {
      await decidePaymentRequest({
        requestId: approveTarget.id,
        decision: "approve",
        accountingDate,
      });
      toast.success(
        `Pengajuan ${approveTarget.request_number} disetujui dan jurnal akrual beban telah diposting.`,
      );
      setApproveTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyetujui pengajuan.",
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleDisburse(e: React.FormEvent) {
    e.preventDefault();
    if (!disburseTarget || !sourceCashAccountId) return;
    setDisbursing(true);
    try {
      await recordPaymentDisbursement({
        requestId: disburseTarget.id,
        paidDate,
        sourceCashAccountId,
      });
      toast.success(
        `Realisasi pembayaran ${disburseTarget.request_number} berhasil dicatat dan jurnal pelunasan kas/bank telah diposting.`,
      );
      setDisburseTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mencatat pencairan pembayaran.",
      );
    } finally {
      setDisbursing(false);
    }
  }

  async function handleExportExcel() {
    await downloadExcelSheet({
      fileName: t("approvals:export.admin_excel_filename"),
      sheetName: t("approvals:export.admin_excel_sheet"),
      columns: [
        { header: t("approvals:admin.col_number_date"), width: 20 },
        { header: "Revisi", width: 10 },
        { header: t("approvals:modals.requester_name"), width: 22 },
        { header: t("approvals:modals.project_name"), width: 28 },
        { header: t("approvals:modals.approve_expense_account"), width: 28 },
        { header: t("approvals:modals.recipient_name"), width: 24 },
        { header: t("approvals:modals.purpose"), width: 34 },
        { header: t("approvals:admin.col_amount"), width: 18 },
        { header: t("approvals:admin.col_status"), width: 20 },
        { header: t("approvals:modals.disburse_date"), width: 16 },
      ],
      rows: filteredRequests.map((r) => [
        r.request_number,
        r.revision_no,
        profileMap.get(r.requester_id) ?? t("common:role.user"),
        projectMap.get(r.project_id) ?? "-",
        accountMap.get(r.expense_account_id) ?? "-",
        r.recipient_name,
        r.purpose,
        r.amount,
        getPaStatusMeta(r.status, t).label,
        r.paid_date ? formatDateI18n(r.paid_date, language) : "-",
      ]),
    });
    await recordExportLog("PAYMENT_APPROVALS", "EXCEL");
    toast.success(t("approvals:export.toast_excel_success"));
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: t("approvals:export.admin_pdf_title"),
      docSubtitle: t("approvals:export.admin_pdf_subtitle"),
      docNumber: `PA-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: t("approvals:admin.col_number_date"), widthRatio: 0.18 },
        { header: t("approvals:modals.requester_name"), widthRatio: 0.15 },
        { header: t("approvals:modals.purpose"), widthRatio: 0.26 },
        { header: t("approvals:admin.col_amount"), widthRatio: 0.16, align: "right" },
        { header: t("approvals:admin.col_status"), widthRatio: 0.11, align: "center" },
        { header: t("approvals:modals.disburse_date"), widthRatio: 0.14, align: "center" },
      ],
      tableRows: filteredRequests.map((r) => [
        r.request_number,
        profileMap.get(r.requester_id) ?? t("common:role.user"),
        `${r.recipient_name} - ${r.purpose}`,
        formatRupiah(r.amount),
        getPaStatusMeta(r.status, t).label,
        r.paid_date ? formatDateI18n(r.paid_date, language) : "-",
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, t("approvals:export.admin_pdf_filename"));
    await recordExportLog("PAYMENT_APPROVALS", "PDF");
  }

  async function handleExportCsv() {
    downloadCsvFile(
      t("approvals:export.admin_csv_filename"),
      [
        t("approvals:admin.col_number_date"),
        "Revisi",
        t("approvals:modals.requester_name"),
        t("approvals:modals.project_name"),
        t("approvals:modals.approve_expense_account"),
        t("approvals:modals.recipient_name"),
        t("approvals:modals.purpose"),
        t("approvals:admin.col_amount"),
        t("approvals:admin.col_status"),
        t("approvals:modals.disburse_date"),
      ],
      filteredRequests.map((r) => [
        r.request_number,
        r.revision_no,
        profileMap.get(r.requester_id) ?? t("common:role.user"),
        projectMap.get(r.project_id) ?? "-",
        accountMap.get(r.expense_account_id) ?? "-",
        r.recipient_name,
        r.purpose,
        r.amount,
        getPaStatusMeta(r.status, t).label,
        r.paid_date ?? "-",
      ]),
    );
    await recordExportLog("PAYMENT_APPROVALS", "CSV");
    toast.success(t("approvals:export.toast_csv_success"));
  }

  async function makePaDocSpec(req: PaymentRequestRow) {
    const comp = await getCompanyProfile();
    const reqAttachments = attachments.filter((a) => a.entity_id === req.id);
    return buildPaymentApprovalPdfSpec({
      company: comp,
      requestNumber: req.request_number,
      revisionNo: req.revision_no,
      requestDate: (req.submitted_at ?? req.created_at).slice(0, 10),
      requesterName: profileMap.get(req.requester_id) ?? t("common:role.user"),
      projectName: projectMap.get(req.project_id) ?? t("approvals:modals.general_operations"),
      expenseAccountName: accountMap.get(req.expense_account_id) ?? "-",
      recipientName: req.recipient_name,
      recipientBankInfo: req.recipient_bank_info ?? null,
      purpose: req.purpose,
      amount: req.amount,
      status: req.status,
      statusLabel: getPaStatusMeta(req.status, t).label,
      approverName: req.approver_id ? profileMap.get(req.approver_id) ?? t("common:role.admin") : null,
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
    toast.success(`Form PA ${req.request_number} (Word) berhasil diunduh.`);
  }

  const pendingCount = requests.filter((r) => r.status === "submitted").length;
  const approvedUnpaidCount = requests.filter(
    (r) => r.status === "approved",
  ).length;
  const totalPaidAmount = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("approvals:admin.page_title", "Persetujuan Pembayaran 1-Level & Pencairan Dana")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("approvals:admin.page_desc", "Verifikasi permohonan dana, persetujuan pengajuan, dan pencairan kas tim.")}
          </p>
        </div>
        <div className="shrink-0">
          <ExportDownloadMenu
            label={t("common:action.export_download", "Unduh / Ekspor")}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
        </div>
      </div>

      {/* Ringkasan KPI Persetujuan & Pencairan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("approvals:admin.kpi_pending", "Menunggu Persetujuan Admin")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {pendingCount} {t("approvals:admin.unit_submissions", "Pengajuan")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pendingCount > 0
                ? t("approvals:admin.kpi_pending_desc_active", "Menunggu verifikasi & otorisasi bendahara")
                : t("approvals:admin.kpi_pending_desc_empty", "Tidak ada antrean pengajuan baru")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ClockIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("approvals:admin.kpi_ready", "Disetujui & Siap Dicairkan")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {approvedUnpaidCount} {t("approvals:admin.unit_submissions", "Pengajuan")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {approvedUnpaidCount > 0
                ? t("approvals:admin.kpi_ready_desc_active", "Menunggu realisasi transfer kas/bank")
                : t("approvals:admin.kpi_ready_desc_empty", "Seluruh pengajuan disetujui telah cair")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("approvals:admin.kpi_paid", "Total Pembayaran Terealisasi")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalPaidAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("approvals:admin.kpi_paid_desc", "Tercatat otomatis di buku besar kas")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2Icon className="size-5" />
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>{t("approvals:admin.card_title", "Daftar Pengajuan Pembayaran Tim")}</CardTitle>
            <CardDescription>
              {t("approvals:admin.card_desc", "Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana.")}
            </CardDescription>
          </div>
          <div className="w-full sm:w-56 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder={t("approvals:admin.filter_status_placeholder", "Filter status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">{t("approvals:admin.filter_all", "Semua Status")}</SelectItem>
                  <SelectItem value="submitted">{t("approvals:admin.filter_submitted", "Menunggu Persetujuan")}</SelectItem>
                  <SelectItem value="approved">{t("approvals:admin.filter_approved", "Disetujui (Siap Cair)")}</SelectItem>
                  <SelectItem value="paid">{t("approvals:admin.filter_paid", "Dibayar Lunas")}</SelectItem>
                  <SelectItem value="rejected">{t("approvals:admin.filter_rejected", "Ditolak")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>{t("common:action.loading", "Memuat data...")}</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                    {t("approvals:admin.col_number_date", "Nomor & Tanggal")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("approvals:admin.col_requester_project", "Pemohon & Proyek")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("approvals:admin.col_purpose", "Keterangan Pengeluaran")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("approvals:modals.attachments", "Bukti Lampiran")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">
                    {t("approvals:admin.col_amount", "Nominal Pengajuan (IDR)")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("approvals:admin.col_status", "Status")}
                  </TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">
                    {t("approvals:admin.col_actions", "Aksi")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ReceiptTextIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("approvals:admin.empty_title", "Tidak Ada Pengajuan Pembayaran")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          {t("approvals:admin.empty_desc", "Belum ada data pengajuan pembayaran dari tim pada kriteria filter ini.")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => {
                  const reqAttachments = attachments.filter(
                    (a) => a.entity_id === req.id,
                  );
                  const isSelfRequest = req.requester_id === profile?.id;
                  const meta = getPaStatusMeta(req.status, t);

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-xs sm:text-sm leading-5 font-semibold text-foreground">
                          {req.request_number}
                          {req.revision_no > 0 ? ` (Rev.${req.revision_no})` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {formatDateTimeI18n(req.submitted_at ?? req.created_at, language)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5">
                        <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                          {profileMap.get(req.requester_id) ?? t("common:role.team_member", "Anggota Tim")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {projectMap.get(req.project_id) ?? "-"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {accountMap.get(req.expense_account_id) ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5">
                        <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                          {req.purpose}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {t("approvals:admin.recipient_label", { name: req.recipient_name, defaultValue: `Penerima: ${req.recipient_name}` })}{" "}
                          {req.recipient_bank_info
                            ? `(${req.recipient_bank_info})`
                            : ""}
                        </div>
                        {req.rejection_reason ? (
                          <div className="mt-1 text-xs text-destructive leading-snug">
                            {t("approvals:modals.admin_notes", "Catatan Admin")}: &ldquo;{req.rejection_reason}&rdquo;
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5">
                        {reqAttachments.length === 0 ? (
                          <span className="text-xs sm:text-sm leading-5 text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {reqAttachments.map((att) => {
                              const isGdrive =
                                att.storage_path.startsWith("http://") ||
                                att.storage_path.startsWith("https://") ||
                                att.file_name.toLowerCase().includes("gdrive") ||
                                att.file_name.toLowerCase().includes("drive");
                              return (
                                <button
                                  key={att.id}
                                  type="button"
                                  className="inline-flex items-center gap-1.5 text-left text-xs sm:text-sm leading-5 text-primary hover:underline cursor-pointer"
                                  onClick={() => {
                                    void getAttachmentSignedUrl(att.storage_path)
                                      .then((url) => {
                                        if (url) {
                                          window.open(
                                            url,
                                            "_blank",
                                            "noopener,noreferrer",
                                          );
                                        } else {
                                          toast.info(
                                            `Lampiran: ${att.file_name}`,
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
                                    <PaperclipIcon className="size-3.5 shrink-0" />
                                  )}
                                  <span className="max-w-36 truncate">
                                    {att.file_name}
                                  </span>
                                  {!isGdrive ? (
                                    <span className="text-xs text-muted-foreground">
                                      ({Math.ceil(att.file_size_bytes / 1024)} KB)
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={req.amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-1 min-h-5 -my-px">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                          {req.paid_date ? (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateI18n(req.paid_date, language)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1 -my-1.5">
                          <DocumentDownloadMenu
                            title={t("approvals:admin.btn_detail", "Unduh Form PA (PDF / Word)")}
                            onDownloadPdf={() => void handleDownloadPaPdf(req)}
                            onDownloadWord={() => void handleDownloadPaWord(req)}
                          />
                          {req.status === "submitted" ? (
                            isSelfRequest ? (
                              <div className="inline-flex items-center min-h-5 -my-px">
                                <StatusBadge
                                  tone="warning"
                                  label={t("common:role.own_submission", "Pengajuan Sendiri")}
                                />
                              </div>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title={t("approvals:admin.btn_approve", "Setujui Pengajuan")}
                                  onClick={() => {
                                    setAccountingDate(
                                      (req.submitted_at ?? req.created_at).slice(
                                        0,
                                        10,
                                      ),
                                    );
                                    setApproveTarget(req);
                                  }}
                                  className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <CheckCircle2Icon className="size-4" />
                                  <span className="sr-only">{t("approvals:admin.action_approve_short", "Setujui")}</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title={t("approvals:admin.btn_reject", "Tolak Pengajuan")}
                                  onClick={() => setRejectTarget(req)}
                                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <XCircleIcon className="size-4" />
                                  <span className="sr-only">{t("approvals:admin.action_reject_short", "Tolak")}</span>
                                </Button>
                              </>
                            )
                          ) : req.status === "approved" ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={t("approvals:admin.btn_disburse", "Catat Pencairan Dana")}
                              onClick={() => {
                                setPaidDate(
                                  (req.decided_at ?? req.created_at).slice(0, 10),
                                );
                                setDisburseTarget(req);
                              }}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <BanknoteIcon className="size-4" />
                              <span className="sr-only">{t("approvals:admin.action_disburse_short", "Cairkan")}</span>
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs leading-5 text-muted-foreground">
                              <LockIcon className="size-3.5" />
                              <span>{t("common:action.locked", "Terkunci")}</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Konfirmasi Setujui & Posting Jurnal Akrual Beban */}
      <Dialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("approvals:modals.approve_title", {
                number: approveTarget?.request_number ?? "",
                defaultValue: `Persetujuan & Pengakuan Beban Akrual ${approveTarget?.request_number}`,
              })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmApprove}>
            <FieldGroup>
              <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                {t("approvals:modals.approve_amount", "Nominal Pembayaran:")}{" "}
                <span className="font-semibold text-foreground">
                  {formatRupiah(approveTarget?.amount ?? 0)}
                </span>
                .
              </div>
              {approveTarget?.budget_warning_acknowledged ? (
                <Alert>
                  <ShieldAlertIcon className="size-4" />
                  <AlertTitle>{t("po:modal_create.budget_warning_title", "Peringatan Ambang Anggaran")}</AlertTitle>
                  <AlertDescription>
                    {t("common:action.acknowledge_warning", "Pengaju telah mengonfirmasi peringatan serapan anggaran saat mengirim pengajuan ini.")}
                  </AlertDescription>
                </Alert>
              ) : null}
              <Field>
                <FieldLabel htmlFor="pa-acc-date" required>
                  {t("approvals:modals.approve_accrual_date", "Tanggal Pengakuan Beban Akrual")}
                </FieldLabel>
                <DatePicker
                  id="pa-acc-date"
                  required
                  value={accountingDate}
                  onChange={setAccountingDate}
                />
                <FieldDescription>
                  {t("approvals:modals.approve_period_hint", "Harus berada pada periode akuntansi yang berstatus Terbuka.")}
                </FieldDescription>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApproveTarget(null)}
                >
                  {t("approvals:modals.btn_cancel", "Batal")}
                </Button>
                <Button type="submit" disabled={approving}>
                  {approving ? <Spinner data-icon="inline-start" /> : null}
                  {t("approvals:modals.btn_approve_confirm", "Setujui & Posting Akrual")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Penolakan dengan Alasan Wajib (BR-5) */}
      <ConfirmActionDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title={t("approvals:modals.reject_title", {
          number: rejectTarget?.request_number ?? "",
          defaultValue: `Tolak Pengajuan ${rejectTarget?.request_number ?? ""}?`,
        })}
        description={t(
          "approvals:modals.reject_desc",
          "Pengajuan ini akan dikembalikan ke pemohon dengan catatan penolakan resmi. Pemohon dapat memperbaiki dokumen dan mengajukan kembali.",
        )}
        destructive
        requireReason
        reasonLabel={t("approvals:modals.reject_reason_label", "Alasan Penolakan (Wajib Diisi)")}
        reasonPlaceholder={t(
          "approvals:modals.reject_reason_placeholder",
          "Tuliskan alasan penolakan atau kekurangan berkas bukti...",
        )}
        confirmLabel={t("approvals:modals.btn_reject_confirm", "Tolak Pengajuan")}
        onConfirm={async (reason) => {
          if (!rejectTarget || !reason) return;
          await decidePaymentRequest({
            requestId: rejectTarget.id,
            decision: "reject",
            rejectionReason: reason,
            accountingDate: new Date().toLocaleDateString("en-CA"),
          });
          toast.success(
            t("approvals:modals.toast_rejected", {
              number: rejectTarget.request_number,
              defaultValue: `Pengajuan ${rejectTarget.request_number} telah ditolak.`,
            }),
          );
          await reload();
        }}
      />

      {/* Dialog Pencatatan Realisasi Pencairan Kas/Bank */}
      <Dialog
        open={Boolean(disburseTarget)}
        onOpenChange={(open) => {
          if (!open) setDisburseTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("approvals:modals.disburse_title", {
                number: disburseTarget?.request_number ?? "",
                defaultValue: `Catat Realisasi Pembayaran ${disburseTarget?.request_number}`,
              })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisburse}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pa-paid-date" required>
                  {t("approvals:modals.disburse_date", "Tanggal Transfer / Pembayaran")}
                </FieldLabel>
                <DatePicker
                  id="pa-paid-date"
                  required
                  value={paidDate}
                  onChange={setPaidDate}
                />
              </Field>
              <Field>
                <FieldLabel required>{t("approvals:modals.disburse_cash_account", "Akun Sumber Kas / Bank Perusahaan")}</FieldLabel>
                <Select
                  value={sourceCashAccountId}
                  onValueChange={setSourceCashAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("approvals:modals.select_cash_placeholder", "Pilih rekening kas/bank")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cashAccounts.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          {t("approvals:modals.no_cash_accounts", "Belum ada akun kas/bank aktif")}
                        </SelectItem>
                      ) : (
                        cashAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code}: {acc.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisburseTarget(null)}
                >
                  {t("approvals:modals.btn_cancel", "Batal")}
                </Button>
                <Button type="submit" disabled={disbursing}>
                  {disbursing ? <Spinner data-icon="inline-start" /> : null}
                  {t("approvals:modals.btn_disburse_confirm", "Simpan Pencairan & Posting Jurnal")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

