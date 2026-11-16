import * as React from "react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateID } from "@/lib/formatters";
import { runOptionalReversingEntries } from "@/lib/operations-service";
import type { PeriodRow } from "@/types/database.types";

export interface PeriodReversingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periods: PeriodRow[];
  onSuccess: () => Promise<void> | void;
}

export function PeriodReversingDialog({
  open,
  onOpenChange,
  periods,
  onSuccess,
}: PeriodReversingDialogProps) {
  const [sourcePeriodId, setSourcePeriodId] = React.useState("");
  const [reversingDate, setReversingDate] = React.useState("2027-01-01");
  const [runningReverse, setRunningReverse] = React.useState(false);

  async function handleRunReverse(e: React.FormEvent) {
    e.preventDefault();
    if (!sourcePeriodId) return;
    setRunningReverse(true);
    try {
      const count = await runOptionalReversingEntries(
        sourcePeriodId,
        reversingDate,
      );
      toast.success(
        count > 0
          ? `${count} jurnal pembalik awal periode berhasil diterbitkan.`
          : "Tidak ada jurnal penyesuaian yang ditandai pembalik pada periode asal (0 jurnal diterbitkan).",
      );
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal menjalankan jurnal pembalik.",
      );
    } finally {
      setRunningReverse(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Jalankan Jurnal Pembalik Awal Periode</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRunReverse}>
          <FieldGroup>
            <Field>
              <FieldLabel required>Periode Asal AJP</FieldLabel>
              <Select
                value={sourcePeriodId}
                onValueChange={setSourcePeriodId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode asal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({formatDateID(p.start_date)} – {formatDateID(p.end_date)})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="rev-date" required>
                Tanggal Efektif Pembalik
              </FieldLabel>
              <DatePicker
                id="rev-date"
                required
                value={reversingDate}
                onChange={setReversingDate}
              />
            </Field>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={runningReverse}>
                {runningReverse ? <Spinner data-icon="inline-start" /> : null}
                Jalankan Pembalik
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
