import { motion } from "motion/react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { AltviraLogo } from "@/components/shared/altvira-logo";
import { LatticeLoader } from "@/components/shared/lattice-loader";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

export interface OAuthLoadingCardProps {
  resolvedTheme?: "dark" | "light";
  onCancel?: () => void;
}

function GoogleBadge() {
  return (
    <div className="size-11 rounded-2xl bg-white dark:bg-white/10 border border-[#C9C9C9]/60 dark:border-white/15 flex items-center justify-center shadow-md">
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

function AltviraBadge() {
  return (
    <div className="size-11 rounded-2xl bg-gradient-to-br from-[#0B43C8] to-[#1FB1F2] border border-white/20 flex items-center justify-center shadow-lg shadow-[#0B43C8]/25">
      <AltviraLogo size={22} variant="light" showText={false} />
    </div>
  );
}

export function OAuthLoadingCard({
  resolvedTheme = "light",
  onCancel,
}: OAuthLoadingCardProps) {
  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#F0F1F3] dark:bg-[#090E19] p-4 text-center overflow-hidden transition-colors duration-500">
      {/* Tombol Pengalih Mode */}
      <ThemeToggle variant="floating" />

      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: isDark ? [0.18, 0.28, 0.18] : [0.12, 0.2, 0.12],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#0B43C8] via-[#1FB1F2] to-transparent blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: isDark ? [0.1, 0.18, 0.1] : [0.06, 0.12, 0.06],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#1FB1F2] to-[#0B43C8] blur-[100px]"
        />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Main Glass Card with Spring Motion */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Top Header Logo */}
        <div className="flex justify-center mb-6">
          <AltviraLogo
            size={40}
            variant={isDark ? "light" : "dark"}
            subtitle="FINANCIAL ERP"
          />
        </div>

        {/* Card Body */}
        <div className="relative rounded-3xl p-7 sm:p-9 bg-white/90 dark:bg-[#121A2B]/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden text-left">
          {/* Top Decorative Shimmer Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#1FB1F2] to-transparent opacity-80" />

          {/* Connection Animation: Google <---> Altvira */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 pt-1">
            <GoogleBadge />

            <div className="flex-1 max-w-[120px] relative flex items-center justify-center">
              {/* Connector line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-[#4285F4]/40 via-[#1FB1F2] to-[#0B43C8]/40 dark:from-[#4285F4]/30 dark:via-[#1FB1F2]/60 dark:to-[#0B43C8]/30 rounded-full" />
              {/* Animated travelling light pulse */}
              <motion.div
                animate={{ x: [-45, 45] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "mirror",
                }}
                className="absolute size-2.5 rounded-full bg-[#1FB1F2] shadow-[0_0_10px_#1FB1F2]"
              />
            </div>

            <AltviraBadge />
          </div>

          {/* Center Lattice Matrix Loader */}
          <div className="flex flex-col items-center justify-center py-3">
            <div className="p-3.5 rounded-2xl bg-[#F0F1F3]/80 dark:bg-[#090E19]/60 border border-[#C9C9C9]/30 dark:border-white/5 backdrop-blur-sm">
              <LatticeLoader
                pattern="orbit"
                grid={3}
                shape="round"
                cellSize={8}
                gap={4}
                color={isDark ? "#1FB1F2" : "#0B43C8"}
                glowColor={isDark ? "#1FB1F2" : "#0B43C8"}
                glow={true}
                idleOpacity={isDark ? 0.25 : 0.18}
                step={85}
              />
            </div>
          </div>

          {/* Titles & Message */}
          <div className="text-center mt-3 mb-5 space-y-1.5">
            <h3 className="font-bold text-lg text-[#2A2A2A] dark:text-white tracking-tight">
              Menghubungkan Akun Google
            </h3>
            <p className="text-xs sm:text-sm text-[#616C82] dark:text-[#9AA5B8] leading-relaxed">
              Sedang memverifikasi data akun dan menyiapkan portal kerja Anda...
            </p>
          </div>

          {/* Step Progress Checklist */}
          <div className="space-y-2.5 py-3 border-y border-[#C9C9C9]/30 dark:border-white/10 text-xs">
            {/* Step 1 */}
            <div className="flex items-center justify-between text-[#2A2A2A] dark:text-white">
              <span className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
                <span>Otentikasi Akun Google</span>
              </span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Selesai
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center justify-between text-[#2A2A2A] dark:text-white">
              <span className="flex items-center gap-2">
                <Loader2Icon className="size-4 text-[#0B43C8] dark:text-[#1FB1F2] animate-spin shrink-0" />
                <span className="font-semibold text-[#0B43C8] dark:text-[#1FB1F2]">
                  Sinkronisasi Profil & Izin
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[#0B43C8] dark:text-[#1FB1F2] animate-pulse">
                Memproses...
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center justify-between text-[#9AA5B8] dark:text-[#616C82]">
              <span className="flex items-center gap-2">
                <div className="size-4 rounded-full border border-dashed border-[#C9C9C9] dark:border-white/20 shrink-0" />
                <span>Menyiapkan Dasbor Portal</span>
              </span>
              <span className="text-[11px]">Menunggu</span>
            </div>
          </div>

          {/* Cancel Action */}
          {onCancel && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-xs text-[#616C82] dark:text-[#9AA5B8] hover:text-[#2A2A2A] dark:hover:text-white hover:bg-[#F0F1F3] dark:hover:bg-white/10 rounded-xl"
              >
                Batalkan & Kembali ke Masuk
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
