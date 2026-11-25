import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Trans } from "react-i18next";
import {
  BellIcon,
  CheckCircle2Icon,
  FileSignatureIcon,
  KeyRoundIcon,
  LandmarkIcon,
  Loader2Icon,
  LockIcon,
  PencilIcon,
  PhoneIcon,
  ReceiptTextIcon,
  SaveIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UploadCloudIcon,
  UserCheckIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUploadDialog } from "@/components/shared/avatar-upload-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import {
  getMergedProfileFields,
  updateMyProfile,
  uploadProfileAvatar,
  uploadProfileSignature,
} from "@/lib/data-service";
import {
  formatNpwpDisplay,
  formatRupiah,
  isValidBankAccountNumber,
  isValidNpwp,
  normalizeBankAccountNumber,
  normalizeNpwp,
  ROLE_LABELS,
} from "@/lib/formatters";
import { getPtkpInfo } from "@/lib/tax-calculation";
import type { MaritalStatus } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { TruncatedTooltipText } from "@/components/shared/page-header";

type SettingsTab = "profil" | "personal" | "financial" | "account" | "notifications";

export function ProfileSettingsPage() {
  const { t } = useLanguage();
  const { profile: rawProfile, updatePassword, refreshProfile, availableRoles } = useAuth();
  const profile = React.useMemo(
    () => getMergedProfileFields(rawProfile),
    [rawProfile],
  );
  const [searchParams, setSearchParams] = useSearchParams();

  // Sinkronisasi Tab dengan URL (?tab=...)
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab =
    tabParam &&
    ["profil", "personal", "financial", "account", "notifications"].includes(tabParam)
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
  const [phoneNumber, setPhoneNumber] = React.useState(profile?.phone_number || "");
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
    typeof profile?.dependents_count === "number" ? profile.dependents_count : 0,
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
  const [notifClosing, setNotifClosing] = React.useState(true);

  // Sinkronkan data profil ketika auth dimuat
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(
        profile.username || (profile.email ? (profile.email.split("@")[0] ?? "user").toLowerCase() : ""),
      );
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setPhoneNumber(profile.phone_number || "");
      setJobTitle(profile.job_title || "");
      setSignatureUrl(profile.signature_storage_path || "");
      setMaritalStatus(profile.marital_status || "single");
      setDependentsCount(typeof profile.dependents_count === "number" ? profile.dependents_count : 0);
      setNpwp(profile.npwp ? formatNpwpDisplay(profile.npwp) : "");
      setBankName(profile.bank_name || "");
      setBankAccountNumber(profile.bank_account_number || "");
      setBankAccountHolder(profile.bank_account_holder || "");
    }
  }, [profile]);

  const ptkpInfo = React.useMemo(
    () => getPtkpInfo(maritalStatus, dependentsCount),
    [maritalStatus, dependentsCount],
  );

  if (!profile) return null;

  // Handle Pilih & Upload Foto dari Berkas Komputer Lokal
  async function handleSelectLocalFile(file: File) {
    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadProfileAvatar(file);
      setAvatarUrl(uploadedUrl);
      // Simpan langsung ke profil
      await updateMyProfile({
        fullName,
        username,
        phoneNumber,
        jobTitle,
        bio,
        avatarUrl: uploadedUrl,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_photo_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("settings:profile.toast_photo_upload_fail"),
      );
      throw err;
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Pilih & Terapkan Foto dari Google Drive
  async function handleSelectGoogleDriveUrl(driveDirectUrl: string) {
    setIsUploadingAvatar(true);
    try {
      setAvatarUrl(driveDirectUrl);
      await updateMyProfile({
        fullName,
        username,
        phoneNumber,
        jobTitle,
        bio,
        avatarUrl: driveDirectUrl,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_photo_drive_applied"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_photo_drive_fail"),
      );
      throw err;
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Hapus Foto Avatar (Kembali ke Avatar Inisial)
  async function handleRemoveAvatar(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsUploadingAvatar(true);
    try {
      setAvatarUrl("");
      await updateMyProfile({
        fullName,
        username,
        phoneNumber,
        jobTitle,
        bio,
        avatarUrl: null,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_photo_removed"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("settings:profile.toast_photo_remove_fail"),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Simpan Profil / Data Pribadi
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(t("settings:profile.toast_name_required"));
      return;
    }
    if (username.trim() && !/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
      toast.error(
        t("settings:profile.toast_username_invalid"),
      );
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateMyProfile({
        fullName: fullName.trim(),
        username: username.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl || null,
        signatureStoragePath: signatureUrl || null,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_profile_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("settings:profile.toast_profile_update_fail"),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Handle Upload & Simpan Tanda Tangan Digital Pengguna (Item 4)
  async function handleSelectSignatureFile(file: File) {
    setIsUploadingSignature(true);
    try {
      const uploadedSigUrl = await uploadProfileSignature(file);
      setSignatureUrl(uploadedSigUrl);
      await updateMyProfile({
        fullName: fullName.trim() || profile!.full_name,
        username: username.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl || null,
        signatureStoragePath: uploadedSigUrl,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_signature_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_signature_upload_fail"),
      );
      throw err;
    } finally {
      setIsUploadingSignature(false);
    }
  }

  async function handleSelectSignatureDriveUrl(driveDirectUrl: string) {
    setIsUploadingSignature(true);
    try {
      setSignatureUrl(driveDirectUrl);
      await updateMyProfile({
        fullName: fullName.trim() || profile!.full_name,
        username: username.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl || null,
        signatureStoragePath: driveDirectUrl,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_signature_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_signature_upload_fail"),
      );
      throw err;
    } finally {
      setIsUploadingSignature(false);
    }
  }

  async function handleRemoveSignature(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsUploadingSignature(true);
    try {
      setSignatureUrl("");
      await updateMyProfile({
        fullName: fullName.trim() || profile!.full_name,
        username: username.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl || null,
        signatureStoragePath: null,
      });
      await refreshProfile();
      toast.success(t("settings:profile.toast_signature_removed"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:profile.toast_signature_remove_fail"),
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
        err instanceof Error ? err.message : t("settings:profile.toast_pwd_update_fail"),
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div className="min-w-0">
        <TruncatedTooltipText as="h1" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("settings:profile.title")}
        </TruncatedTooltipText>
        <TruncatedTooltipText as="p" className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          {t("settings:profile.subtitle")}
        </TruncatedTooltipText>
      </div>

      {/* =========================================================================
          TAB NAVIGASI HORIZONTAL DI ATAS (Grid 5-Kolom Sama Lebar & Tinggi Seragam)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => handleTabChange("profil")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
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
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
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
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
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
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
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
            "flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center",
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <BellIcon className="size-4 shrink-0" />
          <span className="truncate">{t("settings:profile.tab_notifications")}</span>
        </button>
      </div>

      {/* =========================================================================
          KONTEN FORM TAB LEBAR PENUH DENGAN GRID 2-KOLOM SEIMBANG
          ========================================================================= */}
      <div className="w-full">
        {/* TAB 1: PROFIL PENGGUNA */}
        {activeTab === "profil" && (
          <Card>
            <CardHeaderWithInfo
              title={t("settings:profile.card_profile_title")}
              description={t("settings:profile.card_profile_desc")}
            />
            <CardContent className="pt-5 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Baris 1: Grid 2-Kolom (Kolom Kiri: Box Upload Foto Diri Mirip Gambar Contoh | Kolom Kanan: Tentang Saya Sejajar Presisi) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Kolom Kiri: Box Upload Foto Diri (Saat Terisi: Gambar Memenuhi Box & Tombol Icon Ganti/Hapus Muncul secara Hover) */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
                    <FieldLabel className="text-xs font-semibold">
                      {t("settings:profile.photo_label")}
                    </FieldLabel>

                    {avatarUrl ? (
                      // Kondisi Terisi: Foto Memenuhi Seluruh Box & Icon Button Ganti/Hapus Muncul saat Hover
                      <div className="group relative w-full h-[96px] rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-muted">
                        <img
                          src={avatarUrl}
                          alt={t("settings:profile.photo_label")}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Overlay Hover Gelap Tipis dengan Icon Button Ganti & Hapus */}
                        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                          <ActionTooltip content={t("settings:profile.photo_change_tooltip")} side="top">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsUploadDialogOpen(true);
                              }}
                              disabled={isUploadingAvatar}
                              aria-label={t("settings:profile.photo_change_aria")}
                              className="size-9 rounded-xl bg-white/20 hover:bg-white/35 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                          </ActionTooltip>

                          <ActionTooltip content={t("settings:profile.photo_delete_tooltip")} side="top">
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              disabled={isUploadingAvatar}
                              aria-label={t("settings:profile.photo_delete_aria")}
                              className="size-9 rounded-xl bg-destructive/80 hover:bg-destructive text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                          </ActionTooltip>
                        </div>

                        {/* Spinner Loading saat Proses Upload/Hapus */}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10">
                            <Loader2Icon className="size-6 animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      // Kondisi Belum Ada Foto: Mengikuti Contoh Gambar 1 (Dashed Border, Lingkaran Upload di Tengah)
                      <button
                        type="button"
                        onClick={() => setIsUploadDialogOpen(true)}
                        disabled={isUploadingAvatar}
                        className="group relative w-full h-[96px] rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 dark:border-border/60 dark:hover:border-primary/50 bg-card/60 hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="size-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                          <UploadCloudIcon className="size-4.5" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                          {t("settings:profile.photo_upload_btn")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("settings:profile.photo_upload_hint")}
                        </p>
                      </button>
                    )}
                  </div>

                  {/* Kolom Kanan: Tentang Saya (Sejajar Presisi dengan Kolom Kiri) */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
                    <FieldLabel className="text-xs font-semibold">
                      {t("settings:profile.about_me")}
                    </FieldLabel>
                    <div className="flex flex-col justify-between h-[96px]">
                      <Textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t("settings:profile.about_me_ph")}
                        className="text-xs resize-none h-[60px] min-h-[60px] bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground leading-normal truncate">
                        {t("settings:profile.about_me_desc")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid 2-Kolom: Nama Lengkap & Username */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      {t("settings:profile.full_name")}
                    </FieldLabel>
                    <Input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("settings:profile.full_name_ph")}
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.full_name_desc")}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      {t("settings:profile.username")}
                    </FieldLabel>
                    <Input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t("settings:profile.username_ph")}
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.username_desc")}
                    </FieldDescription>
                  </Field>
                </div>

                {/* Grid 2-Kolom: Email Akun & Status Hak Akses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-xs font-semibold">
                        {t("settings:profile.email")}
                      </FieldLabel>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {t("settings:profile.email_readonly")}
                      </span>
                    </div>
                    <Input
                      type="email"
                      disabled
                      value={profile.email}
                      onMouseDown={(e) => e.preventDefault()}
                      onFocus={(e) => e.currentTarget.blur()}
                      className="text-xs h-9 bg-muted/40 cursor-not-allowed select-none caret-transparent opacity-90 disabled:opacity-90 disabled:cursor-not-allowed"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.email_desc")}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-xs font-semibold">
                        {t("settings:profile.current_role")}
                      </FieldLabel>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {t("settings:profile.role_auth_system")}
                      </span>
                    </div>
                    <Input
                      type="text"
                      disabled
                      value={t(`common:role.${profile.role}`) || ROLE_LABELS[profile.role] || profile.role}
                      onMouseDown={(e) => e.preventDefault()}
                      onFocus={(e) => e.currentTarget.blur()}
                      className="text-xs h-9 bg-muted/40 cursor-not-allowed select-none caret-transparent opacity-90 disabled:opacity-90 disabled:cursor-not-allowed"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.current_role_desc")}
                    </FieldDescription>
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingProfile || isUploadingAvatar}
                    className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin" />
                        <span>{t("settings:profile.btn_saving")}</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="size-3.5" />
                        <span>{t("settings:profile.btn_save_profile")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: DATA PRIBADI */}
        {activeTab === "personal" && (
          <Card>
            <CardHeaderWithInfo
              title={t("settings:profile.card_personal_title")}
              description={t("settings:profile.card_personal_desc")}
            />
            <CardContent className="pt-5 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Grid 2-Kolom: Nomor Telepon & Jabatan Divisi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel className="text-xs font-semibold">
                      {t("settings:profile.phone_number")}
                    </FieldLabel>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={t("settings:profile.phone_number_ph")}
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.phone_number_desc")}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs font-semibold">
                      {t("settings:profile.job_title")}
                    </FieldLabel>
                    <Input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={t("settings:profile.job_title_ph")}
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.job_title_desc")}
                    </FieldDescription>
                  </Field>
                </div>

                {/* Spesimen Tanda Tangan Digital Pengguna untuk Pengesahan Dokumen PDF (Item 4) */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSignatureIcon className="size-4 text-primary" />
                      <FieldLabel className="text-xs font-bold text-foreground">
                        {t("settings:profile.signature_label")}
                      </FieldLabel>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("settings:profile.signature_hint")}
                    </span>
                  </div>

                  {signatureUrl ? (
                    <div className="group relative w-full h-[108px] rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-white dark:bg-slate-100 flex items-center justify-center p-3">
                      <img
                        src={signatureUrl}
                        alt={t("settings:profile.signature_label")}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                        <ActionTooltip
                          content={t("settings:profile.signature_change_tooltip")}
                          side="top"
                        >
                          <button
                            type="button"
                            onClick={() => setIsSignatureDialogOpen(true)}
                            disabled={isUploadingSignature}
                            aria-label={t("settings:profile.signature_change_aria")}
                            className="size-9 rounded-xl bg-white/20 hover:bg-white/35 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                        </ActionTooltip>

                        <ActionTooltip
                          content={t("settings:profile.signature_delete_tooltip")}
                          side="top"
                        >
                          <button
                            type="button"
                            onClick={handleRemoveSignature}
                            disabled={isUploadingSignature}
                            aria-label={t("settings:profile.signature_delete_aria")}
                            className="size-9 rounded-xl bg-destructive/80 hover:bg-destructive text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        </ActionTooltip>
                      </div>

                      {isUploadingSignature && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10">
                          <Loader2Icon className="size-6 animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSignatureDialogOpen(true)}
                      disabled={isUploadingSignature}
                      className="group relative w-full h-[108px] rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 dark:border-border/60 dark:hover:border-primary/50 bg-card/60 hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="size-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <UploadCloudIcon className="size-4.5" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {t("settings:profile.signature_upload_btn")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t("settings:profile.signature_upload_sub")}
                      </p>
                    </button>
                  )}

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("settings:profile.signature_desc")}
                  </p>
                </div>

                {/* Informasi Peran Aktif & Hak Akses (Lebar Penuh) */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon className="size-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground">
                      {t("settings:profile.multi_role_title")}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <Trans
                      i18nKey="settings:profile.multi_role_desc"
                      components={[<span key="0" />, <strong key="1" />]}
                    />
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableRoles.map((role) => (
                      <div
                        key={role}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-card flex items-center gap-2"
                      >
                        <CheckCircle2Icon className="size-3.5 text-primary" />
                        <span>{t(`common:role.${role}`) || ROLE_LABELS[role] || role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingProfile || isUploadingSignature}
                    className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin" />
                        <span>{t("settings:profile.btn_saving")}</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="size-3.5" />
                        <span>{t("settings:profile.btn_save_personal")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: DATA KEUANGAN (NPWP, Status Pernikahan/PTKP, & Rekening Bank) */}
        {activeTab === "financial" && (
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeaderWithInfo
              title={t("settings:profile.card_financial_title", "Data Keuangan & Rekening Pribadi")}
              description={t(
                "settings:profile.financial_security_notice",
                "Data NPWP dan nomor rekening Anda dilindungi kebijakan keamanan tingkat baris (RLS), ditampilkan dengan masking di halaman ikhtisar, serta terhubung langsung sebagai sumber tunggal bagi Bendahara.",
              )}
            />
            <CardContent className="p-5 sm:p-6 space-y-6">
              <form onSubmit={handleSaveFinancial} className="space-y-6">
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
        )}

        {/* TAB 3: AKUN & KATA SANDI (Fitur Ganti Sandi dari Sidebar Dipindahkan ke Sini) */}
        {activeTab === "account" && (
          <Card>
            <CardHeaderWithInfo
              title={t("settings:profile.card_account_title")}
              description={t("settings:profile.card_account_desc")}
            />
            <CardContent className="pt-5 space-y-6">
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                {/* Grid 2-Kolom: Kata Sandi Baru & Konfirmasi Kata Sandi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      {t("settings:profile.new_password")}
                    </FieldLabel>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t("settings:profile.new_password_ph")}
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.new_password_desc")}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      {t("settings:profile.confirm_password")}
                    </FieldLabel>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("settings:profile.confirm_password_ph")}
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      {t("settings:profile.confirm_password_desc")}
                    </FieldDescription>
                  </Field>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                  <ShieldAlertIcon className="size-4 shrink-0 mt-0.5" />
                  <span>
                    {t("settings:profile.password_audit_warning")}
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingPassword || !newPassword}
                    className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin" />
                        <span>{t("settings:profile.btn_saving_password")}</span>
                      </>
                    ) : (
                      <>
                        <LockIcon className="size-3.5" />
                        <span>{t("settings:profile.btn_save_password")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: PREFERENSI NOTIFIKASI */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeaderWithInfo
              title={t("settings:profile.card_notif_title")}
              description={t("settings:profile.card_notif_desc")}
            />
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-foreground">
                      {t("settings:profile.notif_payment_title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("settings:profile.notif_payment_desc")}
                    </p>
                  </div>
                  <Switch
                    checked={notifPayment}
                    onCheckedChange={(checked) => {
                      setNotifPayment(checked);
                      toast.success(t("settings:profile.toast_notif_saved"));
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-foreground">
                      {t("settings:profile.notif_invoice_title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("settings:profile.notif_invoice_desc")}
                    </p>
                  </div>
                  <Switch
                    checked={notifInvoice}
                    onCheckedChange={(checked) => {
                      setNotifInvoice(checked);
                      toast.success(t("settings:profile.toast_notif_saved"));
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-bold text-foreground">
                    {t("settings:profile.notif_closing_title")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("settings:profile.notif_closing_desc")}
                  </p>
                </div>
                <Switch
                  checked={notifClosing}
                  onCheckedChange={(checked) => {
                    setNotifClosing(checked);
                    toast.success(t("settings:profile.toast_notif_saved"));
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Modal Pemilih Foto Profil (Tab Lokal & Tab Google Drive Mirip Google Forms) */}
      <AvatarUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        currentAvatarUrl={avatarUrl}
        onSelectLocalFile={handleSelectLocalFile}
        onSelectGoogleDriveUrl={handleSelectGoogleDriveUrl}
        isProcessing={isUploadingAvatar}
      />

      {/* Dialog Modal Pemilih Gambar Tanda Tangan Pengguna (Item 4) */}
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
