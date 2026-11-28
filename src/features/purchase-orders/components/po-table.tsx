import * as React from "react";
import {
  BanIcon,
  CheckCircle2Icon,
  FileTextIcon,
  FilterIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionEditControls } from "@/features/client-projects/components/project-detail-shared";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
} from "@/components/shared/toolbar-button";
import { cn } from "@/lib/utils";
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
import { formatDateI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type {
  PoStatus,
  ProjectRow,
  PurchaseOrderRow,
  VendorRow,
} from "@/types/database.types";

export const PO_STATUS_META: Record<
  PoStatus,
  { label: string; tone: "secondary" | "info" | "success" | "destructive" }
> = {
  draft: { label: "Draf", tone: "secondary" },
  issued: { label: "Diterbitkan", tone: "info" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "destructive" },
};

export function getPoStatusMeta(
  status: PoStatus,
  t: (k: string, fb?: string) => string,
): { label: string; tone: "secondary" | "info" | "success" | "destructive" } {
  switch (status) {
    case "draft":
      return { label: t("po:status_draft", "Draf"), tone: "secondary" };
    case "issued":
      return { label: t("po:status_issued", "Diterbitkan"), tone: "info" };
    case "completed":
      return { label: t("po:status_completed", "Selesai"), tone: "success" };
    case "cancelled":
      return { label: t("po:status_cancelled", "Dibatalkan"), tone: "destructive" };
  }
}

interface PoTableProps {
  loading: boolean;
  sortedOrders: PurchaseOrderRow[];
  vendors: VendorRow[];
  projects: ProjectRow[];
  mode: "user" | "admin";
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sortField?: "date" | "number" | "vendor" | "amount";
  setSortField?: (val: "date" | "number" | "vendor" | "amount") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  selectedPoIds: string[];
  setSelectedPoIds: React.Dispatch<React.SetStateAction<string[]>>;
  onDeleteSelected: () => void;
  onOpenEditPo: (po: PurchaseOrderRow) => void;
  onOpenSingleDelete: (po: PurchaseOrderRow) => void;
  onDownloadPdf: (po: PurchaseOrderRow) => void;
  onDownloadWord: (po: PurchaseOrderRow) => void;
  onIssuePo: (po: PurchaseOrderRow) => void | Promise<void>;
  onCompletePo: (po: PurchaseOrderRow) => void | Promise<void>;
  onCancelPo: (po: PurchaseOrderRow) => void;
  onOpenCreate?: () => void;
  onExportExcel?: () => void | Promise<void>;
  onExportPdf?: () => void | Promise<void>;
  onExportCsv?: () => void | Promise<void>;
}

export function PoTable({
  loading,
  sortedOrders,
  vendors,
  projects,
  mode,
  statusFilter,
  setStatusFilter,
  sortField = "date",
  setSortField,
  sortOrder,
  setSortOrder,
  isEditing,
  setIsEditing,
  selectedPoIds,
  setSelectedPoIds,
  onDeleteSelected,
  onOpenEditPo,
  onOpenSingleDelete,
  onDownloadPdf,
  onDownloadWord,
  onIssuePo,
  onCompletePo,
  onCancelPo,
  onOpenCreate,
  onExportExcel,
  onExportPdf,
  onExportCsv,
}: PoTableProps) {
  const { t, language } = useLanguage();

  const draftOrders = React.useMemo(
    () => sortedOrders.filter((p) => p.status === "draft"),
    [sortedOrders],
  );

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("po:card_title", "Daftar Purchase Order Vendor")}
        description={t(
          "po:card_desc",
          "Pantau riwayat penerbitan PO internal dan status konfirmasi rekanan.",
        )}
        controls={
          <div className="flex items-center gap-2.5 shrink-0 justify-end w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              {statusFilter === "ALL" ? (
                <ActionTooltip content={t("po:status_all", "Semua Status")}>
                  <SelectTrigger
                    data-toolbar="true"
                    aria-label={t("po:status_all", "Semua Status")}
                    className={cn(TOOLBAR_BUTTON_CLASS, "[&>svg:last-child]:hidden [&>span]:hidden")}
                  >
                    <FilterIcon className="size-4 text-primary-foreground shrink-0" />
                  </SelectTrigger>
                </ActionTooltip>
              ) : (
                <SelectTrigger
                  data-toolbar="true"
                  aria-label={t("po:status_all", "Semua Status")}
                  className={cn(TOOLBAR_ACTIVE_EXPANDED_CLASS, "[&>svg:last-child]:hidden")}
                >
                  <FilterIcon className="size-3.5 text-primary-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
              )}
              <SelectContent align="end" className="w-[180px] min-w-[180px]">
                <SelectGroup>
                  <SelectItem value="ALL">
                    {t("po:status_all", "Semua Status")}
                  </SelectItem>
                  <SelectItem value="draft">
                    {t("po:status_draft", "Draf")}
                  </SelectItem>
                  <SelectItem value="issued">
                    {t("po:status_issued", "Diterbitkan")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("po:status_completed", "Selesai")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("po:status_cancelled", "Dibatalkan")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <TableSortMenu
              sortKey={sortField}
              sortOrder={sortOrder}
              options={[
                { value: "date", label: t("po:col_date", "Tanggal PO") },
                { value: "number", label: t("po:col_po_number", "Nomor PO") },
                { value: "vendor", label: t("po:col_vendor", "Vendor / Rekanan") },
                { value: "amount", label: t("po:col_total", "Total Nilai") },
              ]}
              onSortChange={(key, order) => {
                setSortField?.(key as "date" | "number" | "vendor" | "amount");
                setSortOrder(order);
              }}
              defaultSortKey="date"
              defaultSortOrder="asc"
            />

            <SectionEditControls
              hasItems={sortedOrders.length > 0}
              isEditing={isEditing}
              selectedCount={selectedPoIds.length}
              onStartEdit={() => setIsEditing(true)}
              onCancelEdit={() => {
                setIsEditing(false);
                setSelectedPoIds([]);
              }}
              onDeleteSelected={onDeleteSelected}
            />

            {mode === "admin" && onExportExcel && (
              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
                onExportExcel={onExportExcel}
                onExportPdf={onExportPdf}
                onExportCsv={onExportCsv}
                size="icon"
                mobileFloating
              />
            )}

            {onOpenCreate && (
              <ActionTooltip content={t("po:btn_create", "Buat PO Vendor")}>
                <Button
                  type="button"
                  onClick={onOpenCreate}
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={t("po:btn_create", "Buat PO Vendor")}
                >
                  <PlusIcon className="size-4 text-primary-foreground shrink-0" />
                  <span className="sr-only">{t("po:btn_create", "Buat PO Vendor")}</span>
                </Button>
              </ActionTooltip>
            )}
          </div>
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              {isEditing && (
                <TableHead className="w-12 text-center align-middle px-3">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        draftOrders.length > 0 &&
                        selectedPoIds.length === draftOrders.length
                      }
                      indeterminate={
                        selectedPoIds.length > 0 &&
                        selectedPoIds.length < draftOrders.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPoIds(draftOrders.map((p) => p.id));
                        } else {
                          setSelectedPoIds([]);
                        }
                      }}
                      aria-label="Pilih semua PO Draf"
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">
                {t("po:col_po_number", "Nomor PO")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("po:col_date", "Tanggal PO")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("po:col_vendor", "Vendor / Rekanan")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("po:col_project", "Proyek")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap w-44 max-sm:w-36">
                {t("po:col_total", "Total Nilai (IDR)")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("po:col_status", "Status")}
              </TableHead>
              <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap w-28 max-sm:w-20">
                {t("po:col_actions", "Aksi")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={isEditing ? 8 : 7}
                message={t("common:action.loading", "Memuat data...")}
              />
            ) : sortedOrders.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={isEditing ? 8 : 7} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <FileTextIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(
                        "po:empty_title",
                        "Belum ada dokumen Purchase Order yang dibuat.",
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      {t(
                        "po:empty_desc",
                        "Klik tombol Buat PO Vendor di kanan atas untuk membuat purchase order baru.",
                      )}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedOrders.map((po) => {
                const vnd = vendors.find((v) => v.id === po.vendor_id);
                const prj = projects.find((p) => p.id === po.project_id);
                const meta = getPoStatusMeta(po.status, t);
                return (
                  <TableRow key={po.id}>
                    {isEditing && (
                      <TableCell className="align-top text-center px-3 py-3.5">
                        <Checkbox
                          checked={selectedPoIds.includes(po.id)}
                          disabled={po.status !== "draft"}
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              setSelectedPoIds((prev) => [...prev, po.id]);
                            } else {
                              setSelectedPoIds((prev) =>
                                prev.filter((id) => id !== po.id),
                              );
                            }
                          }}
                          aria-label={`Pilih PO ${po.po_number}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="align-top pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3.5 max-sm:py-2.5 text-center font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                      {po.po_number}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                      {formatDateI18n(po.po_date, language)}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 font-medium text-xs sm:text-sm leading-5">
                      {vnd?.name ?? "-"}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-xs sm:text-sm leading-5">
                      {prj ? `${prj.code}: ${prj.name}` : "-"}
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <MonetaryCell amount={po.total_amount} />
                    </TableCell>
                    <TableCell className="align-top px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge tone={meta.tone} label={meta.label} />
                      </div>
                    </TableCell>
                    <TableCell className="align-top pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="flex justify-center items-center gap-1 -my-1.5">
                        {isEditing && po.status === "draft" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t("po:action_edit_po", "Edit PO")}
                            onClick={() => onOpenEditPo(po)}
                            className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <PencilIcon className="size-4" />
                            <span className="sr-only">
                              {t("po:action_edit_po", "Edit PO")}
                            </span>
                          </Button>
                        ) : null}
                        {isEditing && po.status === "draft" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t("po:action_delete_po", "Hapus PO")}
                            onClick={() => onOpenSingleDelete(po)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">
                              {t("po:action_delete_po", "Hapus PO")}
                            </span>
                          </Button>
                        ) : null}
                        <DocumentDownloadMenu
                          title={t(
                            "po:action_view_pdf",
                            "Lihat / Unduh Dokumen PO",
                          )}
                          onDownloadPdf={() => onDownloadPdf(po)}
                          onDownloadWord={() => onDownloadWord(po)}
                        />
                        {po.status === "draft" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t("po:status_issued", "Terbitkan PO")}
                            onClick={() => void onIssuePo(po)}
                            className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <SendIcon className="size-4" />
                            <span className="sr-only">
                              {t("po:status_issued", "Terbitkan PO")}
                            </span>
                          </Button>
                        ) : null}
                        {mode === "admin" && po.status === "issued" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t(
                              "po:action_mark_completed",
                              "Tandai Selesai",
                            )}
                            onClick={() => void onCompletePo(po)}
                            className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <CheckCircle2Icon className="size-4" />
                            <span className="sr-only">
                              {t(
                                "po:action_mark_completed",
                                "Tandai Selesai",
                              )}
                            </span>
                          </Button>
                        ) : null}
                        {po.status === "issued" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t("po:action_cancel_po", "Batalkan PO")}
                            onClick={() => onCancelPo(po)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <BanIcon className="size-4" />
                            <span className="sr-only">
                              {t("po:action_cancel_po", "Batalkan PO")}
                            </span>
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
