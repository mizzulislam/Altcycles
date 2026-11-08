import * as React from "react";
import { PaperclipIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { listAccounts, listProjects } from "@/lib/data-service";
import { formatDateID, formatRupiah } from "@/lib/formatters";
import {
  createAndSubmitPaymentRequest,
  getAttachmentSignedUrl,
  getProjectBudgetComparison,
  listPaymentRequests,
  listPurchaseOrders,
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

const PA_STATUS_META: Record<
  PaymentRequestStatus,
  { label: string; tone: "secondary" | "info" | "success" | "destructive" | "warning" }
> = {
  draft: { label: "Draf", tone: "secondary" },
  submitted: { label: "Diajukan (Menunggu Admin)", tone: "info" },
  approved: { label: "Disetujui (Menunggu Transfer)", tone: "warning" },
  rejected: { label: "Ditolak (Perlu Revisi)", tone: "destructive" },
  paid: { label: "Dibayar Lunas", tone: "success" },
};

export function UserPaymentsPage() {
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
  const [proofFile, setProofFile] = React.useState<File | null>(null);
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
      const expOnly = accs.filter(
        (a) => a.is_active && a.is_postable && a.account_type === "expense",
      );
      setExpenseAccounts(expOnly);
      setMyPos(poRes.orders.filter((o) => o.status === "issued"));
      if (!projectId && prjRes.projects[0]) setProjectId(prjRes.projects[0].id);
      if (!expenseAccountId && expOnly[0]) setExpenseAccountId(expOnly[0].id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat pengajuan pembayaran.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, expenseAccountId]);

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
    if (!proofFile) {
      toast.error("Wajib memilih berkas lampiran bukti tagihan/invoice (PDF/JPG/PNG).");
      return;
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran berkas bukti maksimal 5 MB.");
      return;
    }
    if (exceedsBudget && !ackWarning) {
      toast.error("Centang konfirmasi peringatan anggaran terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAndSubmitPaymentRequest({
        purpose,
        recipientName,
        recipientBankInfo,
        amount,
        projectId,
        expenseAccountId,
        poId: poId === "none" ? null : poId,
        proofFile: {
          name: proofFile.name,
          mimeType: proofFile.type || "application/pdf",
          sizeBytes: proofFile.size,
          blob: proofFile,
        },
        budgetWarningAcknowledged: ackWarning,
      });
      toast.success(
        `Pengajuan ${created.request_number} berhasil dikirim ke antrean Admin.`,
      );
      setCreateOpen(false);
      setPurpose("");
      setRecipientName("");
      setRecipientBankInfo("");
      setAmount(0);
      setProofFile(null);
      setAckWarning(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim pengajuan.");
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
        `Pengajuan ${reviseTarget.request_number} berhasil diajukan ulang.`,
      );
      setReviseTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan ulang.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pengajuan Pembayaran Saya (Payment Approval)
          </h1>
          <p className="text-sm text-muted-foreground">
            Persetujuan satu level oleh Admin dengan kewajiban melampirkan bukti
            tagihan (maks. 5 MB) dan pelacakan status waktu nyata.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Ajukan Pembayaran
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat &amp; Status Pengajuan</CardTitle>
          <CardDescription>
            Apabila pengajuan ditolak, alasan penolakan ditampilkan secara transparan dan dapat direvisi untuk diajukan kembali.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar pengajuan...</span>
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="Belum ada pengajuan pembayaran"
              description="Klik Ajukan Pembayaran untuk mengirim permohonan pembayaran tagihan proyek."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Keperluan &amp; Penerima</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Lampiran</TableHead>
                  <TableHead>Status &amp; Catatan Admin</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const prj = projects.find((p) => p.id === req.project_id);
                  const meta = PA_STATUS_META[req.status];
                  const files = attachments.filter((a) => a.entity_id === req.id);
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        <div>{req.request_number}</div>
                        {req.revision_no > 0 ? (
                          <div className="text-[11px] text-muted-foreground">
                            Revisi ke-{req.revision_no}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{req.purpose}</div>
                        <div className="text-xs text-muted-foreground">
                          Penerima: {req.recipient_name}{" "}
                          {req.recipient_bank_info
                            ? `(${req.recipient_bank_info})`
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {prj?.code ?? "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatRupiah(req.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {files.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className="flex items-center gap-1 text-left text-primary hover:underline"
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
                            <PaperclipIcon className="size-3 shrink-0" />
                            <span className="max-w-36 truncate">{f.file_name}</span>
                          </button>
                        ))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={meta.tone} label={meta.label} />
                        {req.status === "rejected" && req.rejection_reason ? (
                          <p className="mt-1 text-xs text-destructive">
                            Alasan tolak: {req.rejection_reason}
                          </p>
                        ) : null}
                        {req.status === "paid" && req.paid_date ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Dibayar: {formatDateID(req.paid_date)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "rejected" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviseTarget(req);
                              setRevPurpose(req.purpose);
                              setRevBank(req.recipient_bank_info ?? "");
                              setRevAmount(req.amount);
                            }}
                          >
                            <RotateCcwIcon data-icon="inline-start" />
                            Perbaiki &amp; Ajukan Ulang
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajukan Persetujuan Pembayaran</DialogTitle>
            <DialogDescription>
              Pengajuan akan langsung diteruskan ke Admin Keuangan untuk ditinjau.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pa-purpose">Keperluan Pembayaran</FieldLabel>
                <Input
                  id="pa-purpose"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Contoh: Pembayaran perpanjangan domain & SSL produksi"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-rec">Nama Penerima / Vendor</FieldLabel>
                  <Input
                    id="pa-rec"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pa-bank">Info Bank &amp; No. Rekening</FieldLabel>
                  <Input
                    id="pa-bank"
                    required
                    value={recipientBankInfo}
                    onChange={(e) => setRecipientBankInfo(e.target.value)}
                    placeholder="BCA 4371122334 a.n. CV Domain"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Proyek Terkait</FieldLabel>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code}: {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Pos Akun Beban</FieldLabel>
                  <Select
                    value={expenseAccountId}
                    onValueChange={setExpenseAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun beban" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {expenseAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code}: {a.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-amt">Nominal (Rp Bulat)</FieldLabel>
                  <Input
                    id="pa-amt"
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel>Tautkan PO Pembelian (Opsional)</FieldLabel>
                  <Select value={poId} onValueChange={setPoId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Tanpa Dokumen PO</SelectItem>
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
                  <AlertTitle>Peringatan Anggaran Akun Terlampaui</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      Nominal pengajuan ({formatRupiah(amount)}) melampaui sisa
                      anggaran akun ini ({formatRupiah(budgetRemaining ?? 0)}).
                    </span>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={ackWarning}
                        onChange={(e) => setAckWarning(e.target.checked)}
                      />
                      Saya mengonfirmasi pengajuan melebihi sisa anggaran.
                    </label>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="pa-file">
                  Lampiran Bukti Tagihan / Nota (Wajib, Maks. 5 MB)
                </FieldLabel>
                <Input
                  id="pa-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  required
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <FieldDescription>
                  Format berkas yang didukung: PDF, PNG, atau JPG.
                </FieldDescription>
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  Kirim Pengajuan
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Perbaiki &amp; Ajukan Ulang ({reviseTarget?.request_number})
            </DialogTitle>
            <DialogDescription>
              Catatan penolakan Admin: {reviseTarget?.rejection_reason}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="rev-purpose">Keperluan</FieldLabel>
                <Input
                  id="rev-purpose"
                  required
                  value={revPurpose}
                  onChange={(e) => setRevPurpose(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-bank">Info Bank &amp; Rekening</FieldLabel>
                <Input
                  id="rev-bank"
                  required
                  value={revBank}
                  onChange={(e) => setRevBank(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-amt">Nominal (Rp)</FieldLabel>
                <Input
                  id="rev-amt"
                  type="number"
                  min={1}
                  required
                  value={revAmount}
                  onChange={(e) => setRevAmount(Number(e.target.value))}
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviseTarget(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitting}>
                  Ajukan Ulang
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
