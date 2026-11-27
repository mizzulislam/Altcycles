import * as React from "react";
import { createPortal } from "react-dom";
import { FilterIcon } from "lucide-react";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { TOOLBAR_BUTTON_CLASS } from "@/components/shared/toolbar-button";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
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
  selectedLedgerAccountId?: string | null;
  setSelectedLedgerAccountId?: (id: string) => void;
  postableAccounts: AccountRow[];
  isAllAccounts?: boolean;
  allLedgers: AccountLedgerData[];
  selectedAccount?: AccountRow;
  selectedLedgerEndingBalance?: number;
  ledgerRows?: LedgerRowData[];
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
}

export function GeneralLedgerView({
  postableAccounts,
  allLedgers,
  onExportExcel,
  onExportPdf,
  onExportCsv,
}: GeneralLedgerViewProps) {
  const { t, language } = useLanguage();

  // Multi-select state untuk akun Buku Besar
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>(() =>
    postableAccounts.map((a) => a.id),
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number; isUpward: boolean } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // Sinkronisasi jika daftar postableAccounts bertambah/berkurang
  React.useEffect(() => {
    if (selectedAccountIds.length === 0 && postableAccounts.length > 0) {
      setSelectedAccountIds(postableAccounts.map((a) => a.id));
    }
  }, [postableAccounts]);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 320;
    const menuHeight = 360;
    const padding = 12;

    let left = rect.right - menuWidth;
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const isUpward = spaceBelow < menuHeight && rect.top > menuHeight;
    const top = isUpward ? rect.top - menuHeight - 6 : rect.bottom + 6;

    const newCoords = {
      top: Math.round(top),
      left: Math.round(left),
      isUpward,
    };
    setCoords(newCoords);
    return newCoords;
  }, []);

  const handleToggle = React.useCallback(() => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  const isAllSelected =
    postableAccounts.length > 0 &&
    selectedAccountIds.length === postableAccounts.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccountIds(postableAccounts.map((a) => a.id));
    } else {
      setSelectedAccountIds([]);
    }
  };

  const toggleAccount = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccountIds((prev) => [...prev, accountId]);
    } else {
      setSelectedAccountIds((prev) => prev.filter((id) => id !== accountId));
    }
  };

  // Filter ledgers berdasarkan pilihan akun pengguna
  const displayedLedgers = React.useMemo(() => {
    if (isAllSelected || selectedAccountIds.length === 0) {
      return allLedgers;
    }
    const idSet = new Set(selectedAccountIds);
    return allLedgers.filter((item) => idSet.has(item.account.id));
  }, [allLedgers, selectedAccountIds, isAllSelected]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("accounting:reports.tab_general_ledger", "Buku Besar")}
          description={t(
            "accounting:tabs.buku_besar_desc",
            "Mutasi debit-kredit dan saldo berjalan per akun COA",
          )}
          controls={
            <div className="flex items-center gap-2">
              {/* Multi-select filter icon button */}
              <ActionTooltip
                content={t("accounting:reports.filter_accounts", "Filter Akun Buku Besar")}
              >
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={handleToggle}
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={t("accounting:reports.filter_accounts", "Filter Akun Buku Besar")}
                >
                  <FilterIcon className="size-4" />
                  <span className="sr-only">
                    {t("accounting:reports.filter_accounts", "Filter Akun Buku Besar")}
                  </span>
                </button>
              </ActionTooltip>

              {isOpen &&
                coords &&
                typeof document !== "undefined" &&
                createPortal(
                  <div
                    ref={menuRef}
                    style={{
                      position: "fixed",
                      top: `${coords.top}px`,
                      left: `${coords.left}px`,
                      width: "320px",
                    }}
                    className="z-[99999] p-3.5 rounded-2xl space-y-2.5 bg-card text-foreground border border-border/80 shadow-2xl duration-150 animate-in fade-in-0 zoom-in-95 select-none"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <span className="text-xs font-bold text-foreground">
                        {t("accounting:reports.filter_accounts", "Filter Akun Buku Besar")}
                      </span>
                      <span className="text-[11px] font-semibold text-primary dark:text-cyan-400">
                        {displayedLedgers.length} {language === "en" ? "active" : "aktif"}
                      </span>
                    </div>

                    {/* Opsi Pilih Semua Akun */}
                    <div className="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-muted/40 transition-colors">
                      <Checkbox
                        id="ledger-all-accounts"
                        checked={isAllSelected}
                        indeterminate={
                          selectedAccountIds.length > 0 &&
                          selectedAccountIds.length < postableAccounts.length
                        }
                        onCheckedChange={(c) => toggleSelectAll(!!c)}
                      />
                      <label
                        htmlFor="ledger-all-accounts"
                        className="text-xs font-semibold text-foreground cursor-pointer select-none flex-1"
                      >
                        {t("accounting:reports.all_accounts", "Pilih Semua Akun")}
                      </label>
                    </div>

                    <div className="border-t border-border/60 my-1" />

                    {/* Daftar Akun dengan Checkbox */}
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                      {postableAccounts.map((a) => {
                        const isChecked = selectedAccountIds.includes(a.id);
                        return (
                          <div
                            key={a.id}
                            className="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <Checkbox
                              id={`acc-${a.id}`}
                              checked={isChecked}
                              onCheckedChange={(c) => toggleAccount(a.id, !!c)}
                            />
                            <label
                              htmlFor={`acc-${a.id}`}
                              className="text-xs text-foreground/90 cursor-pointer select-none flex-1 truncate"
                            >
                              <span className="font-semibold text-primary dark:text-cyan-400 mr-1.5">
                                {a.code}
                              </span>
                              {getLocalizedAccountName(a, language)}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>,
                  document.body,
                )}

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
        <CardContent className="p-6 space-y-6">
          <div className="space-y-6">
            {displayedLedgers.map((item) => (
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
                      {getLocalizedAccountType(item.account.account_type, language)} |{" "}
                      {language === "en" ? "Normal Balance: " : "Saldo Normal: "}
                      {["asset", "expense"].includes(item.account.account_type)
                        ? "Debit"
                        : language === "en"
                          ? "Credit"
                          : "Kredit"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      {t("accounting:reports.ending_balance", "Saldo Akhir")}
                    </span>
                    <div className="text-lg sm:text-xl font-bold text-primary dark:text-cyan-400">
                      Rp{" "}
                      {new Intl.NumberFormat("id-ID", {
                        minimumFractionDigits: 0,
                      }).format(item.endingBalance)}
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
                        <th className="px-6 py-4 font-semibold text-center w-44 sm:w-48">
                          Debit (Rp)
                        </th>
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
                          <td
                            colSpan={5}
                            className="px-6 py-8 text-center text-muted-foreground"
                          >
                            {language === "en"
                              ? "No transactions for this account in the selected period."
                              : "Belum ada mutasi untuk akun ini pada periode terpilih."}
                          </td>
                        </tr>
                      ) : (
                        item.rows.map((entry, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateSplitz(entry.journalDate)}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-foreground">
                              {getLocalizedTransactionDescription(
                                entry.description,
                                language,
                              )}
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

            {displayedLedgers.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                {language === "en"
                  ? "No transactions found for the selected accounts in this period."
                  : "Belum ada mutasi untuk akun terpilih pada periode ini."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
