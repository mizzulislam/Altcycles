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
import { UAT_CONCLUSION_META } from "../components/project-detail-shared";
import type { UatChecklistRow } from "@/types/database.types";

interface CreateBastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uatList: UatChecklistRow[];
  bastDate: string;
  setBastDate: (val: string) => void;
  bastUatId: string;
  setBastUatId: (val: string) => void;
  bastWarrantyDays: number;
  setBastWarrantyDays: (val: number) => void;
  bastSigned: boolean;
  setBastSigned: (val: boolean) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CreateBastDialog({
  open,
  onOpenChange,
  uatList,
  bastDate,
  setBastDate,
  bastUatId,
  setBastUatId,
  bastWarrantyDays,
  setBastWarrantyDays,
  bastSigned,
  setBastSigned,
  saving,
  onSave,
}: CreateBastDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Terbitkan Berita Acara Serah Terima (BAST)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="bast-date" required>Tanggal BAST</FieldLabel>
              <DatePicker
                id="bast-date"
                required
                value={bastDate}
                onChange={setBastDate}
              />
            </Field>
            <Field>
              <FieldLabel required>Referensi Dokumen UAT</FieldLabel>
              <Select value={bastUatId} onValueChange={setBastUatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih UAT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {uatList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.uat_number} ({UAT_CONCLUSION_META[u.conclusion]?.label ?? u.conclusion})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="bast-war">
                Masa Garansi Perbaikan Bug (Hari Kalender)
              </FieldLabel>
              <NumberInput
                id="bast-war"
                allowDecimal={false}
                min={0}
                value={bastWarrantyDays}
                onValueChange={setBastWarrantyDays}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="bast-sign">
                Telah Ditandatangani Kedua Pihak
              </FieldLabel>
              <Switch
                id="bast-sign"
                checked={bastSigned}
                onCheckedChange={setBastSigned}
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
              <Button type="submit" disabled={saving} className="cursor-pointer">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Terbitkan BAST
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
