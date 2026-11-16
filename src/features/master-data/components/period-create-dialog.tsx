import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPeriod } from "@/lib/data-service";

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
  const [year, setYear] = React.useState(2027);
  const [month, setMonth] = React.useState("2");
  const [creating, setCreating] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createPeriod(year, Number(month));
      toast.success("Periode akuntansi baru berhasil dibuka.");
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat periode.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buka Periode Akuntansi Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="p-year" required>
                  Tahun Buku
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
                <FieldLabel required>Bulan</FieldLabel>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">01 — Januari</SelectItem>
                      <SelectItem value="2">02 — Februari</SelectItem>
                      <SelectItem value="3">03 — Maret</SelectItem>
                      <SelectItem value="4">04 — April</SelectItem>
                      <SelectItem value="5">05 — Mei</SelectItem>
                      <SelectItem value="6">06 — Juni</SelectItem>
                      <SelectItem value="7">07 — Juli</SelectItem>
                      <SelectItem value="8">08 — Agustus</SelectItem>
                      <SelectItem value="9">09 — September</SelectItem>
                      <SelectItem value="10">10 — Oktober</SelectItem>
                      <SelectItem value="11">11 — November</SelectItem>
                      <SelectItem value="12">12 — Desember</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Spinner data-icon="inline-start" /> : null}
                Buka Periode
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
