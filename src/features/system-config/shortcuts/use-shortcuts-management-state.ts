import * as React from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import {
  BROWSER_RESERVED_COMBOS,
  checkShortcutConflict,
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
import type { ShortcutSortOption } from "./shortcuts-types";

export function useShortcutsManagementState() {
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

  const totalItems = NAVIGATION_SHORTCUTS_REGISTRY.length;
  const customCount = React.useMemo(() => {
    return Object.entries(overrides).filter(([id, customKeys]) => {
      const reg = NAVIGATION_SHORTCUTS_REGISTRY.find((item) => item.id === id);
      if (!reg || reg.isLocked) return false;
      return JSON.stringify(reg.defaultKeys) !== JSON.stringify(customKeys);
    }).length;
  }, [overrides]);
  const lockedCount = NAVIGATION_SHORTCUTS_REGISTRY.filter((it) => it.isLocked).length;

  const roleLabels: Record<UserRole, string> = React.useMemo(() => ({
    super_admin: "Super Admin",
    admin: t("role.admin", "Bendahara"),
    user: t("role.user", "Anggota Tim"),
  }), [t]);

  const groupLabels: Record<ShortcutGroup, string> = React.useMemo(() => ({
    general: t("shortcuts.group_general", "Umum"),
    navigation: t("shortcuts.group_navigation", "Navigasi"),
    quick_action: t("shortcuts.group_quick_action", "Aksi Cepat"),
  }), [t]);

  const filteredItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return NAVIGATION_SHORTCUTS_REGISTRY.filter((item) => {
      const isCustomized = Boolean(overrides[item.id]);
      const effectiveKeys = (isCustomized && overrides[item.id] ? overrides[item.id] : item.defaultKeys) || [];

      if (groupFilter !== "all" && item.group !== groupFilter) return false;
      if (roleFilter !== "all" && !item.allowedRoles.includes(roleFilter as UserRole)) return false;

      if (statusFilter === "locked" && !item.isLocked) return false;
      if (statusFilter === "custom" && !isCustomized) return false;
      if (statusFilter === "default" && (item.isLocked || isCustomized)) return false;

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

  const handleOpenEdit = (item: NavigationShortcutItem) => {
    if (item.isLocked) return;
    const currentKeys = overrides[item.id] || item.defaultKeys;
    setEditingItem(item);
    setRecordedKeys([...currentKeys]);
    setIsRecording(false);
    setRecordingError(null);
    setEditOpen(true);
  };

  const handleResetSingle = (item: NavigationShortcutItem) => {
    resetShortcutOverride(item.id);
    refreshOverrides();
    toast.success(t("shortcuts.toast_reset_single", "Pintasan berhasil dikembalikan ke bawaan"));
  };

  const handleConfirmResetAll = () => {
    resetAllShortcutOverrides();
    refreshOverrides();
    toast.success(t("shortcuts.toast_reset_all", "Semua pintasan berhasil dikembalikan ke bawaan pabrik"));
    setResetAllOpen(false);
  };

  const handleRecordKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isRecording || !editingItem) return;

    e.preventDefault();
    e.stopPropagation();

    const key = e.key;

    if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
      return;
    }

    const lowerKey = key.toLowerCase();

    if (lowerKey === "escape") {
      setIsRecording(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push("mod");
    if (e.altKey) modifiers.push("alt");
    if (e.shiftKey && modifiers.length > 0) modifiers.push("shift");

    let combo: string[] = [];

    if (modifiers.length > 0) {
      combo = [...modifiers, lowerKey];
    } else if (lowerKey === "g") {
      combo = ["g"];
      setRecordedKeys(combo);
      setRecordingError(null);
      return;
    } else if (recordedKeys.length === 1 && recordedKeys[0]?.toLowerCase() === "g") {
      combo = ["g", lowerKey];
    } else if (lowerKey === "/" || lowerKey === "?") {
      combo = [lowerKey];
    } else {
      setRecordingError(t("shortcuts.rule_disallowed_single", "Kombinasi tombol tidak valid. Gunakan kombinasi dengan Ctrl/Alt/Shift atau urutan huruf (misal: G lalu [huruf])."));
      setIsRecording(false);
      return;
    }

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

  const conflictResult = React.useMemo(() => {
    if (!editingItem || recordedKeys.length === 0) return { hasConflict: false, conflictingItem: undefined };
    return checkShortcutConflict(editingItem.id, recordedKeys);
  }, [editingItem, recordedKeys]);

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

  return {
    t,
    language,
    isMac,
    overrides,
    searchQuery,
    setSearchQuery,
    groupFilter,
    setGroupFilter,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    filterMenuOpen,
    setFilterMenuOpen,
    filterBtnRef,
    filterMenuRef,
    filterCoords,
    sortMenuOpen,
    setSortMenuOpen,
    sortBtnRef,
    sortMenuRef,
    sortCoords,
    activeFilterCount,
    totalItems,
    customCount,
    lockedCount,
    roleLabels,
    groupLabels,
    sortedItems,
    editingItem,
    editOpen,
    setEditOpen,
    recordedKeys,
    setRecordedKeys,
    isRecording,
    setIsRecording,
    recordingError,
    setRecordingError,
    recordInputRef,
    conflictResult,
    resetAllOpen,
    setResetAllOpen,
    handleOpenEdit,
    handleResetSingle,
    handleConfirmResetAll,
    handleRecordKeyDown,
    handleApplyPreset,
    handleSaveEdit,
  };
}
