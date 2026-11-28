import { Trash2Icon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DocumentIssueChecklistCard } from "@/components/shared/document-issue-checklist";
import { ModalFooterAction } from "@/components/patterns";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { ProjectRow, PurchaseOrderRow, VendorRow } from "@/types/database.types";
import type { DocumentValidationResult } from "@/lib/document-checklist";

export interface PoItemFormState {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface PoCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPo: PurchaseOrderRow | null;
  poDate: string;
  setPoDate: (val: string) => void;
  vendorId: string;
  setVendorId: (val: string) => void;
  projectId: string;
  setProjectId: (val: string) => void;
  vendors: VendorRow[];
  projects: ProjectRow[];
  formItems: PoItemFormState[];
  setFormItems: React.Dispatch<React.SetStateAction<PoItemFormState[]>>;
  draftTotal: number;
  exceedsBudget: boolean;
  budgetRemaining: number | null;
  ackBudgetWarning: boolean;
  setAckBudgetWarning: (val: boolean) => void;
  notes: string;
  setNotes: (val: string) => void;
  issueNow: boolean;
  setIssueNow: (val: boolean) => void;
  poChecklist: DocumentValidationResult;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function PoCreateDialog({
  open,
  onOpenChange,
  editingPo,
  poDate,
  setPoDate,
  vendorId,
  setVendorId,
  projectId,
  setProjectId,
  vendors,
  projects,
  formItems,
  setFormItems,
  draftTotal,
  exceedsBudget,
  budgetRemaining,
  ackBudgetWarning,
  setAckBudgetWarning,
  notes,
  setNotes,
  issueNow,
  setIssueNow,
  poChecklist,
  saving,
  onSubmit,
  onCancel,
}: PoCreateDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingPo
              ? t("po:modal_edit.title", "Edit Purchase Order Pembelian Vendor")
              : t("po:modal_create.title", "Buat Purchase Order Pembelian Vendor")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-w-0">
          <FieldGroup className="gap-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="po-date" required>
                  {t("po:modal_create.field_date", "Tanggal PO")}
                </FieldLabel>
                <DatePicker
                  id="po-date"
                  required
                  value={poDate}
                  onChange={setPoDate}
                />
              </Field>
              <Field>
                <FieldLabel required>
                  {t("po:modal_create.field_vendor", "Vendor / Pemasok")}
                </FieldLabel>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "po:modal_create.select_vendor_placeholder",
                        "Pilih vendor",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {vendors.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          {t("po:modal_create.no_vendors", "Belum ada vendor aktif")}
                        </SelectItem>
                      ) : (
                        vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.code}: {v.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel required>
                {t("po:modal_create.field_project", "Proyek Terkait")}
              </FieldLabel>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "po:modal_create.select_project_placeholder",
                      "Pilih proyek",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projects.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        {t(
                          "po:modal_create.no_projects",
                          "Belum ada proyek tersedia",
                        )}
                      </SelectItem>
                    ) : (
                      projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code}: {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-muted/15 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {t("po:modal_create.items_section_title", "Rincian Item PO")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs cursor-pointer"
                  onClick={() =>
                    setFormItems((prev) => [
                      ...prev,
                      {
                        description: "",
                        quantity: 1,
                        unit: "Unit",
                        unitPrice: 0,
                      },
                    ])
                  }
                >
                  <PlusIcon className="size-3.5 mr-1" />
                  {t("po:modal_create.btn_add_row", "Tambah Baris")}
                </Button>
              </div>
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-0.5 text-[11px] font-medium text-muted-foreground">
                <div className="sm:col-span-5">
                  {t("po:modal_create.col_item_desc", "Deskripsi Barang / Jasa")}
                </div>
                <div className="sm:col-span-2">
                  {t("po:modal_create.col_qty", "Qty")}
                </div>
                <div className="sm:col-span-2">
                  {t("po:modal_create.col_unit", "Satuan")}
                </div>
                <div className="sm:col-span-2">
                  {t("po:modal_create.col_unit_price", "Harga Satuan (Rp)")}
                </div>
                <div className="sm:col-span-1 text-center">
                  {t("po:modal_create.col_delete", "Hapus")}
                </div>
              </div>
              {formItems.map((it, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 sm:grid-cols-12 sm:items-center"
                >
                  <div className="sm:col-span-5">
                    <Input
                      placeholder={t(
                        "po:modal_create.placeholder_desc",
                        "Deskripsi barang/jasa",
                      )}
                      required
                      value={it.description}
                      onChange={(e) =>
                        setFormItems((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, description: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <NumberInput
                      allowDecimal={false}
                      min={1}
                      required
                      value={it.quantity}
                      onValueChange={(quantity) =>
                        setFormItems((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, quantity } : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder={t(
                        "po:modal_create.placeholder_unit",
                        "Satuan",
                      )}
                      value={it.unit}
                      onChange={(e) =>
                        setFormItems((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, unit: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <NumberInput
                      allowDecimal={false}
                      min={0}
                      required
                      placeholder={t("po:modal_create.col_unit_price")}
                      value={it.unitPrice}
                      onValueChange={(unitPrice) =>
                        setFormItems((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, unitPrice } : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={t(
                        "po:modal_create.tooltip_delete_row",
                        "Hapus baris item",
                      )}
                      disabled={formItems.length === 1}
                      onClick={() =>
                        setFormItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">
                        {t("po:modal_create.col_delete", "Hapus baris")}
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-1.5 border-t border-border/60 text-sm font-bold tabular-nums">
                Total PO: {formatRupiah(draftTotal)}
              </div>
            </div>

            {exceedsBudget ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {t(
                    "po:modal_create.budget_warning_title",
                    "Peringatan Melampaui Sisa Anggaran Proyek",
                  )}
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <span>
                    {t("po:modal_create.budget_warning_desc", {
                      orderTotal: formatRupiah(draftTotal),
                      budgetRemaining: formatRupiah(budgetRemaining ?? 0),
                      defaultValue: `Total PO (${formatRupiah(draftTotal)}) melebihi sisa anggaran proyek saat ini (${formatRupiah(budgetRemaining ?? 0)}).`,
                    })}
                  </span>
                  <div className="flex items-center gap-2.5 text-xs font-medium">
                    <Checkbox
                      id="ack-po-budget-warning"
                      checked={ackBudgetWarning}
                      onCheckedChange={(val) => setAckBudgetWarning(Boolean(val))}
                    />
                    <label
                      htmlFor="ack-po-budget-warning"
                      className="cursor-pointer select-none leading-relaxed"
                    >
                      {t(
                        "common:action.acknowledge_warning",
                        "Saya memahami peringatan ini dan tetap melanjutkan.",
                      )}
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="po-notes">
                {t("po:modal_create.field_notes", "Catatan Tambahan")}
              </FieldLabel>
              <Textarea
                id="po-notes"
                rows={2}
                className="min-h-[64px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  "po:modal_create.placeholder_notes",
                  "Jadwal pengiriman atau spesifikasi teknis...",
                )}
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="po-issue" className="font-normal">
                {t(
                  "po:modal_create.switch_immediate_issue",
                  "Langsung terbitkan PO setelah disimpan (mengunci rincian nilai)",
                )}
              </FieldLabel>
              <Switch
                id="po-issue"
                checked={issueNow}
                onCheckedChange={setIssueNow}
              />
            </Field>

            <DocumentIssueChecklistCard
              items={poChecklist.items}
              title={t(
                "po:modal_create.checklist_title",
                "Checklist Validasi PO Vendor (Standar Altvira)",
              )}
            />

            <ModalFooterAction
              onCancel={onCancel}
              saving={saving}
              disabled={
                saving || !vendorId || !projectId || !poChecklist.isValid
              }
              cancelLabel={t("po:modal_create.btn_cancel", "Batal")}
              submitLabel={
                editingPo
                  ? t("po:modal_edit.btn_save", "Simpan Perubahan")
                  : t("po:modal_create.btn_save", "Simpan PO")
              }
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
