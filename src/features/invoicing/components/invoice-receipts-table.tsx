import * as React from "react";
import { ArrowUpDownIcon, ReceiptIcon } from "lucide-react";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { TOOLBAR_ACTIVE_EXPANDED_CLASS } from "@/components/shared/toolbar-button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  RowEditActionButtons,
  SectionEditControls,
  type ViewDetailState,
} from "@/features/client-projects/components/project-detail-shared";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { ProjectWorkspaceBundle } from "@/lib/operations-service";
import type { ReceiptRow } from "@/types/database.types";

export interface InvoiceReceiptsTableProps {
  sortedReceipts: ReceiptRow[];
  loading: boolean;
  bundle: ProjectWorkspaceBundle | null;
  isEditingReceipts: boolean;
  setIsEditingReceipts: (val: boolean) => void;
  selectedReceiptIds: string[];
  setSelectedReceiptIds: React.Dispatch<React.SetStateAction<string[]>>;
  receiptSortOrder: "asc" | "desc";
  setReceiptSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  onViewDetail: (state: ViewDetailState) => void;
  onEdit: (kw: ReceiptRow) => void;
  onDelete: (kw: ReceiptRow) => void;
  onDeleteSelected: () => void;
  onDownloadPdf: (kw: ReceiptRow) => void;
  onDownloadWord: (kw: ReceiptRow) => void;
}

export function InvoiceReceiptsTable({
  sortedReceipts,
  loading,
  bundle,
  isEditingReceipts,
  setIsEditingReceipts,
  selectedReceiptIds,
  setSelectedReceiptIds,
  receiptSortOrder,
  setReceiptSortOrder,
  onViewDetail,
  onEdit,
  onDelete,
  onDeleteSelected,
  onDownloadPdf,
  onDownloadWord,
}: InvoiceReceiptsTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="overflow-hidden">
      <CardHeaderWithInfo
        title={t("invoicing:receipts.card_title", "Daftar Kuitansi Resmi Penerimaan Dana")}
        description={t(
          "invoicing:receipts.card_desc",
          "Diterbitkan otomatis setiap kali pembayaran invoice klien dicatat dan diverifikasi di rekening bank.",
        )}
        headerClassName="px-6 py-4 border-b border-border/70 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        controls={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setReceiptSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className={TOOLBAR_ACTIVE_EXPANDED_CLASS}
            >
              <ArrowUpDownIcon className="size-3.5 text-primary-foreground shrink-0" />
              <span>
                {t("common:action.order", "Urutan")}:{" "}
                {receiptSortOrder === "asc"
                  ? t("common:sort.ascending", "Ascending (A-Z)")
                  : t("common:sort.descending", "Descending (Z-A)")}
              </span>
            </button>
            <SectionEditControls
              hasItems={sortedReceipts.length > 0}
              isEditing={isEditingReceipts}
              selectedCount={selectedReceiptIds.length}
              onStartEdit={() => setIsEditingReceipts(true)}
              onCancelEdit={() => {
                setIsEditingReceipts(false);
                setSelectedReceiptIds([]);
              }}
              onDeleteSelected={onDeleteSelected}
            />
          </div>
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              {isEditingReceipts && (
                <TableHead className="w-12 text-center align-middle px-3">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        sortedReceipts.length > 0 &&
                        selectedReceiptIds.length === sortedReceipts.length
                      }
                      indeterminate={
                        selectedReceiptIds.length > 0 &&
                        selectedReceiptIds.length < sortedReceipts.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedReceiptIds(sortedReceipts.map((r) => r.id));
                        } else {
                          setSelectedReceiptIds([]);
                        }
                      }}
                      aria-label={t("common:action.select_all", "Pilih Semua")}
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:receipts.col_receipt_no", "Nomor Kuitansi")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:receipts.col_payment_date", "Tanggal Terima")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:receipts.col_client", "Diterima Dari")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:receipts.col_amount", "Nominal Diterima")}
              </TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">
                {t("invoicing:receipts.col_actions", "Aksi")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={5 + (isEditingReceipts ? 1 : 0)}
                message={t("invoicing:loading_receipts", "Memuat daftar kuitansi...")}
              />
            ) : sortedReceipts.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5 + (isEditingReceipts ? 1 : 0)} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <ReceiptIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("invoicing:receipts.empty_title", "Belum Ada Kuitansi")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {t(
                        "invoicing:receipts.empty_desc",
                        "Kuitansi diterbitkan otomatis saat pembayaran invoice dicatat.",
                      )}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedReceipts.map((kw) => {
                const isChecked = selectedReceiptIds.includes(kw.id);
                const linkedInv = bundle?.invoices.find((i) => i.id === kw.invoice_id);
                return (
                  <TableRow key={kw.id}>
                    {isEditingReceipts && (
                      <TableCell className="align-top text-center px-3 py-3.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSelectedReceiptIds((prev) =>
                              checked
                                ? [...prev, kw.id]
                                : prev.filter((id) => id !== kw.id),
                            );
                          }}
                          className="mt-0.5"
                          aria-label={`Pilih ${kw.receipt_number}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                      {kw.receipt_number}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                      {formatDateI18n(kw.receipt_date, language)}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 font-medium text-xs sm:text-sm leading-5 text-foreground">
                      {kw.received_from}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 whitespace-nowrap">
                      <MonetaryCell amount={kw.amount} />
                    </TableCell>
                    <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                      {isEditingReceipts ? (
                        <RowEditActionButtons
                          onView={() =>
                            onViewDetail({
                              title: `${t("invoicing:action.view_detail", "Rincian")} ${kw.receipt_number}`,
                              subtitle: kw.received_from,
                              rows: [
                                {
                                  label: t("invoicing:receipts.col_receipt_no", "Nomor Kuitansi"),
                                  value: kw.receipt_number,
                                },
                                {
                                  label: t(
                                    "invoicing:receipts.col_payment_date",
                                    "Tanggal Terima",
                                  ),
                                  value: formatDateI18n(kw.receipt_date, language),
                                },
                                {
                                  label: t("invoicing:receipts.col_client", "Diterima Dari"),
                                  value: kw.received_from,
                                },
                                {
                                  label: t(
                                    "invoicing:receipts.col_invoice_ref",
                                    "Referensi Invoice",
                                  ),
                                  value: linkedInv?.invoice_number ?? "-",
                                },
                                {
                                  label: t("invoicing:receipts.col_amount", "Jumlah Diterima"),
                                  value: formatRupiah(kw.amount),
                                },
                              ],
                              onDownloadPdf: () => void onDownloadPdf(kw),
                              onDownloadWord: () => void onDownloadWord(kw),
                            })
                          }
                          onEdit={() => onEdit(kw)}
                          onDelete={() => onDelete(kw)}
                        />
                      ) : (
                        <div className="flex justify-center items-center -my-1.5">
                          <DocumentDownloadMenu
                            title={`${t("common:action.download", "Unduh")} ${t("invoicing:tabs.receipts", "Kuitansi")} (PDF / Word)`}
                            onDownloadPdf={() => onDownloadPdf(kw)}
                            onDownloadWord={() => onDownloadWord(kw)}
                          />
                        </div>
                      )}
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
