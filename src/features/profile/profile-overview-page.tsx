import * as React from "react";
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  LandmarkIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { useAuth } from "@/features/auth/auth-context";
import { getMergedProfileFields } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import {
  formatDateTimeI18n,
  formatNpwpDisplay,
  maskBankAccountNumber,
  maskNpwp,
  ROLE_LABELS,
} from "@/lib/formatters";
import { getRoleShortName } from "@/components/layout/nav-structure";

export function ProfileOverviewPage() {
  const { profile: rawProfile, activeRole, availableRoles } = useAuth();
  const { t, language } = useLanguage();
  const [revealSensitive, setRevealSensitive] = React.useState(false);

  const profile = React.useMemo(
    () => getMergedProfileFields(rawProfile),
    [rawProfile],
  );

  if (!profile) return null;

  const currentRole = activeRole || profile.role;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const username =
    profile.username || (profile.email ? (profile.email.split("@")[0] ?? "user").toLowerCase() : "user");

  return (
    <div className="flex flex-col gap-6">
      {/* =========================================================================
          HERO PROFILE CARD (Desain Bersih, Elegan, Mengadopsi My Tax)
          Tanpa button pengaturan profil; tanpa tag role di samping nama.
          Avatar bulat berdiameter pas sejajar ujung baris 1 Tentang Saya,
          stroke tipis, dan efek highlight cahaya biru tipis di belakang bulatan.
          ========================================================================= */}
      <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-sm rounded-3xl">
        {/* Konten Hero: Avatar + Identitas Lengkap (Jarak Diperlebar agar Tidak Mepet) */}
        <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-10 md:gap-12 max-w-4xl">
          {/* Avatar Lingkaran Bersih dengan Highlight Cahaya Biru Tipis (Referensi My Tax) */}
          <div className="relative shrink-0 self-start">
            {/* Ambient Glow Cahaya Biru Tipis di Belakang Bulatan */}
            <div
              className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-primary/30 via-sky-400/25 to-transparent blur-xl opacity-80 pointer-events-none"
              aria-hidden="true"
            />
            {/* Bulatan Avatar Berdiameter Pas Sejajar Ujung Bawah Teks Tentang Saya Baris 1 */}
            <div className="relative size-36 sm:size-40 rounded-full border border-primary/35 dark:border-sky-400/35 bg-card dark:bg-[#121A2B] text-primary flex items-center justify-center font-bold text-4xl shadow-[0_4px_24px_rgba(11,67,200,0.18)] overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-primary dark:text-sky-400">{initials}</span>
              )}
            </div>
          </div>

          {/* Blok Identitas Pengguna (Digeser ke Kanan agar Lega dari Bulatan Foto) */}
          <div className="space-y-3.5 flex-1 min-w-0 sm:pl-3 md:pl-4">
            <div>
              {/* Nama Lengkap Bersih Tanpa Tag Role di Sebelah Kanan */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {profile.full_name}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className="font-semibold text-foreground/80">@{username}</span>
                <span>•</span>
                <span>{profile.job_title || t("settings:profile_overview.default_job_title", "Anggota Tim Altvira")}</span>
              </p>
            </div>

            {/* Metadata Info Kontak & Tanggal (Gaya My Tax: Ikon Rapi Sejajar) */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-muted-foreground pt-0.5">
              <div className="flex items-center gap-1.5">
                <MailIcon className="size-3.5 text-primary" />
                <span className="text-foreground/90 font-medium">{profile.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneIcon className="size-3.5 text-primary" />
                <span>{profile.phone_number || t("settings:profile_overview.phone_not_set", "Nomor belum diatur")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-primary" />
                <span>
                  {t("settings:profile_overview.joined_since", {
                    date: formatDateTimeI18n(profile.created_at, language),
                    defaultValue: `Bergabung sejak ${formatDateTimeI18n(profile.created_at, language)}`,
                  })}
                </span>
              </div>
            </div>

            {/* Tentang Saya / Bio */}
            <div className="pt-1.5">
              <h2 className="text-xs font-semibold text-muted-foreground mb-1">
                {t("settings:profile_overview.about_me", "Tentang Saya")}
              </h2>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                {profile.bio ||
                  t(
                    "settings:profile_overview.empty_bio",
                    "Belum ada catatan ringkasan pribadi. Anda dapat menambahkannya melalui menu Pengaturan di kartu akun sidebar.",
                  )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          DAFTAR WEWENANG PERAN YANG SAH (Hanya Peran yang Dimiliki)
          ========================================================================= */}
      <Card className="p-6 border-border/80 shadow-2xs rounded-2xl">
        <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-primary dark:text-sky-400" />
          <span>
            {t("settings:profile_overview.roles_title", {
              count: availableRoles.length,
              defaultValue: `Wewenang Peran yang Sah (${availableRoles.length} Peran)`,
            })}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {t(
            "settings:profile_overview.roles_desc",
            "Hak akses resmi yang diberikan oleh Super Admin. Anda dapat berpindah mode operasional melalui menu Mode Aktif di header atas.",
          )}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {availableRoles.map((role) => {
            const isActive = role === currentRole;
            const roleLabel =
              t(`settings:profile_overview.role_labels.${role}`, ROLE_LABELS[role] || role);

            return (
              <div
                key={role}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary/50 text-primary dark:text-sky-400 shadow-xs"
                    : "bg-muted/30 border-border/70 text-muted-foreground"
                }`}
              >
                {isActive ? (
                  <CheckCircle2Icon className="size-4 text-primary dark:text-sky-400" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                )}
                <span>{roleLabel}</span>
                {isActive && (
                  <span className="ml-1 text-[10px] font-bold text-primary dark:text-sky-400 bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {t("settings:profile_overview.active_mode_badge", "Mode Aktif")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* =========================================================================
          DATA KEUANGAN & REKENING PRIBADI (Item 2: Default Dimasking + Toggle Lihat)
          ========================================================================= */}
      <Card className="p-6 border-border/80 shadow-2xs rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <LandmarkIcon className="size-4 text-primary dark:text-sky-400" />
            <span>
              {t(
                "settings:profile_overview.financial_title",
                "Data Keuangan & Rekening",
              )}
            </span>
          </h2>
          {(profile.npwp || profile.bank_account_number) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevealSensitive((prev) => !prev)}
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {revealSensitive ? (
                <>
                  <EyeOffIcon className="size-3.5" />
                  <span>
                    {t(
                      "settings:profile_overview.btn_hide_sensitive",
                      "Sembunyikan Data",
                    )}
                  </span>
                </>
              ) : (
                <>
                  <EyeIcon className="size-3.5" />
                  <span>
                    {t(
                      "settings:profile_overview.btn_show_sensitive",
                      "Lihat Data Lengkap",
                    )}
                  </span>
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t(
            "settings:profile_overview.financial_desc",
            "Informasi NPWP dan rekening bank terdaftar untuk keperluan pencairan dana dan bagi hasil proyek.",
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl bg-muted/25 border border-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("settings:profile_overview.label_npwp", "NPWP")}
            </p>
            <p
              data-testid="overview-npwp-value"
              className="text-xs sm:text-sm font-bold text-foreground font-mono mt-1 tabular-nums"
            >
              {profile.npwp
                ? revealSensitive
                  ? formatNpwpDisplay(profile.npwp)
                  : maskNpwp(profile.npwp)
                : t("settings:profile_overview.not_configured", "Belum diatur")}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/25 border border-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("settings:profile_overview.label_bank_name", "Nama Bank")}
            </p>
            <p
              data-testid="overview-bank-name-value"
              className="text-xs sm:text-sm font-bold text-foreground mt-1 truncate"
            >
              {profile.bank_name ||
                t("settings:profile_overview.not_configured", "Belum diatur")}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/25 border border-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t(
                "settings:profile_overview.label_bank_account",
                "Nomor Rekening",
              )}
            </p>
            <p
              data-testid="overview-bank-acc-value"
              className="text-xs sm:text-sm font-bold text-foreground font-mono mt-1 tabular-nums"
            >
              {profile.bank_account_number
                ? revealSensitive
                  ? profile.bank_account_number
                  : maskBankAccountNumber(profile.bank_account_number)
                : t("settings:profile_overview.not_configured", "Belum diatur")}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/25 border border-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t(
                "settings:profile_overview.label_bank_holder",
                "Atas Nama Rekening",
              )}
            </p>
            <p
              data-testid="overview-bank-holder-value"
              className="text-xs sm:text-sm font-bold text-foreground mt-1 truncate"
            >
              {profile.bank_account_holder ||
                t("settings:profile_overview.not_configured", "Belum diatur")}
            </p>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          GRID STATISTIK RINGKASAN AKUN (Komponen Tunggal KpiCard — Item 10)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("settings:profile_overview.card_status_title", "Status Akun")}
          displayValue={t("settings:profile_overview.card_status_value", "Aktif & Sah")}
          subtext={t("settings:profile_overview.card_status_desc", "Otorisasi RLS Terverifikasi")}
          icon={CheckCircle2Icon}
          iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        />

        <KpiCard
          label={t("settings:profile_overview.card_active_mode_title", "Mode Aktif")}
          displayValue={getRoleShortName(currentRole, t)}
          subtext={t("settings:profile_overview.card_active_mode_desc", "Dapat dialihkan di Header")}
          icon={UserCheckIcon}
          iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        />

        <KpiCard
          label={t("settings:profile_overview.card_total_roles_title", "Total Peran")}
          value={availableRoles.length}
          suffix={` ${t("settings:profile_overview.card_total_roles_unit", "Peran Wewenang")}`}
          subtext={t("settings:profile_overview.card_total_roles_desc", "Multi-role siap pakai")}
          icon={ShieldCheckIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        />

        <KpiCard
          label={t("settings:profile_overview.card_last_session_title", "Sesi Terakhir")}
          displayValue={formatDateTimeI18n(profile.last_login_at || profile.updated_at, language)}
          valueClassName="text-sm sm:text-base"
          subtext={t("settings:profile_overview.card_last_session_desc", "Pencatatan Audit Otomatis")}
          icon={ClockIcon}
          iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        />
      </div>
    </div>
  );
}
