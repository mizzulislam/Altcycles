import { Link } from "react-router-dom";
import { ArrowRightIcon, ScaleIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { TruncatedTooltipText } from "@/components/shared/page-header";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateI18n } from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import type { AccountRow, JournalLineRow, JournalRow } from "@/types/database.types";

export interface AdminDashboardRecentActivityProps {
  recentJournals: JournalRow[];
  lines: JournalLineRow[];
  accMap: Map<string, AccountRow>;
}

export function AdminDashboardRecentActivity({
  recentJournals,
  lines,
  accMap,
}: AdminDashboardRecentActivityProps) {
  const { t, language } = useLanguage();

  return (
    <ChartCard
      title={t("dashboard:charts.recent_5_tx_title", "5 Transaksi Terakhir")}
      subtitle={t(
        "dashboard:charts.recent_5_tx_subtitle",
        "Catatan transaksi jurnal terposting paling mutakhir.",
      )}
      footer={
        <div className="flex items-center justify-end px-6 py-3 border-t border-border/70 bg-muted/10">
          <Link
            to="/admin/akuntansi?tab=jurnal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
          >
            <span>{t("dashboard:charts.view_all_journals", "Lihat Semua Jurnal")}</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      }
      contentClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="pl-6 pr-3 text-center font-semibold text-xs whitespace-nowrap">
              {t("dashboard:charts.col_date", "Tanggal")}
            </TableHead>
            <TableHead className="px-3 text-center font-semibold text-xs whitespace-nowrap">
              {t("dashboard:charts.col_journal_no", "No. Jurnal")}
            </TableHead>
            <TableHead className="px-3 text-center font-semibold text-xs min-w-[220px]">
              {t("dashboard:charts.col_desc", "Keterangan")}
            </TableHead>
            <TableHead className="px-3 text-center font-semibold text-xs whitespace-nowrap">
              {t("dashboard:charts.col_main_account", "Akun Utama")}
            </TableHead>
            <TableHead className="pl-3 pr-6 text-center font-semibold text-xs whitespace-nowrap">
              {t("dashboard:charts.col_amount", "Nominal")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentJournals.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                  <ScaleIcon className="size-8 text-muted-foreground/60 mb-2" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("dashboard:charts.empty_tx_title", "Belum Ada Transaksi")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                    {t("dashboard:charts.empty_tx_desc", "Transaksi jurnal terposting akan otomatis muncul di sini.")}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            recentJournals.map((j) => {
              const jLines = lines.filter((l) => l.journal_id === j.id);
              const firstLine = jLines[0];
              const mainAcc = firstLine ? accMap.get(firstLine.account_id) : null;
              const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
              const desc = getLocalizedTransactionDescription(j.description, language);

              return (
                <TableRow key={j.id}>
                  <TableCell className="pl-6 pr-3 text-center align-top whitespace-nowrap tabular-nums text-xs sm:text-sm leading-5">
                    {formatDateI18n(j.journal_date, language)}
                  </TableCell>
                  <TableCell className="px-3 text-center align-top whitespace-nowrap font-mono text-xs sm:text-sm font-semibold leading-5 text-foreground">
                    {j.journal_number}
                  </TableCell>
                  <TableCell className="px-3 text-left align-top text-xs sm:text-sm leading-5 text-foreground/90 max-w-sm">
                    <TruncatedTooltipText as="p" tooltipText={desc}>
                      {desc}
                    </TruncatedTooltipText>
                  </TableCell>
                  <TableCell className="px-3 text-left align-top text-xs sm:text-sm leading-5 text-muted-foreground whitespace-nowrap">
                    {mainAcc ? (
                      <span>
                        <span className="font-mono text-foreground/75 font-semibold">{mainAcc.code}</span>
                        {" \u2014 "}
                        {getLocalizedAccountName(mainAcc, language)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="pl-3 pr-6 text-right align-top whitespace-nowrap text-xs sm:text-sm leading-5">
                    <MonetaryCell amount={totalDebit} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </ChartCard>
  );
}
