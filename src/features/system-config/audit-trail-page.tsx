import * as React from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import {
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { JsonCodeView } from "@/components/shared/json-code-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
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
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { listAuditLogs } from "@/lib/data-service";
import { formatDateTimeID } from "@/lib/formatters";
import type { AuditLogRow } from "@/types/database.types";

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100, 250] as const;

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function AuditTrailPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [selected, setSelected] = React.useState<AuditLogRow | null>(null);

  const deferredSearch = React.useDeferredValue(search);
  const tRef = React.useRef(t);
  tRef.current = t;

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await listAuditLogs({ limit: 300 });
        if (mounted) setLogs(data);
      } catch (err) {
        if (mounted) {
          toast.error(
            err instanceof Error
              ? err.message
              : tRef.current("settings:audit.loading", "Gagal memuat riwayat audit trail."),
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Pra-indeks teks pencarian & timestamp sekali saat daftar log berubah (eliminasi O(N log N) Date.parse di comparator)
  const indexedLogs = React.useMemo(
    () =>
      logs.map((row) => ({
        row,
        searchKey: `${row.entity_name} ${row.entity_id} ${row.actor_role ?? ""}`.toLowerCase(),
        createdAtMs: Date.parse(row.created_at) || 0,
      })),
    [logs],
  );

  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const matched = indexedLogs.filter((entry) => {
      const matchText = !q || entry.searchKey.includes(q);
      const matchAction = actionFilter === "all" || entry.row.action === actionFilter;
      return matchText && matchAction;
    });

    return matched
      .sort((a, b) => {
        if (a.createdAtMs !== b.createdAtMs) {
          return sortOrder === "asc"
            ? a.createdAtMs - b.createdAtMs
            : b.createdAtMs - a.createdAtMs;
        }
        return sortOrder === "asc" ? a.row.id - b.row.id : b.row.id - a.row.id;
      })
      .map((entry) => entry.row);
  }, [indexedLogs, deferredSearch, actionFilter, sortOrder]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, actionFilter, sortOrder, pageSize]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);
  const startDisplay = totalItems === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(startIndex + pageSize, totalItems);
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("settings:audit.title", "Jejak Audit Sistem (Audit Trail)")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          {t("settings:audit.subtitle", "Telusuri catatan historis perubahan data dan aktivitas penting pengguna yang terekam permanen.")}
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeaderWithInfo
          title={t("settings:audit.card_title", "Riwayat Aktivitas & Perubahan Data")}
          description={t("settings:audit.card_desc", "Rekaman historis seluruh aktivitas dan perubahan data sistem secara kronologis.")}
          action={
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center shrink-0">
              <Input
                placeholder={t("settings:audit.search_placeholder", "Cari entitas, ID transaksi, atau pelaku...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 h-9 rounded-xl text-xs sm:text-sm"
              />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-48 h-9 rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder={t("settings:audit.filter_action", "Semua Tindakan")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{t("settings:audit.filter_action", "Semua Tindakan")}</SelectItem>
                    <SelectItem value="INSERT">INSERT</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="CLOSE_PERIOD">CLOSE_PERIOD</SelectItem>
                    <SelectItem value="REOPEN_PERIOD">REOPEN_PERIOD</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="h-9 gap-1.5 rounded-xl text-xs font-medium cursor-pointer shrink-0"
              >
                <ArrowUpDownIcon className="size-3.5" />
                <span>
                  {t("common:action.order", "Urutan:")} {sortOrder === "asc" ? t("common:action.oldest", "Terlama") : t("common:action.newest", "Terbaru")}
                </span>
              </Button>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:audit.col_id", "ID")}</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:audit.col_timestamp", "Waktu Kejadian")}</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:audit.col_actor", "Pelaku & Peran")}</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:audit.col_action", "Tindakan")}</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:audit.col_entity", "Entitas")}</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("table.code", "ID Entitas")}</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("common:table.actions", "Aksi")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableLoadingRow
                    colSpan={7}
                    message={t("settings:audit.loading", "Memuat log audit trail...")}
                  />
                ) : paginatedRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ShieldAlertIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("settings:audit.empty_title", "Tidak Ada Riwayat Audit")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          {t("settings:audit.empty_desc", "Belum ada aktivitas atau mutasi data yang terekam sesuai saringan pencarian.")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-6 pr-3 text-center font-mono font-semibold whitespace-nowrap">
                        #{row.id}
                      </TableCell>
                      <TableCell className="px-3 whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatDateTimeID(row.created_at)}
                      </TableCell>
                      <TableCell className="px-3 text-center font-medium">
                        {row.actor_role ?? "sistem"}
                      </TableCell>
                      <TableCell className="px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={
                              row.action === "REOPEN_PERIOD" ||
                              row.action === "DELETE"
                                ? "warning"
                                : "info"
                            }
                            label={row.action}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 font-mono font-medium">
                        {row.entity_name}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground max-w-44 truncate">
                        {row.entity_id}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center -my-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelected(row)}
                          >
                            <EyeIcon className="size-3.5" />
                            <span>{t("settings:audit.btn_view_diff", "Bandingkan")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          {!loading ? (
            <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                {totalItems === 0
                  ? "0"
                  : t("common:table.pagination_info", {
                      start: startDisplay,
                      end: endDisplay,
                      total: totalItems.toLocaleString("id-ID"),
                      defaultValue: `${startDisplay}–${endDisplay} dari ${totalItems}`,
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
                    title={t("common:table.previous_page", "Halaman sebelumnya")}
                    aria-label={t("common:table.previous_page", "Halaman sebelumnya")}
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
                    title={t("common:table.next_page", "Halaman berikutnya")}
                    aria-label={t("common:table.next_page", "Halaman berikutnya")}
                    className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>

                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger
                    aria-label={t("common:table.rows_per_page", "Jumlah baris per halaman")}
                    className="h-8 w-[76px] rounded-xl text-xs font-medium tabular-nums"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectGroup>
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt}
                          value={String(opt)}
                          className="tabular-nums text-xs"
                        >
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t("settings:audit.modal_diff_title", "Detail Perubahan Rekaman Data")}: #{selected?.id} — {selected?.action} ({selected?.entity_name})
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs text-muted-foreground">
            {t("settings:audit.col_timestamp", "Waktu")}:{" "}
            <span className="font-semibold text-foreground">
              {formatDateTimeID(selected?.created_at)}
            </span>{" "}
            · {t("settings:audit.col_actor", "Pelaku")}:{" "}
            <span className="font-semibold text-foreground">
              {selected?.actor_role ?? "sistem"} ({selected?.actor_id ?? "-"})
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("settings:audit.modal_before", "Data Sebelum Perubahan (Old State)")}
              </p>
              <JsonCodeView
                data={selected?.old_data}
                compareWith={selected?.new_data}
                diffTone="removed"
                emptyLabel="—"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("settings:audit.modal_after", "Data Sesudah Perubahan (New State)")}
              </p>
              <JsonCodeView
                data={selected?.new_data}
                compareWith={selected?.old_data}
                diffTone="added"
                emptyLabel="—"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

