import {
  LockIcon,
  LockOpenIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { formatDateI18n, formatDateTimeI18n } from "@/lib/formatters";
import { getLocalizedPeriodName } from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import type { PeriodRow } from "@/types/database.types";

export interface PeriodListTableProps {
  periods: PeriodRow[];
  loading: boolean;
  onClosePeriod: (p: PeriodRow) => void;
  onReopenPeriod: (p: PeriodRow) => void;
  onDeletePeriod: (p: PeriodRow) => void;
  onOpenCreatePeriod?: () => void;
}

export function PeriodListTable({
  periods,
  loading,
  onClosePeriod,
  onReopenPeriod,
  onDeletePeriod,
  onOpenCreatePeriod,
}: PeriodListTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("accounting:coa.card_periods_title", "Daftar Periode Bulanan")}
        description={t("accounting:coa.card_periods_desc", "Status terbuka mengizinkan pencatatan dan posting jurnal transaksi pada bulan bersangkutan.")}
        controls={
          onOpenCreatePeriod ? (
            <ActionTooltip content={t("accounting:coa.btn_open_period", "Buka Periode Baru")}>
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={onOpenCreatePeriod}
                className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                aria-label={t("accounting:coa.btn_open_period", "Buka Periode Baru")}
              >
                <PlusIcon className="size-4" />
                <span className="sr-only">{t("accounting:coa.btn_open_period", "Buka Periode Baru")}</span>
              </Button>
            </ActionTooltip>
          ) : undefined
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center font-semibold text-xs sm:text-sm">
                {t("accounting:coa.col_period", "Periode")}
              </TableHead>
              <TableHead className="text-center font-semibold text-xs sm:text-sm">
                {t("accounting:coa.col_date_range", "Rentang Tanggal")}
              </TableHead>
              <TableHead className="text-center font-semibold text-xs sm:text-sm">
                {t("accounting:coa.col_status", "Status")}
              </TableHead>
              <TableHead className="text-center font-semibold text-xs sm:text-sm">
                {t("accounting:coa.col_history", "Riwayat Tutup / Buka Kembali")}
              </TableHead>
              <TableHead className="text-center font-semibold text-xs sm:text-sm">
                {t("accounting:coa.col_actions", "Aksi")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={5}
                message={t("accounting:closing.loading", "Memuat daftar periode akuntansi...")}
              />
            ) : periods.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <p className="text-sm font-semibold text-foreground">
                      {t("accounting:closing.empty_title", "Belum Ada Periode Pembukuan")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {t("accounting:closing.empty_desc", "Buka periode bulanan baru untuk memulai pencatatan jurnal dan proses tutup buku.")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              periods.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-xs sm:text-sm text-foreground text-center">
                      {getLocalizedPeriodName(p.name, language)}
                    </TableCell>
                    <TableCell className="text-xs text-center whitespace-nowrap text-muted-foreground">
                      {formatDateI18n(p.start_date, language)} &ndash; {formatDateI18n(p.end_date, language)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        tone={p.status === "open" ? "success" : "warning"}
                        label={
                          p.status === "open"
                            ? t("accounting:coa.status_open", "Periode Terbuka")
                            : t("accounting:coa.status_closed", "Periode Ditutup")
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">
                      {p.status === "closed" && p.closed_at
                        ? `${language === "en" ? "Closed: " : "Ditutup: "}${formatDateTimeI18n(p.closed_at, language)}`
                        : p.reopen_reason
                          ? `${language === "en" ? "Reopened (" : "Dibuka kembali ("}${formatDateTimeI18n(p.reopened_at, language)}): "${p.reopen_reason}"`
                          : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 -my-1.5">
                        {p.status === "open" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onClosePeriod(p)}
                            className="size-8 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all cursor-pointer shadow-2xs"
                            title={t("accounting:closing.tooltip_close_period", "Tutup Buku & Periode")}
                          >
                            <LockIcon className="size-4" />
                            <span className="sr-only">{t("accounting:closing.tooltip_close_period", "Tutup Buku & Periode")}</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onReopenPeriod(p)}
                            className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
                            title={t("accounting:closing.tooltip_reopen_period", "Buka Kembali Periode")}
                          >
                            <LockOpenIcon className="size-4" />
                            <span className="sr-only">{t("accounting:closing.tooltip_reopen_period", "Buka Kembali Periode")}</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onDeletePeriod(p)}
                          className="size-8 rounded-lg text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 dark:text-rose-400 dark:hover:text-rose-300 transition-all cursor-pointer shadow-2xs"
                          title={t("accounting:closing.tooltip_delete_period", "Hapus Periode")}
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">{t("accounting:closing.tooltip_delete_period", "Hapus Periode")}</span>
                        </Button>
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
