import * as React from "react";
import { ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ModalFooterAction } from "@/components/patterns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatRupiah } from "@/lib/formatters";
import {
  decidePaymentRequest,
  recordPaymentDisbursement,
} from "@/lib/operations-service";
import type {
  AccountRow,
  PaymentRequestRow,
} from "@/types/database.types";

export interface AdminApprovalDialogsProps {
  approveTarget: PaymentRequestRow | null;
  rejectTarget: PaymentRequestRow | null;
  disburseTarget: PaymentRequestRow | null;
  cashAccounts: AccountRow[];
  onCloseApprove: () => void;
  onCloseReject: () => void;
  onCloseDisburse: () => void;
  onSuccess: () => Promise<void>;
  t: (k: string, fb?: string | Record<string, unknown>) => string;
}

export function AdminApprovalDialogs({
  approveTarget,
  rejectTarget,
  disburseTarget,
  cashAccounts,
  onCloseApprove,
  onCloseReject,
  onCloseDisburse,
  onSuccess,
  t,
}: AdminApprovalDialogsProps) {
  // State for Approve dialog
  const [accountingDate, setAccountingDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [approving, setApproving] = React.useState(false);

  React.useEffect(() => {
    if (approveTarget) {
      setAccountingDate(
        (approveTarget.submitted_at ?? approveTarget.created_at).slice(0, 10),
      );
    }
  }, [approveTarget]);

  // State for Disburse dialog
  const [paidDate, setPaidDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [sourceCashAccountId, setSourceCashAccountId] = React.useState("");
  const [disbursing, setDisbursing] = React.useState(false);

  React.useEffect(() => {
    if (disburseTarget) {
      setPaidDate((disburseTarget.decided_at ?? disburseTarget.created_at).slice(0, 10));
    }
  }, [disburseTarget]);

  React.useEffect(() => {
    if (!sourceCashAccountId && cashAccounts[0]) {
      setSourceCashAccountId(cashAccounts[0].id);
    }
  }, [cashAccounts, sourceCashAccountId]);

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
      onCloseApprove();
      await onSuccess();
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
      onCloseDisburse();
      await onSuccess();
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

  return (
    <>
      {/* Dialog Konfirmasi Setujui & Posting Jurnal Akrual Beban */}
      <Dialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) onCloseApprove();
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
              <ModalFooterAction
                onCancel={onCloseApprove}
                saving={approving}
                cancelLabel={t("approvals:modals.btn_cancel", "Batal")}
                submitLabel={t("approvals:modals.btn_approve_confirm", "Setujui & Posting Akrual")}
              />
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Penolakan dengan Alasan Wajib (BR-5) */}
      <ConfirmActionDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) onCloseReject();
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
          await onSuccess();
        }}
      />

      {/* Dialog Pencatatan Realisasi Pencairan Kas/Bank */}
      <Dialog
        open={Boolean(disburseTarget)}
        onOpenChange={(open) => {
          if (!open) onCloseDisburse();
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
              <ModalFooterAction
                onCancel={onCloseDisburse}
                saving={disbursing}
                cancelLabel={t("approvals:modals.btn_cancel", "Batal")}
                submitLabel={t("approvals:modals.btn_disburse_confirm", "Simpan Pencairan & Posting Jurnal")}
              />
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
