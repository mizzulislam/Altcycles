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
import { formatDateID, formatDateTimeID, formatRupiah } from "@/lib/formatters";
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

const PA_STATUS_META: Record<
  PaymentRequestStatus,
  { label: string; tone: SemanticTone }
> = {
  draft: { label: "Draf", tone: "secondary" },
  submitted: { label: "Menunggu Persetujuan", tone: "info" },
  approved: { label: "Disetujui (Siap Cair)", tone: "warning" },
  rejected: { label: "Ditolak", tone: "destructive" },
  paid: { label: "Dibayar Lunas", tone: "success" },
};

export function AdminApprovalsPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const isEn = language === "en";
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
      fileName: isEn
        ? "Payment_Approvals_Altcycles.xlsx"
        : "Daftar_Payment_Approval_Altcycles.xlsx",
      sheetName: isEn ? "Payment Approvals" : "Payment Approval",
      columns: isEn
        ? [
            { header: "PA Number", width: 20 },
            { header: "Revision", width: 10 },
            { header: "Requester", width: 22 },
            { header: "Project", width: 28 },
            { header: "Expense Account", width: 28 },
            { header: "Payee", width: 24 },
            { header: "Purpose", width: 34 },
            { header: "Amount (IDR)", width: 18 },
            { header: "Status", width: 20 },
            { header: "Payment Date", width: 16 },
          ]
        : [
            { header: "Nomor PA", width: 20 },
            { header: "Revisi", width: 10 },
            { header: "Pengaju", width: 22 },
            { header: "Proyek", width: 28 },
            { header: "Akun Beban", width: 28 },
            { header: "Penerima Dana", width: 24 },
            { header: "Keperluan", width: 34 },
            { header: "Nominal (Rp)", width: 18 },
            { header: "Status", width: 20 },
            { header: "Tanggal Bayar", width: 16 },
          ],
      rows: filteredRequests.map((r) => [
        r.request_number,
        r.revision_no,
        profileMap.get(r.requester_id) ?? (isEn ? "User" : "Pengguna"),
        projectMap.get(r.project_id) ?? "-",
        accountMap.get(r.expense_account_id) ?? "-",
        r.recipient_name,
        r.purpose,
        r.amount,
        isEn
          ? r.status === "paid"
            ? "Paid"
            : r.status === "approved"
              ? "Approved"
              : r.status === "rejected"
                ? "Rejected"
                : "Pending Approval"
          : PA_STATUS_META[r.status].label,
        r.paid_date ? formatDateID(r.paid_date) : "-",
      ]),
    });
    await recordExportLog("PAYMENT_APPROVALS", "EXCEL");
    toast.success(
      isEn
        ? "Payment requests list exported to Excel (.xlsx) successfully."
        : "Daftar pengajuan pembayaran berhasil diekspor ke Excel (.xlsx).",
    );
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: isEn
        ? "PAYMENT APPROVALS & CASH DISBURSEMENTS"
        : "DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA",
      docSubtitle: isEn
        ? `Total Requests Displayed: ${filteredRequests.length} documents`
        : `Total Pengajuan Ditampilkan: ${filteredRequests.length} dokumen`,
      docNumber: `PA-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: isEn
        ? [
            { header: "PA Number", widthRatio: 0.16 },
            { header: "Requester", widthRatio: 0.15 },
            { header: "Payee & Purpose", widthRatio: 0.35 },
            { header: "Amount (IDR)", widthRatio: 0.14, align: "right" },
            { header: "Status", widthRatio: 0.12 },
            { header: "Payment Date", widthRatio: 0.08 },
          ]
        : [
            { header: "Nomor PA", widthRatio: 0.16 },
            { header: "Pengaju", widthRatio: 0.15 },
            { header: "Penerima & Keperluan", widthRatio: 0.35 },
            { header: "Nominal", widthRatio: 0.14, align: "right" },
            { header: "Status", widthRatio: 0.12 },
            { header: "Tgl Bayar", widthRatio: 0.08 },
          ],
      tableRows: filteredRequests.map((r) => [
        r.request_number,
        profileMap.get(r.requester_id) ?? (isEn ? "User" : "Pengguna"),
        `${r.recipient_name} - ${r.purpose}`,
        formatRupiah(r.amount),
        isEn
          ? r.status === "paid"
            ? "Paid"
            : r.status === "approved"
              ? "Approved"
              : r.status === "rejected"
                ? "Rejected"
                : "Pending Approval"
          : PA_STATUS_META[r.status].label,
        r.paid_date ? formatDateID(r.paid_date) : "-",
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(
      bytes,
      isEn
        ? "Payment_Approvals_Altcycles.pdf"
        : "Daftar_Payment_Approval_Altcycles.pdf",
    );
    await recordExportLog("PAYMENT_APPROVALS", "PDF");
  }

  async function handleExportCsv() {
    downloadCsvFile(
      isEn
        ? "Payment_Approvals_Altcycles.csv"
        : "Daftar_Payment_Approval_Altcycles.csv",
      isEn
        ? [
            "PA Number",
            "Revision",
            "Requester",
            "Project",
            "Expense Account",
            "Payee",
            "Purpose",
            "Amount (IDR)",
            "Status",
            "Payment Date",
          ]
        : [
            "Nomor PA",
            "Revisi",
            "Pengaju",
            "Proyek",
            "Akun Beban",
            "Penerima Dana",
            "Keperluan",
            "Nominal (Rp)",
            "Status",
            "Tanggal Bayar",
          ],
      filteredRequests.map((r) => [
        r.request_number,
        r.revision_no,
        profileMap.get(r.requester_id) ?? (isEn ? "User" : "Pengguna"),
        projectMap.get(r.project_id) ?? "-",
        accountMap.get(r.expense_account_id) ?? "-",
        r.recipient_name,
        r.purpose,
        r.amount,
        isEn
          ? r.status === "paid"
            ? "Paid"
            : r.status === "approved"
              ? "Approved"
              : r.status === "rejected"
                ? "Rejected"
                : "Pending Approval"
          : PA_STATUS_META[r.status].label,
        r.paid_date ?? "-",
      ]),
    );
    await recordExportLog("PAYMENT_APPROVALS", "CSV");
    toast.success(
      isEn
        ? "Payment requests list exported to CSV (.csv) successfully."
        : "Daftar pengajuan pembayaran berhasil diekspor ke CSV (.csv).",
    );
  }

  async function makePaDocSpec(req: PaymentRequestRow) {
    const comp = await getCompanyProfile();
    const reqAttachments = attachments.filter((a) => a.entity_id === req.id);
    return buildPaymentApprovalPdfSpec({
      company: comp,
      requestNumber: req.request_number,
      revisionNo: req.revision_no,
      requestDate: (req.submitted_at ?? req.created_at).slice(0, 10),
      requesterName: profileMap.get(req.requester_id) ?? "Anggota Tim",
      projectName: projectMap.get(req.project_id) ?? "Operasional Umum",
      expenseAccountName: accountMap.get(req.expense_account_id) ?? "-",
      recipientName: req.recipient_name,
      recipientBankInfo: req.recipient_bank_info ?? null,
      purpose: req.purpose,
      amount: req.amount,
      status: req.status,
      statusLabel: PA_STATUS_META[req.status].label,
      approverName: req.approver_id ? profileMap.get(req.approver_id) ?? "Admin Keuangan" : null,
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
            {t("approvals.page_title", "Persetujuan Pembayaran 1-Level & Pencairan Dana")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("approvals.page_desc", "Verifikasi permohonan dana, persetujuan pengajuan, dan pencairan kas tim.")}
          </p>
        </div>
        <div className="shrink-0">
          <ExportDownloadMenu
            label={t("action.export_download", "Unduh / Ekspor")}
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
              Menunggu Persetujuan Admin
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {pendingCount} Pengajuan
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pendingCount > 0
                ? "Menunggu verifikasi & otorisasi bendahara"
                : "Tidak ada antrean pengajuan baru"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ClockIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Disetujui &amp; Siap Dicairkan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {approvedUnpaidCount} Pengajuan
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {approvedUnpaidCount > 0
                ? "Menunggu realisasi transfer kas/bank"
                : "Seluruh pengajuan disetujui telah cair"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Total Pembayaran Terealisasi
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalPaidAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tercatat otomatis di buku besar kas
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
            <CardTitle>Daftar Pengajuan Pembayaran Tim</CardTitle>
            <CardDescription>
              Periksa lampiran bukti sebelum menyetujui atau menolak pengajuan.
            </CardDescription>
          </div>
          <div className="w-full sm:w-56 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="submitted">Menunggu Persetujuan</SelectItem>
                  <SelectItem value="approved">Disetujui (Siap Cair)</SelectItem>
                  <SelectItem value="paid">Dibayar Lunas</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat pengajuan pembayaran...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Nomor &amp; Waktu</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Pengaju &amp; Proyek</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Keperluan &amp; Penerima</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Lampiran Bukti</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">Nominal</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
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
                          Tidak Ada Pengajuan Pembayaran
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          Belum ada pengajuan pembayaran tim yang sesuai dengan filter status saat ini.
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
                  const meta = PA_STATUS_META[req.status];

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-xs sm:text-sm leading-5 font-semibold text-foreground">
                          {req.request_number}
                          {req.revision_no > 0 ? ` (Rev.${req.revision_no})` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {formatDateTimeID(req.submitted_at ?? req.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5">
                        <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                          {profileMap.get(req.requester_id) ?? "Anggota Tim"}
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
                          Penerima: {req.recipient_name}{" "}
                          {req.recipient_bank_info
                            ? `(${req.recipient_bank_info})`
                            : ""}
                        </div>
                        {req.rejection_reason ? (
                          <div className="mt-1 text-xs text-destructive leading-snug">
                            Alasan tolak: &ldquo;{req.rejection_reason}&rdquo;
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
                              Cair: {formatDateID(req.paid_date)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1 -my-1.5">
                          <DocumentDownloadMenu
                            title="Unduh Form PA (PDF / Word)"
                            onDownloadPdf={() => void handleDownloadPaPdf(req)}
                            onDownloadWord={() => void handleDownloadPaWord(req)}
                          />
                          {req.status === "submitted" ? (
                            isSelfRequest ? (
                              <div className="inline-flex items-center min-h-5 -my-px">
                                <StatusBadge
                                  tone="warning"
                                  label="Pengajuan Sendiri"
                                />
                              </div>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="Setujui Pengajuan"
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
                                  <span className="sr-only">Setujui Pengajuan</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="Tolak Pengajuan"
                                  onClick={() => setRejectTarget(req)}
                                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <XCircleIcon className="size-4" />
                                  <span className="sr-only">Tolak Pengajuan</span>
                                </Button>
                              </>
                            )
                          ) : req.status === "approved" ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Catat Pencairan Dana"
                              onClick={() => {
                                setPaidDate(
                                  (req.decided_at ?? req.created_at).slice(0, 10),
                                );
                                setDisburseTarget(req);
                              }}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <BanknoteIcon className="size-4" />
                              <span className="sr-only">Catat Pencairan Dana</span>
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs leading-5 text-muted-foreground">
                              <LockIcon className="size-3.5" />
                              <span>Terkunci</span>
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
              Setujui Pengajuan {approveTarget?.request_number}?
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmApprove}>
            <FieldGroup>
              <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                Persetujuan langsung menerbitkan jurnal akrual beban otomatis sebesar{" "}
                <span className="font-semibold text-foreground">
                  {formatRupiah(approveTarget?.amount ?? 0)}
                </span>
                .
              </div>
              {approveTarget?.budget_warning_acknowledged ? (
                <Alert>
                  <ShieldAlertIcon className="size-4" />
                  <AlertTitle>Pengajuan Melebihi Ambang Anggaran</AlertTitle>
                  <AlertDescription>
                    Pengaju telah mengonfirmasi peringatan serapan anggaran saat
                    mengirim pengajuan ini.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Field>
                <FieldLabel htmlFor="pa-acc-date" required>
                  Tanggal Pengakuan Beban Akrual
                </FieldLabel>
                <DatePicker
                  id="pa-acc-date"
                  required
                  value={accountingDate}
                  onChange={setAccountingDate}
                />
                <FieldDescription>
                  Harus berada pada periode akuntansi yang berstatus Terbuka.
                </FieldDescription>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApproveTarget(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={approving}>
                  {approving ? <Spinner data-icon="inline-start" /> : null}
                  Setujui &amp; Posting Akrual
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
        title={`Tolak Pengajuan ${rejectTarget?.request_number ?? ""}?`}
        description="Pengaju akan menerima notifikasi beserta alasan penolakan Anda agar dapat memperbaiki dan mengajukan ulang."
        destructive
        requireReason
        reasonLabel="Alasan Penolakan (Wajib Diisi)"
        reasonPlaceholder="Contoh: Nominal pada faktur vendor belum sesuai dengan rincian PO..."
        confirmLabel="Tolak Pengajuan"
        onConfirm={async (reason) => {
          if (!rejectTarget || !reason) return;
          await decidePaymentRequest({
            requestId: rejectTarget.id,
            decision: "reject",
            rejectionReason: reason,
            accountingDate: new Date().toLocaleDateString("en-CA"),
          });
          toast.success(
            `Pengajuan ${rejectTarget.request_number} telah ditolak.`,
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
              Catat Realisasi Pembayaran {disburseTarget?.request_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisburse}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pa-paid-date" required>
                  Tanggal Transfer / Pembayaran
                </FieldLabel>
                <DatePicker
                  id="pa-paid-date"
                  required
                  value={paidDate}
                  onChange={setPaidDate}
                />
              </Field>
              <Field>
                <FieldLabel required>Akun Sumber Kas / Bank Perusahaan</FieldLabel>
                <Select
                  value={sourceCashAccountId}
                  onValueChange={setSourceCashAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rekening kas/bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cashAccounts.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Belum ada akun kas/bank aktif
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
                  Batal
                </Button>
                <Button type="submit" disabled={disbursing}>
                  {disbursing ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Pencairan &amp; Posting Jurnal
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

