import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LogInIcon,
  ShieldCheckIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AltviraLogo } from "@/components/shared/altvira-logo";
import { OAuthLoadingCard } from "@/components/shared/oauth-loading-card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/lib/theme-context";

type AuthMode = "signin" | "signup";

interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

function evaluatePassword(pwd: string): PasswordCriteria {
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSymbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface LoginPageProps {
  bannerSrc?: string;
}

export function LoginPage({ bannerSrc }: LoginPageProps) {
  const { signIn, signInWithGoogle, signUp, profile, isDemoMode } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = React.useState<AuthMode>("signin");

  // Form Fields
  const [username, setUsername] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // UI States
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [googleSubmitting, setGoogleSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [oauthChecking, setOauthChecking] = React.useState(false);

  // Filter Keamanan Kata Sandi
  const pwdCriteria = React.useMemo(() => evaluatePassword(password), [password]);
  const pwdScore = React.useMemo(() => {
    let score = 0;
    if (pwdCriteria.minLength) score++;
    if (pwdCriteria.hasUpper) score++;
    if (pwdCriteria.hasLower) score++;
    if (pwdCriteria.hasNumber) score++;
    if (pwdCriteria.hasSymbol) score++;
    return score;
  }, [pwdCriteria]);

  // Deteksi dan tangani kembalinya redirect Google OAuth (sukses maupun error)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const hashString = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hashString);

    const errCode =
      searchParams.get("error_code") || hashParams.get("error_code");
    const errDesc =
      searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      searchParams.get("error") ||
      hashParams.get("error");

    if (errCode || errDesc) {
      if (
        errCode === "signup_disabled" ||
        errDesc?.toLowerCase().includes("signup")
      ) {
        setError(
          "Pendaftaran akun baru dinonaktifkan di Supabase (Signups not allowed). Jika ingin mengizinkan pendaftaran akun baru via Google, aktifkan opsi 'Allow new users to sign up' di dashboard Supabase (Authentication -> Sign In / Up), atau silakan gunakan akun Google yang telah terdaftar.",
        );
      } else {
        setError(
          errDesc
            ? decodeURIComponent(errDesc.replace(/\+/g, " "))
            : "Otorisasi Google dibatalkan atau ditolak.",
        );
      }
      setOauthChecking(false);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const hasCode = searchParams.has("code");
    const hasToken = hashParams.has("access_token");

    if (hasCode || hasToken) {
      setOauthChecking(true);
      // Timeout pengaman 7 detik jika sesi tidak berhasil diverifikasi
      const timer = window.setTimeout(() => {
        setOauthChecking(false);
        setError(
          "Waktu verifikasi akun Google habis. Silakan coba masuk kembali.",
        );
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }, 7000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    // Jika tidak sedang dalam transisi visual OAuth, arahkan langsung
    if (profile && !oauthChecking) {
      toast.success(`Berhasil masuk! Selamat datang, ${profile.full_name}`);
      navigate(portalHomeForRole(profile.role), { replace: true });
    }
  }, [profile, navigate, oauthChecking]);

  async function handleGoogleSignIn() {
    setGoogleSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal masuk menggunakan Google.",
      );
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await signIn(username, password);
      toast.success(`Selamat datang, ${loggedIn.full_name}`);
      navigate(portalHomeForRole(loggedIn.role), { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal masuk ke dalam sistem.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validasi Seluruh Kriteria Kata Sandi
    if (
      !pwdCriteria.minLength ||
      !pwdCriteria.hasUpper ||
      !pwdCriteria.hasLower ||
      !pwdCriteria.hasNumber ||
      !pwdCriteria.hasSymbol
    ) {
      setError(
        "Kata sandi belum memenuhi kriteria keamanan: Wajib minimal 8 karakter, serta memiliki kombinasi huruf kapital (A-Z), huruf kecil (a-z), angka (0-9), dan simbol khusus (!@#$%^&* dll).",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp({
        usernameOrEmail: username,
        password,
        fullName,
      });

      if (res.user) {
        toast.success(
          `Akun berhasil dibuat! Selamat datang, ${res.user.full_name}`,
        );
        navigate(portalHomeForRole(res.user.role), { replace: true });
      } else {
        toast.success(
          res.message ??
            "Akun berhasil didaftarkan ke Supabase. Silakan masuk.",
        );
        setMode("signin");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mendaftarkan akun baru.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(demoUsername: string) {
    setUsername(demoUsername);
    setPassword("demo1234");
    setError(null);
  }

  // Tampilan transisi saat kembali dari otorisasi Google OAuth
  if (oauthChecking) {
    return (
      <OAuthLoadingCard
        resolvedTheme={resolvedTheme}
        userName={profile?.full_name}
        isProfileReady={Boolean(profile)}
        onComplete={() => {
          if (profile) {
            toast.success(`Berhasil masuk! Selamat datang, ${profile.full_name}`);
            navigate(portalHomeForRole(profile.role), { replace: true });
          }
        }}
        onCancel={() => {
          setOauthChecking(false);
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#F0F1F3] dark:bg-[#090E19] transition-colors duration-300">
      {/* Tombol Pengalih Mode Gelap & Terang di Ujung Kanan Atas Halaman */}
      <ThemeToggle variant="floating" />

      {/* Grid 2 Kolom Murni: Kolom Kiri (Banner) & Kolom Kanan (Form) */}
      <div className="min-h-screen w-full grid lg:grid-cols-2">
        {/* =====================================================================
            KOLOM KIRI: Area Banner Informasi (Full-Bleed, CMS-Ready)
          Struktur Layering Sesuai Arahan:
          1. Layer Belakang (z-0): Banner visual (gambar/grafis dari CMS)
          2. Layer Depan (z-10): Elemen kotak biru gradasi Altvira yang MENUTUPI
             PENUH seluruh area kotak hitam (full-bleed, edge-to-edge tanpa
             padding/margin sisa) dengan transparansi 20%.
             Fungsi: Menjadi highlight kebiruan Altvira dan menimbulkan efek
             fade yang menyatu dengan banner di belakangnya.
          ===================================================================== */}
      <div className="relative hidden lg:block w-full h-full min-h-screen bg-[#090E19] overflow-hidden select-none">
        {/* LAYER 1 (BELAKANG): Banner Gambar / Slot CMS */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt="Banner Informasi Altvira"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Visual Canvas Bersih untuk Slot Banner CMS */
            <div className="w-full h-full relative overflow-hidden bg-[#090E19]">
              {/* Struktur Grid Halus untuk penempatan banner informasi */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:44px_44px]" />
            </div>
          )}
        </div>

        {/* LAYER 2 (DEPAN / MENUTUPI BANNER & BIDANG HITAM):
            Elemen kotak biru gradasi Altvira yang menutupi penuh dengan transparansi 20%
            Highlight dari banner yang muncul sehingga menimbulkan efek fade */}
        <div
          className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-[#0B43C8] via-[#1FB1F2] to-[#0B43C8] opacity-20"
          aria-hidden="true"
        />
      </div>

      {/* =====================================================================
          KOLOM KANAN: Form Masuk / Buat Akun (Gaya Splitz Bersih & Minimalis)
          ===================================================================== */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Brand Logo Header (Menyesuaikan variant secara otomatis dengan tema aktif) */}
          <div className="flex flex-col items-center text-center -mt-4 mb-3">
            <AltviraLogo
              size={38}
              variant={resolvedTheme === "dark" ? "light" : "dark"}
              subtitle="FINANCIAL ERP"
            />
          </div>

          {/* Mode Pratinjau Alert (Bila belum terkoneksi cloud) */}
          {isDemoMode && (
            <Alert
              variant="info"
              className="border-[#1FB1F2]/40 bg-[#1FB1F2]/10 text-[#090E19] dark:text-white"
            >
              <ShieldCheckIcon className="text-[#0B43C8] dark:text-[#1FB1F2]" />
              <AlertTitle className="text-[#0B43C8] dark:text-[#1FB1F2] font-bold">
                Mode Pratinjau Lokal Aktif
              </AlertTitle>
              <AlertDescription className="text-xs text-[#616C82] dark:text-[#C9C9C9]">
                Pilih akun contoh untuk menguji masing-masing portal peran:
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white dark:bg-[#1A253C] text-[#2A2A2A] dark:text-white border-[#C9C9C9] dark:border-white/15 hover:bg-[#F0F1F3] dark:hover:bg-[#25324E]"
                    onClick={() => fillDemoAccount("superadmin@altvira.id")}
                  >
                    Super Admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white dark:bg-[#1A253C] text-[#2A2A2A] dark:text-white border-[#C9C9C9] dark:border-white/15 hover:bg-[#F0F1F3] dark:hover:bg-[#25324E]"
                    onClick={() => fillDemoAccount("admin@altvira.id")}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white dark:bg-[#1A253C] text-[#2A2A2A] dark:text-white border-[#C9C9C9] dark:border-white/15 hover:bg-[#F0F1F3] dark:hover:bg-[#25324E]"
                    onClick={() => fillDemoAccount("user@altvira.id")}
                  >
                    User
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Card */}
          <Card className="border border-[#C9C9C9]/60 dark:border-white/10 shadow-lg shadow-black/[0.04] dark:shadow-black/50 rounded-2xl bg-white dark:bg-[#121A2B] overflow-hidden transition-colors">
            {/* Tab Switcher: Masuk vs Buat Akun */}
            <div className="grid grid-cols-2 p-1.5 bg-[#F0F1F3]/80 dark:bg-[#0F1626] border-b border-[#C9C9C9]/50 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-xl transition-all ${
                  mode === "signin"
                    ? "bg-white dark:bg-[#1A253C] text-[#0B43C8] dark:text-[#1FB1F2] shadow-sm"
                    : "text-[#616C82] dark:text-[#9AA5B8] hover:text-[#2A2A2A] dark:hover:text-white"
                }`}
              >
                <LogInIcon className="size-4" />
                <span>Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-xl transition-all ${
                  mode === "signup"
                    ? "bg-white dark:bg-[#1A253C] text-[#0B43C8] dark:text-[#1FB1F2] shadow-sm"
                    : "text-[#616C82] dark:text-[#9AA5B8] hover:text-[#2A2A2A] dark:hover:text-white"
                }`}
              >
                <UserPlusIcon className="size-4" />
                <span>Buat Akun</span>
              </button>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Form Title & Subtitle (Mengikuti Referensi Splitz) */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-[#2A2A2A] dark:text-white">
                  {mode === "signin" ? "Masuk ke Sistem" : "Buat Akun Baru"}
                </h2>
                <p className="text-xs text-[#616C82] dark:text-[#9AA5B8]">
                  {mode === "signin"
                    ? "Silakan masukkan username dan kata sandi Anda"
                    : "Daftarkan akun internal Altvira untuk mengakses portal kerja"}
                </p>
              </div>

              {/* Form Body */}
              <form
                id="auth-form"
                onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
                className="space-y-4"
              >
                <FieldGroup>
                  {/* Field Nama Lengkap (Khusus Mode Buat Akun) */}
                  {mode === "signup" && (
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel
                        htmlFor="auth-fullname"
                        className="text-xs font-semibold text-[#2A2A2A] dark:text-white"
                      >
                        Nama Lengkap
                      </FieldLabel>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82] dark:text-[#9AA5B8]" />
                        <Input
                          id="auth-fullname"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="Nama lengkap Anda"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 h-11 border-[#C9C9C9] dark:border-white/15 dark:bg-[#1A253C] dark:text-white dark:placeholder:text-[#9AA5B8]/50 focus-visible:ring-[#0B43C8] dark:focus-visible:ring-[#1FB1F2] text-[#2A2A2A]"
                        />
                      </div>
                    </Field>
                  )}

                  {/* Field Username */}
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel
                      htmlFor="auth-username"
                      className="text-xs font-semibold text-[#2A2A2A] dark:text-white"
                    >
                      Username
                    </FieldLabel>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82] dark:text-[#9AA5B8]" />
                      <Input
                        id="auth-username"
                        type="text"
                        autoComplete="username"
                        required
                        placeholder={
                          mode === "signin"
                            ? "nama@altvira.id atau username"
                            : "contoh: izzul atau nama@altvira.id"
                        }
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 h-11 border-[#C9C9C9] dark:border-white/15 dark:bg-[#1A253C] dark:text-white dark:placeholder:text-[#9AA5B8]/50 focus-visible:ring-[#0B43C8] dark:focus-visible:ring-[#1FB1F2] text-[#2A2A2A]"
                        aria-invalid={Boolean(error)}
                      />
                    </div>
                  </Field>

                  {/* Field Kata Sandi (Dengan Tombol Show/Hide Password) */}
                  <Field data-invalid={Boolean(error)}>
                    <div className="flex items-center justify-between">
                      <FieldLabel
                        htmlFor="auth-password"
                        className="text-xs font-semibold text-[#2A2A2A] dark:text-white"
                      >
                        Kata Sandi
                      </FieldLabel>
                      {mode === "signin" && (
                        <Link
                          to="/lupa-kata-sandi"
                          className="text-xs font-medium text-[#0B43C8] dark:text-[#1FB1F2] hover:underline transition-colors"
                        >
                          Lupa kata sandi?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82] dark:text-[#9AA5B8]" />
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={
                          mode === "signin"
                            ? "current-password"
                            : "new-password"
                        }
                        required
                        placeholder={
                          mode === "signin"
                            ? "Masukkan kata sandi"
                            : "Minimal 6 karakter"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-11 h-11 border-[#C9C9C9] dark:border-white/15 dark:bg-[#1A253C] dark:text-white dark:placeholder:text-[#9AA5B8]/50 focus-visible:ring-[#0B43C8] dark:focus-visible:ring-[#1FB1F2] text-[#2A2A2A]"
                        aria-invalid={Boolean(error)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#616C82] hover:text-[#2A2A2A] dark:text-[#9AA5B8] dark:hover:text-white rounded-md transition-colors"
                        aria-label={
                          showPassword
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                      >
                        {showPassword ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </button>
                    </div>

                    {/* Indikator & Ketentuan Kata Sandi */}
                    {(mode === "signup" || password.length > 0) && (
                      <div className="space-y-2 pt-1 transition-all">
                        {/* Progress Bar Kekuatan Sandi */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#616C82] dark:text-[#9AA5B8] font-medium">
                              Kekuatan Kata Sandi:
                            </span>
                            <span
                              className={`font-bold transition-colors ${
                                pwdScore === 5
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : pwdScore >= 3
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {pwdScore === 5
                                ? "Kuat"
                                : pwdScore >= 3
                                  ? "Sedang"
                                  : "Lemah"}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-[#E5E7EB] dark:bg-white/10 rounded-full overflow-hidden">
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <div
                                key={lvl}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  pwdScore >= lvl
                                    ? pwdScore === 5
                                      ? "bg-emerald-500"
                                      : pwdScore >= 3
                                        ? "bg-amber-400"
                                        : "bg-red-500"
                                    : "bg-transparent"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Checklist Ketentuan Kata Sandi (Hanya tampil pada tab Buat Akun) */}
                        {mode === "signup" && (
                          <div className="p-2.5 rounded-xl bg-[#F0F1F3]/80 dark:bg-[#1A253C]/70 border border-[#C9C9C9]/60 dark:border-white/10 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2A2A2A] dark:text-white">
                              <ShieldCheckIcon className="size-3.5 text-[#0B43C8] dark:text-[#1FB1F2]" />
                              <span>Ketentuan Kata Sandi:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.minLength
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-[#616C82] dark:text-[#9AA5B8]"
                                }`}
                              >
                                {pwdCriteria.minLength ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>Minimal 8 karakter</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.hasUpper
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-[#616C82] dark:text-[#9AA5B8]"
                                }`}
                              >
                                {pwdCriteria.hasUpper ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>Huruf kapital (A-Z)</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.hasLower
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-[#616C82] dark:text-[#9AA5B8]"
                                }`}
                              >
                                {pwdCriteria.hasLower ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>Huruf kecil (a-z)</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.hasNumber
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-[#616C82] dark:text-[#9AA5B8]"
                                }`}
                              >
                                {pwdCriteria.hasNumber ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>Angka (0-9)</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 sm:col-span-2 transition-colors ${
                                  pwdCriteria.hasSymbol
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-[#616C82] dark:text-[#9AA5B8]"
                                }`}
                              >
                                {pwdCriteria.hasSymbol ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>Simbol khusus (!@#$%^&* dll)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Field>

                  {/* Field Konfirmasi Kata Sandi (Khusus Mode Buat Akun) */}
                  {mode === "signup" && (
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel
                        htmlFor="auth-confirm-password"
                        className="text-xs font-semibold text-[#2A2A2A] dark:text-white"
                      >
                        Konfirmasi Kata Sandi
                      </FieldLabel>
                      <div className="relative">
                        <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82] dark:text-[#9AA5B8]" />
                        <Input
                          id="auth-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          placeholder="Ulangi kata sandi"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-11 h-11 border-[#C9C9C9] dark:border-white/15 dark:bg-[#1A253C] dark:text-white dark:placeholder:text-[#9AA5B8]/50 focus-visible:ring-[#0B43C8] dark:focus-visible:ring-[#1FB1F2] text-[#2A2A2A]"
                          aria-invalid={Boolean(error)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#616C82] hover:text-[#2A2A2A] dark:text-[#9AA5B8] dark:hover:text-white rounded-md transition-colors"
                          aria-label={
                            showConfirmPassword
                              ? "Sembunyikan konfirmasi kata sandi"
                              : "Tampilkan konfirmasi kata sandi"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </button>
                      </div>
                    </Field>
                  )}

                  {/* Error Message */}
                  {error && (
                    <FieldDescription className="text-xs text-[#DC2626] font-medium bg-[#DC2626]/5 p-2 rounded-lg border border-[#DC2626]/20">
                      {error}
                    </FieldDescription>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting || googleSubmitting}
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-[#0B43C8] hover:bg-[#083296] text-white shadow-md shadow-[#0B43C8]/20 transition-all active:scale-[0.99]"
                  >
                    {submitting ? (
                      <Spinner className="mr-2" />
                    ) : mode === "signin" ? (
                      <LogInIcon className="mr-2 size-4" />
                    ) : (
                      <CheckCircle2Icon className="mr-2 size-4" />
                    )}
                    {mode === "signin"
                      ? "Masuk ke Sistem"
                      : "Buat Akun Sekarang"}
                  </Button>

                  {/* Pembatas "atau lanjutkan dengan" */}
                  <div className="relative my-2 pt-1">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="bg-[#C9C9C9]/60 dark:bg-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase">
                      <span className="bg-white dark:bg-[#121A2B] px-3 text-[#616C82] dark:text-[#9AA5B8] font-medium tracking-wider">
                        atau lanjutkan dengan
                      </span>
                    </div>
                  </div>

                  {/* Tombol Masuk dengan Google */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting || googleSubmitting}
                    onClick={handleGoogleSignIn}
                    className="w-full h-11 text-sm font-semibold rounded-xl border-[#C9C9C9] dark:border-white/15 bg-white dark:bg-[#1A253C]/60 hover:bg-[#F0F1F3] dark:hover:bg-[#25324E] text-[#2A2A2A] dark:text-white transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2.5"
                  >
                    {googleSubmitting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <GoogleIcon className="size-4 shrink-0" />
                    )}
                    <span>Masuk dengan Google</span>
                  </Button>
                </FieldGroup>
              </form>

              {/* Mode Toggle Link */}
              <div className="text-center text-xs text-[#616C82] dark:text-[#9AA5B8]">
                {mode === "signin" ? (
                  <>
                    Belum memiliki akun internal?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                      }}
                      className="font-bold text-[#0B43C8] dark:text-[#1FB1F2] hover:underline transition-colors"
                    >
                      Buat Akun di sini
                    </button>
                  </>
                ) : (
                  <>
                    Sudah memiliki akun terdaftar?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setError(null);
                      }}
                      className="font-bold text-[#0B43C8] dark:text-[#1FB1F2] hover:underline transition-colors"
                    >
                      Masuk ke Sistem
                    </button>
                  </>
                )}
              </div>
            </CardContent>

            <Separator className="bg-[#C9C9C9]/50 dark:bg-white/10" />

            {/* Buyer Portal Client Quick Access */}
            <div className="p-4 sm:p-5 bg-[#F0F1F3]/50 dark:bg-[#0F1626]/60 flex flex-col gap-2">
              <span className="text-[11px] text-[#616C82] dark:text-[#9AA5B8]">
                Klien / Pembeli Proyek Altvira tidak memerlukan akun login:
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full h-9 text-xs border-[#C9C9C9] dark:border-white/15 text-[#2A2A2A] dark:text-white bg-white dark:bg-[#1A253C]/60 hover:bg-[#F0F1F3] dark:hover:bg-[#25324E] hover:text-[#0B43C8] dark:hover:text-[#1FB1F2] rounded-xl transition-all"
              >
                <Link to="/portal-pembeli">
                  <span>Buka Portal Pembeli (Akses via Nomor PO)</span>
                  <ExternalLinkIcon className="ml-1.5 size-3.5 text-[#616C82] dark:text-[#9AA5B8]" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
