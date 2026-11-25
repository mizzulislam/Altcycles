import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2Icon,
  LandmarkIcon,
  Loader2Icon,
  PlusIcon,
  ReceiptIcon,
  SaveIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { PageLoader } from "@/components/ui/loader";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getNormalizedSocialLinks,
  SOCIAL_PLATFORM_OPTIONS,
} from "@/lib/asset-utils";
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyPkpProof,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  BankAccountEntry,
  CompanyProfileRow,
  SocialMediaEntry,
} from "@/types/database.types";
import { TruncatedTooltipText } from "@/components/shared/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { CompanyProfileTabSocials } from "./components/company-profile-tab-socials";
import { CompanyProfileTabTax } from "./components/company-profile-tab-tax";

type CompanyTab = "identitas" | "keuangan" | "sosmed" | "pajak";

export function CompanyProfilePage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as CompanyTab | null;
  const activeTab: CompanyTab =
    tabParam && ["identitas", "keuangan", "sosmed", "pajak"].includes(tabParam)
      ? tabParam
      : "identitas";

  const handleTabChange = (tab: CompanyTab) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPkpProof, setUploadingPkpProof] = React.useState(false);
  const pkpFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountEntry[]>([]);
  const [socials, setSocials] = React.useState<SocialMediaEntry[]>([]);
  const [pendingPkpState, setPendingPkpState] = React.useState<boolean | null>(
    null,
  );

  function normalizeBankAccounts(comp: CompanyProfileRow): BankAccountEntry[] {
    if (comp.bank_accounts_json && comp.bank_accounts_json.length > 0) {
      return comp.bank_accounts_json.map((b) => ({
        bank_name: b.bank_name ?? "",
        account_number: b.account_number ?? "",
        account_holder: b.account_holder ?? "",
      }));
    }
    return [
      {
        bank_name: comp.bank_name ?? "",
        account_number: comp.bank_account_number ?? "",
        account_holder: comp.bank_account_holder ?? "",
      },
    ];
  }

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const comp = await getCompanyProfile();
      setCompany(comp);
      setBankAccounts(normalizeBankAccounts(comp));
      setSocials(getNormalizedSocialLinks(comp));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat profil perusahaan.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    // Validasi sosial media di klien (Item 6)
    const seenSocials = new Set<string>();
    const cleanedSocials: SocialMediaEntry[] = [];
    for (let i = 0; i < socials.length; i++) {
      const s = socials[i]!;
      const platform = (s.platform || "").trim();
      const username = (s.username || "").trim();
      const url = (s.url || "").trim();
      if (!platform || !username) {
        toast.error(
          t(
            "settings:company.social_error_required",
            `Sosial Media #${i + 1}: Platform dan Username/Handle wajib diisi.`,
          ),
        );
        return;
      }
      if (url && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
        toast.error(
          t(
            "settings:company.social_error_invalid_url",
            `Sosial Media #${i + 1}: Format URL tidak valid. Gunakan awalan https:// atau http://.`,
          ),
        );
        return;
      }
      const dedupKey = `${platform.toLowerCase()}::${username.toLowerCase()}`;
      if (seenSocials.has(dedupKey)) {
        toast.error(
          t("settings:company.social_error_duplicate", {
            platform,
            username,
            defaultValue: `Akun sosial media duplikat terdeteksi untuk ${platform} (${username}).`,
          }),
        );
        return;
      }
      seenSocials.add(dedupKey);
      cleanedSocials.push({
        platform,
        username,
        url: url || undefined,
      });
    }

    // Validasi bukti PKP saat status PKP aktif (Item 7)
    if (
      company.pkp_enabled &&
      (!company.pkp_proof_storage_path || !company.pkp_proof_storage_path.trim())
    ) {
      toast.error(
        t(
          "settings:company.pkp_proof_required_toast",
          "Wajib mengunggah bukti pengukuhan PKP (PDF/JPG/PNG maks. 5 MB) sebelum menyimpan status PKP aktif.",
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const cleanedBanks = (bankAccounts.length > 0
        ? bankAccounts
        : normalizeBankAccounts(company)
      ).map((b) => ({
        bank_name: b.bank_name.trim(),
        account_number: b.account_number.trim(),
        account_holder: b.account_holder.trim(),
      }));
      const primaryBank = cleanedBanks[0] ?? {
        bank_name: company.bank_name.trim(),
        account_number: company.bank_account_number.trim(),
        account_holder: company.bank_account_holder.trim(),
      };
      const updated = await updateCompanyProfile({
        company_name: company.company_name.trim(),
        legal_entity_name: company.legal_entity_name.trim(),
        tagline: (company.tagline ?? "").trim() || null,
        address: company.address.trim(),
        email: company.email.trim(),
        phone: company.phone.trim(),
        telephone_fax: (company.telephone_fax ?? "").trim() || null,
        website: (company.website ?? "").trim() || null,
        signing_city: (company.signing_city ?? "Bogor").trim(),
        logo_storage_path: company.logo_storage_path ?? null,
        bank_name: primaryBank.bank_name,
        bank_account_number: primaryBank.account_number,
        bank_account_holder: primaryBank.account_holder,
        bank_accounts_json: cleanedBanks,
        signer_name: company.signer_name.trim(),
        signer_title: company.signer_title.trim(),
        tax_id_number: (company.tax_id_number ?? "").trim() || null,
        signer_signature_path: company.signer_signature_path ?? null,
        social_links_json: cleanedSocials,
        ppn_rate: company.ppn_rate,
        pkp_proof_storage_path: company.pkp_proof_storage_path ?? null,
        pkp_proof_file_name: company.pkp_proof_file_name ?? null,
        pkp_proof_mime_type: company.pkp_proof_mime_type ?? null,
        pkp_proof_size_bytes: company.pkp_proof_size_bytes ?? null,
        pkp_proof_uploaded_at: company.pkp_proof_uploaded_at ?? null,
      });
      setCompany(updated);
      setBankAccounts(normalizeBankAccounts(updated));
      setSocials(getNormalizedSocialLinks(updated));
      toast.success(
        t(
          "settings:company.toast_saved",
          "Profil perusahaan berhasil diperbarui.",
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan profil perusahaan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPkpProofFile(file: File) {
    if (!file || !company) return;
    setUploadingPkpProof(true);
    try {
      const uploaded = await uploadCompanyPkpProof(file);
      const updated = await updateCompanyProfile({
        pkp_proof_storage_path: uploaded.storagePath,
        pkp_proof_file_name: uploaded.fileName,
        pkp_proof_mime_type: uploaded.mimeType,
        pkp_proof_size_bytes: uploaded.sizeBytes,
        pkp_proof_uploaded_at: uploaded.uploadedAt,
      });
      setCompany(updated);
      toast.success(
        t(
          "settings:company.pkp_proof_uploaded_toast",
          "Bukti pengukuhan PKP berhasil diunggah dan disimpan.",
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t(
              "settings:company.pkp_proof_upload_error",
              "Gagal mengunggah bukti pengukuhan PKP.",
            ),
      );
    } finally {
      setUploadingPkpProof(false);
      
    }
  }

  function handleAddBankSlot() {
    setBankAccounts((prev) => [
      ...prev,
      {
        bank_name: "",
        account_number: "",
        account_holder:
          prev[0]?.account_holder || company?.bank_account_holder || "",
      },
    ]);
  }

  function handleRemoveBankSlot(idx: number) {
    if (bankAccounts.length <= 1) return;
    setBankAccounts((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddSocialSlot() {
    const usedPlatforms = new Set(socials.map((s) => s.platform));
    const nextPlatform =
      SOCIAL_PLATFORM_OPTIONS.find((opt) => !usedPlatforms.has(opt)) ?? "Website";
    setSocials((prev) => [...prev, { platform: nextPlatform, username: "" }]);
  }

  function handleRemoveSocialSlot(idx: number) {
    if (socials.length <= 1) return;
    setSocials((prev) => prev.filter((_, i) => i !== idx));
  }

  if (loading || !company) {
    return <PageLoader message={t("settings:company.loading")} />;
  }

  
  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <TruncatedTooltipText as="h1" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("settings:company.page_title", "Profil Perusahaan")}
        </TruncatedTooltipText>
        <TruncatedTooltipText as="p" className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          {t("settings:company.page_desc", "Kelola identitas kop surat, logo resmi, rekening transfer, aset tanda tangan resmi, akun sosial media footer dokumen, serta status perpajakan.")}
        </TruncatedTooltipText>
      </div>

      {/* Tab Navigasi 4-Kolom (Tinggi & Gaya Diselaraskan dengan Standar Tab Halaman) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => handleTabChange("identitas")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "identitas"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Building2Icon className="size-4 shrink-0" />
          <span className="truncate">{t("company.tab_identity", "Identitas & Logo")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("keuangan")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "keuangan"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <LandmarkIcon className="size-4 shrink-0" />
          <span className="truncate">{t("company.tab_accounts", "Rekening & TTD")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("sosmed")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "sosmed"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Share2Icon className="size-4 shrink-0" />
          <span className="truncate">{t("company.tab_social", "Sosial Media Footer")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("pajak")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "pajak"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <ReceiptIcon className="size-4 shrink-0" />
          <span className="truncate">{t("settings:company.tab_tax_pkp", "Perpajakan (PKP)")}</span>
        </button>
      </div>

      <div className="w-full">
        {/* TAB 1: IDENTITAS & LOGO PERUSAHAAN */}
        {activeTab === "identitas" && (
          <Card>
            <CardHeaderWithInfo
              title={t("settings:company.identity_kop_title", "Identitas & Kop Dokumen Resmi")}
              description={t("settings:company.identity_kop_desc", "Logo, nama usaha, dan alamat kantor ini otomatis tampil pada header SPK, SoW, Quotation, BAKP, UAT, BAST, Invoice, dan Kuitansi.")}
            />
            <CardContent className="pt-5">
              <form onSubmit={handleSaveCompany} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ImageAssetUploadBox
                    label={t("settings:company.logo_official", "Logo Resmi Altvira")}
                    helperText={t("settings:company.upload_source_hint", "Lokal / Google Drive")}
                    emptyTitle={t("settings:company.upload_logo_title", "Upload Logo Perusahaan")}
                    emptySubtitle={t("settings:company.upload_logo_subtitle", "Klik untuk memilih dari Lokal atau Google Drive")}
                    value={company.logo_storage_path}
                    onChange={(next) =>
                      setCompany({ ...company, logo_storage_path: next })
                    }
                  />

                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
                    <FieldLabel htmlFor="cp-tagline" className="text-xs font-semibold">
                      {t("settings:company.tagline_signing_city", "Tagline / Subjudul Kop & Kota Penandatanganan")}
                    </FieldLabel>
                    <div className="grid gap-2">
                      <Input
                        id="cp-tagline"
                        value={company.tagline ?? ""}
                        onChange={(e) =>
                          setCompany({ ...company, tagline: e.target.value })
                        }
                        placeholder={t("settings:company.tagline_placeholder", "Contoh: ADAPT TODAY, INNOVATE TOMORROW")}
                        className="text-xs h-9 bg-background"
                      />
                      <Input
                        id="cp-city"
                        value={company.signing_city ?? "Bogor"}
                        onChange={(e) =>
                          setCompany({ ...company, signing_city: e.target.value })
                        }
                        placeholder={t("settings:company.signing_city_placeholder", "Kota penandatanganan dokumen (mis. Bogor)")}
                        className="text-xs h-9 bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel htmlFor="cp-name" required className="text-xs font-semibold">
                      {t("settings:company.brand_name", "Nama Unit Usaha / Brand")}
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
                    <FieldLabel htmlFor="cp-legal" required className="text-xs font-semibold">
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
                    <FieldLabel htmlFor="cp-email" required className="text-xs font-semibold">
                      {t("settings:company.email", "Email Resmi Perusahaan")}
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
                    <FieldLabel htmlFor="cp-phone" required className="text-xs font-semibold">
                      {t("settings:company.phone", "Nomor Telepon / WhatsApp")}
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
                    <FieldLabel htmlFor="cp-fax" className="text-xs font-semibold">
                      {t("settings:company.telephone_fax", "Telp. / Fax")}
                    </FieldLabel>
                    <Input
                      id="cp-fax"
                      value={company.telephone_fax ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, telephone_fax: e.target.value })
                      }
                      placeholder={t("settings:company.telephone_fax_placeholder", "Contoh: (0251) 8321xxx")}
                      className="text-xs h-9"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cp-website" className="text-xs font-semibold">
                      {t("settings:company.website", "Website")}
                    </FieldLabel>
                    <Input
                      id="cp-website"
                      value={company.website ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, website: e.target.value })
                      }
                      placeholder={t("settings:company.website_placeholder", "Contoh: www.altvira.id")}
                      className="text-xs h-9"
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="cp-addr" required className="text-xs font-semibold">
                    {t("settings:company.address", "Alamat Lengkap Kantor")}
                  </FieldLabel>
                  <Textarea
                    id="cp-addr"
                    required
                    rows={3}
                    value={company.address}
                    onChange={(e) =>
                      setCompany({ ...company, address: e.target.value })
                    }
                    className="text-xs"
                  />
                </Field>

                <div className="flex justify-end pt-2 border-t border-border/60">
                  <Button
                    type="submit"
                    disabled={saving}
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
                        <span>{t("settings:company.btn_save_identity", "Simpan Identitas Perusahaan")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: REKENING & TANDA TANGAN */}
        {activeTab === "keuangan" && (
          <Card>
            <CardHeaderWithInfo
              title={t("settings:company.accounts_signatures_title", "Rekening Transfer & Aset Tanda Tangan Resmi")}
              description={t("settings:company.accounts_signatures_desc", "Rekening bank penerima pembayaran Invoice/SPK, identitas NPWP/NIK resmi, serta gambar tanda tangan & paraf digital Altvira.")}
              action={
                <Button
                  type="button"
                  onClick={handleAddBankSlot}
                  className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <PlusIcon className="size-4" />
                  <span>{t("settings:company.add_bank_btn", "Tambah Rekening")}</span>
                </Button>
              }
            />
            <CardContent className="pt-5">
              <form onSubmit={handleSaveCompany} className="space-y-5">
                <div className="space-y-4">
                  {bankAccounts.map((acct, idx) => {
                    const isMultiple = bankAccounts.length > 1;
                    const content = (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field>
                          <FieldLabel htmlFor={`cp-bank-${idx}`} required className="text-xs font-semibold">
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
                            placeholder={t("settings:company.bank_name_placeholder", "Contoh: Bank Jago / BCA")}
                            className="text-xs h-9"
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`cp-accno-${idx}`} required className="text-xs font-semibold">
                            {t("settings:company.bank_account_number", "Nomor Rekening")}
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
                            placeholder={t("settings:company.account_number_placeholder", "Contoh: 103289122849")}
                            className="text-xs h-9 tabular-nums"
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`cp-holder-${idx}`} required className="text-xs font-semibold">
                            {t("settings:company.bank_account_holder", "Atas Nama Rekening")}
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
                            placeholder={t("settings:company.account_holder_placeholder", "Nama pemilik rekening")}
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
                              {idx === 0 ? ` ${t("settings:company.primary_slot", "(Utama)")}` : ""}
                            </span>
                          </div>
                          {idx > 0 ? (
                            <ActionTooltip content={t("settings:company.remove_bank_tooltip", "Hapus rekening ini")}>
                            <button
                              type="button"
                              onClick={() => handleRemoveBankSlot(idx)}
                              className="size-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            >
                              <Trash2Icon className="size-3.5" />
                              <span className="sr-only">{t("settings:company.remove_bank_sr", "Hapus Rekening")}</span>
                            </button>
                            </ActionTooltip>
                          ) : null}
                        </div>
                        {content}
                      </div>
                    );
                  })}
                </div>

                {/* Grid Penuh & Proporsional: Identitas Pejabat Penandatangan (Kiri) + Gambar Tanda Tangan (Kanan) Tanpa Ruang Kosong (Item 5) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-7 rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col justify-between gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="cp-signer" required className="text-xs font-semibold">
                          {t("settings:company.default_signer_name", "Nama Penandatangan Default")}
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
                        <FieldLabel htmlFor="cp-title" required className="text-xs font-semibold">
                          {t("settings:company.signer_title", "Jabatan Penandatangan")}
                        </FieldLabel>
                        <Input
                          id="cp-title"
                          required
                          value={company.signer_title}
                          onChange={(e) =>
                            setCompany({ ...company, signer_title: e.target.value })
                          }
                          className="text-xs h-9 bg-background"
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="cp-tax-id" className="text-xs font-semibold">
                        {t("settings:company.tax_id_npwp_nik", "NPWP / NIK")}
                      </FieldLabel>
                      <Input
                        id="cp-tax-id"
                        value={company.tax_id_number ?? ""}
                        onChange={(e) =>
                          setCompany({ ...company, tax_id_number: e.target.value })
                        }
                        placeholder={t("settings:company.tax_id_placeholder", "Contoh: 00.000.000.0-000.000 atau NIK")}
                        className="text-xs h-9 tabular-nums bg-background"
                      />
                    </Field>
                  </div>

                  <div className="lg:col-span-5 flex flex-col">
                    <ImageAssetUploadBox
                      label={t("settings:company.signature_img_label", "Gambar Tanda Tangan (TTD)")}
                      helperText={t("settings:company.upload_source_hint", "Lokal / Google Drive")}
                      emptyTitle={t("settings:company.upload_signature_title", "Upload Gambar Tanda Tangan")}
                      emptySubtitle={t("settings:company.upload_signature_subtitle", "Klik untuk memilih PNG transparan dari Lokal / Google Drive")}
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
                        <span>{t("settings:company.btn_save_finance", "Simpan Rekening & Aset TTD")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: SOSIAL MEDIA FOOTER DOKUMEN */}
        {activeTab === "sosmed" && (
          <CompanyProfileTabSocials
            socials={socials}
            setSocials={setSocials}
            company={company}
            saving={saving}
            onAddSlot={handleAddSocialSlot}
            onRemoveSlot={handleRemoveSocialSlot}
            onSave={handleSaveCompany}
          />
        )}

        {/* TAB 4: PERPAJAKAN (PKP) */}
        {activeTab === "pajak" && (
          <CompanyProfileTabTax
            company={company}
            setCompany={setCompany}
            saving={saving}
            uploadingProof={uploadingPkpProof}
            pkpProofInputRef={pkpFileInputRef}
            onPkpToggleChange={(checked) => setPendingPkpState(checked)}
            onUploadPkpProof={handleUploadPkpProofFile}
            onSave={handleSaveCompany}
          />
        )}      </div>

      <ConfirmActionDialog
        open={pendingPkpState !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPkpState(null);
        }}
        title={
          pendingPkpState
            ? t("settings:company.confirm_pkp_activate_title", "Aktifkan Status PKP & Modul Pajak?")
            : t("settings:company.confirm_pkp_deactivate_title", "Nonaktifkan Kembali Status PKP?")
        }
        description={
          pendingPkpState
            ? t("settings:company.confirm_pkp_activate_desc", "Setelah diaktifkan, invoice baru akan menyertakan perhitungan PPN. Perubahan ini dicatat pada Audit Trail.")
            : t("settings:company.confirm_pkp_deactivate_desc", "Invoice baru akan kembali diterbitkan tanpa PPN sesuai status belum PKP.")
        }
        onConfirm={async () => {
          if (pendingPkpState === null) return;
          const updated = await updateCompanyProfile({
            pkp_enabled: pendingPkpState,
          });
          setCompany(updated);
          toast.success(t("settings:company.toast_tax_updated", "Status pengaturan pajak berhasil diperbarui."));
        }}
      />
    </div>
  );
}
