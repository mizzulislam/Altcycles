import { ClockIcon } from "lucide-react";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useLanguage } from "@/lib/i18n";
import type { ArAgingItem } from "@/lib/accounting-engine";

export interface InvoiceAgingTableProps {
  arAgingRows: ArAgingItem[];
  loading: boolean;
  agingRefDate: string;
  setAgingRefDate: (date: string) => void;
}

export function InvoiceAgingTable({
  arAgingRows,
  loading,
  agingRefDate,
  setAgingRefDate,
}: InvoiceAgingTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="overflow-visible">
      <CardHeaderWithInfo
        title={t(
          "invoicing:aging.card_title",
          "Tabel Distribusi Umur Piutang Usaha (AR Aging Schedule)",
        )}
        description={t(
          "invoicing:aging.card_desc",
          "Klasifikasi piutang klien berdasarkan keterlambatan jatuh tempo untuk mitigasi arus kas dan penagihan berkala.",
        )}
        controls={
          <div className="flex items-center gap-2">
            <DatePicker
              iconOnly
              placeholder={t("invoicing:action.filter_aging", "Tanggal Acuan Perhitungan")}
              value={agingRefDate}
              onChange={setAgingRefDate}
            />
          </div>
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_invoice_no", "No. Invoice")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:table.col_project_client", "Pelanggan & Proyek")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:modal_create.field_due_date", "Jatuh Tempo")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:aging.col_total", "Sisa Tagihan")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("invoicing:aging.overdue", "Keterlambatan")}
              </TableHead>
              <TableHead className="pl-3 pr-6 text-center font-semibold whitespace-nowrap">
                {t("invoicing:aging.col_aging_bucket", "Kelompok Umur")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={6}
                message={t("invoicing:loading_aging", "Memuat analisis umur piutang...")}
              />
            ) : arAgingRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <ClockIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("invoicing:aging.empty_title", "Tidak Ada Piutang Belum Tertagih")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {t(
                        "invoicing:aging.empty_desc",
                        "Seluruh invoice proyek klien yang diterbitkan telah lunas tertagih.",
                      )}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              arAgingRows.map((row) => (
                <TableRow key={row.invoiceId}>
                  <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                    {row.invoiceNumber}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5">
                    <div className="font-medium text-foreground">{row.customerName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.projectCode}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                    {formatDateI18n(row.dueDate, language)}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 whitespace-nowrap">
                    <MonetaryCell amount={row.outstandingAmount} />
                  </TableCell>
                  <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                    {row.daysOverdue} {t("common:time.days", "Hari")}
                  </TableCell>
                  <TableCell className="pl-3 pr-6 py-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center min-h-5 -my-px">
                      <StatusBadge
                        tone={
                          row.daysOverdue > 30
                            ? "destructive"
                            : row.daysOverdue >= 1
                              ? "warning"
                              : "success"
                        }
                        label={
                          row.agingBucket === "Belum Jatuh Tempo"
                            ? t("invoicing:aging.col_current", "Belum Jatuh Tempo")
                            : row.agingBucket === "1–30 Hari"
                              ? t("invoicing:aging.col_1_30", "1–30 Hari")
                              : row.agingBucket === "31–60 Hari"
                                ? t("invoicing:aging.col_31_60", "31–60 Hari")
                                : t("invoicing:aging.col_gt_60", "> 60 Hari")
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
