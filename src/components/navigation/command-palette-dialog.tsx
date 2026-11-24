import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Building,
  Building2,
  Calendar,
  ClipboardList,
  Coins,
  CreditCard,
  FileSignature,
  FileSpreadsheet,
  FolderKanban,
  HandCoins,
  Image as ImageIcon,
  Keyboard,
  LayoutDashboard,
  ListTree,
  Lock,
  PlusCircle,
  Receipt,
  ReceiptText,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModalOverlayScrollbar } from "@/components/ui/modal-overlay-scrollbar";
import type { UserRole } from "@/types/database.types";
import {
  type NavigationShortcutItem,
  getDefaultFrequentFallback,
  getEffectiveShortcuts,
  searchRegistry,
} from "@/lib/navigation-shortcuts-registry";
import { getFrequentPageIds, recordPageVisit } from "@/lib/navigation-history";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  BookOpen,
  Building,
  Building2,
  Calendar,
  ClipboardList,
  Coins,
  CreditCard,
  FileSignature,
  FileSpreadsheet,
  FolderKanban,
  HandCoins,
  Image: ImageIcon,
  Keyboard,
  LayoutDashboard,
  ListTree,
  Lock,
  PlusCircle,
  Receipt,
  ReceiptText,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  X,
};

interface CommandPaletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutsPanel?: () => void;
  currentRole: UserRole;
}

export function CommandPaletteDialog({
  isOpen,
  onClose,
  onOpenShortcutsPanel,
  currentRole,
}: CommandPaletteDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Reset query dan selectedIndex saat modal dibuka
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Mengambil daftar item: Sering Dikunjungi / Pintasan vs Hasil Pencarian
  const allRoleItems = React.useMemo(() => {
    return getEffectiveShortcuts(currentRole);
  }, [currentRole]);

  const itemsMap = React.useMemo(() => {
    const map = new Map<string, NavigationShortcutItem>();
    allRoleItems.forEach((it) => map.set(it.id, it));
    return map;
  }, [allRoleItems]);

  // Menentukan daftar yang ditampilkan saat query kosong:
  // 1. Sering Dikunjungi (atau fallback pintasan bawaan)
  // 2. Aksi Cepat (termasuk "Tampilkan semua pintasan keyboard")
  const defaultFrequentItems = React.useMemo(() => {
    const frequentIds = getFrequentPageIds(currentRole, 5);
    const resolvedIds =
      frequentIds.length > 0 ? frequentIds : getDefaultFrequentFallback(currentRole);

    const items: NavigationShortcutItem[] = [];
    resolvedIds.forEach((id) => {
      const found = itemsMap.get(id);
      if (found && !items.some((it) => it.id === found.id)) {
        items.push(found);
      }
    });
    return items;
  }, [currentRole, itemsMap]);

  const quickActionItems = React.useMemo(() => {
    // Entri aksi cepat untuk role aktif + tombol buka pintasan
    const actions = allRoleItems.filter(
      (item) => item.group === "quick_action" || item.id === "action_open_shortcuts",
    );
    return actions;
  }, [allRoleItems]);

  // Hasil filter jika sedang mengetik
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchRegistry(searchQuery, currentRole, (k, f) => (f ? t(k, f) : t(k)));
  }, [searchQuery, currentRole, t]);

  // Flat list item untuk keyboard navigation
  const flatSelectableItems = React.useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return [...defaultFrequentItems, ...quickActionItems];
  }, [searchQuery, searchResults, defaultFrequentItems, quickActionItems]);

  // Jaga selectedIndex agar selalu dalam batas
  React.useEffect(() => {
    if (selectedIndex >= flatSelectableItems.length) {
      setSelectedIndex(0);
    }
  }, [flatSelectableItems.length, selectedIndex]);

  // Eksekusi pemilihan item
  const handleSelectItem = React.useCallback(
    (item: NavigationShortcutItem) => {
      onClose();

      if (item.id === "action_open_shortcuts") {
        if (onOpenShortcutsPanel) {
          onOpenShortcutsPanel();
        }
        return;
      }

      if (item.route) {
        recordPageVisit(item.id, currentRole);
        navigate(item.route);
      }
    },
    [navigate, onClose, onOpenShortcutsPanel, currentRole],
  );

  // Auto-scroll item aktif ke dalam tampilan container
  React.useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Penanganan tombol keyboard: ArrowDown, ArrowUp, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatSelectableItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, flatSelectableItems.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentItem = flatSelectableItems[selectedIndex];
      if (currentItem) {
        handleSelectItem(currentItem);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Helper render tombol shortcut badge
  const renderShortcutBadge = (keys: string[]) => {
    if (!keys || keys.length === 0) return null;

    const isSequence = keys.length === 2 && keys[0] === "g";
    const thenText = i18n.language.startsWith("en") ? "then" : "lalu";

    if (isSequence) {
      return (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
          <kbd className="px-1.5 py-0.5 rounded-md border border-border/80 bg-muted/60 font-semibold uppercase">
            {keys[0]}
          </kbd>
          <span className="text-[10px] text-muted-foreground/80 font-sans lowercase">
            {thenText}
          </span>
          <kbd className="px-1.5 py-0.5 rounded-md border border-border/80 bg-muted/60 font-semibold uppercase">
            {keys[1]}
          </kbd>
        </span>
      );
    }

    // Kombinasi tombol biasa
    return (
      <span className="flex items-center gap-1 text-[11px] font-mono">
        {keys.map((k, idx) => {
          let label = k.toUpperCase();
          if (k === "mod") label = "Ctrl";
          if (k === "shift") label = "Shift";
          return (
            <kbd
              key={`${k}-${idx}`}
              className="px-1.5 py-0.5 rounded-md border border-border/80 bg-muted/60 font-semibold text-muted-foreground"
            >
              {label}
            </kbd>
          );
        })}
      </span>
    );
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay gelap di belakang modal */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[120] bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        />

        {/* Kotak Modal Command Palette */}
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[121] w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border/80 bg-card shadow-2xl text-card-foreground outline-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <DialogPrimitive.Title className="sr-only">
            {t("common:search.placeholder", "Cari halaman...")}
          </DialogPrimitive.Title>

          {/* Baris Input Pencarian */}
          <div className="flex items-center px-6 sm:px-7 py-4 border-b border-border/70 bg-card">
            <Search className="size-4.5 text-muted-foreground/80 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls="command-palette-results"
              aria-activedescendant={
                flatSelectableItems[selectedIndex]
                  ? `palette-option-${flatSelectableItems[selectedIndex]?.id}`
                  : undefined
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={t(
                "common:search.modal_placeholder",
                "Ketik perintah, nama halaman, atau kata kunci...",
              )}
              className="w-full bg-transparent text-sm sm:text-[14.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none mx-4 px-2 py-0.5 leading-normal"
            />
            <div className="flex items-center gap-2 shrink-0">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
                  title={t("common:action.reset", "Reset")}
                >
                  <X className="size-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center justify-center font-mono text-[10px] font-medium px-2 py-0.5 rounded-md border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs select-none">
                Esc
              </kbd>
            </div>
          </div>

          {/* Isi Hasil / Daftar Pintasan */}
          <div
            ref={listRef}
            id="command-palette-results"
            role="listbox"
            className="max-h-[360px] overflow-y-auto scroll-smooth p-2 pr-2.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-contain relative"
          >
            {/* Mode Kosong: Menampilkan "Sering Dikunjungi" & "Aksi Cepat" */}
            {!searchQuery.trim() && (
              <div className="space-y-3">
                {/* Bagian 1: Sering Dikunjungi / Pintasan */}
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common:search.frequently_visited", "Sering Dikunjungi")}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {defaultFrequentItems.map((item) => {
                      const itemIndex = flatSelectableItems.findIndex((it) => it.id === item.id);
                      const isSelected = itemIndex === selectedIndex;
                      const IconComp = ICON_MAP[item.iconName] || LayoutDashboard;

                      return (
                        <button
                          key={item.id}
                          id={`palette-option-${item.id}`}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer group",
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/60 text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "size-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border/60 group-hover:text-foreground",
                              )}
                            >
                              <IconComp className="size-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold leading-tight truncate">
                                {t(item.titleKey, item.fallbackTitle)}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                                {t(item.moduleLabelKey, item.fallbackModuleLabel)}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 ml-3">
                            {renderShortcutBadge(item.defaultKeys)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bagian 2: Aksi Cepat */}
                <div className="pt-2 border-t border-border/50">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common:search.quick_actions", "Aksi Cepat")}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {quickActionItems.map((item) => {
                      const itemIndex = flatSelectableItems.findIndex((it) => it.id === item.id);
                      const isSelected = itemIndex === selectedIndex;
                      const IconComp = ICON_MAP[item.iconName] || PlusCircle;

                      return (
                        <button
                          key={item.id}
                          id={`palette-option-${item.id}`}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer group",
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/60 text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "size-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border/60 group-hover:text-foreground",
                              )}
                            >
                              <IconComp className="size-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold leading-tight truncate">
                                {t(item.titleKey, item.fallbackTitle)}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                                {t(item.moduleLabelKey, item.fallbackModuleLabel)}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 ml-3">
                            {renderShortcutBadge(item.defaultKeys)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Mode Pencarian: Hasil Filter */}
            {searchQuery.trim() && (
              <div>
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    {t("common:search.no_results", "Tidak ada halaman atau aksi yang cocok")}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {searchResults.map((item, idx) => {
                      const isSelected = idx === selectedIndex;
                      const IconComp = ICON_MAP[item.iconName] || LayoutDashboard;

                      return (
                        <button
                          key={item.id}
                          id={`palette-option-${item.id}`}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer group",
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/60 text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "size-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border/60 group-hover:text-foreground",
                              )}
                            >
                              <IconComp className="size-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold leading-tight truncate">
                                {t(item.titleKey, item.fallbackTitle)}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                                {t(item.moduleLabelKey, item.fallbackModuleLabel)}
                                {item.tabKey ? ` • Tab: ${item.tabKey}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 ml-3">
                            {renderShortcutBadge(item.defaultKeys)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <ModalOverlayScrollbar containerRef={listRef} topInset={6} bottomInset={6} rightInset={3} />
          </div>

          {/* Footer Navigasi Hint */}
          <div className="px-6 sm:px-7 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground select-none">
            <span className="truncate">
              {t(
                "common:search.navigation_hint",
                "Gunakan panah ↑↓ untuk memilih, Enter untuk membuka, Esc untuk menutup",
              )}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px]">
              <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 font-semibold">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 font-semibold">↓</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 font-semibold">↵</kbd>
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
