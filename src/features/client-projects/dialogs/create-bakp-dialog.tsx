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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/formatters";
import type { MilestoneRow } from "@/types/database.types";

interface CreateBakpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: MilestoneRow[];
  bakpDate: string;
  setBakpDate: (val: string) => void;
  bakpMilestoneId: string;
  setBakpMilestoneId: (val: string) => void;
  bakpCumPct: number;
  setBakpCumPct: (val: number) => void;
  bakpBillable: number;
  setBakpBillable: (val: number) => void;
  bakpNotes: string;
  setBakpNotes: (val: string) => void;
  bakpApprovedNow: boolean;
  setBakpApprovedNow: (val: boolean) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CreateBakpDialog({
  open,
  onOpenChange,
  milestones,
  bakpDate,
  setBakpDate,
  bakpMilestoneId,
  setBakpMilestoneId,
  bakpCumPct,
  setBakpCumPct,
  bakpBillable,
  setBakpBillable,
  bakpNotes,
  setBakpNotes,
  bakpApprovedNow,
  setBakpApprovedNow,
  saving,
  onSave,
}: CreateBakpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Berita Acara Kemajuan Pekerjaan (BAKP)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="bakp-date" required>Tanggal BAKP</FieldLabel>
              <DatePicker
                id="bakp-date"
                required
                value={bakpDate}
                onChange={setBakpDate}
              />
            </Field>
            <Field>
              <FieldLabel required>Termin Terkait</FieldLabel>
              {milestones.length === 0 ? (
                <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                  Jadwal termin belum disusun. Silakan susun termin terlebih dahulu pada tab Termin &amp; Progres.
                </p>
              ) : (
                <Select
                  value={bakpMilestoneId}
                  onValueChange={(id) => {
                    setBakpMilestoneId(id);
                    const found = milestones.find((m) => m.id === id);
                    if (found) setBakpBillable(found.amount);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih termin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {milestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({formatRupiah(m.amount)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bakp-pct" required>Capaian Kumulatif (%)</FieldLabel>
                <NumberInput
                  id="bakp-pct"
                  allowDecimal
                  maxDecimals={2}
                  min={0}
                  max={100}
                  value={bakpCumPct}
                  onValueChange={setBakpCumPct}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bakp-amt" required>
                  Nilai Tagihan Termin (Rp)
                </FieldLabel>
                <NumberInput
                  id="bakp-amt"
                  allowDecimal={false}
                  min={0}
                  value={bakpBillable}
                  onValueChange={setBakpBillable}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="bakp-notes">Catatan Pemeriksaan</FieldLabel>
              <Textarea
                id="bakp-notes"
                value={bakpNotes}
                onChange={(e) => setBakpNotes(e.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="bakp-app">
                Telah Disetujui Klien
              </FieldLabel>
              <Switch
                id="bakp-app"
                checked={bakpApprovedNow}
                onCheckedChange={setBakpApprovedNow}
              />
            </Field>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || milestones.length === 0}
                className="cursor-pointer"
              >
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Simpan BAKP
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
