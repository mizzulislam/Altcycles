import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileTextIcon,
  HardDriveIcon,
  ImageIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  extractGoogleDriveFileId,
  getGoogleDriveDirectImageUrl,
  getGoogleDriveViewUrl,
  getSavedGoogleDriveFiles,
  type GoogleDriveFileItem,
} from "@/lib/google-drive";

export function GoogleDriveIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} fill="none">
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H6.6l-6.6 11.4c-.8 1.4-.8 3.05 0 4.45z"
        fill="#0066DA"
      />
      <path
        d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.9c-.8 1.4-.8 3.05 0 4.45l6.6 11.4 19.7-34.1 16.15-4.65z"
        fill="#00AC47"
      />
      <path
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.3c.8-1.4.8-3.05 0-4.45l-19.1-33-7.5 13-15.9 27.6 13.75 23.8 16.2-7.6z"
        fill="#EA4335"
      />
      <path
        d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2l13.75 23.8z"
        fill="#00832D"
      />
      <path
        d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53z"
        fill="#2684FC"
      />
      <path
        d="m73.4 26.5-10.5-18.2c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45l-9.85-17.05-4-9.45z"
        fill="#FFBA00"
      />
    </svg>
  );
}

export function GoogleGLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export interface GoogleDriveSelectResult {
  fileId: string;
  viewUrl: string;
  directImageUrl?: string;
  customName?: string;
}

export interface GoogleDrivePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "image" | "document";
  title?: string;
  description?: string;
  onSelect: (result: GoogleDriveSelectResult) => Promise<void> | void;
}

export function GoogleDrivePickerDialog({
  open,
  onOpenChange,
  mode = "image",
  title = mode === "image" ? "Pilih Foto dari Google Drive" : "Pilih Berkas dari Google Drive",
  description = "Tempelkan tautan berbagi (share link) berkas dari Google Drive Anda.",
  onSelect,
}: GoogleDrivePickerDialogProps) {
  const [urlInput, setUrlInput] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);
  const [previewError, setPreviewError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [driveItems, setDriveItems] = React.useState<GoogleDriveFileItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<GoogleDriveFileItem | null>(null);

  const fileId = extractGoogleDriveFileId(urlInput);
  const isValid = Boolean(fileId);
  const directImageUrl = fileId ? getGoogleDriveDirectImageUrl(fileId) : undefined;
  const viewUrl = fileId ? getGoogleDriveViewUrl(fileId) : undefined;

  React.useEffect(() => {
    if (open) {
      const items = getSavedGoogleDriveFiles(mode);
      setDriveItems(items);
      if (items.length > 0) {
        setSelectedItem(items[0] ?? null);
        setUrlInput(items[0]?.viewUrl ?? "");
        setFileName(items[0]?.name ?? "");
      } else {
        setUrlInput("");
        setFileName("");
      }
      setPreviewError(false);
      setSubmitting(false);
    }
  }, [open, mode]);

  React.useEffect(() => {
    if (fileId && mode === "image") {
      setIsValidating(true);
      setPreviewError(false);
      const img = new Image();
      img.src = getGoogleDriveDirectImageUrl(fileId);
      img.onload = () => {
        setIsValidating(false);
        setPreviewError(false);
      };
      img.onerror = () => {
        setIsValidating(false);
        setPreviewError(true);
      };
    }
  }, [fileId, mode]);

  async function handleConfirm() {
    if (!fileId || !viewUrl) return;
    setSubmitting(true);
    try {
      await onSelect({
        fileId,
        viewUrl,
        directImageUrl,
        customName: fileName.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // Error ditangani pemanggil
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-8 rounded-xl bg-muted/60 flex items-center justify-center p-1.5 border border-border/80">
              <GoogleDriveIcon className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Header Buka Tab Google Drive */}
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <GoogleDriveIcon className="size-5 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-foreground text-xs block truncate">
                  Google Drive Pengguna
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  Salin tautan berbagi berkas dari tab Google Drive Anda
                </span>
              </div>
            </div>
            <a
              href="https://drive.google.com/drive/u/0/my-drive"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-card border border-border/80 shadow-2xs"
            >
              <span>Buka My Drive</span>
              <ExternalLinkIcon className="size-3" />
            </a>
          </div>

          {/* Form Input Tautan Berbagi Google Drive */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Tautan Berbagi Berkas Google Drive</span>
            </label>
            <Input
              type="url"
              placeholder="Contoh: https://drive.google.com/file/d/1.../view?usp=sharing"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="text-xs h-9.5"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Di tab Google Drive: klik kanan berkas (cth: berkas PDF/Nota) &rarr; pilih <strong>Bagikan &gt; Salin Link</strong>, lalu tempelkan di atas.
            </p>
          </div>

          {/* Input Opsional Nama Berkas jika mode dokumen */}
          {mode === "document" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nama Lampiran / Dokumen
              </label>
              <Input
                type="text"
                placeholder="Contoh: Nota_Tagihan_Termin_1.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Berkas Tersimpan Sebelumnya (jika ada) */}
          {driveItems.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Berkas Google Drive yang Pernah Ditautkan ({driveItems.length})</span>
                <span className="text-[10px] text-muted-foreground">Klik untuk memilih</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-1 border border-border/70 rounded-xl bg-muted/20">
                {driveItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id || urlInput === item.viewUrl;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setUrlInput(item.viewUrl);
                        setFileName(item.name);
                      }}
                      className={`rounded-lg border p-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border/60 hover:border-primary/40 bg-card/60"
                      }`}
                    >
                      <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {mode === "image" && item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className="size-full object-cover rounded-md"
                          />
                        ) : (
                          <FileTextIcon className="size-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.sizeFormatted}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Tautan Tambahan (Opsional) */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Atau Tempelkan Tautan Berkas Lain</span>
            </label>
            <Input
              type="url"
              placeholder="Contoh: https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setSelectedItem(null);
              }}
              className="text-xs h-8.5"
            />
          </div>

          {/* Input Opsional Nama Berkas jika mode dokumen */}
          {mode === "document" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nama Lampiran / Dokumen (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Contoh: Nota_Tagihan_Termin_1.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Status Validasi & Pratinjau */}
          {isValid && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  <span>Tautan Google Drive Valid</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ID: {fileId?.slice(0, 8)}...{fileId?.slice(-6)}
                </span>
              </div>

              {/* Mode Gambar: Pratinjau Langsung */}
              {mode === "image" && directImageUrl && (
                <div className="relative size-32 mx-auto rounded-xl border border-border overflow-hidden bg-card flex items-center justify-center shadow-2xs">
                  {isValidating ? (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                      <Loader2Icon className="size-5 animate-spin text-primary" />
                      <span>Memuat pratinjau...</span>
                    </div>
                  ) : previewError ? (
                    <div className="flex flex-col items-center gap-1 text-amber-600 dark:text-amber-400 text-center p-2 text-[11px]">
                      <AlertCircleIcon className="size-5 shrink-0" />
                      <span>Pastikan izin berkas &apos;Anyone with the link&apos;.</span>
                    </div>
                  ) : (
                    <img
                      src={directImageUrl}
                      alt="Pratinjau Foto Google Drive"
                      className="size-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Mode Dokumen: Kartu Tautan Berkas */}
              {mode === "document" && (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border text-xs">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {fileName.trim() || `Dokumen_Drive_${fileId?.slice(0, 8)}`}
                    </p>
                    <a
                      href={viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-primary hover:underline truncate block"
                    >
                      Buka Pratinjau di Google Drive →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-2xl text-xs h-9"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || submitting || isValidating}
            className="rounded-2xl text-xs h-9 gap-2 shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                <span>Menerapkan...</span>
              </>
            ) : mode === "image" ? (
              <>
                <ImageIcon className="size-3.5" />
                <span>Gunakan Foto Drive</span>
              </>
            ) : (
              <>
                <HardDriveIcon className="size-3.5" />
                <span>Gunakan Berkas Drive</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

