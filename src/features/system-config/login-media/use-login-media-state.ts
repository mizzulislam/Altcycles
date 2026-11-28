import * as React from "react";
import { toast } from "sonner";
import {
  createLoginMediaItem,
  deleteLoginMediaItem,
  listAllLoginMedia,
  updateLoginMediaItem,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import type {
  LoginMediaCategory,
  LoginMediaItemRow,
} from "@/types/database.types";
import type { CategoryMetaMap, CategoryTickerItem } from "./login-media-types";

export function useLoginMediaState() {
  const { t, language } = useLanguage();

  const categoryMeta: CategoryMetaMap = React.useMemo(
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

  // Konfirmasi Hapus
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

  const bannerCount = items.filter((i) => i.category === "banner").length;
  const flyerCount = items.filter((i) => i.category === "flyer").length;
  const medsosCount = items.filter((i) => i.category === "medsos").length;

  const categoryTickerItems: CategoryTickerItem[] = React.useMemo(() => [
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

  return {
    t,
    language,
    categoryMeta,
    items,
    loading,
    usingLocalFallback,
    activeItems,
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
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    previewIdx,
    setPreviewIdx,
    dialogOpen,
    setDialogOpen,
    editingItem,
    setEditingItem,
    titleInput,
    setTitleInput,
    subtitleInput,
    setSubtitleInput,
    categoryInput,
    setCategoryInput,
    imageUrlInput,
    setImageUrlInput,
    linkUrlInput,
    setLinkUrlInput,
    orderInput,
    setOrderInput,
    activeInput,
    setActiveInput,
    saving,
    deleteTarget,
    setDeleteTarget,
    openCreateDialog,
    openEditDialog,
    handleSave,
    handleToggleActive,
    handleConfirmDelete,
    bannerCount,
    flyerCount,
    medsosCount,
    categoryTickerItems,
    filteredItems,
    totalFiltered,
    totalPages,
    safePage,
    paginatedItems,
    startDisplay,
    endDisplay,
    pageNumbers,
    previewSlide,
  };
}
