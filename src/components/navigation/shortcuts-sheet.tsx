import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { Keyboard, X, Search, SearchX } from "lucide-react";
import type { UserRole } from "@/types/database.types";
import {
  getEffectiveShortcuts,
  formatShortcutDisplay,
  isMacPlatform,
  getShortcutOverrides,
  type NavigationShortcutItem,
  type ShortcutGroup,
} from "@/lib/navigation-shortcuts-registry";
import { ModalOverlayScrollbar } from "@/components/ui/modal-overlay-scrollbar";

export interface ShortcutsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
}

export function ShortcutsSheet({ isOpen, onClose, currentRole }: ShortcutsSheetProps) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const isMac = React.useMemo(() => isMacPlatform(), []);

  // Ambil pintasan efektif untuk role aktif
  const [effectiveItems, setEffectiveItems] = React.useState<NavigationShortcutItem[]>(() =>
    getEffectiveShortcuts(currentRole),
  );
  const [overrides, setOverrides] = React.useState(() => getShortcutOverrides());

  const refreshShortcuts = React.useCallback(() => {
    setEffectiveItems(getEffectiveShortcuts(currentRole));
    setOverrides(getShortcutOverrides());
  }, [currentRole]);

  React.useEffect(() => {
    refreshShortcuts();

    const handleShortcutsUpdated = () => {
      refreshShortcuts();
    };

    window.addEventListener("altcycles:shortcuts-updated", handleShortcutsUpdated);
    return () => {
      window.removeEventListener("altcycles:shortcuts-updated", handleShortcutsUpdated);
    };
  }, [refreshShortcuts]);

  // Fokus otomatis ke input saat sheet terbuka
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter daftar pintasan berdasarkan query pencarian (judul, modul, alias ID & EN)
  const filteredItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return effectiveItems;

    return effectiveItems.filter((item) => {
      const resolvedTitle = t(item.titleKey, item.fallbackTitle).toLowerCase();
      if (resolvedTitle.includes(q)) return true;
      if (item.fallbackTitle.toLowerCase().includes(q)) return true;

      const resolvedModule = t(item.moduleLabelKey, item.fallbackModuleLabel).toLowerCase();
      if (resolvedModule.includes(q)) return true;

      if (item.aliases.id.some((a) => a.toLowerCase().includes(q))) return true;
      if (item.aliases.en.some((a) => a.toLowerCase().includes(q))) return true;

      return false;
    });
  }, [effectiveItems, searchQuery, t]);

  // Kelompokkan item berdasarkan grup: umum, navigasi, aksi cepat
  const groupedItems = React.useMemo(() => {
    const groups: { key: ShortcutGroup; labelKey: string; fallbackLabel: string; items: NavigationShortcutItem[] }[] = [
      {
        key: "general",
        labelKey: "common:shortcuts.group_general",
        fallbackLabel: "Umum",
        items: [],
      },
      {
        key: "navigation",
        labelKey: "common:shortcuts.group_navigation",
        fallbackLabel: "Navigasi",
        items: [],
      },
      {
        key: "quick_action",
        labelKey: "common:shortcuts.group_quick_action",
        fallbackLabel: "Aksi Cepat",
        items: [],
      },
    ];

    filteredItems.forEach((item) => {
      const targetGroup = groups.find((g) => g.key === item.group);
      if (targetGroup) {
        targetGroup.items.push(item);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [filteredItems]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay Gelap Latar */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[124] bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in" />

        {/* Panel Samping Kanan (Drawer Sheet) */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-[125] w-full max-w-md sm:max-w-lg bg-card border-l border-border/80 shadow-2xl flex flex-col outline-none animate-in slide-in-from-right duration-200 text-card-foreground"
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/70 shrink-0">
            <DialogPrimitive.Title className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Keyboard className="size-4" />
              </div>
              <span>{t("common:shortcuts.panel_title", "Pintasan Keyboard")}</span>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label={t("common:action.close", "Tutup")}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Bilah Pencarian Pintasan */}
          <div className="px-5 sm:px-6 py-3 border-b border-border/60 bg-card shrink-0">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-transparent border border-border/80 focus-within:ring-1 focus-within:ring-ring/40 focus-within:border-ring/60 transition-all">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("common:shortcuts.search_placeholder", "Cari pintasan...")}
                className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-normal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                  title={t("common:action.reset", "Reset")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Konten Daftar Pintasan Berkelompok */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto scroll-smooth p-5 sm:p-6 space-y-6 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative"
          >
            {groupedItems.length > 0 ? (
              groupedItems.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                    {t(group.labelKey, group.fallbackLabel)}
                  </div>
                  <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-background/50 overflow-hidden">
                    {group.items.map((item) => {
                      const isCustomized = Boolean(overrides[item.id] && !item.isLocked);
                      const display = formatShortcutDisplay(item.defaultKeys, isMac, i18n.language);

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 py-2.5 px-3.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                                {t(item.titleKey, item.fallbackTitle)}
                              </p>
                              {isCustomized && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                                  {t("common:shortcuts.customized", "Kustom")}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {t(item.moduleLabelKey, item.fallbackModuleLabel)}
                              {item.tabKey ? ` • Tab: ${item.tabKey}` : ""}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-1 select-none">
                            {display.parts.length === 0 ? (
                              <span className="text-xs text-muted-foreground/50 italic">-</span>
                            ) : display.isSequence ? (
                              <div className="flex items-center gap-1 text-xs font-mono">
                                <kbd className="px-2 py-1 text-xs font-semibold rounded-md border border-border/80 bg-muted/70 text-foreground shadow-2xs">
                                  {display.parts[0]}
                                </kbd>
                                <span className="text-[11px] text-muted-foreground font-sans px-1 lowercase">
                                  {display.sequenceThenText || t("common:shortcuts.then", "lalu")}
                                </span>
                                <kbd className="px-2 py-1 text-xs font-semibold rounded-md border border-border/80 bg-muted/70 text-foreground shadow-2xs">
                                  {display.parts[1]}
                                </kbd>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs font-mono">
                                {display.parts.map((part, pIdx) => (
                                  <kbd
                                    key={`${item.id}-${part}-${pIdx}`}
                                    className="px-2 py-1 text-xs font-semibold rounded-md border border-border/80 bg-muted/70 text-foreground shadow-2xs"
                                  >
                                    {part}
                                  </kbd>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center border border-border/60 text-muted-foreground mb-3">
                  <SearchX className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {t("common:shortcuts.no_results", "Tidak ada pintasan yang cocok")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Coba gunakan kata kunci nama halaman, modul, atau tombol aksi lainnya.
                </p>
              </div>
            )}
            <ModalOverlayScrollbar containerRef={listRef} topInset={12} bottomInset={12} rightInset={3} />
          </div>

          {/* Footer Info Platform */}
          <div className="px-5 sm:px-6 py-3 border-t border-border/60 bg-muted/30 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground select-none">
            <span className="truncate pr-2">
              {t("common:shortcuts.hint", "Gunakan pintasan keyboard untuk mempercepat navigasi")}
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border/70 bg-card text-foreground/80 shrink-0 shadow-2xs">
              {isMac ? "macOS (⌘)" : "Windows / Linux (Ctrl)"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
