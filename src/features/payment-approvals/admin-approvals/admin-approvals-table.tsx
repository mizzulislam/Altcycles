import {
  BanknoteIcon,
  CheckCircle2Icon,
  FilterIcon,
  LockIcon,
  PaperclipIcon,
  ReceiptTextIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
} from "@/components/shared/toolbar-button";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { GoogleDriveIcon } from "@/components/shared/google-drive-picker-dialog";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateI18n, formatDateTimeI18n } from "@/lib/formatters";
import { getAttachmentSignedUrl } from "@/lib/operations-service";
import type {
  AttachmentRow,
  PaymentRequestRow,
  ProfileRow,
} from "@/types/database.types";
import { getPaStatusMeta } from "./admin-approvals-types";

export interface AdminApprovalsTableProps {
  loading: boolean;
  filteredRequests: PaymentRequestRow[];
  attachments: AttachmentRow[];
  profile: ProfileRow | null;
  profileMap: Map<string, string>;
  projectMap: Map<string, string>;
  accountMap: Map<string, string>;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortKey: "date" | "number" | "amount" | "requester";
  sortDirection: "asc" | "desc";
  onSortChange: (key: string, dir: "asc" | "desc") => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onDownloadPdf: (req: PaymentRequestRow) => void;
  onDownloadWord: (req: PaymentRequestRow) => void;
  onOpenApprove: (req: PaymentRequestRow) => void;
  onOpenReject: (req: PaymentRequestRow) => void;
  onOpenDisburse: (req: PaymentRequestRow) => void;
  t: (k: string, fb?: string | Record<string, unknown>) => string;
  language: "id" | "en";
}

export function AdminApprovalsTable({
  loading,
  filteredRequests,
  attachments,
  profile,
  profileMap,
  projectMap,
  accountMap,
  statusFilter,
  onStatusFilterChange,
  sortKey,
  sortDirection,
  onSortChange,
  onExportExcel,
  onExportPdf,
  onExportCsv,
  onDownloadPdf,
  onDownloadWord,
  onOpenApprove,
  onOpenReject,
  onOpenDisburse,
  t,
  language,
}: AdminApprovalsTableProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden max-sm:flex-1 max-sm:flex max-sm:flex-col">
      <CardHeaderWithInfo
        title={t("approvals:admin.card_title", "Daftar Pengajuan Pembayaran Tim")}
        description={t("approvals:admin.card_desc", "Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana.")}
        controls={
          <div className="flex items-center gap-2.5 shrink-0 justify-end w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              {statusFilter === "ALL" ? (
                <ActionTooltip content={t("approvals:admin.filter_status_placeholder", "Filter status")}>
                  <SelectTrigger
                    data-toolbar="true"
                    aria-label={t("approvals:admin.filter_status_placeholder", "Filter status")}
                    className={cn(TOOLBAR_BUTTON_CLASS, "[&>svg:last-child]:hidden [&>span]:hidden")}
                  >
                    <FilterIcon className="size-4 text-primary-foreground shrink-0" />
                  </SelectTrigger>
                </ActionTooltip>
              ) : (
                <SelectTrigger
                  data-toolbar="true"
                  aria-label={t("approvals:admin.filter_status_placeholder", "Filter status")}
                  className={cn(TOOLBAR_ACTIVE_EXPANDED_CLASS, "[&>svg:last-child]:hidden")}
                >
                  <FilterIcon className="size-3.5 text-primary-foreground shrink-0" />
                  <SelectValue placeholder={t("approvals:admin.filter_status_placeholder", "Filter status")} />
                </SelectTrigger>
              )}
              <SelectContent align="end" className="w-[200px] min-w-[200px]">
                <SelectGroup>
                  <SelectItem value="ALL">{t("approvals:admin.filter_all", "Semua Status")}</SelectItem>
                  <SelectItem value="submitted">{t("approvals:admin.filter_submitted", "Menunggu Persetujuan")}</SelectItem>
                  <SelectItem value="approved">{t("approvals:admin.filter_approved", "Disetujui (Siap Cair)")}</SelectItem>
                  <SelectItem value="paid">{t("approvals:admin.filter_paid", "Dibayar Lunas")}</SelectItem>
                  <SelectItem value="rejected">{t("approvals:admin.filter_rejected", "Ditolak")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <TableSortMenu
              options={[
                { key: "date", label: t("approvals:admin.col_number_date", "Tanggal & Nomor") },
                { key: "amount", label: t("approvals:admin.col_amount", "Nominal") },
                { key: "requester", label: t("approvals:modals.requester_name", "Pemohon") },
              ]}
              selectedKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              defaultKey="date"
              defaultDirection="asc"
            />
            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              onExportCsv={onExportCsv}
              size="icon"
              mobileFloating
            />
          </div>
        }
      />
      <CardContent className="p-0 max-sm:flex-1 max-sm:flex max-sm:flex-col">
        <Table wrapperClassName="max-sm:flex-1 max-sm:flex max-sm:flex-col" className="max-sm:flex-1 max-sm:h-full">
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">
                {t("approvals:admin.col_number_date", "Nomor & Tanggal")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("approvals:admin.col_requester_project", "Pemohon & Proyek")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("approvals:admin.col_purpose", "Keterangan Pengeluaran")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("approvals:modals.attachments", "Bukti Lampiran")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap w-40 max-sm:w-32">
                {t("approvals:admin.col_amount", "Nominal Pengajuan")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("approvals:admin.col_status", "Status")}
              </TableHead>
              <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap w-28 max-sm:w-20">
                {t("approvals:admin.col_actions", "Aksi")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(filteredRequests.length === 0 && "max-sm:h-full")}>
            {loading ? (
              <TableLoadingRow
                colSpan={7}
                message={t("common:action.loading", "Memuat data...")}
              />
            ) : filteredRequests.length === 0 ? (
              <TableRow className={cn("hover:bg-transparent", "max-sm:h-full")}>
                <TableCell colSpan={7} className="p-0 align-middle max-sm:h-full">
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-t border-dashed border-border/70 bg-muted/10 max-sm:h-full max-sm:flex-1 max-sm:min-h-0">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <ReceiptTextIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("approvals:admin.empty_title", "Tidak Ada Pengajuan Pembayaran")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      {t("approvals:admin.empty_desc", "Belum ada data pengajuan pembayaran dari tim pada kriteria filter ini.")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => {
                const reqAttachments = attachments.filter(
                  (a) => a.entity_id === req.id,
                );
                const isSelfRequest = req.requester_id === profile?.id;
                const meta = getPaStatusMeta(req.status, t as any);

                return (
                  <TableRow key={req.id}>
                    <TableCell className="align-top pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <div className="font-mono text-xs sm:text-sm leading-5 font-semibold text-foreground">
                        {req.request_number}
                        {req.revision_no > 0 ? ` (Rev.${req.revision_no})` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {formatDateTimeI18n(req.submitted_at ?? req.created_at, language)}
                      </div>
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                      <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {profileMap.get(req.requester_id) ?? t("common:role.team_member", "Anggota Tim")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {projectMap.get(req.project_id) ?? "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {accountMap.get(req.expense_account_id) ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                      <div className="text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {req.purpose}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {t("approvals:admin.recipient_label", { name: req.recipient_name, defaultValue: `Penerima: ${req.recipient_name}` })}{" "}
                        {req.recipient_bank_info
                          ? `(${req.recipient_bank_info})`
                          : ""}
                      </div>
                      {req.rejection_reason ? (
                        <div className="mt-1 text-xs text-destructive leading-snug">
                          {t("approvals:modals.admin_notes", "Catatan Admin")}: &ldquo;{req.rejection_reason}&rdquo;
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5">
                      {reqAttachments.length === 0 ? (
                        <span className="text-xs sm:text-sm leading-5 text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {reqAttachments.map((att) => {
                            const isGdrive =
                              att.storage_path.startsWith("http://") ||
                              att.storage_path.startsWith("https://") ||
                              att.file_name.toLowerCase().includes("gdrive") ||
                              att.file_name.toLowerCase().includes("drive");
                            return (
                              <Button
                                key={att.id}
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 inline-flex items-center gap-1.5 text-left text-xs sm:text-sm leading-5 text-primary hover:underline cursor-pointer"
                                onClick={() => {
                                  void getAttachmentSignedUrl(att.storage_path)
                                    .then((url) => {
                                      if (url) {
                                        window.open(
                                          url,
                                          "_blank",
                                          "noopener,noreferrer",
                                        );
                                      } else {
                                        toast.info(
                                          `Lampiran: ${att.file_name}`,
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
                                  <PaperclipIcon className="size-3.5 shrink-0" />
                                )}
                                <span className="max-w-36 truncate">
                                  {att.file_name}
                                </span>
                                {!isGdrive ? (
                                  <span className="text-xs text-muted-foreground">
                                    ({Math.ceil(att.file_size_bytes / 1024)} KB)
                                  </span>
                                ) : null}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <MonetaryCell amount={req.amount} />
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center gap-1 min-h-5 -my-px">
                        <StatusBadge tone={meta.tone} label={meta.label} />
                        {req.paid_date ? (
                          <span className="text-[11px] text-muted-foreground">
                            {formatDateI18n(req.paid_date, language)}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="flex justify-center items-center gap-1 -my-1.5">
                        <DocumentDownloadMenu
                          title={t("approvals:admin.btn_detail", "Unduh Form PA (PDF / Word)")}
                          onDownloadPdf={() => void onDownloadPdf(req)}
                          onDownloadWord={() => void onDownloadWord(req)}
                        />
                        {req.status === "submitted" ? (
                          isSelfRequest ? (
                            <div className="inline-flex items-center min-h-5 -my-px">
                              <StatusBadge
                                tone="warning"
                                label={t("common:role.own_submission", "Pengajuan Sendiri")}
                              />
                            </div>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title={t("approvals:admin.btn_approve", "Setujui Pengajuan")}
                                onClick={() => onOpenApprove(req)}
                                className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2Icon className="size-4" />
                                <span className="sr-only">{t("approvals:admin.action_approve_short", "Setujui")}</span>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title={t("approvals:admin.btn_reject", "Tolak Pengajuan")}
                                onClick={() => onOpenReject(req)}
                                className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <XCircleIcon className="size-4" />
                                <span className="sr-only">{t("approvals:admin.action_reject_short", "Tolak")}</span>
                              </Button>
                            </>
                          )
                        ) : req.status === "approved" ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title={t("approvals:admin.btn_disburse", "Catat Pencairan Dana")}
                            onClick={() => onOpenDisburse(req)}
                            className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <BanknoteIcon className="size-4" />
                            <span className="sr-only">{t("approvals:admin.action_disburse_short", "Cairkan")}</span>
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs leading-5 text-muted-foreground">
                            <LockIcon className="size-3.5" />
                            <span>{t("common:action.locked", "Terkunci")}</span>
                          </span>
                        )}
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
