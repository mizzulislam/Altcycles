import * as React from "react";
import { LandmarkIcon, Loader2Icon, ReceiptTextIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { PtkpInfo } from "@/lib/tax-calculation";
import type { MaritalStatus } from "@/types/database.types";

interface ProfileTaxBankFormProps {
  maritalStatus: MaritalStatus;
  setMaritalStatus: (val: MaritalStatus) => void;
  dependentsCount: number;
  setDependentsCount: (val: number) => void;
  npwp: string;
  setNpwp: (val: string) => void;
  ptkpInfo: PtkpInfo;
  bankName: string;
  setBankName: (val: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (val: string) => void;
  bankAccountHolder: string;
  setBankAccountHolder: (val: string) => void;
  isSavingFinancial: boolean;
  onSaveFinancial: (e: React.FormEvent) => Promise<void>;
}

export function ProfileTaxBankForm({
  maritalStatus,
  setMaritalStatus,
  dependentsCount,
  setDependentsCount,
  npwp,
  setNpwp,
  ptkpInfo,
  bankName,
  setBankName,
  bankAccountNumber,
  setBankAccountNumber,
  bankAccountHolder,
  setBankAccountHolder,
  isSavingFinancial,
  onSaveFinancial,
}: ProfileTaxBankFormProps) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("settings:profile.card_financial_title", "Data Keuangan & Rekening Pribadi")}
        description={t(
          "settings:profile.financial_security_notice",
          "Data NPWP dan nomor rekening Anda dilindungi kebijakan keamanan tingkat baris (RLS), ditampilkan dengan masking di halaman ikhtisar, serta terhubung langsung sebagai sumber tunggal bagi Bendahara.",
        )}
      />
      <CardContent className="p-5 sm:p-6 space-y-6">
        <form onSubmit={onSaveFinancial} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Kolom 1: Status Perpajakan & PTKP */}
            <div className="space-y-5">
              <div className="border-b border-border/60 pb-2.5 flex items-center gap-2 min-h-[35px]">
                <ReceiptTextIcon className="size-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("settings:profile.section_tax_title", "Status Perpajakan & PTKP")}
                </h3>
              </div>

              <div className="space-y-5">
                {/* Field 1: Status Pernikahan */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-marital-status" className="text-xs font-semibold h-4 flex items-center">
                    {t("settings:profile.financial_marital_status", "Status Pernikahan")}
                  </FieldLabel>
                  <Select
                    value={maritalStatus}
                    onValueChange={(val) => setMaritalStatus(val as MaritalStatus)}
                  >
                    <SelectTrigger id="pf-marital-status" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">
                        {t("settings:profile.marital_single", "Belum Menikah (TK)")}
                      </SelectItem>
                      <SelectItem value="married">
                        {t("settings:profile.marital_married", "Menikah (K)")}
                      </SelectItem>
                      <SelectItem value="widowed">
                        {t("settings:profile.marital_widowed", "Duda / Janda (TK)")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t(
                      "settings:profile.financial_marital_status_desc",
                      "Menentukan klasifikasi status dasar Penghasilan Tidak Kena Pajak (PTKP).",
                    )}
                  </FieldDescription>
                </Field>

                {/* Field 2: Jumlah Tanggungan */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-dependents-count" className="text-xs font-semibold h-4 flex items-center">
                    {t("settings:profile.financial_dependents_count", "Jumlah Tanggungan")}
                  </FieldLabel>
                  <Select
                    value={String(dependentsCount)}
                    onValueChange={(val) => setDependentsCount(Number(val))}
                  >
                    <SelectTrigger id="pf-dependents-count" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        {t("settings:profile.dependents_0", "0 Tanggungan")}
                      </SelectItem>
                      <SelectItem value="1">
                        {t("settings:profile.dependents_1", "1 Tanggungan")}
                      </SelectItem>
                      <SelectItem value="2">
                        {t("settings:profile.dependents_2", "2 Tanggungan")}
                      </SelectItem>
                      <SelectItem value="3">
                        {t("settings:profile.dependents_3", "3 Tanggungan (Maksimal)")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t(
                      "settings:profile.financial_dependents_count_desc",
                      "Maksimal 3 tanggungan keluarga sedarah sesuai UU HPP.",
                    )}
                  </FieldDescription>
                </Field>

                {/* Field 3: Nomor Pokok Wajib Pajak (NPWP) */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-npwp" className="text-xs font-semibold h-4 flex items-center">
                    {t("settings:profile.financial_npwp", "Nomor Pokok Wajib Pajak (NPWP)")}
                  </FieldLabel>
                  <Input
                    id="pf-npwp"
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    placeholder={t("settings:profile.financial_npwp_ph", "00.000.000.0-000.000")}
                    className="text-xs h-9 tabular-nums"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t(
                      "settings:profile.financial_npwp_desc",
                      "NPWP 15 atau 16 digit. Akun tanpa NPWP dikenakan tarif pajak lebih tinggi (+20%).",
                    )}
                  </FieldDescription>
                </Field>

                {/* Field 4: Klasifikasi PTKP & TER (Tidak bisa diedit - warna teks dan visual dibedakan, tanpa caret) */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-ptkp-summary" className="text-xs font-semibold h-4 flex items-center text-muted-foreground">
                    {t("settings:profile.financial_ptkp_summary", "Klasifikasi PTKP & TER")}
                  </FieldLabel>
                  <Input
                    id="pf-ptkp-summary"
                    type="text"
                    readOnly
                    disabled
                    tabIndex={-1}
                    value={`${ptkpInfo.code} - TER ${ptkpInfo.terCategory} (${formatRupiah(ptkpInfo.annualValue)}/th)`}
                    onMouseDown={(e) => e.preventDefault()}
                    onFocus={(e) => e.currentTarget.blur()}
                    className="text-xs h-9 tabular-nums bg-muted/40 border-border/60 text-muted-foreground select-none cursor-not-allowed font-medium caret-transparent disabled:opacity-100 disabled:cursor-not-allowed focus-visible:ring-0 focus-visible:border-border/60"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate text-muted-foreground/80">
                    {ptkpInfo.description}
                  </FieldDescription>
                </Field>
              </div>
            </div>

            {/* Kolom 2: Data Rekening Bank Pencairan */}
            <div className="space-y-5">
              <div className="border-b border-border/60 pb-2.5 flex items-center gap-2 min-h-[35px]">
                <LandmarkIcon className="size-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("settings:profile.section_bank_title", "Data Rekening Bank Pencairan")}
                </h3>
              </div>

              <div className="space-y-5">
                {/* Field 1: Nama Bank */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-bank-name" className="text-xs font-semibold h-4 flex items-center">
                    {t("settings:profile.financial_bank_name", "Nama Bank")}
                  </FieldLabel>
                  <Input
                    id="pf-bank-name"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={t("settings:profile.financial_bank_name_ph", "Contoh: Bank Central Asia (BCA)")}
                    className="text-xs h-9"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t("settings:profile.financial_bank_name_desc", "Nama institusi perbankan resmi di Indonesia.")}
                  </FieldDescription>
                </Field>

                {/* Field 2: Nomor Rekening */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-bank-acc" className="text-xs font-semibold h-4 flex items-center">
                    {t("settings:profile.financial_bank_account", "Nomor Rekening")}
                  </FieldLabel>
                  <Input
                    id="pf-bank-acc"
                    type="text"
                    inputMode="numeric"
                    value={bankAccountNumber}
                    onChange={(e) =>
                      setBankAccountNumber(e.target.value.replace(/[^\d\s-]/g, ""))
                    }
                    placeholder={t("settings:profile.financial_bank_account_ph", "Hanya digit angka, contoh: 1234567890")}
                    className="text-xs h-9 tabular-nums"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t("settings:profile.financial_bank_account_desc", "Nomor rekening tujuan pencairan dana dan bagi hasil.")}
                  </FieldDescription>
                </Field>

                {/* Field 3: Atas Nama Rekening */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-bank-holder" className="text-xs font-semibold h-4 flex items-center">
                    {t("settings:profile.financial_bank_holder", "Atas Nama Rekening")}
                  </FieldLabel>
                  <Input
                    id="pf-bank-holder"
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    placeholder={t("settings:profile.financial_bank_holder_ph", "Nama pemilik rekening sesuai buku tabungan")}
                    className="text-xs h-9"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t("settings:profile.financial_bank_holder_desc", "Harus sesuai dengan nama pemilik rekening yang sah.")}
                  </FieldDescription>
                </Field>

                {/* Field 4: Status Rekening Pencairan (Tidak bisa diedit - selaras dengan PTKP, tanpa caret) */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="pf-bank-status" className="text-xs font-semibold h-4 flex items-center text-muted-foreground">
                    {t("settings:profile.financial_bank_status", "Status Rekening Pencairan")}
                  </FieldLabel>
                  <Input
                    id="pf-bank-status"
                    type="text"
                    readOnly
                    disabled
                    tabIndex={-1}
                    value={
                      bankAccountNumber.trim()
                        ? t("settings:profile.bank_status_ready", "Terdaftar - Siap Digunakan")
                        : t("settings:profile.bank_status_empty", "Belum Diatur (Pencairan Ditangguhkan)")
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onFocus={(e) => e.currentTarget.blur()}
                    className="text-xs h-9 tabular-nums bg-muted/40 border-border/60 text-muted-foreground select-none cursor-not-allowed font-medium caret-transparent disabled:opacity-100 disabled:cursor-not-allowed focus-visible:ring-0 focus-visible:border-border/60"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate text-muted-foreground/80">
                    {t(
                      "settings:profile.financial_bank_status_desc",
                      "Status kesiapan data rekening untuk pencairan dana dan bagi hasil.",
                    )}
                  </FieldDescription>
                </Field>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSavingFinancial}
              className="h-9 text-xs rounded-xl gap-2 shadow-xs cursor-pointer"
            >
              {isSavingFinancial ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>{t("settings:profile.btn_saving", "Menyimpan...")}</span>
                </>
              ) : (
                <>
                  <SaveIcon className="size-3.5" />
                  <span>{t("settings:profile.btn_save_financial", "Simpan Data Keuangan")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
