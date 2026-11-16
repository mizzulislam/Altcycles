import * as React from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner } from "@/components/ui/empty";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRupiah, roundRupiah } from "@/lib/formatters";
import type { DraftMilestone } from "../components/project-detail-shared";

interface MilestoneScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractValue: number;
  draftMilestones: DraftMilestone[];
  setDraftMilestones: React.Dispatch<React.SetStateAction<DraftMilestone[]>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function MilestoneScheduleDialog({
  open,
  onOpenChange,
  contractValue,
  draftMilestones,
  setDraftMilestones,
  saving,
  onSave,
}: MilestoneScheduleDialogProps) {
  const sumDraftMsPct = React.useMemo(
    () =>
      Number(
        draftMilestones
          .reduce((sum, m) => sum + (Number.isFinite(m.percentage) ? m.percentage : 0), 0)
          .toFixed(2),
      ),
    [draftMilestones],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Susun Jadwal Termin Proyek (Wajib 100%)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5">
              <span className="text-xs text-muted-foreground">
                Total nilai kontrak proyek:{" "}
                <strong className="text-foreground">{formatRupiah(contractValue)}</strong>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraftMilestones((prev) => [
                    ...prev,
                    {
                      name: `Termin ${prev.length + 1}`,
                      isDownPayment: false,
                      isFinalSettlement: false,
                      percentage: 0,
                      amount: 0,
                      achievementCriteria: "",
                    },
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                Tambah Termin
              </Button>
            </div>
            <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
              {draftMilestones.map((ms, idx) => (
                <div
                  key={idx}
                  className="grid items-end gap-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4 space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Nama Termin #{idx + 1}
                    </span>
                    <Input
                      placeholder="Contoh: Termin 1 (DP)"
                      value={ms.name}
                      onChange={(e) =>
                        setDraftMilestones((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Porsi (%)
                    </span>
                    <NumberInput
                      allowDecimal
                      maxDecimals={2}
                      min={0}
                      max={100}
                      placeholder="%"
                      value={ms.percentage}
                      onValueChange={(pct) => {
                        setDraftMilestones((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  percentage: pct,
                                  amount: roundRupiah(
                                    (contractValue * pct) / 100,
                                  ),
                                }
                              : x,
                          ),
                        );
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Nominal (Rp)
                    </span>
                    <NumberInput
                      allowDecimal={false}
                      min={0}
                      placeholder="Nominal Rp"
                      value={ms.amount}
                      onValueChange={(amount) =>
                        setDraftMilestones((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, amount } : x)),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Kriteria Pencapaian
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Contoh: BAKP Disetujui"
                        value={ms.achievementCriteria}
                        onChange={(e) =>
                          setDraftMilestones((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, achievementCriteria: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      {draftMilestones.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Hapus Baris Termin"
                          className="size-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() =>
                            setDraftMilestones((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Hapus Baris Termin</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs font-semibold pt-1">
              <span>Total Persentase: {sumDraftMsPct}%</span>
              <StatusBadge
                tone={sumDraftMsPct === 100 ? "success" : "destructive"}
                label={
                  sumDraftMsPct === 100
                    ? "Tepat 100%"
                    : "Wajib 100%"
                }
              />
            </div>
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
                disabled={saving || sumDraftMsPct !== 100}
                className="cursor-pointer"
              >
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Simpan Jadwal Termin
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
