import * as React from "react";
import { useReducedMotion } from "motion/react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { useOptionalTheme } from "@/lib/theme-context";

export interface OAuthLoadingCardProps {
  resolvedTheme?: "dark" | "light";
  userName?: string;
  isProfileReady?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

/**
 * Total waktu showcase sebelum boleh masuk ke Tahap 6 (fade-out ke dasbor):
 * Tahap 1 (400ms) + Tahap 2 (600ms) + Tahap 4 (300ms) + Tahap 5 diam di tengah (400ms) = 1700ms.
 * Samakan nilai ini bila mengubah variabel --oauth-d1 s/d --oauth-d5 di index.css.
 */
const TIMING = {
  MIN_SEQUENCE_MS: 1700, // 0–1700ms: Total durasi tahap 1–5 sebelum fade-out (jika auth sudah siap)
  EXIT_FADE_MS: 350, // Tahap 6 (300–400ms): Fade-out seluruh layar ke dasbor
  SLOW_FALLBACK_MS: 8000, // 8000ms: Munculkan tombol "Batalkan" bila proses masih belum selesai
  REDUCED_HOLD_MS: 900, // Durasi tahan sederhana saat prefers-reduced-motion aktif
} as const;

function GoogleLogo({
  className = "size-14 sm:size-[68px]",
}: {
  className?: string;
}) {
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

export function OAuthLoadingCard({
  resolvedTheme,
  userName: _userName,
  isProfileReady = false,
  onComplete,
  onCancel,
}: OAuthLoadingCardProps) {
  const themeCtx = useOptionalTheme();
  const effectiveTheme = resolvedTheme ?? themeCtx?.resolvedTheme ?? "light";
  const isDark = effectiveTheme === "dark";
  const prefersReducedMotion = Boolean(useReducedMotion());

  const [minTimelineDone, setMinTimelineDone] = React.useState(false);
  const [googleRemoved, setGoogleRemoved] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);
  const [showSlowCancel, setShowSlowCancel] = React.useState(false);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onCancelRef = React.useRef(onCancel);
  onCancelRef.current = onCancel;

  // Timer sinkronisasi timeline utama (Tahap 1–5) tanpa mematahkan animasi CSS
  React.useEffect(() => {
    const holdDuration = prefersReducedMotion
      ? TIMING.REDUCED_HOLD_MS
      : TIMING.MIN_SEQUENCE_MS;

    const doneTimer = window.setTimeout(() => {
      setMinTimelineDone(true);
    }, holdDuration);

    return () => window.clearTimeout(doneTimer);
  }, [prefersReducedMotion]);

  // Tahap 6: Seluruh layar fade-out sekaligus setelah timeline selesai & autentikasi siap
  React.useEffect(() => {
    if (!minTimelineDone || !isProfileReady || isExiting) return;

    setIsExiting(true);
    const exitTimer = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, TIMING.EXIT_FADE_MS);

    return () => window.clearTimeout(exitTimer);
  }, [minTimelineDone, isProfileReady, isExiting]);

  // Fallback lambat > 8 detik: tampilkan tombol teks kecil "Batalkan"
  React.useEffect(() => {
    if (isProfileReady) return;
    const slowTimer = window.setTimeout(() => {
      setShowSlowCancel(true);
    }, TIMING.SLOW_FALLBACK_MS);

    return () => window.clearTimeout(slowTimer);
  }, [isProfileReady]);

  const handleSlowCancel = React.useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      onCancelRef.current?.();
    }, TIMING.EXIT_FADE_MS);
  }, [isExiting]);

  return (
    <div
      className={`oauth-transition-stage relative min-h-screen w-full flex flex-col items-center justify-center bg-[#F0F1F3] dark:bg-[#090E19] overflow-hidden select-none transition-colors duration-300 ${
        isExiting ? "oauth-screen-exit" : "oauth-screen-enter"
      }`}
      aria-busy={!isProfileReady}
      aria-label="Memproses masuk akun"
    >
      {/* Pengalih Tema Gelap / Terang */}
      <ThemeToggle variant="floating" />

      {/* Latar Glow Biru Halus + Grid Tipis */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[520px] sm:size-[680px] rounded-full blur-[120px] transition-opacity duration-500 ${
            isDark
              ? "bg-[radial-gradient(circle,rgba(11,67,200,0.26)_0%,rgba(31,177,242,0.11)_42%,transparent_72%)]"
              : "bg-[radial-gradient(circle,rgba(11,67,200,0.11)_0%,rgba(31,177,242,0.06)_45%,transparent_72%)]"
          }`}
        />

        <div
          className={`absolute inset-0 bg-[size:36px_36px] ${
            isDark
              ? "bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)]"
              : "bg-[linear-gradient(to_right,rgba(9,14,25,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(9,14,25,0.04)_1px,transparent_1px)]"
          }`}
        />
      </div>

      {/* Panggung Tengah: Hanya Logo Google & Logo Altvira */}
      {prefersReducedMotion ? (
        /* prefers-reduced-motion: Hanya logo Altvira di tengah dengan fade-in & fade-out */
        <div className="relative z-10 flex items-center justify-center">
          <div className="size-14 sm:size-[74px] flex items-center justify-center">
            <AltviraLogoMark
              size={74}
              iconVariant="transparent"
              variant={isDark ? "light" : "dark"}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-40 w-full max-w-lg items-center justify-center">
          {/* Tahap 1–2 (0–900ms): Garis cahaya biru tipis penghubung Google <-> Altvira */}
          <div
            aria-hidden="true"
            className={`oauth-beam-anim pointer-events-none absolute z-0 h-[1.5px] w-24 sm:w-[104px] rounded-full ${
              isDark
                ? "bg-gradient-to-r from-[#4285F4]/60 via-[#1FB1F2]/85 to-[#0B43C8]/75"
                : "bg-gradient-to-r from-[#4285F4]/55 via-[#1FB1F2]/75 to-[#0B43C8]/65"
            }`}
          />

          {/* Logo Google (z-10): muncul di -90px, lalu pada 600–1000ms terdorong -60px, mengecil, blur & fade-out, lalu dihapus dari DOM */}
          {!googleRemoved && (
            <div
              className="oauth-google-track pointer-events-none absolute z-10 flex items-center justify-center"
              onAnimationEnd={(e) => {
                if (e.animationName === "oauth-google-push-away") {
                  setGoogleRemoved(true);
                }
              }}
            >
              <div className="oauth-logo-enter flex items-center justify-center">
                <GoogleLogo className="size-14 sm:size-[68px]" />
              </div>
            </div>
          )}

          {/* Logo Altvira (z-20 selalu di atas): +90px -> 0px kontinu (400–1000ms), overshoot 1.08 -> 1.0 (1000–1300ms), diam/loop glow di tengah */}
          <div className="oauth-altvira-track relative z-20 flex items-center justify-center">
            <div className="oauth-logo-enter relative flex items-center justify-center">
              {/* Tahap 4 (1000–1300ms): Satu denyut glow biru lembut di belakang Altvira */}
              <div
                aria-hidden="true"
                className={`oauth-altvira-glow-once pointer-events-none absolute z-0 size-28 sm:size-36 rounded-full blur-xl ${
                  isDark
                    ? "bg-[radial-gradient(circle,rgba(31,177,242,0.58)_0%,rgba(11,67,200,0.32)_48%,transparent_75%)]"
                    : "bg-[radial-gradient(circle,rgba(31,177,242,0.42)_0%,rgba(11,67,200,0.2)_48%,transparent_75%)]"
                }`}
              />

              {/* Tahap 5 (1300ms+): Denyut glow halus berulang di belakang jika autentikasi belum selesai */}
              {!isProfileReady && (
                <div
                  aria-hidden="true"
                  className={`oauth-altvira-glow-wait pointer-events-none absolute z-0 size-28 sm:size-36 rounded-full blur-xl ${
                    isDark
                      ? "bg-[radial-gradient(circle,rgba(31,177,242,0.5)_0%,rgba(11,67,200,0.26)_48%,transparent_75%)]"
                      : "bg-[radial-gradient(circle,rgba(31,177,242,0.36)_0%,rgba(11,67,200,0.16)_48%,transparent_75%)]"
                  }`}
                />
              )}

              {/* Ikon Altvira berada di atas lapisan glow agar tetap tajam pada tema terang & gelap */}
              <div className="oauth-altvira-settle relative z-10 size-14 sm:size-[74px] flex items-center justify-center">
                <AltviraLogoMark
                  size={74}
                  iconVariant="transparent"
                  variant={isDark ? "light" : "dark"}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tombol Teks Kecil "Batalkan" di Bawah Layar (Hanya Muncul Setelah > 8 Detik) */}
      {showSlowCancel && onCancel && !isExiting && (
        <button
          type="button"
          onClick={handleSlowCancel}
          className={`oauth-slow-cancel fixed bottom-8 z-20 cursor-pointer text-xs font-medium tracking-wide transition-colors focus:outline-none ${
            isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Batalkan
        </button>
      )}
    </div>
  );
}
