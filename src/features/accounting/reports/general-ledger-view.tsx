import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import {
  getLocalizedAccountName,
  getLocalizedAccountType,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import type { AccountRow } from "@/types/database.types";
import { formatDateSplitz, formatLedgerCellAmount } from "./reports-common";

export interface LedgerRowData {
  journalDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountLedgerData {
  account: AccountRow;
  endingBalance: number;
  rows: LedgerRowData[];
}

interface GeneralLedgerViewProps {
  selectedLedgerAccountId: string | null;
  setSelectedLedgerAccountId: (id: string) => void;
  postableAccounts: AccountRow[];
  isAllAccounts: boolean;
  allLedgers: AccountLedgerData[];
  selectedAccount?: AccountRow;
  selectedLedgerEndingBalance: number;
  ledgerRows: LedgerRowData[];
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
}

export function GeneralLedgerView({
  selectedLedgerAccountId,
  setSelectedLedgerAccountId,
  postableAccounts,
  isAllAccounts,
  allLedgers,
  selectedAccount,
  selectedLedgerEndingBalance,
  ledgerRows,
  onExportExcel,
  onExportPdf,
  onExportCsv,
}: GeneralLedgerViewProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("accounting:reports.tab_general_ledger", "Buku Besar")}
          description={t("accounting:tabs.buku_besar_desc", "Mutasi debit-kredit dan saldo berjalan per akun COA")}
          controls={
            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              onExportCsv={onExportCsv}
              size="icon"
            />
          }
        />
        <CardContent className="p-6 space-y-6">
          <div className="max-w-md">
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("accounting:reports.select_account", "Pilih Akun")}
          </label>
          <Select
            value={selectedLedgerAccountId || "ALL"}
            onValueChange={setSelectedLedgerAccountId}
          >
            <SelectTrigger className="w-full h-10 text-xs sm:text-sm">
              <SelectValue placeholder={t("accounting:reports.all_accounts", "Pilih Semua Akun")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectGroup>
                <SelectItem value="ALL" className="font-semibold text-primary dark:text-cyan-400">
                  {t("accounting:reports.all_accounts", "Pilih Semua Akun")}
                </SelectItem>
                {postableAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {getLocalizedAccountName(a, language)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* View Semua Akun (Splitz Exact Style) */}
        {isAllAccounts ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-primary/10 border border-primary/25 p-4 rounded-xl">
              <div>
                <h3 className="font-semibold text-primary dark:text-cyan-400 text-sm sm:text-base">
                  {t("accounting:reports.tab_general_ledger", "Buku Besar")}: {t("accounting:reports.all_accounts", "Semua Akun")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {language === "en"
                    ? "Classified per account with respective tables (Oldest to Newest order)."
                    : "Diklasifikasikan per akun dengan tabel masing-masing (Urutan Terlama ke Terbaru)."}
                </p>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-primary dark:text-cyan-400 shrink-0">
                {allLedgers.length} {language === "en" ? "active accounts" : "akun aktif"}
              </div>
            </div>

            {allLedgers.map((item) => (
              <div
                key={item.account.id}
                className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-border/70 p-4 bg-muted/30">
                  <div>
                    <h4 className="font-bold text-foreground text-base sm:text-lg">
                      {item.account.code} - {getLocalizedAccountName(item.account, language)}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === "en" ? "Type: " : "Tipe: "}
                      {getLocalizedAccountType(item.account.account_type, language)} | {language === "en" ? "Normal Balance: " : "Saldo Normal: "}
                      {["asset", "expense"].includes(item.account.account_type) ? "Debit" : (language === "en" ? "Credit" : "Kredit")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      {t("accounting:reports.ending_balance", "Saldo Akhir")}
                    </span>
                    <div className="text-lg sm:text-xl font-bold text-primary dark:text-cyan-400">
                      Rp {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(item.endingBalance)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 border-b border-border/70 text-foreground/80 text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-32">
                          {t("accounting:journals.col_date", "Tanggal")}
                        </th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">
                          {t("accounting:journals.col_description", "Keterangan")}
                        </th>
                        <th className="px-6 py-4 font-semibold text-center w-44 sm:w-48">Debit (Rp)</th>
                        <th className="px-6 py-4 font-semibold text-center w-44 sm:w-48">
                          {language === "en" ? "Credit (Rp)" : "Kredit (Rp)"}
                        </th>
                        <th className="px-6 py-4 font-semibold text-center w-48 sm:w-52">
                          {t("accounting:reports.running_balance", "Saldo Berjalan")} (Rp)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-foreground">
                      {item.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            {language === "en"
                              ? "No transactions for this account in the selected period."
                              : "Belum ada mutasi untuk akun ini pada periode terpilih."}
                          </td>
                        </tr>
                      ) : (
                        item.rows.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateSplitz(entry.journalDate)}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-foreground">
                              {getLocalizedTransactionDescription(entry.description, language)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs">
                              {formatLedgerCellAmount(entry.debit)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs">
                              {formatLedgerCellAmount(entry.credit)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs font-semibold text-foreground">
                              {formatLedgerCellAmount(entry.runningBalance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {allLedgers.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                {language === "en"
                  ? "No transactions found for any account in the selected period."
                  : "Belum ada mutasi untuk semua akun pada periode terpilih."}
              </div>
            )}
          </div>
        ) : selectedAccount ? (
          /* View Akun Tunggal (Splitz Single Account View) */
          <div>
            <div className="mb-4 flex justify-between items-center bg-primary/10 border border-primary/20 p-4 rounded-xl">
              <div>
                <h3 className="font-semibold text-primary dark:text-cyan-400 text-sm sm:text-base">
                  {t("accounting:reports.ending_balance", "Saldo Akhir")}: {getLocalizedAccountName(selectedAccount, language)}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {language === "en" ? "Running balance reflects Normal Balance (" : "Perhitungan berjalan menyesuaikan Saldo Normal ("}
                  {["asset", "expense"].includes(selectedAccount.account_type) ? "Debit" : (language === "en" ? "Credit" : "Kredit")})
                </p>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary dark:text-cyan-400">
                Rp {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(selectedLedgerEndingBalance)}
              </div>
            </div>

            <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border/70 text-foreground/80 text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-32">
                        {t("accounting:journals.col_date", "Tanggal")}
                      </th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">
                        {t("accounting:journals.col_description", "Keterangan")}
                      </th>
                      <th className="px-6 py-4 font-semibold text-center w-44 sm:w-48">Debit (Rp)</th>
                      <th className="px-6 py-4 font-semibold text-center w-44 sm:w-48">
                        {language === "en" ? "Credit (Rp)" : "Kredit (Rp)"}
                      </th>
                      <th className="px-6 py-4 font-semibold text-center w-48 sm:w-52">
                        {t("accounting:reports.running_balance", "Saldo Berjalan")} (Rp)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground">
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          {language === "en"
                            ? "No transactions for this account in the selected period."
                            : "Belum ada mutasi untuk akun ini pada periode terpilih."}
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateSplitz(entry.journalDate)}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-foreground">
                            {getLocalizedTransactionDescription(entry.description, language)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs">
                            {formatLedgerCellAmount(entry.debit)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs">
                            {formatLedgerCellAmount(entry.credit)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs font-semibold text-foreground">
                            {formatLedgerCellAmount(entry.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
