import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  containerClassName?: string;
}

/**
 * Komponen pola bilah pencarian data terstandar Altcycles.
 * Menampilkan ikon pencarian di sisi kiri, padding input proporsional,
 * serta tombol pembersih (x) otomatis saat terdapat teks pencarian.
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  className,
  containerClassName,
  disabled,
  ...props
}: SearchInputProps) {
  const { t } = useLanguage();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full sm:w-72", containerClassName)}>
      <SearchIcon
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 pointer-events-none"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.search", "Cari data...")}
        disabled={disabled}
        className={cn(
          "pl-9 pr-8 h-9 rounded-xl text-xs sm:text-sm bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-ring/45",
          className,
        )}
        {...props}
      />
      {value.length > 0 && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          aria-label={t("common.clear_search", "Bersihkan pencarian")}
        >
          <XIcon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{t("common.clear_search", "Bersihkan pencarian")}</span>
        </button>
      )}
    </div>
  );
}
