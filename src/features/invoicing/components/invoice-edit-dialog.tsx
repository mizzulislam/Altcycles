import * as React from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
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
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
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
  const { t } = useLanguage();

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
              ? `${t("common:action.edit", "Ubah")} Invoice ${editRecord.item.invoice_number}`
              : editRecord?.section === "receipts"
                ? `${t("common:action.edit", "Ubah")} Kuitansi ${editRecord.item.receipt_number}`
                : t("common:action.edit", "Ubah Data")}
          </DialogTitle>
        </DialogHeader>
        {editRecord ? (
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {editRecord.section === "invoices" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>{t("invoicing:modal_create.field_invoice_date", "Tanggal Invoice")}</FieldLabel>
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
                      <FieldLabel required>{t("invoicing:modal_create.field_due_date", "Tanggal Jatuh Tempo")}</FieldLabel>
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
                      <FieldLabel required>{t("invoicing:modal_create.field_subtotal", "Nominal Subtotal (Rp)")}</FieldLabel>
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
                      <FieldLabel required>{t("invoicing:table.col_status", "Status Pembayaran")}</FieldLabel>
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
                            <SelectItem value="unpaid">{t("invoicing:status.unpaid", "Belum Dibayar")}</SelectItem>
                            <SelectItem value="partial">{t("invoicing:status.partially_paid", "Dibayar Sebagian")}</SelectItem>
                            <SelectItem value="paid">{t("invoicing:status.paid", "Lunas")}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>{t("invoicing:modal_create.field_notes", "Catatan Invoice")}</FieldLabel>
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
                      <FieldLabel required>{t("invoicing:receipts.col_payment_date", "Tanggal Terima")}</FieldLabel>
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
                      <FieldLabel required>{t("invoicing:receipts.col_amount", "Jumlah Diterima (Rp)")}</FieldLabel>
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
                    <FieldLabel required>{t("invoicing:receipts.col_client", "Diterima Dari")}</FieldLabel>
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

              <ModalFooterAction
                className="pt-2"
                onCancel={() => setEditRecord(null)}
                saving={savingEditRecord}
                disabled={savingEditRecord}
                cancelLabel={t("common:action.cancel", "Batal")}
                submitLabel={t("common:action.save", "Simpan Perubahan")}
              />
            </FieldGroup>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
