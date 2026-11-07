import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, DatabaseBackupIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import { buildCashFlowStatement } from "@/lib/accounting-engine";
import {
  listAccounts,
  listPeriods,
  listProjects,
} from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateID, formatRupiah } from "@/lib/formatters";
import {
  getProjectWorkspace,
  listJournalsWithLines,
  listPaymentRequests,
  recordExportLog,
} from "@/lib/operations-service";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
  PeriodRow,
  ProjectRow,
} from "@/types/database.types";

export function AdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [pendingApprovals, setPendingApprovals] = React.useState(0);
  const [outstandingReceivable, setOutstandingReceivable] = React.useState(0);
  const [pendingClientPos, setPendingClientPos] = React.useState(0);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accs, pers, prjs, jRes, paRes, ws] = await Promise.all([
          listAccounts(),
          listPeriods(),
          listProjects(),
          listJournalsWithLines(),
          listPaymentRequests(),
          getProjectWorkspace(),
        ]);
        setAccounts(accs);
        setPeriods(pers);
        setProjects(prjs.projects);
        setJournals(jRes.journals);
        setLines(jRes.lines);
        setPendingApprovals(
          paRes.requests.filter((r) => r.status === "submitted").length,
        );
        setOutstandingReceivable(
          ws.invoices
            .filter((i) => i.doc_status === "issued")
            .reduce((s, i) => s + (i.total_amount - i.paid_amount), 0),
        );
        setPendingClientPos(
          ws.clientPos.filter((c) => c.status === "pending_verification")
            .length,
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat ringkasan eksekutif portal Admin...</span>
      </div>
    );
  }

  const cashPosition = buildCashFlowStatement(accounts, journals, lines);
  const openPeriods = periods.filter((p) => p.status === "open").length;
  const totalContract = projects.reduce((sum, p) => sum + p.contract_value, 0);
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  async function handleBackupExport() {
    const rows: Array<Array<string | number>> = [];
    for (const j of journals) {
      const jLines = lines.filter((l) => l.journal_id === j.id);
      for (const l of jLines) {
        const acc = accMap.get(l.account_id);
        rows.push([
          j.journal_number,
          formatDateID(j.journal_date),
          j.journal_type,
          j.status,
          acc ? `${acc.code} - ${acc.name}` : "-",
          l.description ?? j.description,
          l.debit,
          l.credit,
        ]);
      }
    }
    await downloadExcelSheet({
      fileName: "Cadangan_Buku_Jurnal_Altcycles.xlsx",
      sheetName: "Backup Jurnal",
      columns: [
        { header: "No. Jurnal", width: 22 },
        { header: "Tanggal", width: 14 },
        { header: "Tipe", width: 18 },
        { header: "Status", width: 14 },
        { header: "Akun SAK", width: 32 },
        { header: "Keterangan", width: 38 },
        { header: "Debit", width: 18 },
        { header: "Kredit", width: 18 },
      ],
      rows,
    });
    await recordExportLog("FULL_BACKUP_LEDGER", "EXCEL");
    toast.success("Cadangan data jurnal berhasil diunduh ke Excel (UC-39).");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard Keuangan &amp; Akuntansi (Admin)
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan saldo kas, antrean persetujuan pembayaran, piutang klien,
            dan siklus proyek Altvira Technology.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleBackupExport()}
        >
          <DatabaseBackupIcon data-icon="inline-start" />
          Ekspor Cadangan Data (.xlsx)
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Kas &amp; Bank Terkini</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(cashPosition.endingCash)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone="success"
              label={`${openPeriods} Periode Terbuka`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Antrean Payment Approval</CardDescription>
            <CardTitle className="text-2xl">
              {pendingApprovals} Pengajuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone={pendingApprovals > 0 ? "warning" : "secondary"}
              label={
                pendingApprovals > 0 ? "Perlu Keputusan 1-Level" : "Semua Selesai"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Piutang Klien Belum Tertagih</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(outstandingReceivable)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone={pendingClientPos > 0 ? "info" : "secondary"}
              label={`${pendingClientPos} PO Klien Menunggu Verifikasi`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Nilai Kontrak Proyek</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(totalContract)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone="info" label={`${projects.length} Proyek`} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Persetujuan &amp; Pengeluaran</CardTitle>
            <CardDescription>
              Proses pengajuan pembayaran tim, lampiran bukti &le; 5 MB, dan
              pencairan dana manual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/persetujuan">
                Buka Persetujuan Pembayaran
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proyek, Termin, &amp; Penagihan</CardTitle>
            <CardDescription>
              Kelola Quotation, PO Klien, SoW/SPK, BAKP, UAT, BAST, Invoice,
              dan Kuitansi.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/proyek">
                Ruang Kerja Proyek
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/penagihan">Invoice &amp; Piutang</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laporan Keuangan SAK &amp; Bagi Hasil</CardTitle>
            <CardDescription>
              Tinjau Laba Rugi, Neraca (Aset/Liabilitas Kontrak), Arus Kas, dan
              distribusi bagi hasil.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/akuntansi/laporan">
                Laporan Keuangan
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/bagi-hasil">Bagi Hasil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
