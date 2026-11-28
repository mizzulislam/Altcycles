import * as React from "react";
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  PencilIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortcutDisplay, type NavigationShortcutItem, type ShortcutGroup } from "@/lib/navigation-shortcuts-registry";
import type { UserRole } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { getRoleBadgeClass, type ShortcutSortOption } from "./shortcuts-types";

export interface ShortcutsTableProps {
  sortedItems: NavigationShortcutItem[];
  overrides: Record<string, string[]>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  activeFilterCount: number;
  filterMenuOpen: boolean;
  setFilterMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterBtnRef: React.RefObject<HTMLButtonElement | null>;
  sortBy: ShortcutSortOption;
  sortMenuOpen: boolean;
  setSortMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sortBtnRef: React.RefObject<HTMLButtonElement | null>;
  customCount: number;
  onResetAllClick: () => void;
  onOpenEdit: (item: NavigationShortcutItem) => void;
  onResetSingle: (item: NavigationShortcutItem) => void;
  isMac: boolean;
  roleLabels: Record<UserRole, string>;
  groupLabels: Record<ShortcutGroup, string>;
}

export function ShortcutsTable({
  sortedItems,
  overrides,
  searchQuery,
  setSearchQuery,
  activeFilterCount,
  filterMenuOpen,
  setFilterMenuOpen,
  filterBtnRef,
  sortBy,
  sortMenuOpen,
  setSortMenuOpen,
  sortBtnRef,
  customCount,
  onResetAllClick,
  onOpenEdit,
  onResetSingle,
  isMac,
  roleLabels,
  groupLabels,
}: ShortcutsTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
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
            {activeFilterCount === 0 ? (
              <ActionTooltip content={t("shortcuts.btn_filter", "Filter")}>
                <Button
                  ref={filterBtnRef}
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSortMenuOpen(false);
                    setFilterMenuOpen((prev) => !prev);
                  }}
                  className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80"
                  aria-label={t("shortcuts.btn_filter", "Filter")}
                >
                  <SlidersHorizontalIcon className="size-4 text-primary" />
                  <span className="sr-only">{t("shortcuts.btn_filter", "Filter")}</span>
                </Button>
              </ActionTooltip>
            ) : (
              <Button
                ref={filterBtnRef}
                type="button"
                variant="outline"
                onClick={() => {
                  setSortMenuOpen(false);
                  setFilterMenuOpen((prev) => !prev);
                }}
                className="h-9 rounded-xl px-3 text-xs sm:text-sm font-semibold gap-2 border-primary/50 text-primary bg-primary/5 transition-colors"
              >
                <SlidersHorizontalIcon className="size-4" />
                <span>{t("shortcuts.btn_filter", "Filter")}</span>
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
                  {activeFilterCount}
                </span>
                <ChevronDownIcon className={cn("size-3.5 opacity-60 transition-transform", filterMenuOpen && "rotate-180")} />
              </Button>
            )}

            {/* Sort Dropdown Button */}
            {sortBy === "default" ? (
              <ActionTooltip content={t("shortcuts.btn_sort", "Urutkan")}>
                <Button
                  ref={sortBtnRef}
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFilterMenuOpen(false);
                    setSortMenuOpen((prev) => !prev);
                  }}
                  className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80"
                  aria-label={t("shortcuts.btn_sort", "Urutkan")}
                >
                  <ArrowUpDownIcon className="size-4 text-primary" />
                  <span className="sr-only">{t("shortcuts.btn_sort", "Urutkan")}</span>
                </Button>
              </ActionTooltip>
            ) : (
              <Button
                ref={sortBtnRef}
                type="button"
                variant="outline"
                onClick={() => {
                  setFilterMenuOpen(false);
                  setSortMenuOpen((prev) => !prev);
                }}
                className="h-9 rounded-xl px-3 text-xs sm:text-sm font-semibold gap-2 border-primary/50 text-primary bg-primary/5 transition-colors"
              >
                <ArrowUpDownIcon className="size-4" />
                <span>{t("shortcuts.btn_sort", "Urutkan")}</span>
                <ChevronDownIcon className={cn("size-3.5 opacity-60 transition-transform", sortMenuOpen && "rotate-180")} />
              </Button>
            )}

            {/* Reset All Button */}
            <ActionTooltip content={t("shortcuts.reset_all", "Reset Semua ke Default")}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onResetAllClick}
                disabled={customCount === 0}
                className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80"
                aria-label={t("shortcuts.reset_all", "Reset Semua ke Default")}
              >
                <RotateCcwIcon className="size-4" />
                <span className="sr-only">{t("shortcuts.reset_all", "Reset Semua ke Default")}</span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />

      {/* Data Table */}
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 max-sm:pl-3 text-center text-xs sm:text-sm font-semibold min-w-[220px] max-sm:min-w-[170px]">
                {t("shortcuts.col_action", "Aksi & Modul")}
              </TableHead>
              <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[150px] max-sm:min-w-[130px]">
                {t("shortcuts.col_roles", "Peran Akses")}
              </TableHead>
              <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[140px] max-sm:min-w-[110px]">
                {t("shortcuts.col_default_keys", "Tombol Bawaan")}
              </TableHead>
              <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[140px] max-sm:min-w-[110px]">
                {t("shortcuts.col_effective_keys", "Tombol Efektif")}
              </TableHead>
              <TableHead className="text-center text-xs sm:text-sm font-semibold min-w-[100px] max-sm:min-w-[80px]">
                {t("shortcuts.col_status", "Status")}
              </TableHead>
              <TableHead className="pr-6 max-sm:pr-3 text-center text-xs sm:text-sm font-semibold w-24">
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
                    <TableCell className="pl-6 max-sm:pl-3 align-top">
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
                    <TableCell className="pr-6 max-sm:pr-3 align-top text-center">
                      <div className="flex items-center justify-center gap-1 -my-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={item.isLocked}
                          onClick={() => onOpenEdit(item)}
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
                          onClick={() => onResetSingle(item)}
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
  );
}
