import * as React from "react";
import { BanknoteIcon, FileTextIcon, FilterIcon, PlusIcon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
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
import {
  RowEditActionButtons,
  SectionEditControls,
  type ViewDetailState,
} from "@/features/client-projects/components/project-detail-shared";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { CustomerRow, ProjectRow, SalesInvoiceRow } from "@/types/database.types";
import { INVOICE_KIND_LABELS } from "./invoice-create-dialog";

export interface InvoicingTableProps {
  sortedInvoices: SalesInvoiceRow[];
  loading: boolean;
  projectMap: Map<string, ProjectRow>;
  customerMap: Map<string, CustomerRow>;
  invoiceStatusFilter: string;
  setInvoiceStatusFilter: (status: string) => void;
  isEditingInvoices: boolean;
  setIsEditingInvoices: (val: boolean) => void;
  selectedInvoiceIds: string[];
  setSelectedInvoiceIds: React.Dispatch<React.SetStateAction<string[]>>;
  invoiceSortField?: "date" | "due_date" | "number" | "amount";
  setInvoiceSortField?: (val: "date" | "due_date" | "number" | "amount") => void;
  invoiceSortOrder: "asc" | "desc";
  setInvoiceSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  onRecordPayment: (inv: SalesInvoiceRow) => void;
  onViewDetail: (state: ViewDetailState) => void;
  onEdit: (inv: SalesInvoiceRow) => void;
  onDelete: (inv: SalesInvoiceRow) => void;
  onDeleteSelected: () => void;
  onDownloadPdf: (inv: SalesInvoiceRow) => void;
  onDownloadWord: (inv: SalesInvoiceRow) => void;
  onCreateInvoice?: () => void;
  onExportExcel?: () => void | Promise<void>;
  onExportPdf?: () => void | Promise<void>;
  onExportCsv?: () => void | Promise<void>;
}

export function InvoicingTable({
  sortedInvoices,
  loading,
  projectMap,
  customerMap,
  invoiceStatusFilter,
  setInvoiceStatusFilter,
  isEditingInvoices,
  setIsEditingInvoices,
  selectedInvoiceIds,
  setSelectedInvoiceIds,
  invoiceSortField = "date",
  setInvoiceSortField,
  invoiceSortOrder,
  setInvoiceSortOrder,
  onRecordPayment,
  onViewDetail,
  onEdit,
  onDelete,
  onDeleteSelected,
  onDownloadPdf,
  onDownloadWord,
  onCreateInvoice,
  onExportExcel,
  onExportPdf,
  onExportCsv,
}: InvoicingTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="overflow-hidden">
      <CardHeaderWithInfo
        title={t("invoicing:table.invoice_list_title", "Daftar Invoice Klien")}
        description={t(
          "invoicing:table.invoice_list_desc",
          "Klik ikon catat bayar pada baris invoice ketika dana klien masuk ke rekening bank perusahaan untuk menerbitkan kuitansi otomatis.",
        )}
        headerClassName="px-6 py-4 border-b border-border/70 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        controls={
          <div className="flex items-center gap-2.5 shrink-0 justify-end w-full sm:w-auto">
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              {invoiceStatusFilter === "all" ? (
                <ActionTooltip content={t("common:status.all", "Semua Status")}>
                  <SelectTrigger
                    aria-label={t("common:status.all", "Semua Status")}
                    className="size-9 min-w-9 p-0 rounded-xl justify-center cursor-pointer shrink-0 border-border/80 bg-card text-foreground shadow-2xs hover:bg-muted/70 hover:border-primary/40 [&>svg:last-child]:hidden [&>span]:hidden"
                  >
                    <FilterIcon className="size-4 text-primary shrink-0" />
                  </SelectTrigger>
                </ActionTooltip>
              ) : (
                <SelectTrigger
                  aria-label={t("common:status.all", "Semua Status")}
                  className="h-9 w-auto max-w-[200px] rounded-xl px-3 text-xs sm:text-sm font-semibold cursor-pointer shrink-0 gap-2 border-primary/40 bg-primary/10 text-primary shadow-2xs"
                >
                  <FilterIcon className="size-3.5 shrink-0" />
                  <SelectValue placeholder={t("common:status.all", "Semua Status")} />
                </SelectTrigger>
              )}
              <SelectContent align="end" className="w-[180px] min-w-[180px]">
                <SelectGroup>
                  <SelectItem value="all">{t("common:status.all", "Semua Status")}</SelectItem>
                  <SelectItem value="unpaid">{t("invoicing:status.unpaid", "Belum Lunas")}</SelectItem>
                  <SelectItem value="partial">{t("invoicing:status.partial", "Sebagian Terbayar")}</SelectItem>
                  <SelectItem value="paid">{t("invoicing:status.paid", "Lunas")}</SelectItem>
                  <SelectItem value="overdue">{t("invoicing:status.overdue", "Jatuh Tempo")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <TableSortMenu
              sortKey={invoiceSortField}
              sortOrder={invoiceSortOrder}
              options={[
                { value: "date", label: t("invoicing:col.date", "Tanggal Invoice") },
                { value: "due_date", label: t("invoicing:col.due_date", "Jatuh Tempo") },
                { value: "number", label: t("invoicing:col.number", "Nomor Tagihan") },
                { value: "amount", label: t("invoicing:col.amount", "Total Tagihan") },
              ]}
              onSortChange={(key, order) => {
                setInvoiceSortField?.(key as "date" | "due_date" | "number" | "amount");
                setInvoiceSortOrder(order);
              }}
              defaultSortKey="date"
              defaultSortOrder="desc"
            />

            <SectionEditControls
              hasItems={sortedInvoices.length > 0}
              isEditing={isEditingInvoices}
              selectedCount={selectedInvoiceIds.length}
              onStartEdit={() => setIsEditingInvoices(true)}
              onCancelEdit={() => {
                setIsEditingInvoices(false);
                setSelectedInvoiceIds([]);
              }}
              onDeleteSelected={onDeleteSelected}
            />

            {onExportExcel && (
              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
                onExportExcel={onExportExcel}
                onExportPdf={onExportPdf}
                onExportCsv={onExportCsv}
                size="icon"
                mobileFloating
              />
            )}

            {onCreateInvoice && (
              <ActionTooltip content={t("invoicing.issue_invoice", "Terbitkan Invoice")}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onCreateInvoice}
                  className="size-9 rounded-xl shrink-0 cursor-pointer border-border/80 bg-card text-foreground shadow-2xs hover:bg-muted/70 hover:border-primary/40"
                  aria-label={t("invoicing.issue_invoice", "Terbitkan Invoice")}
                >
                  <PlusIcon className="size-4 text-primary" />
                  <span className="sr-only">{t("invoicing.issue_invoice", "Terbitkan Invoice")}</span>
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
              {isEditingInvoices && (
                <TableHead className="w-12 text-center align-middle px-3">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        sortedInvoices.length > 0 &&
                        selectedInvoiceIds.length === sortedInvoices.length
                      }
                      indeterminate={
                        selectedInvoiceIds.length > 0 &&
                        selectedInvoiceIds.length < sortedInvoices.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedInvoiceIds(sortedInvoices.map((i) => i.id));
                        } else {
                          setSelectedInvoiceIds([]);
                        }
                      }}
                      aria-label={t("common:action.select_all", "Pilih Semua")}
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_invoice_no", "Nomor Invoice")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_date_due", "Tanggal & Jatuh Tempo")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_project_client", "Proyek & Klien")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_total_billing", "Total Tagihan")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_paid", "Terbayar")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_status", "Status")}
              </TableHead>
              <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap w-28 max-sm:w-20">
                {t("invoicing:table.col_actions", "Aksi")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={7 + (isEditingInvoices ? 1 : 0)}
                message={t("invoicing:loading_invoices", "Memuat daftar invoice...")}
              />
            ) : sortedInvoices.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7 + (isEditingInvoices ? 1 : 0)} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <FileTextIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("invoicing:table.empty_invoices_title", "Belum Ada Invoice Diterbitkan")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {t(
                        "invoicing:table.empty_invoices_desc",
                        "Terbitkan invoice penjualan proyek klien pertama dengan mengklik tombol + Terbitkan Invoice di atas.",
                      )}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedInvoices.map((inv) => {
                const prj = projectMap.get(inv.project_id);
                const cust = customerMap.get(inv.customer_id);
                const remaining = inv.total_amount - inv.paid_amount;
                const isChecked = selectedInvoiceIds.includes(inv.id);
                const statusLabel = t(
                  `invoicing:status.${inv.payment_status}`,
                  inv.payment_status === "paid"
                    ? "Lunas"
                    : inv.payment_status === "partial"
                      ? "Sebagian Terbayar"
                      : "Belum Lunas",
                );

                return (
                  <TableRow key={inv.id}>
                    {isEditingInvoices && (
                      <TableCell className="align-top text-center px-3 py-3.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSelectedInvoiceIds((prev) =>
                              checked
                                ? [...prev, inv.id]
                                : prev.filter((id) => id !== inv.id),
                            );
                          }}
                          className="mt-0.5"
                          aria-label={`Pilih ${inv.invoice_number}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                      <div className="text-foreground">
                        {t("invoicing:table.issued_date", {
                          date: formatDateI18n(inv.invoice_date, language),
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t("invoicing:table.due_date", {
                          date: formatDateI18n(inv.due_date, language),
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-xs sm:text-sm leading-5">
                      <div className="font-medium text-foreground">
                        {prj ? `${prj.code} — ${prj.name}` : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {cust?.name ?? t("common:nav.parties", "Klien")}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <MonetaryCell amount={inv.total_amount} />
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <MonetaryCell amount={inv.paid_amount} className="font-normal" />
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone={
                            inv.payment_status === "paid"
                              ? "success"
                              : inv.payment_status === "partial"
                                ? "warning"
                                : "info"
                          }
                          label={statusLabel}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      {isEditingInvoices ? (
                        <RowEditActionButtons
                          onView={() =>
                            onViewDetail({
                              title: `${t("invoicing:action.view_detail", "Rincian")} ${inv.invoice_number}`,
                              subtitle: prj ? `${prj.code} — ${prj.name}` : cust?.name ?? "-",
                              rows: [
                                {
                                  label: t("invoicing:table.col_invoice_no", "Nomor Invoice"),
                                  value: inv.invoice_number,
                                },
                                {
                                  label: t(
                                    "invoicing:modal_create.field_invoice_date",
                                    "Tanggal Invoice",
                                  ),
                                  value: formatDateI18n(inv.invoice_date, language),
                                },
                                {
                                  label: t(
                                    "invoicing:modal_create.field_due_date",
                                    "Tanggal Jatuh Tempo",
                                  ),
                                  value: formatDateI18n(inv.due_date, language),
                                },
                                {
                                  label: t("invoicing:modal_create.field_project", "Klien"),
                                  value: cust?.company_name ?? cust?.name ?? "-",
                                },
                                {
                                  label: t(
                                    "invoicing:modal_create.field_billing_type",
                                    "Jenis Tagihan",
                                  ),
                                  value: t(
                                    `invoicing:invoice_kind.${inv.invoice_kind}`,
                                    INVOICE_KIND_LABELS[inv.invoice_kind] ?? inv.invoice_kind,
                                  ),
                                },
                                { label: "Subtotal", value: formatRupiah(inv.subtotal_amount) },
                                { label: "PPN", value: formatRupiah(inv.ppn_amount) },
                                {
                                  label: t(
                                    "invoicing:table.col_total_billing",
                                    "Total Tagihan",
                                  ),
                                  value: formatRupiah(inv.total_amount),
                                },
                                {
                                  label: t("invoicing:table.col_paid", "Terbayar"),
                                  value: formatRupiah(inv.paid_amount),
                                },
                                {
                                  label: t("invoicing:table.col_status", "Status"),
                                  value: statusLabel,
                                },
                                {
                                  label: t("invoicing:modal_create.field_notes", "Catatan"),
                                  value: inv.notes ?? "-",
                                },
                              ],
                              onDownloadPdf: () => void onDownloadPdf(inv),
                              onDownloadWord: () => void onDownloadWord(inv),
                            })
                          }
                          onEdit={() => onEdit(inv)}
                          onDelete={() => onDelete(inv)}
                        />
                      ) : (
                        <div className="flex justify-center items-center gap-1 -my-1.5">
                          {remaining > 0 ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={t("invoicing:action.record_payment", "Catat Bukti Bayar")}
                              onClick={() => onRecordPayment(inv)}
                              className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              <BanknoteIcon className="size-4" />
                              <span className="sr-only">
                                {t("invoicing:action.record_payment", "Catat Bukti Bayar")}
                              </span>
                            </Button>
                          ) : null}
                          <DocumentDownloadMenu
                            title={`${t("common:action.download", "Unduh")} Invoice (PDF / Word)`}
                            onDownloadPdf={() => onDownloadPdf(inv)}
                            onDownloadWord={() => onDownloadWord(inv)}
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
