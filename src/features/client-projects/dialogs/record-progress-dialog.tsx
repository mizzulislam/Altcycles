import * as React from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { formatRupiah, roundRupiah } from "@/lib/formatters";

interface RecordProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractValue: number;
  revenueMethod?: string;
  maxProgressPct: number;
  progressDate: string;
  setProgressDate: (val: string) => void;
  cumulativePct: number;
  setCumulativePct: (val: number) => void;
  useExactRevenueOverride: boolean;
  setUseExactRevenueOverride: (val: boolean) => void;
  exactRevenueOverride: number;
  setExactRevenueOverride: (val: number) => void;
  enableAutoReverse: boolean;
  setEnableAutoReverse: (val: boolean) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function RecordProgressDialog({
  open,
  onOpenChange,
  contractValue,
  revenueMethod,
  maxProgressPct,
  progressDate,
  setProgressDate,
  cumulativePct,
  setCumulativePct,
  useExactRevenueOverride,
  setUseExactRevenueOverride,
  exactRevenueOverride,
  setExactRevenueOverride,
  enableAutoReverse,
  setEnableAutoReverse,
  saving,
  onSave,
}: RecordProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Persentase Penyelesaian Proyek</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="prog-date" required>
                Tanggal Pengakuan Akhir Periode
              </FieldLabel>
              <DatePicker
                id="prog-date"
                required
                value={progressDate}
                onChange={setProgressDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prog-pct" required>
                Persentase Penyelesaian Kumulatif (0% – 100%)
              </FieldLabel>
              <NumberInput
                id="prog-pct"
                allowDecimal
                maxDecimals={2}
                min={maxProgressPct}
                max={100}
                required
                value={cumulativePct}
                onValueChange={setCumulativePct}
              />
              <FieldDescription>
                Estimasi nilai kumulatif proporsional:{" "}
                {formatRupiah(
                  roundRupiah((contractValue * cumulativePct) / 100),
                )}
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="prog-override">
                Tetapkan Nominal Rupiah Kumulatif Eksak (mis. pecahan 2/3 =
                Rp80.000.000)
              </FieldLabel>
              <Switch
                id="prog-override"
                checked={useExactRevenueOverride}
                onCheckedChange={setUseExactRevenueOverride}
              />
            </Field>
            {useExactRevenueOverride ? (
              <Field>
                <FieldLabel htmlFor="prog-exact-val">
                  Pendapatan Kumulatif Eksak (Rp Bulat)
                </FieldLabel>
                <NumberInput
                  id="prog-exact-val"
                  allowDecimal={false}
                  min={0}
                  max={contractValue}
                  value={exactRevenueOverride}
                  onValueChange={setExactRevenueOverride}
                />
              </Field>
            ) : null}
            {revenueMethod === "two_term_accrual" ? (
              <Field orientation="horizontal">
                <FieldLabel htmlFor="prog-rev-2t">
                  Aktifkan Jurnal Pembalik Awal Tahun Berikutnya (Opsional 2
                  Termin)
                </FieldLabel>
                <Switch
                  id="prog-rev-2t"
                  checked={enableAutoReverse}
                  onCheckedChange={setEnableAutoReverse}
                />
              </Field>
            ) : null}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="cursor-pointer">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Simpan &amp; Posting Pendapatan
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
