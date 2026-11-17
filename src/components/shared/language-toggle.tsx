import * as React from "react";
import { LanguagesIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface LanguageToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default" | "lg";
}

/**
 * Tombol Pengalih Bahasa Sistem (Bilingual ID / EN)
 * Menampilkan ikon Globe/Languages dan indikator bahasa aktif ("ID" / "EN").
 * Disematkan di antara tombol notifikasi dan tombol tema di header sistem.
 */
export function LanguageToggle({
  className = "",
  size = "default",
  style,
  ...props
}: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();
  const isEn = language === "en";

  const sizeClasses = {
    sm: "size-8 p-1.5",
    default: "size-10 p-2",
    lg: "size-11 p-2.5",
  }[size];

  const iconSizes = {
    sm: "size-3.5",
    default: "size-4",
    lg: "size-4.5",
  }[size];

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={isEn ? "Switch to Bahasa Indonesia" : "Ganti ke English"}
      title={isEn ? "English (Klik untuk ganti ke Bahasa Indonesia)" : "Bahasa Indonesia (Klik untuk beralih ke English)"}
      style={style}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-2xl transition-all duration-300 select-none cursor-pointer border",
        "bg-card/95 border-border hover:bg-accent hover:border-primary/40 shadow-2xs backdrop-blur-md",
        "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground",
        sizeClasses,
        className,
      )}
      {...props}
    >
      <LanguagesIcon
        className={cn(
          iconSizes,
          "shrink-0 transition-transform duration-300 text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="text-[10px] font-bold tracking-tight uppercase tabular-nums">
        {language}
      </span>
      <span className="sr-only">
        {isEn ? "Switch to Bahasa Indonesia" : "Ganti ke English"}
      </span>
    </button>
  );
}
