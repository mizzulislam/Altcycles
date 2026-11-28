import * as React from "react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  LandmarkIcon,
  Loader2Icon,
  PlusIcon,
  ReceiptTextIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";

export interface CompanyBankSlot {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface CompanyProfileTabFinancialProps {
  company: CompanyProfileRow;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfileRow | null>>;
  bankAccounts: CompanyBankSlot[];
  setBankAccounts: React.Dispatch<React.SetStateAction<CompanyBankSlot[]>>;
  saving: boolean;
  uploadingProof?: boolean;
  pkpProofInputRef?: React.RefObject<HTMLInputElement | null>;
  onPkpToggleChange?: (checked: boolean) => void;
  onUploadPkpProof?: (file: File) => Promise<void>;
  onAddBankSlot: () => void;
  onRemoveBankSlot: (idx: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CompanyProfileTabBankSigner(
  props: CompanyProfileTabFinancialProps,
) {
  return <CompanyProfileTabFinancial {...props} />;
}

export function CompanyProfileTabFinancial({
  company,
  setCompany,
  bankAccounts,
  setBankAccounts,
  saving,
  uploadingProof = false,
  pkpProofInputRef,
  onPkpToggleChange,
  onUploadPkpProof,
  onAddBankSlot,
  onRemoveBankSlot,
  onSubmit,
}: CompanyProfileTabFinancialProps) {
  const { t, language } = useLanguage();

  const hasPkpProof = Boolean(
    company.pkp_proof_storage_path &&
      company.pkp_proof_storage_path.trim().length > 0,
  );

  const primaryBank = bankAccounts[0] || {
    bank_name: company.bank_name || "",
    account_number: company.bank_account_number || "",
    account_holder: company.bank_account_holder || "",
  };

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t(
          "settings:company.financial_title",
          "Data Keuangan & Rekening Perusahaan",
        )}
        description={t(
          "settings:company.financial_security_notice",
          "Konfigurasi status Pengusaha Kena Pajak (PKP), tarif PPN invoice resmi, bukti pengukuhan SPPKP, serta rekening bank penerima pembayaran invoice klien.",
        )}
      />
      <CardContent className="p-5 sm:p-6 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Kolom 1: Status Perpajakan & PPN */}
            <div className="space-y-5">
              <div className="border-b border-border/60 pb-2 h-10 min-h-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ReceiptTextIcon className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(
                      "settings:company.section_tax_title",
                      "Status Perpajakan & PPN",
                    )}
                  </h3>
                </div>
              </div>

              <div className="space-y-5">
                {/* Baris 1: Status Pengusaha Kena Pajak (PKP) */}
                <Field className="space-y-1.5">
                  <FieldLabel
                    htmlFor="cp-pkp-toggle"
                    className="text-xs font-semibold h-4 flex items-center"
                  >
                    {t(
                      "settings:company.enable_pkp_label",
                      "Status Pengusaha Kena Pajak (PKP)",
                    )}
                  </FieldLabel>
                  <div className="h-9 px-3 rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] flex items-center justify-between gap-3 shadow-xs">
                    <span className="text-xs font-medium text-foreground truncate">
                      {company.pkp_enabled
                        ? t(
                            "settings:company.pkp_mode_active",
                            "Pengusaha Kena Pajak (PKP) Aktif",
                          )
                        : t(
                            "settings:company.pkp_mode_inactive",
                            "Bukan Pengusaha Kena Pajak (Non-PKP)",
                          )}
                    </span>
                    <Switch
                      id="cp-pkp-toggle"
                      checked={company.pkp_enabled}
                      disabled={saving}
                      onCheckedChange={onPkpToggleChange}
                    />
                  </div>
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {company.pkp_enabled
                      ? t(
                          "settings:company.pkp_desc_active",
                          `Setiap invoice baru otomatis menghitung PPN ${company.ppn_rate}%.`,
                        )
                      : t(
                          "settings:company.pkp_desc_inactive",
                          "Selama belum dikukuhkan sebagai PKP, seluruh invoice resmi bebas PPN.",
                        )}
                  </FieldDescription>
                </Field>

                {/* Baris 2: Tarif PPN Default (%) */}
                <Field
                  className="space-y-1.5"
                  data-disabled={!company.pkp_enabled}
                >
                  <FieldLabel
                    htmlFor="cp-ppn"
                    className="text-xs font-semibold h-4 flex items-center"
                  >
                    {t(
                      "settings:company.default_vat_rate",
                      "Tarif PPN Default (%)",
                    )}
                  </FieldLabel>
                  <NumberInput
                    id="cp-ppn"
                    allowDecimal
                    maxDecimals={2}
                    min={0}
                    max={100}
                    disabled={!company.pkp_enabled}
                    value={company.ppn_rate}
                    onValueChange={(ppn_rate) =>
                      setCompany((prev) =>
                        prev ? { ...prev, ppn_rate } : prev,
                      )
                    }
                    className="text-xs h-9 tabular-nums border-[var(--field-border)] bg-[var(--field-bg)] disabled:opacity-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {company.pkp_enabled
                      ? t(
                          "settings:company.vat_active_hint",
                          "Berlaku otomatis untuk penerbitan invoice berikutnya.",
                        )
                      : t(
                          "settings:company.vat_inactive_hint",
                          "Aktifkan status PKP di atas untuk mengubah tarif PPN.",
                        )}
                  </FieldDescription>
                </Field>

                {/* Baris 3: Dokumen Bukti Pengukuhan PKP (SPPKP) */}
                <Field className="space-y-1.5">
                  <FieldLabel
                    htmlFor="cp-proof-display"
                    className="text-xs font-semibold h-4 flex items-center"
                  >
                    {t(
                      "settings:company.pkp_proof_label",
                      "Dokumen Bukti Pengukuhan PKP (SPPKP)",
                    )}
                  </FieldLabel>
                  <div className="h-9 px-3 rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileTextIcon className="size-4 text-primary shrink-0" />
                      {hasPkpProof ? (
                        <span
                          id="cp-proof-display"
                          data-testid="pkp-proof-filename"
                          className="text-xs truncate font-medium text-foreground"
                        >
                          {company.pkp_proof_file_name ||
                            "Surat_Pengukuhan_PKP.pdf"}
                        </span>
                      ) : (
                        <span
                          id="cp-proof-display"
                          className="text-xs truncate font-medium text-muted-foreground"
                        >
                          {t(
                            "settings:company.pkp_proof_empty",
                            "Belum ada dokumen bukti SPPKP diunggah",
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPkpProof && (
                        <a
                          href={company.pkp_proof_storage_path!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 px-2 rounded-lg border border-[var(--field-border)] bg-card hover:bg-muted text-[11px] font-medium text-primary inline-flex items-center gap-1 transition-colors"
                        >
                          <ExternalLinkIcon className="size-3" />
                          <span>
                            {t(
                              "settings:company.pkp_proof_view_btn",
                              "Lihat Bukti",
                            )}
                          </span>
                        </a>
                      )}
                      {pkpProofInputRef && (
                        <input
                          ref={pkpProofInputRef}
                          type="file"
                          data-testid="pkp-proof-file-input"
                          accept="application/pdf,image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUploadPkpProof) {
                              void onUploadPkpProof(file);
                              e.target.value = "";
                            }
                          }}
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingProof}
                        onClick={() => pkpProofInputRef?.current?.click()}
                        className="h-6 rounded-lg px-2 text-[11px] gap-1 cursor-pointer border-[var(--field-border)]"
                      >
                        {uploadingProof ? (
                          <>
                            <Loader2Icon className="size-3 animate-spin" />
                            <span>
                              {t("common:action.loading", "Mengunggah...")}
                            </span>
                          </>
                        ) : (
                          <>
                            <UploadIcon className="size-3 text-primary" />
                            <span>
                              {hasPkpProof
                                ? t(
                                    "settings:company.pkp_proof_replace_btn",
                                    "Ganti Bukti",
                                  )
                                : t(
                                    "settings:company.pkp_proof_upload_btn",
                                    "Unggah Bukti",
                                  )}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {hasPkpProof && company.pkp_proof_uploaded_at
                      ? `${company.pkp_proof_size_bytes ? `${Math.max(1, Math.round(company.pkp_proof_size_bytes / 1024))} KB - ` : ""}${formatDateTimeI18n(company.pkp_proof_uploaded_at, language)}`
                      : t(
                          "settings:company.pkp_proof_missing_desc",
                          "Wajib diunggah sebelum mengaktifkan status PKP (PDF/JPG/PNG maks. 5 MB).",
                        )}
                  </FieldDescription>
                </Field>
              </div>
            </div>

            {/* Kolom 2: Data Rekening Bank Transfer */}
            <div className="space-y-5">
              <div className="border-b border-border/60 pb-2 h-10 min-h-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LandmarkIcon className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(
                      "settings:company.section_bank_title",
                      "Data Rekening Bank Transfer",
                    )}
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddBankSlot}
                  className="h-7 rounded-xl px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <PlusIcon className="size-3.5" />
                  <span>
                    {t("settings:company.add_bank_btn", "Tambah Rekening")}
                  </span>
                </Button>
              </div>

              <div className="space-y-5">
                {/* Baris 1: Nama Bank */}
                <Field className="space-y-1.5">
                  <FieldLabel
                    htmlFor="cp-bank-0"
                    required
                    className="text-xs font-semibold h-4 flex items-center"
                  >
                    {t("settings:company.bank_name", "Nama Bank")}
                  </FieldLabel>
                  <Input
                    id="cp-bank-0"
                    required
                    value={primaryBank.bank_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBankAccounts((prev) => {
                        if (prev.length === 0) {
                          return [
                            {
                              bank_name: val,
                              account_number: "",
                              account_holder: "",
                            },
                          ];
                        }
                        return prev.map((item, i) =>
                          i === 0 ? { ...item, bank_name: val } : item,
                        );
                      });
                      setCompany((prev) =>
                        prev ? { ...prev, bank_name: val } : prev,
                      );
                    }}
                    placeholder={t(
                      "settings:company.bank_name_placeholder",
                      "Contoh: Bank Central Asia (BCA) / Bank Jago",
                    )}
                    className="text-xs h-9"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t(
                      "settings:company.bank_name_desc",
                      "Nama institusi perbankan resmi rekening transfer utama.",
                    )}
                  </FieldDescription>
                </Field>

                {/* Baris 2: Nomor Rekening */}
                <Field className="space-y-1.5">
                  <FieldLabel
                    htmlFor="cp-accno-0"
                    required
                    className="text-xs font-semibold h-4 flex items-center"
                  >
                    {t(
                      "settings:company.bank_account_number",
                      "Nomor Rekening",
                    )}
                  </FieldLabel>
                  <Input
                    id="cp-accno-0"
                    required
                    value={primaryBank.account_number}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBankAccounts((prev) => {
                        if (prev.length === 0) {
                          return [
                            {
                              bank_name: "",
                              account_number: val,
                              account_holder: "",
                            },
                          ];
                        }
                        return prev.map((item, i) =>
                          i === 0 ? { ...item, account_number: val } : item,
                        );
                      });
                      setCompany((prev) =>
                        prev ? { ...prev, bank_account_number: val } : prev,
                      );
                    }}
                    placeholder={t(
                      "settings:company.account_number_placeholder",
                      "Contoh: 103289122849",
                    )}
                    className="text-xs h-9 tabular-nums"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t(
                      "settings:company.bank_acc_desc",
                      "Nomor rekening penerima transfer resmi pada invoice penagihan.",
                    )}
                  </FieldDescription>
                </Field>

                {/* Baris 3: Atas Nama Rekening */}
                <Field className="space-y-1.5">
                  <FieldLabel
                    htmlFor="cp-holder-0"
                    required
                    className="text-xs font-semibold h-4 flex items-center"
                  >
                    {t(
                      "settings:company.bank_account_holder",
                      "Atas Nama Rekening",
                    )}
                  </FieldLabel>
                  <Input
                    id="cp-holder-0"
                    required
                    value={primaryBank.account_holder}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBankAccounts((prev) => {
                        if (prev.length === 0) {
                          return [
                            {
                              bank_name: "",
                              account_number: "",
                              account_holder: val,
                            },
                          ];
                        }
                        return prev.map((item, i) =>
                          i === 0 ? { ...item, account_holder: val } : item,
                        );
                      });
                      setCompany((prev) =>
                        prev ? { ...prev, bank_account_holder: val } : prev,
                      );
                    }}
                    placeholder={t(
                      "settings:company.account_holder_placeholder",
                      "Nama pemilik rekening sesuai buku tabungan",
                    )}
                    className="text-xs h-9"
                  />
                  <FieldDescription className="text-[11px] leading-normal min-h-[16px] truncate">
                    {t(
                      "settings:company.bank_holder_desc",
                      "Harus sesuai dengan nama pemilik rekening yang sah.",
                    )}
                  </FieldDescription>
                </Field>

                {/* Rekening Tambahan (Jika Ada, idx > 0) */}
                {bankAccounts.slice(1).map((acct, offsetIdx) => {
                  const idx = offsetIdx + 1;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <LandmarkIcon className="size-4 text-primary dark:text-sky-400" />
                          <span>
                            {t("settings:company.bank_slot_title", {
                              index: idx + 1,
                              defaultValue: `Rekening #${idx + 1}`,
                            })}
                          </span>
                        </div>
                        <ActionTooltip
                          content={t(
                            "settings:company.remove_bank_tooltip",
                            "Hapus rekening ini",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onRemoveBankSlot(idx)}
                            className="size-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2Icon className="size-3.5" />
                            <span className="sr-only">
                              {t(
                                "settings:company.remove_bank_sr",
                                "Hapus Rekening",
                              )}
                            </span>
                          </button>
                        </ActionTooltip>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field className="space-y-1">
                          <FieldLabel
                            htmlFor={`cp-bank-${idx}`}
                            required
                            className="text-[11px] font-semibold"
                          >
                            {t("settings:company.bank_name", "Nama Bank")}
                          </FieldLabel>
                          <Input
                            id={`cp-bank-${idx}`}
                            required
                            value={acct.bank_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBankAccounts((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, bank_name: val }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="BCA / Mandiri"
                            className="text-xs h-8"
                          />
                        </Field>
                        <Field className="space-y-1">
                          <FieldLabel
                            htmlFor={`cp-accno-${idx}`}
                            required
                            className="text-[11px] font-semibold"
                          >
                            {t(
                              "settings:company.bank_account_number",
                              "No. Rekening",
                            )}
                          </FieldLabel>
                          <Input
                            id={`cp-accno-${idx}`}
                            required
                            value={acct.account_number}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBankAccounts((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, account_number: val }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="12345678"
                            className="text-xs h-8 tabular-nums"
                          />
                        </Field>
                        <Field className="space-y-1">
                          <FieldLabel
                            htmlFor={`cp-holder-${idx}`}
                            required
                            className="text-[11px] font-semibold"
                          >
                            {t(
                              "settings:company.bank_account_holder",
                              "Atas Nama",
                            )}
                          </FieldLabel>
                          <Input
                            id={`cp-holder-${idx}`}
                            required
                            value={acct.account_holder}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBankAccounts((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, account_holder: val }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="Nama pemilik"
                            className="text-xs h-8"
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground">
              {t(
                "settings:company.future_docs_only_note",
                "Pengaturan ini memengaruhi dokumen penagihan dan rekening yang baru dibuat setelah disimpan.",
              )}
            </p>
            <Button
              type="submit"
              disabled={saving || (company.pkp_enabled && !hasPkpProof)}
              className="h-9 text-xs rounded-xl gap-2 shadow-xs cursor-pointer max-sm:w-full"
            >
              {saving ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>{t("common:action.loading", "Menyimpan...")}</span>
                </>
              ) : (
                <>
                  <SaveIcon className="size-3.5" />
                  <span>
                    {t(
                      "settings:company.btn_save_financial",
                      "Simpan Data Keuangan",
                    )}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
