import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, maskNpwp } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { TaxSimulationRow } from "./profit-sharing-types";

interface ProfitSharingTaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxSimulationRows: TaxSimulationRow[];
  totalSimGross: number;
  totalSimTax: number;
  totalSimNet: number;
}

export function ProfitSharingTaxDialog({
  open,
  onOpenChange,
  taxSimulationRows,
  totalSimGross,
  totalSimTax,
  totalSimNet,
}: ProfitSharingTaxDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t("profit_sharing:tax_modal_title", "Simulasi Pajak PPh 21 Bagi Hasil")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">
              {t("profit_sharing:tax_modal_rule_title", "Dasar Perhitungan PPh 21 Bukan Pegawai (PMK 168/2023):")}
            </p>
            <p>
              {t(
                "profit_sharing:tax_modal_rule_desc",
                "Dasar Pengenaan Pajak (DPP) dihitung 50% dari bruto, dikenakan Tarif Progresif Pasal 17 Ayat (1) Huruf a UU PPh berdasarkan status PTKP. Anggota tanpa NPWP dikenakan penalti tarif 20% lebih tinggi.",
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-4 pr-2 text-center font-semibold">{t("profit_sharing:col_recipient", "Penerima")}</TableHead>
                  <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_ptkp", "Status PTKP")}</TableHead>
                  <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_gross", "Bruto")}</TableHead>
                  <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_dpp", "DPP (50%)")}</TableHead>
                  <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_pph21", "PPh 21")}</TableHead>
                  <TableHead className="pl-2 pr-4 text-center font-semibold">{t("profit_sharing:col_net", "Bagi Hasil Bersih")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxSimulationRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      {t("profit_sharing:no_lines_to_simulate", "Belum ada hasil bagi hasil untuk disimulasikan.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  taxSimulationRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4 pr-2 font-medium text-foreground">
                        <div>{row.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.isCompany
                            ? t("profit_sharing:modals.company_internal_share", "Bagian Kas Perusahaan")
                            : row.hasNpwp
                              ? `NPWP: ${maskNpwp(row.npwp!)}`
                              : t("profit_sharing:no_npwp_penalty", "Tanpa NPWP (+20%)")}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 text-center text-xs">
                        {row.isCompany ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary dark:text-sky-400 font-semibold text-[11px]">
                            {row.ptkpCode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 text-right text-xs tabular-nums font-medium text-foreground">
                        {formatRupiah(row.gross)}
                      </TableCell>
                      <TableCell className="px-2 text-right text-xs tabular-nums text-muted-foreground">
                        {formatRupiah(row.dpp)}
                      </TableCell>
                      <TableCell className="px-2 text-right text-xs tabular-nums text-destructive font-semibold">
                        {row.tax > 0 ? `- ${formatRupiah(row.tax)}` : "Rp 0"}
                      </TableCell>
                      <TableCell className="pl-2 pr-4 text-right text-xs tabular-nums text-primary dark:text-sky-400 font-bold">
                        {formatRupiah(row.net)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border/80">
            <span className="text-sm font-bold text-foreground">
              {t("profit_sharing:total_summary", "Total Estimasi Pemotongan:")}
            </span>
            <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base font-bold tabular-nums">
              <span className="text-foreground">Bruto: {formatRupiah(totalSimGross)}</span>
              <span className="text-destructive">PPh 21: - {formatRupiah(totalSimTax)}</span>
              <span className="text-primary dark:text-sky-400 font-bold">Netto: {formatRupiah(totalSimNet)}</span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              {t("common:action.close", "Tutup")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
