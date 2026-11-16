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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/empty";
import type { UatConclusion } from "@/types/database.types";

export interface UatScenarioItem {
  featureName: string;
  testScenario: string;
  result: "pass" | "fail";
}

interface CreateUatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uatDate: string;
  setUatDate: (val: string) => void;
  uatStagingUrl: string;
  setUatStagingUrl: (val: string) => void;
  uatClientTester: string;
  setUatClientTester: (val: string) => void;
  uatCompanion: string;
  setUatCompanion: (val: string) => void;
  uatConclusion: UatConclusion;
  setUatConclusion: (val: UatConclusion) => void;
  uatScenarios: UatScenarioItem[];
  setUatScenarios: React.Dispatch<React.SetStateAction<UatScenarioItem[]>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CreateUatDialog({
  open,
  onOpenChange,
  uatDate,
  setUatDate,
  uatStagingUrl,
  setUatStagingUrl,
  uatClientTester,
  setUatClientTester,
  uatCompanion,
  setUatCompanion,
  uatConclusion,
  setUatConclusion,
  uatScenarios,
  setUatScenarios,
  saving,
  onSave,
}: CreateUatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Checklist Pengujian UAT</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="uat-date" required>Tanggal Pengujian</FieldLabel>
                <DatePicker
                  id="uat-date"
                  required
                  value={uatDate}
                  onChange={setUatDate}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="uat-url">URL Staging</FieldLabel>
                <Input
                  id="uat-url"
                  value={uatStagingUrl}
                  onChange={(e) => setUatStagingUrl(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="uat-tester" required>Nama Penguji Klien</FieldLabel>
                <Input
                  id="uat-tester"
                  required
                  value={uatClientTester}
                  onChange={(e) => setUatClientTester(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="uat-comp" required>Pendamping Altvira</FieldLabel>
                <Input
                  id="uat-comp"
                  required
                  value={uatCompanion}
                  onChange={(e) => setUatCompanion(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel required>Kesimpulan UAT</FieldLabel>
              <Select
                value={uatConclusion}
                onValueChange={(v) => setUatConclusion(v as UatConclusion)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="accepted">
                      Diterima Penuh (Siap BAST)
                    </SelectItem>
                    <SelectItem value="accepted_with_notes">
                      Diterima dengan Catatan Minor (Siap BAST)
                    </SelectItem>
                    <SelectItem value="rejected">
                      Ditolak / Perlu Perbaikan Ulang (Menolak BAST)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Skenario Uji Utama</FieldLabel>
              <div className="flex flex-col gap-2">
                {uatScenarios.map((sc, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={sc.featureName}
                      onChange={(e) =>
                        setUatScenarios((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, featureName: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                    <Input
                      value={sc.testScenario}
                      onChange={(e) =>
                        setUatScenarios((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, testScenario: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                    <Select
                      value={sc.result}
                      onValueChange={(v) =>
                        setUatScenarios((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, result: v as "pass" | "fail" }
                              : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="pass">Sesuai (Pass)</SelectItem>
                          <SelectItem value="fail">Revisi (Fail)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
                Simpan UAT
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
