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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { formatRupiah } from "@/lib/formatters";
import type { AccountRow, SalesInvoiceRow } from "@/types/database.types";

export interface InvoicePaymentDialogProps {
  payTarget: SalesInvoiceRow | null;
  onClose: () => void;
  payDate: string;
  setPayDate: (val: string) => void;
  payAmount: number;
  setPayAmount: (val: number) => void;
  destCashAccountId: string;
  setDestCashAccountId: (val: string) => void;
  cashAccounts: AccountRow[];
  paying: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function InvoicePaymentDialog({
  payTarget,
  onClose,
  payDate,
  setPayDate,
  payAmount,
  setPayAmount,
  destCashAccountId,
  setDestCashAccountId,
  cashAccounts,
  paying,
  onSubmit,
}: InvoicePaymentDialogProps) {
  return (
    <Dialog
      open={Boolean(payTarget)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Catat Penerimaan Pembayaran {payTarget?.invoice_number}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {payTarget ? (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Total Tagihan
                </span>
                <span className="font-semibold text-foreground">
                  {formatRupiah(payTarget.total_amount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">
                  Sisa Belum Terbayar
                </span>
                <span className="font-bold text-primary dark:text-sky-400">
                  {formatRupiah(payTarget.total_amount - payTarget.paid_amount)}
                </span>
              </div>
            </div>
          ) : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pay-date" required>Tanggal Dana Masuk</FieldLabel>
              <DatePicker
                id="pay-date"
                required
                value={payDate}
                onChange={setPayDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pay-amt" required>
                Nominal Pembayaran Diterima (Rp)
              </FieldLabel>
              <NumberInput
                id="pay-amt"
                allowDecimal={false}
                min={1}
                max={
                  payTarget
                    ? payTarget.total_amount - payTarget.paid_amount
                    : undefined
                }
                required
                value={payAmount}
                onValueChange={setPayAmount}
              />
            </Field>
            <Field>
              <FieldLabel required>Rekening Tujuan Kas / Bank Perusahaan</FieldLabel>
              <Select
                value={destCashAccountId}
                onValueChange={setDestCashAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun kas/bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {cashAccounts.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        Belum ada akun kas/bank aktif
                      </SelectItem>
                    ) : (
                      cashAccounts.map((ca) => (
                        <SelectItem key={ca.id} value={ca.id}>
                          {ca.code} — {ca.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Batal
              </Button>
              <Button type="submit" disabled={paying}>
                {paying ? <Spinner data-icon="inline-start" /> : null}
                Simpan Pembayaran &amp; Buat Kuitansi
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
