import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import {
  getCachedActiveLoginMedia,
  listActiveLoginMedia,
} from "@/lib/data-service";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/i18n";
import type { LoginMediaItemRow } from "@/types/database.types";
import { evaluatePassword, type AuthMode } from "../components/login-types";

export function useLoginPageState() {
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

  // Media Banner / Flyer / Konten Medsos sisi kiri
  const [mediaSlides, setMediaSlides] = React.useState<LoginMediaItemRow[]>(() =>
    getCachedActiveLoginMedia(),
  );
  const [mediaLoading, setMediaLoading] = React.useState(
    () => getCachedActiveLoginMedia().length === 0,
  );
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [isBannerHovered, setIsBannerHovered] = React.useState(false);

  // Status pemuatan & fallback per slide
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

  React.useEffect(() => {
    if (typeof window === "undefined" || mediaSlides.length === 0) return;
    const currentSlide = mediaSlides[safeSlideIndex];
    if (currentSlide && !loadedSlideIds[currentSlide.id] && !failedSlideIds[currentSlide.id]) {
      const img = new Image();
      img.onload = () => markSlideLoaded(currentSlide.id);
      img.onerror = () => markSlideFailed(currentSlide.id);
      img.src = currentSlide.image_url;
    }
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
    }, 5500);
    return () => window.clearInterval(timer);
  }, [effectiveSlideCount, isBannerHovered]);

  const currentMedia = mediaSlides[safeSlideIndex] ?? null;

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

  // Deteksi dan tangani redirect Google OAuth
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

  return {
    t,
    profile,
    profileRef,
    isDemoMode,
    resolvedTheme,
    navigate,
    mode,
    setMode,
    username,
    setUsername,
    fullName,
    setFullName,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    capsLockOn,
    setCapsLockOn,
    rememberMe,
    setRememberMe,
    submitting,
    googleSubmitting,
    error,
    setError,
    oauthChecking,
    setOauthChecking,
    mediaSlides,
    mediaLoading,
    safeSlideIndex,
    setActiveSlideIndex,
    isBannerHovered,
    setIsBannerHovered,
    currentMedia,
    loadedSlideIds,
    failedSlideIds,
    markSlideLoaded,
    markSlideFailed,
    pwdCriteria,
    pwdScore,
    handleGoogleSignIn,
    handleSignIn,
    handleSignUp,
    fillDemoAccount,
  };
}
