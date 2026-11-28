import * as React from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import type { JournalRow } from "@/types/database.types";

interface JournalCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correctTarget: JournalRow | null;
  correctionDate: string;
  setCorrectionDate: (val: string) => void;
  correctionReason: string;
  setCorrectionReason: (val: string) => void;
  correcting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function JournalCorrectionDialog({
  open,
  onOpenChange,
  correctTarget,
  correctionDate,
  setCorrectionDate,
  correctionReason,
  setCorrectionReason,
  correcting,
  onSubmit,
  onCancel,
}: JournalCorrectionDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("accounting:dialogs.correction_title", "Buat Jurnal Koreksi atas")} {correctTarget?.journal_number}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="corr-date" required>
                {t("accounting:dialogs.correction_date", "Tanggal Jurnal Koreksi")}
              </FieldLabel>
              <DatePicker
                id="corr-date"
                value={correctionDate}
                onChange={setCorrectionDate}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="corr-reason" required>
                {t("accounting:dialogs.correction_reason", "Alasan Koreksi (Minimal 5 Karakter)")}
              </FieldLabel>
              <Textarea
                id="corr-reason"
                required
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder={t("accounting:dialogs.correction_reason_placeholder", "Contoh: Koreksi salah pilih akun beban pada pencatatan sebelumnya...")}
              />
            </Field>
            <ModalFooterAction
              onCancel={onCancel}
              saving={correcting}
              disabled={correcting}
              cancelLabel={t("common:action.cancel", "Batal")}
              submitLabel={t("accounting:dialogs.btn_post_correction", "Posting Jurnal Koreksi")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
