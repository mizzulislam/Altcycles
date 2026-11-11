import * as React from "react";
import { Loader2Icon, PencilIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import { toast } from "sonner";
import { AvatarUploadDialog } from "@/components/shared/avatar-upload-dialog";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { FieldLabel } from "@/components/ui/field";
import { fileToOptimizedDataUrl } from "@/lib/asset-utils";
import { cn } from "@/lib/utils";

export interface ImageAssetUploadBoxProps {
  label: string;
  helperText?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  value?: string | null;
  onChange: (nextDataUrl: string | null) => void;
  maxWidth?: number;
  maxHeight?: number;
  containImage?: boolean;
  required?: boolean;
  previewHeightClassName?: string;
  className?: string;
}

export function ImageAssetUploadBox({
  label,
  helperText,
  emptyTitle = "Upload Gambar",
  emptySubtitle = "Lokal atau Google Drive (PNG/JPG/WebP)",
  value,
  onChange,
  maxWidth = 640,
  maxHeight = 320,
  containImage = true,
  required = false,
  previewHeightClassName = "h-[96px]",
  className,
}: ImageAssetUploadBoxProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);

  async function handleSelectLocalFile(file: File) {
    setProcessing(true);
    try {
      const optimized = await fileToOptimizedDataUrl(file, {
        maxWidth,
        maxHeight,
      });
      onChange(optimized);
      toast.success(`${label} berhasil diperbarui.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memproses gambar.",
      );
      throw err;
    } finally {
      setProcessing(false);
    }
  }

  async function handleSelectGoogleDriveUrl(driveDirectUrl: string) {
    setProcessing(true);
    try {
      onChange(driveDirectUrl);
      toast.success(`${label} dari Google Drive berhasil diterapkan.`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <FieldLabel required={required} className="text-xs font-semibold">
          {label}
        </FieldLabel>
        {helperText ? (
          <span className="text-[10px] text-muted-foreground truncate">
            {helperText}
          </span>
        ) : null}
      </div>

      {value ? (
        <div
          className={cn(
            "group relative w-full rounded-2xl overflow-hidden border border-border/80 shadow-xs flex items-center justify-center p-2",
            previewHeightClassName,
            containImage ? "bg-white dark:bg-slate-100" : "bg-muted",
          )}
        >
          <img
            src={value}
            alt={label}
            className={cn(
              "max-h-full max-w-full transition-transform duration-300 group-hover:scale-105",
              containImage ? "object-contain" : "size-full object-cover",
            )}
          />

          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
            <ActionTooltip content={`Ganti ${label} (Lokal / Google Drive)`} side="top">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                disabled={processing}
                aria-label={`Ganti ${label}`}
                className="size-9 rounded-xl bg-white/20 hover:bg-white/35 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <PencilIcon className="size-4" />
              </button>
            </ActionTooltip>

            <ActionTooltip content={`Hapus ${label}`} side="top">
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={processing}
                aria-label={`Hapus ${label}`}
                className="size-9 rounded-xl bg-destructive/80 hover:bg-destructive text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <Trash2Icon className="size-4" />
              </button>
            </ActionTooltip>
          </div>

          {processing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10">
              <Loader2Icon className="size-6 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={processing}
          className={cn(
            "group relative w-full rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 dark:border-border/60 dark:hover:border-primary/50 bg-card/60 hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            previewHeightClassName,
          )}
        >
          <div className="size-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            {processing ? (
              <Loader2Icon className="size-4.5 animate-spin" />
            ) : (
              <UploadCloudIcon className="size-4.5" />
            )}
          </div>
          <p className="text-xs font-semibold text-foreground">{emptyTitle}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
            {emptySubtitle}
          </p>
        </button>
      )}

      <AvatarUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentAvatarUrl={value}
        onSelectLocalFile={handleSelectLocalFile}
        onSelectGoogleDriveUrl={handleSelectGoogleDriveUrl}
        isProcessing={processing}
        dialogTitle={`Pilih ${label}`}
        maxSizeMb={3}
        containPreview={containImage}
      />
    </div>
  );
}
