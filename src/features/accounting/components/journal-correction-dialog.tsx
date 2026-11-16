import * as React from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Buat Jurnal Koreksi atas {correctTarget?.journal_number}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="corr-date" required>
                Tanggal Jurnal Koreksi
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
                Alasan Koreksi (Minimal 5 Karakter)
              </FieldLabel>
              <Textarea
                id="corr-reason"
                required
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Contoh: Koreksi salah pilih akun beban pada pencatatan sebelumnya..."
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Batal
              </Button>
              <Button type="submit" disabled={correcting}>
                {correcting ? <Spinner data-icon="inline-start" /> : null}
                Posting Jurnal Koreksi
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
