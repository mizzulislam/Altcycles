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
import { getLocalizedAccountName } from "@/lib/glossary";
import type { ProjectRow } from "@/types/database.types";
import { formatCurrency } from "./reports-common";

export interface IncomeStatementData {
  revenues: Array<{ code: string; name: string; amount: number }>;
  totalRevenue: number;
  directExpenses: Array<{ code: string; name: string; amount: number }>;
  totalDirectExpense: number;
  grossProfit: number;
  sharedExpenses: Array<{ code: string; name: string; amount: number }>;
  totalSharedExpense: number;
  netProfit: number;
}

interface IncomeStatementCardProps {
  incomeStatement: IncomeStatementData;
  onDownload?: () => void;
}

export function IncomeStatementCard({
  incomeStatement,
  onDownload,
}: IncomeStatementCardProps) {
  const { t, language } = useLanguage();

  return (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {language === "en" ? "Operating Statement" : "Laporan Operasional"}
            </span>
            <h2 className="text-lg font-bold text-foreground mt-0.5">
              {t("accounting:reports.tab_income_statement", "Laba Rugi")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "en" ? "Measures Altcycles operational financial performance" : "Mengukur kinerja keuangan operasional Altcycles"}
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
          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              {language === "en" ? "Revenues" : "Pendapatan (Revenues)"}
            </div>
            <div className="space-y-1">
              {incomeStatement.revenues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1 pl-1">
                  {language === "en" ? "No recorded revenue" : "Tidak ada pendapatan tercatat"}
                </p>
              ) : (
                incomeStatement.revenues.map((r) => (
                  <div key={r.code} className="flex justify-between items-center py-1 pl-1 border-b border-border/40 text-xs">
                    <span className="text-muted-foreground truncate font-medium">
                      {getLocalizedAccountName(r, language)}
                    </span>
                    {formatCurrency(r.amount)}
                  </div>
                ))
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 text-xs font-bold text-foreground border-t border-border/70 mt-1">
                <span>{t("accounting:reports.total_revenue", "Total Pendapatan")}</span>
                <span className="text-primary dark:text-cyan-400">{formatCurrency(incomeStatement.totalRevenue)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              {language === "en" ? "Operating Expenses" : "Beban Operasional (Expenses)"}
            </div>
            <div className="space-y-1">
              {[...incomeStatement.directExpenses, ...incomeStatement.sharedExpenses].length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1 pl-1">
                  {language === "en" ? "No recorded expenses" : "Tidak ada beban tercatat"}
                </p>
              ) : (
                [...incomeStatement.directExpenses, ...incomeStatement.sharedExpenses].map((e) => (
                  <div key={e.code} className="flex justify-between items-center py-1 pl-1 border-b border-border/40 text-xs">
                    <span className="text-muted-foreground truncate font-medium">
                      {getLocalizedAccountName(e, language)}
                    </span>
                    {formatCurrency(e.amount, true)}
                  </div>
                ))
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 text-xs font-bold text-foreground border-t border-border/70 mt-1">
                <span>{t("accounting:reports.total_expense", "Total Beban")}</span>
                <span>{formatCurrency(incomeStatement.totalDirectExpense + incomeStatement.totalSharedExpense, true)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground">
        <span className="font-bold text-xs uppercase tracking-wide">
          {incomeStatement.netProfit >= 0
            ? (language === "en" ? "Net Income" : "Laba Bersih (Net Income)")
            : (language === "en" ? "Net Loss" : "Rugi Bersih (Net Loss)")}
        </span>
        <span>
          {formatCurrency(incomeStatement.netProfit, false, "text-xs font-bold text-primary dark:text-cyan-400")}
        </span>
      </div>
    </div>
  );
}

interface IncomeStatementViewProps {
  startDate: string;
  endDate: string;
  projectFilter: string;
  projects: ProjectRow[];
  incomeStatement: IncomeStatementData;
}

export function IncomeStatementView({
  startDate,
  endDate,
  projectFilter,
  projects,
  incomeStatement,
}: IncomeStatementViewProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={language === "en" ? "Accrual-Basis Income Statement" : "Laporan Laba Rugi Basis Akrual"}
        description={
          language === "en"
            ? `Structured presentation of direct project expenses and shared operating expenses for period ${formatDateI18n(startDate, language)} - ${formatDateI18n(endDate, language)}.`
            : `Penyajian terstruktur beban langsung proyek dan beban operasional bersama periode ${formatDateI18n(startDate, language)} - ${formatDateI18n(endDate, language)}.`
        }
        headerClassName="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70"
        controls={
          projectFilter !== "ALL" ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary dark:text-cyan-400">
              {language === "en" ? "Project: " : "Proyek: "}
              {projects.find((p) => p.id === projectFilter)?.name ?? projectFilter}
            </span>
          ) : null
        }
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-center px-6 font-semibold text-xs text-foreground/80">
                  {language === "en" ? "Component / Account" : "Komponen / Akun"}
                </TableHead>
                <TableHead className="w-56 text-center pr-6 font-semibold text-xs text-foreground/80">
                  {language === "en" ? "Amount" : "Nominal"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30 font-bold border-t border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  {language === "en" ? "Operating Revenue" : "Pendapatan Usaha"}
                </TableCell>
              </TableRow>
              {incomeStatement.revenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic">
                    {language === "en" ? "No revenue recognized in this date range." : "Belum ada pendapatan diakui pada rentang tanggal ini."}
                  </TableCell>
                </TableRow>
              ) : (
                incomeStatement.revenues.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-8">
                      {getLocalizedAccountName(r, language)}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                      {formatRupiah(r.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  {t("accounting:reports.total_revenue", "Total Pendapatan")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(incomeStatement.totalRevenue)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  {language === "en" ? "Project Direct Expenses" : "Beban Langsung Proyek"}
                </TableCell>
              </TableRow>
              {incomeStatement.directExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic">
                    {language === "en" ? "No project direct expenses in this period." : "Belum ada beban langsung proyek pada periode ini."}
                  </TableCell>
                </TableRow>
              ) : (
                incomeStatement.directExpenses.map((e) => (
                  <TableRow key={e.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-8">
                      {getLocalizedAccountName(e, language)}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-foreground">
                      ({formatRupiah(e.amount)})
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  {t("accounting:reports.gross_profit", "Laba Kotor")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(incomeStatement.grossProfit)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  {language === "en" ? "Shared Operating Expenses" : "Beban Operasional Bersama"}
                </TableCell>
              </TableRow>
              {incomeStatement.sharedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic">
                    {language === "en" ? "No shared operating expenses in this period." : "Belum ada beban operasional bersama pada periode ini."}
                  </TableCell>
                </TableRow>
              ) : (
                incomeStatement.sharedExpenses.map((s) => (
                  <TableRow key={s.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-8">
                      {getLocalizedAccountName(s, language)}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-foreground">
                      ({formatRupiah(s.amount)})
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  {incomeStatement.netProfit >= 0
                    ? (language === "en" ? "Net Income for Current Period" : "Laba Bersih Periode Berjalan")
                    : (language === "en" ? "Net Loss for Current Period" : "Rugi Bersih Periode Berjalan")}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(incomeStatement.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
