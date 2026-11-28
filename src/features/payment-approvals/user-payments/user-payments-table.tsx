import {
  GoogleDriveIcon,
} from "@/components/shared/google-drive-picker-dialog";
import {
  PaperclipIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { formatDateI18n } from "@/lib/formatters";
import { getAttachmentSignedUrl } from "@/lib/operations-service";
import type {
  AttachmentRow,
  PaymentRequestRow,
  ProjectRow,
} from "@/types/database.types";
import { getPaUserStatusMeta } from "./user-payments-types";

export interface UserPaymentsTableProps {
  loading: boolean;
  requests: PaymentRequestRow[];
  attachments: AttachmentRow[];
  projects: ProjectRow[];
  onOpenCreate: () => void;
  onSelectRevise: (req: PaymentRequestRow) => void;
  onDownloadPdf: (req: PaymentRequestRow) => void;
  onDownloadWord: (req: PaymentRequestRow) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  language: "id" | "en";
}

export function UserPaymentsTable({
  loading,
  requests,
  attachments,
  projects,
  onOpenCreate,
  onSelectRevise,
  onDownloadPdf,
  onDownloadWord,
  onExportExcel,
  onExportPdf,
  onExportCsv,
  t,
  language,
}: UserPaymentsTableProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("approvals:user.card_title")}
        description={t("approvals:user.card_desc")}
        controls={
          <div className="flex items-center gap-2.5 shrink-0 justify-end">
            <ExportDownloadMenu
              label={t("common:action.export_download")}
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              onExportCsv={onExportCsv}
              size="icon"
              mobileFloating
            />
            <ActionTooltip content={t("approvals:user.btn_create")}>
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={onOpenCreate}
                className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                aria-label={t("approvals:user.btn_create")}
              >
                <PlusIcon className="size-4" />
                <span className="sr-only">{t("approvals:user.btn_create")}</span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_number")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_purpose_recipient")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_project")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap w-40 max-sm:w-32">{t("approvals:user.col_amount")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_attachments")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("approvals:user.col_status_notes")}</TableHead>
              <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap w-28 max-sm:w-20">{t("approvals:user.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={7}
                message={t("approvals:user.loading")}
              />
            ) : requests.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <ReceiptTextIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("approvals:user.empty_title")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      {t("approvals:user.empty_desc")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => {
                const prj = projects.find((p) => p.id === req.project_id);
                const meta = getPaUserStatusMeta(req.status, t as (k: string) => string);
                const files = attachments.filter((a) => a.entity_id === req.id);
                return (
                  <TableRow key={req.id}>
                    <TableCell className="align-top pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3.5 max-sm:py-2.5 font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                      <div>{req.request_number}</div>
                      {req.revision_no > 0 ? (
                        <div className="text-[11px] font-sans font-normal text-muted-foreground mt-0.5">
                          {t("approvals:user.revision_label", { count: req.revision_no })}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                      <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {req.purpose}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {t("approvals:user.recipient_label", { name: req.recipient_name })}{" "}
                        {req.recipient_bank_info
                          ? `(${req.recipient_bank_info})`
                          : ""}
                      </div>
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                      {prj?.code ?? "-"}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <MonetaryCell amount={req.amount} />
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                      {files.length === 0 ? (
                        <span className="text-xs sm:text-sm leading-5 text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {files.map((f) => {
                            const isGdrive = f.storage_path.includes("drive.google.com");
                            return (
                              <Button
                                key={f.id}
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 flex items-center gap-1.5 text-left text-xs sm:text-sm leading-5 text-primary hover:underline cursor-pointer"
                                onClick={() => {
                                  void getAttachmentSignedUrl(f.storage_path)
                                    .then((url) => {
                                      if (url) {
                                        window.open(url, "_blank", "noopener,noreferrer");
                                      } else {
                                        toast.info(
                                          `Lampiran contoh lokal: ${f.file_name} (unduhan nyata aktif setelah terhubung ke Supabase Storage).`,
                                        );
                                      }
                                    })
                                    .catch((err: unknown) =>
                                      toast.error(
                                        err instanceof Error
                                          ? err.message
                                          : "Gagal membuka lampiran.",
                                      ),
                                    );
                                }}
                              >
                                {isGdrive ? (
                                  <GoogleDriveIcon className="size-3.5 shrink-0" />
                                ) : (
                                  <PaperclipIcon className="size-3 shrink-0" />
                                )}
                                <span className="max-w-36 truncate">{f.file_name}</span>
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                      <div className="inline-flex flex-col items-start gap-1 min-h-5 -my-px">
                        <StatusBadge tone={meta.tone} label={meta.label} />
                        {req.status === "rejected" && req.rejection_reason ? (
                          <p className="text-xs text-destructive leading-snug">
                            {t("approvals:user.rejected_reason_prefix", { reason: req.rejection_reason })}
                          </p>
                        ) : null}
                        {req.status === "paid" && req.paid_date ? (
                          <p className="text-xs text-muted-foreground leading-snug">
                            {t("approvals:user.paid_date_prefix", { date: formatDateI18n(req.paid_date, language) })}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 -my-1.5">
                        <DocumentDownloadMenu
                          title={t("approvals:user.download_form_menu_title")}
                          onDownloadPdf={() => onDownloadPdf(req)}
                          onDownloadWord={() => onDownloadWord(req)}
                        />
                        {req.status === "rejected" ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title={t("approvals:user.btn_revise_tooltip")}
                            onClick={() => onSelectRevise(req)}
                            className="size-8 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                          >
                            <RotateCcwIcon className="size-4" />
                            <span className="sr-only">{t("approvals:user.btn_revise_tooltip")}</span>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
