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

const FRIENDLY_EXPENSE_CATEGORY_MAP: Record<
  string,
  { label: string; hint: string }
> = {
  "5-1101": {
    label: "Server, Cloud, & Domain",
    hint: "Hosting, VPS, domain, SSL, & infrastruktur proyek",
  },
  "5-1201": {
    label: "Jasa Tenaga Ahli / Freelancer",
    hint: "Honorarium tenaga lepas, spesialis, atau subkontraktor",
  },
  "5-1301": {
    label: "Lisensi, Plugin, & API Proyek",
    hint: "Plugin berbayar, API, font, atau aset lisensi khusus",
  },
  "5-1401": {
    label: "Bagi Hasil Proyek",
    hint: "Pembagian hasil laba proyek internal",
  },
  "6-1101": {
    label: "Langganan Tools & Aplikasi Tim",
    hint: "Figma, GitHub, AI tools, & perangkat produktivitas tim",
  },
  "6-1201": {
    label: "Internet, Listrik, & Utilitas",
    hint: "Tagihan internet, listrik, & kebutuhan rutin ruang kerja",
  },
  "6-1301": {
    label: "Administrasi & Kebutuhan Umum",
    hint: "ATK, materai, pengiriman dokumen, & biaya operasional",
  },
  "6-1401": {
    label: "Peralatan & Aset Kerja",
    hint: "Pengadaan atau penyusutan perangkat kerja",
  },
};

function getFriendlyExpenseCategory(acc: AccountRow): {
  label: string;
  hint: string;
} {
  const mapped = FRIENDLY_EXPENSE_CATEGORY_MAP[acc.code];
  if (mapped) return mapped;
  const cleanName = acc.name
    .replace(/^Beban\s+/i, "")
    .replace(/\s+Proyek$/i, "")
    .trim();
  return {
    label: cleanName || acc.name,
    hint: acc.description ?? "Pengeluaran operasional",
  };
}

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
        `Pengajuan ${created.request_number} berhasil dikirim ke antrean Admin.`,
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

  const pendingCount = requests.filter((r) => r.status === "submitted").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const totalPaidAmount = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Pengajuan Pembayaran Saya
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Ajukan permohonan dana operasional dan pantau status verifikasi secara transparan.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs"
          >
            <PlusIcon className="size-4" />
            <span>Ajukan Pembayaran</span>
          </Button>
        </div>
      </div>

      {/* Ringkasan KPI Pengajuan Pembayaran */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Menunggu Persetujuan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {pendingCount} Pengajuan
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pendingCount > 0
                ? "Sedang ditinjau oleh Admin / Bendahara"
                : "Tidak ada pengajuan menunggu tinjauan"}
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
              {approvedCount} Pengajuan
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {approvedCount > 0
                ? "Menunggu proses transfer kas/bank"
                : "Belum ada pencairan yang tertunda"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Total Sudah Dicairkan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalPaidAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Akumulasi pembayaran berstatus lunas
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2Icon className="size-5" />
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70">
          <CardTitle>Riwayat &amp; Status Pengajuan</CardTitle>
          <CardDescription>
            Apabila pengajuan ditolak, alasan penolakan ditampilkan secara transparan dan dapat direvisi untuk diajukan kembali.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar pengajuan...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Nomor</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Keperluan &amp; Penerima</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Proyek</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">Nominal</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Lampiran</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status &amp; Catatan Admin</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ReceiptTextIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Belum Ada Pengajuan Pembayaran
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          Klik tombol Ajukan Pembayaran di kanan atas untuk mengirim permohonan pembayaran tagihan proyek.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                  const prj = projects.find((p) => p.id === req.project_id);
                  const meta = PA_STATUS_META[req.status];
                  const files = attachments.filter((a) => a.entity_id === req.id);
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        <div>{req.request_number}</div>
                        {req.revision_no > 0 ? (
                          <div className="text-[11px] font-sans font-normal text-muted-foreground mt-0.5">
                            Revisi ke-{req.revision_no}
                          </div>
                        ) : null}
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
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {prj?.code ?? "-"}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={req.amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5">
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
                      <TableCell className="align-top px-3 py-3.5">
                        <div className="inline-flex flex-col items-start gap-1 min-h-5 -my-px">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                          {req.status === "rejected" && req.rejection_reason ? (
                            <p className="text-xs text-destructive leading-snug">
                              Alasan tolak: {req.rejection_reason}
                            </p>
                          ) : null}
                          {req.status === "paid" && req.paid_date ? (
                            <p className="text-xs text-muted-foreground leading-snug">
                              Dibayar: {formatDateID(req.paid_date)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {req.status === "rejected" ? (
                          <div className="flex justify-center items-center -my-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Perbaiki & Ajukan Ulang"
                              onClick={() => {
                                setReviseTarget(req);
                                setRevPurpose(req.purpose);
                                setRevBank(req.recipient_bank_info ?? "");
                                setRevAmount(req.amount);
                              }}
                              className="size-8 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <RotateCcwIcon className="size-4" />
                              <span className="sr-only">Perbaiki &amp; Ajukan Ulang</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm leading-5 text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajukan Persetujuan Pembayaran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="min-w-0">
            <FieldGroup className="gap-3.5">
              <Field>
                <FieldLabel htmlFor="pa-purpose" required>Keperluan Pembayaran</FieldLabel>
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
                  <FieldLabel htmlFor="pa-rec" required>Nama Penerima / Vendor</FieldLabel>
                  <Input
                    id="pa-rec"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pa-bank" required>Info Bank &amp; No. Rekening</FieldLabel>
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
                  <FieldLabel required>Proyek Terkait</FieldLabel>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Belum ada proyek ditugaskan
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
                  <FieldLabel required>Kategori Pengeluaran</FieldLabel>
                  <Select
                    value={expenseAccountId}
                    onValueChange={setExpenseAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori pengeluaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {expenseAccounts.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Belum ada kategori tersedia
                          </SelectItem>
                        ) : (
                          expenseAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getFriendlyExpenseCategory(a).label}
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
                        Contoh: {getFriendlyExpenseCategory(selectedAcc).hint}
                      </FieldDescription>
                    );
                  })()}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-amt" required>Nominal (Rp Bulat)</FieldLabel>
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
                        Saya mengonfirmasi pengajuan melebihi sisa anggaran.
                      </label>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel required>Lampiran Bukti Tagihan / Nota</FieldLabel>
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
                      Berkas Komputer
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
                      <span>Google Drive</span>
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
                      Format berkas yang didukung: PDF, PNG, atau JPG (maks. 5 MB).
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
                              Lihat di Google Drive ↗
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
                          Ganti
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
                        <span>Pilih / Tautkan Berkas dari Google Drive</span>
                      </Button>
                    )}
                    <FieldDescription>
                      Mendukung link nota, invoice, atau kuitansi pembayaran yang tersimpan di Google Drive.
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Perbaiki &amp; Ajukan Ulang ({reviseTarget?.request_number})
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResubmit}>
            <FieldGroup>
              {reviseTarget?.rejection_reason ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <span className="font-semibold block">Catatan Penolakan Admin:</span>
                  {reviseTarget.rejection_reason}
                </div>
              ) : null}
              <Field>
                <FieldLabel htmlFor="rev-purpose" required>Keperluan</FieldLabel>
                <Input
                  id="rev-purpose"
                  required
                  value={revPurpose}
                  onChange={(e) => setRevPurpose(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-bank" required>Info Bank &amp; Rekening</FieldLabel>
                <Input
                  id="rev-bank"
                  required
                  value={revBank}
                  onChange={(e) => setRevBank(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-amt" required>Nominal (Rp)</FieldLabel>
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
