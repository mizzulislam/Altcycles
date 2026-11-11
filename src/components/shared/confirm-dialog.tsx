import * as React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmText?: string;
  confirmTextLabel?: React.ReactNode;
  onConfirm: (reason?: string) => Promise<void> | void;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  destructive = false,
  requireReason = false,
  reasonLabel = "Alasan Tindakan",
  reasonPlaceholder = "Tuliskan alasan secara jelas (minimal 5 karakter)...",
  confirmText,
  confirmTextLabel,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = React.useState("");
  const [typedConfirm, setTypedConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setReason("");
      setTypedConfirm("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const isConfirmTextValid =
    !confirmText || typedConfirm.trim() === confirmText;

  async function handleConfirm() {
    if (!isConfirmTextValid) {
      setError(`Ketik "${confirmText}" persis seperti yang ditampilkan untuk mengonfirmasi.`);
      return;
    }
    if (requireReason && reason.trim().length < 5) {
      setError("Alasan wajib diisi minimal 5 karakter.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100%-2rem)] sm:max-w-lg p-6 gap-4">
        <AlertDialogHeader className="-mx-6 -mt-6 px-6 py-4 border-b border-border/70 dark:border-white/10">
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-left">
            {description}
          </AlertDialogDescription>

          {confirmText ? (
            <Field className="gap-2">
              <FieldLabel
                htmlFor="confirm-text-input"
                required
                className="flex flex-wrap items-center gap-1.5 text-xs font-medium leading-normal text-foreground/90"
              >
                {confirmTextLabel ?? (
                  <>
                    <span>Ketik</span>
                    <code className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-destructive">
                      {confirmText}
                    </code>
                    <span>untuk mengonfirmasi penghapusan</span>
                  </>
                )}
              </FieldLabel>
              <Input
                id="confirm-text-input"
                value={typedConfirm}
                onChange={(e) => {
                  setTypedConfirm(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isConfirmTextValid && !submitting) {
                    e.preventDefault();
                    void handleConfirm();
                  }
                }}
                placeholder={`Ketik ${confirmText}`}
                autoComplete="off"
                spellCheck={false}
                className="h-9 font-mono text-xs sm:text-sm tracking-wide"
              />
            </Field>
          ) : null}

          {requireReason ? (
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="confirm-reason" required>{reasonLabel}</FieldLabel>
              <Textarea
                id="confirm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                aria-invalid={Boolean(error)}
              />
              {error ? <FieldDescription>{error}</FieldDescription> : null}
            </Field>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
        </div>

        <AlertDialogFooter className="pt-4 border-t border-border/70 dark:border-white/10">
          <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={submitting || !isConfirmTextValid}
            onClick={handleConfirm}
          >
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

