import * as React from "react";
import {
  ArrowUpDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
} from "@/components/shared/toolbar-button";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { SearchInput } from "@/components/patterns/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type {
  LoginMediaCategory,
  LoginMediaItemRow,
} from "@/types/database.types";
import type { CategoryMetaMap } from "./login-media-types";

export interface LoginMediaTableProps {
  items: LoginMediaItemRow[];
  paginatedItems: LoginMediaItemRow[];
  totalFiltered: number;
  totalPages: number;
  safePage: number;
  startDisplay: number;
  endDisplay: number;
  pageNumbers: Array<number | "ellipsis">;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  categoryFilter: "all" | LoginMediaCategory;
  setCategoryFilter: (val: "all" | LoginMediaCategory) => void;
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (val: "all" | "active" | "inactive") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  filterOpen: boolean;
  setFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterRef: React.RefObject<HTMLDivElement | null>;
  pageSize: number;
  setPageSize: (val: number) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  categoryMeta: CategoryMetaMap;
  onOpenCreateDialog: () => void;
  onOpenEditDialog: (row: LoginMediaItemRow) => void;
  onToggleActive: (row: LoginMediaItemRow, next: boolean) => Promise<void>;
  onSetDeleteTarget: (row: LoginMediaItemRow) => void;
}

export function LoginMediaTable({
  items,
  paginatedItems,
  totalFiltered,
  totalPages,
  safePage,
  startDisplay,
  endDisplay,
  pageNumbers,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  filterOpen,
  setFilterOpen,
  filterRef,
  pageSize,
  setPageSize,
  setCurrentPage,
  categoryMeta,
  onOpenCreateDialog,
  onOpenEditDialog,
  onToggleActive,
  onSetDeleteTarget,
}: LoginMediaTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:login_media.table_title")}
        description={t("settings:login_media.table_desc")}
        action={
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("settings:login_media.search_input_placeholder")}
              containerClassName="w-full sm:w-56"
            />

            {/* Tombol Filter Gabungan (Kategori & Status) */}
            <div className="relative" ref={filterRef}>
              {categoryFilter === "all" && statusFilter === "all" ? (
                <ActionTooltip content={t("common:action.filter")}>
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => setFilterOpen((prev) => !prev)}
                    aria-expanded={filterOpen}
                    className={cn(TOOLBAR_BUTTON_CLASS, "cursor-pointer")}
                    aria-label={t("common:action.filter")}
                  >
                    <SlidersHorizontalIcon className="size-4 text-primary-foreground shrink-0" />
                    <span className="sr-only">{t("common:action.filter")}</span>
                  </Button>
                </ActionTooltip>
              ) : (
                <Button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  aria-expanded={filterOpen}
                  className={cn(TOOLBAR_ACTIVE_EXPANDED_CLASS, "cursor-pointer")}
                >
                  <SlidersHorizontalIcon className="size-3.5 text-primary-foreground shrink-0" />
                  <span>{t("common:action.filter")}</span>
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-primary text-[10px] font-bold tabular-nums">
                    {(categoryFilter !== "all" ? 1 : 0) +
                      (statusFilter !== "all" ? 1 : 0)}
                  </span>
                </Button>
              )}

              {filterOpen ? (
                <div className="absolute right-0 top-full mt-2 z-50 w-68 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {t("settings:login_media.filter_media_title")}
                    </span>
                    {categoryFilter !== "all" || statusFilter !== "all" ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setCategoryFilter("all");
                          setStatusFilter("all");
                        }}
                        className="h-auto p-0 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        {t("common:action.reset")}
                      </Button>
                    ) : null}
                  </div>

                  <div className="p-3.5 space-y-4">
                    <div className="space-y-1.5">
                      <p className="px-1 text-xs font-semibold text-muted-foreground">
                        {t("settings:login_media.filter_category")}
                      </p>
                      <div className="space-y-1">
                        {(
                          [
                            {
                              value: "all",
                              label: t("settings:login_media.filter_all_cat"),
                            },
                            {
                              value: "banner",
                              label: t("settings:login_media.filter_banner"),
                            },
                            {
                              value: "flyer",
                              label: t("settings:login_media.filter_flyer"),
                            },
                            {
                              value: "medsos",
                              label: t("settings:login_media.filter_medsos"),
                            },
                          ] as const
                        ).map((opt) => {
                          const active = categoryFilter === opt.value;
                          return (
                            <Button
                              key={opt.value}
                              type="button"
                              variant="ghost"
                              onClick={() => setCategoryFilter(opt.value)}
                              className={`w-full flex items-center justify-between px-3 py-2 h-auto rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                active
                                  ? "bg-primary/12 text-primary dark:text-sky-400 font-semibold"
                                  : "text-foreground hover:bg-muted/60"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {active ? (
                                <CheckIcon className="size-3.5 shrink-0" />
                              ) : null}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-border/70" />

                    <div className="space-y-2">
                      <p className="px-1 text-xs font-semibold text-muted-foreground">
                        {t("settings:login_media.filter_status_heading")}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/70 bg-muted/35 p-1">
                        {(
                          [
                            {
                              value: "all",
                              label: t("settings:login_media.filter_all"),
                            },
                            {
                              value: "active",
                              label: t("settings:login_media.filter_active"),
                            },
                            {
                              value: "inactive",
                              label: t("settings:login_media.filter_inactive"),
                            },
                          ] as const
                        ).map((opt) => (
                          <Button
                            key={opt.value}
                            type="button"
                            variant={statusFilter === opt.value ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setStatusFilter(opt.value)}
                            className={`py-1.5 px-2 h-auto rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                              statusFilter === opt.value
                                ? "bg-primary text-primary-foreground shadow-2xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            }`}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <ActionTooltip
              content={
                sortOrder === "asc"
                  ? t("settings:login_media.sort_order_asc")
                  : t("settings:login_media.sort_order_desc")
              }
            >
              <Button
                type="button"
                size="icon"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className={cn(TOOLBAR_BUTTON_CLASS, "cursor-pointer")}
                aria-label={
                  sortOrder === "asc"
                    ? t("settings:login_media.sort_order_asc")
                    : t("settings:login_media.sort_order_desc")
                }
              >
                <ArrowUpDownIcon className="size-4 text-primary-foreground shrink-0" />
                <span className="sr-only">
                  {sortOrder === "asc"
                    ? t("settings:login_media.sort_order_asc")
                    : t("settings:login_media.sort_order_desc")}
                </span>
              </Button>
            </ActionTooltip>

            <ActionTooltip content={t("settings:login_media.btn_add", "Tambah Media Carousel")}>
              <Button
                type="button"
                size="icon"
                onClick={onOpenCreateDialog}
                className={cn(TOOLBAR_BUTTON_CLASS, "cursor-pointer")}
                aria-label={t("settings:login_media.btn_add", "Tambah Media Carousel")}
              >
                <PlusIcon className="size-4 text-primary-foreground shrink-0" />
                <span className="sr-only">{t("settings:login_media.btn_add", "Tambah Media Carousel")}</span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />
      <CardContent className="p-0 rounded-b-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 text-center font-semibold w-20 whitespace-nowrap">
                {t("settings:login_media.col_order")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold w-28 whitespace-nowrap">
                {t("settings:login_media.col_preview")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold">
                {t("settings:login_media.col_title_sub")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold w-36 whitespace-nowrap">
                {t("settings:login_media.col_category")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold w-36 whitespace-nowrap">
                {t("settings:login_media.col_link")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold w-32 whitespace-nowrap">
                {t("settings:login_media.col_status")}
              </TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold w-28 whitespace-nowrap">
                {t("common:table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("settings:login_media.empty_title")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {items.length === 0
                        ? t("settings:login_media.empty_hint_none")
                        : t("settings:login_media.empty_hint_items")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((row) => {
                const meta = categoryMeta[row.category];
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6 pr-3 text-center font-mono font-semibold tabular-nums whitespace-nowrap">
                      #{row.display_order}
                    </TableCell>
                    <TableCell className="px-3 text-center">
                      <div className="mx-auto h-11 w-20 rounded-xl border border-border/80 bg-muted/30 overflow-hidden flex items-center justify-center">
                        <img
                          src={row.image_url}
                          alt={row.title}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <p className="font-semibold text-foreground">
                        {row.title}
                      </p>
                      {row.subtitle ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {row.subtitle}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {t("settings:login_media.updated_at_label", {
                          date: formatDateTimeI18n(row.updated_at, language),
                        })}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone={meta.tone}
                          label={meta.label}
                          className="text-xs sm:text-sm leading-5"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-center whitespace-nowrap">
                      {row.link_url ? (
                        <ActionTooltip content={row.link_url} side="top">
                          <a
                            href={row.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm leading-5 font-medium text-foreground hover:text-primary dark:hover:text-sky-400 transition-colors max-w-32 truncate"
                          >
                            <span className="truncate">
                              {t("settings:login_media.open_link")}
                            </span>
                            <ExternalLinkIcon className="size-3.5 shrink-0" />
                          </a>
                        </ActionTooltip>
                      ) : (
                        <span className="text-xs sm:text-sm leading-5 text-muted-foreground">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-center whitespace-nowrap">
                      <div className="-my-px inline-flex items-center gap-2.5">
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(v) =>
                            void onToggleActive(row, v)
                          }
                          aria-label={t(
                            "settings:login_media.toast_status_active",
                            { title: row.title },
                          )}
                        />
                        <span
                          className={`text-xs sm:text-sm leading-5 font-medium ${
                            row.is_active
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row.is_active
                            ? t("settings:login_media.filter_active")
                            : t("settings:login_media.filter_inactive")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 -my-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title={t("settings:login_media.edit_media")}
                          className="size-8 rounded-lg text-primary dark:text-sky-400 hover:bg-primary/10"
                          onClick={() => onOpenEditDialog(row)}
                        >
                          <PencilIcon className="size-4" />
                          <span className="sr-only">
                            {t("settings:login_media.edit_media")}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title={t("settings:login_media.delete_media")}
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => onSetDeleteTarget(row)}
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">
                            {t("settings:login_media.delete_media")}
                          </span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Footer Paginasi Konsisten Audit Trail */}
        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
            {totalFiltered === 0
              ? t("settings:login_media.pagination_zero")
              : t("settings:login_media.pagination_summary", {
                  start: startDisplay,
                  end: endDisplay,
                  total: totalFiltered.toLocaleString("id-ID"),
                })}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title={t("settings:login_media.pagination_prev")}
                aria-label={t("settings:login_media.pagination_prev")}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>

              {pageNumbers.map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 text-xs text-muted-foreground select-none"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage(item)}
                    aria-current={item === safePage ? "page" : undefined}
                    className={
                      item === safePage
                        ? "size-8 rounded-lg bg-primary/15 text-primary dark:text-sky-400 font-semibold hover:bg-primary/20 cursor-pointer tabular-nums"
                        : "size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer tabular-nums"
                    }
                  >
                    {item}
                  </Button>
                ),
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                title={t("settings:login_media.pagination_next")}
                aria-label={t("settings:login_media.pagination_next")}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>

            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-16 rounded-xl text-xs tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
