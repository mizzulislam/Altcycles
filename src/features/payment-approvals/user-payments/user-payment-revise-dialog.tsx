import * as React from "react";
import { toast } from "sonner";
import { ModalFooterAction } from "@/components/patterns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { resubmitRejectedPaymentRequest } from "@/lib/operations-service";
import type { PaymentRequestRow } from "@/types/database.types";

export interface UserPaymentReviseDialogProps {
  target: PaymentRequestRow | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export function UserPaymentReviseDialog({
  target,
  onClose,
  onSuccess,
  t,
}: UserPaymentReviseDialogProps) {
  const [purpose, setPurpose] = React.useState("");
  const [bank, setBank] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (target) {
      setPurpose(target.purpose);
      setBank(target.recipient_bank_info ?? "");
      setAmount(target.amount);
    }
  }, [target]);

  async function handleResubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    try {
      await resubmitRejectedPaymentRequest({
        requestId: target.id,
        purpose,
        recipientBankInfo: bank,
        amount,
      });
      toast.success(
        t("approvals:resubmit_success", {
          number: target.request_number,
          defaultValue: `Pengajuan ${target.request_number} berhasil diajukan ulang.`,
        }),
      );
      onClose();
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("approvals:submit_error", { defaultValue: "Gagal mengajukan ulang." }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("approvals:modals.revise_title", { number: target?.request_number ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleResubmit}>
          <FieldGroup>
            {target?.rejection_reason ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold block">{t("approvals:modals.revise_admin_note")}</span>
                {target.rejection_reason}
              </div>
            ) : null}
            <Field>
              <FieldLabel htmlFor="rev-purpose" required>{t("approvals:modals.purpose")}</FieldLabel>
              <Input
                id="rev-purpose"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rev-bank" required>{t("approvals:modals.field_bank_info")}</FieldLabel>
              <Input
                id="rev-bank"
                required
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rev-amt" required>{t("approvals:modals.field_amount")}</FieldLabel>
              <NumberInput
                id="rev-amt"
                allowDecimal={false}
                min={1}
                required
                value={amount}
                onValueChange={setAmount}
              />
            </Field>
            <ModalFooterAction
              onCancel={onClose}
              saving={submitting}
              cancelLabel={t("approvals:modals.btn_cancel")}
              submitLabel={t("approvals:modals.revise_btn")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
