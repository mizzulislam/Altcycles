import * as React from "react";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listAccounts,
  listCustomers,
  listProjects,
  listVendors,
} from "@/lib/data-service";
import {
  ACCOUNT_TYPE_LABELS,
  formatRupiah,
  REVENUE_METHOD_LABELS,
} from "@/lib/formatters";
import type {
  AccountRow,
  CustomerRow,
  ProjectRow,
  VendorRow,
} from "@/types/database.types";

export function MasterReadonlyPage() {
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [a, p, v, c] = await Promise.all([
          listAccounts(),
          listProjects(),
          listVendors(),
          listCustomers(),
        ]);
        setAccounts(a);
        setProjects(p.projects);
        setVendors(v);
        setCustomers(c);
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
        <span>Memuat master data &amp; bagan akun...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pemantauan Master Data &amp; Bagan Akun (Hanya-Baca)
        </h1>
        <p className="text-sm text-muted-foreground">
          Sesuai UC-33 &amp; FR-M1: Super Admin memantau Bagan Akun SAK dan
          master data yang dikelola oleh Admin di portal Akuntansi.
        </p>
      </div>

      <Tabs defaultValue="coa">
        <TabsList>
          <TabsTrigger value="coa">Bagan Akun SAK ({accounts.length})</TabsTrigger>
          <TabsTrigger value="proyek">Proyek ({projects.length})</TabsTrigger>
          <TabsTrigger value="vendor">Vendor ({vendors.length})</TabsTrigger>
          <TabsTrigger value="pelanggan">
            Pelanggan ({customers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <Card>
            <CardHeader>
              <CardTitle>Bagan Akun (Chart of Accounts)</CardTitle>
              <CardDescription>
                Tampilan pemantauan hanya-baca untuk Super Admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Akun</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Saldo Normal</TableHead>
                    <TableHead>Penanda Sistem</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono font-medium">
                        {acc.code}
                      </TableCell>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell>
                        {ACCOUNT_TYPE_LABELS[acc.account_type]}
                      </TableCell>
                      <TableCell className="capitalize">
                        {acc.normal_balance}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {acc.system_tag}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={acc.is_active ? "success" : "secondary"}
                          label={acc.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proyek">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Proyek</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Proyek</TableHead>
                    <TableHead>Nilai Kontrak</TableHead>
                    <TableHead>Termin</TableHead>
                    <TableHead>Metode Pengakuan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.code}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{formatRupiah(p.contract_value)}</TableCell>
                      <TableCell>{p.term_count} Termin</TableCell>
                      <TableCell className="text-xs">
                        {REVENUE_METHOD_LABELS[p.revenue_method]}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="info" label={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Vendor</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Rekening</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">{v.code}</TableCell>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.contact_name ?? "-"}</TableCell>
                      <TableCell className="text-xs">
                        {v.bank_name ?? "-"} {v.bank_account_number ?? ""}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={v.is_active ? "success" : "secondary"}
                          label={v.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pelanggan">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Pelanggan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama / Perusahaan</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.contact_person ?? "-"}</TableCell>
                      <TableCell>{c.email ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={c.is_active ? "success" : "secondary"}
                          label={c.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

