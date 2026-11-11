import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  BellIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  Loader2Icon,
  LockIcon,
  PencilIcon,
  PhoneIcon,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUploadDialog } from "@/components/shared/avatar-upload-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { updateMyProfile, uploadProfileAvatar } from "@/lib/data-service";
import { ROLE_LABELS } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type SettingsTab = "profil" | "personal" | "account" | "notifications";

export function ProfileSettingsPage() {
  const { profile, updatePassword, refreshProfile, availableRoles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sinkronisasi Tab dengan URL (?tab=...)
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab =
    tabParam && ["profil", "personal", "account", "notifications"].includes(tabParam)
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

  // Form State Tab Data Pribadi
  const [phoneNumber, setPhoneNumber] = React.useState(profile?.phone_number || "");
  const [jobTitle, setJobTitle] = React.useState(profile?.job_title || "");

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
    }
  }, [profile]);

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
      toast.success("Foto profil berhasil diperbarui!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengunggah foto profil.",
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
      toast.success("Foto profil dari Google Drive berhasil diterapkan!");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal menerapkan foto profil dari Google Drive.",
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
      toast.success("Foto profil dihapus, kembali menggunakan avatar inisial.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus foto profil.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Handle Simpan Profil / Data Pribadi
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    if (username.trim() && !/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
      toast.error(
        "Username hanya boleh memuat huruf, angka, titik, strip, atau garis bawah.",
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
      });
      await refreshProfile();
      toast.success("Profil Anda berhasil diperbarui dan dicatat ke Audit Trail!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui profil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Handle Ganti Kata Sandi
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Kata sandi akun Anda berhasil diperbarui!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui kata sandi.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Pengaturan Pengguna
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Kelola informasi identitas, kontak pribadi, keamanan kata sandi, dan preferensi notifikasi Anda.
        </p>
      </div>

      {/* =========================================================================
          TAB NAVIGASI HORIZONTAL DI ATAS (Grid 4-Kolom Tinggi Seragam)
          ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
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
          <span className="truncate">Profil Pengguna</span>
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
          <span className="truncate">Data Pribadi</span>
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
          <span className="truncate">Akun &amp; Kata Sandi</span>
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
          <span className="truncate">Notifikasi</span>
        </button>
      </div>

      {/* =========================================================================
          KONTEN FORM TAB LEBAR PENUH DENGAN GRID 2-KOLOM SEIMBANG
          ========================================================================= */}
      <div className="w-full">
        {/* TAB 1: PROFIL PENGGUNA */}
        {activeTab === "profil" && (
          <Card>
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">
                Profil Pengguna
              </CardTitle>
              <CardDescription>
                Foto diri, nama tampilan, username, dan deskripsi ringkas profil Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Baris 1: Grid 2-Kolom (Kolom Kiri: Box Upload Foto Diri Mirip Gambar Contoh | Kolom Kanan: Tentang Saya Sejajar Presisi) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Kolom Kiri: Box Upload Foto Diri (Saat Terisi: Gambar Memenuhi Box & Tombol Icon Ganti/Hapus Muncul secara Hover) */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
                    <FieldLabel className="text-xs font-semibold">
                      Foto Diri
                    </FieldLabel>

                    {avatarUrl ? (
                      // Kondisi Terisi: Foto Memenuhi Seluruh Box & Icon Button Ganti/Hapus Muncul saat Hover
                      <div className="group relative w-full h-[96px] rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-muted">
                        <img
                          src={avatarUrl}
                          alt="Foto Profil"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Overlay Hover Gelap Tipis dengan Icon Button Ganti & Hapus */}
                        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                          <ActionTooltip content="Ganti Foto (Lokal / Google Drive)" side="top">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsUploadDialogOpen(true);
                              }}
                              disabled={isUploadingAvatar}
                              aria-label="Ganti Foto"
                              className="size-9 rounded-xl bg-white/20 hover:bg-white/35 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                          </ActionTooltip>

                          <ActionTooltip content="Hapus Foto Profil" side="top">
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              disabled={isUploadingAvatar}
                              aria-label="Hapus Foto"
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
                          Upload Foto Diri
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Mendukung format JPG, PNG, WEBP (maks. 2MB)
                        </p>
                      </button>
                    )}
                  </div>

                  {/* Kolom Kanan: Tentang Saya (Sejajar Presisi dengan Kolom Kiri) */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
                    <FieldLabel className="text-xs font-semibold">
                      Tentang Saya
                    </FieldLabel>
                    <div className="flex flex-col justify-between h-[96px]">
                      <Textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tuliskan catatan singkat mengenai peran, tanggung jawab, atau keahlian Anda..."
                        className="text-xs resize-none h-[60px] min-h-[60px] bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground leading-normal truncate">
                        Catatan ringkas yang tampil pada profil publik akun Anda.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid 2-Kolom: Nama Lengkap & Username */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      Nama Lengkap
                    </FieldLabel>
                    <Input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      Nama lengkap resmi yang tampil di dokumen sistem.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      Username
                    </FieldLabel>
                    <Input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username_anda"
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      Identitas unik panggilan akun sistem.
                    </FieldDescription>
                  </Field>
                </div>

                {/* Grid 2-Kolom: Email Akun & Status Hak Akses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-xs font-semibold">
                        Email Akun
                      </FieldLabel>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        Hanya Baca (Terkunci)
                      </span>
                    </div>
                    <Input
                      type="email"
                      disabled
                      value={profile.email}
                      className="text-xs h-9 bg-muted/40 cursor-not-allowed opacity-90"
                    />
                    <FieldDescription className="text-[11px]">
                      Email terdaftar pada autentikasi dan tidak dapat diubah sembarangan demi keamanan.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-xs font-semibold">
                        Peran Aktif Saat Ini
                      </FieldLabel>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        Sistem Otorisasi
                      </span>
                    </div>
                    <Input
                      type="text"
                      disabled
                      value={ROLE_LABELS[profile.role] || profile.role}
                      className="text-xs h-9 bg-muted/40 cursor-not-allowed opacity-90"
                    />
                    <FieldDescription className="text-[11px]">
                      Peran aktif dapat diganti secara langsung via dropdown Mode Aktif di header atas.
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
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="size-3.5" />
                        <span>Simpan Perubahan</span>
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
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">
                Data Pribadi &amp; Kepegawaian
              </CardTitle>
              <CardDescription>
                Informasi kontak komunikasi dan jabatan kerja di Altvira.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Grid 2-Kolom: Nomor Telepon & Jabatan Divisi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel className="text-xs font-semibold">
                      Nomor Telepon / WhatsApp
                    </FieldLabel>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      Nomor aktif untuk konfirmasi pengajuan dan koordinasi termin.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs font-semibold">
                      Jabatan / Divisi Pekerjaan
                    </FieldLabel>
                    <Input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Contoh: Lead Frontend Engineer"
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      Spesialisasi posisi pekerjaan internal di Altvira.
                    </FieldDescription>
                  </Field>
                </div>

                {/* Informasi Peran Aktif & Hak Akses (Lebar Penuh) */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon className="size-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground">
                      Hak Peran Multi Role Pengguna
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Satu akun dapat memiliki lebih dari satu peran yang sah di sistem Altcycles. Anda dapat beralih peran aktif kapan pun melalui dropdown <strong>Mode Aktif</strong> di header kanan atas.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableRoles.map((role) => (
                      <div
                        key={role}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-card flex items-center gap-2"
                      >
                        <CheckCircle2Icon className="size-3.5 text-primary" />
                        <span>{ROLE_LABELS[role] || role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="size-3.5" />
                        <span>Simpan Data Pribadi</span>
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
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">
                Keamanan Akun &amp; Ganti Kata Sandi
              </CardTitle>
              <CardDescription>
                Perbarui kata sandi untuk melindungi akun Anda dari akses yang tidak berwenang.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                {/* Grid 2-Kolom: Kata Sandi Baru & Konfirmasi Kata Sandi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      Kata Sandi Baru
                    </FieldLabel>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter acak kuat"
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      Gunakan kombinasi huruf besar, kecil, angka, dan simbol.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel required className="text-xs font-semibold">
                      Konfirmasi Kata Sandi Baru
                    </FieldLabel>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="text-xs h-9"
                    />
                    <FieldDescription className="text-[11px]">
                      Pastikan sama persis dengan kolom kata sandi baru.
                    </FieldDescription>
                  </Field>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                  <ShieldAlertIcon className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Setiap pergantian kata sandi akan terekam ke dalam Audit Trail dan sesi aktif lainnya akan diverifikasi ulang demi integritas akun keuangan.
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
                        <span>Memperbarui...</span>
                      </>
                    ) : (
                      <>
                        <LockIcon className="size-3.5" />
                        <span>Perbarui Kata Sandi</span>
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
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">
                Preferensi Notifikasi
              </CardTitle>
              <CardDescription>
                Atur jenis peringatan sistem yang ingin Anda terima secara langsung dalam aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-foreground">
                      Pengajuan & Pembayaran Vendor
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Pemberitahuan saat ada pengajuan pembayaran baru atau persetujuan termin.
                    </p>
                  </div>
                  <Switch
                    checked={notifPayment}
                    onCheckedChange={(checked) => {
                      setNotifPayment(checked);
                      toast.success("Preferensi notifikasi disimpan.");
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-foreground">
                      Invoice & Penagihan Klien
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Status verifikasi PO klien dan pembayaran termin piutang.
                    </p>
                  </div>
                  <Switch
                    checked={notifInvoice}
                    onCheckedChange={(checked) => {
                      setNotifInvoice(checked);
                      toast.success("Preferensi notifikasi disimpan.");
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-bold text-foreground">
                    Tutup Buku & Pelaporan Periode SAK
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Pemberitahuan resmi terkait pembekuan jurnal dan finalisasi laporan keuangan.
                  </p>
                </div>
                <Switch
                  checked={notifClosing}
                  onCheckedChange={(checked) => {
                    setNotifClosing(checked);
                    toast.success("Preferensi notifikasi disimpan.");
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
    </div>
  );
}
