import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPeriod } from "@/lib/data-service";
import { FULL_MONTHS_EN, FULL_MONTHS_ID } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";

export interface PeriodCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
}

export function PeriodCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: PeriodCreateDialogProps) {
  const { t, language: lang } = useLanguage();
  const [year, setYear] = React.useState(2027);
  const [month, setMonth] = React.useState("2");
  const [creating, setCreating] = React.useState(false);

  const months = lang === "en" ? FULL_MONTHS_EN : FULL_MONTHS_ID;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createPeriod(year, Number(month));
      const mName = months[Number(month) - 1] ?? month;
      toast.success(
        t("accounting:closing.toast_period_opened", {
          name: `${mName} ${year}`,
          defaultValue: `Periode ${mName} ${year} berhasil dibuka.`,
        }),
      );
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:closing.toast_period_open_error", "Gagal membuat periode."),
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("accounting:closing.create_period_title", "Buka Periode Akuntansi Baru")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="p-year" required>
                  {t("accounting:closing.create_period_year", "Tahun Buku")}
                </FieldLabel>
                <Input
                  id="p-year"
                  type="number"
                  min={2024}
                  max={2100}
                  required
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel required>
                  {t("accounting:closing.create_period_month", "Bulan")}
                </FieldLabel>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {months.map((mLabel, idx) => {
                        const mVal = String(idx + 1);
                        const padM = mVal.padStart(2, "0");
                        return (
                          <SelectItem key={mVal} value={mVal}>
                            {padM} — {mLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <ModalFooterAction
              className="mt-4"
              onCancel={() => onOpenChange(false)}
              saving={creating}
              cancelLabel={t("common:action.cancel", "Batal")}
              submitLabel={t("accounting:closing.create_period_submit", "Buka Periode")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
