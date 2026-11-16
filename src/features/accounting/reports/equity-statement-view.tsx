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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateID, formatRupiah } from "@/lib/formatters";
import { formatCurrency } from "./reports-common";

interface EquityStatementCardProps {
  beginningRetainedEarnings: number;
  netProfit: number;
  dividends: number;
  endingRetainedEarnings: number;
  modalDisetorBalance: number;
  totalEndingEquity: number;
}

export function EquityStatementCard({
  beginningRetainedEarnings,
  netProfit,
  dividends,
  endingRetainedEarnings,
  modalDisetorBalance,
  totalEndingEquity,
}: EquityStatementCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Ekuitas Mutasi
          </span>
          <h2 className="text-lg font-bold text-foreground mt-0.5">Perubahan Ekuitas</h2>
          <p className="text-xs text-muted-foreground mt-1">Mutasi laba ditahan dan modal selama periode berjalan</p>
        </div>

        <div className="space-y-4">
          <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
            Laba Ditahan (Retained Earnings)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Saldo Laba Ditahan Awal</span>
              {formatCurrency(beginningRetainedEarnings)}
            </div>
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Ditambah: Laba Bersih Periode Ini</span>
              <span>{formatCurrency(netProfit, false, "text-xs font-bold text-primary dark:text-cyan-400")}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Dikurangi: Prive Pemilik (Dividen)</span>
              {formatCurrency(dividends, true)}
            </div>
            <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
              <span>Laba Ditahan Akhir</span>
              <span>{formatCurrency(endingRetainedEarnings)}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              Modal Disetor Pemilik
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Modal Disetor Altvira</span>
                {formatCurrency(modalDisetorBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground">
        <span className="font-bold text-xs uppercase tracking-wide">Total Ekuitas Akhir</span>
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
}: EquityStatementViewProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Laporan Perubahan Ekuitas per {formatDateID(endDate)}
          </CardTitle>
          <CardDescription>
            Menyajikan mutasi laba ditahan dan saldo modal disetor selama periode{" "}
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
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">Komponen Ekuitas</TableHead>
                <TableHead className="w-56 text-center font-semibold text-xs sm:text-sm">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/20 font-bold border-t border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Akumulasi Laba Ditahan (Retained Earnings)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Saldo Laba Ditahan Awal Periode
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                  {formatRupiah(beginningRetainedEarnings)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Ditambah: Laba Bersih Periode Berjalan (dari Laba Rugi)
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-semibold text-primary dark:text-cyan-400">
                  {formatRupiah(netProfit)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Dikurangi: Prive Pemilik / Dividen
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  ({formatRupiah(dividends)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  Saldo Laba Ditahan Akhir Periode
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(endingRetainedEarnings)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/20 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Modal Disetor Pemilik
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Modal Disetor Altvira
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                  {formatRupiah(modalDisetorBalance)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  TOTAL EKUITAS AKHIR PERIODE
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
