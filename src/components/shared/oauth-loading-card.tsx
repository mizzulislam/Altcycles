import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import {
  AltviraLogoMark,
  AltviraWordmark,
} from "@/components/shared/altvira-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { useOptionalTheme } from "@/lib/theme-context";

export interface OAuthLoadingCardProps {
  resolvedTheme?: "dark" | "light";
  userName?: string;
  isProfileReady?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface AuthStepItem {
  id: 1 | 2 | 3;
  title: string;
  activeLabel: string;
  pendingLabel: string;
  doneLabel: string;
}

const AUTH_STEPS: AuthStepItem[] = [
  {
    id: 1,
    title: "Otentikasi Akun Google",
    activeLabel: "Memverifikasi...",
    pendingLabel: "Menunggu",
    doneLabel: "Selesai",
  },
  {
    id: 2,
    title: "Sinkronisasi Profil & Izin",
    activeLabel: "Memproses...",
    pendingLabel: "Menunggu",
    doneLabel: "Selesai",
  },
  {
    id: 3,
    title: "Menyiapkan Dasbor Portal",
    activeLabel: "Memuat Ruang Kerja...",
    pendingLabel: "Menunggu",
    doneLabel: "Selesai",
  },
];

function GoogleBadge() {
  return (
    <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-background/95 shadow-sm dark:bg-white/[0.06] dark:border-white/15">
      <svg className="size-5.5" viewBox="0 0 24 24" aria-hidden="true">
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
    </div>
  );
}

/**
 * Emblem squircle Altvira yang seragam dengan logo saat sidebar dalam posisi tertutup.
 */
function AltviraSquircleBadge({
  sizeClass = "size-12 rounded-2xl",
  iconSize = 24,
  isDone = false,
}: {
  sizeClass?: string;
  iconSize?: number;
  isDone?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B43C8] via-[#1354DC] to-[#1D6FF2] ring-1 transition-all duration-300 shadow-lg ${
        isDone
          ? "ring-emerald-400/70 shadow-emerald-500/25"
          : "ring-white/30 dark:ring-white/25 shadow-primary/25"
      } ${sizeClass}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent"
      />
      <AltviraLogoMark
        size={iconSize}
        iconVariant="transparent"
        variant="white"
        className="relative z-10"
      />
    </div>
  );
}

export function OAuthLoadingCard({
  resolvedTheme,
  userName,
  isProfileReady = false,
  onComplete,
  onCancel,
}: OAuthLoadingCardProps) {
  const themeCtx = useOptionalTheme();
  const effectiveTheme = resolvedTheme ?? themeCtx?.resolvedTheme ?? "light";
  const isDark = effectiveTheme === "dark";

  // Langkah berurutan: 1 -> 2 -> 3 -> 4 (Selesai Penuh)
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Progresif timer bertahap agar animasi terlihat jelas dan memuaskan
  React.useEffect(() => {
    // Step 1 -> Step 2 setelah 700ms
    const t1 = window.setTimeout(() => {
      setCurrentStep(2);
    }, 700);

    // Step 2 -> Step 3 setelah 1500ms
    const t2 = window.setTimeout(() => {
      setCurrentStep(3);
    }, 1500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Saat profile ready dan sudah mencapai step 3, transisikan ke Step 4
  React.useEffect(() => {
    if (currentStep >= 3 && isProfileReady) {
      const t3 = window.setTimeout(() => {
        setCurrentStep(4);
      }, 700);

      // Selesai penuh dan arahkan setelah melihat state sukses
      const t4 = window.setTimeout(() => {
        onComplete?.();
      }, 1500);

      return () => {
        window.clearTimeout(t3);
        window.clearTimeout(t4);
      };
    }
  }, [currentStep, isProfileReady, onComplete]);

  // Fallback jika proses agak lambat namun step 3 sudah lewat 2.4s, tunggu profile siap
  React.useEffect(() => {
    if (currentStep === 3 && !isProfileReady) {
      // Biarkan tetap di step 3 sampai profile siap
    }
  }, [currentStep, isProfileReady]);

  const progressPercentage = {
    1: 25,
    2: 60,
    3: 88,
    4: 100,
  }[currentStep];

  const phaseSummary = {
    1: "Memvalidasi Sesi OAuth",
    2: "Menyelaraskan Profil & Hak Akses",
    3: "Menginisialisasi Ruang Kerja",
    4: "Koneksi Terverifikasi",
  }[currentStep];

  const isDone = currentStep === 4;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center overflow-hidden transition-colors duration-300">
      {/* Tombol Pengalih Mode */}
      <ThemeToggle variant="floating" />

      {/* Background Ambient Aura + Subtle Executive Grid */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: isDark ? [0.16, 0.24, 0.16] : [0.09, 0.15, 0.09],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[22%] left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-gradient-to-br from-[#0B43C8] via-[#1FB1F2] to-transparent blur-[130px]"
        />
        <motion.div
          animate={{
            scale: [1.06, 1, 1.06],
            opacity: isDark ? [0.08, 0.14, 0.08] : [0.05, 0.09, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-[24%] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-[#1FB1F2] to-[#0B43C8] blur-[110px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] text-foreground/[0.03] bg-[size:36px_36px]" />
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Top Brand Header: Squircle Ikon Sidebar Tertutup + Wordmark Adaptif Tema */}
        <div className="flex items-center justify-center gap-3 mb-6 select-none">
          <AltviraSquircleBadge
            sizeClass="size-10 rounded-xl"
            iconSize={22}
          />
          <div className="flex flex-col items-start gap-1 text-left">
            <AltviraWordmark
              height={12}
              variant={isDark ? "light" : "dark"}
            />
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                lineHeight: "1.04",
                letterSpacing: "0.04em",
              }}
              className="text-[11px] font-semibold uppercase text-muted-foreground"
            >
              FINANCIAL ERP
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="relative rounded-2xl p-6 sm:p-8 bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden text-left">
          {/* Top Accent Beam */}
          <div
            className={`absolute top-0 inset-x-0 h-[2px] transition-colors duration-500 ${
              isDone
                ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                : "bg-gradient-to-r from-transparent via-primary to-transparent dark:via-sky-400"
            }`}
          />

          {/* Connection Stage: Google -> Encrypted Stream -> Altvira */}
          <div className="flex items-center justify-center gap-4 sm:gap-5 pt-2 pb-6">
            <div className="relative shrink-0">
              <GoogleBadge />
            </div>

            {/* Precision Handshake Bridge */}
            <div className="relative flex-1 max-w-[140px] flex items-center justify-center">
              <div className="relative h-[3px] w-full rounded-full bg-border/80 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors duration-500 ${
                    isDone
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-[#4285F4] via-[#1FB1F2] to-[#0B43C8]"
                  }`}
                  initial={{ width: "25%" }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />

                {/* Smooth directional data shimmer while connecting */}
                {!isDone && (
                  <motion.div
                    aria-hidden="true"
                    animate={{ x: ["-100%", "240%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  />
                )}
              </div>

              {/* Center Handshake Node */}
              <div
                className={`absolute left-1/2 top-1/2 z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-xs transition-all duration-300 ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "border-border/90 bg-card text-primary dark:text-sky-400"
                }`}
              >
                {!isDone && (
                  <motion.span
                    aria-hidden="true"
                    animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-full border border-primary/50 dark:border-sky-400/50"
                  />
                )}
                {isDone ? (
                  <CheckIcon className="size-3.5 stroke-[2.5]" />
                ) : (
                  <ShieldCheckIcon className="size-3.5" />
                )}
              </div>
            </div>

            <div className="relative shrink-0">
              {!isDone ? (
                <motion.div
                  aria-hidden="true"
                  animate={{ scale: [1, 1.16, 1], opacity: [0.32, 0, 0.32] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-2xl bg-primary/40 dark:bg-sky-400/35 blur-[2px]"
                />
              ) : (
                <motion.div
                  aria-hidden="true"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1.12, opacity: 0.28 }}
                  transition={{ duration: 0.45 }}
                  className="absolute inset-0 rounded-2xl bg-emerald-500/40 blur-[3px]"
                />
              )}
              <AltviraSquircleBadge
                sizeClass="size-12 rounded-2xl"
                iconSize={24}
                isDone={isDone}
              />
            </div>
          </div>

          {/* Dynamic Title & Subtitle */}
          <div className="text-center mb-5 space-y-1.5 min-h-[58px]">
            <AnimatePresence mode="wait">
              {isDone ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-1"
                >
                  <h3 className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    Akun Berhasil Terhubung!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Selamat datang{userName ? `, ${userName}` : ""}! Mengalihkan ke ruang kerja...
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="working"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-1"
                >
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Menghubungkan Akun Google
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Sedang memverifikasi identitas akun dan menyiapkan portal kerja Anda.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-muted-foreground">
                {phaseSummary}
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  isDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-primary dark:text-sky-400"
                }`}
              >
                {progressPercentage}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full transition-colors duration-500 ${
                  isDone
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-[#0B43C8] to-[#1FB1F2]"
                }`}
                initial={{ width: "25%" }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Step Progress Checklist */}
          <div className="space-y-1.5 py-3 border-y border-border/70 text-xs">
            {AUTH_STEPS.map((step) => {
              const stepDone = currentStep > step.id;
              const stepActive = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 border transition-colors duration-200 ${
                    stepActive
                      ? "bg-primary/[0.06] dark:bg-sky-400/[0.08] border-primary/20 dark:border-sky-400/20"
                      : "border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {stepDone ? (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 22,
                        }}
                      >
                        <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
                      </motion.div>
                    ) : stepActive ? (
                      <Loader2Icon className="size-4 text-primary dark:text-sky-400 animate-spin shrink-0" />
                    ) : (
                      <div className="size-4 rounded-full border border-dashed border-muted-foreground/40 shrink-0" />
                    )}
                    <span
                      className={
                        stepDone
                          ? "font-medium text-foreground"
                          : stepActive
                            ? "font-semibold text-primary dark:text-sky-400"
                            : "text-muted-foreground"
                      }
                    >
                      {step.title}
                    </span>
                  </span>

                  <span
                    className={`text-[11px] font-medium shrink-0 ml-2 ${
                      stepDone
                        ? "text-emerald-600 dark:text-emerald-400"
                        : stepActive
                          ? "text-primary dark:text-sky-400"
                          : "text-muted-foreground/70"
                    }`}
                  >
                    {stepDone
                      ? step.doneLabel
                      : stepActive
                        ? step.activeLabel
                        : step.pendingLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-5 flex items-center justify-between gap-3">
            {onCancel ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Batalkan
              </Button>
            ) : (
              <div />
            )}

            {isProfileReady && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onComplete?.()}
                className="rounded-xl text-xs font-semibold text-primary dark:text-sky-400 hover:bg-primary/10 dark:hover:bg-sky-400/10"
              >
                <span>Langsung Masuk</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
