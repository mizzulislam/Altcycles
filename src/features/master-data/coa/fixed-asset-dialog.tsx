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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getLocalizedAccountName } from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import type { AccountRow, FixedAssetStatus } from "@/types/database.types";

export interface FixedAssetFormState {
  id: string | undefined;
  asset_code: string;
  asset_name: string;
  acquisition_date: string;
  acquisition_cost: number;
  useful_life_months: number;
  salvage_value: number;
  asset_account_id: string;
  accum_depr_account_id: string;
  expense_account_id: string;
  status: FixedAssetStatus;
  disposed_date: string;
  notes: string;
}

interface FixedAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FixedAssetFormState;
  setForm: (val: FixedAssetFormState) => void;
  accounts: AccountRow[];
  saving: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function FixedAssetDialog({
  open,
  onOpenChange,
  form,
  setForm,
  accounts,
  saving,
  onSubmit,
}: FixedAssetDialogProps) {
  const { t, language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {form.id
              ? t("accounting:fixed_assets.dialog_edit_title", "Ubah Aset Tetap")
              : t("accounting:fixed_assets.dialog_add_title", "Tambah Aset Tetap Baru")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fa-code" required>
                  {t("accounting:fixed_assets.field_code", "Kode Aset")}
                </FieldLabel>
                <Input
                  id="fa-code"
                  value={form.asset_code}
                  onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
                  placeholder="AST-001"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="fa-name" required>
                  {t("accounting:fixed_assets.field_name", "Nama / Deskripsi Aset")}
                </FieldLabel>
                <Input
                  id="fa-name"
                  value={form.asset_name}
                  onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
                  placeholder="MacBook Pro M3 Max"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="fa-date" required>
                  {t("accounting:fixed_assets.field_acq_date", "Tanggal Perolehan")}
                </FieldLabel>
                <DatePicker
                  id="fa-date"
                  value={form.acquisition_date}
                  onChange={(acquisition_date) =>
                    setForm({ ...form, acquisition_date })
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="fa-cost" required>
                  {t("accounting:fixed_assets.field_cost", "Harga Perolehan (Rp)")}
                </FieldLabel>
                <NumberInput
                  id="fa-cost"
                  value={form.acquisition_cost}
                  onValueChange={(val) =>
                    setForm({
                      ...form,
                      acquisition_cost: Number(val) || 0,
                    })
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="fa-salvage">
                  {t("accounting:fixed_assets.field_salvage", "Nilai Sisa / Residu (Rp)")}
                </FieldLabel>
                <NumberInput
                  id="fa-salvage"
                  value={form.salvage_value}
                  onValueChange={(val) =>
                    setForm({
                      ...form,
                      salvage_value: Number(val) || 0,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="fa-life" required>
                  {t("accounting:fixed_assets.field_life_months", "Umur Manfaat (Bulan)")}
                </FieldLabel>
                <NumberInput
                  id="fa-life"
                  value={form.useful_life_months}
                  onValueChange={(val) =>
                    setForm({
                      ...form,
                      useful_life_months: Math.max(1, Number(val) || 1),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fa-status">
                  {t("accounting:fixed_assets.field_status", "Status Aset")}
                </FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(val) =>
                    setForm({
                      ...form,
                      status: val as FixedAssetStatus,
                    })
                  }
                >
                  <SelectTrigger id="fa-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="active">
                        {t("accounting:fixed_assets.status_active", "Aktif")}
                      </SelectItem>
                      <SelectItem value="fully_depreciated">
                        {t(
                          "accounting:fixed_assets.status_fully_depreciated",
                          "Disusutkan Penuh",
                        )}
                      </SelectItem>
                      <SelectItem value="disposed">
                        {t("accounting:fixed_assets.status_disposed", "Dilepas")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="fa-disp-date">
                  {t(
                    "accounting:fixed_assets.field_disposed_date",
                    "Tanggal Pelepasan (Opsional)",
                  )}
                </FieldLabel>
                <DatePicker
                  id="fa-disp-date"
                  value={form.disposed_date}
                  onChange={(disposed_date) =>
                    setForm({ ...form, disposed_date })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="fa-acc-asset" required>
                  {t(
                    "accounting:fixed_assets.field_asset_account",
                    "Akun Aset Tetap",
                  )}
                </FieldLabel>
                <Select
                  value={form.asset_account_id}
                  onValueChange={(asset_account_id) =>
                    setForm({ ...form, asset_account_id })
                  }
                >
                  <SelectTrigger id="fa-acc-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts
                        .filter(
                          (a) => a.account_type === "asset" && a.is_postable,
                        )
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {getLocalizedAccountName(a, language)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="fa-acc-accum" required>
                  {t(
                    "accounting:fixed_assets.field_accum_account",
                    "Akun Akumulasi Penyusutan",
                  )}
                </FieldLabel>
                <Select
                  value={form.accum_depr_account_id}
                  onValueChange={(accum_depr_account_id) =>
                    setForm({ ...form, accum_depr_account_id })
                  }
                >
                  <SelectTrigger id="fa-acc-accum">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts
                        .filter(
                          (a) =>
                            (a.account_type === "contra_asset" ||
                              a.account_type === "asset") &&
                            a.is_postable,
                        )
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {getLocalizedAccountName(a, language)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="fa-acc-expense" required>
                  {t(
                    "accounting:fixed_assets.field_expense_account",
                    "Akun Beban Penyusutan",
                  )}
                </FieldLabel>
                <Select
                  value={form.expense_account_id}
                  onValueChange={(expense_account_id) =>
                    setForm({ ...form, expense_account_id })
                  }
                >
                  <SelectTrigger id="fa-acc-expense">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts
                        .filter(
                          (a) => a.account_type === "expense" && a.is_postable,
                        )
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {getLocalizedAccountName(a, language)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="fa-notes">
                {t("accounting:fixed_assets.field_notes", "Catatan Tambahan")}
              </FieldLabel>
              <Textarea
                id="fa-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder={t(
                  "accounting:fixed_assets.notes_ph",
                  "Nomor seri, garansi, lokasi penempatan aset...",
                )}
              />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t("common:action.cancel", "Batal")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? t("common:saving", "Menyimpan...")
                  : t(
                      "accounting:fixed_assets.btn_save_asset",
                      "Simpan Aset Tetap",
                    )}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
