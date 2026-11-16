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
import { formatDateID } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";
import { JOURNAL_TYPE_LABELS } from "../journals-page";

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
  return (
    <Dialog
      open={Boolean(detailJournal)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Transaksi Jurnal</DialogTitle>
        </DialogHeader>

        {detailJournal && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Nomor Jurnal
                </span>
                <span className="font-semibold text-foreground">
                  {detailJournal.journal_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Tanggal
                </span>
                <span className="font-semibold text-foreground">
                  {formatDateID(detailJournal.journal_date)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Jenis Jurnal
                </span>
                <span className="font-semibold text-foreground">
                  {JOURNAL_TYPE_LABELS[detailJournal.journal_type]?.label ??
                    detailJournal.journal_type}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Status
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {detailJournal.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Keterangan:
              </span>
              <p className="text-sm text-foreground mt-1 p-3 rounded-xl bg-muted/30 border border-border/50">
                {detailJournal.description || "-"}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
                Daftar Akun &amp; Mutasi:
              </span>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center py-2.5">
                        Akun
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center w-20 py-2.5">
                        Ref
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center w-32 py-2.5 pr-4">
                        Debit
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-center w-32 py-2.5 pr-4">
                        Kredit
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
                                  ? `${acc.code} - ${acc.name}`
                                  : line.account_id}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 text-center text-muted-foreground">
                              {acc?.code ?? "-"}
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
            Tutup
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
              <span>Edit Transaksi</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
