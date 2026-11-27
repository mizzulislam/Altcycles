import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { Card } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { useLanguage } from "@/lib/i18n";
import { getLocalizedAccountName } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { formatSplitzCurrency } from "./reports-common";

export interface TrialBalanceData {
  rows: Array<{
    accountId: string;
    code: string;
    name: string;
    endingDebit: number;
    endingCredit: number;
  }>;
  sumEndingDebit: number;
  sumEndingCredit: number;
}

interface TrialBalanceViewProps {
  trialBalance: TrialBalanceData;
  balanceType: "adjusted" | "unadjusted";
  setBalanceType: (type: "adjusted" | "unadjusted") => void;
  isBalanced: boolean;
  balanceDifference: number;
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
}

export function TrialBalanceView({
  trialBalance,
  balanceType,
  setBalanceType,
  onExportExcel,
  onExportPdf,
  onExportCsv,
}: TrialBalanceViewProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border-border/80 bg-card overflow-hidden shadow-2xs">
        <CardHeaderWithInfo
          title={t("accounting:reports.tab_trial_balance", "Neraca Saldo")}
          description={t(
            "accounting:tabs.neraca_saldo_desc",
            "Verifikasi keseimbangan total debit vs kredit (balancing check)",
          )}
          controls={
            <div className="flex items-center gap-2">
              {/* Selector Sebelum Penyesuaian vs Setelah Penyesuaian */}
              <div className="flex bg-muted/40 p-1 rounded-xl border border-border/70 shadow-xs text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBalanceType("unadjusted")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    balanceType === "unadjusted"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {language === "en"
                    ? "Sebelum Penyesuaian"
                    : "Sebelum Penyesuaian"}
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceType("adjusted")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    balanceType === "adjusted"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {language === "en"
                    ? "Setelah Penyesuaian"
                    : "Setelah Penyesuaian"}
                </button>
              </div>

              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
                onExportExcel={onExportExcel}
                onExportPdf={onExportPdf}
                onExportCsv={onExportCsv}
                size="icon"
              />
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/80 text-foreground/80 text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-36">
                  {t("accounting:coa.col_code", "No. Akun")}
                </th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">
                  {t("accounting:coa.col_name", "Nama Akun")}
                </th>
                <th className="px-6 py-4 font-semibold text-center w-60 sm:w-72">
                  {t("accounting:journals.col_debit", "Debit")}
                </th>
                <th className="px-6 py-4 font-semibold text-center w-60 sm:w-72">
                  {language === "en" ? "Credit" : "Kredit"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {trialBalance.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    {language === "en"
                      ? "No trial balance data in the selected period."
                      : "Belum ada data neraca saldo pada periode terpilih."}
                  </td>
                </tr>
              ) : (
                trialBalance.rows.map((item) => (
                  <tr key={item.accountId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-xs text-center text-foreground">
                      {item.code}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-foreground font-medium">
                      {getLocalizedAccountName(item, language)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs">
                      {formatSplitzCurrency(item.endingDebit)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs">
                      {formatSplitzCurrency(item.endingCredit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted/30 border-t-2 border-border/80 font-bold">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-right font-bold text-sm text-foreground">
                  {language === "en" ? "Grand Total:" : "Total Keseluruhan:"}
                </td>
                <td className="px-6 py-4 text-right font-bold text-sm text-foreground">
                  {formatSplitzCurrency(trialBalance.sumEndingDebit)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-sm text-foreground">
                  {formatSplitzCurrency(trialBalance.sumEndingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
