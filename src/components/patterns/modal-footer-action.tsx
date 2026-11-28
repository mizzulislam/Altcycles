import * as React from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface ModalFooterActionProps {
  onCancel: () => void;
  onSubmit?: () => void;
  saving?: boolean;
  disabled?: boolean;
  cancelLabel?: string;
  submitLabel?: string;
  destructive?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
  submitType?: "button" | "submit";
  showSubmit?: boolean;
  showCancel?: boolean;
}

/**
 * Komponen pola standar footer aksi modal dialog Altcycles.
 * Menyediakan tombol Batal dan Simpan/Kirim yang sejajar secara proporsional,
 * lengkap dengan status loading terintegrasi dan dukungan responsive layout.
 */
export function ModalFooterAction({
  onCancel,
  onSubmit,
  saving = false,
  disabled = false,
  cancelLabel,
  submitLabel,
  destructive = false,
  extraActions,
  className,
  submitType = "submit",
  showSubmit = true,
  showCancel = true,
}: ModalFooterActionProps) {
  const { t } = useLanguage();

  const finalCancelLabel = cancelLabel ?? t("common:action.cancel", "Batal");
  const finalSubmitLabel =
    submitLabel ?? (destructive ? t("common:action.delete", "Hapus") : t("common:action.save", "Simpan Perubahan"));

  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full pt-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 empty:hidden">
        {extraActions}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 w-full sm:w-auto">
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="w-full sm:w-auto cursor-pointer"
          >
            {finalCancelLabel}
          </Button>
        )}

        {showSubmit && (
          <Button
            type={submitType}
            variant={destructive ? "destructive" : "default"}
            onClick={submitType === "button" ? onSubmit : undefined}
            loading={saving}
            disabled={disabled || saving}
            className="w-full sm:w-auto cursor-pointer"
          >
            {finalSubmitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
