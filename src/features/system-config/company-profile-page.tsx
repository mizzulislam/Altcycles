import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2Icon,
  LandmarkIcon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { PageLoader } from "@/components/ui/loader";
import { PageHeader } from "@/components/shared/page-header";
import {
  DEFAULT_SOCIAL_LINKS,
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
  CompanyProfileRow,
  SocialMediaEntry,
} from "@/types/database.types";
import { CompanyProfileTabIdentity } from "./components/company-profile-tab-identity";
import {
  CompanyProfileTabBankSigner,
  type CompanyBankSlot,
} from "./components/company-profile-tab-bank-signer";
import { CompanyProfileTabSocials } from "./components/company-profile-tab-socials";


type TabId = "identitas" | "keuangan" | "sosmed";

function normalizeBankAccounts(company: CompanyProfileRow): CompanyBankSlot[] {
  if (
    Array.isArray(company.bank_accounts_json) &&
    company.bank_accounts_json.length > 0
  ) {
    return company.bank_accounts_json.map((item) => ({
      bank_name: typeof item?.bank_name === "string" ? item.bank_name : "",
      account_number:
        typeof item?.account_number === "string" ? item.account_number : "",
      account_holder:
        typeof item?.account_holder === "string" ? item.account_holder : "",
    }));
  }
  return [
    {
      bank_name: company.bank_name || "",
      account_number: company.bank_account_number || "",
      account_holder: company.bank_account_holder || "",
    },
  ];
}

function getNormalizedSocialLinks(
  company: CompanyProfileRow,
): SocialMediaEntry[] {
  if (
    Array.isArray(company.social_links_json) &&
    company.social_links_json.length > 0
  ) {
    return company.social_links_json.map((entry) => ({
      platform: String(entry?.platform ?? "Website"),
      username: String(entry?.username ?? "").trim(),
    }));
  }
  return DEFAULT_SOCIAL_LINKS.map((item) => ({ ...item }));
}

export function CompanyProfilePage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTabParam = searchParams.get("tab");
  const normalizedTab = rawTabParam === "pajak" ? "keuangan" : rawTabParam;
  const activeTab: TabId =
    normalizedTab && ["identitas", "keuangan", "sosmed"].includes(normalizedTab)
      ? (normalizedTab as TabId)
      : "identitas";

  const handleTabChange = (tab: TabId) => {
    setSearchParams({ tab });
  };

  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [bankAccounts, setBankAccounts] = React.useState<CompanyBankSlot[]>([
    { bank_name: "", account_number: "", account_holder: "" },
  ]);
  const [socials, setSocials] = React.useState<SocialMediaEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPkpProof, setUploadingPkpProof] = React.useState(false);
  const [pendingPkpState, setPendingPkpState] = React.useState<boolean | null>(
    null,
  );
  const pkpProofInputRef = React.useRef<HTMLInputElement | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompanyProfile();
      setCompany(data);
      setBankAccounts(normalizeBankAccounts(data));
      setSocials(getNormalizedSocialLinks(data));
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
      const cleanedBanks = bankAccounts
        .map((b) => ({
          bank_name: b.bank_name.trim(),
          account_number: b.account_number.trim(),
          account_holder: b.account_holder.trim(),
        }))
        .filter((b) => b.bank_name || b.account_number || b.account_holder);

      const primaryBank = cleanedBanks[0] || {
        bank_name: "",
        account_number: "",
        account_holder: "",
      };

      const cleanedSocials = socials
        .map((s) => ({
          platform: s.platform.trim(),
          username: s.username.trim(),
        }))
        .filter((s) => s.username.length > 0);

      const updated = await updateCompanyProfile({
        company_name: company.company_name.trim(),
        legal_entity_name: company.legal_entity_name.trim(),
        email: company.email.trim(),
        phone: company.phone.trim(),
        telephone_fax: (company.telephone_fax ?? "").trim() || null,
        website: (company.website ?? "").trim() || null,
        address: company.address.trim(),
        tagline: (company.tagline ?? "").trim() || null,
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
        err instanceof Error
          ? err.message
          : "Gagal menyimpan profil perusahaan.",
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

  function handlePkpToggle(checked: boolean) {
    if (
      checked &&
      (!company?.pkp_proof_storage_path ||
        company.pkp_proof_storage_path.trim().length === 0)
    ) {
      toast.error(
        t(
          "settings:company.pkp_proof_missing_notice",
          "Unggah berkas bukti pengukuhan PKP (SPPKP) terlebih dahulu sebelum mengaktifkan status PKP.",
        ),
      );
      pkpProofInputRef.current?.click();
      return;
    }
    setPendingPkpState(checked);
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
      SOCIAL_PLATFORM_OPTIONS.find((opt) => !usedPlatforms.has(opt)) ??
      "Website";
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
      <PageHeader
        title={t("settings:company.page_title", "Profil Perusahaan")}
        description={t(
          "settings:company.page_desc",
          "Kelola identitas kop surat, logo resmi, rekening transfer, aset tanda tangan resmi, akun sosial media footer dokumen, serta status perpajakan.",
        )}
      />

      {/* Tab Navigasi 3-Kolom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <Button
          type="button"
          variant={activeTab === "identitas" ? "default" : "ghost"}
          onClick={() => handleTabChange("identitas")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 h-auto rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "identitas"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Building2Icon className="size-4 shrink-0" />
          <span className="truncate">
            {t("company.tab_identity", "Identitas & Logo")}
          </span>
        </Button>

        <Button
          type="button"
          variant={activeTab === "keuangan" ? "default" : "ghost"}
          onClick={() => handleTabChange("keuangan")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 h-auto rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "keuangan"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <LandmarkIcon className="size-4 shrink-0" />
          <span className="truncate">
            {t("company.tab_accounts", "Data Keuangan")}
          </span>
        </Button>

        <Button
          type="button"
          variant={activeTab === "sosmed" ? "default" : "ghost"}
          onClick={() => handleTabChange("sosmed")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 h-auto rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "sosmed"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Share2Icon className="size-4 shrink-0" />
          <span className="truncate">
            {t("company.tab_social", "Sosial Media Footer")}
          </span>
        </Button>
      </div>

      <div className="w-full">
        {activeTab === "identitas" && (
          <CompanyProfileTabIdentity
            company={company}
            setCompany={setCompany}
            saving={saving}
            onSubmit={handleSaveCompany}
          />
        )}

        {activeTab === "keuangan" && (
          <CompanyProfileTabBankSigner
            company={company}
            setCompany={setCompany}
            bankAccounts={bankAccounts}
            setBankAccounts={setBankAccounts}
            saving={saving}
            uploadingProof={uploadingPkpProof}
            pkpProofInputRef={pkpProofInputRef}
            onPkpToggleChange={handlePkpToggle}
            onUploadPkpProof={handleUploadPkpProofFile}
            onAddBankSlot={handleAddBankSlot}
            onRemoveBankSlot={handleRemoveBankSlot}
            onSubmit={handleSaveCompany}
          />
        )}

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
      </div>

      <ConfirmActionDialog
        open={pendingPkpState !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPkpState(null);
        }}
        title={
          pendingPkpState
            ? t(
                "settings:company.confirm_pkp_activate_title",
                "Aktifkan Status PKP & Modul Pajak?",
              )
            : t(
                "settings:company.confirm_pkp_deactivate_title",
                "Nonaktifkan Kembali Status PKP?",
              )
        }
        description={
          pendingPkpState
            ? t(
                "settings:company.confirm_pkp_activate_desc",
                "Setelah diaktifkan, invoice baru akan menyertakan perhitungan PPN. Perubahan ini dicatat pada Audit Trail.",
              )
            : t(
                "settings:company.confirm_pkp_deactivate_desc",
                "Invoice baru akan kembali diterbitkan tanpa PPN sesuai status belum PKP.",
              )
        }
        onConfirm={async () => {
          if (pendingPkpState === null) return;
          const updated = await updateCompanyProfile({
            pkp_enabled: pendingPkpState,
          });
          setCompany(updated);
          setPendingPkpState(null);
          toast.success(
            t(
              "settings:company.toast_tax_updated",
              "Status pengaturan pajak berhasil diperbarui.",
            ),
          );
        }}
      />
    </div>
  );
}
