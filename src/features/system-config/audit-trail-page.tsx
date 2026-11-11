import * as React from "react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
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
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [selected, setSelected] = React.useState<AuditLogRow | null>(null);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await listAuditLogs();
        setLogs(data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = React.useMemo(() => {
    const matched = logs.filter((l) => {
      const matchText =
        l.entity_name.toLowerCase().includes(search.toLowerCase()) ||
        l.entity_id.toLowerCase().includes(search.toLowerCase()) ||
        (l.actor_role ?? "").toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === "all" || l.action === actionFilter;
      return matchText && matchAction;
    });

    return [...matched].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) {
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      return sortOrder === "asc" ? a.id - b.id : b.id - a.id;
    });
  }, [logs, search, actionFilter, sortOrder]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, sortOrder, pageSize]);

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
          Jejak Audit Sistem (Audit Trail)
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Telusuri catatan historis perubahan data dan aktivitas penting pengguna yang terekam permanen.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              Riwayat Aktivitas &amp; Perubahan Data
            </CardTitle>
            <CardDescription>
              Rekaman historis seluruh aktivitas dan perubahan data sistem secara kronologis.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center shrink-0">
            <Input
              placeholder="Cari tabel entitas, ID, atau peran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 h-9 rounded-xl text-xs sm:text-sm"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder="Filter aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua Aksi</SelectItem>
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
              <span>Urutan: {sortOrder === "asc" ? "Terlama" : "Terbaru"}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat audit trail...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">ID</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Waktu</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Peran Pelaku</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Entitas</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">ID Entitas</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Rincian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ShieldAlertIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Tidak Ada Log Audit yang Cocok
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Sesuaikan filter pencarian di kanan atas.
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
                            <span>Bandingkan</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {!loading ? (
            <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                {totalItems === 0
                  ? "0 dari 0"
                  : `${startDisplay}–${endDisplay} dari ${totalItems.toLocaleString("id-ID")}`}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Halaman sebelumnya"
                    aria-label="Halaman sebelumnya"
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
                    title="Halaman berikutnya"
                    aria-label="Halaman berikutnya"
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
                    aria-label="Jumlah baris per halaman"
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
              Rincian Audit #{selected?.id} — {selected?.action} pada{" "}
              {selected?.entity_name}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs text-muted-foreground">
            Waktu: <span className="font-semibold text-foreground">{formatDateTimeID(selected?.created_at)}</span>{" "}
            · Pelaku:{" "}
            <span className="font-semibold text-foreground">
              {selected?.actor_role ?? "sistem"} ({selected?.actor_id ?? "-"})
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Nilai Sebelum (old_data)
              </p>
              <JsonCodeView
                data={selected?.old_data}
                compareWith={selected?.new_data}
                diffTone="removed"
                emptyLabel="— (Kosong / Rekaman Baru)"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Nilai Sesudah (new_data)
              </p>
              <JsonCodeView
                data={selected?.new_data}
                compareWith={selected?.old_data}
                diffTone="added"
                emptyLabel="— (Dihapus)"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

