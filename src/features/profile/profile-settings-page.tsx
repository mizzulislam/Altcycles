import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  BellIcon,
  KeyRoundIcon,
  LandmarkIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarUploadDialog } from "@/components/shared/avatar-upload-dialog";
import { TruncatedTooltipText } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-context";
import {
  getMergedProfileFields,
  updateMyProfile,
  uploadProfileAvatar,
  uploadProfileSignature,
} from "@/lib/data-service";
import {
  formatNpwpDisplay,
  isValidBankAccountNumber,
  isValidNpwp,
  normalizeBankAccountNumber,
  normalizeNpwp,
} from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { getPtkpInfo } from "@/lib/tax-calculation";
import { cn } from "@/lib/utils";
import type { MaritalStatus } from "@/types/database.types";
import { ProfileMainForm } from "./components/profile-main-form";
import { ProfileNotificationsForm } from "./components/profile-notifications-form";
import { ProfilePersonalForm } from "./components/profile-personal-form";
import { ProfileSecurityForm } from "./components/profile-security-form";
import { ProfileTaxBankForm } from "./components/profile-tax-bank-form";

type SettingsTab =
  | "profil"
  | "personal"
  | "financial"
  | "account"
  | "notifications";

export function ProfileSettingsPage() {
  const { t } = useLanguage();
  const {
    profile: rawProfile,
    updatePassword,
    refreshProfile,
    availableRoles,
  } = useAuth();
  const profile = React.useMemo(
    () => getMergedProfileFields(rawProfile),
    [rawProfile],
  );
  const [searchParams, setSearchParams] = useSearchParams();

  // Sinkronisasi Tab dengan URL (?tab=...)
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab =
    tabParam &&
    [
      "profil",
      "personal",
      "financial",
      "account",
      "notifications",
    ].includes(tabParam)
      ? tabParam
      : "profil";

  const handleTabChange = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  // Form State Tab Profil
  const [fullName, setFullName] = React.useState(profile?.full_name || "");
  const [username, setUsername] = React.useState(profile?.username || "");
  const [bio, setBio] = React.useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile?.avatar_url || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Form State Tab Data Pribadi & Tanda Tangan Digital (Item 4)
  const [phoneNumber, setPhoneNumber] = React.useState(
    profile?.phone_number || "",
  );
  const [jobTitle, setJobTitle] = React.useState(profile?.job_title || "");
  const [signatureUrl, setSignatureUrl] = React.useState(
    profile?.signature_storage_path || "",
  );
  const [isUploadingSignature, setIsUploadingSignature] = React.useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false);

  // Form State Tab Data Keuangan (Item 2 & Status PTKP)
  const [maritalStatus, setMaritalStatus] = React.useState<MaritalStatus>(
    profile?.marital_status || "single",
  );
  const [dependentsCount, setDependentsCount] = React.useState<number>(
    typeof profile?.dependents_count === "number"
      ? profile.dependents_count
      : 0,
  );
  const [npwp, setNpwp] = React.useState(
    profile?.npwp ? formatNpwpDisplay(profile.npwp) : "",
  );
  const [bankName, setBankName] = React.useState(profile?.bank_name || "");
  const [bankAccountNumber, setBankAccountNumber] = React.useState(
    profile?.bank_account_number || "",
  );
  const [bankAccountHolder, setBankAccountHolder] = React.useState(
    profile?.bank_account_holder || "",
  );
  const [isSavingFinancial, setIsSavingFinancial] = React.useState(false);

  // Form State Tab Akun (Ganti Kata Sandi)
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);

  // Form State Tab Notifikasi
  const [notifPayment, setNotifPayment] = React.useState(true);
  const [notifInvoice, setNotifInvoice] = React.useState(true);
  const [notifClosing, setNotifClosing] = React.useState(false);

  // Simulasi Perhitungan PTKP Otomatis
  const ptkpInfo = React.useMemo(() => {
    return getPtkpInfo(maritalStatus, dependentsCount);
  }, [maritalStatus, dependentsCount]);

  // Handle Simpan Profil Utama & Data Pribadi
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setIsSavingProfile(true);
    try {
      await updateMyProfile({
        fullName: fullName.trim() || profile.full_name,
        username: username.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl || null,
        npwp: profile.npwp || null,
        bankName: profile.bank_name || null,
        bankAccountNumber: profile.bank_account_number || null,
        bankAccountHolder: profile.bank_account_holder || null,
        signatureStoragePath: signatureUrl || null,
        maritalStatus: profile.marital_status || "single",
        dependentsCount: profile.dependents_count || 0,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_profile_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_profile_update_fail"),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Handle Pilih Berkas Foto Profil Lokal
  async function handleSelectLocalFile(file: File) {
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadProfileAvatar(file);
      setAvatarUrl(publicUrl);
      if (profile) {
        await updateMyProfile({
          fullName: fullName.trim() || profile.full_name,
          username: username.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: publicUrl,
          npwp: profile.npwp || null,
          bankName: profile.bank_name || null,
          bankAccountNumber: profile.bank_account_number || null,
          bankAccountHolder: profile.bank_account_holder || null,
          signatureStoragePath: signatureUrl || null,
          maritalStatus: profile.marital_status || "single",
          dependentsCount: profile.dependents_count || 0,
        });
        await refreshProfile();
      }
      setIsUploadDialogOpen(false);
      toast.success(t("settings:profile.toast_avatar_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_avatar_upload_fail"),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Pilih Foto via URL Google Drive
  async function handleSelectGoogleDriveUrl(url: string) {
    setIsUploadingAvatar(true);
    try {
      setAvatarUrl(url);
      if (profile) {
        await updateMyProfile({
          fullName: fullName.trim() || profile.full_name,
          username: username.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: url,
          npwp: profile.npwp || null,
          bankName: profile.bank_name || null,
          bankAccountNumber: profile.bank_account_number || null,
          bankAccountHolder: profile.bank_account_holder || null,
          signatureStoragePath: signatureUrl || null,
          maritalStatus: profile.marital_status || "single",
          dependentsCount: profile.dependents_count || 0,
        });
        await refreshProfile();
      }
      setIsUploadDialogOpen(false);
      toast.success(t("settings:profile.toast_gdrive_avatar_saved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_gdrive_avatar_fail"),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Hapus Foto Profil
  async function handleRemoveAvatar() {
    setIsUploadingAvatar(true);
    try {
      setAvatarUrl("");
      if (profile) {
        await updateMyProfile({
          fullName: fullName.trim() || profile.full_name,
          username: username.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: null,
          npwp: profile.npwp || null,
          bankName: profile.bank_name || null,
          bankAccountNumber: profile.bank_account_number || null,
          bankAccountHolder: profile.bank_account_holder || null,
          signatureStoragePath: signatureUrl || null,
          maritalStatus: profile.marital_status || "single",
          dependentsCount: profile.dependents_count || 0,
        });
        await refreshProfile();
      }
      toast.success(t("settings:profile.toast_avatar_deleted"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_avatar_delete_fail"),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Pilih Berkas Tanda Tangan Lokal (Item 4)
  async function handleSelectSignatureFile(file: File) {
    setIsUploadingSignature(true);
    try {
      const publicUrl = await uploadProfileSignature(file);
      setSignatureUrl(publicUrl);
      if (profile) {
        await updateMyProfile({
          fullName: fullName.trim() || profile.full_name,
          username: username.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl || null,
          npwp: profile.npwp || null,
          bankName: profile.bank_name || null,
          bankAccountNumber: profile.bank_account_number || null,
          bankAccountHolder: profile.bank_account_holder || null,
          signatureStoragePath: publicUrl,
          maritalStatus: profile.marital_status || "single",
          dependentsCount: profile.dependents_count || 0,
        });
        await refreshProfile();
      }
      setIsSignatureDialogOpen(false);
      toast.success(t("settings:profile.toast_signature_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_signature_upload_fail"),
      );
    } finally {
      setIsUploadingSignature(false);
    }
  }

  // Handle Pilih Tanda Tangan via Google Drive (Item 4)
  async function handleSelectSignatureDriveUrl(url: string) {
    setIsUploadingSignature(true);
    try {
      setSignatureUrl(url);
      if (profile) {
        await updateMyProfile({
          fullName: fullName.trim() || profile.full_name,
          username: username.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl || null,
          npwp: profile.npwp || null,
          bankName: profile.bank_name || null,
          bankAccountNumber: profile.bank_account_number || null,
          bankAccountHolder: profile.bank_account_holder || null,
          signatureStoragePath: url,
          maritalStatus: profile.marital_status || "single",
          dependentsCount: profile.dependents_count || 0,
        });
        await refreshProfile();
      }
      setIsSignatureDialogOpen(false);
      toast.success(t("settings:profile.toast_gdrive_signature_saved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_gdrive_signature_fail"),
      );
    } finally {
      setIsUploadingSignature(false);
    }
  }

  // Handle Hapus Tanda Tangan Digital (Item 4)
  async function handleRemoveSignature() {
    setIsUploadingSignature(true);
    try {
      setSignatureUrl("");
      if (profile) {
        await updateMyProfile({
          fullName: fullName.trim() || profile.full_name,
          username: username.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl || null,
          npwp: profile.npwp || null,
          bankName: profile.bank_name || null,
          bankAccountNumber: profile.bank_account_number || null,
          bankAccountHolder: profile.bank_account_holder || null,
          signatureStoragePath: null,
          maritalStatus: profile.marital_status || "single",
          dependentsCount: profile.dependents_count || 0,
        });
        await refreshProfile();
      }
      toast.success(t("settings:profile.toast_signature_deleted"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_signature_delete_fail"),
      );
    } finally {
      setIsUploadingSignature(false);
    }
  }

  // Handle Simpan Data Keuangan Pengguna (Item 2)
  async function handleSaveFinancial(e: React.FormEvent) {
    e.preventDefault();
    const trimmedNpwp = npwp.trim();
    if (trimmedNpwp && !isValidNpwp(trimmedNpwp)) {
      toast.error(t("settings:profile.toast_npwp_invalid"));
      return;
    }

    const trimmedBankName = bankName.trim();
    const trimmedBankAcc = bankAccountNumber.trim();
    const trimmedBankHolder = bankAccountHolder.trim();
    const hasAnyBankField = Boolean(
      trimmedBankName || trimmedBankAcc || trimmedBankHolder,
    );

    if (
      hasAnyBankField &&
      (!trimmedBankName || !trimmedBankAcc || !trimmedBankHolder)
    ) {
      toast.error(t("settings:profile.toast_bank_incomplete"));
      return;
    }

    if (trimmedBankAcc && !isValidBankAccountNumber(trimmedBankAcc)) {
      toast.error(t("settings:profile.toast_bank_acc_invalid"));
      return;
    }

    setIsSavingFinancial(true);
    try {
      const normalizedNpwp = trimmedNpwp ? normalizeNpwp(trimmedNpwp) : null;
      const normalizedBankAcc = trimmedBankAcc
        ? normalizeBankAccountNumber(trimmedBankAcc)
        : null;
      await updateMyProfile({
        fullName: fullName.trim() || profile!.full_name,
        username: username.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl || null,
        npwp: normalizedNpwp,
        bankName: trimmedBankName || null,
        bankAccountNumber: normalizedBankAcc,
        bankAccountHolder: trimmedBankHolder || null,
        signatureStoragePath: signatureUrl || null,
        maritalStatus,
        dependentsCount,
      });
      setNpwp(normalizedNpwp ? formatNpwpDisplay(normalizedNpwp) : "");
      setBankAccountNumber(normalizedBankAcc || "");
      await refreshProfile();
      toast.success(t("settings:profile.toast_financial_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_financial_update_fail"),
      );
    } finally {
      setIsSavingFinancial(false);
    }
  }

  // Handle Ganti Kata Sandi
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("settings:profile.toast_pwd_min_length"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings:profile.toast_pwd_mismatch"));
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings:profile.toast_pwd_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_pwd_update_fail"),
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div className="min-w-0">
        <TruncatedTooltipText
          as="h1"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
        >
          {t("settings:profile.title")}
        </TruncatedTooltipText>
        <TruncatedTooltipText
          as="p"
          className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed"
        >
          {t("settings:profile.subtitle")}
        </TruncatedTooltipText>
      </div>

      {/* TAB NAVIGASI HORIZONTAL DI ATAS */}
      <div className="max-sm:flex max-sm:overflow-x-auto max-sm:no-scrollbar grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-2 max-sm:p-1.5 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => handleTabChange("profil")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center max-sm:shrink-0 max-sm:py-2 max-sm:px-3",
            activeTab === "profil"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <UserIcon className="size-4 shrink-0" />
          <span className="truncate">{t("settings:profile.tab_profil")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("personal")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center max-sm:shrink-0 max-sm:py-2 max-sm:px-3",
            activeTab === "personal"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <PhoneIcon className="size-4 shrink-0" />
          <span className="truncate">{t("settings:profile.tab_personal")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("financial")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center max-sm:shrink-0 max-sm:py-2 max-sm:px-3",
            activeTab === "financial"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <LandmarkIcon className="size-4 shrink-0" />
          <span className="truncate">{t("settings:profile.tab_financial")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("account")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center max-sm:shrink-0 max-sm:py-2 max-sm:px-3",
            activeTab === "account"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <KeyRoundIcon className="size-4 shrink-0" />
          <span className="truncate">{t("settings:profile.tab_account")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("notifications")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center max-sm:shrink-0 max-sm:py-2 max-sm:px-3",
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <BellIcon className="size-4 shrink-0" />
          <span className="truncate">
            {t("settings:profile.tab_notifications")}
          </span>
        </button>
      </div>

      {/* KONTEN TAB FORM */}
      <div className="w-full">
        {activeTab === "profil" && profile && (
          <ProfileMainForm
            profile={profile}
            fullName={fullName}
            setFullName={setFullName}
            username={username}
            setUsername={setUsername}
            bio={bio}
            setBio={setBio}
            avatarUrl={avatarUrl}
            isUploadingAvatar={isUploadingAvatar}
            isSavingProfile={isSavingProfile}
            onOpenUploadDialog={() => setIsUploadDialogOpen(true)}
            onRemoveAvatar={handleRemoveAvatar}
            onSubmit={handleSaveProfile}
          />
        )}

        {activeTab === "personal" && (
          <ProfilePersonalForm
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            signatureUrl={signatureUrl}
            isUploadingSignature={isUploadingSignature}
            isSavingProfile={isSavingProfile}
            availableRoles={availableRoles}
            onOpenSignatureDialog={() => setIsSignatureDialogOpen(true)}
            onRemoveSignature={handleRemoveSignature}
            onSubmit={handleSaveProfile}
          />
        )}

        {activeTab === "financial" && (
          <ProfileTaxBankForm
            maritalStatus={maritalStatus}
            setMaritalStatus={setMaritalStatus}
            dependentsCount={dependentsCount}
            setDependentsCount={setDependentsCount}
            npwp={npwp}
            setNpwp={setNpwp}
            ptkpInfo={ptkpInfo}
            bankName={bankName}
            setBankName={setBankName}
            bankAccountNumber={bankAccountNumber}
            setBankAccountNumber={setBankAccountNumber}
            bankAccountHolder={bankAccountHolder}
            setBankAccountHolder={setBankAccountHolder}
            isSavingFinancial={isSavingFinancial}
            onSaveFinancial={handleSaveFinancial}
          />
        )}

        {activeTab === "account" && (
          <ProfileSecurityForm
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            isSavingPassword={isSavingPassword}
            onUpdatePassword={handleUpdatePassword}
          />
        )}

        {activeTab === "notifications" && (
          <ProfileNotificationsForm
            notifPayment={notifPayment}
            setNotifPayment={setNotifPayment}
            notifInvoice={notifInvoice}
            setNotifInvoice={setNotifInvoice}
            notifClosing={notifClosing}
            setNotifClosing={setNotifClosing}
          />
        )}
      </div>

      {/* Dialog Modal Pemilih Foto Profil */}
      <AvatarUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        currentAvatarUrl={avatarUrl}
        onSelectLocalFile={handleSelectLocalFile}
        onSelectGoogleDriveUrl={handleSelectGoogleDriveUrl}
        isProcessing={isUploadingAvatar}
      />

      {/* Dialog Modal Pemilih Gambar Tanda Tangan Pengguna */}
      <AvatarUploadDialog
        open={isSignatureDialogOpen}
        onOpenChange={setIsSignatureDialogOpen}
        currentAvatarUrl={signatureUrl}
        onSelectLocalFile={handleSelectSignatureFile}
        onSelectGoogleDriveUrl={handleSelectSignatureDriveUrl}
        isProcessing={isUploadingSignature}
        dialogTitle={t("settings:profile.signature_dialog_title")}
        maxSizeMb={2}
        containPreview
      />
    </div>
  );
}
