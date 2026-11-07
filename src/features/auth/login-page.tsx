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

type AuthMode = "signin" | "signup";

interface LoginPageProps {
  bannerSrc?: string;
}

export function LoginPage({ bannerSrc }: LoginPageProps) {
  const { signIn, signUp, profile, isDemoMode } = useAuth();
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
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      navigate(portalHomeForRole(profile.role), { replace: true });
    }
  }, [profile, navigate]);

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

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#F0F1F3]">
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
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center text-center space-y-1 mb-2">
            <AltviraLogo size={38} variant="dark" subtitle="FINANCIAL ERP" />
          </div>

          {/* Mode Pratinjau Alert (Bila belum terkoneksi cloud) */}
          {isDemoMode && (
            <Alert
              variant="info"
              className="border-[#1FB1F2]/40 bg-[#1FB1F2]/10 text-[#090E19]"
            >
              <ShieldCheckIcon className="text-[#0B43C8]" />
              <AlertTitle className="text-[#0B43C8] font-bold">
                Mode Pratinjau Lokal Aktif
              </AlertTitle>
              <AlertDescription className="text-xs text-[#616C82]">
                Pilih akun contoh untuk menguji masing-masing portal peran:
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-[#2A2A2A] border-[#C9C9C9] hover:bg-[#F0F1F3]"
                    onClick={() => fillDemoAccount("superadmin@altvira.id")}
                  >
                    Super Admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-[#2A2A2A] border-[#C9C9C9] hover:bg-[#F0F1F3]"
                    onClick={() => fillDemoAccount("admin@altvira.id")}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-[#2A2A2A] border-[#C9C9C9] hover:bg-[#F0F1F3]"
                    onClick={() => fillDemoAccount("user@altvira.id")}
                  >
                    User
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Card */}
          <Card className="border border-[#C9C9C9]/60 shadow-lg shadow-black/[0.04] rounded-2xl bg-white overflow-hidden">
            {/* Tab Switcher: Masuk vs Buat Akun */}
            <div className="grid grid-cols-2 p-1.5 bg-[#F0F1F3]/80 border-b border-[#C9C9C9]/50">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-xl transition-all ${
                  mode === "signin"
                    ? "bg-white text-[#0B43C8] shadow-sm"
                    : "text-[#616C82] hover:text-[#2A2A2A]"
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
                    ? "bg-white text-[#0B43C8] shadow-sm"
                    : "text-[#616C82] hover:text-[#2A2A2A]"
                }`}
              >
                <UserPlusIcon className="size-4" />
                <span>Buat Akun</span>
              </button>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Form Title & Subtitle (Mengikuti Referensi Splitz) */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-[#2A2A2A]">
                  {mode === "signin" ? "Masuk ke Sistem" : "Buat Akun Baru"}
                </h2>
                <p className="text-xs text-[#616C82]">
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
                        className="text-xs font-semibold text-[#2A2A2A]"
                      >
                        Nama Lengkap
                      </FieldLabel>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82]" />
                        <Input
                          id="auth-fullname"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="Nama lengkap Anda"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 h-11 border-[#C9C9C9] focus-visible:ring-[#0B43C8] text-[#2A2A2A]"
                        />
                      </div>
                    </Field>
                  )}

                  {/* Field Username */}
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel
                      htmlFor="auth-username"
                      className="text-xs font-semibold text-[#2A2A2A]"
                    >
                      Username
                    </FieldLabel>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82]" />
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
                        className="pl-10 h-11 border-[#C9C9C9] focus-visible:ring-[#0B43C8] text-[#2A2A2A]"
                        aria-invalid={Boolean(error)}
                      />
                    </div>
                  </Field>

                  {/* Field Kata Sandi (Dengan Tombol Show/Hide Password) */}
                  <Field data-invalid={Boolean(error)}>
                    <div className="flex items-center justify-between">
                      <FieldLabel
                        htmlFor="auth-password"
                        className="text-xs font-semibold text-[#2A2A2A]"
                      >
                        Kata Sandi
                      </FieldLabel>
                      {mode === "signin" && (
                        <Link
                          to="/lupa-kata-sandi"
                          className="text-xs font-medium text-[#0B43C8] hover:text-[#1FB1F2] transition-colors"
                        >
                          Lupa kata sandi?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82]" />
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
                        className="pl-10 pr-11 h-11 border-[#C9C9C9] focus-visible:ring-[#0B43C8] text-[#2A2A2A]"
                        aria-invalid={Boolean(error)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#616C82] hover:text-[#2A2A2A] rounded-md transition-colors"
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
                  </Field>

                  {/* Field Konfirmasi Kata Sandi (Khusus Mode Buat Akun) */}
                  {mode === "signup" && (
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel
                        htmlFor="auth-confirm-password"
                        className="text-xs font-semibold text-[#2A2A2A]"
                      >
                        Konfirmasi Kata Sandi
                      </FieldLabel>
                      <div className="relative">
                        <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#616C82]" />
                        <Input
                          id="auth-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          placeholder="Ulangi kata sandi"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-11 h-11 border-[#C9C9C9] focus-visible:ring-[#0B43C8] text-[#2A2A2A]"
                          aria-invalid={Boolean(error)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#616C82] hover:text-[#2A2A2A] rounded-md transition-colors"
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
                    disabled={submitting}
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
                </FieldGroup>
              </form>

              {/* Mode Toggle Link */}
              <div className="text-center text-xs text-[#616C82]">
                {mode === "signin" ? (
                  <>
                    Belum memiliki akun internal?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                      }}
                      className="font-bold text-[#0B43C8] hover:text-[#1FB1F2] transition-colors"
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
                      className="font-bold text-[#0B43C8] hover:text-[#1FB1F2] transition-colors"
                    >
                      Masuk ke Sistem
                    </button>
                  </>
                )}
              </div>
            </CardContent>

            <Separator className="bg-[#C9C9C9]/50" />

            {/* Buyer Portal Client Quick Access */}
            <div className="p-4 sm:p-5 bg-[#F0F1F3]/50 flex flex-col gap-2">
              <span className="text-[11px] text-[#616C82]">
                Klien / Pembeli Proyek Altvira tidak memerlukan akun login:
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full h-9 text-xs border-[#C9C9C9] text-[#2A2A2A] hover:bg-white hover:text-[#0B43C8] rounded-xl transition-all"
              >
                <Link to="/portal-pembeli">
                  <span>Buka Portal Pembeli (Akses via Nomor PO)</span>
                  <ExternalLinkIcon className="ml-1.5 size-3.5 text-[#616C82]" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
