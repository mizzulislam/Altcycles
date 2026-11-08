import * as React from "react";
import {
  LockIcon,
  LockOpenIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import { createPeriod, listPeriods, reopenPeriod } from "@/lib/data-service";
import { formatDateID, formatDateTimeID } from "@/lib/formatters";
import {
  runOptionalReversingEntries,
  runPeriodClosingBook,
} from "@/lib/operations-service";
import type { PeriodRow } from "@/types/database.types";

export function PeriodsPage() {
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [year, setYear] = React.useState(2027);
  const [month, setMonth] = React.useState("2");
  const [creating, setCreating] = React.useState(false);

  const [closeTarget, setCloseTarget] = React.useState<PeriodRow | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<PeriodRow | null>(
    null,
  );

  // Dialog Eksekusi Jurnal Pembalik Opsional (FR-AK12)
  const [reverseOpen, setReverseOpen] = React.useState(false);
  const [sourcePeriodId, setSourcePeriodId] = React.useState("");
  const [reversingDate, setReversingDate] = React.useState("2027-01-01");
  const [runningReverse, setRunningReverse] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPeriods();
      setPeriods(data);
      if (data[0]) {
        setSourcePeriodId((prev) => prev || data[0]!.id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat periode.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createPeriod(year, Number(month));
      toast.success("Periode akuntansi baru berhasil dibuka.");
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat periode.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRunReverse(e: React.FormEvent) {
    e.preventDefault();
    if (!sourcePeriodId) return;
    setRunningReverse(true);
    try {
      const count = await runOptionalReversingEntries(
        sourcePeriodId,
        reversingDate,
      );
      toast.success(
        count > 0
          ? `${count} jurnal pembalik awal periode berhasil diterbitkan.`
          : "Tidak ada jurnal penyesuaian yang ditandai pembalik pada periode asal (0 jurnal diterbitkan).",
      );
      setReverseOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal menjalankan jurnal pembalik.",
      );
    } finally {
      setRunningReverse(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Periode Akuntansi, Jurnal Penutup, &amp; Pembalik Opsional
          </h1>
          <p className="text-sm text-muted-foreground">
            Menutup periode akan menerbitkan Jurnal Penutup otomatis ke Laba
            Ditahan dan mengunci bulan tersebut dari transaksi baru. Pembukaan kembali wajib
            disertai alasan pada Audit Trail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setReverseOpen(true)}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Jurnal Pembalik Opsional
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Buka Periode Baru
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Periode Bulanan</CardTitle>
          <CardDescription>
            Status terbuka mengizinkan pencatatan dan posting jurnal pada bulan
            tersebut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar periode...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Rentang Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Riwayat Tutup / Buka Kembali</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs">
                      {formatDateID(p.start_date)} – {formatDateID(p.end_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={p.status === "open" ? "success" : "warning"}
                        label={
                          p.status === "open"
                            ? "Periode Terbuka"
                            : "Periode Ditutup"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.status === "closed" && p.closed_at
                        ? `Ditutup: ${formatDateTimeID(p.closed_at)}`
                        : p.reopen_reason
                          ? `Dibuka kembali (${formatDateTimeID(p.reopened_at)}): "${p.reopen_reason}"`
                          : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "open" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCloseTarget(p)}
                        >
                          <LockIcon data-icon="inline-start" />
                          Tutup Buku &amp; Periode
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setReopenTarget(p)}
                        >
                          <LockOpenIcon data-icon="inline-start" />
                          Buka Kembali
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Periode Akuntansi Baru</DialogTitle>
            <DialogDescription>
              Pilih tahun dan bulan buku yang akan dibuka.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="p-year">Tahun Buku</FieldLabel>
                  <Input
                    id="p-year"
                    type="number"
                    min={2024}
                    max={2100}
                    required
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel>Bulan</FieldLabel>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="1">01 — Januari</SelectItem>
                        <SelectItem value="2">02 — Februari</SelectItem>
                        <SelectItem value="3">03 — Maret</SelectItem>
                        <SelectItem value="4">04 — April</SelectItem>
                        <SelectItem value="5">05 — Mei</SelectItem>
                        <SelectItem value="6">06 — Juni</SelectItem>
                        <SelectItem value="7">07 — Juli</SelectItem>
                        <SelectItem value="8">08 — Agustus</SelectItem>
                        <SelectItem value="9">09 — September</SelectItem>
                        <SelectItem value="10">10 — Oktober</SelectItem>
                        <SelectItem value="11">11 — November</SelectItem>
                        <SelectItem value="12">12 — Desember</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Spinner data-icon="inline-start" /> : null}
                  Buat Periode
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Jurnal Pembalik Awal Periode Opsional (FR-AK12) */}
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Jalankan Jurnal Pembalik Awal Periode (Opsional)
            </DialogTitle>
            <DialogDescription>
              Hanya membalik jurnal penyesuaian yang ditandai untuk dibalik
              (mis. proyek 2 termin lintas tahun). Proyek Progress Billing &ge;
              3 termin tidak menggunakan jurnal pembalik sesuai PRD Bagian 7.1.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRunReverse}>
            <FieldGroup>
              <Field>
                <FieldLabel>Periode Asal Jurnal Penyesuaian</FieldLabel>
                <Select
                  value={sourcePeriodId}
                  onValueChange={setSourcePeriodId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih periode asal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.status})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-date">
                  Tanggal Jurnal Pembalik Awal Periode Baru
                </FieldLabel>
                <Input
                  id="rev-date"
                  type="date"
                  required
                  value={reversingDate}
                  onChange={(e) => setReversingDate(e.target.value)}
                />
                <FieldDescription>
                  Contoh: 01/01/2027 untuk membalik akrual Desember 2026.
                </FieldDescription>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReverseOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={runningReverse}>
                  {runningReverse ? <Spinner data-icon="inline-start" /> : null}
                  Jalankan Pembalik
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Tutup Buku & Periode */}
      <ConfirmActionDialog
        open={Boolean(closeTarget)}
        onOpenChange={(open) => {
          if (!open) setCloseTarget(null);
        }}
        title={`Tutup Buku & Kunci Periode ${closeTarget?.name ?? ""}?`}
        description="Sistem akan menerbitkan Jurnal Penutup otomatis atas akun Pendapatan dan Beban ke Laba Ditahan, lalu mengunci bulan ini dari transaksi baru."
        destructive
        confirmLabel="Ya, Posting Jurnal Penutup & Kunci"
        onConfirm={async () => {
          if (!closeTarget) return;
          await runPeriodClosingBook(closeTarget.id);
          toast.success(
            `Jurnal penutup diterbitkan dan periode ${closeTarget.name} berhasil ditutup.`,
          );
          await reload();
        }}
      />

      {/* Konfirmasi Buka Kembali Periode dengan Alasan Wajib (BR-3) */}
      <ConfirmActionDialog
        open={Boolean(reopenTarget)}
        onOpenChange={(open) => {
          if (!open) setReopenTarget(null);
        }}
        title={`Buka kembali periode ${reopenTarget?.name ?? ""}?`}
        description="Tindakan ini akan direkam secara khusus sebagai REOPEN_PERIOD pada Audit Trail yang dipantau Super Admin."
        requireReason
        reasonLabel="Alasan Pembukaan Kembali Periode (Wajib)"
        reasonPlaceholder="Contoh: Penyesuaian beban cloud akhir bulan yang baru diterima..."
        confirmLabel="Buka Kembali & Catat Audit"
        onConfirm={async (reason) => {
          if (!reopenTarget || !reason) return;
          await reopenPeriod(reopenTarget.id, reason);
          toast.success(`Periode ${reopenTarget.name} dibuka kembali.`);
          await reload();
        }}
      />
    </div>
  );
}
