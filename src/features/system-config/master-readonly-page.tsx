import * as React from "react";
import {
  BookOpenIcon,
  Building2Icon,
  FolderKanbanIcon,
  RotateCcwIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo, CardHeaderTitleWithInfo } from "@/components/shared/card-header-with-info";
import { PageLoader } from "@/components/ui/loader";
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
  purgeTestData,
  setAutoClosingStatus,
  setJournalLockStatus,
  setPph23EstimateStatus,
} from "@/lib/data-service";
import {
  REVENUE_METHOD_LABELS,
} from "@/lib/formatters";
import { getLocalizedAccountName, getLocalizedAccountType } from "@/lib/glossary";
import type {
  AccountRow,
  CustomerRow,
  ProjectRow,
  VendorRow,
} from "@/types/database.types";
import { FunctionalCurrencyCard, ExchangeRatesCard } from "./currency-settings-card";
import { PageHeader } from "@/components/shared/page-header";

export function MasterReadonlyPage() {
  const { t, language } = useLanguage();
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
  const [confirmPurgeOpen, setConfirmPurgeOpen] = React.useState(false);
  const [purging, setPurging] = React.useState(false);

  const isTestingMode = !journalLockEnabled;

  async function handlePurgeData() {
    setPurging(true);
    try {
      const res = await purgeTestData();
      toast.success(res.message);
      setConfirmPurgeOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membersihkan data testing.");
    } finally {
      setPurging(false);
    }
  }

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
      <PageLoader
        message={t(
          "settings:master_readonly.loading",
          "Memuat konfigurasi akuntansi & master data...",
        )}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("settings:master_readonly.controls_title", "Pengaturan & Kontrol Akuntansi")}
        description={t(
          "settings:master_readonly.controls_desc",
          "Kelola kontrol kunci jurnal serta tinjau struktur bagan akun dan entitas master.",
        )}
      />

      {/* Grid 2 Kolom Kontrol Akuntansi & Valuta Fungsional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Card 1: Mode Testing / Sandbox Sistem */}
        <Card className={cn(
          "rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-center min-h-[76px] transition-all",
          isTestingMode ? "border-amber-500/50 bg-amber-500/5" : ""
        )}>
          <div className="flex items-center justify-between gap-3 min-w-0">
            <CardHeaderTitleWithInfo
              title={t("settings:master_readonly.testing_mode_title", "Mode Testing & Sandbox")}
              description={
                isTestingMode
                  ? t("settings:master_readonly.testing_mode_desc_active", "Mode pengujian aktif. Seluruh transaksi jurnal dapat diedit dan dihapus untuk pengujian alur transaksi.")
                  : t("settings:master_readonly.testing_mode_desc_inactive", "Mode produksi aktif. Seluruh transaksi jurnal terkunci otomatis (Strict Immutability) untuk menjaga integritas pembukuan resmi Altvira.")
              }
              titleClassName="text-xs sm:text-sm font-bold whitespace-normal leading-snug"
            />
            <div className="flex items-center gap-2.5 shrink-0">
              {isTestingMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={purging}
                  onClick={() => setConfirmPurgeOpen(true)}
                  className="h-7 rounded-lg px-2 text-[11px] gap-1 border-destructive/35 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 font-medium"
                >
                  <RotateCcwIcon className="size-3" />
                  <span>{t("settings:master_readonly.testing_mode_purge_btn", "Bersihkan Data Testing")}</span>
                </Button>
              )}
              <label
                htmlFor="testing-mode-switch"
                className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
              >
                <span className="text-xs font-semibold text-muted-foreground">
                  {isTestingMode ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
                </span>
                <Switch
                  id="testing-mode-switch"
                  checked={isTestingMode}
                  disabled={togglingLock}
                  aria-label="Toggle Mode Testing & Sandbox"
                  onCheckedChange={async (enableTesting) => {
                    setTogglingLock(true);
                    try {
                      const nextLockVal = !enableTesting;
                      await setJournalLockStatus(nextLockVal);
                      setJournalLockEnabled(nextLockVal);
                      window.dispatchEvent(new CustomEvent("altcycles:journal-lock-changed"));
                      if (enableTesting) {
                        toast.warning("Mode Testing diaktifkan. Transaksi jurnal dapat diedit & dihapus.");
                      } else {
                        toast.success("Mode Normal (Produksi) aktif. Kunci jurnal diaktifkan ketat.");
                      }
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : t("error", "Gagal mengubah mode sistem."));
                    } finally {
                      setTogglingLock(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </Card>

        {/* Card 2: Kontrol Tutup Buku Otomatis (Auto Closing Books Control) */}
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-center min-h-[76px]">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <CardHeaderTitleWithInfo
              title={t("settings:master_readonly.auto_close_title", "Tutup Buku Otomatis")}
              description={
                autoClosingEnabled
                  ? t("settings:master_readonly.auto_close_desc_active", "Sistem otomatis membuat dan memposting ayat jurnal penutup GAAP/IFRS ke Ikhtisar Laba Rugi serta Saldo Laba Ditahan saat tutup buku periode.")
                  : t("settings:master_readonly.auto_close_desc_inactive", "Tutup buku otomatis nonaktif. Penutupan buku dan jurnal penutup dilakukan manual oleh Bendahara.")
              }
              titleClassName="text-xs sm:text-sm font-bold"
            />
            <label
              htmlFor="auto-closing-switch"
              className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {autoClosingEnabled ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
              </span>
              <Switch
                id="auto-closing-switch"
                checked={autoClosingEnabled}
                disabled={togglingAutoClosing}
                aria-label={t("settings:master_readonly.auto_close_title", "Toggle Tutup Buku Otomatis")}
                onCheckedChange={async (nextVal) => {
                  setTogglingAutoClosing(true);
                  try {
                    await setAutoClosingStatus(nextVal);
                    setAutoClosingEnabled(nextVal);
                    if (nextVal) {
                      toast.success(t("settings:master_readonly.auto_close_toast_enabled", "Tutup buku otomatis diaktifkan. Jurnal penutup GAAP/IFRS akan diposting otomatis saat tutup periode."));
                    } else {
                      toast.info(t("settings:master_readonly.auto_close_toast_disabled", "Tutup buku otomatis dinonaktifkan. Penutupan buku dapat dilakukan manual oleh Bendahara."));
                    }
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : t("error", "Gagal mengubah status tutup buku otomatis."));
                  } finally {
                    setTogglingAutoClosing(false);
                  }
                }}
              />
            </label>
          </div>
        </Card>

        {/* Card 3: Kontrol Estimasi PPh 23 (2%) pada Invoice Klien */}
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-center min-h-[76px]">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <CardHeaderTitleWithInfo
              title={t("settings:master_readonly.pph23_title", "Estimasi PPh 23 (2%)")}
              description={
                pph23Enabled
                  ? t("settings:master_readonly.pph23_desc_active", "Menampilkan estimasi potongan PPh 23 sebesar 2% pada cetak invoice klien.")
                  : t("settings:master_readonly.pph23_desc_inactive", "Faktur klien dicetak standar tanpa estimasi potongan PPh 23.")
              }
              titleClassName="text-xs sm:text-sm font-bold"
            />
            <label
              htmlFor="pph23-estimate-switch"
              className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {pph23Enabled ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
              </span>
              <Switch
                id="pph23-estimate-switch"
                checked={pph23Enabled}
                disabled={togglingPph23}
                aria-label={t("settings:master_readonly.pph23_title", "Toggle Estimasi PPh 23 (2%)")}
                onCheckedChange={async (nextVal) => {
                  setTogglingPph23(true);
                  try {
                    await setPph23EstimateStatus(nextVal);
                    setPph23Enabled(nextVal);
                    if (nextVal) {
                      toast.success(t("settings:master_readonly.pph23_toast_enabled", "Estimasi PPh 23 (2%) diaktifkan pada dokumen cetak Invoice klien."));
                    } else {
                      toast.info(t("settings:master_readonly.pph23_toast_disabled", "Estimasi PPh 23 (2%) dinonaktifkan pada dokumen cetak Invoice klien."));
                    }
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : t("error", "Gagal mengubah status estimasi PPh 23."));
                  } finally {
                    setTogglingPph23(false);
                  }
                }}
              />
            </label>
          </div>
        </Card>

        {/* Card 4: Pengaturan Mata Uang Fungsional Sistem */}
        <FunctionalCurrencyCard />
      </div>

      {/* Card 5: Kurs Konversi Valuta Asing (Valas) ke Rupiah */}
      <ExchangeRatesCard />

      <Tabs defaultValue="coa">
        <TabsList>
          <TabsTrigger value="coa">
            <BookOpenIcon className="size-4 shrink-0" />
            <span>{t("settings:master_readonly.tab_coa", "Bagan Akun (CoA)")}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {accounts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="proyek">
            <FolderKanbanIcon className="size-4 shrink-0" />
            <span>{t("settings:master_readonly.tab_projects", "Proyek")}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {projects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="vendor">
            <Building2Icon className="size-4 shrink-0" />
            <span>{t("settings:master_readonly.tab_vendors", "Vendor")}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {vendors.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pelanggan">
            <UsersIcon className="size-4 shrink-0" />
            <span>{t("settings:master_readonly.tab_customers", "Pelanggan")}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums bg-muted text-muted-foreground group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors">
              {customers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <Card className="overflow-hidden">
            <CardHeaderWithInfo
              title={t("settings:master_readonly.coa_card_title", "Bagan Akun (Chart of Accounts)")}
              description={t("settings:master_readonly.coa_card_desc", "Tampilan pemantauan hanya-baca untuk Super Admin.")}
            />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_code", "Kode")}</TableHead>
                    <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_account_name", "Nama Akun")}</TableHead>
                    <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_type", "Tipe")}</TableHead>
                    <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_normal_balance", "Saldo Normal")}</TableHead>
                    <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_system_tag", "Penanda Sistem")}</TableHead>
                    <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 font-mono font-medium text-center whitespace-nowrap">
                        {acc.code}
                      </TableCell>
                      <TableCell className="px-3 font-medium">
                        {getLocalizedAccountName(acc, language)}
                      </TableCell>
                      <TableCell className="px-3 text-center">
                        {getLocalizedAccountType(acc.account_type, language)}
                      </TableCell>
                      <TableCell className="px-3 capitalize text-center">
                        {acc.normal_balance === "debit" ? t("accounting:normal_balance.debit", "Debit") : t("accounting:normal_balance.credit", "Kredit")}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground text-center">
                        {acc.system_tag}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={acc.is_active ? "success" : "secondary"}
                            label={acc.is_active ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
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
            <CardHeaderWithInfo
              title={t("settings:master_readonly.projects_card_title", "Daftar Proyek")}
              description={t("settings:master_readonly.projects_card_desc", "Tampilan pemantauan hanya-baca proyek klien dan internal.")}
            />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_code", "Kode")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_project_name", "Nama Proyek")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">{t("settings:master_readonly.col_contract_value", "Nilai Kontrak")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_milestones", "Termin")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_rev_method", "Metode Pengakuan")}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 font-mono font-medium text-center whitespace-nowrap">
                        {p.code}
                      </TableCell>
                      <TableCell className="px-3 font-medium">{p.name}</TableCell>
                      <TableCell className="px-3 whitespace-nowrap">
                        <MonetaryCell amount={p.contract_value} />
                      </TableCell>
                      <TableCell className="px-3 text-center tabular-nums whitespace-nowrap">
                        {t("settings:master_readonly.milestones_count", { count: p.term_count })}
                      </TableCell>
                      <TableCell className="px-3 text-center text-muted-foreground">
                        {REVENUE_METHOD_LABELS[p.revenue_method]}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center whitespace-nowrap">
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
            <CardHeaderWithInfo
              title={t("settings:master_readonly.vendors_card_title", "Daftar Vendor")}
              description={t("settings:master_readonly.vendors_card_desc", "Direktori vendor pemasok hanya-baca untuk pengawasan sistem.")}
            />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_code", "Kode")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_vendor_name", "Nama Vendor")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_contact", "Kontak")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_bank_account", "Rekening")}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 font-mono font-medium text-center whitespace-nowrap">{v.code}</TableCell>
                      <TableCell className="px-3 font-medium">{v.name}</TableCell>
                      <TableCell className="px-3 text-center">{v.contact_name ?? "-"}</TableCell>
                      <TableCell className="px-3 text-xs">
                        {v.bank_account_number || v.bank_name ? (
                          <>
                            <div>{v.bank_account_number || "-"}</div>
                            <div className="text-muted-foreground">{v.bank_name || ""}</div>
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={v.is_active ? "success" : "secondary"}
                            label={v.is_active ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
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
            <CardHeaderWithInfo
              title={t("settings:master_readonly.customers_card_title", "Daftar Pelanggan")}
              description={t("settings:master_readonly.customers_card_desc", "Basis data pelanggan dan klien perusahaan hanya-baca.")}
            />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_code", "Kode")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_customer_name", "Nama / Perusahaan")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_pic", "PIC")}</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_email", "Email")}</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:master_readonly.col_status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 font-mono font-medium text-center whitespace-nowrap">{c.code}</TableCell>
                      <TableCell className="px-3 font-medium">{c.name}</TableCell>
                      <TableCell className="px-3 text-center">{c.contact_person ?? "-"}</TableCell>
                      <TableCell className="px-3 text-center text-muted-foreground">{c.email ?? "-"}</TableCell>
                      <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={c.is_active ? "success" : "secondary"}
                            label={c.is_active ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
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

      <ConfirmActionDialog
        open={confirmPurgeOpen}
        onOpenChange={setConfirmPurgeOpen}
        title="Bersihkan Data Testing & Nomor Urut Dokumen?"
        description="Aksi ini akan me-reset seluruh pencacah urutan nomor dokumen (kolom 'Urutan Terakhir' kembali ke 'Belum dipakai') dan membersihkan data hasil pengujian. Transaksi resmi Altvira tetap terjaga."
        confirmLabel={purging ? "Membersihkan..." : "Bersihkan Sekarang"}
        onConfirm={handlePurgeData}
      />
    </div>
  );
}

