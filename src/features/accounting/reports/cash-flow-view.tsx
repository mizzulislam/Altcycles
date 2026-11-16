import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { formatDateID, formatRupiah } from "@/lib/formatters";
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
}

export function CashFlowCard({ cashFlow }: CashFlowCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Pergerakan Kas
          </span>
          <h2 className="text-lg font-bold text-foreground mt-0.5">Laporan Arus Kas</h2>
          <p className="text-xs text-muted-foreground mt-1">Ringkasan arus kas masuk dan keluar berdasarkan aktivitas</p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">Kas Bersih dari Aktivitas Operasi</span>
            {formatCurrency(cashFlow.netOperating, cashFlow.netOperating < 0)}
          </div>
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">Kas Bersih dari Aktivitas Investasi</span>
            {formatCurrency(cashFlow.netInvesting, cashFlow.netInvesting < 0)}
          </div>
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">Kas Bersih dari Aktivitas Pendanaan</span>
            {formatCurrency(cashFlow.netFinancing, cashFlow.netFinancing < 0)}
          </div>
          <div className="flex justify-between items-center py-2 pl-1 border-t border-border/70 text-foreground font-bold mt-1">
            <span className="uppercase tracking-wide">Kenaikan / Penurunan Kas</span>
            {formatCurrency(cashFlow.netChangeInCash, cashFlow.netChangeInCash < 0, "text-xs font-bold text-foreground")}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-1.5 border-t border-border/70 pt-3 text-xs">
        <div className="flex justify-between items-center py-1 pl-1">
          <span className="text-muted-foreground font-medium">Saldo Kas Awal</span>
          {formatCurrency(cashFlow.beginningCash, cashFlow.beginningCash < 0)}
        </div>
        <div className="flex justify-between items-center py-2 pl-1 border-t border-b-2 border-border/80 text-foreground">
          <span className="font-bold uppercase tracking-wide">Saldo Kas Akhir</span>
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
}

export function CashFlowView({
  startDate,
  endDate,
  cashFlow,
}: CashFlowViewProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Laporan Arus Kas Metode Langsung
          </CardTitle>
          <CardDescription>
            Klasifikasi aktivitas Operasi, Investasi, dan Pendanaan secara langsung dari mutasi kas periode{" "}
            <span className="font-semibold text-foreground">
              {formatDateID(startDate)} &minus; {formatDateID(endDate)}
            </span>
            .
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableBody>
              <TableRow className="bg-muted/20">
                <TableCell className="px-6 py-3 font-semibold text-xs text-foreground">
                  Saldo Kas &amp; Bank Awal Periode
                </TableCell>
                <TableCell className="pr-6 text-right font-bold text-xs text-foreground">
                  {formatRupiah(cashFlow.beginningCash)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-10 text-xs text-foreground">
                  Penerimaan Kas dari Pelanggan (Operasi)
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.operatingInflow)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-10 text-xs text-foreground">
                  Pembayaran Kas kepada Vendor &amp; Beban Operasional
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  ({formatRupiah(cashFlow.operatingOutflow)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/10 font-semibold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">Arus Kas Bersih Aktivitas Operasi</TableCell>
                <TableCell className="pr-6 text-right text-xs font-semibold text-foreground">
                  {formatRupiah(cashFlow.netOperating)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground">Arus Kas Bersih Aktivitas Investasi</TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.netInvesting)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground">Arus Kas Bersih Aktivitas Pendanaan</TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.netFinancing)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/20 font-semibold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">Kenaikan / (Penurunan) Bersih Kas</TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(cashFlow.netChangeInCash)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/40 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  Saldo Kas &amp; Bank Akhir Periode
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
