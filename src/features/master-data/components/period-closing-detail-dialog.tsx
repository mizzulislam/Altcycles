import {
  Dialog,
  DialogContent,
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
import { formatDateID, formatRupiah } from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedTransactionDescription,
} from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";

export interface PeriodClosingDetailDialogProps {
  journal: JournalRow | null;
  onClose: () => void;
  accounts: AccountRow[];
  linesByJournal: Map<string, JournalLineRow[]>;
}

export function PeriodClosingDetailDialog({
  journal,
  onClose,
  accounts,
  linesByJournal,
}: PeriodClosingDetailDialogProps) {
  const { t, language: lang } = useLanguage();

  return (
    <Dialog
      open={Boolean(journal)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t("accounting:closing.detail_modal_title", "Detail Transaksi Jurnal Penutup")}
          </DialogTitle>
        </DialogHeader>
        {journal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs">
              <div>
                <span className="text-muted-foreground block">
                  {t("accounting:dialogs.number", "Nomor Jurnal")}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {journal.journal_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  {t("accounting:closing.detail_tx_date", "Tanggal Transaksi")}
                </span>
                <span className="font-semibold text-foreground">
                  {formatDateID(journal.journal_date)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block">
                  {t("accounting:closing.detail_description", "Deskripsi")}
                </span>
                <span className="font-medium text-foreground">
                  {getLocalizedTransactionDescription(journal.description, lang)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center font-semibold text-xs">
                      {t("accounting:journals.col_account", "Akun")}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-xs">
                      {t("accounting:journals.col_debit", "Debit")}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-xs">
                      {t("accounting:journals.col_credit", "Kredit")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(linesByJournal.get(journal.id) ?? []).map((l) => {
                    const acc = accounts.find((a) => a.id === l.account_id);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">
                          <span className="font-mono font-semibold text-primary dark:text-cyan-400">
                            {acc?.code}
                          </span>{" "}
                          &ndash; {acc ? getLocalizedAccountName(acc, lang) : ""}
                        </TableCell>
                        <TableCell className="text-xs text-right pr-6 font-medium">
                          {l.debit > 0 ? formatRupiah(l.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right pr-6 font-medium">
                          {l.credit > 0 ? formatRupiah(l.credit) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
