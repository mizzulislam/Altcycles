import * as React from "react";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string; // Format internal selalu ISO "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function parseISODate(isoStr?: string): Date | null {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return null;
  const [y, m, d] = isoStr.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format ISO Date "YYYY-MM-DD" ke format display/ketik "MM/DD/YYYY"
 */
function toMMDDYYYY(isoStr?: string): string {
  if (!isoStr) return "";
  const d = parseISODate(isoStr);
  if (!d || isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

/**
 * Parse string ketikan pengguna dalam format MM/DD/YYYY (atau M/D/YYYY)
 * Juga mendukung format ISO YYYY-MM-DD bila pengguna paste string ISO
 */
function parseTypedDate(str: string): { date: Date; iso: string } | null {
  if (!str) return null;
  const trimmed = str.trim();

  // Coba format MM/DD/YYYY atau MM-DD-YYYY
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];
    // Jika format YYYY-MM-DD
    if (p0.length === 4) {
      const y = Number(p0);
      const m = Number(p1);
      const d = Number(p2);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) {
        const daysInMonth = new Date(y, m, 0).getDate();
        if (d >= 1 && d <= daysInMonth) {
          const date = new Date(y, m - 1, d);
          return { date, iso: toISODate(date) };
        }
      }
    } else {
      // Format MM/DD/YYYY
      const m = Number(p0);
      const d = Number(p1);
      const y = Number(p2);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) {
        const daysInMonth = new Date(y, m, 0).getDate();
        if (d >= 1 && d <= daysInMonth) {
          const date = new Date(y, m - 1, d);
          return { date, iso: toISODate(date) };
        }
      }
    }
  }

  return null;
}

export function DatePicker({
  id,
  name,
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  disabled = false,
  className,
  minDate,
  maxDate,
  required = false,
}: DatePickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // State teks input langsung untuk format MM/DD/YYYY
  const [typedText, setTypedText] = React.useState<string>(() =>
    toMMDDYYYY(value),
  );

  const selectedDate = React.useMemo(() => parseISODate(value), [value]);

  const [viewDate, setViewDate] = React.useState<Date>(() => {
    return selectedDate ?? new Date();
  });

  // State untuk dropdown popup pemilihan bulan & tahun
  const [monthDropdownOpen, setMonthDropdownOpen] = React.useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = React.useState(false);

  // Sinkronkan typedText dan viewDate bila value dari parent berubah
  React.useEffect(() => {
    setTypedText(toMMDDYYYY(value));
    if (value) {
      const parsed = parseISODate(value);
      if (parsed) {
        setViewDate(parsed);
      }
    }
  }, [value]);

  const openCalendar = React.useCallback(() => {
    // Sinkronkan tanggal yang sedang diketik sebelum membuka kalender
    const parsed = parseTypedDate(typedText);
    if (parsed) {
      setViewDate(parsed.date);
      onChange(parsed.iso);
    }
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
    setIsOpen(true);
  }, [typedText, onChange]);

  // Click outside & Escape listener
  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setMonthDropdownOpen(false);
      setYearDropdownOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setMonthDropdownOpen(false);
        setYearDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Navigasi prev/next satu bulan
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Tanggal dalam kalender
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const todayStr = toISODate(new Date());

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      const str = toISODate(prevDate);
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: false,
        isSelected: value === str,
        isToday: todayStr === str,
        isDisabled: Boolean(
          (minDate && str < minDate) || (maxDate && str > maxDate),
        ),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(viewYear, viewMonth, d);
      const str = toISODate(currDate);
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: true,
        isSelected: value === str,
        isToday: todayStr === str,
        isDisabled: Boolean(
          (minDate && str < minDate) || (maxDate && str > maxDate),
        ),
      });
    }

    // Next month padding to fill complete grid (35 or 42 slots)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const str = toISODate(nextDate);
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: false,
        isSelected: value === str,
        isToday: todayStr === str,
        isDisabled: Boolean(
          (minDate && str < minDate) || (maxDate && str > maxDate),
        ),
      });
    }

    return days;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  // Handler memilih tanggal dari kalender
  const handleSelectDay = (dateStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(dateStr);
    setTypedText(toMMDDYYYY(dateStr));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const todayStr = toISODate(new Date());
    onChange(todayStr);
    setTypedText(toMMDDYYYY(todayStr));
    setViewDate(new Date());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setTypedText("");
    setIsOpen(false);
  };

  // Handler saat pengguna mengetik langsung tanggal di input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setTypedText(text);

    // Jika telah lengkap dan valid, sinkronkan ke value parent dan arahkan viewDate
    const parsed = parseTypedDate(text);
    if (parsed) {
      onChange(parsed.iso);
      setViewDate(parsed.date);
    }
  };

  const handleInputBlur = () => {
    if (!typedText.trim()) {
      if (!required) {
        onChange("");
      } else if (value) {
        setTypedText(toMMDDYYYY(value));
      }
      return;
    }

    const parsed = parseTypedDate(typedText);
    if (parsed) {
      onChange(parsed.iso);
      setTypedText(toMMDDYYYY(parsed.iso));
      setViewDate(parsed.date);
    } else {
      // Jika ketikan tidak valid, kembalikan ke tanggal valid sebelumnya
      if (value) {
        setTypedText(toMMDDYYYY(value));
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const parsed = parseTypedDate(typedText);
      if (parsed) {
        onChange(parsed.iso);
        setTypedText(toMMDDYYYY(parsed.iso));
        setViewDate(parsed.date);
        setIsOpen(false);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        openCalendar();
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden input untuk form HTML standar & validasi form */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          required={required}
        />
      )}

      {/* Field Input Langsung (Format MM/DD/YYYY) dengan Tombol Kalender Terpadu */}
      <div
        ref={triggerRef}
        data-slot="input"
        className={cn(
          "group relative flex h-9 w-full items-center rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] shadow-xs transition-all duration-150",
          "hover:border-primary/60 dark:hover:border-cyan-500/50",
          "focus-within:border-primary dark:focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-primary/20 dark:focus-within:ring-cyan-400/20",
          isOpen && "border-primary dark:border-cyan-400 ring-2 ring-primary/20 dark:ring-cyan-400/20",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          data-inner-input="true"
          disabled={disabled}
          placeholder={placeholder}
          value={typedText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onClick={() => {
            if (!isOpen) openCalendar();
          }}
          required={required}
          className="h-full w-full rounded-xl !bg-transparent px-3 py-1 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden !border-0 !ring-0"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          autoComplete="off"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openCalendar();
            }
          }}
          tabIndex={-1}
          aria-label="Buka kalender"
          className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-lg text-primary dark:text-cyan-400 hover:bg-primary/10 transition-colors cursor-pointer"
        >
          <CalendarIcon className="size-4 transition-transform duration-150 group-hover:scale-110" />
        </button>
      </div>

      {/* Popover Kalender Modern (Menyatu langsung di bawah field, bebas konflik modal) */}
      {isOpen && (
        <div
          ref={popoverRef}
          data-date-picker-popover="true"
          onClick={() => {
            if (monthDropdownOpen) setMonthDropdownOpen(false);
            if (yearDropdownOpen) setYearDropdownOpen(false);
          }}
          className={cn(
            "absolute left-0 right-0 top-full mt-1.5 z-50 w-full rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-2xl shadow-black/35 backdrop-blur-md animate-in fade-in-0 zoom-in-95 select-none",
            "dark:border-white/10 dark:bg-[#0c1322] dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)]",
          )}
        >
            {/* Header: Tombol Bulan & Tahun Interaktif dengan Dropdown Chevron */}
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Selector Teks Bulan Interaktif */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMonthDropdownOpen((prev) => !prev);
                      setYearDropdownOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-1 text-xs sm:text-sm font-bold transition-all px-2.5 py-1 rounded-lg border cursor-pointer",
                      monthDropdownOpen
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/60 hover:border-primary/40",
                    )}
                    title="Pilih Bulan"
                  >
                    <span>{MONTH_NAMES_ID[viewMonth]}</span>
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 opacity-70 transition-transform duration-200",
                        monthDropdownOpen && "rotate-180 opacity-100",
                      )}
                    />
                  </button>

                  {/* Dropdown Menu Pilihan Bulan */}
                  {monthDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1.5 z-[100001] w-56 rounded-xl border border-border/80 dark:border-white/15 bg-popover dark:bg-[#0f172a] p-1.5 shadow-2xl grid grid-cols-3 gap-1 duration-150 animate-in fade-in-0 zoom-in-95"
                    >
                      {MONTH_NAMES_ID.map((name, idx) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setViewDate(new Date(viewYear, idx, 1));
                            setMonthDropdownOpen(false);
                          }}
                          className={cn(
                            "px-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center",
                            viewMonth === idx
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "hover:bg-muted text-foreground",
                          )}
                        >
                          {name.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selector Teks Tahun Interaktif */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setYearDropdownOpen((prev) => !prev);
                      setMonthDropdownOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-1 text-xs sm:text-sm font-bold transition-all px-2.5 py-1 rounded-lg border cursor-pointer",
                      yearDropdownOpen
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/60 hover:border-primary/40",
                    )}
                    title="Pilih Tahun"
                  >
                    <span>{viewYear}</span>
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 opacity-70 transition-transform duration-200",
                        yearDropdownOpen && "rotate-180 opacity-100",
                      )}
                    />
                  </button>

                  {/* Dropdown Menu Pilihan Tahun */}
                  {yearDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1.5 z-[100001] w-48 max-h-48 overflow-y-auto no-scrollbar rounded-xl border border-border/80 dark:border-white/15 bg-popover dark:bg-[#0f172a] p-1.5 shadow-2xl grid grid-cols-2 gap-1 duration-150 animate-in fade-in-0 zoom-in-95"
                    >
                      {Array.from({ length: 30 }, (_, i) => viewYear - 15 + i).map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setViewDate(new Date(yr, viewMonth, 1));
                            setYearDropdownOpen(false);
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center",
                            viewYear === yr
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "hover:bg-muted text-foreground",
                          )}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Navigasi Prev/Next */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  title="Bulan sebelumnya"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  title="Bulan berikutnya"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            </div>

            {/* Kalender Hari Tanggal */}
            <div>
              {/* Header Nama Hari */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_NAMES_ID.map((name) => (
                  <div
                    key={name}
                    className="text-[11px] font-semibold text-muted-foreground py-1"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Grid Tanggal Hari */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    type="button"
                    disabled={cell.isDisabled}
                    onClick={() =>
                      handleSelectDay(cell.dateStr, cell.isDisabled)
                    }
                    className={cn(
                      "w-full h-8 sm:h-9 flex items-center justify-center rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer",
                      cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/35",
                      cell.isSelected &&
                        "bg-primary text-primary-foreground font-bold shadow-xs scale-105 hover:bg-primary/95",
                      !cell.isSelected &&
                        cell.isToday &&
                        "border border-primary text-primary font-bold dark:text-cyan-400 dark:border-cyan-400",
                      !cell.isSelected &&
                        !cell.isToday &&
                        "hover:bg-muted/80 hover:text-foreground",
                      cell.isDisabled &&
                        "pointer-events-none opacity-20 cursor-not-allowed",
                    )}
                  >
                    {cell.dayNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Aksi Bawah Kalender */}
            <div className="mt-3.5 pt-2.5 border-t border-border/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="font-semibold text-primary dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Hari Ini
                </button>
                {!required && value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
