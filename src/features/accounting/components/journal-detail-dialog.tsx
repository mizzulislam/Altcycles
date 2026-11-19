import { PencilIcon } from "lucide-react";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAccountRef, formatDateI18n } from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedJournalType,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";

interface JournalDetailDialogProps {
  detailJournal: JournalRow | null;
  onClose: () => void;
  lines: JournalLineRow[];
  accountMap: Map<string, AccountRow>;
  onEdit: (journal: JournalRow) => void;
}

export function JournalDetailDialog({
  detailJournal,
  onClose,
  lines,
  accountMap,
  onEdit,
}: JournalDetailDialogProps) {
  const { t, language } = useLanguage();

  return (
    <Dialog
      open={Boolean(detailJournal)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("accounting:dialogs.detail_title", "Detail Transaksi Jurnal")}</DialogTitle>
        </DialogHeader>

        {detailJournal && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {t("accounting:dialogs.number", "Nomor Jurnal")}
                </span>
                <span className="font-semibold text-foreground">
                  {detailJournal.journal_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {t("accounting:journals.col_date", "Tanggal")}
                </span>
                <span className="font-semibold text-foreground">
                  {formatDateI18n(detailJournal.journal_date, language)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {t("accounting:dialogs.type", "Jenis Jurnal")}
                </span>
                <span className="font-semibold text-foreground">
                  {getLocalizedJournalType(detailJournal.journal_type, language)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {t("common:table.status", "Status")}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {detailJournal.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground">
                {t("accounting:dialogs.description", "Keterangan")}:
              </span>
              <p className="text-sm text-foreground mt-1 p-3 rounded-xl bg-muted/30 border border-border/50">
                {detailJournal.description ? getLocalizedTransactionDescription(detailJournal.description, language) : "-"}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
                {t("accounting:dialogs.accounts_list", "Daftar Akun & Mutasi:")}
              </span>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center py-2.5">
                        {t("accounting:journals.col_account", "Akun")}
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center w-20 py-2.5">
                        {t("accounting:journals.col_ref", "Ref")}
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center w-32 py-2.5 pr-4">
                        {t("accounting:journals.col_debit", "Debit")}
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center w-32 py-2.5 pr-4">
                        {t("accounting:journals.col_credit", "Kredit")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines
                      .filter((l) => l.journal_id === detailJournal.id)
                      .sort((a, b) => a.line_no - b.line_no)
                      .map((line, idx) => {
                        const acc = accountMap.get(line.account_id);
                        return (
                          <TableRow key={line.id ?? idx} className="text-xs">
                            <TableCell className="py-2.5">
                              <span
                                className={cn(
                                  "font-medium",
                                  line.credit > 0 && "pl-5 text-muted-foreground",
                                )}
                              >
                                {acc
                                  ? `${acc.code} - ${getLocalizedAccountName(acc, language)}`
                                  : line.account_id}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 text-center text-muted-foreground">
                              {formatAccountRef(acc?.code)}
                            </TableCell>
                            <TableCell className="py-2.5 pr-4 font-medium">
                              {line.debit > 0 ? (
                                <MonetaryCell amount={line.debit} />
                              ) : (
                                <span className="block text-right text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 pr-4 font-medium">
                              {line.credit > 0 ? (
                                <MonetaryCell amount={line.credit} />
                              ) : (
                                <span className="block text-right text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            {t("common:action.close", "Tutup")}
          </Button>
          {detailJournal && (
            <Button
              type="button"
              onClick={() => {
                const target = detailJournal;
                onClose();
                onEdit(target);
              }}
              className="rounded-xl gap-1.5"
            >
              <PencilIcon className="size-3.5" />
              <span>{t("journal.btn_edit", "Edit Transaksi")}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
