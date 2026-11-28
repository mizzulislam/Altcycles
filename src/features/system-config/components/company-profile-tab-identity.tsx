import * as React from "react";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Field, FieldLabel } from "@/components/ui/field";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";

interface CompanyProfileTabIdentityProps {
  company: CompanyProfileRow;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfileRow | null>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function CompanyProfileTabIdentity({
  company,
  setCompany,
  saving,
  onSubmit,
}: CompanyProfileTabIdentityProps) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t(
          "settings:company.identity_kop_title",
          "Identitas & Kop Dokumen Resmi",
        )}
        description={t(
          "settings:company.identity_kop_desc",
          "Logo, nama usaha, dan alamat kantor ini otomatis tampil pada header SPK, SoW, Quotation, BAKP, UAT, BAST, Invoice, dan Kuitansi.",
        )}
      />
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageAssetUploadBox
              label={t(
                "settings:company.logo_official",
                "Logo Resmi Altvira",
              )}
              helperText={t(
                "settings:company.upload_source_hint",
                "Lokal / Google Drive",
              )}
              emptyTitle={t(
                "settings:company.upload_logo_title",
                "Upload Logo Perusahaan",
              )}
              emptySubtitle={t(
                "settings:company.upload_logo_subtitle",
                "Klik untuk memilih dari Lokal atau Google Drive",
              )}
              value={company.logo_storage_path}
              onChange={(next) =>
                setCompany({ ...company, logo_storage_path: next })
              }
            />

            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
              <FieldLabel
                htmlFor="cp-tagline"
                className="text-xs font-semibold"
              >
                {t(
                  "settings:company.tagline_signing_city",
                  "Tagline / Subjudul Kop & Kota Penandatanganan",
                )}
              </FieldLabel>
              <div className="grid gap-2">
                <Input
                  id="cp-tagline"
                  value={company.tagline ?? ""}
                  onChange={(e) =>
                    setCompany({ ...company, tagline: e.target.value })
                  }
                  placeholder={t(
                    "settings:company.tagline_placeholder",
                    "Contoh: ADAPT TODAY, INNOVATE TOMORROW",
                  )}
                  className="text-xs h-9 bg-background"
                />
                <Input
                  id="cp-city"
                  value={company.signing_city ?? "Bogor"}
                  onChange={(e) =>
                    setCompany({ ...company, signing_city: e.target.value })
                  }
                  placeholder={t(
                    "settings:company.signing_city_placeholder",
                    "Kota penandatanganan dokumen (mis. Bogor)",
                  )}
                  className="text-xs h-9 bg-background"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <FieldLabel
                htmlFor="cp-name"
                required
                className="text-xs font-semibold"
              >
                {t(
                  "settings:company.brand_name",
                  "Nama Unit Usaha / Brand",
                )}
              </FieldLabel>
              <Input
                id="cp-name"
                required
                value={company.company_name}
                onChange={(e) =>
                  setCompany({ ...company, company_name: e.target.value })
                }
                className="text-xs h-9"
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="cp-legal"
                required
                className="text-xs font-semibold"
              >
                {t("settings:company.legal_name", "Nama Badan Hukum")}
              </FieldLabel>
              <Input
                id="cp-legal"
                required
                value={company.legal_entity_name}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    legal_entity_name: e.target.value,
                  })
                }
                className="text-xs h-9"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <FieldLabel
                htmlFor="cp-email"
                required
                className="text-xs font-semibold"
              >
                {t(
                  "settings:company.email",
                  "Email Resmi Perusahaan",
                )}
              </FieldLabel>
              <Input
                id="cp-email"
                type="email"
                required
                value={company.email}
                onChange={(e) =>
                  setCompany({ ...company, email: e.target.value })
                }
                className="text-xs h-9"
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="cp-phone"
                required
                className="text-xs font-semibold"
              >
                {t(
                  "settings:company.phone",
                  "Nomor Telepon / WhatsApp",
                )}
              </FieldLabel>
              <Input
                id="cp-phone"
                required
                value={company.phone}
                onChange={(e) =>
                  setCompany({ ...company, phone: e.target.value })
                }
                className="text-xs h-9"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <FieldLabel
                htmlFor="cp-fax"
                className="text-xs font-semibold"
              >
                {t("settings:company.telephone_fax", "Telp. / Fax")}
              </FieldLabel>
              <Input
                id="cp-fax"
                value={company.telephone_fax ?? ""}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    telephone_fax: e.target.value,
                  })
                }
                placeholder={t(
                  "settings:company.telephone_fax_placeholder",
                  "Contoh: (0251) 8321xxx",
                )}
                className="text-xs h-9"
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="cp-website"
                className="text-xs font-semibold"
              >
                {t("settings:company.website", "Website Resmi")}
              </FieldLabel>
              <Input
                id="cp-website"
                value={company.website ?? ""}
                onChange={(e) =>
                  setCompany({ ...company, website: e.target.value })
                }
                placeholder={t(
                  "settings:company.website_placeholder",
                  "https://altvira.com",
                )}
                className="text-xs h-9"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel
              htmlFor="cp-address"
              required
              className="text-xs font-semibold"
            >
              {t("settings:company.address", "Alamat Lengkap Kantor")}
            </FieldLabel>
            <Textarea
              id="cp-address"
              required
              rows={3}
              value={company.address}
              onChange={(e) =>
                setCompany({ ...company, address: e.target.value })
              }
              className="text-xs"
            />
          </Field>

          <div className="flex justify-end pt-4 sm:pt-5 border-t border-border/60">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 px-4 text-xs sm:text-sm font-semibold rounded-xl gap-2 shadow-xs cursor-pointer max-sm:w-full"
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
                      "settings:company.btn_save_identity",
                      "Simpan Identitas Perusahaan",
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
