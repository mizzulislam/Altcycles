import { SlidersHorizontalIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";

export function JournalsAccountingAssumptions() {
  const { t } = useLanguage();

  return (
    <Card className="p-5 border-border/80 bg-card shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontalIcon className="size-4 text-primary dark:text-cyan-400" />
        <h3 className="font-bold text-sm text-foreground">
          {t("accounting:journals.assumptions_title", "Penerapan Asumsi Akuntansi Keuangan")}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <h4 className="font-semibold text-xs text-foreground">
              {t("accounting:journals.assumption_periodicity", "Periodisitas (Periodicity)")}
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(
              "accounting:journals.assumption_periodicity_desc",
              "Membagi aktivitas ekonomi entitas ke dalam periode waktu bulanan/tahunan untuk penyajian laporan yang tepat waktu dan relevan.",
            )}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <h4 className="font-semibold text-xs text-foreground">
              {t("accounting:journals.assumption_deferral", "Penangguhan (Deferral)")}
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(
              "accounting:journals.assumption_deferral_desc",
              "Pendapatan diterima dimuka dicatat sebagai kewajiban dan direalisasikan bertahap menjadi pendapatan pada periode manfaat.",
            )}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <h4 className="font-semibold text-xs text-foreground">
              {t("accounting:journals.assumption_accrual", "Asas Akrual (Accrual Basis)")}
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(
              "accounting:journals.assumption_accrual_desc",
              "Mencatat pengaruh transaksi pada periode terjadinya, bukan sekadar saat kas diterima atau dikeluarkan, guna mencerminkan posisi keuangan yang andal.",
            )}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <h4 className="font-semibold text-xs text-foreground">
              {t("accounting:journals.assumption_depreciation", "Depresiasi (Depreciation)")}
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(
              "accounting:journals.assumption_depreciation_desc",
              "Mengalokasikan harga perolehan aset tetap secara berkala ke Beban Penyusutan berpasangan dengan Akumulasi Penyusutan.",
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
