import type { Dispatch, SetStateAction } from "react";
import { SaveIcon } from "lucide-react";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import type {
  DocSequenceCounterRow,
  DocSequenceRow,
} from "@/types/database.types";

interface SystemConfigTabSequencesProps {
  sequences: DocSequenceRow[];
  setSequences: Dispatch<SetStateAction<DocSequenceRow[]>>;
  counters: DocSequenceCounterRow[];
  onSaveSequence: (seq: DocSequenceRow) => Promise<void>;
}

export function SystemConfigTabSequences({
  sequences,
  setSequences,
  counters,
  onSaveSequence,
}: SystemConfigTabSequencesProps) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("settings:admin_settings.sequences_card_title")}
        description={t("settings:admin_settings.sequences_card_desc")}
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_code")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_doc_type")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_pattern")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_digits")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_reset")}
              </TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_last_sequence")}
              </TableHead>
              <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap">
                {t("settings:admin_settings.col_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences.map((seq, idx) => {
              const latestCounter = counters
                .filter((c) => c.doc_type === seq.doc_type)
                .sort((a, b) => b.period_key.localeCompare(a.period_key))[0];
              return (
                <TableRow key={seq.doc_type}>
                  <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3 text-center font-mono font-semibold whitespace-nowrap">
                    {seq.doc_type}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-xs sm:text-sm">{seq.label}</TableCell>
                  <TableCell className="px-3 py-3 min-w-56">
                    <Input
                      value={seq.prefix_pattern}
                      onChange={(e) => {
                        const copy = [...sequences];
                        const current = copy[idx];
                        if (current) {
                          copy[idx] = {
                            ...current,
                            prefix_pattern: e.target.value,
                          };
                          setSequences(copy);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 w-20">
                    <Input
                      type="number"
                      min={2}
                      max={6}
                      value={seq.padding_digits}
                      onChange={(e) => {
                        const copy = [...sequences];
                        const current = copy[idx];
                        if (current) {
                          copy[idx] = {
                            ...current,
                            padding_digits: Number(e.target.value),
                          };
                          setSequences(copy);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 w-36">
                    <Select
                      value={seq.reset_period}
                      onValueChange={(val) => {
                        const copy = [...sequences];
                        const current = copy[idx];
                        if (current) {
                          copy[idx] = {
                            ...current,
                            reset_period: val as DocSequenceRow["reset_period"],
                          };
                          setSequences(copy);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="monthly">
                            {t("settings:admin_settings.reset_monthly")}
                          </SelectItem>
                          <SelectItem value="yearly">
                            {t("settings:admin_settings.reset_yearly")}
                          </SelectItem>
                          <SelectItem value="never">
                            {t("settings:admin_settings.reset_never")}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {latestCounter ? (
                      <StatusBadge
                        tone="secondary"
                        label={`${latestCounter.period_key}: #${latestCounter.last_number}`}
                      />
                    ) : (
                      t("settings:admin_settings.status_unused")
                    )}
                  </TableCell>
                  <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3 text-center whitespace-nowrap">
                    <div className="flex justify-center items-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={t("settings:admin_settings.btn_save_format")}
                        onClick={() => void onSaveSequence(seq)}
                        className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <SaveIcon className="size-4" />
                        <span className="sr-only">{t("common:action.save")}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
