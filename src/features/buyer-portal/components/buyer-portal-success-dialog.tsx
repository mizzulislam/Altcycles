import { CheckIcon, CopyIcon } from "lucide-react";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { SubmittedPoDialogState } from "./buyer-portal-types";

interface BuyerPortalSuccessDialogProps {
  modal: SubmittedPoDialogState | null;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onDownloadPdf: () => void;
  onDownloadWord: () => void;
}

export function BuyerPortalSuccessDialog({
  modal,
  copied,
  onCopy,
  onClose,
  onDownloadPdf,
  onDownloadWord,
}: BuyerPortalSuccessDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog
      open={modal !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("projects:buyer_portal.modal_success_title")}</DialogTitle>
        </DialogHeader>

        {modal ? (
          <div className="flex flex-col gap-4">
            {/* Kartu Kode / Nomor PO */}
            <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col justify-between min-h-11 py-0.5 min-w-0">
                <p className="text-xs font-medium text-muted-foreground leading-none">
                  {t("projects:buyer_portal.modal_po_number_label")}
                </p>
                <p className="text-lg sm:text-xl font-bold font-mono tracking-wide leading-none text-primary dark:text-sky-400 select-all break-all mt-1.5">
                  {modal.poNumber}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                title={copied ? t("projects:buyer_portal.modal_copied_po") : t("projects:buyer_portal.modal_copy_po")}
                className="size-11 rounded-xl border-primary/25 bg-background/80 text-primary dark:text-sky-400 hover:bg-primary/15 shrink-0"
                onClick={onCopy}
              >
                {copied ? (
                  <CheckIcon className="size-5" />
                ) : (
                  <CopyIcon className="size-5" />
                )}
                <span className="sr-only">{t("projects:buyer_portal.modal_copy_po")}</span>
              </Button>
            </div>

            {/* Ringkasan Pekerjaan / Layanan / Barang yang Dipesan */}
            <div className="rounded-2xl border border-border/80 bg-muted/15 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/70 bg-muted/20 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-foreground shrink-0">
                  {t("projects:buyer_portal.modal_order_details")}
                </span>
                <span className="text-muted-foreground truncate text-right">
                  {modal.clientName}
                  {modal.clientCompany
                    ? t("projects:buyer_portal.modal_from", { company: modal.clientCompany })
                    : ""}
                </span>
              </div>
              <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
                {modal.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2 text-xs"
                  >
                    <span className="font-medium text-muted-foreground tabular-nums">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0 pr-4 sm:pr-6">
                      <p className="font-medium text-foreground break-words">
                        {it.item}
                      </p>
                      <p className="text-muted-foreground mt-0.5 tabular-nums">
                        {it.qty.toLocaleString("id-ID")} &times;{" "}
                        {formatRupiah(it.price)}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground tabular-nums text-right whitespace-nowrap">
                      {formatRupiah(Math.round(it.qty * it.price))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("projects:buyer_portal.modal_total_label")}
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatRupiah(modal.totalAmount)}
                </span>
              </div>
            </div>

            {/* Instruksi Penyimpanan Kode PO & Reset Formulir */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] text-foreground/90 leading-relaxed">
              {t("projects:buyer_portal.modal_save_instruction")}
            </div>
          </div>
        ) : null}

        <ModalFooterAction
          className="pt-2"
          extraActions={
            <DocumentDownloadMenu
              variant="button"
              label={t("projects:buyer_portal.modal_btn_export")}
              title={t("projects:buyer_portal.modal_btn_export_title")}
              onDownloadPdf={onDownloadPdf}
              onDownloadWord={onDownloadWord}
            />
          }
          onCancel={onClose}
          cancelLabel={t("projects:buyer_portal.modal_btn_close")}
          showSubmit={false}
        />
      </DialogContent>
    </Dialog>
  );
}
