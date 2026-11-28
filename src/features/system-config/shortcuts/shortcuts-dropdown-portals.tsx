import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { ShortcutSortOption } from "./shortcuts-types";

export interface ShortcutsDropdownPortalsProps {
  filterMenuOpen: boolean;
  filterCoords: { top: number; left: number } | null;
  filterMenuRef: React.RefObject<HTMLDivElement | null>;
  activeFilterCount: number;
  groupFilter: string;
  setGroupFilter: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sortMenuOpen: boolean;
  sortCoords: { top: number; left: number } | null;
  sortMenuRef: React.RefObject<HTMLDivElement | null>;
  sortBy: ShortcutSortOption;
  setSortBy: (val: ShortcutSortOption) => void;
  setSortMenuOpen: (open: boolean) => void;
}

export function ShortcutsDropdownPortals({
  filterMenuOpen,
  filterCoords,
  filterMenuRef,
  activeFilterCount,
  groupFilter,
  setGroupFilter,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  sortMenuOpen,
  sortCoords,
  sortMenuRef,
  sortBy,
  setSortBy,
  setSortMenuOpen,
}: ShortcutsDropdownPortalsProps) {
  const { t } = useLanguage();

  return (
    <>
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
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setGroupFilter("all");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                    className="h-auto p-0 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {t("shortcuts.reset_filter", "Reset")}
                  </Button>
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
                <Button
                  key={opt.value}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSortBy(opt.value);
                    setSortMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 h-auto rounded-xl text-xs font-medium transition-colors cursor-pointer text-left",
                    sortBy === opt.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50",
                  )}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.value && <CheckIcon className="size-3.5 text-primary" />}
                </Button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
