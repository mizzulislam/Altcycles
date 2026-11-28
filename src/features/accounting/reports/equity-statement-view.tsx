import { DownloadIcon } from "lucide-react";
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
  TableRow,
} from "@/components/ui/table";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency } from "./reports-common";

interface EquityStatementCardProps {
  beginningRetainedEarnings: number;
  netProfit: number;
  dividends: number;
  endingRetainedEarnings: number;
  modalDisetorBalance: number;
  totalEndingEquity: number;
  onDownload?: () => void;
}

export function EquityStatementCard({
  beginningRetainedEarnings,
  netProfit,
  dividends,
  endingRetainedEarnings,
  modalDisetorBalance,
  totalEndingEquity,
  onDownload,
}: EquityStatementCardProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {t("accounting:reports.equity_badge", "Ekuitas Mutasi")}
            </span>
            <h2 className="text-lg font-bold text-foreground mt-0.5">
              {t("accounting:reports.equity_title", "Perubahan Ekuitas")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("accounting:reports.equity_subtitle", "Mutasi laba ditahan dan modal selama periode berjalan")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDownload}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
            title={t("common:action.download", "Unduh PDF")}
          >
            <DownloadIcon className="size-4" />
            <span className="sr-only">{t("common:action.download", "Unduh PDF")}</span>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
            {t("accounting:reports.retained_earnings_sec", "Laba Ditahan (Retained Earnings)")}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">
                {t("accounting:reports.beginning_retained_earnings", "Saldo Laba Ditahan Awal")}
              </span>
              {formatCurrency(beginningRetainedEarnings)}
            </div>
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">
                {t("accounting:reports.add_net_income", "Ditambah: Laba Bersih Periode Ini")}
              </span>
              <span>{formatCurrency(netProfit, false, "text-xs font-bold text-primary dark:text-cyan-400")}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">
                {t("accounting:reports.less_dividends", "Dikurangi: Prive Pemilik (Dividen)")}
              </span>
              {formatCurrency(dividends, true)}
            </div>
            <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
              <span>{t("accounting:reports.ending_retained_earnings", "Laba Ditahan Akhir")}</span>
              <span>{formatCurrency(endingRetainedEarnings)}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              {t("accounting:reports.paid_in_capital_sec", "Modal Disetor Pemilik")}
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">
                  {t("accounting:reports.paid_in_capital_altvira", "Modal Disetor Altvira")}
                </span>
                {formatCurrency(modalDisetorBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground">
        <span className="font-bold text-xs uppercase tracking-wide">
          {t("accounting:reports.total_ending_equity", "Total Ekuitas Akhir")}
        </span>
        <span>
          {formatCurrency(totalEndingEquity, false, "text-xs font-bold text-primary dark:text-cyan-400")}
        </span>
      </div>
    </div>
  );
}

interface EquityStatementViewProps {
  startDate: string;
  endDate: string;
  beginningRetainedEarnings: number;
  netProfit: number;
  dividends: number;
  endingRetainedEarnings: number;
  modalDisetorBalance: number;
  totalEndingEquity: number;
  navigationControls?: React.ReactNode;
}

export function EquityStatementView({
  startDate,
  endDate,
  beginningRetainedEarnings,
  netProfit,
  dividends,
  endingRetainedEarnings,
  modalDisetorBalance,
  totalEndingEquity,
  navigationControls,
}: EquityStatementViewProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-muted/25 dark:bg-muted/15 shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("accounting:reports.equity_report_as_of", {
          date: formatDateI18n(endDate, language),
          defaultValue: `Laporan Perubahan Ekuitas per ${formatDateI18n(endDate, language)}`,
        })}
        description={`${t("accounting:reports.equity_report_desc", "Menyajikan mutasi laba ditahan dan saldo modal disetor selama periode")} ${formatDateI18n(startDate, language)} - ${formatDateI18n(endDate, language)}.`}
        headerClassName="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70"
        controls={navigationControls}
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">
                  {t("accounting:reports.equity_component", "Komponen Ekuitas")}
                </TableHead>
                <TableHead className="w-56 text-center font-semibold text-xs sm:text-sm">
                  {t("accounting:reports.amount", "Nominal")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/20 font-bold border-t border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  {t("accounting:reports.retained_earnings_sec", "Akumulasi Laba Ditahan (Retained Earnings)")}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  {t("accounting:reports.beginning_retained_earnings_full", "Saldo Laba Ditahan Awal Periode")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                  {formatRupiah(beginningRetainedEarnings)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  {t("accounting:reports.add_net_income_full", "Ditambah: Laba Bersih Periode Berjalan (dari Laba Rugi)")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-semibold text-primary dark:text-cyan-400">
                  {formatRupiah(netProfit)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  {t("accounting:reports.less_dividends_full", "Dikurangi: Prive Pemilik / Dividen")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  ({formatRupiah(dividends)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  {t("accounting:reports.ending_retained_earnings_full", "Saldo Laba Ditahan Akhir Periode")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(endingRetainedEarnings)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/20 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  {t("accounting:reports.paid_in_capital_sec", "Modal Disetor Pemilik")}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  {t("accounting:reports.paid_in_capital_altvira", "Modal Disetor Altvira")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                  {formatRupiah(modalDisetorBalance)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  {t("accounting:reports.total_ending_equity_full", "TOTAL EKUITAS AKHIR PERIODE")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(totalEndingEquity)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
