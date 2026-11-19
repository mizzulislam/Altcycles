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
import { getLocalizedPeriodName } from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
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
  const { t, language: lang } = useLanguage();
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
          ? t("accounting:closing.toast_rev_success", {
              count,
              defaultValue: `${count} jurnal pembalik awal periode berhasil diterbitkan.`,
            })
          : t("accounting:closing.toast_rev_none", "Tidak ada jurnal penyesuaian yang ditandai pembalik pada periode asal (0 jurnal diterbitkan)."),
      );
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:closing.toast_rev_error", "Gagal menjalankan jurnal pembalik."),
      );
    } finally {
      setRunningReverse(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("accounting:closing.rev_modal_title", "Jalankan Jurnal Pembalik Awal Periode")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRunReverse}>
          <FieldGroup>
            <Field>
              <FieldLabel required>
                {t("accounting:closing.rev_period_label", "Periode Asal AJP")}
              </FieldLabel>
              <Select
                value={sourcePeriodId}
                onValueChange={setSourcePeriodId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("accounting:closing.rev_period_placeholder", "Pilih periode asal...")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {getLocalizedPeriodName(p.name, lang)} ({formatDateID(p.start_date)} – {formatDateID(p.end_date)})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="rev-date" required>
                {t("accounting:closing.rev_effective_date", "Tanggal Efektif Pembalik")}
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
                {t("common:action.cancel", "Batal")}
              </Button>
              <Button type="submit" disabled={runningReverse}>
                {runningReverse ? <Spinner data-icon="inline-start" /> : null}
                {t("accounting:closing.rev_run_btn", "Jalankan Pembalik")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
