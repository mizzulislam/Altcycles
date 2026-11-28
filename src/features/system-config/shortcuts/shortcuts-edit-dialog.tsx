import * as React from "react";
import {
  AlertTriangleIcon,
  CheckIcon,
  KeyboardIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatShortcutDisplay, type NavigationShortcutItem, type ShortcutGroup } from "@/lib/navigation-shortcuts-registry";
import type { UserRole } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { getRoleBadgeClass } from "./shortcuts-types";

export interface ShortcutsEditDialogProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editingItem: NavigationShortcutItem | null;
  recordedKeys: string[];
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingError: string | null;
  setRecordingError: (err: string | null) => void;
  setRecordedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  recordInputRef: React.RefObject<HTMLDivElement | null>;
  conflictResult: {
    hasConflict: boolean;
    conflictingItem?: NavigationShortcutItem;
  };
  onRecordKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onApplyPreset: (type: "sequence" | "modifier", char: string) => void;
  onSaveEdit: () => void;
  isMac: boolean;
  roleLabels: Record<UserRole, string>;
  groupLabels: Record<ShortcutGroup, string>;
}

export function ShortcutsEditDialog({
  editOpen,
  setEditOpen,
  editingItem,
  recordedKeys,
  isRecording,
  setIsRecording,
  recordingError,
  setRecordingError,
  setRecordedKeys,
  recordInputRef,
  conflictResult,
  onRecordKeyDown,
  onApplyPreset,
  onSaveEdit,
  isMac,
  roleLabels,
  groupLabels,
}: ShortcutsEditDialogProps) {
  const { t, language } = useLanguage();

  return (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("shortcuts.edit_title", "Ubah Pintasan Keyboard")}
          </DialogTitle>
        </DialogHeader>

        {editingItem && (
          <div className="flex flex-col gap-4 py-1">
            {/* Target Action Info */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/70 flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {t(editingItem.moduleLabelKey, editingItem.fallbackModuleLabel)} • {groupLabels[editingItem.group]}
              </span>
              <p className="font-bold text-foreground text-base tracking-tight">
                {t(editingItem.titleKey, editingItem.fallbackTitle)}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Peran:</span>
                {editingItem.allowedRoles.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-md font-medium border",
                      getRoleBadgeClass(r),
                    )}
                  >
                    {roleLabels[r] || r}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Interactive Key Recorder Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                {t("shortcuts.new_shortcut", "Kombinasi Tombol Baru")}
              </label>

              <div
                ref={recordInputRef}
                tabIndex={0}
                role="button"
                aria-label="Area Perekaman Tombol"
                onFocus={() => setIsRecording(true)}
                onBlur={() => setIsRecording(false)}
                onKeyDown={onRecordKeyDown}
                onClick={() => setIsRecording(true)}
                className={cn(
                  "flex flex-col items-center justify-center min-h-[110px] p-4 rounded-xl border-2 transition-all cursor-pointer select-none text-center outline-hidden",
                  isRecording
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-border/80 bg-background hover:bg-muted/30 hover:border-border",
                )}
              >
                {isRecording ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-xs font-semibold text-primary">
                      {t("shortcuts.recording_active", "Merekam tombol... Tekan tombol kombinasi sekarang")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {recordedKeys.length === 1 && recordedKeys[0]?.toLowerCase() === "g"
                        ? "G telah ditekan. Tekan huruf kedua (misal: D, P, S)..."
                        : "Tekan tombol keyboard atau Esc untuk batal"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <KeyboardIcon className="size-5 text-muted-foreground/70" />
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      {recordedKeys.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {t("shortcuts.recording_prompt", "Klik di sini lalu tekan kombinasi tombol di keyboard...")}
                        </span>
                      ) : (
                        (() => {
                          const disp = formatShortcutDisplay(recordedKeys, isMac, language);
                          return disp.parts.map((p, i) => (
                            <React.Fragment key={i}>
                              {disp.isSequence && i === 1 && (
                                <span className="text-xs text-muted-foreground font-medium px-1">
                                  {disp.sequenceThenText}
                                </span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-lg bg-card border border-border font-mono text-sm font-bold text-foreground shadow-xs">
                                {p}
                              </kbd>
                            </React.Fragment>
                          ));
                        })()
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Klik area untuk merekam ulang
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Sequence / Modifier Presets */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Pilihan Cepat (Format Standar):
              </span>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["D", "P", "S", "K", "A", "M"].map((ch) => (
                    <Button
                      key={ch}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-xl px-2.5 font-mono cursor-pointer"
                      onClick={() => onApplyPreset("sequence", ch)}
                    >
                      G lalu {ch}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-xl px-2.5 text-muted-foreground hover:text-foreground font-mono cursor-pointer"
                  onClick={() => {
                    setRecordedKeys([...editingItem.defaultKeys]);
                    setRecordingError(null);
                  }}
                >
                  Bawaan: {editingItem.defaultKeys.join("+")}
                </Button>
              </div>
            </div>

            {/* Validation & Conflict Warnings */}
            {recordingError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                <span>{recordingError}</span>
              </div>
            )}

            {conflictResult.hasConflict && conflictResult.conflictingItem && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {t("shortcuts.conflict_warning", "Konflik tombol terdeteksi dengan")}:{" "}
                    {t(conflictResult.conflictingItem.titleKey, conflictResult.conflictingItem.fallbackTitle)}
                  </span>
                  <span className="text-destructive/90 text-[11px]">
                    {t(
                      "shortcuts.conflict_warning_desc",
                      "Pintasan ini bentrok dengan aksi lain yang memiliki peran akses yang sama. Harap gunakan kombinasi tombol lain.",
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditOpen(false)}
            className="rounded-xl h-9 px-4 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            {t("common:action.cancel", "Batal")}
          </Button>
          <Button
            type="button"
            onClick={onSaveEdit}
            disabled={
              recordedKeys.length === 0 ||
              conflictResult.hasConflict ||
              Boolean(recordingError)
            }
            className="rounded-xl h-9 px-4 text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer"
          >
            <CheckIcon className="size-4" />
            <span>{t("shortcuts.save_shortcut", "Simpan Perubahan")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
