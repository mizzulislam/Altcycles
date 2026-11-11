import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  ImageIcon,
  InfoIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
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
import { formatDateTimeID } from "@/lib/formatters";
import type {
  LoginMediaCategory,
  LoginMediaItemRow,
} from "@/types/database.types";

const CATEGORY_META: Record<
  LoginMediaCategory,
  { label: string; tone: "info" | "success" | "warning" }
> = {
  banner: { label: "Banner Utama", tone: "info" },
  flyer: { label: "Flyer Promosi", tone: "warning" },
  medsos: { label: "Konten Medsos", tone: "success" },
};

export function LoginMediaPage() {
  const [items, setItems] = React.useState<LoginMediaItemRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [usingLocalFallback, setUsingLocalFallback] = React.useState(false);

  const [categoryFilter, setCategoryFilter] = React.useState<
    "all" | LoginMediaCategory
  >("all");
  const [previewIdx, setPreviewIdx] = React.useState(0);

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
          : "Gagal memuat daftar media halaman login.",
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
      toast.error("Judul media wajib diisi.");
      return;
    }
    if (!imageUrlInput) {
      toast.error(
        "Silakan pilih atau unggah gambar media dari Komputer atau Google Drive.",
      );
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
        toast.success("Media halaman login berhasil diperbarui.");
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
        toast.success("Media baru untuk halaman login berhasil ditambahkan.");
      }
      setDialogOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan media login.",
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
          ? `"${row.title}" kini ditampilkan pada halaman login.`
          : `"${row.title}" disembunyikan dari halaman login.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status media.",
      );
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLoginMediaItem(deleteTarget.id);
      toast.success(`Media "${deleteTarget.title}" berhasil dihapus.`);
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus media login.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat galeri media &amp; banner halaman login...</span>
      </div>
    );
  }

  const filteredItems = items.filter((it) =>
    categoryFilter === "all" ? true : it.category === categoryFilter,
  );
  const bannerCount = items.filter((i) => i.category === "banner").length;
  const flyerCount = items.filter((i) => i.category === "flyer").length;
  const medsosCount = items.filter((i) => i.category === "medsos").length;
  const previewSlide = activeItems[previewIdx] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Media &amp; Banner Halaman Login
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Unggah banner, flyer promosi, atau konten media sosial dari komputer maupun Google Drive untuk ditampilkan pada sisi kiri halaman masuk.
          </p>
        </div>
        <div className="shrink-0">
          <Button type="button" onClick={openCreateDialog}>
            <PlusIcon className="size-4" />
            <span>Tambah Media Login</span>
          </Button>
        </div>
      </div>

      {usingLocalFallback ? (
        <Alert variant="info">
          <InfoIcon className="size-4" />
          <AlertTitle>Menunggu Migrasi Tabel Supabase Cloud</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            Data media saat ini tersimpan di penyimpanan peramban lokal karena tabel{" "}
            <code className="font-mono">public.login_media_items</code> belum dijalankan di database cloud. Jalankan berkas{" "}
            <code className="font-mono">
              supabase/migrations/0016_login_banner_media.sql
            </code>{" "}
            pada SQL Editor Supabase agar banner sinkron lintas perangkat dan publik.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 3 Kartu KPI */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Total Media Terunggah
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {items.length} Konten
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Terdaftar di galeri halaman masuk
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
            <ImageIcon className="size-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Aktif Ditampilkan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {activeItems.length} Tayang
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activeItems.length > 1
                ? "Otomatis bergulir sebagai carousel"
                : activeItems.length === 1
                  ? "Tampil statis pada panel kiri login"
                  : "Menampilkan kanvas grid default"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <EyeIcon className="size-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Komposisi Kategori
            </p>
            <p className="text-base sm:text-lg font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {bannerCount} Banner &bull; {flyerCount} Flyer &bull; {medsosCount} Medsos
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Mendukung upload lokal &amp; Google Drive
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <LayersIcon className="size-5" />
          </div>
        </Card>
      </div>

      {/* Pratinjau Langsung Panel Kiri Halaman Login */}
      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>Pratinjau Panel Kiri Halaman Login</CardTitle>
            <CardDescription>
              Simulasi tampilan panel visual di sisi kiri halaman masuk ketika pengguna mengakses sistem.
            </CardDescription>
          </div>
          {activeItems.length > 1 ? (
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
                aria-label="Slide sebelumnya"
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
                aria-label="Slide berikutnya"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardHeader>
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
                <div className="absolute bottom-4 left-5 right-5 z-20 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-white mb-1">
                      {CATEGORY_META[previewSlide.category].label}
                    </span>
                    <p className="text-sm font-bold text-white truncate">
                      {previewSlide.title}
                    </p>
                    {previewSlide.subtitle ? (
                      <p className="text-xs text-white/80 line-clamp-1">
                        {previewSlide.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="relative size-full flex flex-col items-center justify-center text-center px-6">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:36px_36px]" />
                <SparklesIcon className="size-7 text-sky-400/80 mb-2 relative z-10" />
                <p className="text-sm font-semibold text-white relative z-10">
                  Belum Ada Media Aktif
                </p>
                <p className="text-xs text-white/70 mt-1 max-w-md relative z-10">
                  Klik &ldquo;Tambah Media Login&rdquo; untuk mengunggah banner, flyer, atau konten media sosial agar tampil menggantikan kanvas grid bawaan.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabel Daftar Media (Edge-to-Edge Card) */}
      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>Daftar Media Banner &amp; Konten</CardTitle>
            <CardDescription>
              Atur urutan tayang, kategori konten, serta visibilitas media pada halaman masuk.
            </CardDescription>
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) =>
              setCategoryFilter(v as "all" | LoginMediaCategory)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="banner">Banner Utama</SelectItem>
              <SelectItem value="flyer">Flyer Promosi</SelectItem>
              <SelectItem value="medsos">Konten Medsos</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center text-xs sm:text-sm font-semibold w-20 whitespace-nowrap">
                  Urutan
                </TableHead>
                <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-32 whitespace-nowrap">
                  Pratinjau
                </TableHead>
                <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold">
                  Judul &amp; Keterangan
                </TableHead>
                <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-36 whitespace-nowrap">
                  Kategori
                </TableHead>
                <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-36 whitespace-nowrap">
                  Tautan
                </TableHead>
                <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-32 whitespace-nowrap">
                  Tayang
                </TableHead>
                <TableHead className="pl-2 pr-6 text-center text-xs sm:text-sm font-semibold w-28 whitespace-nowrap">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title="Belum Ada Media Login"
                        description="Tambahkan banner, flyer promosi, atau konten media sosial agar tampil di sisi kiri halaman login."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((row) => {
                  const meta = CATEGORY_META[row.category];
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold tabular-nums whitespace-nowrap">
                        #{row.display_order}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center">
                        <div className="mx-auto h-14 w-24 rounded-lg border border-border/80 bg-muted/30 overflow-hidden flex items-center justify-center">
                          <img
                            src={row.image_url}
                            alt={row.title}
                            className="size-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5">
                        <p className="font-semibold text-foreground">
                          {row.title}
                        </p>
                        {row.subtitle ? (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {row.subtitle}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground/80 mt-1 tabular-nums">
                          Diperbarui {formatDateTimeID(row.updated_at)}
                        </p>
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="-my-px inline-flex justify-center">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5">
                        {row.link_url ? (
                          <a
                            href={row.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-sky-400 hover:underline max-w-32 truncate"
                            title={row.link_url}
                          >
                            <span className="truncate">Buka Tautan</span>
                            <ExternalLinkIcon className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="-my-px inline-flex items-center gap-2">
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(v) => void handleToggleActive(row, v)}
                            aria-label={`Aktifkan tampilan ${row.title}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {row.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="-my-1.5 inline-flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Edit Media"
                            className="size-8 rounded-lg text-primary dark:text-sky-400 hover:bg-primary/10"
                            onClick={() => openEditDialog(row)}
                          >
                            <PencilIcon className="size-4" />
                            <span className="sr-only">Edit Media</span>
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Hapus Media"
                            className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">Hapus Media</span>
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

      {/* Modal Tambah / Edit Media */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? "Edit Media Halaman Login"
                : "Tambah Media Halaman Login"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="lm-title" required>
                    Judul Konten
                  </FieldLabel>
                  <Input
                    id="lm-title"
                    required
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Contoh: Promo Layanan ERP & Pengembangan Web"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lm-order" required>
                    Urutan Tampil
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
                  <FieldLabel required>Kategori Media</FieldLabel>
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
                        Banner Utama (Full Panel)
                      </SelectItem>
                      <SelectItem value="flyer">
                        Flyer Promosi (Proporsi Utuh)
                      </SelectItem>
                      <SelectItem value="medsos">
                        Konten Medsos (Feed / Poster)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lm-link">Tautan Tujuan (Opsional)</FieldLabel>
                  <Input
                    id="lm-link"
                    type="url"
                    value={linkUrlInput}
                    onChange={(e) => setLinkUrlInput(e.target.value)}
                    placeholder="https://instagram.com/altvira.tech"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="lm-subtitle">
                  Subjudul / Deskripsi Singkat (Opsional)
                </FieldLabel>
                <Input
                  id="lm-subtitle"
                  value={subtitleInput}
                  onChange={(e) => setSubtitleInput(e.target.value)}
                  placeholder="Keterangan singkat yang tampil di bagian bawah banner"
                />
              </Field>

              <ImageAssetUploadBox
                required
                label="Media Gambar (Banner / Flyer / Konten Medsos)"
                helperText="Lokal atau Google Drive"
                emptyTitle="Pilih Gambar dari Komputer atau Google Drive"
                emptySubtitle="Format PNG, JPG, atau WebP — terintegrasi Google Picker & tautan Drive"
                value={imageUrlInput}
                onChange={setImageUrlInput}
                maxWidth={1440}
                maxHeight={1800}
                containImage={categoryInput !== "banner"}
                previewHeightClassName="h-44"
              />

              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Tampilkan di Halaman Login
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Aktifkan agar media langsung muncul di sisi kiri halaman masuk.
                  </p>
                </div>
                <Switch
                  checked={activeInput}
                  onCheckedChange={setActiveInput}
                  aria-label="Tampilkan media di halaman login"
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
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                <span>{editingItem ? "Simpan Perubahan" : "Simpan Media"}</span>
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
        title="Hapus Media Halaman Login"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus media "${deleteTarget.title}" secara permanen dari galeri halaman masuk?`
            : ""
        }
        confirmLabel="Hapus Permanen"
        destructive
        confirmText="DELETE"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
