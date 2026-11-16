import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import type { ViewDetailState } from "../components/project-detail-shared";

interface ViewDetailDialogProps {
  viewModal: ViewDetailState | null;
  onClose: () => void;
}

export function ViewDetailDialog({ viewModal, onClose }: ViewDetailDialogProps) {
  return (
    <Dialog
      open={Boolean(viewModal)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{viewModal?.title ?? "Rincian Data"}</DialogTitle>
        </DialogHeader>
        {viewModal ? (
          <div className="space-y-4">
            {viewModal.subtitle ? (
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                {viewModal.subtitle}
              </p>
            ) : null}
            <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/15">
              {viewModal.rows.map((r, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {r.label}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground sm:text-right break-words">
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Tutup
              </Button>
              {viewModal.onDownloadPdf && viewModal.onDownloadWord ? (
                <DocumentDownloadMenu
                  variant="button"
                  label="Unduh / Ekspor"
                  title={`Unduh ${viewModal.title} (PDF / Word)`}
                  onDownloadPdf={viewModal.onDownloadPdf}
                  onDownloadWord={viewModal.onDownloadWord}
                />
              ) : viewModal.onDownloadPdf ? (
                <Button
                  type="button"
                  onClick={viewModal.onDownloadPdf}
                  className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer gap-2"
                >
                  <DownloadIcon className="size-4" />
                  <span>PDF Dokumen (.pdf)</span>
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
