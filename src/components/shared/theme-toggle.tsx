import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "floating" | "inline";
  size?: "sm" | "default" | "lg";
}

/**
 * Tombol Pengalih Mode Terang & Gelap
 * Menampilkan ikon Bulan (Moon) di mode terang dan Matahari (Sun) di mode gelap.
 * `variant="floating"`: Terpasang tetap di ujung kanan atas halaman (fixed top-right, z-index: 9999).
 * `variant="inline"`: Komponen tombol standar untuk disematkan di dalam header atau navigasi.
 */
export function ThemeToggle({
  className = "",
  variant = "inline",
  size = "default",
  style,
  ...props
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

  const isFloating = variant === "floating";

  const floatingStyle: React.CSSProperties = isFloating
    ? {
        position: "fixed",
        top: "1.25rem",
        right: "1.5rem",
        zIndex: 9999,
        ...style,
      }
    : { ...style };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
      title={isDark ? "Mode Terang (Klik untuk beralih)" : "Mode Gelap (Klik untuk beralih)"}
      style={floatingStyle}
      className={`inline-flex items-center justify-center rounded-2xl transition-all duration-300 select-none cursor-pointer border ${
        isDark
          ? "bg-[#121A2B]/95 border-white/20 text-amber-300 hover:text-amber-200 hover:bg-[#1A253C] hover:border-white/35 shadow-xl shadow-black/50"
          : "bg-white/95 border-[#C9C9C9] text-[#0B43C8] hover:text-[#083296] hover:bg-[#F0F1F3] hover:border-[#0B43C8]/40 shadow-xl shadow-black/[0.1]"
      } backdrop-blur-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB1F2] ${sizeClasses} ${className}`}
      {...props}
    >
      <span className="sr-only">
        {isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
      </span>

      {/* Ikon Matahari (di mode gelap) & Bulan (di mode terang) */}
      <div className="flex items-center justify-center pointer-events-none">
        {isDark ? (
          <SunIcon
            className={`${iconSizes} transition-transform duration-300 rotate-0 scale-100 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]`}
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
