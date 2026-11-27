import * as React from "react";
import {
  LandmarkIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Field, FieldLabel } from "@/components/ui/field";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";

export interface CompanyBankSlot {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface CompanyProfileTabBankSignerProps {
  company: CompanyProfileRow;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfileRow | null>>;
  bankAccounts: CompanyBankSlot[];
  setBankAccounts: React.Dispatch<React.SetStateAction<CompanyBankSlot[]>>;
  saving: boolean;
  onAddBankSlot: () => void;
  onRemoveBankSlot: (idx: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CompanyProfileTabBankSigner({
  company,
  setCompany,
  bankAccounts,
  setBankAccounts,
  saving,
  onAddBankSlot,
  onRemoveBankSlot,
  onSubmit,
}: CompanyProfileTabBankSignerProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t(
          "settings:company.accounts_signatures_title",
          "Rekening Transfer & Aset Tanda Tangan Resmi",
        )}
        description={t(
          "settings:company.accounts_signatures_desc",
          "Rekening bank penerima pembayaran Invoice/SPK, identitas NPWP/NIK resmi, serta gambar tanda tangan & paraf digital Altvira.",
        )}
        action={
          <Button
            type="button"
            onClick={onAddBankSlot}
            className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <PlusIcon className="size-4" />
            <span>
              {t("settings:company.add_bank_btn", "Tambah Rekening")}
            </span>
          </Button>
        }
      />
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-4">
            {bankAccounts.map((acct, idx) => {
              const isMultiple = bankAccounts.length > 1;
              const content = (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Field>
                    <FieldLabel
                      htmlFor={`cp-bank-${idx}`}
                      required
                      className="text-xs font-semibold"
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
                            i === idx ? { ...item, bank_name: val } : item,
                          ),
                        );
                        if (idx === 0) {
                          setCompany({ ...company, bank_name: val });
                        }
                      }}
                      placeholder={t(
                        "settings:company.bank_name_placeholder",
                        "Contoh: Bank Jago / BCA",
                      )}
                      className="text-xs h-9"
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor={`cp-accno-${idx}`}
                      required
                      className="text-xs font-semibold"
                    >
                      {t(
                        "settings:company.bank_account_number",
                        "Nomor Rekening",
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
                        if (idx === 0) {
                          setCompany({
                            ...company,
                            bank_account_number: val,
                          });
                        }
                      }}
                      placeholder={t(
                        "settings:company.account_number_placeholder",
                        "Contoh: 103289122849",
                      )}
                      className="text-xs h-9 tabular-nums"
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor={`cp-holder-${idx}`}
                      required
                      className="text-xs font-semibold"
                    >
                      {t(
                        "settings:company.bank_account_holder",
                        "Atas Nama Rekening",
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
                        if (idx === 0) {
                          setCompany({
                            ...company,
                            bank_account_holder: val,
                          });
                        }
                      }}
                      placeholder={t(
                        "settings:company.account_holder_placeholder",
                        "Nama pemilik rekening",
                      )}
                      className="text-xs h-9"
                    />
                  </Field>
                </div>
              );

              if (!isMultiple) {
                return <React.Fragment key={idx}>{content}</React.Fragment>;
              }

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
                        {idx === 0
                          ? ` ${t("settings:company.primary_slot", "(Utama)")}`
                          : ""}
                      </span>
                    </div>
                    {idx > 0 ? (
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
                    ) : null}
                  </div>
                  {content}
                </div>
              );
            })}
          </div>

          {/* Grid: Identitas Pejabat Penandatangan + Gambar Tanda Tangan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-7 rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="cp-signer"
                    required
                    className="text-xs font-semibold"
                  >
                    {t(
                      "settings:company.default_signer_name",
                      "Nama Penandatangan Default",
                    )}
                  </FieldLabel>
                  <Input
                    id="cp-signer"
                    required
                    value={company.signer_name}
                    onChange={(e) =>
                      setCompany({ ...company, signer_name: e.target.value })
                    }
                    className="text-xs h-9 bg-background"
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="cp-title"
                    required
                    className="text-xs font-semibold"
                  >
                    {t(
                      "settings:company.signer_title",
                      "Jabatan Penandatangan",
                    )}
                  </FieldLabel>
                  <Input
                    id="cp-title"
                    required
                    value={company.signer_title}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        signer_title: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-background"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel
                  htmlFor="cp-tax-id"
                  className="text-xs font-semibold"
                >
                  {t("settings:company.tax_id_npwp_nik", "NPWP / NIK")}
                </FieldLabel>
                <Input
                  id="cp-tax-id"
                  value={company.tax_id_number ?? ""}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      tax_id_number: e.target.value,
                    })
                  }
                  placeholder={t(
                    "settings:company.tax_id_placeholder",
                    "Contoh: 00.000.000.0-000.000 atau NIK",
                  )}
                  className="text-xs h-9 tabular-nums bg-background"
                />
              </Field>
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <ImageAssetUploadBox
                label={t(
                  "settings:company.signature_img_label",
                  "Gambar Tanda Tangan (TTD)",
                )}
                helperText={t(
                  "settings:company.upload_source_hint",
                  "Lokal / Google Drive",
                )}
                emptyTitle={t(
                  "settings:company.upload_signature_title",
                  "Upload Gambar Tanda Tangan",
                )}
                emptySubtitle={t(
                  "settings:company.upload_signature_subtitle",
                  "Klik untuk memilih PNG transparan dari Lokal / Google Drive",
                )}
                value={company.signer_signature_path}
                onChange={(next) =>
                  setCompany({ ...company, signer_signature_path: next })
                }
                previewHeightClassName="h-[116px]"
                className="h-full flex-1"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer max-sm:w-full"
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
                      "settings:company.btn_save_bank_signer",
                      "Simpan Rekening & Tanda Tangan",
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
