import * as React from "react";
import { CoinsIcon, GlobeIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TOP_10_CURRENCIES,
  getExchangeRatesToIdr,
  getFunctionalCurrency,
  saveExchangeRatesToIdr,
  setFunctionalCurrency,
} from "@/lib/currency-service";

/**
 * Komponen Pengaturan Mata Uang Fungsional & Kurs Valuta Asing
 * Menampilkan:
 * 1. Card Mata Uang Fungsional (10 valuta terpopuler dunia)
 * 2. Card Kurs Konversi Valas ke Rupiah (IDR)
 */
export function CurrencySettingsCard() {
  const [functionalCurrency, setFunctionalCurrencyState] = React.useState<string>(
    () => getFunctionalCurrency(),
  );
  const [exchangeRates, setExchangeRatesState] = React.useState<Record<string, number>>(
    () => getExchangeRatesToIdr(),
  );
  const [savingRates, setSavingRates] = React.useState(false);

  function handleSelectFunctionalCurrency(curr: string) {
    setFunctionalCurrency(curr);
    setFunctionalCurrencyState(curr);
    toast.success(`Mata uang fungsional sistem diubah ke ${curr}.`);
  }

  function handleRateChange(currencyCode: string, newRate: number) {
    setExchangeRatesState((prev) => ({
      ...prev,
      [currencyCode]: newRate,
    }));
  }

  async function handleSaveExchangeRates() {
    setSavingRates(true);
    try {
      saveExchangeRatesToIdr(exchangeRates);
      toast.success("Kurs konversi valuta asing ke Rupiah (IDR) berhasil disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kurs.");
    } finally {
      setSavingRates(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
      {/* Card 1: Pengaturan Mata Uang Fungsional */}
      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
              <GlobeIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                Mata Uang Fungsional
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Standar pelaporan akuntansi entitas
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Mata uang utama dari lingkungan ekonomi utama tempat Altvira beroperasi (sesuai ketentuan PSAK 10 / IAS 21). Transaksi dalam mata uang asing akan ditranslasikan ke mata uang fungsional ini.
          </p>

          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-foreground">
              Pilih Mata Uang Utama:
            </label>
            <Select
              value={functionalCurrency}
              onValueChange={handleSelectFunctionalCurrency}
            >
              <SelectTrigger className="w-full h-9 rounded-xl bg-background">
                <SelectValue placeholder="Pilih mata uang" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TOP_10_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{c.code}</span>
                        <span className="text-xs text-muted-foreground">
                          - {c.name} ({c.symbol})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status Aktif:</span>
          <StatusBadge tone="success" label={`${functionalCurrency} (Fungsional)`} />
        </div>
      </Card>

      {/* Card 2: Kurs Mata Uang Asing & Konversi Rupiah */}
      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs lg:col-span-8 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <CoinsIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                  Kurs Valuta Asing ke Rupiah (IDR)
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  10 mata uang terpopuler dalam transaksi ekonomi global
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveExchangeRates}
              disabled={savingRates}
              className="h-8.5 rounded-xl px-3.5 text-xs font-semibold cursor-pointer shadow-xs gap-1.5 shrink-0 self-start sm:self-center"
            >
              <SaveIcon className="size-3.5" />
              <span>Simpan Kurs Valas</span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Tentukan nilai kurs konversi mata uang asing terhadap Rupiah (IDR) untuk perhitungan estimasi kontrak, penagihan invoice, atau pengadaan luar negeri.
          </p>

          {/* Grid 9 Valuta Asing Terpopuler Dunia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {TOP_10_CURRENCIES.filter((c) => c.code !== "IDR").map((c) => {
              const currentVal = exchangeRates[c.code] ?? c.defaultRateToIdr;
              return (
                <div
                  key={c.code}
                  className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs text-foreground font-mono">
                        {c.code}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        ({c.symbol})
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 truncate">
                      {c.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      Rp
                    </span>
                    <NumberInput
                      value={currentVal}
                      onValueChange={(val: number) => handleRateChange(c.code, val)}
                      className="h-8 text-xs font-semibold tabular-nums bg-background"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
