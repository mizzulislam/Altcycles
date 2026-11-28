import * as React from "react";
import {
  ArrowUpDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  ImageIcon,
  InfoIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TOOLBAR_BUTTON_CLASS } from "@/components/shared/toolbar-button";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import { PageLoader } from "@/components/ui/loader";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createLoginMediaItem,
  deleteLoginMediaItem,
  listAllLoginMedia,
  updateLoginMediaItem,
} from "@/lib/data-service";
import { formatDateTimeI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type {
  LoginMediaCategory,
  LoginMediaItemRow,
} from "@/types/database.types";

interface CategoryTickerItem {
  count: number;
  label: string;
  dotTone: string;
}

/**
 * Sub-komponen terisolasi untuk Cycling Ticker KPI ke-3 (Item 9).
 * Mengisolasi state interval 3,2 detik agar tidak memicu re-render penuh pada
 * seluruh halaman LoginMediaPage, pratinjau carousel, maupun tabel galeri gambar.
 */
const CategoryCompositionTicker = React.memo(function CategoryCompositionTicker({
  items,
}: {
  items: CategoryTickerItem[];
}) {
  const [activeTickerIdx, setActiveTickerIdx] = React.useState(0);
  const [tickerAnimating, setTickerAnimating] = React.useState(false);

  React.useEffect(() => {
    if (items.length <= 1) return;
    let innerTimeout: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      setTickerAnimating(true);
      innerTimeout = setTimeout(() => {
        setActiveTickerIdx((prev) => (prev + 1) % items.length);
        setTickerAnimating(false);
      }, 300);
    }, 3200);

    return () => {
      clearInterval(timer);
      if (innerTimeout) clearTimeout(innerTimeout);
    };
  }, [items.length]);

  const currentTicker = items[activeTickerIdx] ?? items[0] ?? {
    count: 0,
    label: "",
    dotTone: "bg-sky-400",
  };

  return (
    <div className="h-8 flex items-center mt-1 overflow-hidden">
      <div
        className={cn(
          "flex items-center transition-all duration-300 ease-out",
          tickerAnimating
            ? "-translate-y-4 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <span
          data-testid="login-media-category-ticker"
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums"
        >
          {currentTicker.count} {currentTicker.label}
        </span>
      </div>
    </div>
  );
});

export function LoginMediaPage() {
  const { t, language } = useLanguage();
  const categoryMeta: Record<
    LoginMediaCategory,
    { label: string; tone: "info" | "success" | "warning" }
  > = React.useMemo(
    () => ({
      banner: {
        label: t("settings:login_media.category_banner_label"),
        tone: "info",
      },
      flyer: {
        label: t("settings:login_media.category_flyer_label"),
        tone: "warning",
      },
      medsos: {
        label: t("settings:login_media.category_medsos_label"),
        tone: "success",
      },
    }),
    [t],
  );

  const [items, setItems] = React.useState<LoginMediaItemRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [usingLocalFallback, setUsingLocalFallback] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<
    "all" | LoginMediaCategory
  >("all");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [previewIdx, setPreviewIdx] = React.useState(0);

  React.useEffect(() => {
    if (!filterOpen) return;
    function handleOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [filterOpen]);

  // Modal Tambah / Edit Media
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<LoginMediaItemRow | null>(
    null,
  );
  const [titleInput, setTitleInput] = React.useState("");
  const [subtitleInput, setSubtitleInput] = React.useState("");
  const [categoryInput, setCategoryInput] =
    React.useState<LoginMediaCategory>("banner");
  const [imageUrlInput, setImageUrlInput] = React.useState<string | null>(null);
  const [linkUrlInput, setLinkUrlInput] = React.useState("");
  const [orderInput, setOrderInput] = React.useState(1);
  const [activeInput, setActiveInput] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Konfirmasi Hapus (Wajib ketik DELETE sesuai standar Super Admin)
  const [deleteTarget, setDeleteTarget] =
    React.useState<LoginMediaItemRow | null>(null);

  const tRef = React.useRef(t);
  tRef.current = t;

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllLoginMedia();
      setItems(res.items);
      setUsingLocalFallback(res.usingLocalFallback);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : tRef.current("settings:login_media.toast_load_err"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const activeItems = React.useMemo(
    () => items.filter((it) => it.is_active),
    [items],
  );

  React.useEffect(() => {
    if (previewIdx >= activeItems.length) {
      setPreviewIdx(0);
    }
  }, [activeItems.length, previewIdx]);

  function openCreateDialog() {
    setEditingItem(null);
    setTitleInput("");
    setSubtitleInput("");
    setCategoryInput("banner");
    setImageUrlInput(null);
    setLinkUrlInput("");
    setOrderInput(items.length + 1);
    setActiveInput(true);
    setDialogOpen(true);
  }

  function openEditDialog(row: LoginMediaItemRow) {
    setEditingItem(row);
    setTitleInput(row.title);
    setSubtitleInput(row.subtitle ?? "");
    setCategoryInput(row.category);
    setImageUrlInput(row.image_url);
    setLinkUrlInput(row.link_url ?? "");
    setOrderInput(row.display_order);
    setActiveInput(row.is_active);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!titleInput.trim()) {
      toast.error(t("settings:login_media.toast_title_req"));
      return;
    }
    if (!imageUrlInput) {
      toast.error(t("settings:login_media.toast_img_req"));
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const res = await updateLoginMediaItem(editingItem.id, {
          title: titleInput.trim(),
          subtitle: subtitleInput.trim() || null,
          category: categoryInput,
          image_url: imageUrlInput,
          link_url: linkUrlInput.trim() || null,
          display_order: Math.max(1, orderInput),
          is_active: activeInput,
        });
        setUsingLocalFallback(!res.savedToCloud);
        toast.success(
          t("settings:login_media.toast_updated", { title: editingItem.title }),
        );
      } else {
        const res = await createLoginMediaItem({
          title: titleInput.trim(),
          subtitle: subtitleInput.trim() || null,
          category: categoryInput,
          image_url: imageUrlInput,
          link_url: linkUrlInput.trim() || null,
          display_order: Math.max(1, orderInput),
          is_active: activeInput,
        });
        setUsingLocalFallback(!res.savedToCloud);
        toast.success(
          t("settings:login_media.toast_created", { title: titleInput.trim() }),
        );
      }
      setDialogOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:login_media.toast_save_err"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(row: LoginMediaItemRow, next: boolean) {
    try {
      await updateLoginMediaItem(row.id, { is_active: next });
      setItems((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, is_active: next } : x)),
      );
      toast.success(
        next
          ? t("settings:login_media.toast_status_active", { title: row.title })
          : t("settings:login_media.toast_status_inactive", { title: row.title }),
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:login_media.toast_toggle_err"),
      );
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLoginMediaItem(deleteTarget.id);
      toast.success(
        t("settings:login_media.toast_deleted", { title: deleteTarget.title }),
      );
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settings:login_media.toast_delete_err"),
      );
    }
  }

  const deferredSearchQuery = React.useDeferredValue(searchQuery);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, categoryFilter, statusFilter, sortOrder, pageSize]);

  // Daftar kategori untuk Cycling Ticker KPI Komposisi Kategori
  const bannerCount = items.filter((i) => i.category === "banner").length;
  const flyerCount = items.filter((i) => i.category === "flyer").length;
  const medsosCount = items.filter((i) => i.category === "medsos").length;

  const categoryTickerItems = React.useMemo(() => [
    {
      count: bannerCount,
      label: t("settings:login_media.category_banner_label", "Banner"),
      dotTone: "bg-sky-400",
    },
    {
      count: flyerCount,
      label: t("settings:login_media.category_flyer_label", "Flyer"),
      dotTone: "bg-amber-400",
    },
    {
      count: medsosCount,
      label: t("settings:login_media.category_medsos_label", "Medsos"),
      dotTone: "bg-emerald-400",
    },
  ], [bannerCount, flyerCount, medsosCount, t]);

  if (loading) {
    return <PageLoader message={t("settings:login_media.loading_gallery")} />;
  }

  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredItems = items
    .filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) {
        return false;
      }
      if (statusFilter === "active" && !it.is_active) return false;
      if (statusFilter === "inactive" && it.is_active) return false;
      if (normalizedQuery) {
        const haystack = [it.title, it.subtitle ?? "", it.link_url ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    })
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.display_order - b.display_order ||
          b.created_at.localeCompare(a.created_at)
        : b.display_order - a.display_order ||
          a.created_at.localeCompare(b.created_at),
    );

  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIdx, startIdx + pageSize);
  const startDisplay = totalFiltered === 0 ? 0 : startIdx + 1;
  const endDisplay = Math.min(startIdx + pageSize, totalFiltered);

  const pageNumbers: Array<number | "ellipsis"> = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("ellipsis");
    for (
      let i = Math.max(2, safePage - 1);
      i <= Math.min(totalPages - 1, safePage + 1);
      i++
    ) {
      pageNumbers.push(i);
    }
    if (safePage < totalPages - 2) pageNumbers.push("ellipsis");
    pageNumbers.push(totalPages);
  }
  const previewSlide = activeItems[previewIdx] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <PageHeader
        title={t("settings:login_media.header_title")}
        description={t("settings:login_media.header_desc")}
      />

      {usingLocalFallback ? (
        <Alert variant="info">
          <InfoIcon className="size-4" />
          <AlertTitle>{t("settings:login_media.alert_supabase_migration")}</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            {t("settings:login_media.alert_supabase_desc")}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 3 Kartu KPI (Komponen Tunggal KpiCard — Item 10) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <KpiCard
          label={t("settings:login_media.kpi_total")}
          value={items.length}
          suffix={` ${t("settings:login_media.unit_content")}`}
          subtext={t("settings:login_media.kpi_total_desc")}
          icon={ImageIcon}
          iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        />

        <KpiCard
          label={t("settings:login_media.kpi_active")}
          value={activeItems.length}
          suffix={` ${t("settings:login_media.unit_live")}`}
          subtext={
            activeItems.length > 1
              ? t("settings:login_media.kpi_active_desc_carousel")
              : activeItems.length === 1
                ? t("settings:login_media.kpi_active_desc_static")
                : t("settings:login_media.kpi_active_desc_default")
          }
          icon={EyeIcon}
          iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        />

        <KpiCard
          label={t("settings:login_media.kpi_composition")}
          displayValue={<CategoryCompositionTicker items={categoryTickerItems} />}
          subtext={t("settings:login_media.kpi_comp_count", {
            banner: bannerCount,
            flyer: flyerCount,
            medsos: medsosCount,
          })}
          icon={LayersIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        />
      </div>

      {/* Pratinjau Langsung Panel Kiri Halaman Login */}
      <Card className="overflow-hidden">
        <CardHeaderWithInfo
          title={t("settings:login_media.preview_panel_title")}
          description={t("settings:login_media.preview_panel_desc")}
          action={
            activeItems.length > 1 ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-lg"
                  onClick={() =>
                    setPreviewIdx(
                      (prev) => (prev - 1 + activeItems.length) % activeItems.length,
                    )
                  }
                  aria-label={t("settings:login_media.prev_slide")}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-xs font-semibold tabular-nums px-1.5 text-muted-foreground">
                  {previewIdx + 1} / {activeItems.length}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-lg"
                  onClick={() =>
                    setPreviewIdx((prev) => (prev + 1) % activeItems.length)
                  }
                  aria-label={t("settings:login_media.next_slide")}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            ) : null
          }
        />
        <CardContent className="p-6">
          <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-[#090E19] border border-border/80 flex items-center justify-center">
            {previewSlide ? (
              <>
                {previewSlide.category === "banner" ? (
                  <img
                    src={previewSlide.image_url}
                    alt={previewSlide.title}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <>
                    <img
                      src={previewSlide.image_url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 size-full object-cover blur-2xl scale-110 opacity-35"
                    />
                    <img
                      src={previewSlide.image_url}
                      alt={previewSlide.title}
                      className="relative z-10 max-h-[82%] max-w-[85%] rounded-xl object-contain shadow-2xl ring-1 ring-white/15"
                    />
                  </>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent z-10" />
                <div className="absolute inset-x-4 bottom-4 z-20">
                  <div className="rounded-2xl bg-slate-950/65 backdrop-blur-md border border-white/15 px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
                    <div className="min-w-0 flex flex-col items-start gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 leading-none">
                        <span className="size-1.5 rounded-full bg-sky-400 shrink-0" />
                        <span>{categoryMeta[previewSlide.category].label}</span>
                      </span>
                      <p className="text-sm font-bold text-white leading-snug text-left truncate max-w-full">
                        {previewSlide.title}
                      </p>
                      {previewSlide.subtitle ? (
                        <p className="text-xs text-white/80 line-clamp-1 text-left">
                          {previewSlide.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative size-full flex flex-col items-center justify-center text-center px-6">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:36px_36px]" />
                <SparklesIcon className="size-7 text-sky-400/80 mb-2 relative z-10" />
                <p className="text-sm font-semibold text-white relative z-10">
                  {t("settings:login_media.preview_empty_title")}
                </p>
                <p className="text-xs text-white/70 mt-1 max-w-md relative z-10">
                  {t("settings:login_media.preview_empty_desc")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabel Daftar Media (Edge-to-Edge Card Konsisten Portal Super Admin) */}
      <Card>
        <CardHeaderWithInfo
          title={t("settings:login_media.table_title")}
          description={t("settings:login_media.table_desc")}
          action={
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative w-full sm:w-56">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("settings:login_media.search_input_placeholder")}
                className="pl-9 h-9 rounded-xl text-xs sm:text-sm"
              />
            </div>

            {/* Tombol Filter Gabungan (Kategori & Status) */}
            <div className="relative" ref={filterRef}>
              {categoryFilter === "all" && statusFilter === "all" ? (
                <ActionTooltip content={t("common:action.filter")}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFilterOpen((prev) => !prev)}
                    aria-expanded={filterOpen}
                    className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80"
                    aria-label={t("common:action.filter")}
                  >
                    <SlidersHorizontalIcon className="size-4 text-primary" />
                    <span className="sr-only">{t("common:action.filter")}</span>
                  </Button>
                </ActionTooltip>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  aria-expanded={filterOpen}
                  className="h-9 rounded-xl px-3 text-xs sm:text-sm font-semibold gap-2 border-primary/50 text-primary bg-primary/5 transition-colors"
                >
                  <SlidersHorizontalIcon className="size-4" />
                  <span>{t("common:action.filter")}</span>
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
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
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter("all");
                          setStatusFilter("all");
                        }}
                        className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        {t("common:action.reset")}
                      </button>
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
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setCategoryFilter(opt.value)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                active
                                  ? "bg-primary/12 text-primary dark:text-sky-400 font-semibold"
                                  : "text-foreground hover:bg-muted/60"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {active ? (
                                <CheckIcon className="size-3.5 shrink-0" />
                              ) : null}
                            </button>
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
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatusFilter(opt.value)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                              statusFilter === opt.value
                                ? "bg-primary text-primary-foreground shadow-2xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            }`}
                          >
                            {opt.label}
                          </button>
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
                variant="outline"
                size="icon"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className={cn(
                  "size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80",
                  sortOrder === "desc" && "border-primary/50 text-primary bg-primary/5",
                )}
                aria-label={
                  sortOrder === "asc"
                    ? t("settings:login_media.sort_order_asc")
                    : t("settings:login_media.sort_order_desc")
                }
              >
                <ArrowUpDownIcon className="size-4 text-primary" />
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
                onClick={openCreateDialog}
                className={cn(TOOLBAR_BUTTON_CLASS, "cursor-pointer")}
                aria-label={t("settings:login_media.btn_add", "Tambah Media Carousel")}
              >
                <PlusIcon className="size-4 text-primary-foreground shrink-0" />
                <span className="sr-only">
                  {t("settings:login_media.btn_add", "Tambah Media Carousel")}
                </span>
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
                              void handleToggleActive(row, v)
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
                            onClick={() => openEditDialog(row)}
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
                            onClick={() => setDeleteTarget(row)}
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

      {/* Modal Tambah / Edit Media */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("settings:login_media.modal_edit_header")
                : t("settings:login_media.modal_add_title")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="lm-title" required>
                    {t("settings:login_media.field_title_content")}
                  </FieldLabel>
                  <Input
                    id="lm-title"
                    required
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder={t("settings:login_media.field_title_ph")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lm-order" required>
                    {t("settings:login_media.field_order_display")}
                  </FieldLabel>
                  <NumberInput
                    id="lm-order"
                    allowDecimal={false}
                    min={1}
                    required
                    value={orderInput}
                    onValueChange={setOrderInput}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>
                    {t("settings:login_media.field_category_label")}
                  </FieldLabel>
                  <Select
                    value={categoryInput}
                    onValueChange={(v) =>
                      setCategoryInput(v as LoginMediaCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">
                        {t("settings:login_media.category_banner_desc")}
                      </SelectItem>
                      <SelectItem value="flyer">
                        {t("settings:login_media.category_flyer_desc")}
                      </SelectItem>
                      <SelectItem value="medsos">
                        {t("settings:login_media.category_medsos_desc")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lm-link">
                    {t("settings:login_media.field_link_target")}
                  </FieldLabel>
                  <Input
                    id="lm-link"
                    type="url"
                    value={linkUrlInput}
                    onChange={(e) => setLinkUrlInput(e.target.value)}
                    placeholder={t(
                      "settings:login_media.field_link_placeholder",
                      "https://altvira.id atau /portal-pembeli",
                    )}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="lm-subtitle">
                  {t("settings:login_media.field_subtitle_short")}
                </FieldLabel>
                <Input
                  id="lm-subtitle"
                  value={subtitleInput}
                  onChange={(e) => setSubtitleInput(e.target.value)}
                  placeholder={t("settings:login_media.field_subtitle_ph")}
                />
              </Field>

              <ImageAssetUploadBox
                required
                label={t("settings:login_media.field_image_upload_label")}
                helperText={t("settings:login_media.field_image_helper")}
                emptyTitle={t("settings:login_media.field_image_empty_title")}
                emptySubtitle={t("settings:login_media.field_image_empty_desc")}
                value={imageUrlInput}
                onChange={setImageUrlInput}
                maxWidth={1440}
                maxHeight={1800}
                format="webp"
                quality={0.82}
                containImage={categoryInput !== "banner"}
                previewHeightClassName="h-44"
              />

              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {t("settings:login_media.field_toggle_login")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("settings:login_media.field_toggle_login_desc")}
                  </p>
                </div>
                <Switch
                  checked={activeInput}
                  onCheckedChange={setActiveInput}
                  aria-label={t("settings:login_media.field_toggle_login")}
                />
              </div>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                {t("common:action.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                <span>
                  {editingItem
                    ? t("settings:login_media.btn_save_changes")
                    : t("settings:login_media.btn_save")}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus (Double Check Ketik DELETE) */}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("settings:login_media.confirm_delete_modal_title")}
        description={
          deleteTarget
            ? t("settings:login_media.confirm_delete_modal_desc", {
                title: deleteTarget.title,
              })
            : ""
        }
        confirmLabel={t("settings:login_media.confirm_delete_perm")}
        destructive
        confirmText="DELETE"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
