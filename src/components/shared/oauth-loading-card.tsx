import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
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

type AnimationStage =
  | "enter"
  | "merge"
  | "burst"
  | "settle"
  | "waiting"
  | "exit";

/**
 * Kurva easing halus sesuai spesifikasi teknis (cubic-bezier(0.22, 1, 0.36, 1)).
 */
const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.42, 0, 0.58, 1];

/**
 * Konfigurasi durasi tiap tahap animasi (dalam milidetik) agar mudah disesuaikan.
 */
const TIMING = {
  STAGE_1_ENTER_MS: 400, // 0–400ms: Latar fade-in, logo Google & Altvira masuk (scale 0.8 -> 1)
  STAGE_2_MERGE_MS: 700, // 400–1100ms: Kedua logo bergerak pelan ke titik tengah + jejak cahaya biru
  STAGE_3_BURST_MS: 300, // 1100–1400ms: Saat bertemu, glow burst biru & logo Google memudar ke dalam Altvira
  STAGE_4_SETTLE_MS: 400, // 1400–1800ms: Logo Altvira membesar (scale 1.15) dengan denyut glow lalu stabil
  STAGE_5_EXIT_MS: 400, // 1800–2200ms: Seluruh layar fade-out halus sebelum mengarah ke dasbor
  SLOW_FALLBACK_MS: 8000, // 8000ms: Tampilkan tombol teks kecil "Batalkan" jika pemuatan masih berlangsung
  REDUCED_ENTER_MS: 300, // Fade-in sederhana saat prefers-reduced-motion aktif
  REDUCED_HOLD_MS: 900, // Tahan sebentar sebelum fade-out pada mode reduced-motion
} as const;

function GoogleLogo({ className = "size-14 sm:size-[68px]" }: { className?: string }) {
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

  const [stage, setStage] = React.useState<AnimationStage>("enter");
  const [minTimelineDone, setMinTimelineDone] = React.useState(false);
  const [showSlowCancel, setShowSlowCancel] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Jarak awal responsif dari titik tengah layar: 72px di mobile, 140px (120–160px) di desktop
  const [mergeOffset, setMergeOffset] = React.useState<number>(() => {
    if (typeof window === "undefined") return 140;
    return window.innerWidth < 640 ? 72 : 140;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const updateOffset = () => setMergeOffset(mq.matches ? 140 : 72);
    updateOffset();
    mq.addEventListener("change", updateOffset);
    return () => mq.removeEventListener("change", updateOffset);
  }, []);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onCancelRef = React.useRef(onCancel);
  onCancelRef.current = onCancel;

  // Rangkaian timeline berurutan (Tahap 1 -> Tahap 2 -> Tahap 3 -> Tahap 4)
  React.useEffect(() => {
    if (prefersReducedMotion) {
      const reducedTimer = window.setTimeout(() => {
        setMinTimelineDone(true);
      }, TIMING.REDUCED_HOLD_MS);
      return () => window.clearTimeout(reducedTimer);
    }

    const tStage2Start = TIMING.STAGE_1_ENTER_MS;
    const tStage3Start = tStage2Start + TIMING.STAGE_2_MERGE_MS;
    const tStage4Start = tStage3Start + TIMING.STAGE_3_BURST_MS;
    const tStage4End = tStage4Start + TIMING.STAGE_4_SETTLE_MS;

    const t2 = window.setTimeout(() => setStage("merge"), tStage2Start);
    const t3 = window.setTimeout(() => setStage("burst"), tStage3Start);
    const t4 = window.setTimeout(() => setStage("settle"), tStage4Start);
    const tDone = window.setTimeout(() => setMinTimelineDone(true), tStage4End);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(tDone);
    };
  }, [prefersReducedMotion]);

  // Tahap 4 -> Loop Waiting atau langsung Tahap 5 (Exit) tergantung kesiapan autentikasi
  React.useEffect(() => {
    if (!minTimelineDone || isCancelling) return;

    if (!isProfileReady) {
      if (!prefersReducedMotion) {
        setStage("waiting");
      }
      return;
    }

    setStage("exit");
    const exitTimer = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, TIMING.STAGE_5_EXIT_MS);

    return () => window.clearTimeout(exitTimer);
  }, [minTimelineDone, isProfileReady, isCancelling, prefersReducedMotion]);

  // Fallback lambat: tampilkan tombol "Batalkan" hanya jika proses > 8 detik
  React.useEffect(() => {
    if (isProfileReady) return;
    const slowTimer = window.setTimeout(() => {
      setShowSlowCancel(true);
    }, TIMING.SLOW_FALLBACK_MS);

    return () => window.clearTimeout(slowTimer);
  }, [isProfileReady]);

  const handleSlowCancel = React.useCallback(() => {
    if (isCancelling) return;
    setIsCancelling(true);
    setStage("exit");
    window.setTimeout(() => {
      onCancelRef.current?.();
    }, 300);
  }, [isCancelling]);

  const isExiting = stage === "exit" || isCancelling;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{
        duration: isExiting
          ? TIMING.STAGE_5_EXIT_MS / 1000
          : (prefersReducedMotion
              ? TIMING.REDUCED_ENTER_MS
              : TIMING.STAGE_1_ENTER_MS) / 1000,
        ease: EASE_OUT_EXPO,
      }}
      className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#F0F1F3] dark:bg-[#090E19] overflow-hidden select-none transition-colors duration-300"
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
        {/* Radial Glow Tengah */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[520px] sm:size-[680px] rounded-full blur-[120px] transition-opacity duration-500 ${
            isDark
              ? "bg-[radial-gradient(circle,rgba(11,67,200,0.28)_0%,rgba(31,177,242,0.12)_42%,transparent_72%)]"
              : "bg-[radial-gradient(circle,rgba(11,67,200,0.14)_0%,rgba(31,177,242,0.08)_45%,transparent_72%)]"
          }`}
        />

        {/* Grid Latar Tipis */}
        <div
          className={`absolute inset-0 bg-[size:36px_36px] ${
            isDark
              ? "bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)]"
              : "bg-[linear-gradient(to_right,rgba(9,14,25,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(9,14,25,0.04)_1px,transparent_1px)]"
          }`}
        />
      </div>

      {/* Area Tengah: Hanya Logo Google & Logo Altvira */}
      {prefersReducedMotion ? (
        /* Mode prefers-reduced-motion: Hanya logo Altvira fade-in & fade-out sederhana */
        <div className="relative z-10 flex items-center justify-center">
          <div className="size-16 sm:size-[76px] flex items-center justify-center">
            <AltviraLogoMark
              size={76}
              iconVariant="transparent"
              variant={isDark ? "light" : "dark"}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-40 w-full max-w-lg items-center justify-center">
          {/* Tahap 3 & 4: Radial Burst / Loop Denyut Glow di Tengah (GPU transform + opacity saja) */}
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.45, opacity: 0 }}
            animate={
              stage === "enter" || stage === "merge"
                ? { scale: 0.45, opacity: 0 }
                : stage === "burst"
                  ? {
                      scale: [0.5, 1.85],
                      opacity: [0, 0.92, 0.25],
                    }
                  : stage === "settle"
                    ? {
                        scale: [1.05, 1.45, 1],
                        opacity: [0.3, 0.8, 0.22],
                      }
                    : stage === "waiting"
                      ? {
                          scale: [0.95, 1.28, 0.95],
                          opacity: [0.22, 0.65, 0.22],
                        }
                      : { scale: 0.95, opacity: 0 }
            }
            transition={
              stage === "burst"
                ? { duration: TIMING.STAGE_3_BURST_MS / 1000, ease: EASE_OUT_EXPO }
                : stage === "settle"
                  ? { duration: TIMING.STAGE_4_SETTLE_MS / 1000, ease: EASE_OUT_EXPO }
                  : stage === "waiting"
                    ? { duration: 1.8, repeat: Infinity, ease: EASE_IN_OUT }
                    : { duration: 0.35, ease: EASE_OUT_EXPO }
            }
            className={`pointer-events-none absolute size-36 sm:size-44 rounded-full blur-2xl ${
              isDark
                ? "bg-[radial-gradient(circle,rgba(31,177,242,0.72)_0%,rgba(11,67,200,0.45)_45%,transparent_75%)]"
                : "bg-[radial-gradient(circle,rgba(11,67,200,0.45)_0%,rgba(31,177,242,0.32)_45%,transparent_75%)]"
            }`}
          />

          {/* Tahap 1, 2, 3: Logo Google (Sisi Kiri -> Tengah -> Memudar ke Altvira) */}
          <motion.div
            initial={{ x: -mergeOffset, scale: 0.8, opacity: 0 }}
            animate={
              stage === "enter"
                ? { x: -mergeOffset, scale: 1, opacity: 1 }
                : stage === "merge"
                  ? { x: 0, scale: 1, opacity: 1 }
                  : { x: 0, scale: 0.25, opacity: 0 }
            }
            transition={
              stage === "enter"
                ? { duration: TIMING.STAGE_1_ENTER_MS / 1000, ease: EASE_OUT_EXPO }
                : stage === "merge"
                  ? { duration: TIMING.STAGE_2_MERGE_MS / 1000, ease: EASE_OUT_EXPO }
                  : { duration: TIMING.STAGE_3_BURST_MS / 1000, ease: EASE_OUT_EXPO }
            }
            className="absolute flex items-center justify-center"
          >
            {/* Jejak Cahaya Biru Tipis di Belakang Google (hanya transform + opacity) */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={
                stage === "merge"
                  ? { opacity: [0, 0.85, 0], scaleX: [0.35, 1.05, 0.2] }
                  : { opacity: 0, scaleX: 0.2 }
              }
              transition={{
                duration: TIMING.STAGE_2_MERGE_MS / 1000,
                times: [0, 0.45, 1],
                ease: EASE_OUT_EXPO,
              }}
              className={`pointer-events-none absolute right-1/2 mr-4 sm:mr-5 h-3 w-20 sm:w-28 origin-right rounded-full blur-[5px] ${
                isDark
                  ? "bg-gradient-to-l from-[#1FB1F2]/80 via-[#0B43C8]/40 to-transparent"
                  : "bg-gradient-to-l from-[#0B43C8]/65 via-[#1FB1F2]/35 to-transparent"
              }`}
            />
            <GoogleLogo className="relative z-10 size-14 sm:size-[68px]" />
          </motion.div>

          {/* Tahap 1–4: Logo Altvira (Sisi Kanan -> Tengah -> Scale 1.15 -> Stabil / Loop Glow) */}
          <motion.div
            initial={{ x: mergeOffset, scale: 0.8, opacity: 0 }}
            animate={
              stage === "enter"
                ? { x: mergeOffset, scale: 1, opacity: 1 }
                : stage === "merge" || stage === "burst"
                  ? { x: 0, scale: 1, opacity: 1 }
                  : stage === "settle"
                    ? { x: 0, scale: [1, 1.15, 1], opacity: 1 }
                    : stage === "waiting"
                      ? { x: 0, scale: [1, 1.04, 1], opacity: 1 }
                      : { x: 0, scale: 1, opacity: 1 }
            }
            transition={
              stage === "enter"
                ? { duration: TIMING.STAGE_1_ENTER_MS / 1000, ease: EASE_OUT_EXPO }
                : stage === "merge"
                  ? { duration: TIMING.STAGE_2_MERGE_MS / 1000, ease: EASE_OUT_EXPO }
                  : stage === "settle"
                    ? {
                        duration: TIMING.STAGE_4_SETTLE_MS / 1000,
                        times: [0, 0.45, 1],
                        ease: EASE_OUT_EXPO,
                      }
                    : stage === "waiting"
                      ? { duration: 1.8, repeat: Infinity, ease: EASE_IN_OUT }
                      : { duration: TIMING.STAGE_3_BURST_MS / 1000, ease: EASE_OUT_EXPO }
            }
            className="relative z-20 flex items-center justify-center"
          >
            {/* Jejak Cahaya Biru Tipis di Belakang Altvira (hanya transform + opacity) */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={
                stage === "merge"
                  ? { opacity: [0, 0.85, 0], scaleX: [0.35, 1.05, 0.2] }
                  : { opacity: 0, scaleX: 0.2 }
              }
              transition={{
                duration: TIMING.STAGE_2_MERGE_MS / 1000,
                times: [0, 0.45, 1],
                ease: EASE_OUT_EXPO,
              }}
              className={`pointer-events-none absolute left-1/2 ml-4 sm:ml-5 h-3 w-20 sm:w-28 origin-left rounded-full blur-[5px] ${
                isDark
                  ? "bg-gradient-to-r from-[#1FB1F2]/80 via-[#0B43C8]/40 to-transparent"
                  : "bg-gradient-to-r from-[#0B43C8]/65 via-[#1FB1F2]/35 to-transparent"
              }`}
            />
            <div className="relative z-10 size-14 sm:size-[74px] flex items-center justify-center">
              <AltviraLogoMark
                size={74}
                iconVariant="transparent"
                variant={isDark ? "light" : "dark"}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Tombol Teks Kecil "Batalkan" di Bawah Layar (Hanya Muncul Setelah > 8 Detik) */}
      {showSlowCancel && onCancel && !isExiting && (
        <motion.button
          type="button"
          onClick={handleSlowCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className={`fixed bottom-8 z-20 cursor-pointer text-xs font-medium tracking-wide transition-colors focus:outline-none ${
            isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Batalkan
        </motion.button>
      )}
    </motion.div>
  );
}
