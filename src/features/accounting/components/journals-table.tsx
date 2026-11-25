import * as React from "react";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, Spinner } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAccountRef, roundRupiah } from "@/lib/formatters";
import {
  formatJournalDateI18n,
  getLocalizedAccountName,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";

interface JournalsTableProps {
  loading: boolean;
  sortedJournals: JournalRow[];
  lines: JournalLineRow[];
  accounts: AccountRow[];
  isEditMode: boolean;
  filterMode: "all" | "general" | "adjusting";
  selectedJournalIds: string[];
  setSelectedJournalIds: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenDetail: (j: JournalRow) => void;
  onOpenEdit: (j: JournalRow) => void;
  onOpenCorrection: (j: JournalRow) => void;
  onDeleteSingle: (j: JournalRow) => void;
}

export function JournalsTable({
  loading,
  sortedJournals,
  lines,
  accounts,
  isEditMode,
  filterMode,
  selectedJournalIds,
  setSelectedJournalIds,
  onOpenDetail,
  onOpenEdit,
  onOpenCorrection,
  onDeleteSingle,
}: JournalsTableProps) {
  const { t, language } = useLanguage();

  return (
    <Table className="w-full min-w-[680px] table-fixed">
      <TableHeader className="bg-muted/30">
        <TableRow>
          {isEditMode && (
            <TableHead className="w-12 text-center align-middle px-3">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={
                    sortedJournals.length > 0 &&
                    selectedJournalIds.length === sortedJournals.length
                  }
                  indeterminate={
                    selectedJournalIds.length > 0 &&
                    selectedJournalIds.length < sortedJournals.length
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedJournalIds(sortedJournals.map((j) => j.id));
                    } else {
                      setSelectedJournalIds([]);
                    }
                  }}
                  aria-label={t(
                    "accounting:journals.select_all_aria",
                    "Pilih semua transaksi",
                  )}
                />
              </div>
            </TableHead>
          )}
          <TableHead
            className={cn(
              "text-center pl-6 pr-3 font-semibold text-xs sm:text-sm text-foreground/80",
              isEditMode ? "w-[120px]" : "w-[140px]",
            )}
          >
            {t("accounting:journals.col_date", "Tanggal")}
          </TableHead>
          <TableHead className="text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80">
            {t("accounting:journals.col_description", "Deskripsi")}
          </TableHead>
          <TableHead
            className={cn(
              "text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80",
              isEditMode ? "w-[100px]" : "w-[110px]",
            )}
          >
            {t("accounting:journals.col_ref", "Ref")}
          </TableHead>
          <TableHead
            className={cn(
              "text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80",
              isEditMode ? "w-[150px]" : "w-[170px]",
            )}
          >
            {t("accounting:journals.col_debit", "Debit")}
          </TableHead>
          <TableHead
            className={cn(
              "text-center pl-4 pr-6 font-semibold text-xs sm:text-sm text-foreground/80",
              isEditMode ? "w-[150px]" : "w-[170px]",
            )}
          >
            {t("accounting:journals.col_credit", "Kredit")}
          </TableHead>
          {isEditMode && (
            <TableHead className="w-[112px] text-center pr-6 font-semibold text-xs sm:text-sm text-foreground/80">
              {t("accounting:journals.col_action", "Aksi")}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell
              colSpan={isEditMode ? 7 : 5}
              className="h-32 text-center text-muted-foreground"
            >
              <div className="flex items-center justify-center gap-2">
                <Spinner />
                <span>
                  {t(
                    "accounting:journals.loading_journals",
                    "Memuat buku jurnal...",
                  )}
                </span>
              </div>
            </TableCell>
          </TableRow>
        ) : sortedJournals.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={isEditMode ? 7 : 5}
              className="h-36 text-center text-muted-foreground"
            >
              <EmptyState
                title={
                  filterMode === "adjusting"
                    ? t(
                        "accounting:journals.no_adj_journal",
                        "Belum ada Ayat Jurnal Penyesuaian (AJP)",
                      )
                    : t(
                        "accounting:journals.no_general_journal",
                        "Belum ada transaksi jurnal umum pada periode ini",
                      )
                }
                description={
                  filterMode === "adjusting"
                    ? t(
                        "accounting:journals.no_adj_journal_desc",
                        "Gunakan tombol 'Catat Jurnal Penyesuaian' untuk menambahkan penyesuaian beban akrual, amortisasi, atau pengakuan pendapatan sewa/jasa di muka.",
                      )
                    : t(
                        "accounting:journals.no_general_journal_desc",
                        "Gunakan tombol 'Catat Transaksi' atau sesuaikan saringan periode dan proyek.",
                      )
                }
              />
            </TableCell>
          </TableRow>
        ) : (
          sortedJournals.map((j) => {
            const jLines = lines
              .filter((l) => l.journal_id === j.id)
              .sort((a, b) => a.line_no - b.line_no);
            const debitLines = jLines.filter((l) => l.debit > 0);
            const creditLines = jLines.filter((l) => l.credit > 0);
            const journalRows = [...debitLines, ...creditLines];

            return (
              <TableRow
                key={j.id}
                className="hover:bg-muted/20 border-b border-border/60 transition-colors"
              >
                {/* Checkbox Kolom Pilihan saat Edit Mode */}
                {isEditMode && (
                  <TableCell className="align-top py-4 text-center px-3">
                    <Checkbox
                      checked={selectedJournalIds.includes(j.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedJournalIds([
                            ...selectedJournalIds,
                            j.id,
                          ]);
                        } else {
                          setSelectedJournalIds(
                            selectedJournalIds.filter((id) => id !== j.id),
                          );
                        }
                      }}
                      aria-label={t(
                        "accounting:journals.select_row_aria",
                        {
                          num: j.journal_number,
                          defaultValue: `Pilih transaksi ${j.journal_number}`,
                        },
                      )}
                    />
                  </TableCell>
                )}

                {/* Kolom 1: Tanggal Transaksi */}
                <TableCell className="align-top py-4 pl-6 pr-3 text-left whitespace-nowrap">
                  <div className="font-semibold text-xs sm:text-sm text-foreground/90">
                    {formatJournalDateI18n(j.journal_date, language)}
                  </div>
                </TableCell>

                {/* Kolom 2: Deskripsi & Daftar Akun Terpengaruh */}
                <TableCell className="align-top py-4 px-4 min-w-0">
                  <div className="space-y-1.5">
                    <div className="font-semibold text-xs sm:text-sm text-foreground leading-snug">
                      {getLocalizedTransactionDescription(j.description, language)}
                    </div>
                    <div className="space-y-1 pt-1">
                      {journalRows.map((line, idx) => {
                        const acc = accounts.find((a) => a.id === line.account_id);
                        const isCredit = line.credit > 0;
                        return (
                          <div
                            key={line.id || idx}
                            className={cn(
                              "text-xs leading-relaxed truncate",
                              isCredit
                                ? "pl-5 text-muted-foreground font-normal"
                                : "text-foreground/90 font-medium",
                            )}
                          >
                            <span>
                              {acc
                                ? getLocalizedAccountName(acc, language)
                                : t("accounting:journals.account_fallback", "Akun")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TableCell>

                {/* Kolom 3: Ref Akun */}
                <TableCell className="align-top py-4 text-center whitespace-nowrap">
                  <div className="space-y-1 pt-6 sm:pt-6">
                    {journalRows.map((line, idx) => {
                      const acc = accounts.find((a) => a.id === line.account_id);
                      return (
                        <div
                          key={line.id || idx}
                          className="text-xs text-muted-foreground/80 font-normal leading-relaxed text-center"
                        >
                          {acc ? formatAccountRef(acc.code) : "-"}
                        </div>
                      );
                    })}
                  </div>
                </TableCell>

                {/* Kolom 4: Debit */}
                <TableCell className="align-top py-4 px-4 text-right whitespace-nowrap">
                  <div className="space-y-1 pt-6 sm:pt-6">
                    {journalRows.map((line, idx) => (
                      <div
                        key={line.id || idx}
                        className={cn(
                          "text-xs leading-relaxed",
                          line.debit > 0
                            ? "font-semibold text-foreground/90 tabular-nums"
                            : "text-transparent select-none",
                        )}
                      >
                        {line.debit > 0 ? (
                          <div className="flex items-center justify-between gap-3 w-full tabular-nums">
                            <span className="text-muted-foreground font-normal select-none">
                              Rp
                            </span>
                            <span>{roundRupiah(line.debit).toLocaleString("id-ID")}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </div>
                    ))}
                  </div>
                </TableCell>

                {/* Kolom 5: Kredit */}
                <TableCell className="align-top py-4 pl-4 pr-6 text-right whitespace-nowrap">
                  <div className="space-y-1 pt-6 sm:pt-6">
                    {journalRows.map((line, idx) => (
                      <div
                        key={line.id || idx}
                        className={cn(
                          "text-xs leading-relaxed",
                          line.credit > 0
                            ? "font-semibold text-foreground/90 tabular-nums"
                            : "text-transparent select-none",
                        )}
                      >
                        {line.credit > 0 ? (
                          <div className="flex items-center justify-between gap-3 w-full tabular-nums">
                            <span className="text-muted-foreground font-normal select-none">
                              Rp
                            </span>
                            <span>{roundRupiah(line.credit).toLocaleString("id-ID")}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </div>
                    ))}
                  </div>
                </TableCell>

                {/* Kolom 6: Aksi (Hanya muncul saat Edit Mode aktif) */}
                {isEditMode && (
                  <TableCell className="align-top py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <ActionTooltip content={t("accounting:journals.detail_tooltip", "Lihat detail jurnal")}>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(j)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border/60"
                        aria-label={t("accounting:journals.view_tx_title", "Lihat detail transaksi")}
                      >
                        <EyeIcon className="size-4" />
                      </button>
                      </ActionTooltip>
                      <ActionTooltip content={t("accounting:journals.edit_tooltip", "Ubah / Koreksi jurnal")}>
                      <button
                        type="button"
                        onClick={() => {
                          if (j.status === "posted") {
                            onOpenCorrection(j);
                          } else {
                            onOpenEdit(j);
                          }
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border/60"
                        aria-label={t("accounting:journals.edit_tx_title", "Ubah transaksi")}
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      </ActionTooltip>
                      <ActionTooltip content={t("accounting:journals.delete_tooltip", "Hapus transaksi ini")}>
                      <button
                        type="button"
                        onClick={() => onDeleteSingle(j)}
                        className="p-1.5 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                        aria-label={t("accounting:journals.delete_tx_title", "Hapus transaksi")}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                      </ActionTooltip>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
