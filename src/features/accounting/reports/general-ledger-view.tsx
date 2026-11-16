import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_TYPE_LABELS } from "@/lib/formatters";
import type { AccountRow } from "@/types/database.types";
import { formatDateSplitz, formatSplitzCurrency } from "./reports-common";

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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Buku Besar
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            Melihat rincian mutasi (Debit/Kredit) dan Saldo Akhir per Akun tunggal.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
            onExportExcel={onExportExcel}
            onExportPdf={onExportPdf}
            onExportCsv={onExportCsv}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-foreground mb-2">Pilih Akun</label>
          <Select
            value={selectedLedgerAccountId || "ALL"}
            onValueChange={setSelectedLedgerAccountId}
          >
            <SelectTrigger className="w-full h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Pilih Semua Akun" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectGroup>
                <SelectItem value="ALL" className="font-semibold text-primary dark:text-cyan-400">
                  Pilih Semua Akun
                </SelectItem>
                {postableAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
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
                  Buku Besar: Semua Akun
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Diklasifikasikan per akun dengan tabel masing-masing (Urutan Terlama ke Terbaru).
                </p>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-primary dark:text-cyan-400 shrink-0">
                {allLedgers.length} akun aktif
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
                      {item.account.code} - {item.account.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tipe: {ACCOUNT_TYPE_LABELS[item.account.account_type] ?? item.account.account_type} | Saldo Normal:{" "}
                      {["asset", "expense"].includes(item.account.account_type) ? "Debit" : "Kredit"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-muted-foreground block">Saldo Akhir</span>
                    <div className="text-lg sm:text-xl font-bold text-primary dark:text-cyan-400">
                      Rp {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(item.endingBalance)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 border-b border-border/70 text-foreground/80 text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-32">Tanggal</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Keterangan</th>
                        <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Debit</th>
                        <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Kredit</th>
                        <th className="px-6 py-4 font-semibold text-center w-52 sm:w-60">Saldo Berjalan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-foreground">
                      {item.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            Belum ada mutasi untuk akun ini pada periode terpilih.
                          </td>
                        </tr>
                      ) : (
                        item.rows.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateSplitz(entry.journalDate)}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-foreground">
                              {entry.description}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs">
                              {formatSplitzCurrency(entry.debit)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs">
                              {formatSplitzCurrency(entry.credit)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs font-semibold text-foreground">
                              {formatSplitzCurrency(entry.runningBalance)}
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
                Belum ada mutasi untuk semua akun pada periode terpilih.
              </div>
            )}
          </div>
        ) : selectedAccount ? (
          /* View Akun Tunggal (Splitz Single Account View) */
          <div>
            <div className="mb-4 flex justify-between items-center bg-primary/10 border border-primary/20 p-4 rounded-xl">
              <div>
                <h3 className="font-semibold text-primary dark:text-cyan-400 text-sm sm:text-base">
                  Saldo Akhir: {selectedAccount.name}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Perhitungan berjalan menyesuaikan Saldo Normal (
                  {["asset", "expense"].includes(selectedAccount.account_type) ? "Debit" : "Kredit"})
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
                      <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-32">Tanggal</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Keterangan</th>
                      <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Debit</th>
                      <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Kredit</th>
                      <th className="px-6 py-4 font-semibold text-center w-52 sm:w-60">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground">
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          Belum ada mutasi untuk akun ini pada periode terpilih.
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateSplitz(entry.journalDate)}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-foreground">
                            {entry.description}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs">
                            {formatSplitzCurrency(entry.debit)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs">
                            {formatSplitzCurrency(entry.credit)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs font-semibold text-foreground">
                            {formatSplitzCurrency(entry.runningBalance)}
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
      </div>
    </div>
  );
}
