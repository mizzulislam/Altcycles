import * as React from "react";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface LanguageToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default" | "lg";
}

/**
 * Tombol Pengalih Bahasa Sistem (Bilingual Dropdown)
 * Menampilkan simbol bahasa universal tanpa teks ID/EN di tombol.
 * Saat diklik memunculkan dropdown pilihan bahasa: Bahasa Indonesia (ID) & English (EN).
 */
export function LanguageToggle({
  className = "",
  size = "default",
  style,
}: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "size-8 p-1.5",
    default: "size-9 p-2",
    lg: "size-10 p-2.5",
  }[size];

  const iconSizes = {
    sm: "size-4",
    default: "size-4",
    lg: "size-4.5",
  }[size];

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Pilih Bahasa / Select Language"
        aria-expanded={isOpen}
        title="Pilih Bahasa / Select Language"
        style={style}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl transition-all duration-300 select-none cursor-pointer border group",
          "bg-card/95 border-border hover:bg-muted/60 hover:border-primary/40 shadow-2xs backdrop-blur-md",
          "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground",
          sizeClasses,
          className,
        )}
      >
        <LanguagesIcon
          className={cn(
            iconSizes,
            "shrink-0 transition-transform duration-200 text-muted-foreground group-hover:text-foreground",
            isOpen && "text-primary scale-110",
          )}
        />
        <span className="sr-only">Pilih Bahasa / Select Language</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150 z-50">
          <div className="px-3.5 py-1.5 border-b border-border/60 mb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pilih Bahasa / Language
            </p>
          </div>

          {/* Opsi 1: Bahasa Indonesia */}
          <button
            type="button"
            onClick={() => {
              setLanguage("id");
              setIsOpen(false);
            }}
            className={cn(
              "w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer",
              language === "id"
                ? "bg-primary/10 text-primary font-bold"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm select-none" aria-hidden="true">🇮🇩</span>
              <div className="min-w-0">
                <p className="leading-tight">Bahasa Indonesia</p>
                <p className="text-[10px] text-muted-foreground font-normal">Indonesia (ID)</p>
              </div>
            </div>
            {language === "id" && <CheckIcon className="size-4 text-primary shrink-0" />}
          </button>

          {/* Opsi 2: English */}
          <button
            type="button"
            onClick={() => {
              setLanguage("en");
              setIsOpen(false);
            }}
            className={cn(
              "w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer",
              language === "en"
                ? "bg-primary/10 text-primary font-bold"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm select-none" aria-hidden="true">🇬🇧</span>
              <div className="min-w-0">
                <p className="leading-tight">English</p>
                <p className="text-[10px] text-muted-foreground font-normal">United States (EN)</p>
              </div>
            </div>
            {language === "en" && <CheckIcon className="size-4 text-primary shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}
