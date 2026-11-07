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
  const rejectedPa = requests.filter((r) => r.status === "rejected").length;
  const totalMyShare = sharingLines.reduce((s, l) => s + l.share_amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Portal Anggota Tim — {profile?.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola PO pembelian vendor, ajukan persetujuan pembayaran beserta
          lampiran bukti, pantau anggaran proyek Anda, dan lihat hak bagi hasil
          pribadi Anda.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Proyek Ditugaskan</CardDescription>
            <CardTitle className="text-2xl">{projects.length} Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/user/anggaran">
                Lihat Anggaran vs Realisasi
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>PO Pembelian Saya</CardDescription>
            <CardTitle className="text-2xl">{pos.length} Dokumen</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/user/po">
                Buat / Unduh PDF PO
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pengajuan Pembayaran</CardDescription>
            <CardTitle className="text-2xl">{requests.length} Pengajuan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            <StatusBadge tone="info" label={`${pendingPa} Menunggu`} />
            {rejectedPa > 0 ? (
              <StatusBadge tone="destructive" label={`${rejectedPa} Perlu Revisi`} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hak Bagi Hasil Saya (FR-BH5)</CardDescription>
            <CardTitle className="text-xl">{formatRupiah(totalMyShare)}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone={totalMyShare > 0 ? "success" : "secondary"}
              label={`${sharingLines.length} Proyek`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proyek yang Ditugaskan kepada Saya</CardTitle>
          <CardDescription>
            Isolasi Row Level Security memastikan Anda hanya melihat proyek
            tempat Anda menjadi anggota tim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              title="Belum ada proyek yang ditugaskan"
              description="Hubungi Admin apabila Anda perlu ditugaskan ke proyek untuk mengajukan PO atau pembayaran."
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
        <Card>
          <CardHeader>
            <CardTitle>Rincian Bagian Bagi Hasil Saya</CardTitle>
            <CardDescription>
              Hanya menampilkan porsi milik Anda sendiri sesuai aturan keamanan
              FR-BH5.
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
                      <TableCell className="font-medium">
                        {prj ? `${prj.code} — ${prj.name}` : "Proyek"}
                      </TableCell>
                      <TableCell>{line.percentage}%</TableCell>
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
