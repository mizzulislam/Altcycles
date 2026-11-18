import {
  LockIcon,
  LockOpenIcon,
  Trash2Icon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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
}

export function PeriodListTable({
  periods,
  loading,
  onClosePeriod,
  onReopenPeriod,
  onDeletePeriod,
}: PeriodListTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="px-6 py-4 border-b border-border/70">
        <CardTitle>{t("accounting:coa.card_periods_title", "Daftar Periode Bulanan")}</CardTitle>
        <CardDescription>
          {t("accounting:coa.card_periods_desc", "Status terbuka mengizinkan pencatatan dan posting jurnal transaksi pada bulan bersangkutan.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center gap-2 py-8 px-6 text-sm text-muted-foreground">
            <Spinner />
            <span>{t("common.loading", "Memuat daftar periode...")}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {periods.map((p) => (
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
                            title="Tutup Buku & Periode"
                          >
                            <LockIcon className="size-4" />
                            <span className="sr-only">Tutup Buku &amp; Periode</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onReopenPeriod(p)}
                            className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
                            title="Buka Kembali Periode"
                          >
                            <LockOpenIcon className="size-4" />
                            <span className="sr-only">Buka Kembali Periode</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onDeletePeriod(p)}
                          className="size-8 rounded-lg text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 dark:text-rose-400 dark:hover:text-rose-300 transition-all cursor-pointer shadow-2xs"
                          title="Hapus Periode"
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Hapus Periode</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
