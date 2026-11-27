import * as React from "react";
import {
  ArrowUpDownIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
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
import {
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
import { ActionTooltip } from "@/components/ui/action-tooltip";

function formatJournalDate(val: string | null | undefined, lang: "id" | "en" = "id"): string {
  if (!val) return "-";
  const monthsId = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const monthsEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const months = lang === "en" ? monthsEn : monthsId;
  const parts = val.split("-");
  const y = parts[0];
  const mStr = parts[1];
  const d = parts[2];
  if (!y || !mStr || !d) return val;
  const mIdx = Number.parseInt(mStr, 10) - 1;
  const mName = months[mIdx] ?? mStr;
  return `${d} ${mName} ${y}`;
}

export interface PeriodClosingTableProps {
  closingJournals: JournalRow[];
  linesByJournal: Map<string, JournalLineRow[]>;
  accountMap: Map<string, AccountRow>;
  loading: boolean;
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  selectedClosingIds: string[];
  setSelectedClosingIds: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenManualClosing: () => void;
  onEditClosingJournal: (j: JournalRow) => void;
  onViewDetailJournal: (j: JournalRow) => void;
  onDeleteSingleClosing: (j: JournalRow) => void;
  onOpenBatchDelete: () => void;
  onOpenReversing?: () => void;
}

export function PeriodClosingTable({
  closingJournals,
  linesByJournal,
  accountMap,
  loading,
  sortOrder,
  onToggleSortOrder,
  isEditMode,
  setIsEditMode,
  selectedClosingIds,
  setSelectedClosingIds,
  onOpenManualClosing,
  onEditClosingJournal,
  onViewDetailJournal,
  onDeleteSingleClosing,
  onOpenBatchDelete,
  onOpenReversing,
}: PeriodClosingTableProps) {
  const { t, language: lang } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("accounting:closing.table_card_title", "Jurnal Penutup")}
        description={t("accounting:closing.table_card_desc", "Historis entri jurnal penutup akun nominal yang tersimpan pada sistem pembukuan.")}
        headerClassName="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 px-6 py-4"
        controls={
          <div className="flex flex-wrap items-center gap-2.5">
            {sortOrder === "desc" ? (
              <ActionTooltip content={`${t("accounting:journals.order", "Urutan:")} ${t("accounting:journals.order_newest", "Terbaru")}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onToggleSortOrder}
                  className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                  aria-label={`${t("accounting:journals.order", "Urutan:")} ${t("accounting:journals.order_newest", "Terbaru")}`}
                >
                  <ArrowUpDownIcon className="size-4 text-primary" />
                  <span className="sr-only">{t("accounting:journals.order", "Urutan:")}</span>
                </Button>
              </ActionTooltip>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleSortOrder}
                className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shrink-0 cursor-pointer border-primary/40 bg-primary/5 text-primary"
              >
                <ArrowUpDownIcon className="size-3.5 shrink-0" />
                <span className="truncate">
                  {t("accounting:journals.order", "Urutan:")}{" "}
                  {sortOrder === "asc"
                    ? t("accounting:journals.order_oldest", "Terlama")
                    : t("accounting:journals.order_newest", "Terbaru")}
                </span>
              </Button>
            )}

            {!isEditMode ? (
              <ActionTooltip content={t("common:action.edit", "Edit")}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditMode(true)}
                  className="size-9 rounded-xl shrink-0 cursor-pointer text-primary dark:text-cyan-400 border-primary/30 hover:bg-primary/10 shadow-2xs"
                  aria-label={t("common:action.edit", "Edit")}
                >
                  <PencilIcon className="size-4" />
                  <span className="sr-only">{t("common:action.edit", "Edit")}</span>
                </Button>
              </ActionTooltip>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedClosingIds([]);
                  }}
                  className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {t("common:action.cancel", "Batal")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={selectedClosingIds.length === 0}
                  onClick={onOpenBatchDelete}
                  className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <Trash2Icon className="size-3.5" />
                  <span>
                    {t("accounting:closing.btn_delete_selected", "Hapus Pilihan")} ({selectedClosingIds.length})
                  </span>
                </Button>
              </div>
            )}

            {onOpenReversing && (
              <ActionTooltip content={t("accounting:closing.btn_optional_reversing", "Jurnal Pembalik Opsional")}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onOpenReversing}
                  className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                  aria-label={t("accounting:closing.btn_optional_reversing", "Jurnal Pembalik Opsional")}
                >
                  <RotateCcwIcon className="size-4" />
                  <span className="sr-only">{t("accounting:closing.btn_optional_reversing", "Jurnal Pembalik Opsional")}</span>
                </Button>
              </ActionTooltip>
            )}

            <ActionTooltip content={t("accounting:closing.btn_record_manual", "Catat Jurnal Penutup Manual")}>
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={onOpenManualClosing}
                className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                aria-label={t("accounting:closing.btn_record_manual", "Catat Jurnal Penutup Manual")}
              >
                <PlusIcon className="size-4" />
                <span className="sr-only">{t("accounting:closing.btn_record_manual", "Catat Jurnal Penutup Manual")}</span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />
      <CardContent className="p-0">
        <Table className="w-full min-w-[680px] table-fixed">
          <TableHeader className="bg-muted/30">
            <TableRow>
              {isEditMode && (
                <TableHead className="w-12 text-center align-middle px-3">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        closingJournals.length > 0 &&
                        selectedClosingIds.length === closingJournals.length
                      }
                      indeterminate={
                        selectedClosingIds.length > 0 &&
                        selectedClosingIds.length < closingJournals.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClosingIds(closingJournals.map((j) => j.id));
                        } else {
                          setSelectedClosingIds([]);
                        }
                      }}
                      aria-label={t("accounting:closing.select_all_aria", "Pilih semua jurnal penutup")}
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
                  "text-center font-semibold text-xs sm:text-sm text-foreground/80",
                  isEditMode ? "w-[82px]" : "w-[110px]",
                )}
              >
                {t("accounting:journals.col_ref", "Ref")}
              </TableHead>
              <TableHead
                className={cn(
                  "text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80",
                  isEditMode ? "w-[155px]" : "w-[195px]",
                )}
              >
                {t("accounting:journals.col_debit", "Debit")}
              </TableHead>
              <TableHead
                className={cn(
                  "text-center pl-4 pr-6 font-semibold text-xs sm:text-sm text-foreground/80",
                  isEditMode ? "w-[155px]" : "w-[195px]",
                )}
              >
                {t("accounting:journals.col_credit", "Kredit")}
              </TableHead>
              {isEditMode && (
                <TableHead className="w-[112px] text-center pr-6 font-semibold text-xs sm:text-sm text-foreground/80">
                  {t("accounting:journals.col_actions", "Aksi")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && closingJournals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isEditMode ? 7 : 5}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Spinner />
                    <span>{t("accounting:closing.loading_closing_journals", "Memuat jurnal penutup...")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : closingJournals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isEditMode ? 7 : 5}
                  className="h-36 text-center text-muted-foreground"
                >
                  <EmptyState
                    title={t("accounting:closing.empty_closing_title", "Belum ada jurnal penutup aktual pada periode ini")}
                    description={t("accounting:closing.empty_closing_desc", "Gunakan tombol 'Catat Jurnal Penutup Manual' atau jalankan tutup buku otomatis saat menutup periode bulanan.")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              closingJournals.map((j) => {
                const jLines = (linesByJournal.get(j.id) ?? []).sort(
                  (a, b) => a.line_no - b.line_no,
                );
                const rowDebitLines = jLines.filter((l) => l.debit > 0);
                const rowCreditLines = jLines.filter((l) => l.credit > 0);
                const journalRows = [...rowDebitLines, ...rowCreditLines];

                return (
                  <TableRow
                    key={j.id}
                    className="hover:bg-muted/20 border-b border-border/60 transition-colors"
                  >
                    {isEditMode && (
                      <TableCell className="align-top py-4 text-center px-3">
                        <Checkbox
                          checked={selectedClosingIds.includes(j.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClosingIds((prev) =>
                                prev.includes(j.id) ? prev : [...prev, j.id],
                              );
                            } else {
                              setSelectedClosingIds((prev) =>
                                prev.filter((id) => id !== j.id),
                              );
                            }
                          }}
                          className="mt-0.5"
                          aria-label={`${t("common:action.select", "Pilih")} ${j.journal_number}`}
                        />
                      </TableCell>
                    )}

                    {/* TANGGAL */}
                    <TableCell className="align-top py-4 pl-6 pr-3 text-left whitespace-nowrap">
                      <span className="font-medium text-xs sm:text-sm text-foreground">
                        {formatJournalDate(j.journal_date, lang)}
                      </span>
                    </TableCell>

                    {/* DESKRIPSI */}
                    <TableCell className="align-top py-4 px-4 min-w-0">
                      <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                        {rowDebitLines.map((row, idx) => {
                          const acc = accountMap.get(row.account_id);
                          return (
                            <div
                              key={`d-${idx}`}
                              className="text-foreground font-medium min-h-5 flex items-center whitespace-normal break-words"
                            >
                              {acc
                                ? getLocalizedAccountName(acc, lang)
                                : t("accounting:journals.debit_account", "Akun Debit")}
                            </div>
                          );
                        })}
                        {rowCreditLines.map((row, idx) => {
                          const acc = accountMap.get(row.account_id);
                          return (
                            <div
                              key={`c-${idx}`}
                              className="text-foreground font-medium min-h-5 flex items-center pl-6 whitespace-normal break-words"
                            >
                              {acc
                                ? getLocalizedAccountName(acc, lang)
                                : t("accounting:journals.credit_account", "Akun Kredit")}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 max-w-[54ch] text-xs leading-relaxed text-blue-600 dark:text-cyan-400 italic font-medium whitespace-normal break-words">
                        ({getLocalizedTransactionDescription(j.description, lang)})
                      </div>
                    </TableCell>

                    {/* REF */}
                    <TableCell className="align-top py-4 text-center whitespace-nowrap">
                      <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                        {journalRows.map((row, idx) => {
                          const acc = accountMap.get(row.account_id);
                          return (
                            <div
                              key={`ref-${idx}`}
                              className="text-muted-foreground min-h-5 flex items-center justify-center text-xs tabular-nums"
                            >
                              {acc?.code ?? "-"}
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>

                    {/* DEBIT */}
                    <TableCell className="align-top py-4 px-4 text-right whitespace-nowrap">
                      <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                        {journalRows.map((row, idx) => {
                          if (row.debit > 0) {
                            return (
                              <div
                                key={`deb-${idx}`}
                                className="text-foreground font-medium flex justify-between w-full min-h-5 items-center text-xs tabular-nums"
                              >
                                <span className="text-muted-foreground mr-2 font-normal">
                                  Rp
                                </span>
                                <span>
                                  {row.debit.toLocaleString("id-ID")}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={`deb-blank-${idx}`}
                              className="text-transparent select-none flex justify-between w-full min-h-5 items-center text-xs"
                            >
                              <span>Rp</span>
                              <span>-</span>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>

                    {/* KREDIT */}
                    <TableCell className="align-top py-4 pl-4 pr-6 text-right whitespace-nowrap">
                      <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                        {journalRows.map((row, idx) => {
                          if (row.credit > 0) {
                            return (
                              <div
                                key={`cred-${idx}`}
                                className="text-foreground font-medium flex justify-between w-full min-h-5 items-center text-xs tabular-nums"
                              >
                                <span className="text-muted-foreground mr-2 font-normal">
                                  Rp
                                </span>
                                <span>
                                  {row.credit.toLocaleString("id-ID")}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={`cred-blank-${idx}`}
                              className="text-transparent select-none flex justify-between w-full h-5 items-center text-xs"
                            >
                              <span>Rp</span>
                              <span>-</span>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>

                    {/* AKSI - Hanya muncul saat mode edit aktif */}
                    {isEditMode && (
                      <TableCell className="align-top py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <ActionTooltip content={t("accounting:closing.view_detail_title", "Lihat detail transaksi")}>
                          <button
                            type="button"
                            onClick={() => onViewDetailJournal(j)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/20"
                            aria-label={t("accounting:closing.view_detail_title", "Lihat detail transaksi")}
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          </ActionTooltip>
                          <ActionTooltip content={t("accounting:closing.edit_tx_title", "Edit transaksi")}>
                          <button
                            type="button"
                            onClick={() => onEditClosingJournal(j)}
                            className="p-1.5 text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-sky-500/20"
                            aria-label={t("accounting:closing.edit_tx_title", "Edit transaksi")}
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          </ActionTooltip>
                          <ActionTooltip content={t("accounting:closing.delete_tx_title", "Hapus transaksi")}>
                          <button
                            type="button"
                            onClick={() => onDeleteSingleClosing(j)}
                            className="p-1.5 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                            aria-label={t("accounting:closing.delete_tx_title", "Hapus transaksi")}
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
      </CardContent>
    </Card>
  );
}
