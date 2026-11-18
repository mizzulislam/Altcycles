import * as React from "react";
import {
  BookCheckIcon,
  BookOpenIcon,
  Building2Icon,
  FolderKanbanIcon,
  PercentIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
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
  setPph23EstimateStatus,
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
import { CurrencySettingsCard } from "./currency-settings-card";

export function MasterReadonlyPage() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [journalLockEnabled, setJournalLockEnabled] = React.useState(true);
  const [togglingLock, setTogglingLock] = React.useState(false);
  const [autoClosingEnabled, setAutoClosingEnabled] = React.useState(false);
  const [togglingAutoClosing, setTogglingAutoClosing] = React.useState(false);
  const [pph23Enabled, setPph23Enabled] = React.useState(false);
  const [togglingPph23, setTogglingPph23] = React.useState(false);

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
        setPph23Enabled(Boolean(comp.pph_enabled ?? false));
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
            {isEn ? "Accounting Controls & Setup" : "Pengaturan & Kontrol Akuntansi"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {isEn
              ? "Manage journal locks and review chart of accounts and master entities structure."
              : "Kelola kontrol kunci jurnal serta tinjau struktur bagan akun dan entitas master."}
          </p>
        </div>
      </div>

      {/* Grid 3 Kolom Kontrol Akuntansi Sejajar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-stretch">
        {/* Card 1: Kontrol Kunci Jurnal (Journal Lock Control) */}
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full">
            <div className="space-y-1.5 min-w-0 flex-1 self-start">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-5 text-primary dark:text-sky-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
                  {isEn ? "Journal & Bookkeeping Lock" : "Kunci Jurnal & Pembukuan"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {journalLockEnabled
                  ? isEn
                    ? "All journal entries are automatically locked to preserve audit trail integrity. Transactions in the Treasurer portal cannot be edited or deleted."
                    : "Seluruh transaksi jurnal terkunci otomatis untuk menjaga integritas jejak audit. Transaksi di portal Bendahara tidak dapat diedit atau dihapus."
                  : isEn
                    ? "Journal lock temporarily disabled. Admin and Treasurer are allowed to edit and delete journal entries for testing purposes."
                    : "Kunci jurnal dinonaktifkan sementara. Admin dan Bendahara diizinkan mengedit serta menghapus transaksi jurnal untuk pengujian sistem."}
              </p>
            </div>
            <label
              htmlFor="journal-lock-switch"
              className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none sm:self-center"
            >
              <span className="text-xs font-medium text-muted-foreground w-14 text-right">
                {journalLockEnabled ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif")}
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
                      toast.success(isEn ? "Journal lock enabled (Production Mode)." : "Kunci jurnal diaktifkan (Mode Produksi).");
                    } else {
                      toast.warning(isEn ? "Journal lock disabled (Testing Mode Active: Transactions can be edited & deleted)." : "Kunci jurnal dinonaktifkan (Mode Testing Aktif: Transaksi jurnal dapat diedit & dihapus).");
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

        {/* Card 2: Kontrol Tutup Buku Otomatis (Auto Closing Books Control) */}
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full">
            <div className="space-y-1.5 min-w-0 flex-1 self-start">
              <div className="flex items-center gap-2">
                <BookCheckIcon className="size-5 text-primary dark:text-sky-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
                  {isEn ? "Automated Period Closing" : "Tutup Buku Otomatis"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {autoClosingEnabled
                  ? isEn
                    ? "System automatically computes and posts GAAP/IFRS closing entries to Income Summary and Retained Earnings upon closing."
                    : "Sistem otomatis menghitung dan memposting jurnal penutup GAAP/IFRS ke Ikhtisar Laba Rugi serta Laba Ditahan saat tutup buku periode."
                  : isEn
                    ? "Automated closing disabled. Treasurer and Admin can record manual closing entries or close period without auto-posting."
                    : "Tutup buku otomatis dinonaktifkan. Bendahara dan Admin dapat mencatat jurnal penutup secara manual atau menutup periode tanpa auto-posting."}
              </p>
            </div>
            <label
              htmlFor="auto-closing-switch"
              className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none sm:self-center"
            >
              <span className="text-xs font-medium text-muted-foreground w-14 text-right">
                {autoClosingEnabled ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif")}
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
                      toast.success(isEn ? "Automated closing enabled." : "Tutup buku otomatis diaktifkan. Jurnal penutup GAAP/IFRS akan diposting otomatis saat tutup periode.");
                    } else {
                      toast.info(isEn ? "Automated closing disabled." : "Tutup buku otomatis dinonaktifkan. Penutupan buku dapat dilakukan manual oleh Bendahara.");
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

        {/* Card 3: Kontrol Estimasi PPh 23 (2%) pada Invoice Klien */}
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full">
            <div className="space-y-1.5 min-w-0 flex-1 self-start">
              <div className="flex items-center gap-2">
                <PercentIcon className="size-5 text-primary dark:text-sky-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
                  {isEn ? "Estimated PPh 23 (2%)" : "Estimasi PPh 23 (2%)"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pph23Enabled
                  ? isEn
                    ? "PPh Article 23 withholding information (2% of taxable base) and net cash estimate are automatically displayed on client Invoice print documents."
                    : "Informasi pemotongan PPh Pasal 23 (2% dari DPP) dan estimasi kas bersih ditampilkan otomatis pada dokumen cetak PDF/Word Invoice klien."
                  : isEn
                    ? "PPh Article 23 estimate (2%) is hidden from client invoice print documents, displaying standard billing totals only."
                    : "Estimasi potongan PPh Pasal 23 (2%) disembunyikan dari dokumen cetak Invoice klien sehingga hanya menampilkan nilai tagihan standar."}
              </p>
            </div>
            <label
              htmlFor="pph23-estimate-switch"
              className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none sm:self-center"
            >
              <span className="text-xs font-medium text-muted-foreground w-14 text-right">
                {pph23Enabled ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif")}
              </span>
              <Switch
                id="pph23-estimate-switch"
                checked={pph23Enabled}
                disabled={togglingPph23}
                aria-label="Toggle Estimasi PPh 23 (2%)"
                onCheckedChange={async (nextVal) => {
                  setTogglingPph23(true);
                  try {
                    await setPph23EstimateStatus(nextVal);
                    setPph23Enabled(nextVal);
                    if (nextVal) {
                      toast.success(isEn ? "PPh 23 estimate (2%) enabled on client invoices." : "Estimasi PPh 23 (2%) diaktifkan pada dokumen cetak Invoice klien.");
                    } else {
                      toast.info(isEn ? "PPh 23 estimate (2%) disabled on client invoices." : "Estimasi PPh 23 (2%) dinonaktifkan pada dokumen cetak Invoice klien.");
                    }
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Gagal mengubah status estimasi PPh 23.");
                  } finally {
                    setTogglingPph23(false);
                  }
                }}
              />
            </label>
          </div>
        </Card>
      </div>

      {/* Pengaturan Mata Uang Fungsional & Kurs Valuta Asing */}
      <CurrencySettingsCard />

      <Tabs defaultValue="coa">
        <TabsList>
          <TabsTrigger value="coa">
            <BookOpenIcon className="size-4 shrink-0" />
            <span>{isEn ? "Chart of Accounts" : "Bagan Akun"}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {accounts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="proyek">
            <FolderKanbanIcon className="size-4 shrink-0" />
            <span>{isEn ? "Projects" : "Proyek"}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {projects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="vendor">
            <Building2Icon className="size-4 shrink-0" />
            <span>{isEn ? "Vendors" : "Vendor"}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {vendors.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pelanggan">
            <UsersIcon className="size-4 shrink-0" />
            <span>{isEn ? "Customers" : "Pelanggan"}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {customers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">{isEn ? "Chart of Accounts (COA)" : "Bagan Akun (Chart of Accounts)"}</CardTitle>
              <CardDescription>
                {isEn ? "Read-only monitoring view for Super Admin." : "Tampilan pemantauan hanya-baca untuk Super Admin."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{isEn ? "Code" : "Kode"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Account Name" : "Nama Akun"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Type" : "Tipe"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Normal Balance" : "Saldo Normal"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "System Tag" : "Penanda Sistem"}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{isEn ? "Status" : "Status"}</TableHead>
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
                            label={acc.is_active ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif")}
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
              <CardTitle className="text-base sm:text-lg font-bold">{isEn ? "Projects List" : "Daftar Proyek"}</CardTitle>
              <CardDescription>{isEn ? "Read-only monitoring view of client and internal projects." : "Tampilan pemantauan hanya-baca proyek klien dan internal."}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{isEn ? "Code" : "Kode"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Project Name" : "Nama Proyek"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">{isEn ? "Contract Value" : "Nilai Kontrak"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Milestones" : "Termin"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Revenue Method" : "Metode Pengakuan"}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{isEn ? "Status" : "Status"}</TableHead>
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
                        {p.term_count} {isEn ? "Milestones" : "Termin"}
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
              <CardTitle className="text-base sm:text-lg font-bold">{isEn ? "Vendors List" : "Daftar Vendor"}</CardTitle>
              <CardDescription>{isEn ? "Read-only supplier directory for system oversight." : "Direktori vendor pemasok hanya-baca untuk pengawasan sistem."}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{isEn ? "Code" : "Kode"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Vendor Name" : "Nama Vendor"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Contact" : "Kontak"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Bank Account" : "Rekening"}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{isEn ? "Status" : "Status"}</TableHead>
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
              <CardTitle className="text-base sm:text-lg font-bold">{isEn ? "Customers List" : "Daftar Pelanggan"}</CardTitle>
              <CardDescription>{isEn ? "Read-only company client and customer database." : "Basis data pelanggan dan klien perusahaan hanya-baca."}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{isEn ? "Code" : "Kode"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Name / Company" : "Nama / Perusahaan"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "PIC" : "PIC"}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{isEn ? "Email" : "Email"}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{isEn ? "Status" : "Status"}</TableHead>
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

