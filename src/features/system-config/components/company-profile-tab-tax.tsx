import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  SaveIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTimeI18n } from "@/lib/formatters";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CompanyProfileRow } from "@/types/database.types";

interface CompanyProfileTabTaxProps {
  company: CompanyProfileRow;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfileRow | null>>;
  saving: boolean;
  uploadingProof: boolean;
  pkpProofInputRef: React.RefObject<HTMLInputElement | null>;
  onPkpToggleChange: (checked: boolean) => void;
  onUploadPkpProof: (file: File) => Promise<void>;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CompanyProfileTabTax({
  company,
  setCompany,
  saving,
  uploadingProof,
  pkpProofInputRef,
  onPkpToggleChange,
  onUploadPkpProof,
  onSave,
}: CompanyProfileTabTaxProps) {
  const { t, language } = useLanguage();

  const hasPkpProof = Boolean(
    company.pkp_proof_storage_path &&
      company.pkp_proof_storage_path.trim().length > 0,
  );

  const sampleSubtotal = 10_000_000;
  const samplePpn = company.pkp_enabled
    ? Math.round((sampleSubtotal * company.ppn_rate) / 100)
    : 0;
  const sampleTotal = sampleSubtotal + samplePpn;

  return (
    <Card className="overflow-hidden">
      <CardHeaderWithInfo
        title={t(
          "settings:company.tax_pkp_title",
          "Status Pengusaha Kena Pajak (PKP) & Tarif PPN",
        )}
        description={t(
          "settings:company.tax_pkp_desc",
          "Konfigurasi pengenaan Pajak Pertambahan Nilai (PPN) pada dokumen penagihan resmi perusahaan.",
        )}
        action={
          <div className="shrink-0">
            <StatusBadge
              tone={company.pkp_enabled ? "warning" : "info"}
              label={
                company.pkp_enabled
                  ? t("settings:company.badge_pkp_active", {
                      rate: company.ppn_rate,
                      defaultValue: `PKP Aktif (${company.ppn_rate}% PPN)`,
                    })
                  : t("settings:company.badge_non_pkp", "Belum PKP (Non-PKP)")
              }
            />
          </div>
        }
      />

      <CardContent className="p-6">
        <form onSubmit={onSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Kolom Kiri: Status & Kontrol Aktivasi PKP */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 p-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 border",
                      company.pkp_enabled
                        ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                        : "bg-primary/15 text-primary border-primary/30",
                    )}
                  >
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground">
                      {company.pkp_enabled
                        ? t(
                            "settings:company.pkp_mode_active",
                            "Mode Pengusaha Kena Pajak (PKP) Aktif",
                          )
                        : t(
                            "settings:company.pkp_mode_inactive",
                            "Mode Non-PKP (Tanpa Pemungutan PPN)",
                          )}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {company.pkp_enabled
                        ? t("settings:company.pkp_desc_active", {
                            rate: company.ppn_rate,
                            defaultValue: `Setiap invoice klien baru akan menghitung otomatis PPN sebesar ${company.ppn_rate}% di atas subtotal tagihan.`,
                          })
                        : t(
                            "settings:company.pkp_desc_inactive",
                            "Selama perusahaan belum dikukuhkan sebagai PKP, seluruh invoice dan quotation otomatis mencantumkan keterangan resmi bebas PPN.",
                          )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/80 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">
                      {t("settings:company.switch_pkp_title", "Aktifkan Perhitungan PPN")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t(
                        "settings:company.switch_pkp_desc",
                        "Memerlukan berkas dokumen bukti pengukuhan PKP yang sah.",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={company.pkp_enabled}
                    disabled={!hasPkpProof && !company.pkp_enabled}
                    onCheckedChange={onPkpToggleChange}
                  />
                </div>

                {/* Upload Bukti Surat Pengukuhan PKP */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>{t("settings:company.pkp_proof_label", "Dokumen Bukti Pengukuhan PKP")}</span>
                      {company.pkp_enabled && (
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                          {t("settings:company.pkp_proof_required_badge", "Wajib")}
                        </span>
                      )}
                    </FieldLabel>
                    <div>
                      <input
                        ref={pkpProofInputRef}
                        type="file"
                        data-testid="pkp-proof-file-input"
                        accept="application/pdf,image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onUploadPkpProof(file);
                            e.target.value = "";
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingProof}
                        onClick={() => pkpProofInputRef.current?.click()}
                        className="h-8 rounded-xl px-3 text-xs gap-1.5 cursor-pointer"
                      >
                        {uploadingProof ? (
                          <>
                            <Loader2Icon className="size-3.5 animate-spin" />
                            <span>{t("settings:company.pkp_uploading_btn", "Mengunggah...")}</span>
                          </>
                        ) : (
                          <>
                            <UploadIcon className="size-3.5 text-primary" />
                            <span>
                              {hasPkpProof
                                ? t("settings:company.pkp_replace_btn", "Ganti Bukti")
                                : t("settings:company.pkp_upload_btn", "Unggah Bukti")}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {hasPkpProof ? (
                    <div className="rounded-xl border border-border/70 bg-card/90 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <FileTextIcon className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold text-foreground truncate"
                            data-testid="pkp-proof-filename"
                            title={company.pkp_proof_file_name || undefined}
                          >
                            {company.pkp_proof_file_name ||
                              t(
                                "settings:company.pkp_proof_default_name",
                                "Surat_Pengukuhan_PKP.pdf",
                              )}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {company.pkp_proof_size_bytes
                              ? `${Math.max(1, Math.round(company.pkp_proof_size_bytes / 1024))} KB`
                              : "PDF / Gambar"}
                            {company.pkp_proof_uploaded_at
                              ? ` • ${formatDateTimeI18n(company.pkp_proof_uploaded_at, language)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={company.pkp_proof_storage_path!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                        >
                          <ExternalLinkIcon className="size-3.5 text-primary" />
                          <span>
                            {t("settings:company.pkp_proof_view_btn", "Lihat Bukti")}
                          </span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
                      <span>
                        {t(
                          "settings:company.pkp_proof_missing_notice",
                          "Belum ada dokumen bukti pengukuhan PKP yang diunggah. Unggah berkas bukti (PDF/JPG/PNG maks. 5 MB) terlebih dahulu sebelum mengaktifkan status PKP.",
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2">
                  <CheckCircle2Icon className="size-3.5 text-primary shrink-0" />
                  <span>
                    {t(
                      "settings:company.sync_invoices_note",
                      "Sinkron otomatis ke Invoice & Quotation",
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2">
                  <CheckCircle2Icon className="size-3.5 text-primary shrink-0" />
                  <span>
                    {t(
                      "settings:company.audit_trail_recorded_note",
                      "Perubahan tercatat ke Audit Trail",
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Tarif PPN & Simulasi Perhitungan Invoice */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 p-5">
              <Field data-disabled={!company.pkp_enabled}>
                <FieldLabel
                  htmlFor="cp-ppn"
                  className="text-xs font-bold text-foreground"
                >
                  {t("settings:company.default_vat_rate", "Tarif PPN Default (%)")}
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
                    setCompany({ ...company, ppn_rate })
                  }
                  className="bg-background"
                />
                <FieldDescription className="text-[11px]">
                  {company.pkp_enabled
                    ? t(
                        "settings:company.vat_active_hint",
                        "Berlaku otomatis untuk penerbitan invoice berikutnya.",
                      )
                    : t(
                        "settings:company.vat_inactive_hint",
                        "Aktifkan status PKP di samping untuk mengubah tarif PPN.",
                      )}
                </FieldDescription>
              </Field>

              <div className="rounded-xl border border-border/70 bg-background/70 p-4 space-y-2.5">
                <p className="text-[11px] font-bold text-muted-foreground">
                  {t(
                    "settings:company.simulation_title",
                    "Simulasi Dampak Pada Tagihan Invoice",
                  )}
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {t("settings:company.subtotal_services", "Subtotal Jasa")}
                    </span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatRupiah(sampleSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {t("settings:company.vat_label", {
                        status: company.pkp_enabled
                          ? `${company.ppn_rate}%`
                          : "Non-PKP",
                        defaultValue: `PPN (${company.pkp_enabled ? `${company.ppn_rate}%` : "Non-PKP"})`,
                      })}
                    </span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatRupiah(samplePpn)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between font-bold text-foreground">
                    <span>
                      {t("settings:company.total_billing", "Total Tagihan")}
                    </span>
                    <span className="tabular-nums text-primary dark:text-cyan-400">
                      {formatRupiah(sampleTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground">
              {t(
                "settings:company.future_docs_only_note",
                "Pengaturan ini hanya memengaruhi dokumen penagihan yang baru dibuat setelah disimpan.",
              )}
            </p>
            <Button
              type="submit"
              disabled={saving || (company.pkp_enabled && !hasPkpProof)}
              className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
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
                      "settings:company.btn_save_tax",
                      "Simpan Pengaturan Pajak",
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
