import * as React from "react";
import { ArrowUpDownIcon, BanknoteIcon, FileTextIcon } from "lucide-react";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import type { CustomerRow, ProjectRow, SalesInvoiceRow } from "@/types/database.types";
import { INVOICE_KIND_LABELS } from "./invoice-create-dialog";

export interface InvoicingTableProps {
  sortedInvoices: SalesInvoiceRow[];
  loading: boolean;
  projectMap: Map<string, ProjectRow>;
  customerMap: Map<string, CustomerRow>;
  isEditingInvoices: boolean;
  setIsEditingInvoices: (val: boolean) => void;
  selectedInvoiceIds: string[];
  setSelectedInvoiceIds: React.Dispatch<React.SetStateAction<string[]>>;
  invoiceSortOrder: "asc" | "desc";
  setInvoiceSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  onRecordPayment: (inv: SalesInvoiceRow) => void;
  onViewDetail: (state: ViewDetailState) => void;
  onEdit: (inv: SalesInvoiceRow) => void;
  onDelete: (inv: SalesInvoiceRow) => void;
  onDeleteSelected: () => void;
  onDownloadPdf: (inv: SalesInvoiceRow) => void;
  onDownloadWord: (inv: SalesInvoiceRow) => void;
}

export function InvoicingTable({
  sortedInvoices,
  loading,
  projectMap,
  customerMap,
  isEditingInvoices,
  setIsEditingInvoices,
  selectedInvoiceIds,
  setSelectedInvoiceIds,
  invoiceSortOrder,
  setInvoiceSortOrder,
  onRecordPayment,
  onViewDetail,
  onEdit,
  onDelete,
  onDeleteSelected,
  onDownloadPdf,
  onDownloadWord,
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
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setInvoiceSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="h-9 gap-1.5 rounded-xl text-xs font-medium cursor-pointer shrink-0"
            >
              <ArrowUpDownIcon className="size-3.5" />
              <span>
                {t("common:action.order", "Urutan")}:{" "}
                {invoiceSortOrder === "asc"
                  ? t("common:action.oldest", "Terlama")
                  : t("common:action.newest", "Terbaru")}
              </span>
            </Button>
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
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_invoice_no", "Nomor Invoice")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_date_due", "Tanggal & Jatuh Tempo")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_project_client", "Proyek & Klien")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_total_billing", "Total Tagihan")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_paid", "Terbayar")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_status", "Status")}
              </TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">
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
                    <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
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
                    <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5">
                      <div className="font-medium text-foreground">
                        {prj ? `${prj.code} — ${prj.name}` : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {cust?.name ?? t("common:nav.parties", "Klien")}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3.5 whitespace-nowrap">
                      <MonetaryCell amount={inv.total_amount} />
                    </TableCell>
                    <TableCell className="px-3 py-3.5 whitespace-nowrap">
                      <MonetaryCell amount={inv.paid_amount} className="font-normal" />
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
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
                    <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
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
