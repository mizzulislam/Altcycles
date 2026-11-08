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
import { Spinner } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCompanyProfile,
  listAccounts,
  listAuditLogs,
  listProfiles,
} from "@/lib/data-service";
import { formatDateTimeID } from "@/lib/formatters";
import type {
  AuditLogRow,
  CompanyProfileRow,
  ProfileRow,
} from "@/types/database.types";

export function SuperAdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [accountCount, setAccountCount] = React.useState(0);
  const [recentLogs, setRecentLogs] = React.useState<AuditLogRow[]>([]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, c, accs, logs] = await Promise.all([
          listProfiles(),
          getCompanyProfile(),
          listAccounts(),
          listAuditLogs(),
        ]);
        setProfiles(p);
        setCompany(c);
        setAccountCount(accs.length);
        setRecentLogs(logs.slice(0, 8));
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
        <span>Memuat ringkasan sistem...</span>
      </div>
    );
  }

  const activeUsers = profiles.filter((u) => u.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dasbor Pengelola Sistem
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kendali akun pengguna, konfigurasi perusahaan, perpajakan, dan jejak audit sistem.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pengguna Internal */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pengguna Internal
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {activeUsers}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {profiles.length} Aktif
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Akses peran pengguna aktif dan terverifikasi
            </p>
          </CardContent>
        </Card>

        {/* Status Pajak Perusahaan */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Perpajakan
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              {company?.pkp_enabled ? "PKP Aktif" : "Non-PKP"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {company?.pkp_enabled
                ? `Tarif PPN ${company.ppn_rate}% berlaku pada invoice`
                : "Faktur diterbitkan tanpa PPN"}
            </p>
          </CardContent>
        </Card>

        {/* Bagan Akun SAK */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bagan Akun Keuangan
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {accountCount}{" "}
              <span className="text-sm font-normal text-muted-foreground">Akun</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Standar Akuntansi Keuangan SAK
            </p>
          </CardContent>
        </Card>

        {/* Aktivitas Audit */}
        <Card className="rounded-2xl border border-border/60 shadow-2xs hover:shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jejak Audit
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {recentLogs.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">Log Baru</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Rekaman audit aktivitas tersimpan
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/60 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Jejak Audit Terbaru</CardTitle>
            <CardDescription>
              Setiap perubahan konfigurasi, master data, dan status periode
              tercatat otomatis.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/super-admin/audit-trail">
              Semua Audit
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Peran Pelaku</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead>
                <TableHead>ID Rekaman</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTimeID(log.created_at)}
                  </TableCell>
                  <TableCell>{log.actor_role ?? "sistem"}</TableCell>
                  <TableCell>
                    <StatusBadge tone="info" label={log.action} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.entity_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-44">
                    {log.entity_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

