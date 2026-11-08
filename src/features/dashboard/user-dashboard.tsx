import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { listProjects } from "@/lib/data-service";
import { formatDateID, formatRupiah } from "@/lib/formatters";
import {
  getProfitSharingBundle,
  listPaymentRequests,
  listPurchaseOrders,
} from "@/lib/operations-service";
import type {
  PaymentRequestRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";

export function UserDashboardPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [pos, setPos] = React.useState<PurchaseOrderRow[]>([]);
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [sharingLines, setSharingLines] = React.useState<ProfitSharingLineRow[]>([]);
  const [sharingResults, setSharingResults] = React.useState<ProfitSharingResultRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prjRes, poRes, paRes, psRes] = await Promise.all([
          listProjects(),
          listPurchaseOrders(),
          listPaymentRequests(),
          getProfitSharingBundle(),
        ]);
        setProjects(prjRes.projects);
        setPos(poRes.orders);
        setRequests(paRes.requests);
        setSharingLines(psRes.lines);
        setSharingResults(psRes.results);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat ringkasan portal anggota tim...</span>
      </div>
    );
  }

  const pendingPa = requests.filter((r) => r.status === "submitted").length;
  const totalMyShare = sharingLines.reduce((s, l) => s + l.share_amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dasbor Anggota Tim
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Selamat datang, <span className="font-semibold text-foreground">{profile?.full_name ?? "Rekan"}</span>. Ringkasan penugasan proyek, pengajuan pembayaran, dan hak bagi hasil Anda.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Proyek Ditugaskan */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proyek Ditugaskan
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {projects.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">Proyek</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-primary" asChild>
              <Link to="/user/anggaran">
                Lihat Anggaran &amp; Realisasi
                <ArrowRightIcon className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* PO Pembelian Saya */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              PO Pembelian Vendor
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {pos.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">Dokumen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-primary" asChild>
              <Link to="/user/po">
                Kelola Dokumen PO
                <ArrowRightIcon className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pengajuan Pembayaran */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pengajuan Pembayaran
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {requests.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">Pengajuan</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {pendingPa > 0
                ? `${pendingPa} pembayaran menunggu persetujuan`
                : "Semua pengajuan telah diproses"}
            </p>
          </CardContent>
        </Card>

        {/* Hak Bagi Hasil */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hak Bagi Hasil
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-foreground">
              {formatRupiah(totalMyShare)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {sharingLines.length > 0
                ? `Dari ${sharingLines.length} proyek yang diselesaikan`
                : "Belum ada alokasi bagi hasil"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/60 shadow-2xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Proyek Aktif Saya</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Daftar proyek di mana Anda terdaftar aktif sebagai pelaksana tugas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              title="Belum ada penugasan proyek"
              description="Anda belum terdaftar dalam proyek aktif manapun. Hubungi Admin atau manajer proyek untuk penugasan tim."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Proyek</TableHead>
                  <TableHead>Nama Proyek</TableHead>
                  <TableHead>Jadwal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {p.code}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs">
                      {formatDateID(p.start_date)} –{" "}
                      {formatDateID(p.target_end_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="success" label={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {sharingLines.length > 0 ? (
        <Card className="rounded-2xl border border-border/60 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Rincian Hak Bagi Hasil Saya</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Daftar alokasi pembagian hasil dari proyek yang telah selesai dan disetujui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Porsi (%)</TableHead>
                  <TableHead>Nominal Hak Bagi Hasil</TableHead>
                  <TableHead>Status Perhitungan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharingLines.map((line) => {
                  const res = sharingResults.find((r) => r.id === line.result_id);
                  const prj = projects.find((p) => p.id === res?.project_id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium text-xs">
                        {prj ? `${prj.code}: ${prj.name}` : "Proyek"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">{line.percentage}%</TableCell>
                      <TableCell className="font-semibold">
                        {formatRupiah(line.share_amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={res?.status === "finalized" ? "success" : "warning"}
                          label={
                            res?.status === "finalized"
                              ? "Difinalisasi & Terkunci"
                              : "Simulasi Draf"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
