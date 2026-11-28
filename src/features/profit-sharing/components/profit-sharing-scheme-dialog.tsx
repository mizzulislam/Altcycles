import * as React from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalFooterAction } from "@/components/patterns";
import { useLanguage } from "@/lib/i18n";
import type { ProfileRow } from "@/types/database.types";
import type { DraftRecipient } from "./profit-sharing-types";

interface ProfitSharingSchemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftRecipients: DraftRecipient[];
  setDraftRecipients: React.Dispatch<React.SetStateAction<DraftRecipient[]>>;
  profiles: ProfileRow[];
  savingScheme: boolean;
  onSaveScheme: (e: React.FormEvent) => void;
}

export function ProfitSharingSchemeDialog({
  open,
  onOpenChange,
  draftRecipients,
  setDraftRecipients,
  profiles,
  savingScheme,
  onSaveScheme,
}: ProfitSharingSchemeDialogProps) {
  const { t } = useLanguage();

  const sumPct = Number(
    draftRecipients.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0).toFixed(2),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("profit_sharing:modals.scheme_title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSaveScheme} className="space-y-4">
          <FieldGroup>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5">
              <span className="text-xs text-muted-foreground leading-relaxed">
                {t("profit_sharing:modals.scheme_hint")}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraftRecipients((prev) => [
                    ...prev,
                    {
                      recipientName: "",
                      recipientUserId: "none",
                      percentage: 0,
                    },
                  ])
                }
                className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-center cursor-pointer gap-1.5"
              >
                <PlusIcon className="size-3.5" />
                <span>{t("profit_sharing:modals.btn_add_recipient")}</span>
              </Button>
            </div>

            <div className="hidden sm:grid sm:grid-cols-12 gap-2.5 px-1 text-xs font-semibold text-muted-foreground">
              <div className="sm:col-span-5">{t("profit_sharing:modals.header_recipient_name")}</div>
              <div className="sm:col-span-4">{t("profit_sharing:modals.header_team_account")}</div>
              <div className="sm:col-span-3">{t("profit_sharing:modals.header_portion")}</div>
            </div>

            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
              {draftRecipients.map((r, idx) => (
                <div
                  key={idx}
                  className="grid items-center gap-2.5 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5">
                    <Input
                      required
                      placeholder={t("profit_sharing:modals.placeholder_recipient")}
                      value={r.recipientName}
                      onChange={(e) =>
                        setDraftRecipients((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, recipientName: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Select
                      value={r.recipientUserId}
                      onValueChange={(uid) => {
                        const found = profiles.find((p) => p.id === uid);
                        setDraftRecipients((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  recipientUserId: uid,
                                  recipientName:
                                    found && !x.recipientName
                                      ? found.full_name
                                      : x.recipientName,
                                }
                              : x,
                          ),
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">
                            {t("profit_sharing:modals.company_internal_share")}
                          </SelectItem>
                          {profiles
                            .filter((p) => p.role === "user")
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-3">
                    <NumberInput
                      allowDecimal
                      maxDecimals={2}
                      min={0.01}
                      max={100}
                      required
                      value={r.percentage}
                      onValueChange={(percentage) =>
                        setDraftRecipients((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, percentage } : x,
                          ),
                        )
                      }
                    />
                    {draftRecipients.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDraftRecipients((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="shrink-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        title={t("profit_sharing:modals.tooltip_delete_recipient")}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs font-semibold">
              <span className="text-foreground">{t("profit_sharing:modals.total_portion_label", { pct: sumPct })}</span>
              <StatusBadge
                tone={sumPct === 100 ? "success" : "destructive"}
                label={sumPct === 100 ? t("profit_sharing:modals.badge_exact_100") : t("profit_sharing:modals.badge_must_be_100")}
              />
            </div>
            <ModalFooterAction
              onCancel={() => onOpenChange(false)}
              saving={savingScheme}
              disabled={savingScheme || sumPct !== 100}
              cancelLabel={t("profit_sharing:modals.btn_cancel")}
              submitLabel={t("profit_sharing:modals.btn_save_scheme")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
