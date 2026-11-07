import * as React from "react";
import { EyeIcon } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
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

export function AuditTrailPage() {
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
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

  const filtered = logs.filter((l) => {
    const matchText =
      l.entity_name.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      (l.actor_role ?? "").toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchText && matchAction;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Jejak Audit Sistem (Audit Trail)
        </h1>
        <p className="text-sm text-muted-foreground">
          Seluruh perubahan data penting terekam otomatis beserta nilai sebelum
          dan sesudah, dan dilindungi trigger database agar tidak dapat diubah
          atau dihapus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Aktivitas &amp; Perubahan Data</CardTitle>
          <CardDescription>
            Menampilkan hingga 200 rekaman terbaru.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Cari tabel entitas, ID, atau peran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="sm:w-52">
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
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat audit trail...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Tidak ada log audit yang cocok"
              description="Sesuaikan filter pencarian di atas."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Peran Pelaku</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>ID Entitas</TableHead>
                  <TableHead className="text-right">Rincian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      #{row.id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTimeID(row.created_at)}
                    </TableCell>
                    <TableCell>{row.actor_role ?? "sistem"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={
                          row.action === "REOPEN_PERIOD" ||
                          row.action === "DELETE"
                            ? "warning"
                            : "info"
                        }
                        label={row.action}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.entity_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-44 truncate">
                      {row.entity_id}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(row)}
                      >
                        <EyeIcon data-icon="inline-start" />
                        Bandingkan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Rincian Audit #{selected?.id} — {selected?.action} pada{" "}
              {selected?.entity_name}
            </DialogTitle>
            <DialogDescription>
              Waktu: {formatDateTimeID(selected?.created_at)} · Pelaku:{" "}
              {selected?.actor_role ?? "sistem"} ({selected?.actor_id ?? "-"})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Nilai Sebelum (old_data)
              </p>
              <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                {selected?.old_data
                  ? JSON.stringify(selected.old_data, null, 2)
                  : "— (Kosong / Rekaman Baru)"}
              </pre>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Nilai Sesudah (new_data)
              </p>
              <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                {selected?.new_data
                  ? JSON.stringify(selected.new_data, null, 2)
                  : "— (Dihapus)"}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

