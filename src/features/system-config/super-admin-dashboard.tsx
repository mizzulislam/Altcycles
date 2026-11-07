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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard Super Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Kendali pengguna, konfigurasi dokumen Altvira, status perpajakan, dan
          jejak audit sistem.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pengguna Internal Aktif</CardDescription>
            <CardTitle className="text-2xl">
              {activeUsers} / {profiles.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone="success" label="RBAC Aktif" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status Pajak Perusahaan</CardDescription>
            <CardTitle className="text-lg">
              {company?.pkp_enabled ? "PKP Aktif" : "Belum PKP"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              tone={company?.pkp_enabled ? "warning" : "secondary"}
              label={
                company?.pkp_enabled
                  ? `PPN ${company.ppn_rate}% Aktif`
                  : "Invoice Tanpa PPN (Default)"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bagan Akun SAK Terdaftar</CardDescription>
            <CardTitle className="text-2xl">{accountCount} Akun</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone="info" label="Termasuk Progress Billing" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktivitas Audit Terbaru</CardDescription>
            <CardTitle className="text-2xl">{recentLogs.length} Entri</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone="outline" label="Immutable Log" />
          </CardContent>
        </Card>
      </div>

      <Card>
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

