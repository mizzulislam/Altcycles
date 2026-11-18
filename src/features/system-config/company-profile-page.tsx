import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2Icon,
  CheckCircle2Icon,
  LandmarkIcon,
  Loader2Icon,
  PlusIcon,
  ReceiptIcon,
  SaveIcon,
  Share2Icon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { SocialPlatformIcon } from "@/components/shared/social-platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
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
import {
  getNormalizedSocialLinks,
  SOCIAL_PLATFORM_OPTIONS,
} from "@/lib/asset-utils";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { formatRupiah, roundRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  BankAccountEntry,
  CompanyProfileRow,
  SocialMediaEntry,
} from "@/types/database.types";

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
        signer_paraf_path: company.signer_paraf_path ?? null,
        social_links_json: socials.map((s) => ({
          platform: s.platform.trim() || "Instagram",
          username: s.username.trim(),
          url: s.url?.trim() || undefined,
        })),
        ppn_rate: company.ppn_rate,
      });
      setCompany(updated);
      setBankAccounts(normalizeBankAccounts(updated));
      setSocials(getNormalizedSocialLinks(updated));
      toast.success(
        "Profil perusahaan Altvira berhasil disimpan dan dicatat ke Audit Trail.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan profil perusahaan.",
      );
    } finally {
      setSaving(false);
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
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>{t("settings:company.loading")}</span>
      </div>
    );
  }

  const sampleSubtotal = 10_000_000;
  const samplePpn = company.pkp_enabled
    ? roundRupiah((sampleSubtotal * company.ppn_rate) / 100)
    : 0;
  const sampleTotal = sampleSubtotal + samplePpn;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("company.page_title", "Profil Perusahaan (Altvira)")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          {t("company.page_desc", "Kelola identitas kop surat, logo resmi, rekening transfer, aset tanda tangan & paraf, akun sosial media footer dokumen, serta status perpajakan.")}
        </p>
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
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">
                {t("settings:company.identity_kop_title", "Identitas & Kop Dokumen Resmi")}
              </CardTitle>
              <CardDescription>
                {t("settings:company.identity_kop_desc", "Logo, nama usaha, dan alamat kantor ini otomatis tampil pada header SPK, SoW, Quotation, BAKP, UAT, BAST, Invoice, dan Kuitansi.")}
              </CardDescription>
            </CardHeader>
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
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {t("settings:company.accounts_signatures_title", "Rekening Transfer & Aset Tanda Tangan Resmi")}
                </CardTitle>
                <CardDescription>
                  {t("settings:company.accounts_signatures_desc", "Rekening bank penerima pembayaran Invoice/SPK, identitas NPWP/NIK resmi, serta gambar tanda tangan & paraf digital Altvira.")}
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={handleAddBankSlot}
                className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <PlusIcon className="size-4" />
                <span>{t("settings:company.add_bank_btn", "Tambah Rekening")}</span>
              </Button>
            </CardHeader>
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
                            <button
                              type="button"
                              title={t("settings:company.remove_bank_tooltip", "Hapus rekening ini")}
                              onClick={() => handleRemoveBankSlot(idx)}
                              className="size-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            >
                              <Trash2Icon className="size-3.5" />
                              <span className="sr-only">{t("settings:company.remove_bank_sr", "Hapus Rekening")}</span>
                            </button>
                          ) : null}
                        </div>
                        {content}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                      className="text-xs h-9"
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
                      className="text-xs h-9"
                    />
                  </Field>
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
                      className="text-xs h-9 tabular-nums"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ImageAssetUploadBox
                    label={t("settings:company.signature_img_label", "Gambar Tanda Tangan (TTD)")}
                    helperText={t("settings:company.upload_source_hint", "Lokal / Google Drive")}
                    emptyTitle={t("settings:company.upload_signature_title", "Upload Gambar Tanda Tangan")}
                    emptySubtitle={t("settings:company.upload_signature_subtitle", "Klik untuk memilih PNG transparan dari Lokal / Google Drive")}
                    value={company.signer_signature_path}
                    onChange={(next) =>
                      setCompany({ ...company, signer_signature_path: next })
                    }
                  />
                  <ImageAssetUploadBox
                    label={t("settings:company.paraf_img_label", "Gambar Paraf Pihak Pertama")}
                    helperText={t("settings:company.upload_source_hint", "Lokal / Google Drive")}
                    emptyTitle={t("settings:company.upload_paraf_title", "Upload Gambar Paraf")}
                    emptySubtitle={t("settings:company.upload_paraf_subtitle", "Klik untuk memilih PNG transparan dari Lokal / Google Drive")}
                    value={company.signer_paraf_path}
                    onChange={(next) =>
                      setCompany({ ...company, signer_paraf_path: next })
                    }
                  />
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
          <Card>
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {t("settings:company.social_accounts_title", {
                    count: socials.length,
                    defaultValue: `Akun Sosial Media Footer Dokumen (${socials.length})`,
                  })}
                </CardTitle>
                <CardDescription>
                  {t("settings:company.social_accounts_desc", "Ikon platform beserta username di bawah ini otomatis disematkan pada footer setiap dokumen PDF & Word yang diterbitkan sistem.")}
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={handleAddSocialSlot}
                className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <PlusIcon data-icon="inline-start" />
                {t("settings:company.add_social_btn", "Tambah Sosial Media")}
              </Button>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSaveCompany} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {socials.map((entry, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <SocialPlatformIcon
                            platform={entry.platform}
                            className="size-4 text-primary"
                          />
                          <span>
                            {t("settings:company.social_slot_title", {
                              index: idx + 1,
                              defaultValue: `Sosial Media #${idx + 1}`,
                            })}
                          </span>
                        </div>
                        {socials.length > 1 && (
                          <button
                            type="button"
                            title={t("settings:company.remove_social_tooltip", "Hapus sosial media ini")}
                            onClick={() => handleRemoveSocialSlot(idx)}
                            className="size-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2Icon className="size-3.5" />
                            <span className="sr-only">{t("settings:company.remove_social_sr", "Hapus Sosial Media")}</span>
                          </button>
                        )}
                      </div>

                      <Field>
                        <FieldLabel className="text-[11px] font-semibold">
                          {t("settings:company.platform", "Platform")}
                        </FieldLabel>
                        <Select
                          value={entry.platform}
                          onValueChange={(val) =>
                            setSocials((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, platform: val } : item,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue>
                              <span className="inline-flex items-center gap-2">
                                <SocialPlatformIcon
                                  platform={entry.platform}
                                  className="size-3.5 text-primary"
                                />
                                <span>{entry.platform}</span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  <span className="inline-flex items-center gap-2">
                                    <SocialPlatformIcon
                                      platform={opt}
                                      className="size-3.5 text-primary"
                                    />
                                    <span>{opt}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel className="text-[11px] font-semibold">
                          {t("settings:company.username", "Username / Handle")}
                        </FieldLabel>
                        <Input
                          value={entry.username}
                          onChange={(e) =>
                            setSocials((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, username: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder={t("settings:company.handle_placeholder", "Contoh: @altvira.tech")}
                          className="h-9 text-xs bg-background"
                        />
                      </Field>

                      <Field>
                        <FieldLabel className="text-[11px] font-semibold">
                          {t("settings:company.website", "Tautan / URL Profil")}
                        </FieldLabel>
                        <Input
                          value={entry.url ?? ""}
                          onChange={(e) =>
                            setSocials((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, url: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder={t("settings:company.url_placeholder", "Contoh: https://instagram.com/altvira.tech")}
                          className="h-9 text-xs bg-background"
                        />
                      </Field>
                    </div>
                  ))}
                </div>

                {/* Live Preview Footer Dokumen */}
                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {t("settings:company.preview_footer_title", "Pratinjau Footer Pada Dokumen PDF & Word:")}
                  </p>
                  <div className="border-t border-border/80 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {company.company_name}
                    </span>
                    <div className="flex flex-wrap items-center gap-4">
                      {socials
                        .filter((s) => s.username.trim())
                        .map((s, idx) => (
                          <span
                            key={idx}
                            title={s.platform}
                            className="inline-flex items-center gap-1.5 text-foreground font-medium"
                          >
                            <SocialPlatformIcon
                              platform={s.platform}
                              className="size-3.5 text-primary"
                            />
                            <span>{s.username}</span>
                          </span>
                        ))}
                    </div>
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
                        <span>{t("settings:company.btn_save_social", "Simpan Sosial Media Footer")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: PERPAJAKAN (PKP) */}
        {activeTab === "pajak" && (
          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {t("settings:company.tax_pkp_title", "Status Pengusaha Kena Pajak (PKP) & Tarif PPN")}
                </CardTitle>
                <CardDescription>
                  {t("settings:company.tax_pkp_desc", "Konfigurasi pengenaan Pajak Pertambahan Nilai (PPN) pada dokumen penagihan resmi perusahaan.")}
                </CardDescription>
              </div>
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
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSaveCompany} className="space-y-6">
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
                              ? t("settings:company.pkp_mode_active", "Mode Pengusaha Kena Pajak (PKP) Aktif")
                              : t("settings:company.pkp_mode_inactive", "Mode Non-PKP (Tanpa Pemungutan PPN)")}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {company.pkp_enabled
                              ? t("settings:company.pkp_desc_active", {
                                  rate: company.ppn_rate,
                                  defaultValue: `Setiap invoice klien baru akan menghitung otomatis PPN sebesar ${company.ppn_rate}% di atas subtotal tagihan.`,
                                })
                              : t("settings:company.pkp_desc_inactive", "Selama perusahaan belum dikukuhkan sebagai PKP, seluruh invoice dan quotation otomatis mencantumkan keterangan resmi bebas PPN.")}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card/80 p-4 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <FieldLabel
                            htmlFor="cp-pkp-sw"
                            className="text-xs font-bold text-foreground"
                          >
                            {t("settings:company.enable_pkp_label", "Aktifkan Status PKP & Perhitungan PPN")}
                          </FieldLabel>
                          <FieldDescription className="text-[11px] leading-snug">
                            {t("settings:company.enable_pkp_desc", {
                              name: company.legal_entity_name,
                              defaultValue: `Aktifkan hanya setelah ${company.legal_entity_name} resmi dikukuhkan oleh DJP sebagai PKP.`,
                            })}
                          </FieldDescription>
                        </div>
                        <Switch
                          id="cp-pkp-sw"
                          checked={company.pkp_enabled}
                          onCheckedChange={(checked) => setPendingPkpState(checked)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2">
                        <CheckCircle2Icon className="size-3.5 text-primary shrink-0" />
                        <span>{t("settings:company.sync_invoices_note", "Sinkron otomatis ke Invoice & Quotation")}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2">
                        <CheckCircle2Icon className="size-3.5 text-primary shrink-0" />
                        <span>{t("settings:company.audit_trail_recorded_note", "Perubahan tercatat ke Audit Trail")}</span>
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
                          ? t("settings:company.vat_active_hint", "Berlaku otomatis untuk penerbitan invoice berikutnya.")
                          : t("settings:company.vat_inactive_hint", "Aktifkan status PKP di samping untuk mengubah tarif PPN.")}
                      </FieldDescription>
                    </Field>

                    <div className="rounded-xl border border-border/70 bg-background/70 p-4 space-y-2.5">
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {t("settings:company.simulation_title", "Simulasi Dampak Pada Tagihan Invoice")}
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>{t("settings:company.subtotal_services", "Subtotal Jasa")}</span>
                          <span className="tabular-nums font-medium text-foreground">
                            {formatRupiah(sampleSubtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>
                            {t("settings:company.vat_label", {
                              status: company.pkp_enabled ? `${company.ppn_rate}%` : "Non-PKP",
                              defaultValue: `PPN (${company.pkp_enabled ? `${company.ppn_rate}%` : "Non-PKP"})`,
                            })}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {formatRupiah(samplePpn)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between font-bold text-foreground">
                          <span>{t("settings:company.total_billing", "Total Tagihan")}</span>
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
                    {t("settings:company.future_docs_only_note", "Pengaturan ini hanya memengaruhi dokumen penagihan yang baru dibuat setelah disimpan.")}
                  </p>
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
                        <span>{t("settings:company.btn_save_tax", "Simpan Pengaturan Pajak")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

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
