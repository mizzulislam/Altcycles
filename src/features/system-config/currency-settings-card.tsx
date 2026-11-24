import * as React from "react";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeaderTitleWithInfo } from "@/components/shared/card-header-with-info";
import { NumberInput } from "@/components/ui/number-input";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  TOP_10_CURRENCIES,
  getExchangeRatesToIdr,
  getFunctionalCurrency,
  saveExchangeRatesToIdr,
  setFunctionalCurrency,
} from "@/lib/currency-service";

/**
 * Card Pengaturan Mata Uang Fungsional Sistem
 * Menampilkan pilihan 10 valuta terpopuler dunia dengan info icon GameDialog
 */
export function FunctionalCurrencyCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [functionalCurrency, setFunctionalCurrencyState] = React.useState<string>(
    () => getFunctionalCurrency(),
  );

  const selectedCurrInfo = React.useMemo(
    () => TOP_10_CURRENCIES.find((c) => c.code === functionalCurrency),
    [functionalCurrency],
  );

  function handleSelectFunctionalCurrency(curr: string) {
    setFunctionalCurrency(curr);
    setFunctionalCurrencyState(curr);
    toast.success(t("settings:currency.toast_curr_saved", { code: curr, defaultValue: `Mata uang fungsional sistem diubah ke ${curr}.` }));
  }

  return (
    <Card className={cn("rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-center min-h-[76px]", className)}>
      <div className="flex items-center justify-between gap-3 min-w-0">
        <CardHeaderTitleWithInfo
          title={t("settings:currency.functional_title", "Mata Uang Fungsional Sistem")}
          description={t("settings:currency.functional_desc", "Transaksi dalam mata uang asing otomatis ditranslasikan ke mata uang fungsional ini.")}
          titleClassName="text-xs sm:text-sm font-bold whitespace-nowrap shrink-0"
        />

        <div className="w-40 sm:w-44 shrink-0">
          <Select
            value={functionalCurrency}
            onValueChange={handleSelectFunctionalCurrency}
          >
            <SelectTrigger className="w-full h-9 rounded-xl bg-background border-border/80 shadow-2xs font-semibold text-xs">
              <span className="truncate font-mono">
                {selectedCurrInfo ? `${selectedCurrInfo.code} (${selectedCurrInfo.symbol})` : functionalCurrency}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TOP_10_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="cursor-pointer">
                    <span className="font-bold text-xs font-mono">{c.code}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      - {c.name} ({c.symbol})
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

/**
 * Card Pengaturan Kurs Konversi Valuta Asing (Valas) ke Rupiah (IDR)
 * Menampilkan grid 9 valuta acuan dengan info icon GameDialog
 */
export function ExchangeRatesCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [exchangeRates, setExchangeRatesState] = React.useState<Record<string, number>>(
    () => getExchangeRatesToIdr(),
  );
  const [savingRates, setSavingRates] = React.useState(false);

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
      toast.success(t("settings:currency.toast_rates_saved", "Kurs konversi valuta asing ke Rupiah (IDR) berhasil disimpan."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kurs.");
    } finally {
      setSavingRates(false);
    }
  }

  return (
    <Card className={cn("rounded-2xl border-border/80 bg-card p-5 shadow-2xs", className)}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardHeaderTitleWithInfo
            title={t("settings:currency.rates_title", "Kurs Konversi Valuta Asing (Valas) ke Rupiah")}
            description={t(
              "settings:currency.rates_desc",
              "Tentukan nilai kurs konversi mata uang asing terhadap Rupiah (IDR) untuk estimasi nilai kontrak, penerbitan invoice valas, dan pembukuan pengadaan luar negeri.",
            )}
            titleClassName="text-base sm:text-lg font-bold"
          />

          <Button
            type="button"
            size="sm"
            onClick={handleSaveExchangeRates}
            disabled={savingRates}
            className="h-8.5 rounded-xl px-3.5 text-xs font-semibold cursor-pointer shadow-xs gap-1.5 shrink-0 self-start sm:self-center"
          >
            <SaveIcon className="size-3.5" />
            <span>{t("settings:currency.btn_save_rates", "Simpan Kurs Konversi")}</span>
          </Button>
        </div>

        {/* Grid 9 Valuta Asing Terpopuler Dunia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {TOP_10_CURRENCIES.filter((c) => c.code !== "IDR").map((c) => {
            const currentVal = exchangeRates[c.code] ?? c.defaultRateToIdr;
            return (
              <div
                key={c.code}
                className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors flex flex-col gap-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-foreground font-mono">
                      {c.code}
                    </span>
                    <span className="text-[11px] font-semibold text-primary/80 dark:text-sky-400">
                      ({c.symbol})
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px] text-right">
                    {c.country}
                  </span>
                </div>

                <div className="relative w-full">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none select-none">
                    Rp
                  </span>
                  <NumberInput
                    value={currentVal}
                    onValueChange={(val: number) => handleRateChange(c.code, val)}
                    className="h-8.5 rounded-lg pl-8 pr-2.5 text-xs font-semibold tabular-nums text-right bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/**
 * Komponen gabungan untuk kompatibilitas jika dipanggil bersamaan
 */
export function CurrencySettingsCard() {
  return (
    <div className="flex flex-col gap-4">
      <FunctionalCurrencyCard />
      <ExchangeRatesCard />
    </div>
  );
}
