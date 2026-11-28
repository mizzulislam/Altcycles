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
  TableRow,
} from "@/components/ui/table";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency } from "./reports-common";

export interface CashFlowData {
  beginningCash: number;
  operatingInflow: number;
  operatingOutflow: number;
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChangeInCash: number;
  endingCash: number;
}

interface CashFlowCardProps {
  cashFlow: CashFlowData;
  onDownload?: () => void;
}

export function CashFlowCard({ cashFlow, onDownload }: CashFlowCardProps) {
  const { t, language } = useLanguage();

  return (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {language === "en" ? "Cash Movement" : "Pergerakan Kas"}
            </span>
            <h2 className="text-lg font-bold text-foreground mt-0.5">
              {t("accounting:reports.tab_cash_flow", "Laporan Arus Kas")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "en" ? "Summary of cash inflows and outflows by activity" : "Ringkasan arus kas masuk dan keluar berdasarkan aktivitas"}
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

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">
              {language === "en" ? "Net Cash from Operating Activities" : "Kas Bersih dari Aktivitas Operasi"}
            </span>
            {formatCurrency(cashFlow.netOperating, cashFlow.netOperating < 0)}
          </div>
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">
              {language === "en" ? "Net Cash from Investing Activities" : "Kas Bersih dari Aktivitas Investasi"}
            </span>
            {formatCurrency(cashFlow.netInvesting, cashFlow.netInvesting < 0)}
          </div>
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">
              {language === "en" ? "Net Cash from Financing Activities" : "Kas Bersih dari Aktivitas Pendanaan"}
            </span>
            {formatCurrency(cashFlow.netFinancing, cashFlow.netFinancing < 0)}
          </div>
          <div className="flex justify-between items-center py-2 pl-1 border-t border-border/70 text-foreground font-bold mt-1">
            <span className="uppercase tracking-wide">
              {language === "en" ? "Net Increase / (Decrease) in Cash" : "Kenaikan / Penurunan Kas"}
            </span>
            {formatCurrency(cashFlow.netChangeInCash, cashFlow.netChangeInCash < 0, "text-xs font-bold text-foreground")}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-1.5 border-t border-border/70 pt-3 text-xs">
        <div className="flex justify-between items-center py-1 pl-1">
          <span className="text-muted-foreground font-medium">
            {language === "en" ? "Beginning Cash Balance" : "Saldo Kas Awal"}
          </span>
          {formatCurrency(cashFlow.beginningCash, cashFlow.beginningCash < 0)}
        </div>
        <div className="flex justify-between items-center py-2 pl-1 border-t border-b-2 border-border/80 text-foreground">
          <span className="font-bold uppercase tracking-wide">
            {language === "en" ? "Ending Cash Balance" : "Saldo Kas Akhir"}
          </span>
          {formatCurrency(cashFlow.endingCash, cashFlow.endingCash < 0, "text-xs font-bold text-primary dark:text-cyan-400")}
        </div>
      </div>
    </div>
  );
}

interface CashFlowViewProps {
  startDate: string;
  endDate: string;
  cashFlow: CashFlowData;
  navigationControls?: React.ReactNode;
}

export function CashFlowView({
  startDate,
  endDate,
  cashFlow,
  navigationControls,
}: CashFlowViewProps) {
  const { language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-muted/25 dark:bg-muted/15 shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={language === "en" ? "Direct Method Cash Flow Statement" : "Laporan Arus Kas Metode Langsung"}
        description={
          language === "en"
            ? `Classification of Operating, Investing, and Financing activities directly from cash movements for period ${formatDateI18n(startDate, language)} - ${formatDateI18n(endDate, language)}.`
            : `Klasifikasi aktivitas Operasi, Investasi, dan Pendanaan secara langsung dari mutasi kas periode ${formatDateI18n(startDate, language)} - ${formatDateI18n(endDate, language)}.`
        }
        headerClassName="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70"
        controls={navigationControls}
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableBody>
              <TableRow className="bg-muted/20">
                <TableCell className="px-6 py-3 font-semibold text-xs text-foreground">
                  {language === "en" ? "Beginning Cash & Bank Balance" : "Saldo Kas & Bank Awal Periode"}
                </TableCell>
                <TableCell className="pr-6 text-right font-bold text-xs text-foreground">
                  {formatRupiah(cashFlow.beginningCash)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-10 text-xs text-foreground">
                  {language === "en" ? "Cash Receipts from Customers (Operating)" : "Penerimaan Kas dari Pelanggan (Operasi)"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.operatingInflow)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-10 text-xs text-foreground">
                  {language === "en" ? "Cash Payments to Vendors & Operating Expenses" : "Pembayaran Kas kepada Vendor & Beban Operasional"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  ({formatRupiah(cashFlow.operatingOutflow)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/10 font-semibold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  {language === "en" ? "Net Cash from Operating Activities" : "Arus Kas Bersih Aktivitas Operasi"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-semibold text-foreground">
                  {formatRupiah(cashFlow.netOperating)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground">
                  {language === "en" ? "Net Cash from Investing Activities" : "Arus Kas Bersih Aktivitas Investasi"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.netInvesting)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground">
                  {language === "en" ? "Net Cash from Financing Activities" : "Arus Kas Bersih Aktivitas Pendanaan"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.netFinancing)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/20 font-semibold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  {language === "en" ? "Net Increase / (Decrease) in Cash" : "Kenaikan / (Penurunan) Bersih Kas"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(cashFlow.netChangeInCash)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/40 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  {language === "en" ? "Ending Cash & Bank Balance" : "Saldo Kas & Bank Akhir Periode"}
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(cashFlow.endingCash)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
