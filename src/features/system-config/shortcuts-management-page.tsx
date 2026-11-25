import * as React from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangleIcon,
  ArrowUpDownIcon,
  CheckIcon,
  ChevronDownIcon,
  KeyboardIcon,
  LockIcon,
  PencilIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BROWSER_RESERVED_COMBOS,
  checkShortcutConflict,
  formatShortcutDisplay,
  getShortcutOverrides,
  isMacPlatform,
  NAVIGATION_SHORTCUTS_REGISTRY,
  resetAllShortcutOverrides,
  resetShortcutOverride,
  saveShortcutOverride,
  type NavigationShortcutItem,
  type ShortcutGroup,
} from "@/lib/navigation-shortcuts-registry";
import type { UserRole } from "@/types/database.types";
import { cn } from "@/lib/utils";

function getRoleBadgeClass(role: UserRole) {
  switch (role) {
    case "super_admin":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    case "admin":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "user":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    default:
      return "bg-muted/50 text-muted-foreground border-border/70";
  }
}

type ShortcutSortOption = "default" | "name_asc" | "name_desc" | "group" | "status";

export function ShortcutsManagementPage() {
  const { t, language } = useLanguage();
  const [isMac, setIsMac] = React.useState(false);
  const [overrides, setOverrides] = React.useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<ShortcutSortOption>("default");

  // Filter Dropdown Portal State
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const filterBtnRef = React.useRef<HTMLButtonElement>(null);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);
  const [filterCoords, setFilterCoords] = React.useState<{ top: number; left: number } | null>(null);

  // Sort Dropdown Portal State
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false);
  const sortBtnRef = React.useRef<HTMLButtonElement>(null);
  const sortMenuRef = React.useRef<HTMLDivElement>(null);
  const [sortCoords, setSortCoords] = React.useState<{ top: number; left: number } | null>(null);

  // Dialog State: Edit Single Shortcut
  const [editingItem, setEditingItem] = React.useState<NavigationShortcutItem | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [recordedKeys, setRecordedKeys] = React.useState<string[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingError, setRecordingError] = React.useState<string | null>(null);
  const recordInputRef = React.useRef<HTMLDivElement>(null);

  // Dialog State: Confirm Reset All
  const [resetAllOpen, setResetAllOpen] = React.useState(false);

  // Sync state from registry & localStorage
  const refreshOverrides = React.useCallback(() => {
    setOverrides(getShortcutOverrides());
  }, []);

  React.useEffect(() => {
    setIsMac(isMacPlatform());
    refreshOverrides();

    const handleUpdated = () => {
      refreshOverrides();
    };

    window.addEventListener("altcycles:shortcuts-updated", handleUpdated);
    window.addEventListener("storage", handleUpdated);
    return () => {
      window.removeEventListener("altcycles:shortcuts-updated", handleUpdated);
      window.removeEventListener("storage", handleUpdated);
    };
  }, [refreshOverrides]);

  const activeFilterCount =
    (groupFilter !== "all" ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  // Position recalculation for filter dropdown
  const updateFilterPosition = React.useCallback(() => {
    const btn = filterBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 280;
    const estimatedHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;
    const top = openUpward ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
    const rawLeft = rect.right - menuWidth;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12));
    setFilterCoords({ top, left });
  }, []);

  // Position recalculation for sort dropdown
  const updateSortPosition = React.useCallback(() => {
    const btn = sortBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 220;
    const estimatedHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;
    const top = openUpward ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
    const rawLeft = rect.right - menuWidth;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12));
    setSortCoords({ top, left });
  }, []);

  React.useEffect(() => {
    if (!filterMenuOpen) return;
    updateFilterPosition();
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!filterBtnRef.current?.contains(t) && !filterMenuRef.current?.contains(t)) {
        setFilterMenuOpen(false);
      }
    }
    function handleScroll() {
      updateFilterPosition();
    }
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [filterMenuOpen, updateFilterPosition]);

  React.useEffect(() => {
    if (!sortMenuOpen) return;
    updateSortPosition();
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!sortBtnRef.current?.contains(t) && !sortMenuRef.current?.contains(t)) {
        setSortMenuOpen(false);
      }
    }
    function handleScroll() {
      updateSortPosition();
    }
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [sortMenuOpen, updateSortPosition]);

  // Derived statistics
  const totalItems = NAVIGATION_SHORTCUTS_REGISTRY.length;
  const customCount = React.useMemo(() => {
    return Object.entries(overrides).filter(([id, customKeys]) => {
      const reg = NAVIGATION_SHORTCUTS_REGISTRY.find((item) => item.id === id);
      if (!reg || reg.isLocked) return false;
      return JSON.stringify(reg.defaultKeys) !== JSON.stringify(customKeys);
    }).length;
  }, [overrides]);
  const lockedCount = NAVIGATION_SHORTCUTS_REGISTRY.filter((it) => it.isLocked).length;

  // Role labels
  const roleLabels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin: t("role.admin", "Bendahara"),
    user: t("role.user", "Anggota Tim"),
  };

  const groupLabels: Record<ShortcutGroup, string> = {
    general: t("shortcuts.group_general", "Umum"),
    navigation: t("shortcuts.group_navigation", "Navigasi"),
    quick_action: t("shortcuts.group_quick_action", "Aksi Cepat"),
  };

  // Filtered shortcut list
  const filteredItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return NAVIGATION_SHORTCUTS_REGISTRY.filter((item) => {
      const isCustomized = Boolean(overrides[item.id]);
      const effectiveKeys = (isCustomized && overrides[item.id] ? overrides[item.id] : item.defaultKeys) || [];

      // Group filter
      if (groupFilter !== "all" && item.group !== groupFilter) return false;

      // Role filter
      if (roleFilter !== "all" && !item.allowedRoles.includes(roleFilter as UserRole)) return false;

      // Status filter
      if (statusFilter === "locked" && !item.isLocked) return false;
      if (statusFilter === "custom" && !isCustomized) return false;
      if (statusFilter === "default" && (item.isLocked || isCustomized)) return false;

      // Text search
      if (q) {
        const itemTitle = t(item.titleKey, item.fallbackTitle).toLowerCase();
        const moduleLabel = t(item.moduleLabelKey, item.fallbackModuleLabel).toLowerCase();
        const aliasList = [
          ...(item.aliases.id || []),
          ...(item.aliases.en || []),
        ].map((a) => a.toLowerCase());
        const defaultKeysStr = item.defaultKeys.join(" ").toLowerCase();
        const effectiveKeysStr = effectiveKeys.join(" ").toLowerCase();

        const matchText =
          itemTitle.includes(q) ||
          moduleLabel.includes(q) ||
          item.id.toLowerCase().includes(q) ||
          defaultKeysStr.includes(q) ||
          effectiveKeysStr.includes(q) ||
          aliasList.some((al) => al.includes(q));

        if (!matchText) return false;
      }

      return true;
    });
  }, [groupFilter, overrides, roleFilter, searchQuery, statusFilter, t]);

  // Sorted shortcut list
  const sortedItems = React.useMemo(() => {
    const list = [...filteredItems];
    if (sortBy === "name_asc") {
      list.sort((a, b) => {
        const titleA = t(a.titleKey, a.fallbackTitle).toLowerCase();
        const titleB = t(b.titleKey, b.fallbackTitle).toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => {
        const titleA = t(a.titleKey, a.fallbackTitle).toLowerCase();
        const titleB = t(b.titleKey, b.fallbackTitle).toLowerCase();
        return titleB.localeCompare(titleA);
      });
    } else if (sortBy === "group") {
      list.sort((a, b) => a.group.localeCompare(b.group));
    } else if (sortBy === "status") {
      const getStatusRank = (it: NavigationShortcutItem) => {
        const isCust = Boolean(overrides[it.id]);
        if (isCust) return 1;
        if (it.isLocked) return 3;
        return 2;
      };
      list.sort((a, b) => getStatusRank(a) - getStatusRank(b));
    }
    return list;
  }, [filteredItems, overrides, sortBy, t]);

  // Open Edit Dialog
  const handleOpenEdit = (item: NavigationShortcutItem) => {
    if (item.isLocked) return;
    const currentKeys = overrides[item.id] || item.defaultKeys;
    setEditingItem(item);
    setRecordedKeys([...currentKeys]);
    setIsRecording(false);
    setRecordingError(null);
    setEditOpen(true);
  };

  // Reset Single Shortcut
  const handleResetSingle = (item: NavigationShortcutItem) => {
    resetShortcutOverride(item.id);
    refreshOverrides();
    toast.success(t("shortcuts.toast_reset_single", "Pintasan berhasil dikembalikan ke bawaan"));
  };

  // Confirm Reset All
  const handleConfirmResetAll = () => {
    resetAllShortcutOverrides();
    refreshOverrides();
    toast.success(t("shortcuts.toast_reset_all", "Semua pintasan berhasil dikembalikan ke bawaan pabrik"));
    setResetAllOpen(false);
  };

  // Keyboard recording handler in Edit Dialog
  const handleRecordKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isRecording || !editingItem) return;

    e.preventDefault();
    e.stopPropagation();

    const key = e.key;

    // Ignore standalone modifier presses while held
    if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
      return;
    }

    const lowerKey = key.toLowerCase();

    // Check if user pressed Escape to cancel recording
    if (lowerKey === "escape") {
      setIsRecording(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push("mod");
    if (e.altKey) modifiers.push("alt");
    if (e.shiftKey && modifiers.length > 0) modifiers.push("shift");

    let combo: string[] = [];

    // Modifier combination (e.g. Mod + Shift + F or Mod + K)
    if (modifiers.length > 0) {
      combo = [...modifiers, lowerKey];
    } else if (lowerKey === "g") {
      // Begin sequence: G then [key]
      combo = ["g"];
      setRecordedKeys(combo);
      setRecordingError(null);
      return;
    } else if (recordedKeys.length === 1 && recordedKeys[0]?.toLowerCase() === "g") {
      // Second key in sequence
      combo = ["g", lowerKey];
    } else if (lowerKey === "/" || lowerKey === "?") {
      // Allowed special single keys
      combo = [lowerKey];
    } else {
      // Disallowed bare single character (e.g. just 'a' or '1')
      setRecordingError(t("shortcuts.rule_disallowed_single", "Kombinasi tombol tidak valid. Gunakan kombinasi dengan Ctrl/Alt/Shift atau urutan huruf (misal: G lalu [huruf])."));
      setIsRecording(false);
      return;
    }

    // Check for browser reserved combinations
    const comboKey = combo.join("+");
    if (BROWSER_RESERVED_COMBOS.has(comboKey)) {
      setRecordingError(t("shortcuts.rule_browser_hijack", "Kombinasi tombol ini dilindungi oleh peramban/sistem operasi dan tidak dapat digunakan."));
      setIsRecording(false);
      return;
    }

    setRecordedKeys(combo);
    setIsRecording(false);
    setRecordingError(null);
  };

  // Preset button helper to apply quick sequence or mod combination
  const handleApplyPreset = (type: "sequence" | "modifier", char: string) => {
    if (!editingItem) return;
    let combo: string[] = [];
    if (type === "sequence") {
      combo = ["g", char.toLowerCase()];
    } else {
      combo = ["mod", char.toLowerCase()];
    }

    const comboKey = combo.join("+");
    if (BROWSER_RESERVED_COMBOS.has(comboKey)) {
      setRecordingError(t("shortcuts.rule_browser_hijack", "Kombinasi tombol ini dilindungi oleh peramban/sistem operasi dan tidak dapat digunakan."));
      return;
    }

    setRecordedKeys(combo);
    setRecordingError(null);
  };

  // Conflict evaluation for currently recorded keys
  const conflictResult = React.useMemo(() => {
    if (!editingItem || recordedKeys.length === 0) return { hasConflict: false };
    return checkShortcutConflict(editingItem.id, recordedKeys);
  }, [editingItem, recordedKeys]);

  // Save edited shortcut
  const handleSaveEdit = () => {
    if (
      !editingItem ||
      editingItem.isLocked ||
      recordedKeys.length === 0 ||
      (recordedKeys.length === 1 && recordedKeys[0]?.toLowerCase() === "g") ||
      conflictResult.hasConflict ||
      recordingError
    ) {
      return;
    }

    const success = saveShortcutOverride(editingItem.id, recordedKeys);
    if (!success) {
      toast.error(t("shortcuts.toast_save_failed", "Gagal menyimpan pintasan"));
      return;
    }
    refreshOverrides();
    toast.success(t("shortcuts.toast_saved", "Pintasan keyboard berhasil diperbarui"));
    setEditOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Halaman Terstandar */}
      <PageHeader
        title={t("shortcuts.management_title", "Pintasan Keyboard")}
        description={t(
          "shortcuts.management_desc",
          "Konfigurasi dan kelola pemetaan pintasan keyboard global untuk seluruh portal dan peran pengguna.",
        )}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => setResetAllOpen(true)}
            disabled={customCount === 0}
            className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold shrink-0 gap-2 border-border/80"
          >
            <RotateCcwIcon className="size-4" />
            <span>{t("shortcuts.reset_all", "Reset Semua ke Default")}</span>
          </Button>
        }
      />

      {/* 2. Kartu Ringkasan KPI (4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Terdaftar */}
        <KpiCard
          label={t("shortcuts.kpi_total", "Total Terdaftar")}
          value={totalItems}
          suffix={` ${t("shortcuts.unit_shortcuts", "Pintasan")}`}
          subtext={t("shortcuts.kpi_total_desc", "Pintasan global di registry")}
          icon={KeyboardIcon}
          iconTone="text-primary dark:text-sky-400 bg-primary/10 border-primary/20"
        />

        {/* Pintasan Kustom */}
        <KpiCard
          label={t("shortcuts.kpi_custom", "Pintasan Kustom")}
          value={customCount}
          suffix={` ${t("shortcuts.unit_modified", "Dimodifikasi")}`}
          subtext={t("shortcuts.kpi_custom_desc", "Dimodifikasi dari bawaan")}
          icon={SlidersHorizontalIcon}
          iconTone="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        />

        {/* Sistem Terkunci */}
        <KpiCard
          label={t("shortcuts.kpi_locked", "Sistem Terkunci")}
          value={lockedCount}
          suffix={` ${t("shortcuts.unit_locked", "Terkunci")}`}
          subtext={t("shortcuts.kpi_locked_desc", "Proteksi tombol inti sistem")}
          icon={LockIcon}
          iconTone="text-muted-foreground bg-muted border-border"
        />

        {/* Cakupan Portal */}
        <KpiCard
          label={t("shortcuts.kpi_coverage", "Cakupan Portal")}
          displayValue={t("shortcuts.kpi_coverage_value", "3 Portal")}
          subtext={t("shortcuts.kpi_coverage_desc", "Super Admin, Bendahara, User")}
          icon={ShieldCheckIcon}
          iconTone="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />
      </div>

      {/* 3. Kartu Edge-to-Edge Tabel Pintasan */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        {/* Header & Filter Toolbar */}
        <CardHeaderWithInfo
          title={t("shortcuts.card_title", "Daftar Pemetaan Pintasan")}
          description={t(
            "shortcuts.card_desc",
            "Kelola kombinasi tombol cepat untuk membuka menu dan menjalankan fungsi operasional.",
          )}
          action={
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("shortcuts.search_placeholder", "Cari pintasan...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs sm:text-sm"
              />
            </div>

            {/* Combined Filter Dropdown Button */}
            <Button
              ref={filterBtnRef}
              type="button"
              variant="outline"
              onClick={() => {
                setSortMenuOpen(false);
                setFilterMenuOpen((prev) => !prev);
              }}
              className={cn(
                "h-9 rounded-xl px-3 text-xs sm:text-sm font-semibold gap-2 border-border/80 transition-colors",
                activeFilterCount > 0 && "border-primary/50 text-primary bg-primary/5",
              )}
            >
              <SlidersHorizontalIcon className="size-4" />
              <span>{t("shortcuts.btn_filter", "Filter")}</span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDownIcon className={cn("size-3.5 opacity-60 transition-transform", filterMenuOpen && "rotate-180")} />
            </Button>

            {/* Sort Dropdown Button */}
            <Button
              ref={sortBtnRef}
              type="button"
              variant="outline"
              onClick={() => {
                setFilterMenuOpen(false);
                setSortMenuOpen((prev) => !prev);
              }}
              className={cn(
                "h-9 rounded-xl px-3 text-xs sm:text-sm font-semibold gap-2 border-border/80 transition-colors",
                sortBy !== "default" && "border-primary/50 text-primary bg-primary/5",
              )}
            >
              <ArrowUpDownIcon className="size-4" />
              <span>{t("shortcuts.btn_sort", "Urutkan")}</span>
              <ChevronDownIcon className={cn("size-3.5 opacity-60 transition-transform", sortMenuOpen && "rotate-180")} />
            </Button>
          </div>
        }
      />

        {/* Data Table */}
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-center text-xs sm:text-sm font-semibold min-w-[220px]">
                  {t("shortcuts.col_action", "Aksi & Modul")}
                </TableHead>
                <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[150px]">
                  {t("shortcuts.col_roles", "Peran Akses")}
                </TableHead>
                <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[140px]">
                  {t("shortcuts.col_default_keys", "Tombol Bawaan")}
                </TableHead>
                <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[140px]">
                  {t("shortcuts.col_effective_keys", "Tombol Efektif")}
                </TableHead>
                <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[100px]">
                  {t("shortcuts.col_status", "Status")}
                </TableHead>
                <TableHead className="pr-6 text-center text-xs sm:text-sm font-semibold w-24">
                  {t("shortcuts.col_action_btn", "Aksi")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs sm:text-sm text-muted-foreground border-t border-dashed border-border/70 bg-muted/10"
                  >
                    {t("shortcuts.no_results", "Tidak ada pintasan yang cocok")}
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => {
                  const isCustomized = Boolean(overrides[item.id]);
                  const effectiveKeys = (isCustomized && overrides[item.id] ? overrides[item.id] : item.defaultKeys) || [];
                  const defaultDisplay = formatShortcutDisplay(item.defaultKeys, isMac, language);
                  const effectiveDisplay = formatShortcutDisplay(effectiveKeys, isMac, language);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      {/* Aksi & Modul */}
                      <TableCell className="pl-6 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground text-xs sm:text-sm">
                            {t(item.titleKey, item.fallbackTitle)}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-medium text-muted-foreground">
                              {t(item.moduleLabelKey, item.fallbackModuleLabel)}
                            </Badge>
                            {t(item.moduleLabelKey, item.fallbackModuleLabel).toLowerCase() !==
                              (groupLabels[item.group] || item.group).toLowerCase() && (
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-medium">
                                {groupLabels[item.group] || item.group}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Peran Akses */}
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {item.allowedRoles.map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className={cn(
                                "text-[11px] px-2 py-0.5 rounded-md font-medium border",
                                getRoleBadgeClass(r),
                              )}
                            >
                              {roleLabels[r] || r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      {/* Tombol Bawaan */}
                      <TableCell className="align-top text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          {defaultDisplay.parts.map((part, idx) => (
                            <React.Fragment key={idx}>
                              {defaultDisplay.isSequence && idx === 1 && (
                                <span className="text-[11px] text-muted-foreground px-0.5 lowercase font-medium">
                                  {defaultDisplay.sequenceThenText}
                                </span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-muted/80 border border-border/70 text-[11px] font-mono font-medium text-muted-foreground shadow-2xs">
                                {part}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </TableCell>

                      {/* Tombol Efektif */}
                      <TableCell className="align-top text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          {effectiveDisplay.parts.map((part, idx) => (
                            <React.Fragment key={idx}>
                              {effectiveDisplay.isSequence && idx === 1 && (
                                <span className="text-[11px] text-muted-foreground px-0.5 lowercase font-medium">
                                  {effectiveDisplay.sequenceThenText}
                                </span>
                              )}
                              <kbd
                                className={cn(
                                  "inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md text-[11px] font-mono font-semibold shadow-2xs",
                                  isCustomized
                                    ? "bg-primary/10 border border-primary/30 text-primary dark:text-sky-400"
                                    : "bg-muted/80 border border-border/70 text-foreground",
                                )}
                              >
                                {part}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="align-top text-center">
                        {isCustomized ? (
                          <StatusBadge
                            tone="info"
                            label={t("shortcuts.status_custom", "Kustom")}
                            className="text-[11px]"
                          />
                        ) : item.isLocked ? (
                          <StatusBadge
                            tone="secondary"
                            label={t("shortcuts.status_locked", "Terkunci")}
                            className="text-[11px]"
                          />
                        ) : (
                          <StatusBadge
                            tone="success"
                            label={t("shortcuts.status_default", "Bawaan")}
                            className="text-[11px]"
                          />
                        )}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="pr-6 align-top text-center">
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={item.isLocked}
                            onClick={() => handleOpenEdit(item)}
                            title={
                              item.isLocked
                                ? t("shortcuts.locked_tooltip", "Pintasan inti sistem terkunci dan tidak dapat diubah")
                                : t("common:action.edit", "Edit")
                            }
                            className="size-8 rounded-lg text-primary dark:text-sky-400 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            <PencilIcon className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!isCustomized || item.isLocked}
                            onClick={() => handleResetSingle(item)}
                            title={t("shortcuts.reset_shortcut", "Reset ke Bawaan")}
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            <RotateCcwIcon className="size-4" />
                            <span className="sr-only">Reset</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Portal Dropdown Menu: Filter Terpadu */}
      {filterMenuOpen && filterCoords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={filterMenuRef}
              style={{
                position: "fixed",
                top: `${filterCoords.top}px`,
                left: `${filterCoords.left}px`,
                width: "280px",
              }}
              className="z-[99999] rounded-2xl border border-border/80 bg-card p-4 shadow-xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-bold text-foreground">
                  {t("shortcuts.filter_title", "Filter Pintasan")}
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupFilter("all");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {t("shortcuts.reset_filter", "Reset")}
                  </button>
                )}
              </div>

              {/* Group Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t("shortcuts.filter_group_label", "Grup Aksi")}
                </label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-8.5 w-full rounded-xl text-xs">
                    <SelectValue placeholder={t("shortcuts.filter_all_groups", "Semua Grup")} />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    <SelectGroup>
                      <SelectItem value="all">{t("shortcuts.filter_all_groups", "Semua Grup")}</SelectItem>
                      <SelectItem value="general">{t("shortcuts.group_general", "Umum")}</SelectItem>
                      <SelectItem value="navigation">{t("shortcuts.group_navigation", "Navigasi")}</SelectItem>
                      <SelectItem value="quick_action">{t("shortcuts.group_quick_action", "Aksi Cepat")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t("shortcuts.filter_role_label", "Peran Akses")}
                </label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8.5 w-full rounded-xl text-xs">
                    <SelectValue placeholder={t("shortcuts.filter_all_roles", "Semua Peran")} />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    <SelectGroup>
                      <SelectItem value="all">{t("shortcuts.filter_all_roles", "Semua Peran")}</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">{t("role.admin", "Bendahara")}</SelectItem>
                      <SelectItem value="user">{t("role.user", "Anggota Tim")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t("shortcuts.filter_status_label", "Status Pintasan")}
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8.5 w-full rounded-xl text-xs">
                    <SelectValue placeholder={t("shortcuts.filter_all_statuses", "Semua Status")} />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    <SelectGroup>
                      <SelectItem value="all">{t("shortcuts.filter_all_statuses", "Semua Status")}</SelectItem>
                      <SelectItem value="default">{t("shortcuts.status_default", "Bawaan")}</SelectItem>
                      <SelectItem value="custom">{t("shortcuts.status_custom", "Kustom")}</SelectItem>
                      <SelectItem value="locked">{t("shortcuts.status_locked", "Terkunci")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Portal Dropdown Menu: Sort Pengurutan */}
      {sortMenuOpen && sortCoords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={sortMenuRef}
              style={{
                position: "fixed",
                top: `${sortCoords.top}px`,
                left: `${sortCoords.left}px`,
                width: "220px",
              }}
              className="z-[99999] rounded-2xl border border-border/80 bg-card p-1.5 shadow-xl flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
            >
              {([
                { value: "default", label: "Urutan Bawaan" },
                { value: "name_asc", label: t("shortcuts.sort_name_asc", "Nama Aksi (A - Z)") },
                { value: "name_desc", label: t("shortcuts.sort_name_desc", "Nama Aksi (Z - A)") },
                { value: "group", label: t("shortcuts.sort_group", "Grup & Modul") },
                { value: "status", label: t("shortcuts.sort_status", "Status Pintasan") },
              ] as Array<{ value: ShortcutSortOption; label: string }>).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.value);
                    setSortMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left",
                    sortBy === opt.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50",
                  )}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.value && <CheckIcon className="size-3.5 text-primary" />}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {/* 4. Modal Dialog: Edit Pintasan Keyboard */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("shortcuts.edit_title", "Ubah Pintasan Keyboard")}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="flex flex-col gap-4 py-1">
              {/* Target Action Info */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/70 flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">
                  {t(editingItem.moduleLabelKey, editingItem.fallbackModuleLabel)} • {groupLabels[editingItem.group]}
                </span>
                <p className="font-bold text-foreground text-base tracking-tight">
                  {t(editingItem.titleKey, editingItem.fallbackTitle)}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium">Peran:</span>
                  {editingItem.allowedRoles.map((r) => (
                    <Badge
                      key={r}
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md font-medium border",
                        getRoleBadgeClass(r),
                      )}
                    >
                      {roleLabels[r] || r}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Interactive Key Recorder Box */}
              <div className="flex flex-col gap-2">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  {t("shortcuts.new_shortcut", "Kombinasi Tombol Baru")}
                </label>

                <div
                  ref={recordInputRef}
                  tabIndex={0}
                  role="button"
                  aria-label="Area Perekaman Tombol"
                  onFocus={() => setIsRecording(true)}
                  onBlur={() => setIsRecording(false)}
                  onKeyDown={handleRecordKeyDown}
                  onClick={() => setIsRecording(true)}
                  className={cn(
                    "flex flex-col items-center justify-center min-h-[110px] p-4 rounded-xl border-2 transition-all cursor-pointer select-none text-center outline-hidden",
                    isRecording
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                      : "border-border/80 bg-background hover:bg-muted/30 hover:border-border",
                  )}
                >
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                      <p className="text-xs font-semibold text-primary">
                        {t("shortcuts.recording_active", "Merekam tombol... Tekan tombol kombinasi sekarang")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {recordedKeys.length === 1 && recordedKeys[0]?.toLowerCase() === "g"
                          ? "G telah ditekan. Tekan huruf kedua (misal: D, P, S)..."
                          : "Tekan tombol keyboard atau Esc untuk batal"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <KeyboardIcon className="size-5 text-muted-foreground/70" />
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {recordedKeys.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {t("shortcuts.recording_prompt", "Klik di sini lalu tekan kombinasi tombol di keyboard...")}
                          </span>
                        ) : (
                          (() => {
                            const disp = formatShortcutDisplay(recordedKeys, isMac, language);
                            return disp.parts.map((p, i) => (
                              <React.Fragment key={i}>
                                {disp.isSequence && i === 1 && (
                                  <span className="text-xs text-muted-foreground font-medium px-1">
                                    {disp.sequenceThenText}
                                  </span>
                                )}
                                <kbd className="inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-lg bg-card border border-border font-mono text-sm font-bold text-foreground shadow-xs">
                                  {p}
                                </kbd>
                              </React.Fragment>
                            ));
                          })()
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Klik area untuk merekam ulang
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Sequence / Modifier Presets */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Pilihan Cepat (Format Standar):
                </span>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["D", "P", "S", "K", "A", "M"].map((ch) => (
                      <Button
                        key={ch}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-xl px-2.5 font-mono cursor-pointer"
                        onClick={() => handleApplyPreset("sequence", ch)}
                      >
                        G lalu {ch}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-xl px-2.5 text-muted-foreground hover:text-foreground font-mono cursor-pointer"
                    onClick={() => {
                      setRecordedKeys([...editingItem.defaultKeys]);
                      setRecordingError(null);
                    }}
                  >
                    Bawaan: {editingItem.defaultKeys.join("+")}
                  </Button>
                </div>
              </div>

              {/* Validation & Conflict Warnings */}
              {recordingError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <span>{recordingError}</span>
                </div>
              )}

              {conflictResult.hasConflict && conflictResult.conflictingItem && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {t("shortcuts.conflict_warning", "Konflik tombol terdeteksi dengan")}:{" "}
                      {t(conflictResult.conflictingItem.titleKey, conflictResult.conflictingItem.fallbackTitle)}
                    </span>
                    <span className="text-destructive/90 text-[11px]">
                      {t(
                        "shortcuts.conflict_warning_desc",
                        "Pintasan ini bentrok dengan aksi lain yang memiliki peran akses yang sama. Harap gunakan kombinasi tombol lain.",
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="rounded-xl h-9 px-4 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t("common:action.cancel", "Batal")}
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={
                recordedKeys.length === 0 ||
                conflictResult.hasConflict ||
                Boolean(recordingError)
              }
              className="rounded-xl h-9 px-4 text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer"
            >
              <CheckIcon className="size-4" />
              <span>{t("shortcuts.save_shortcut", "Simpan Perubahan")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Dialog Konfirmasi: Reset Semua Pintasan */}
      <ConfirmActionDialog
        open={resetAllOpen}
        onOpenChange={setResetAllOpen}
        title={t("shortcuts.reset_all_title", "Reset Semua Pintasan ke Bawaan?")}
        description={t(
          "shortcuts.reset_all_desc",
          "Seluruh konfigurasi pintasan keyboard kustom yang telah dibuat akan dihapus dan dikembalikan ke pengaturan bawaan pabrik sistem.",
        )}
        confirmLabel={t("shortcuts.reset_all_confirm", "Ya, Reset Semua")}
        cancelLabel={t("common:action.cancel", "Batal")}
        destructive={true}
        onConfirm={handleConfirmResetAll}
      />
    </div>
  );
}
