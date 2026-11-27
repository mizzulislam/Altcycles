import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { OAuthLoadingCard } from "@/components/shared/oauth-loading-card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  getCachedActiveLoginMedia,
  listActiveLoginMedia,
} from "@/lib/data-service";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/i18n";
import type { LoginMediaItemRow } from "@/types/database.types";

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
  const { t } = useLanguage();
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
  const [capsLockOn, setCapsLockOn] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [googleSubmitting, setGoogleSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [oauthChecking, setOauthChecking] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const searchParams = new URLSearchParams(window.location.search);
    const hashString = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hashString);
    const hasCode = searchParams.has("code");
    const hasToken = hashParams.has("access_token");
    const hasFlag =
      window.sessionStorage.getItem("altcycles_oauth_in_progress") === "1";
    return hasCode || hasToken || hasFlag;
  });

  const profileRef = React.useRef(profile);
  profileRef.current = profile;

  // Media Banner / Flyer / Konten Medsos sisi kiri (hidrasi instan dari cache agar bebas kedip saat refresh)
  const [mediaSlides, setMediaSlides] = React.useState<LoginMediaItemRow[]>(() =>
    getCachedActiveLoginMedia(),
  );
  const [mediaLoading, setMediaLoading] = React.useState(
    () => getCachedActiveLoginMedia().length === 0,
  );
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [isBannerHovered, setIsBannerHovered] = React.useState(false);

  // Status pemuatan & fallback per slide agar tidak pernah menampilkan layar gelap/kosong
  const [loadedSlideIds, setLoadedSlideIds] = React.useState<Record<string, boolean>>({});
  const [failedSlideIds, setFailedSlideIds] = React.useState<Record<string, boolean>>({});

  const markSlideLoaded = React.useCallback((id: string) => {
    setLoadedSlideIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const markSlideFailed = React.useCallback((id: string) => {
    setFailedSlideIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  React.useEffect(() => {
    let active = true;
    void listActiveLoginMedia()
      .then((rows) => {
        if (!active) return;
        setMediaSlides((prev) => {
          const same =
            prev.length === rows.length &&
            prev.every(
              (p, idx) =>
                p.id === rows[idx]?.id &&
                p.updated_at === rows[idx]?.updated_at &&
                p.image_url === rows[idx]?.image_url,
            );
          return same ? prev : rows;
        });
      })
      .catch(() => {
        // Gunakan kanvas default jika gagal memuat media
      })
      .finally(() => {
        if (active) setMediaLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveSlideCount = mediaSlides.length;
  const safeSlideIndex =
    effectiveSlideCount > 0 ? activeSlideIndex % effectiveSlideCount : 0;

  // Prefetch bertahap: dahulukan slide aktif dan slide berikutnya agar tidak membebani jaringan/CPU di awal
  React.useEffect(() => {
    if (typeof window === "undefined" || mediaSlides.length === 0) return;
    const currentSlide = mediaSlides[safeSlideIndex];
    if (currentSlide && !loadedSlideIds[currentSlide.id] && !failedSlideIds[currentSlide.id]) {
      const img = new Image();
      img.onload = () => markSlideLoaded(currentSlide.id);
      img.onerror = () => markSlideFailed(currentSlide.id);
      img.src = currentSlide.image_url;
    }
    // Prefetch slide berikutnya secara bertahap
    const nextIdx = (safeSlideIndex + 1) % mediaSlides.length;
    const nextSlide = mediaSlides[nextIdx];
    if (nextSlide && !loadedSlideIds[nextSlide.id] && !failedSlideIds[nextSlide.id]) {
      const nextImg = new Image();
      nextImg.onload = () => markSlideLoaded(nextSlide.id);
      nextImg.onerror = () => markSlideFailed(nextSlide.id);
      nextImg.src = nextSlide.image_url;
    }
  }, [mediaSlides, safeSlideIndex, loadedSlideIds, failedSlideIds, markSlideLoaded, markSlideFailed]);

  React.useEffect(() => {
    if (effectiveSlideCount <= 1 || isBannerHovered) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % effectiveSlideCount);
    }, 5500); // 5.5 detik: durasi nyaman untuk membaca banner & waktu decode gambar aman
    return () => window.clearInterval(timer);
  }, [effectiveSlideCount, isBannerHovered]);

  const currentMedia = mediaSlides[safeSlideIndex] ?? null;
  const displayCategoryLabels = {
    banner: "Banner Utama",
    flyer: "Flyer Promosi",
    medsos: "Konten Medsos",
  } as const;

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
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("altcycles_oauth_in_progress");
      }
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
    const hasFlag =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("altcycles_oauth_in_progress") === "1";

    if (hasCode || hasToken || hasFlag) {
      setOauthChecking(true);
      // Timeout pengaman 15 detik jika sesi tidak berhasil diverifikasi (memberi ruang tombol Batalkan pada 8 detik)
      const timer = window.setTimeout(() => {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("altcycles_oauth_in_progress");
        }
        setOauthChecking(false);
        setError(
          "Waktu verifikasi akun Google habis. Silakan coba masuk kembali.",
        );
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }, 15000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    // Jika tidak sedang dalam transisi visual OAuth, arahkan langsung secara silent
    const isOauthPending =
      oauthChecking ||
      (typeof window !== "undefined" &&
        window.sessionStorage.getItem("altcycles_oauth_in_progress") === "1");

    if (profile && !isOauthPending) {
      navigate(portalHomeForRole(profile.role), { replace: true });
    }
  }, [profile, navigate, oauthChecking]);

  async function handleGoogleSignIn() {
    setGoogleSubmitting(true);
    setError(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("altcycles_oauth_in_progress", "1");
    }
    setOauthChecking(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("altcycles_oauth_in_progress");
      }
      setOauthChecking(false);
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
      toast.success(`Berhasil masuk! Selamat datang, ${loggedIn.full_name}`, {
        id: "auth-login-success",
      });
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

  // Tampilan transisi saat masuk / kembali dari otorisasi Google OAuth
  if (oauthChecking) {
    return (
      <OAuthLoadingCard
        resolvedTheme={resolvedTheme}
        userName={profile?.full_name}
        isProfileReady={Boolean(profile)}
        onComplete={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("altcycles_oauth_in_progress");
          }
          setOauthChecking(false);
          const targetProfile = profileRef.current || profile;
          if (targetProfile) {
            toast.success(
              `Berhasil masuk! Selamat datang, ${targetProfile.full_name}`,
              { id: "auth-login-success" },
            );
            navigate(portalHomeForRole(targetProfile.role), { replace: true });
          } else {
            navigate("/portal/super-admin", { replace: true });
          }
        }}
        onCancel={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("altcycles_oauth_in_progress");
          }
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
    <div className="relative min-h-screen w-full bg-muted/30 dark:bg-background transition-colors duration-300">
      {/* Tombol Aksi di Ujung Kanan Atas: Dual Bahasa & Mode Gelap/Terang (Desktop) - Disusun Vertikal dalam Box */}
      <div className="hidden lg:flex fixed top-4 right-5 z-[9999] flex-col items-center p-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-md gap-1">
        <LanguageToggle
          size="default"
          className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none"
        />
        <div className="w-4 h-px bg-border/60" aria-hidden="true" />
        <ThemeToggle
          variant="inline"
          size="default"
          className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none"
        />
      </div>

      {/* Grid 2 Kolom Murni: Kolom Kiri (Banner) & Kolom Kanan (Form) */}
      <div className="min-h-screen w-full grid lg:grid-cols-2">
        {/* =====================================================================
            KOLOM KIRI: Area Banner Informasi (Full-Bleed, CMS-Ready)
            Mengunci tinggi pada h-screen dengan sticky top-0 & self-start
            agar tampilan & skala banner pada tab Buat Akun identik persis
            dengan tab Masuk tanpa terjadi peregangan/pemotongan (anti-zoom/crop).
          ===================================================================== */}
        <div
          className="group relative hidden lg:block w-full h-screen max-h-screen sticky top-0 self-start bg-slate-950 overflow-hidden select-none"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
        >
        {/* LAYER 1 (BELAKANG): Banner / Flyer / Konten Medsos dari Super Admin */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          {mediaSlides.length > 0 ? (
            <div className="relative w-full h-full">
              {mediaSlides.map((slide, idx) => {
                const isSlideActive = idx === safeSlideIndex;
                const isLoaded = Boolean(loadedSlideIds[slide.id]);
                const isFailed = Boolean(failedSlideIds[slide.id]);

                return (
                  <div
                    key={slide.id}
                    aria-hidden={!isSlideActive}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                      isSlideActive
                        ? "opacity-100 z-10"
                        : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    {/* Shimmer halus saat gambar slide sedang diunduh/decode */}
                    {!isLoaded && !isFailed && (
                      <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:44px_44px]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-sky-500/10 to-slate-950 animate-pulse" />
                      </div>
                    )}

                    {isFailed ? (
                      /* Fallback elegan jika gambar gagal dimuat */
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:44px_44px]" />
                        <div className="relative z-10 space-y-2 max-w-sm">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">
                            Altcycles ERP
                          </span>
                          <h3 className="text-base font-bold text-white">{slide.title}</h3>
                        </div>
                      </div>
                    ) : slide.category === "banner" ? (
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={idx === 0 ? "high" : "auto"}
                        onLoad={() => markSlideLoaded(slide.id)}
                        onError={() => markSlideFailed(slide.id)}
                        className={`w-full h-full object-cover transition-opacity duration-500 ${
                          isLoaded ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center p-10 bg-slate-950">
                        <img
                          src={slide.image_url}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-35"
                        />
                        <img
                          src={slide.image_url}
                          alt={slide.title}
                          loading={idx === 0 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={idx === 0 ? "high" : "auto"}
                          onLoad={() => markSlideLoaded(slide.id)}
                          onError={() => markSlideFailed(slide.id)}
                          className={`relative z-10 max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/15 transition-opacity duration-500 ${
                            isLoaded ? "opacity-100" : "opacity-0"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : mediaLoading ? (
            /* Shimmer halus saat kunjungan awal (sebelum cache tersedia) */
            <div className="w-full h-full relative overflow-hidden bg-slate-950">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:44px_44px]" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-sky-400/10 to-slate-950 animate-pulse" />
            </div>
          ) : bannerSrc ? (
            <img
              src={bannerSrc}
              alt="Banner Informasi Altvira"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Visual Canvas Bersih untuk Slot Banner CMS */
            <div className="w-full h-full relative overflow-hidden bg-slate-950">
              {/* Struktur Grid Halus untuk penempatan banner informasi */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:44px_44px]" />
            </div>
          )}
        </div>

        {/* LAYER 2 (Highlight Gradien Altvira Lembut) */}
        <div
          className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-primary via-sky-400 to-primary opacity-15"
          aria-hidden="true"
        />

        {/* Overlay Informasi Judul, Tautan, & Kontrol Carousel jika Media Aktif */}
        {currentMedia ? (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-48 z-15 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-x-6 bottom-6 z-20">
              <div className="rounded-2xl bg-slate-950/65 backdrop-blur-md border border-white/15 px-5 py-4 flex items-center justify-between gap-4 shadow-2xl">
                <div className="min-w-0 flex flex-col items-start gap-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 leading-none">
                    <span className="size-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span>{displayCategoryLabels[currentMedia.category]}</span>
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug text-left">
                    {currentMedia.title}
                  </h3>
                  {currentMedia.subtitle ? (
                    <p className="text-xs text-white/80 line-clamp-2 max-w-md leading-relaxed text-left">
                      {currentMedia.subtitle}
                    </p>
                  ) : null}
                </div>

                {currentMedia.link_url ? (
                  <a
                    href={currentMedia.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 px-4 text-xs sm:text-sm font-semibold transition-colors shrink-0"
                  >
                    <span>{t("common:action.view", "Selengkapnya")}</span>
                    <ExternalLinkIcon className="size-3.5 shrink-0" />
                  </a>
                ) : null}
              </div>
            </div>

            {mediaSlides.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlideIndex(
                      (prev) =>
                        (prev - 1 + mediaSlides.length) % mediaSlides.length,
                    )
                  }
                  aria-label={t("common:table.previous_page", "Banner sebelumnya")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 size-9 rounded-xl bg-black/35 hover:bg-black/55 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlideIndex(
                      (prev) => (prev + 1) % mediaSlides.length,
                    )
                  }
                  aria-label={t("common:table.next_page", "Banner berikutnya")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 size-9 rounded-xl bg-black/35 hover:bg-black/55 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
                <div className="absolute top-6 left-8 z-20 flex items-center gap-1.5">
                  {mediaSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      aria-label={`${t("common:action.view", "Slide")} ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === safeSlideIndex
                          ? "w-6 bg-white"
                          : "w-2 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {/* =====================================================================
          KOLOM KANAN: Form Masuk / Buat Akun (Gaya Splitz Bersih & Minimalis)
          ===================================================================== */}
      <div className="relative flex flex-col justify-center items-center px-4 sm:px-6 py-6 lg:p-12 min-h-dvh lg:min-h-screen overflow-hidden">
        {/* Background Architectural Grid Pattern dari Halaman Lupa Kata Sandi */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Ambient Glow Orbs */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="w-full max-w-[420px] relative z-10 space-y-4 sm:space-y-6">
          {/* Baris Kontrol Header Khusus Mobile & Tablet (<1024px) */}
          <div className="w-full flex items-center justify-end -mt-3 sm:-mt-4 mb-2 lg:hidden">
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xs">
              <LanguageToggle
                size="sm"
                className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none p-2"
              />
              <div className="w-px h-4 bg-border/60" aria-hidden="true" />
              <ThemeToggle
                variant="inline"
                size="sm"
                className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none p-2"
              />
            </div>
          </div>

          {/* Mode Pratinjau Alert (Bila belum terkoneksi cloud) */}
          {isDemoMode && (
            <Alert
              variant="info"
              className="border-sky-500/30 bg-sky-500/10 text-foreground py-2 sm:py-3 rounded-[10px]"
            >
              <ShieldCheckIcon className="text-primary dark:text-sky-400 size-4" />
              <AlertTitle className="text-primary dark:text-sky-400 font-bold text-xs sm:text-sm">
                {t("auth.demo_mode_title", "Mode Pratinjau Lokal Aktif")}
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                {t("auth.demo_mode_desc", "Pilih akun contoh untuk menguji masing-masing portal peran:")}
                <div className="mt-1.5 sm:mt-2.5 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[11px] sm:text-xs bg-card text-foreground border-border hover:bg-muted rounded-md"
                    onClick={() => fillDemoAccount("superadmin@altvira.id")}
                  >
                    Super Admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[11px] sm:text-xs bg-card text-foreground border-border hover:bg-muted rounded-md"
                    onClick={() => fillDemoAccount("admin@altvira.id")}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[11px] sm:text-xs bg-card text-foreground border-border hover:bg-muted rounded-md"
                    onClick={() => fillDemoAccount("user@altvira.id")}
                  >
                    User
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Card (Tata letak & gaya bersih ala Dicoding, disesuaikan untuk Altcycles) */}
          <Card className="border border-border/80 shadow-xl dark:shadow-2xl dark:shadow-black/50 rounded-2xl bg-card overflow-hidden transition-colors">
            <CardContent className="p-6 sm:p-7 space-y-4">
              {/* Overline, Title & Subtitle (Gaya Dicoding) */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  {t("auth.login_overline", "ALTVIRA FINANCIAL ERP")}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {mode === "signin"
                    ? t("auth.signin_title", "Masuk ke Altcycles")
                    : t("auth.signup_title", "Daftar Akun Altcycles")}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                  {mode === "signin"
                    ? t("auth.signin_subtitle", "Lanjutkan kelola keuangan dan operasional proyek Anda.")
                    : t("auth.signup_subtitle", "Daftarkan akun internal Altvira untuk mengakses portal kerja.")}
                </p>
              </div>

              {/* Tombol Masuk dengan Google (Posisi di Atas Form Ala Dicoding) */}
              <Button
                type="button"
                variant="outline"
                disabled={submitting || googleSubmitting}
                onClick={handleGoogleSignIn}
                className="w-full h-11 text-sm font-semibold rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-3"
              >
                {googleSubmitting ? (
                  <Spinner className="size-4" />
                ) : (
                  <GoogleIcon className="size-4.5 shrink-0" />
                )}
                <span>
                  {mode === "signin"
                    ? t("auth.signin_google", "Masuk dengan Google")
                    : t("auth.signup_google", "Daftar dengan Google")}
                </span>
              </Button>

              {/* Pembatas "atau" */}
              <div className="relative my-0.5">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-border/60" />
                </div>
                <div className="relative flex justify-center text-xs lowercase">
                  <span className="bg-card px-3 text-muted-foreground">
                    {t("auth.or", "atau")}
                  </span>
                </div>
              </div>

              {/* Form Body */}
              <form
                id="auth-form"
                onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
                className="space-y-3.5 pt-1.5"
              >
                <FieldGroup className="gap-3.5">
                  {/* Field Nama Lengkap (Khusus Mode Daftar Akun) */}
                  {mode === "signup" && (
                    <Field data-invalid={Boolean(error)} className="space-y-1.5">
                      <FieldLabel
                        htmlFor="auth-fullname"
                        required
                        className="text-xs font-semibold text-foreground"
                      >
                        {t("auth.full_name", "Nama Lengkap")}
                      </FieldLabel>
                      <Input
                        id="auth-fullname"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder={t("auth.full_name_placeholder", "Nama lengkap Anda")}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                      />
                    </Field>
                  )}

                  {/* Field Identitas (Email atau Username) */}
                  <Field data-invalid={Boolean(error)} className="space-y-1.5">
                    <FieldLabel
                      htmlFor="auth-username"
                      className="text-xs font-semibold text-foreground"
                    >
                      {t("auth.identity_label", "Email atau Username")}
                    </FieldLabel>
                    <Input
                      id="auth-username"
                      type="text"
                      autoComplete="username"
                      required
                      placeholder={
                        mode === "signin"
                          ? t("auth.identity_placeholder", "Masukkan email aktif atau username Anda")
                          : t("auth.username_placeholder_signup", "contoh: izzul atau nama@altvira.id")
                      }
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "auth-error" : undefined}
                    />
                  </Field>

                  {/* Field Kata Sandi / Password */}
                  <Field data-invalid={Boolean(error)} className="space-y-1.5">
                    <FieldLabel
                      htmlFor="auth-password"
                      className="text-xs font-semibold text-foreground"
                    >
                      {t("auth.password", "Kata Sandi")}
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={
                          mode === "signin"
                            ? "current-password"
                            : "new-password"
                        }
                        required
                        placeholder={t("auth.password_placeholder_dicoding", "Masukkan password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                        onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                        className="pr-11 h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "auth-error" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        aria-label={
                          showPassword
                            ? t("auth.hide_password", "Sembunyikan kata sandi")
                            : t("auth.show_password", "Tampilkan kata sandi")
                        }
                      >
                        {showPassword ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </button>
                    </div>

                    {/* Peringatan Caps Lock */}
                    {capsLockOn && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mt-1.5">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>{t("auth.caps_lock_warning", "Caps Lock aktif")}</span>
                      </p>
                    )}

                    {/* Baris Ingat Saya & Lupa Password (Ala Dicoding) */}
                    {mode === "signin" && (
                      <div className="flex items-center justify-between pt-0.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <Checkbox
                            checked={rememberMe}
                            onCheckedChange={(val) => setRememberMe(Boolean(val))}
                            className="size-4 rounded-[3.5px]"
                          />
                          <span className="text-xs text-muted-foreground">
                            {t("auth.remember_me", "Ingat saya")}
                          </span>
                        </label>
                        <Link
                          to="/lupa-kata-sandi"
                          className="text-xs font-semibold text-primary dark:text-[#60A5FA] hover:underline transition-colors"
                        >
                          {t("auth.forgot_password", "Lupa password?")}
                        </Link>
                      </div>
                    )}

                    {/* Indikator & Ketentuan Kata Sandi (Khusus Signup) */}
                    {(mode === "signup" || password.length > 0) && (
                      <div className="space-y-2 pt-1 transition-all">
                        {/* Progress Bar Kekuatan Sandi */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-medium">
                              {t("auth.password_strength", "Kekuatan Kata Sandi:")}
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
                                ? t("auth.strength_strong", "Kuat")
                                : pwdScore >= 3
                                  ? t("auth.strength_medium", "Sedang")
                                  : t("auth.strength_weak", "Lemah")}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
                          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                              <ShieldCheckIcon className="size-3.5 text-primary" />
                              <span>{t("auth.password_criteria", "Ketentuan Kata Sandi:")}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.minLength
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {pwdCriteria.minLength ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>{t("auth.criteria_min_length", "Minimal 8 karakter")}</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.hasUpper
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {pwdCriteria.hasUpper ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>{t("auth.criteria_upper", "Huruf kapital (A-Z)")}</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.hasLower
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {pwdCriteria.hasLower ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>{t("auth.criteria_lower", "Huruf kecil (a-z)")}</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 transition-colors ${
                                  pwdCriteria.hasNumber
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {pwdCriteria.hasNumber ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>{t("auth.criteria_number", "Angka (0-9)")}</span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 sm:col-span-2 transition-colors ${
                                  pwdCriteria.hasSymbol
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {pwdCriteria.hasSymbol ? (
                                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                                )}
                                <span>{t("auth.criteria_symbol", "Simbol khusus (!@#$%^&* dll)")}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Field>

                  {/* Field Konfirmasi Kata Sandi (Khusus Mode Buat Akun) */}
                  {mode === "signup" && (
                    <Field data-invalid={Boolean(error)} className="space-y-1.5">
                      <FieldLabel
                        htmlFor="auth-confirm-password"
                        required
                        className="text-xs font-semibold text-foreground"
                      >
                        {t("auth.confirm_password", "Konfirmasi Kata Sandi")}
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="auth-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          placeholder={t("auth.confirm_password_placeholder", "Ulangi kata sandi")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-11 h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? "auth-error" : undefined}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                          aria-label={
                            showConfirmPassword
                              ? t("auth.hide_password", "Sembunyikan konfirmasi kata sandi")
                              : t("auth.show_password", "Tampilkan konfirmasi kata sandi")
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
                    <FieldDescription
                      id="auth-error"
                      role="alert"
                      className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-xl border border-destructive/20"
                    >
                      {error}
                    </FieldDescription>
                  )}

                  {/* Submit Button (Solid Primary Blue ala Dicoding) */}
                  <Button
                    type="submit"
                    disabled={submitting || googleSubmitting}
                    className="w-full h-11 text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-[0.99] mt-0.5"
                  >
                    {submitting ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <span>
                        {mode === "signin"
                          ? t("auth.signin_button", "Masuk")
                          : t("auth.signup_button", "Daftar")}
                      </span>
                    )}
                  </Button>
                </FieldGroup>
              </form>

              {/* Footer Links: Alih Mode Akun & Akses Pembeli Proyek */}
              <div className="space-y-1.5 text-left text-xs text-muted-foreground pt-1">
                <p>
                  {mode === "signin" ? (
                    <span>
                      {t("auth.no_account", "Belum punya akun?")}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setError(null);
                        }}
                        className="font-semibold text-primary dark:text-[#60A5FA] hover:underline transition-colors"
                      >
                        {t("auth.signup_action", "Daftar")}
                      </button>
                    </span>
                  ) : (
                    <span>
                      {t("auth.has_account", "Sudah punya akun?")}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signin");
                          setError(null);
                        }}
                        className="font-semibold text-primary dark:text-[#60A5FA] hover:underline transition-colors"
                      >
                        {t("auth.signin_action", "Masuk")}
                      </button>
                    </span>
                  )}
                </p>

                <p>
                  <span>{t("auth.buyer_portal_text", "Pembeli proyek?")}{" "}</span>
                  <Link
                    to="/portal-pembeli"
                    className="font-semibold text-primary dark:text-[#60A5FA] hover:underline transition-colors"
                  >
                    {t("auth.buyer_portal_action", "Lacak dengan nomor PO")}
                  </Link>
                </p>
              </div>

              {/* Legal Disclaimer ala Dicoding (Disesuaikan Konteks Altcycles) */}
              <p className="text-[11px] text-muted-foreground/75 leading-relaxed text-center pt-3.5 border-t border-border/40">
                {t(
                  "auth.legal_notice",
                  "Dengan masuk, Anda menyetujui Syarat dan Ketentuan serta Kebijakan Privasi Altvira Technology. Akses portal dilindungi sistem keamanan internal.",
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
