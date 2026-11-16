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
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";

export interface QuotationDraftItem {
  featureName: string;
  description: string;
  costAmount: number;
}

interface CreateQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qtDate: string;
  setQtDate: (val: string) => void;
  qtValidUntil: string;
  setQtValidUntil: (val: string) => void;
  qtWeeks: number;
  setQtWeeks: (val: number) => void;
  qtRevisions: number;
  setQtRevisions: (val: number) => void;
  qtNeedSummary: string;
  setQtNeedSummary: (val: string) => void;
  qtItems: QuotationDraftItem[];
  setQtItems: React.Dispatch<React.SetStateAction<QuotationDraftItem[]>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CreateQuotationDialog({
  open,
  onOpenChange,
  qtDate,
  setQtDate,
  qtValidUntil,
  setQtValidUntil,
  qtWeeks,
  setQtWeeks,
  qtRevisions,
  setQtRevisions,
  qtNeedSummary,
  setQtNeedSummary,
  qtItems,
  setQtItems,
  saving,
  onSave,
}: CreateQuotationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Terbitkan Quotation Penawaran Harga</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="qt-date" required>Tanggal Quotation</FieldLabel>
                <DatePicker
                  id="qt-date"
                  required
                  value={qtDate}
                  onChange={setQtDate}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="qt-valid" required>Masa Berlaku s.d.</FieldLabel>
                <DatePicker
                  id="qt-valid"
                  required
                  value={qtValidUntil}
                  onChange={setQtValidUntil}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="qt-w">Estimasi Durasi (Minggu)</FieldLabel>
                <NumberInput
                  id="qt-w"
                  allowDecimal={false}
                  min={1}
                  value={qtWeeks}
                  onValueChange={setQtWeeks}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="qt-rev">Batas Revisi</FieldLabel>
                <NumberInput
                  id="qt-rev"
                  allowDecimal={false}
                  min={0}
                  value={qtRevisions}
                  onValueChange={setQtRevisions}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="qt-need">
                Ringkasan Kebutuhan Klien
              </FieldLabel>
              <Textarea
                id="qt-need"
                value={qtNeedSummary}
                onChange={(e) => setQtNeedSummary(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Rincian Fitur &amp; Biaya (Rp Bulat)</FieldLabel>
              <div className="flex flex-col gap-2">
                {qtItems.map((it, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Nama modul/fitur"
                      value={it.featureName}
                      onChange={(e) =>
                        setQtItems((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, featureName: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                    <Input
                      placeholder="Deskripsi singkat"
                      value={it.description}
                      onChange={(e) =>
                        setQtItems((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, description: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                    <NumberInput
                      allowDecimal={false}
                      min={0}
                      value={it.costAmount}
                      onValueChange={(costAmount) =>
                        setQtItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, costAmount } : x,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
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
              <Button type="submit" disabled={saving} className="cursor-pointer">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Terbitkan Quotation
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
