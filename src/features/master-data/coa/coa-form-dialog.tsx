import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { useLanguage } from "@/lib/i18n";
import { SYSTEM_TAG_MAP } from "@/lib/glossary";
import type {
  AccountSystemTag,
  AccountType,
  NormalBalance,
} from "@/types/database.types";

export interface CoaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId?: string;
  code: string;
  setCode: (val: string) => void;
  name: string;
  setName: (val: string) => void;
  accountType: AccountType;
  onAccountTypeChange: (val: AccountType) => void;
  normalBalance: NormalBalance;
  setNormalBalance: (val: NormalBalance) => void;
  systemTag: AccountSystemTag;
  setSystemTag: (val: AccountSystemTag) => void;
  isPostable: boolean;
  setIsPostable: (val: boolean) => void;
  description: string;
  setDescription: (val: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function CoaFormDialog({
  open,
  onOpenChange,
  editingId,
  code,
  setCode,
  name,
  setName,
  accountType,
  onAccountTypeChange,
  normalBalance,
  setNormalBalance,
  systemTag,
  setSystemTag,
  isPostable,
  setIsPostable,
  description,
  setDescription,
  saving,
  onSubmit,
}: CoaFormDialogProps) {
  const { t, language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingId
              ? t("accounting:coa.dialog_edit_title", "Ubah Akun Buku Besar")
              : t("accounting:coa.dialog_add_title", "Tambah Akun Baru")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="acc-code" required>
                  {t("accounting:coa.field_code", "Kode Akun")}
                </FieldLabel>
                <Input
                  id="acc-code"
                  required
                  placeholder={t("accounting:coa.code_placeholder", "Contoh: 5-1501")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="acc-type" required>
                  {t("accounting:coa.field_type", "Tipe Akun")}
                </FieldLabel>
                <Select
                  value={accountType}
                  onValueChange={(val) =>
                    onAccountTypeChange(val as AccountType)
                  }
                >
                  <SelectTrigger id="acc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="asset">{t("accounting:account_types.asset", "Aset")}</SelectItem>
                      <SelectItem value="contra_asset">{t("accounting:account_types.contra_asset", "Kontra-Aset")}</SelectItem>
                      <SelectItem value="liability">{t("accounting:account_types.liability", "Liabilitas")}</SelectItem>
                      <SelectItem value="equity">{t("accounting:account_types.equity", "Ekuitas")}</SelectItem>
                      <SelectItem value="revenue">{t("accounting:account_types.revenue", "Pendapatan")}</SelectItem>
                      <SelectItem value="expense">{t("accounting:account_types.expense", "Beban")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="acc-name" required>
                {t("accounting:coa.field_name", "Nama Akun")}
              </FieldLabel>
              <Input
                id="acc-name"
                required
                placeholder={t("accounting:coa.name_placeholder", "Contoh: Beban Pengujian Keamanan Proyek")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="acc-balance" required>
                  {t("accounting:coa.field_normal_balance", "Saldo Normal")}
                </FieldLabel>
                <Select
                  value={normalBalance}
                  onValueChange={(val) =>
                    setNormalBalance(val as NormalBalance)
                  }
                >
                  <SelectTrigger id="acc-balance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="debit">{t("accounting:normal_balance.debit", "Debit")}</SelectItem>
                      <SelectItem value="credit">{t("accounting:normal_balance.credit", "Kredit")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="acc-tag">
                  {t("accounting:coa.field_system_tag", "Penanda Otomasi Sistem")}
                </FieldLabel>
                <Select
                  value={systemTag}
                  onValueChange={(val) =>
                    setSystemTag(val as AccountSystemTag)
                  }
                >
                  <SelectTrigger id="acc-tag">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.keys(SYSTEM_TAG_MAP) as AccountSystemTag[]).map((tagKey) => (
                        <SelectItem key={tagKey} value={tagKey}>
                          {SYSTEM_TAG_MAP[tagKey]?.[language] ?? tagKey}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="acc-postable">
                {t("accounting:coa.field_postable", "Dapat Diposting Langsung ke Jurnal")}
              </FieldLabel>
              <Switch
                id="acc-postable"
                checked={isPostable}
                onCheckedChange={setIsPostable}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="acc-desc">
                {t("accounting:coa.field_description", "Keterangan")}
              </FieldLabel>
              <Textarea
                id="acc-desc"
                placeholder={t("accounting:coa.desc_placeholder", "Deskripsi singkat fungsi dan peruntukan akun ini...")}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <ModalFooterAction
              onCancel={() => onOpenChange(false)}
              saving={saving}
              cancelLabel={t("common:action.cancel", "Batal")}
              submitLabel={t("accounting:coa.btn_save_account", "Simpan Akun")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
