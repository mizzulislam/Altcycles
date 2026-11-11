import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { formatDateTimeID, ROLE_LABELS } from "@/lib/formatters";

export function ProfileOverviewPage() {
  const { profile, activeRole, availableRoles } = useAuth();

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
                <span>{profile.job_title || "Anggota Tim Altvira"}</span>
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
                <span>{profile.phone_number || "Nomor belum diatur"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-primary" />
                <span>Bergabung sejak {formatDateTimeID(profile.created_at)}</span>
              </div>
            </div>

            {/* Tentang Saya / Bio */}
            <div className="pt-1.5">
              <h2 className="text-xs font-semibold text-muted-foreground mb-1">
                Tentang Saya
              </h2>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                {profile.bio ||
                  "Belum ada catatan ringkasan pribadi. Anda dapat menambahkannya melalui menu Pengaturan di kartu akun sidebar."}
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
          <span>Wewenang Peran yang Sah ({availableRoles.length} Peran)</span>
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Hak akses resmi yang diberikan oleh Super Admin. Anda dapat berpindah mode operasional melalui menu Mode Aktif di header atas.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {availableRoles.map((role) => {
            const isActive = role === currentRole;
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
                <span>{ROLE_LABELS[role] || role}</span>
                {isActive && (
                  <span className="ml-1 text-[10px] font-bold text-primary dark:text-sky-400 bg-primary/10 px-1.5 py-0.5 rounded-md">
                    Mode Aktif
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* =========================================================================
          GRID STATISTIK RINGKASAN AKUN (Hierarki Tipografi Rapi & Proporsional ala My Tax)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Status Akun */}
        <Card className="p-4 sm:p-5 border-border/75 rounded-2xl shadow-2xs bg-card/60 flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-medium text-muted-foreground">
            Status Akun
          </p>
          <div className="flex items-center gap-2 my-1">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="text-base sm:text-lg font-bold text-foreground">
              Aktif &amp; Sah
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Otorisasi RLS Terverifikasi
          </p>
        </Card>

        {/* Card 2: Mode Aktif */}
        <Card className="p-4 sm:p-5 border-border/75 rounded-2xl shadow-2xs bg-card/60 flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-medium text-muted-foreground">
            Mode Aktif
          </p>
          <div className="flex items-center gap-2 my-1">
            <UserCheckIcon className="size-4 text-primary dark:text-sky-400 shrink-0" />
            <p className="text-base sm:text-lg font-bold text-foreground capitalize truncate">
              {currentRole.replace("_", " ")}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Dapat dialihkan di Header
          </p>
        </Card>

        {/* Card 3: Total Peran */}
        <Card className="p-4 sm:p-5 border-border/75 rounded-2xl shadow-2xs bg-card/60 flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-medium text-muted-foreground">
            Total Peran
          </p>
          <div className="flex items-baseline gap-1.5 my-1">
            <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
              {availableRoles.length}
            </p>
            <span className="text-xs font-semibold text-muted-foreground">
              Peran Wewenang
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Multi-role siap pakai
          </p>
        </Card>

        {/* Card 4: Sesi Terakhir */}
        <Card className="p-4 sm:p-5 border-border/75 rounded-2xl shadow-2xs bg-card/60 flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-medium text-muted-foreground">
            Sesi Terakhir
          </p>
          <div className="flex items-center gap-1.5 my-1">
            <ClockIcon className="size-4 text-primary dark:text-sky-400 shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-foreground truncate tabular-nums">
              {formatDateTimeID(profile.last_login_at || profile.updated_at)}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pencatatan Audit Otomatis
          </p>
        </Card>
      </div>
    </div>
  );
}
