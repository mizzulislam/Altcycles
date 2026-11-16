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
import { Spinner } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import type {
  InvoicePaymentStatus,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";

export type EditableInvoiceRecord =
  | { section: "invoices"; item: SalesInvoiceRow }
  | { section: "receipts"; item: ReceiptRow };

export interface InvoiceEditDialogProps {
  editRecord: EditableInvoiceRecord | null;
  setEditRecord: React.Dispatch<React.SetStateAction<EditableInvoiceRecord | null>>;
  savingEditRecord: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function InvoiceEditDialog({
  editRecord,
  setEditRecord,
  savingEditRecord,
  onSubmit,
}: InvoiceEditDialogProps) {
  return (
    <Dialog
      open={Boolean(editRecord)}
      onOpenChange={(open) => {
        if (!open) setEditRecord(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editRecord?.section === "invoices"
              ? `Edit Invoice ${editRecord.item.invoice_number}`
              : editRecord?.section === "receipts"
                ? `Edit Kuitansi ${editRecord.item.receipt_number}`
                : "Edit Data"}
          </DialogTitle>
        </DialogHeader>
        {editRecord ? (
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {editRecord.section === "invoices" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Tanggal Invoice</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.invoice_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "invoices",
                            item: { ...editRecord.item, invoice_date: v },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Tanggal Jatuh Tempo</FieldLabel>
                      <DatePicker
                        required
                        minDate={editRecord.item.invoice_date}
                        value={editRecord.item.due_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "invoices",
                            item: { ...editRecord.item, due_date: v },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Nominal Subtotal (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={1}
                        required
                        value={editRecord.item.subtotal_amount}
                        onValueChange={(subtotal_amount) =>
                          setEditRecord({
                            section: "invoices",
                            item: {
                              ...editRecord.item,
                              subtotal_amount,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Status Pembayaran</FieldLabel>
                      <Select
                        value={editRecord.item.payment_status}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "invoices",
                            item: {
                              ...editRecord.item,
                              payment_status: v as InvoicePaymentStatus,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                            <SelectItem value="partial">Dibayar Sebagian</SelectItem>
                            <SelectItem value="paid">Lunas</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Catatan Invoice</FieldLabel>
                    <Textarea
                      value={editRecord.item.notes ?? ""}
                      onChange={(e) =>
                        setEditRecord({
                          section: "invoices",
                          item: {
                            ...editRecord.item,
                            notes: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </>
              )}

              {editRecord.section === "receipts" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Tanggal Terima</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.receipt_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "receipts",
                            item: { ...editRecord.item, receipt_date: v },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Jumlah Diterima (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={1}
                        required
                        value={editRecord.item.amount}
                        onValueChange={(amount) =>
                          setEditRecord({
                            section: "receipts",
                            item: {
                              ...editRecord.item,
                              amount,
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel required>Diterima Dari</FieldLabel>
                    <Input
                      required
                      value={editRecord.item.received_from}
                      onChange={(e) =>
                        setEditRecord({
                          section: "receipts",
                          item: {
                            ...editRecord.item,
                            received_from: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditRecord(null)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingEditRecord} className="cursor-pointer">
                  {savingEditRecord ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
