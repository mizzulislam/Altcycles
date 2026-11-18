import * as React from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  PlusIcon,
  ScaleIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AccountRow, JournalRow } from "@/types/database.types";

export interface DraftLineEntry {
  accountId: string;
  amount: string;
}

interface JournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJournal: JournalRow | null;
  filterMode: "all" | "adjusting" | "project";
  journalDate: string;
  setJournalDate: (val: string) => void;
  journalType: "general" | "adjustment";
  setJournalType: (val: "general" | "adjustment") => void;
  description: string;
  setDescription: (val: string) => void;
  autoReverse: boolean;
  setAutoReverse: (val: boolean) => void;
  draftDebits: DraftLineEntry[];
  addDebitRow: () => void;
  removeDebitRow: (idx: number) => void;
  updateDebitRow: (idx: number, patch: Partial<DraftLineEntry>) => void;
  draftCredits: DraftLineEntry[];
  addCreditRow: () => void;
  removeCreditRow: (idx: number) => void;
  updateCreditRow: (idx: number, patch: Partial<DraftLineEntry>) => void;
  postableAccounts: AccountRow[];
  totalDraftDebit: number;
  totalDraftCredit: number;
  isDraftBalanced: boolean;
  balanceDiff: number;
  posting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function JournalEntryDialog({
  open,
  onOpenChange,
  editingJournal,
  filterMode,
  journalDate,
  setJournalDate,
  journalType,
  setJournalType,
  description,
  setDescription,
  autoReverse,
  setAutoReverse,
  draftDebits,
  addDebitRow,
  removeDebitRow,
  updateDebitRow,
  draftCredits,
  addCreditRow,
  removeCreditRow,
  updateCreditRow,
  postableAccounts,
  totalDraftDebit,
  totalDraftCredit,
  isDraftBalanced,
  balanceDiff,
  posting,
  onSubmit,
  onCancel,
}: JournalEntryDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingJournal
              ? `${t("journal.modal_edit_title", "Edit Transaksi Jurnal")} (${editingJournal.journal_number})`
              : filterMode === "adjusting"
                ? t("journal.modal_create_adj_title", "Buat & Posting Jurnal Penyesuaian (AJP)")
                : t("journal.modal_create_title", "Buat & Posting Jurnal Baru")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="j-date" required>
                  {t("journal.date", "Tanggal Jurnal")}
                </FieldLabel>
                <DatePicker
                  id="j-date"
                  value={journalDate}
                  onChange={setJournalDate}
                  required
                />
              </Field>
              <Field>
                <FieldLabel required>{t("journal.type", "Jenis Jurnal")}</FieldLabel>
                <Select
                  value={journalType}
                  onValueChange={(v) =>
                    setJournalType(v as "general" | "adjustment")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="general">{t("journal.type_general", "Jurnal Umum")}</SelectItem>
                      <SelectItem value="adjustment">
                        {t("journal.type_adjustment", "Jurnal Penyesuaian (AJP)")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="j-desc" required>
                {t("journal.description", "Keterangan")}
              </FieldLabel>
              <Input
                id="j-desc"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("journal.desc_placeholder", "Contoh: Penyesuaian beban sewa kantor bersama bulan berjalan")}
              />
            </Field>

            {journalType === "adjustment" ? (
              <Field orientation="horizontal">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor="j-rev">
                    {t("journal.auto_reverse", "Tandai untuk Jurnal Pembalik Awal Periode Berikutnya (Opsional)")}
                  </FieldLabel>
                  <FieldDescription>
                    {t("journal.auto_reverse_desc", "Diterapkan otomatis pada saat proses Tutup Buku periode berjalan.")}
                  </FieldDescription>
                </div>
                <Switch
                  id="j-rev"
                  checked={autoReverse}
                  onCheckedChange={setAutoReverse}
                />
              </Field>
            ) : null}

            {/* Container Baris Ayat Jurnal (DEBIT & KREDIT side by side - Proporsional & Terstruktur) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DEBIT Container */}
              <div className="rounded-xl border border-border/70 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/50 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      {t("journal.debit_side", "Sisi Debit")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addDebitRow}
                    className="text-xs h-7 px-2.5 rounded-lg text-cyan-600 dark:text-cyan-300 hover:text-cyan-500 dark:hover:text-cyan-200 border-cyan-500/30 dark:border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 font-medium transition-colors cursor-pointer"
                  >
                    <PlusIcon data-icon="inline-start" className="size-3.5 mr-1" />
                    {t("journal.add_account", "Tambah Akun")}
                  </Button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-0.5 no-scrollbar">
                  {draftDebits.map((d, idx) => (
                    <div
                      key={`deb-${idx}`}
                      className="rounded-lg border border-border/60 dark:border-white/5 bg-background/70 dark:bg-[#0c1424] p-3 space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                          {t("accounting.th_account", "Akun")} {draftDebits.length > 1 ? `#${idx + 1}` : t("accounting.th_debit", "Debit")}
                        </span>
                        {draftDebits.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Hapus baris debit"
                            onClick={() => removeDebitRow(idx)}
                            className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Select
                          value={d.accountId}
                          onValueChange={(val) =>
                            updateDebitRow(idx, { accountId: val })
                          }
                        >
                          <SelectTrigger className="w-full text-xs sm:text-sm">
                            <SelectValue placeholder={t("journal.select_debit", "-- Pilih Akun Debit --")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {postableAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code}: {a.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70 font-medium pointer-events-none select-none">
                            Rp
                          </span>
                          <NumberInput
                            allowDecimal={false}
                            min={0}
                            placeholder="0"
                            value={Number(d.amount || 0)}
                            onValueChange={(val) =>
                              updateDebitRow(idx, {
                                amount: val > 0 ? String(val) : "",
                              })
                            }
                            className="pl-8 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 mt-auto border-t border-border/50 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {t("journal.total_debit", "Total Debit")}
                  </span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                    {formatRupiah(totalDraftDebit)}
                  </span>
                </div>
              </div>

              {/* KREDIT Container */}
              <div className="rounded-xl border border-border/70 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/50 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      {t("journal.credit_side", "Sisi Kredit")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCreditRow}
                    className="text-xs h-7 px-2.5 rounded-lg text-blue-600 dark:text-blue-300 hover:text-blue-500 dark:hover:text-blue-200 border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 font-medium transition-colors cursor-pointer"
                  >
                    <PlusIcon data-icon="inline-start" className="size-3.5 mr-1" />
                    {t("journal.add_account", "Tambah Akun")}
                  </Button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-0.5 no-scrollbar">
                  {draftCredits.map((c, idx) => (
                    <div
                      key={`cred-${idx}`}
                      className="rounded-lg border border-border/60 dark:border-white/5 bg-background/70 dark:bg-[#0c1424] p-3 space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                          {t("accounting.th_account", "Akun")} {draftCredits.length > 1 ? `#${idx + 1}` : t("accounting.th_credit", "Kredit")}
                        </span>
                        {draftCredits.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Hapus baris kredit"
                            onClick={() => removeCreditRow(idx)}
                            className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Select
                          value={c.accountId}
                          onValueChange={(val) =>
                            updateCreditRow(idx, { accountId: val })
                          }
                        >
                          <SelectTrigger className="w-full text-xs sm:text-sm">
                            <SelectValue placeholder={t("journal.select_credit", "-- Pilih Akun Kredit --")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {postableAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code}: {a.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70 font-medium pointer-events-none select-none">
                            Rp
                          </span>
                          <NumberInput
                            allowDecimal={false}
                            min={0}
                            placeholder="0"
                            value={Number(c.amount || 0)}
                            onValueChange={(val) =>
                              updateCreditRow(idx, {
                                amount: val > 0 ? String(val) : "",
                              })
                            }
                            className="pl-8 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 mt-auto border-t border-border/50 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {t("journal.total_credit", "Total Kredit")}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {formatRupiah(totalDraftCredit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modern Balance Indicator Bar (Skema Desain Altcycles) */}
            <div
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-200",
                isDraftBalanced
                  ? "bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent border-cyan-500/40 dark:border-cyan-500/50 shadow-xs"
                  : "bg-muted/40 dark:bg-[#0c1322] border-border/80"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    isDraftBalanced
                      ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <ScaleIcon className="size-4" />
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
                  <span className="text-cyan-600 dark:text-cyan-400">
                    D: {formatRupiah(totalDraftDebit)}
                  </span>
                  <div className="w-px h-3.5 bg-border" />
                  <span className="text-blue-600 dark:text-blue-400">
                    K: {formatRupiah(totalDraftCredit)}
                  </span>
                </div>
              </div>

              {isDraftBalanced ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                  <CheckCircle2Icon className="size-3.5" />
                  {t("journal.balanced", "SEIMBANG")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <AlertTriangleIcon className="size-3.5" />
                  {totalDraftDebit === 0 && totalDraftCredit === 0
                    ? t("journal.empty_amount", "NOMINAL KOSONG")
                    : `${t("journal.difference", "SELISIH")}: ${formatRupiah(balanceDiff)}`}
                </span>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                {t("action.cancel", "Batal")}
              </Button>
              <Button type="submit" disabled={posting || !isDraftBalanced}>
                {posting ? <Spinner data-icon="inline-start" /> : null}
                {editingJournal ? t("action.save", "Simpan Perubahan") : t("journal.btn_post", "Rekam Transaksi")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
