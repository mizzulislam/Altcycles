import * as React from "react";
import {
  BookCheckIcon,
  BookOpenIcon,
  Building2Icon,
  FolderKanbanIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Switch } from "@/components/ui/switch";
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
  getCompanyProfile,
  listAccounts,
  listCustomers,
  listProjects,
  listVendors,
  setAutoClosingStatus,
  setJournalLockStatus,
} from "@/lib/data-service";
import {
  ACCOUNT_TYPE_LABELS,
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
  const [journalLockEnabled, setJournalLockEnabled] = React.useState(true);
  const [togglingLock, setTogglingLock] = React.useState(false);
  const [autoClosingEnabled, setAutoClosingEnabled] = React.useState(false);
  const [togglingAutoClosing, setTogglingAutoClosing] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [a, p, v, c, comp] = await Promise.all([
          listAccounts(),
          listProjects(),
          listVendors(),
          listCustomers(),
          getCompanyProfile(),
        ]);
        setAccounts(a);
        setProjects(p.projects);
        setVendors(v);
        setCustomers(c);
        setJournalLockEnabled(Boolean(comp.journal_lock_enabled ?? true));
        setAutoClosingEnabled(Boolean(comp.auto_closing_enabled ?? false));
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Gagal memuat konfigurasi sistem.",
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
        <span>Memuat konfigurasi akuntansi &amp; master data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Pengaturan &amp; Kontrol Akuntansi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Kelola kontrol kunci jurnal serta tinjau struktur bagan akun dan entitas master.
          </p>
        </div>
      </div>

      {/* Card Kontrol Kunci Jurnal (Journal Lock Control) */}
      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-primary dark:text-sky-400 shrink-0" />
              <h2 className="text-base font-bold text-foreground">
                Kunci Jurnal &amp; Kepatuhan Pembukuan
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {journalLockEnabled
                ? "Seluruh transaksi jurnal terkunci otomatis untuk menjaga integritas jejak audit. Transaksi di portal Bendahara tidak dapat diedit atau dihapus sembarangan."
                : "Kunci jurnal dinonaktifkan sementara. Admin dan Bendahara diizinkan untuk mengedit, mengoreksi, dan menghapus transaksi jurnal pada portal Akuntansi untuk keperluan pengujian sistem."}
            </p>
          </div>
          <label
            htmlFor="journal-lock-switch"
            className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {journalLockEnabled ? "Aktif" : "Nonaktif"}
            </span>
            <Switch
              id="journal-lock-switch"
              checked={journalLockEnabled}
              disabled={togglingLock}
              aria-label="Toggle Kunci Jurnal"
              onCheckedChange={async (nextVal) => {
                setTogglingLock(true);
                try {
                  await setJournalLockStatus(nextVal);
                  setJournalLockEnabled(nextVal);
                  if (nextVal) {
                    toast.success("Kunci jurnal diaktifkan (Mode Produksi).");
                  } else {
                    toast.warning("Kunci jurnal dinonaktifkan (Mode Testing Aktif: Transaksi jurnal dapat diedit & dihapus).");
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Gagal mengubah status kunci jurnal.");
                } finally {
                  setTogglingLock(false);
                }
              }}
            />
          </label>
        </div>
      </Card>

      {/* Card Kontrol Tutup Buku Otomatis (Auto Closing Books Control) */}
      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <BookCheckIcon className="size-5 text-primary dark:text-sky-400 shrink-0" />
              <h2 className="text-base font-bold text-foreground">
                Tutup Buku Otomatis (Auto Closing Books)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {autoClosingEnabled
                ? "Sistem secara otomatis menghitung dan memposting 4 langkah jurnal penutup GAAP/IFRS (menutup akun nominal Pendapatan & Beban ke Ikhtisar Laba Rugi lalu ke Laba Ditahan) saat Bendahara mengeksekusi tutup buku periode."
                : "Tutup buku otomatis dinonaktifkan. Bendahara dan Admin dapat mencatat jurnal penutup secara manual melalui formulir pencatatan jurnal atau menutup periode buku secara fleksibel tanpa auto-posting."}
            </p>
          </div>
          <label
            htmlFor="auto-closing-switch"
            className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {autoClosingEnabled ? "Aktif" : "Nonaktif"}
            </span>
            <Switch
              id="auto-closing-switch"
              checked={autoClosingEnabled}
              disabled={togglingAutoClosing}
              aria-label="Toggle Tutup Buku Otomatis"
              onCheckedChange={async (nextVal) => {
                setTogglingAutoClosing(true);
                try {
                  await setAutoClosingStatus(nextVal);
                  setAutoClosingEnabled(nextVal);
                  if (nextVal) {
                    toast.success("Tutup buku otomatis diaktifkan. Jurnal penutup GAAP/IFRS akan diposting otomatis saat tutup periode.");
                  } else {
                    toast.info("Tutup buku otomatis dinonaktifkan. Penutupan buku dapat dilakukan manual oleh Bendahara.");
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Gagal mengubah status tutup buku otomatis.");
                } finally {
                  setTogglingAutoClosing(false);
                }
              }}
            />
          </label>
        </div>
      </Card>

      <Tabs defaultValue="coa">
        <TabsList>
          <TabsTrigger value="coa">
            <BookOpenIcon className="size-4 shrink-0" />
            <span>Bagan Akun</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {accounts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="proyek">
            <FolderKanbanIcon className="size-4 shrink-0" />
            <span>Proyek</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {projects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="vendor">
            <Building2Icon className="size-4 shrink-0" />
            <span>Vendor</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {vendors.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pelanggan">
            <UsersIcon className="size-4 shrink-0" />
            <span>Pelanggan</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {customers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">Bagan Akun (Chart of Accounts)</CardTitle>
              <CardDescription>
                Tampilan pemantauan hanya-baca untuk Super Admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Akun</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tipe</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Saldo Normal</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Penanda Sistem</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="pl-6 pr-3 font-mono font-semibold text-center whitespace-nowrap">
                        {acc.code}
                      </TableCell>
                      <TableCell className="px-3 font-medium">{acc.name}</TableCell>
                      <TableCell className="px-3 text-center">
                        {ACCOUNT_TYPE_LABELS[acc.account_type]}
                      </TableCell>
                      <TableCell className="px-3 capitalize text-center">
                        {acc.normal_balance}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground text-center">
                        {acc.system_tag}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={acc.is_active ? "success" : "secondary"}
                            label={acc.is_active ? "Aktif" : "Nonaktif"}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proyek">
          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">Daftar Proyek</CardTitle>
              <CardDescription>Tampilan pemantauan hanya-baca proyek klien dan internal.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Proyek</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Nilai Kontrak</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Termin</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Metode Pengakuan</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 pr-3 font-mono font-semibold text-center whitespace-nowrap">
                        {p.code}
                      </TableCell>
                      <TableCell className="px-3 font-medium">{p.name}</TableCell>
                      <TableCell className="px-3 whitespace-nowrap">
                        <MonetaryCell amount={p.contract_value} />
                      </TableCell>
                      <TableCell className="px-3 text-center tabular-nums whitespace-nowrap">
                        {p.term_count} Termin
                      </TableCell>
                      <TableCell className="px-3 text-center text-muted-foreground">
                        {REVENUE_METHOD_LABELS[p.revenue_method]}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge tone="info" label={p.status} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor">
          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">Daftar Vendor</CardTitle>
              <CardDescription>Direktori vendor pemasok hanya-baca untuk pengawasan sistem.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Vendor</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Kontak</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Rekening</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="pl-6 pr-3 font-mono font-semibold text-center whitespace-nowrap">{v.code}</TableCell>
                      <TableCell className="px-3 font-medium">{v.name}</TableCell>
                      <TableCell className="px-3 text-center">{v.contact_name ?? "-"}</TableCell>
                      <TableCell className="px-3 text-center text-muted-foreground">
                        {v.bank_name ?? "-"} {v.bank_account_number ?? ""}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={v.is_active ? "success" : "secondary"}
                            label={v.is_active ? "Aktif" : "Nonaktif"}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pelanggan">
          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">Daftar Pelanggan</CardTitle>
              <CardDescription>Basis data pelanggan dan klien perusahaan hanya-baca.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama / Perusahaan</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">PIC</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Email</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6 pr-3 font-mono font-semibold text-center whitespace-nowrap">{c.code}</TableCell>
                      <TableCell className="px-3 font-medium">{c.name}</TableCell>
                      <TableCell className="px-3 text-center">{c.contact_person ?? "-"}</TableCell>
                      <TableCell className="px-3 text-center text-muted-foreground">{c.email ?? "-"}</TableCell>
                      <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={c.is_active ? "success" : "secondary"}
                            label={c.is_active ? "Aktif" : "Nonaktif"}
                          />
                        </div>
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

