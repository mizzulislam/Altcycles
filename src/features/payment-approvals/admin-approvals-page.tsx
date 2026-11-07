import * as React from "react";
import {
  BanknoteIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  PaperclipIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { listAccounts, listProfiles, listProjects } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateID, formatDateTimeID, formatRupiah } from "@/lib/formatters";
import {
  decidePaymentRequest,
  getAttachmentSignedUrl,
  listPaymentRequests,
  recordExportLog,
  recordPaymentDisbursement,
} from "@/lib/operations-service";
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
  const [accountingDate, setAccountingDate] = React.useState("2026-11-07");
  const [approving, setApproving] = React.useState(false);

  // Dialog Penolakan (wajib alasan BR-5)
  const [rejectTarget, setRejectTarget] =
    React.useState<PaymentRequestRow | null>(null);

  // Dialog Pencairan Dana / Realisasi Pembayaran (D Utang / K Kas-Bank)
  const [disburseTarget, setDisburseTarget] =
    React.useState<PaymentRequestRow | null>(null);
  const [paidDate, setPaidDate] = React.useState("2026-11-07");
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
    () => new Map(projects.map((p) => [p.id, `${p.code} — ${p.name}`])),
    [projects],
  );
  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, `${a.code} — ${a.name}`])),
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
      fileName: "Daftar_Payment_Approval_Altcycles.xlsx",
      sheetName: "Payment Approval",
      columns: [
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
        profileMap.get(r.requester_id) ?? "Pengguna",
        projectMap.get(r.project_id) ?? "-",
        accountMap.get(r.expense_account_id) ?? "-",
        r.recipient_name,
        r.purpose,
        r.amount,
        PA_STATUS_META[r.status].label,
        r.paid_date ? formatDateID(r.paid_date) : "-",
      ]),
    });
    await recordExportLog("PAYMENT_APPROVALS", "EXCEL");
    toast.success("Daftar pengajuan pembayaran berhasil diekspor ke Excel.");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Persetujuan Pembayaran 1-Level &amp; Pencairan Dana
          </h1>
          <p className="text-sm text-muted-foreground">
            Menegakkan pemisahan tugas (BR-4), alasan penolakan wajib (BR-5),
            posting akrual beban otomatis saat disetujui, serta jurnal kas/bank
            saat pencairan dicatat.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleExportExcel()}>
          <FileSpreadsheetIcon data-icon="inline-start" />
          Ekspor Excel
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Menunggu Persetujuan Admin</CardDescription>
            <CardTitle className="text-2xl">{pendingCount} Pengajuan</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone={pendingCount > 0 ? "info" : "secondary"}
              label={pendingCount > 0 ? "Perlu Tindakan" : "Nihil Antrean"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Disetujui — Siap Dicairkan</CardDescription>
            <CardTitle className="text-2xl">
              {approvedUnpaidCount} Pengajuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone={approvedUnpaidCount > 0 ? "warning" : "secondary"}
              label="Menunggu Transfer Manual"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pembayaran Terealisasi</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(totalPaidAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone="success" label="Tercatat di Buku Besar" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Pengajuan Pembayaran Tim</CardTitle>
            <CardDescription>
              Periksa lampiran bukti sebelum menyetujui atau menolak pengajuan.
            </CardDescription>
          </div>
          <div className="w-full sm:w-56">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat pengajuan pembayaran...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="Tidak ada pengajuan pembayaran"
              description="Belum ada pengajuan yang sesuai dengan filter status saat ini."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor &amp; Waktu</TableHead>
                  <TableHead>Pengaju &amp; Proyek</TableHead>
                  <TableHead>Keperluan &amp; Penerima</TableHead>
                  <TableHead>Lampiran Bukti</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const reqAttachments = attachments.filter(
                    (a) => a.entity_id === req.id,
                  );
                  const isSelfRequest = req.requester_id === profile?.id;
                  const meta = PA_STATUS_META[req.status];

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="text-xs">
                        <div className="font-mono font-semibold">
                          {req.request_number}
                          {req.revision_no > 0 ? ` (Rev.${req.revision_no})` : ""}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDateTimeID(req.submitted_at ?? req.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {profileMap.get(req.requester_id) ?? "Anggota Tim"}
                        </div>
                        <div className="text-muted-foreground">
                          {projectMap.get(req.project_id) ?? "-"}
                        </div>
                        <div className="text-muted-foreground">
                          {accountMap.get(req.expense_account_id) ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{req.purpose}</div>
                        <div className="text-muted-foreground">
                          Penerima: {req.recipient_name}{" "}
                          {req.recipient_bank_info
                            ? `(${req.recipient_bank_info})`
                            : ""}
                        </div>
                        {req.rejection_reason ? (
                          <div className="mt-1 text-destructive">
                            Alasan tolak: &ldquo;{req.rejection_reason}&rdquo;
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {reqAttachments.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {reqAttachments.map((att) => (
                              <button
                                key={att.id}
                                type="button"
                                className="inline-flex items-center gap-1 text-left text-primary hover:underline"
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
                                          `Lampiran contoh lokal: ${att.file_name} (unduhan nyata aktif setelah terhubung ke Supabase Storage).`,
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
                                <PaperclipIcon className="size-3.5 shrink-0" />
                                <span className="max-w-36 truncate">
                                  {att.file_name}
                                </span>
                                <span className="text-muted-foreground">
                                  ({Math.ceil(att.file_size_bytes / 1024)} KB)
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {formatRupiah(req.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                          {req.paid_date ? (
                            <span className="text-[11px] text-muted-foreground">
                              Cair: {formatDateID(req.paid_date)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "submitted" ? (
                          isSelfRequest ? (
                            <StatusBadge
                              tone="warning"
                              label="Pengajuan Sendiri (BR-4)"
                            />
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setAccountingDate(
                                    (req.submitted_at ?? req.created_at).slice(
                                      0,
                                      10,
                                    ),
                                  );
                                  setApproveTarget(req);
                                }}
                              >
                                <CheckCircle2Icon data-icon="inline-start" />
                                Setujui
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectTarget(req)}
                              >
                                <XCircleIcon data-icon="inline-start" />
                                Tolak
                              </Button>
                            </div>
                          )
                        ) : req.status === "approved" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPaidDate(
                                (req.decided_at ?? req.created_at).slice(0, 10),
                              );
                              setDisburseTarget(req);
                            }}
                          >
                            <BanknoteIcon data-icon="inline-start" />
                            Catat Pencairan
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Terkunci
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Setujui Pengajuan {approveTarget?.request_number}?
            </DialogTitle>
            <DialogDescription>
              Persetujuan ini bersifat 1-level dan langsung menerbitkan jurnal
              akrual beban otomatis (Debit Akun Beban / Kredit Utang Usaha)
              sebesar {formatRupiah(approveTarget?.amount ?? 0)}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmApprove}>
            <FieldGroup>
              {approveTarget?.budget_warning_acknowledged ? (
                <Alert>
                  <ShieldAlertIcon className="size-4" />
                  <AlertTitle>Pengajuan Melebihi Ambang Anggaran</AlertTitle>
                  <AlertDescription>
                    Pengaju telah mengonfirmasi peringatan serapan anggaran saat
                    mengirim pengajuan ini (FR-PO6).
                  </AlertDescription>
                </Alert>
              ) : null}
              <Field>
                <FieldLabel htmlFor="pa-acc-date">
                  Tanggal Pengakuan Beban Akrual
                </FieldLabel>
                <Input
                  id="pa-acc-date"
                  type="date"
                  required
                  value={accountingDate}
                  onChange={(e) => setAccountingDate(e.target.value)}
                />
                <FieldDescription>
                  Harus berada pada periode akuntansi yang berstatus Terbuka
                  (BR-3).
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
        reasonLabel="Alasan Penolakan (Wajib sesuai BR-5)"
        reasonPlaceholder="Contoh: Nominal pada faktur vendor belum sesuai dengan rincian PO..."
        confirmLabel="Tolak Pengajuan"
        onConfirm={async (reason) => {
          if (!rejectTarget || !reason) return;
          await decidePaymentRequest({
            requestId: rejectTarget.id,
            decision: "reject",
            rejectionReason: reason,
            accountingDate: "2026-11-07",
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Catat Realisasi Pembayaran {disburseTarget?.request_number}
            </DialogTitle>
            <DialogDescription>
              Setelah dana ditransfer secara manual dari rekening bank
              perusahaan, catat pencairan ini untuk memposting jurnal pelunasan
              (Debit Utang Usaha / Kredit Kas-Bank).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisburse}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pa-paid-date">
                  Tanggal Transfer / Pembayaran
                </FieldLabel>
                <Input
                  id="pa-paid-date"
                  type="date"
                  required
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Akun Sumber Kas / Bank Perusahaan</FieldLabel>
                <Select
                  value={sourceCashAccountId}
                  onValueChange={setSourceCashAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rekening kas/bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cashAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} — {acc.name}
                        </SelectItem>
                      ))}
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

