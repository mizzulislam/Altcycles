import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export interface ThemeToggleProps {
  className?: string;
  variant?: "floating" | "inline";
  size?: "sm" | "default" | "lg";
}

/**
 * Tombol Pengalih Mode Terang & Gelap
 * Menampilkan ikon Bulan (Moon) di mode terang dan Matahari (Sun) di mode gelap.
 * Mendukung penempatan di ujung kanan atas halaman (`variant="floating"`).
 */
export function ThemeToggle({
  className = "",
  variant = "inline",
  size = "default",
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const sizeClasses = {
    sm: "size-8 p-1.5",
    default: "size-10 p-2",
    lg: "size-11 p-2.5",
  }[size];

  const iconSizes = {
    sm: "size-4",
    default: "size-5",
    lg: "size-5",
  }[size];

  const floatingClass =
    variant === "floating"
      ? "fixed top-4 right-4 sm:top-5 sm:right-6 z-50 shadow-lg"
      : "";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
      title={isDark ? "Mode Terang (Klik untuk mengganti)" : "Mode Gelap (Klik untuk mengganti)"}
      className={`relative inline-flex items-center justify-center rounded-xl transition-all duration-300 select-none cursor-pointer border ${
        isDark
          ? "bg-[#121A2B]/90 border-white/15 text-amber-300 hover:text-amber-200 hover:bg-[#1A253C] hover:border-white/25 shadow-black/40"
          : "bg-white/90 border-[#C9C9C9]/80 text-[#0B43C8] hover:text-[#083296] hover:bg-[#F0F1F3] hover:border-[#0B43C8]/40 shadow-black/[0.06]"
      } backdrop-blur-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB1F2] ${sizeClasses} ${floatingClass} ${className}`}
    >
      <span className="sr-only">
        {isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
      </span>

      {/* Ikon Matahari & Bulan dengan Transisi Halus */}
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <SunIcon
            className={`${iconSizes} transition-transform duration-300 rotate-0 scale-100 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]`}
          />
        ) : (
          <MoonIcon
            className={`${iconSizes} transition-transform duration-300 rotate-0 scale-100 text-[#0B43C8]`}
          />
        )}
      </div>
    </button>
  );
}
