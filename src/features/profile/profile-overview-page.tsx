import * as React from "react";
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { useAuth } from "@/features/auth/auth-context";
import { getMergedProfileFields } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import {
  formatDateTimeI18n,
  formatNpwpDisplay,
  formatRupiah,
  maskBankAccountNumber,
  maskNpwp,
  ROLE_LABELS,
} from "@/lib/formatters";
import { getPtkpInfo } from "@/lib/tax-calculation";
import { getRoleShortName } from "@/components/layout/nav-structure";
import { cn } from "@/lib/utils";

/**
 * Sub-komponen Ticker Terisolasi untuk KPI Sesi Terakhir (Format DD/MM/YY + Waktu).
 * Mengikuti pola CategoryCompositionTicker pada Halaman Media & Banner Login.
 */
const LastSessionTicker = React.memo(function LastSessionTicker({
  items,
}: {
  items: string[];
}) {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    if (items.length <= 1) return;
    let innerTimeout: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      setAnimating(true);
      innerTimeout = setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % items.length);
        setAnimating(false);
      }, 300);
    }, 3200);

    return () => {
      clearInterval(timer);
      if (innerTimeout) clearTimeout(innerTimeout);
    };
  }, [items.length]);

  const currentItem = items[activeIdx] ?? items[0] ?? "-";

  return (
    <span className="inline-flex items-center overflow-hidden h-7 sm:h-8">
      <span
        className={cn(
          "inline-block transition-all duration-300 ease-out",
          animating ? "-translate-y-4 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        {currentItem}
      </span>
    </span>
  );
});

export function ProfileOverviewPage() {
  const { profile: rawProfile, activeRole, availableRoles } = useAuth();
  const { t, language } = useLanguage();
  const [revealNpwp, setRevealNpwp] = React.useState(false);
  const [revealBankAccount, setRevealBankAccount] = React.useState(false);

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

  const ptkpInfo = React.useMemo(
    () => getPtkpInfo(profile.marital_status, profile.dependents_count),
    [profile.marital_status, profile.dependents_count],
  );

  const sessionTickerItems = React.useMemo(() => {
    const raw = profile.last_login_at || profile.updated_at;
    if (!raw) return ["-"];
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return ["-"];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const dateFormatted = `${dd}/${mm}/${yy}`;
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const timeFormatted = language === "en" ? `${hh}:${min}` : `${hh}.${min} WIB`;
    return [dateFormatted, timeFormatted];
  }, [profile.last_login_at, profile.updated_at, language]);

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
                <span className="text-muted-foreground/60">-</span>
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
          DATA KEUANGAN & REKENING PRIBADI (Item 2: Default Dimasking + Toggle Lihat)
          ========================================================================= */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t(
            "settings:profile_overview.financial_title",
            "Data Keuangan & Rekening",
          )}
          description={t(
            "settings:profile_overview.financial_desc",
            "Informasi NPWP dan rekening bank terdaftar untuk keperluan pencairan dana dan bagi hasil proyek.",
          )}
          titleClassName="text-sm sm:text-base font-bold"
          headerClassName="px-6 py-3.5 border-b border-border/70 bg-muted/10 flex flex-row items-center justify-between"
        />
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-primary/30 transition-all flex flex-col justify-between min-h-[82px] shadow-2xs">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("settings:profile_overview.label_npwp", "NPWP")}
                </p>
                {profile.npwp && (
                  <ActionTooltip
                    content={
                      revealNpwp
                        ? t("settings:profile_overview.btn_hide_npwp", "Sembunyikan NPWP")
                        : t("settings:profile_overview.btn_show_npwp", "Lihat NPWP")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setRevealNpwp((prev) => !prev)}
                      aria-label={
                        revealNpwp
                          ? t("settings:profile_overview.btn_hide_npwp", "Sembunyikan NPWP")
                          : t("settings:profile_overview.btn_show_npwp", "Lihat NPWP")
                      }
                      className="size-6 -mr-1 -mt-1 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer border border-transparent hover:border-border/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {revealNpwp ? (
                        <EyeOffIcon className="size-3.5" />
                      ) : (
                        <EyeIcon className="size-3.5" />
                      )}
                    </button>
                  </ActionTooltip>
                )}
              </div>
              <p
                data-testid="overview-npwp-value"
                className="text-sm sm:text-base font-bold text-foreground font-mono mt-1.5 tabular-nums tracking-tight truncate"
              >
                {profile.npwp
                  ? revealNpwp
                    ? formatNpwpDisplay(profile.npwp)
                    : maskNpwp(profile.npwp)
                  : t("settings:profile_overview.not_configured", "Belum diatur")}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-border transition-all flex flex-col justify-between min-h-[82px] shadow-2xs">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("settings:profile_overview.label_ptkp", "Status PTKP")}
                </p>
                <span className="text-[10px] font-bold text-primary dark:text-sky-400 bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded uppercase">
                  TER {ptkpInfo.terCategory}
                </span>
              </div>
              <div>
                <p
                  data-testid="overview-ptkp-value"
                  className="text-sm sm:text-base font-bold text-foreground mt-1.5 tracking-tight truncate"
                >
                  {ptkpInfo.code}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
                  {formatRupiah(ptkpInfo.annualValue)}/th
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-border transition-all flex flex-col justify-between min-h-[82px] shadow-2xs">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("settings:profile_overview.label_bank_name", "Nama Bank")}
                </p>
              </div>
              <p
                data-testid="overview-bank-name-value"
                className="text-sm sm:text-base font-bold text-foreground mt-1.5 truncate tracking-tight"
              >
                {profile.bank_name ||
                  t("settings:profile_overview.not_configured", "Belum diatur")}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-primary/30 transition-all flex flex-col justify-between min-h-[82px] shadow-2xs">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(
                    "settings:profile_overview.label_bank_account",
                    "Nomor Rekening",
                  )}
                </p>
                {profile.bank_account_number && (
                  <ActionTooltip
                    content={
                      revealBankAccount
                        ? t("settings:profile_overview.btn_hide_acc", "Sembunyikan Nomor Rekening")
                        : t("settings:profile_overview.btn_show_acc", "Lihat Nomor Rekening")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setRevealBankAccount((prev) => !prev)}
                      aria-label={
                        revealBankAccount
                          ? t("settings:profile_overview.btn_hide_acc", "Sembunyikan Nomor Rekening")
                          : t("settings:profile_overview.btn_show_acc", "Lihat Nomor Rekening")
                      }
                      className="size-6 -mr-1 -mt-1 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer border border-transparent hover:border-border/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {revealBankAccount ? (
                        <EyeOffIcon className="size-3.5" />
                      ) : (
                        <EyeIcon className="size-3.5" />
                      )}
                    </button>
                  </ActionTooltip>
                )}
              </div>
              <p
                data-testid="overview-bank-acc-value"
                className="text-sm sm:text-base font-bold text-foreground font-mono mt-1.5 tabular-nums tracking-tight truncate"
              >
                {profile.bank_account_number
                  ? revealBankAccount
                    ? profile.bank_account_number
                    : maskBankAccountNumber(profile.bank_account_number)
                  : t("settings:profile_overview.not_configured", "Belum diatur")}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-border transition-all flex flex-col justify-between min-h-[82px] shadow-2xs">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(
                    "settings:profile_overview.label_bank_holder",
                    "Atas Nama Rekening",
                  )}
                </p>
              </div>
              <p
                data-testid="overview-bank-holder-value"
                className="text-sm sm:text-base font-bold text-foreground mt-1.5 truncate tracking-tight"
              >
                {profile.bank_account_holder ||
                  t("settings:profile_overview.not_configured", "Belum diatur")}
              </p>
            </div>
          </div>
        </CardContent>
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
          suffix={` ${t("settings:profile_overview.card_total_roles_unit", "Peran")}`}
          subtext={t("settings:profile_overview.card_total_roles_desc", "Multi-role siap pakai")}
          icon={ShieldCheckIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        />

        <KpiCard
          label={t("settings:profile_overview.card_last_session_title", "Sesi Terakhir")}
          displayValue={<LastSessionTicker items={sessionTickerItems} />}
          subtext={t("settings:profile_overview.card_last_session_desc", "Pencatatan Audit Otomatis")}
          icon={ClockIcon}
          iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        />
      </div>
    </div>
  );
}
