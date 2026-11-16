import * as React from "react";
import { PlusIcon, ScaleIcon } from "lucide-react";
import { toast } from "sonner";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/formatters";
import {
  createManualOrAdjustmentJournal,
  updateJournal,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";

export interface PeriodManualClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJournal: JournalRow | null;
  postableAccounts: AccountRow[];
  linesByJournal: Map<string, JournalLineRow[]>;
  defaultDate: string;
  onSuccess: () => Promise<void> | void;
}

export function PeriodManualClosingDialog({
  open,
  onOpenChange,
  editingJournal,
  postableAccounts,
  linesByJournal,
  defaultDate,
  onSuccess,
}: PeriodManualClosingDialogProps) {
  const [manualDate, setManualDate] = React.useState(defaultDate);
  const [manualDescription, setManualDescription] = React.useState(
    "Jurnal Penutup Manual Akhir Periode",
  );
  const [debitLines, setDebitLines] = React.useState<
    Array<{ accountId: string; amount: number }>
  >([{ accountId: "", amount: 0 }]);
  const [creditLines, setCreditLines] = React.useState<
    Array<{ accountId: string; amount: number }>
  >([{ accountId: "", amount: 0 }]);
  const [postingManual, setPostingManual] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editingJournal) {
        setManualDate(editingJournal.journal_date);
        setManualDescription(
          editingJournal.description || "Jurnal Penutup Manual Akhir Periode",
        );
        const jLines = (linesByJournal.get(editingJournal.id) ?? []).sort(
          (a, b) => a.line_no - b.line_no,
        );
        const debLines = jLines.filter((l) => l.debit > 0);
        const credLines = jLines.filter((l) => l.credit > 0);
        setDebitLines(
          debLines.length > 0
            ? debLines.map((l) => ({ accountId: l.account_id, amount: l.debit }))
            : [{ accountId: "", amount: 0 }],
        );
        setCreditLines(
          credLines.length > 0
            ? credLines.map((l) => ({ accountId: l.account_id, amount: l.credit }))
            : [{ accountId: "", amount: 0 }],
        );
      } else {
        setManualDate(defaultDate || new Date().toISOString().slice(0, 10));
        setManualDescription("Jurnal Penutup Manual Akhir Periode");
        setDebitLines([{ accountId: "", amount: 0 }]);
        setCreditLines([{ accountId: "", amount: 0 }]);
      }
    }
  }, [open, editingJournal, defaultDate, linesByJournal]);

  const totalDebit = debitLines.reduce(
    (s, l) => s + (Number(l.amount) || 0),
    0,
  );
  const totalCredit = creditLines.reduce(
    (s, l) => s + (Number(l.amount) || 0),
    0,
  );
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  async function handlePostManualClosing(e: React.FormEvent) {
    e.preventDefault();
    if (!isBalanced) {
      toast.error(
        "Total Debit dan Kredit jurnal penutup harus seimbang dan tidak boleh kosong.",
      );
      return;
    }
    const validDebits = debitLines.filter((l) => l.accountId && l.amount > 0);
    const validCredits = creditLines.filter((l) => l.accountId && l.amount > 0);
    if (validDebits.length === 0 || validCredits.length === 0) {
      toast.error("Lengkapi akun debit dan kredit jurnal penutup.");
      return;
    }

    setPostingManual(true);
    try {
      const linesInput = [
        ...validDebits.map((d) => ({
          accountId: d.accountId,
          description: manualDescription,
          debit: d.amount,
          credit: 0,
        })),
        ...validCredits.map((c) => ({
          accountId: c.accountId,
          description: manualDescription,
          debit: 0,
          credit: c.amount,
        })),
      ];

      if (editingJournal) {
        await updateJournal({
          journalId: editingJournal.id,
          journalDate: manualDate,
          journalType: "closing",
          description: manualDescription,
          projectId: editingJournal.project_id,
          autoReverseNextPeriod: false,
          lines: linesInput,
        });
        toast.success(
          `Jurnal penutup ${editingJournal.journal_number} berhasil diperbarui.`,
        );
      } else {
        await createManualOrAdjustmentJournal({
          journalDate: manualDate,
          journalType: "closing",
          description: manualDescription,
          projectId: null,
          autoReverseNextPeriod: false,
          lines: linesInput,
        });
        toast.success("Jurnal penutup manual berhasil dibukukan.");
      }

      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memposting jurnal penutup manual.",
      );
    } finally {
      setPostingManual(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingJournal
              ? `Edit Jurnal Penutup (${editingJournal.journal_number})`
              : "Catat Jurnal Penutup Manual"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handlePostManualClosing} className="space-y-5">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel required>Tanggal Jurnal</FieldLabel>
                <DatePicker value={manualDate} onChange={setManualDate} />
              </Field>
              <Field>
                <FieldLabel required>Deskripsi Transaksi Penutup</FieldLabel>
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  required
                  placeholder="Penutupan akun nominal akhir periode..."
                />
              </Field>
            </div>

            {/* Grid 2 Kolom: Sisi Debit & Sisi Kredit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Sisi Debit */}
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="text-xs font-bold text-foreground tracking-wide">
                    Sisi Debit
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDebitLines((prev) => [...prev, { accountId: "", amount: 0 }])
                    }
                    className="h-7 text-xs font-semibold text-primary dark:text-cyan-400 gap-1"
                  >
                    <PlusIcon className="size-3" /> Tambah Akun
                  </Button>
                </div>
                {debitLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="space-y-2 p-2.5 rounded-xl border border-border/60 bg-card"
                  >
                    <Select
                      value={line.accountId}
                      onValueChange={(val) => {
                        const updated = [...debitLines];
                        updated[idx]!.accountId = val;
                        setDebitLines(updated);
                      }}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Pilih Akun Debit..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {postableAccounts.map((a) => (
                          <SelectItem
                            key={a.id}
                            value={a.id}
                            className="text-xs"
                          >
                            {a.code}: {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <NumberInput
                      allowDecimal={false}
                      min={0}
                      placeholder="Nominal Debit (Rp)"
                      value={line.amount || 0}
                      onValueChange={(val) => {
                        const updated = [...debitLines];
                        updated[idx]!.amount = val;
                        setDebitLines(updated);
                      }}
                      className="text-xs"
                    />
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 text-xs font-bold">
                  <span>Total Debit:</span>
                  <span className="text-primary dark:text-cyan-400">
                    {formatRupiah(totalDebit)}
                  </span>
                </div>
              </div>

              {/* Sisi Kredit */}
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="text-xs font-bold text-foreground tracking-wide">
                    Sisi Kredit
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCreditLines((prev) => [...prev, { accountId: "", amount: 0 }])
                    }
                    className="h-7 text-xs font-semibold text-primary dark:text-cyan-400 gap-1"
                  >
                    <PlusIcon className="size-3" /> Tambah Akun
                  </Button>
                </div>
                {creditLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="space-y-2 p-2.5 rounded-xl border border-border/60 bg-card"
                  >
                    <Select
                      value={line.accountId}
                      onValueChange={(val) => {
                        const updated = [...creditLines];
                        updated[idx]!.accountId = val;
                        setCreditLines(updated);
                      }}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Pilih Akun Kredit..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {postableAccounts.map((a) => (
                          <SelectItem
                            key={a.id}
                            value={a.id}
                            className="text-xs"
                          >
                            {a.code}: {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <NumberInput
                      allowDecimal={false}
                      min={0}
                      placeholder="Nominal Kredit (Rp)"
                      value={line.amount || 0}
                      onValueChange={(val) => {
                        const updated = [...creditLines];
                        updated[idx]!.amount = val;
                        setCreditLines(updated);
                      }}
                      className="text-xs"
                    />
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 text-xs font-bold">
                  <span>Total Kredit:</span>
                  <span className="text-primary dark:text-cyan-400">
                    {formatRupiah(totalCredit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Keseimbangan */}
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border text-xs font-semibold mt-3",
                isBalanced
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
              )}
            >
              <div className="flex items-center gap-2">
                <ScaleIcon className="size-4" />
                <span>
                  {isBalanced
                    ? "Jurnal Seimbang (Balanced)"
                    : "Jurnal Belum Seimbang (Selisih Debit - Kredit)"}
                </span>
              </div>
              <span>
                Selisih: {formatRupiah(Math.abs(totalDebit - totalCredit))}
              </span>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={!isBalanced || postingManual}>
                {postingManual ? <Spinner data-icon="inline-start" /> : null}
                Rekam Transaksi
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
