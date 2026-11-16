import { ScaleIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { formatBalanceAmount, formatCurrency } from "./reports-common";

export interface BalanceSheetData {
  assets: Array<{ code: string; name: string; amount: number }>;
  contractAssets: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    netContractPosition: number;
    wipBalance: number;
    billingsBalance: number;
  }>;
  totalAssets: number;
  liabilities: Array<{ code: string; name: string; amount: number }>;
  contractLiabilities: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    netContractPosition: number;
    wipBalance: number;
    billingsBalance: number;
  }>;
  equities: Array<{ code: string; name: string; amount: number }>;
  currentUnclosedEarnings: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

interface BalanceSheetCardProps {
  balanceSheet: BalanceSheetData;
  modalDisetorBalance: number;
  endingRetainedEarnings: number;
  totalEndingEquity: number;
}

export function BalanceSheetCard({
  balanceSheet,
  modalDisetorBalance,
  endingRetainedEarnings,
  totalEndingEquity,
}: BalanceSheetCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Posisi Keuangan
            </span>
            <h2 className="text-lg font-bold text-foreground mt-0.5">Neraca (Balance Sheet)</h2>
            <p className="text-xs text-muted-foreground mt-1">Ringkasan aset, kewajiban, dan ekuitas Altcycles</p>
          </div>
          <ScaleIcon className="size-5 text-muted-foreground mt-1" />
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              ASET (HARTA)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Aset Lancar (Kas &amp; Piutang)</span>
                {formatCurrency(balanceSheet.assets.reduce((s, a) => s + a.amount, 0))}
              </div>
              {balanceSheet.contractAssets.length > 0 && (
                <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Aset Kontrak (WIP &gt; Tagihan)</span>
                  {formatCurrency(balanceSheet.contractAssets.reduce((s, a) => s + a.netContractPosition, 0))}
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
                <span>TOTAL ASET</span>
                <span>{formatCurrency(balanceSheet.totalAssets, false, "text-xs font-bold text-foreground")}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              KEWAJIBAN (HUTANG)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Kewajiban Berjalan &amp; Pajak</span>
                {formatCurrency(balanceSheet.liabilities.reduce((s, l) => s + l.amount, 0))}
              </div>
              {balanceSheet.contractLiabilities.length > 0 && (
                <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Liabilitas Kontrak (Tagihan &gt; WIP)</span>
                  {formatCurrency(balanceSheet.contractLiabilities.reduce((s, l) => s + Math.abs(l.netContractPosition), 0))}
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
                <span>Total Kewajiban</span>
                <span>
                  {formatCurrency(
                    balanceSheet.liabilities.reduce((s, l) => s + l.amount, 0) +
                      balanceSheet.contractLiabilities.reduce(
                        (s, l) => s + Math.abs(l.netContractPosition),
                        0,
                      ),
                  )}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              MODAL (EKUITAS)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Modal Disetor &amp; Ekuitas</span>
                {formatCurrency(modalDisetorBalance)}
              </div>
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Laba Ditahan Akhir</span>
                {formatCurrency(endingRetainedEarnings)}
              </div>
              <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
                <span>Total Ekuitas</span>
                <span>{formatCurrency(totalEndingEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground font-bold text-xs">
        <span className="uppercase tracking-wide">Total Kewajiban &amp; Modal</span>
        <span>
          {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, false, "text-xs font-bold text-foreground")}
        </span>
      </div>
    </div>
  );
}

interface BalanceSheetViewProps {
  endDate: string;
  balanceSheet: BalanceSheetData;
}

export function BalanceSheetView({ endDate, balanceSheet }: BalanceSheetViewProps) {
  const currentAssets = balanceSheet.assets.filter(
    (a) => a.code.startsWith("1-1") || a.code.startsWith("1-2"),
  );
  const fixedAssets = balanceSheet.assets.filter(
    (a) => !a.code.startsWith("1-1") && !a.code.startsWith("1-2"),
  );
  const totalCurrentAssets =
    currentAssets.reduce((s, a) => s + a.amount, 0) +
    balanceSheet.contractAssets.reduce((s, ca) => s + ca.netContractPosition, 0);
  const totalFixedAssets = fixedAssets.reduce((s, a) => s + a.amount, 0);

  const currentLiabilities = balanceSheet.liabilities.filter((l) =>
    l.code.startsWith("2-1"),
  );
  const longTermLiabilities = balanceSheet.liabilities.filter(
    (l) => !l.code.startsWith("2-1"),
  );
  const totalCurrentLiabilities =
    currentLiabilities.reduce((s, l) => s + l.amount, 0) +
    balanceSheet.contractLiabilities.reduce(
      (s, cl) => s + Math.abs(cl.netContractPosition),
      0,
    );
  const totalLongTermLiabilities = longTermLiabilities.reduce(
    (s, l) => s + l.amount,
    0,
  );
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  const totalEquity =
    balanceSheet.equities.reduce((s, eq) => s + eq.amount, 0) +
    balanceSheet.currentUnclosedEarnings;

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Laporan Posisi Keuangan (Neraca) per {formatDateID(endDate)}
          </CardTitle>
          <CardDescription>
            Menyajikan posisi Aset, Liabilitas, Ekuitas, serta Aset/Liabilitas Kontrak proyek secara akrual.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            tone={balanceSheet.isBalanced ? "success" : "destructive"}
            label={
              balanceSheet.isBalanced
                ? "Neraca Seimbang"
                : "Selisih Neraca"
            }
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-center px-6 font-semibold text-xs text-foreground/80">
                  Komponen / Akun
                </TableHead>
                <TableHead className="w-56 text-center pr-6 font-semibold text-xs text-foreground/80">
                  Nominal
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ASET */}
              <TableRow className="bg-muted/30 font-bold border-t border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground font-bold uppercase tracking-wider">
                  ASET (HARTA)
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/10 font-bold">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                  ASET LANCAR
                </TableCell>
              </TableRow>
              {currentAssets.length === 0 && balanceSheet.contractAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                    Belum ada aset lancar pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {currentAssets.map((a) => (
                    <TableRow key={a.code}>
                      <TableCell className="px-6 text-xs text-foreground pl-12">
                        {a.name}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                        {formatBalanceAmount(a.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {balanceSheet.contractAssets.map((ca) => (
                    <TableRow key={ca.projectId} className="bg-primary/5">
                      <TableCell className="px-6 text-xs pl-12">
                        <div className="font-semibold text-foreground">
                          Aset Kontrak: {ca.projectName}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          WIP {formatRupiah(ca.wipBalance)} &minus; Penagihan {formatRupiah(ca.billingsBalance)}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                        {formatBalanceAmount(ca.netContractPosition)}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                  Total Aset Lancar
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatBalanceAmount(totalCurrentAssets)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/10 font-bold border-t border-border/70">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                  ASET TETAP
                </TableCell>
              </TableRow>
              {fixedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                    Tidak ada aset tetap
                  </TableCell>
                </TableRow>
              ) : (
                fixedAssets.map((a) => (
                  <TableRow key={a.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-12">
                      {a.name}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                      {formatBalanceAmount(a.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                  Total Aset Tetap (Net)
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatBalanceAmount(totalFixedAssets)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/40 font-bold border-t-2 border-b-2 border-border/80">
                <TableCell className="px-6 text-xs font-bold text-foreground uppercase tracking-wide">
                  TOTAL ASET
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatBalanceAmount(balanceSheet.totalAssets)}
                </TableCell>
              </TableRow>

              {/* LIABILITAS */}
              <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground font-bold uppercase tracking-wider">
                  LIABILITAS (KEWAJIBAN)
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/10 font-bold">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                  LIABILITAS JANGKA PENDEK
                </TableCell>
              </TableRow>
              {currentLiabilities.length === 0 && balanceSheet.contractLiabilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                    Belum ada liabilitas jangka pendek pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {currentLiabilities.map((l) => (
                    <TableRow key={l.code}>
                      <TableCell className="px-6 text-xs text-foreground pl-12">
                        {l.name}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                        {formatBalanceAmount(l.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {balanceSheet.contractLiabilities.map((cl) => (
                    <TableRow key={cl.projectId} className="bg-primary/5">
                      <TableCell className="px-6 text-xs pl-12">
                        <div className="font-semibold text-foreground">
                          Liabilitas Kontrak: {cl.projectName}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Penagihan {formatRupiah(cl.billingsBalance)} &minus; WIP {formatRupiah(cl.wipBalance)}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                        {formatBalanceAmount(Math.abs(cl.netContractPosition))}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                  Total Liabilitas Jangka Pendek
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatBalanceAmount(totalCurrentLiabilities)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/10 font-bold border-t border-border/70">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                  LIABILITAS JANGKA PANJANG
                </TableCell>
              </TableRow>
              {longTermLiabilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                    Tidak ada liabilitas jangka panjang
                  </TableCell>
                </TableRow>
              ) : (
                longTermLiabilities.map((l) => (
                  <TableRow key={l.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-12">
                      {l.name}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                      {formatBalanceAmount(l.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                  Total Liabilitas Jangka Panjang
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatBalanceAmount(totalLongTermLiabilities)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/25 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs font-bold text-foreground pl-8">
                  Total Liabilitas
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatBalanceAmount(totalLiabilities)}
                </TableCell>
              </TableRow>

              {/* EKUITAS */}
              <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground font-bold uppercase tracking-wider">
                  EKUITAS (MODAL)
                </TableCell>
              </TableRow>
              {balanceSheet.equities.length === 0 && balanceSheet.currentUnclosedEarnings === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                    Belum ada akun ekuitas pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {balanceSheet.equities.map((eq) => (
                    <TableRow key={eq.code}>
                      <TableCell className="px-6 text-xs text-foreground pl-12">
                        {eq.name}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                        {formatBalanceAmount(eq.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {balanceSheet.currentUnclosedEarnings !== 0 ? (
                    <TableRow>
                      <TableCell className="px-6 text-xs italic text-muted-foreground pl-12">
                        Laba (Rugi) Periode Berjalan (Belum Ditutup)
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                        {formatBalanceAmount(balanceSheet.currentUnclosedEarnings)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </>
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                  Total Ekuitas
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatBalanceAmount(totalEquity)}
                </TableCell>
              </TableRow>

              {/* TOTAL LIABILITAS & EKUITAS */}
              <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground uppercase tracking-wide">
                  TOTAL LIABILITAS DAN EKUITAS
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatBalanceAmount(balanceSheet.totalLiabilitiesAndEquity)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
