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
  | "approach"
  | "handoff"
  | "center"
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
  STAGE_1_ENTER_MS: 400, // 0–400ms: Logo Google (kiri) & Altvira (kanan) fade-in & scale 0.85 -> 1
  STAGE_2_APPROACH_MS: 600, // 400–1000ms: Bergerak mendekat dengan jarak bersih >= 24px + garis & titik cahaya
  STAGE_3_HANDOFF_MS: 400, // 1000–1400ms: Altvira denyut glow 1x; Google fade-out, scale 0.6, blur 6px ke kanan
  STAGE_4_CENTER_MS: 500, // 1400–1900ms: Google sudah hilang total; Altvira bergeser halus ke tengah & scale 1.1
  STAGE_5_EXIT_MS: 400, // 1900–2300ms: Layar fade-out halus sebelum masuk ke dasbor
  SLOW_FALLBACK_MS: 8000, // 8000ms: Munculkan tombol teks kecil "Batalkan" jika autentikasi lambat
  REDUCED_ENTER_MS: 300, // Fade-in sederhana saat prefers-reduced-motion aktif
  REDUCED_HOLD_MS: 900, // Durasi tahan minimum pada mode prefers-reduced-motion
} as const;

interface ResponsiveOffsets {
  startOffset: number; // Jarak awal dari titik tengah layar (Tahap 1)
  restOffset: number; // Jarak berhenti terpisah dengan celah >= 24px (Tahap 2)
  beamTravel: number; // Rentang gerak titik cahaya di celah tengah
}

function getResponsiveOffsets(isDesktop: boolean): ResponsiveOffsets {
  if (isDesktop) {
    return {
      startOffset: 140,
      restOffset: 60, // Diameter total celah antar tepi: (60*2) - 34 - 37 = 49px (>= 24px)
      beamTravel: 18,
    };
  }
  return {
    startOffset: 92,
    restOffset: 46, // Diameter total celah antar tepi: (46*2) - 28 - 28 = 36px (>= 24px)
    beamTravel: 13,
  };
}

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

  const [stage, setStage] = React.useState<AnimationStage>("enter");
  const [minTimelineDone, setMinTimelineDone] = React.useState(false);
  const [showSlowCancel, setShowSlowCancel] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const [offsets, setOffsets] = React.useState<ResponsiveOffsets>(() => {
    if (typeof window === "undefined") return getResponsiveOffsets(true);
    return getResponsiveOffsets(window.innerWidth >= 640);
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const updateOffsets = () => setOffsets(getResponsiveOffsets(mq.matches));
    updateOffsets();
    mq.addEventListener("change", updateOffsets);
    return () => mq.removeEventListener("change", updateOffsets);
  }, []);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onCancelRef = React.useRef(onCancel);
  onCancelRef.current = onCancel;

  // Rangkaian timeline berurutan: Tahap 1 -> Tahap 2 -> Tahap 3 -> Tahap 4
  React.useEffect(() => {
    if (prefersReducedMotion) {
      const reducedTimer = window.setTimeout(() => {
        setMinTimelineDone(true);
      }, TIMING.REDUCED_HOLD_MS);
      return () => window.clearTimeout(reducedTimer);
    }

    const tStage2Start = TIMING.STAGE_1_ENTER_MS; // 400ms
    const tStage3Start = tStage2Start + TIMING.STAGE_2_APPROACH_MS; // 1000ms
    const tStage4Start = tStage3Start + TIMING.STAGE_3_HANDOFF_MS; // 1400ms
    const tStage4End = tStage4Start + TIMING.STAGE_4_CENTER_MS; // 1900ms

    const t2 = window.setTimeout(() => setStage("approach"), tStage2Start);
    const t3 = window.setTimeout(() => setStage("handoff"), tStage3Start);
    const t4 = window.setTimeout(() => setStage("center"), tStage4Start);
    const tDone = window.setTimeout(() => setMinTimelineDone(true), tStage4End);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(tDone);
    };
  }, [prefersReducedMotion]);

  // Tahap 4 selesai -> loop denyut halus bila belum siap, atau Tahap 5 fade-out bila siap
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

  // Fallback lambat > 8 detik: tampilkan tombol teks kecil "Batalkan"
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
        /* Mode prefers-reduced-motion: Hanya logo Altvira fade-in & fade-out sederhana */
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
          {/* Tahap 2 (400–1000ms): Garis Cahaya Biru Tipis & Titik Cahaya Mengalir (Google -> Altvira) */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={
              stage === "approach"
                ? { opacity: [0, 0.9, 0.9, 0], scaleX: [0.1, 1, 1, 0.85] }
                : { opacity: 0, scaleX: 0 }
            }
            transition={{
              duration: TIMING.STAGE_2_APPROACH_MS / 1000,
              times: [0, 0.25, 0.85, 1],
              ease: EASE_OUT_EXPO,
            }}
            className="pointer-events-none absolute z-0 flex items-center justify-center w-9 sm:w-11"
          >
            {/* Garis cahaya biru tipis */}
            <div
              className={`h-[1.5px] w-full rounded-full ${
                isDark
                  ? "bg-gradient-to-r from-[#4285F4]/60 via-[#1FB1F2]/85 to-[#0B43C8]/75"
                  : "bg-gradient-to-r from-[#4285F4]/55 via-[#1FB1F2]/75 to-[#0B43C8]/65"
              }`}
            />

            {/* Satu titik cahaya mengalir dari tepi Google ke tepi Altvira */}
            <motion.span
              initial={{ x: -offsets.beamTravel, opacity: 0 }}
              animate={
                stage === "approach"
                  ? {
                      x: [-offsets.beamTravel, offsets.beamTravel],
                      opacity: [0, 1, 1, 0],
                    }
                  : { x: -offsets.beamTravel, opacity: 0 }
              }
              transition={{
                duration: TIMING.STAGE_2_APPROACH_MS / 1000,
                times: [0, 0.2, 0.85, 1],
                ease: EASE_OUT_EXPO,
              }}
              className="absolute size-2 rounded-full bg-[#1FB1F2] shadow-[0_0_10px_rgba(31,177,242,0.9)]"
            />
          </motion.div>

          {/* Logo Google (z-10, selalu di bawah z-20 Altvira; hilang total sebelum Tahap 4 dimulai) */}
          <motion.div
            initial={{
              x: -offsets.startOffset,
              scale: 0.85,
              opacity: 0,
              filter: "blur(0px)",
            }}
            animate={
              stage === "enter"
                ? {
                    x: -offsets.startOffset,
                    scale: 1,
                    opacity: 1,
                    filter: "blur(0px)",
                  }
                : stage === "approach"
                  ? {
                      x: -offsets.restOffset,
                      scale: 1,
                      opacity: 1,
                      filter: "blur(0px)",
                    }
                  : {
                      x: 0,
                      scale: 0.6,
                      opacity: 0,
                      filter: "blur(6px)",
                    }
            }
            transition={
              stage === "enter"
                ? { duration: TIMING.STAGE_1_ENTER_MS / 1000, ease: EASE_OUT_EXPO }
                : stage === "approach"
                  ? { duration: TIMING.STAGE_2_APPROACH_MS / 1000, ease: EASE_OUT_EXPO }
                  : {
                      // Selesai lebih cepat (350ms < 400ms) agar opacity sudah 0 sebelum Tahap 4 (1400ms)
                      duration: (TIMING.STAGE_3_HANDOFF_MS - 50) / 1000,
                      ease: EASE_OUT_EXPO,
                    }
            }
            className="pointer-events-none absolute z-10 flex items-center justify-center"
          >
            <GoogleLogo className="size-14 sm:size-[68px]" />
          </motion.div>

          {/* Logo Altvira (z-20 selalu di atas; berhenti terpisah pada Tahap 2-3 lalu bergerak ke x=0 pada Tahap 4) */}
          <motion.div
            initial={{ x: offsets.startOffset, scale: 0.85, opacity: 0 }}
            animate={
              stage === "enter"
                ? { x: offsets.startOffset, scale: 1, opacity: 1 }
                : stage === "approach" || stage === "handoff"
                  ? { x: offsets.restOffset, scale: 1, opacity: 1 }
                  : stage === "center"
                    ? { x: 0, scale: 1.1, opacity: 1 }
                    : stage === "waiting"
                      ? { x: 0, scale: [1.1, 1.14, 1.1], opacity: 1 }
                      : { x: 0, scale: 1.1, opacity: 1 }
            }
            transition={
              stage === "enter"
                ? { duration: TIMING.STAGE_1_ENTER_MS / 1000, ease: EASE_OUT_EXPO }
                : stage === "approach"
                  ? { duration: TIMING.STAGE_2_APPROACH_MS / 1000, ease: EASE_OUT_EXPO }
                  : stage === "handoff"
                    ? { duration: TIMING.STAGE_3_HANDOFF_MS / 1000, ease: EASE_OUT_EXPO }
                    : stage === "center"
                      ? { duration: TIMING.STAGE_4_CENTER_MS / 1000, ease: EASE_OUT_EXPO }
                      : stage === "waiting"
                        ? { duration: 1.6, repeat: Infinity, ease: EASE_IN_OUT }
                        : { duration: TIMING.STAGE_5_EXIT_MS / 1000, ease: EASE_OUT_EXPO }
            }
            className="relative z-20 flex items-center justify-center"
          >
            {/* Glow Ring di Belakang Logo Altvira (z-0, tidak mengaburkan huruf V di tema terang/gelap) */}
            <motion.div
              aria-hidden="true"
              initial={{ scale: 0.75, opacity: 0 }}
              animate={
                stage === "handoff"
                  ? {
                      scale: [0.85, 1.45, 0.95],
                      opacity: isDark ? [0, 0.75, 0] : [0, 0.4, 0],
                    }
                  : stage === "waiting"
                    ? {
                        scale: [0.95, 1.25, 0.95],
                        opacity: isDark ? [0.2, 0.55, 0.2] : [0.1, 0.3, 0.1],
                      }
                    : { scale: 0.85, opacity: 0 }
              }
              transition={
                stage === "handoff"
                  ? { duration: TIMING.STAGE_3_HANDOFF_MS / 1000, ease: EASE_OUT_EXPO }
                  : stage === "waiting"
                    ? { duration: 1.6, repeat: Infinity, ease: EASE_IN_OUT }
                    : { duration: 0.3, ease: EASE_OUT_EXPO }
              }
              className={`pointer-events-none absolute z-0 size-28 sm:size-36 rounded-full blur-xl ${
                isDark
                  ? "bg-[radial-gradient(circle,rgba(31,177,242,0.55)_0%,rgba(11,67,200,0.3)_48%,transparent_75%)]"
                  : "bg-[radial-gradient(circle,rgba(31,177,242,0.42)_0%,rgba(11,67,200,0.22)_48%,transparent_75%)]"
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
