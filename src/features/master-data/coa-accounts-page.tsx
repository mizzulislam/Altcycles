import * as React from "react";
import { PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAccount,
  listAccounts,
  saveAccount,
} from "@/lib/data-service";
import { ACCOUNT_TYPE_LABELS } from "@/lib/formatters";
import type {
  AccountRow,
  AccountSystemTag,
  AccountType,
  CashFlowCategory,
  NormalBalance,
} from "@/types/database.types";

export interface CoaAccountsPageProps {
  hideHeader?: boolean;
}

export function CoaAccountsPage({ hideHeader = false }: CoaAccountsPageProps = {}) {
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // Dialog Form Tambah / Ubah
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | undefined>();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountType>("expense");
  const [normalBalance, setNormalBalance] =
    React.useState<NormalBalance>("debit");
  const [systemTag, setSystemTag] = React.useState<AccountSystemTag>("none");
  const [cashFlowCategory, setCashFlowCategory] =
    React.useState<CashFlowCategory>("operating");
  const [isPostable, setIsPostable] = React.useState(true);
  const [isActive, setIsActive] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Dialog Konfirmasi Nonaktifkan / Hapus
  const [toggleTarget, setToggleTarget] = React.useState<AccountRow | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<AccountRow | null>(
    null,
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAccounts();
      setAccounts(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat akun.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  function openNewDialog() {
    setEditingId(undefined);
    setCode("");
    setName("");
    setAccountType("expense");
    setNormalBalance("debit");
    setSystemTag("none");
    setCashFlowCategory("operating");
    setIsPostable(true);
    setIsActive(true);
    setDescription("");
    setEditorOpen(true);
  }

  function openEditDialog(acc: AccountRow) {
    setEditingId(acc.id);
    setCode(acc.code);
    setName(acc.name);
    setAccountType(acc.account_type);
    setNormalBalance(acc.normal_balance);
    setSystemTag(acc.system_tag);
    setCashFlowCategory(acc.cash_flow_category);
    setIsPostable(acc.is_postable);
    setIsActive(acc.is_active);
    setDescription(acc.description ?? "");
    setEditorOpen(true);
  }

  function handleAccountTypeChange(nextType: AccountType) {
    setAccountType(nextType);
    if (nextType === "asset" || nextType === "expense") {
      setNormalBalance("debit");
    } else {
      setNormalBalance("credit");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveAccount({
        id: editingId,
        code,
        name,
        account_type: accountType,
        normal_balance: normalBalance,
        parent_id: null,
        system_tag: systemTag,
        cash_flow_category: cashFlowCategory,
        is_postable: isPostable,
        is_active: isActive,
        description: description || null,
      });
      toast.success(
        editingId
          ? `Akun ${code} diperbarui.`
          : `Akun ${code} berhasil ditambahkan.`,
      );
      setEditorOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan akun.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = accounts.filter((a) => {
    const matchText =
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.account_type === typeFilter;
    return matchText && matchType;
  });

  return (
    <div className="flex flex-col gap-6">
      {!hideHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Bagan Akun (Chart of Accounts)
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Kelola struktur bagan akun untuk pencatatan dan pengelompokan transaksi keuangan.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" onClick={openNewDialog} className="cursor-pointer shadow-xs">
              <PlusIcon className="size-4" />
              Tambah Akun Baru
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Bagan Akun (Chart of Accounts)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Kelola struktur bagan akun untuk pencatatan dan pengelompokan transaksi keuangan.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={openNewDialog}
              className="cursor-pointer shadow-xs"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Akun Baru</span>
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>Daftar Bagan Akun</CardTitle>
            <CardDescription>
              Struktur klasifikasi akun buku besar untuk penjurnalan dan pelaporan keuangan.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Input
              placeholder="Cari kode atau nama akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 sm:w-64 h-9 rounded-xl bg-background"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48 h-9 rounded-xl bg-background">
                <SelectValue placeholder="Semua tipe akun" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua Tipe Akun</SelectItem>
                  <SelectItem value="asset">Aset</SelectItem>
                  <SelectItem value="contra_asset">Kontra-Aset</SelectItem>
                  <SelectItem value="liability">Liabilitas</SelectItem>
                  <SelectItem value="equity">Ekuitas</SelectItem>
                  <SelectItem value="revenue">Pendapatan</SelectItem>
                  <SelectItem value="expense">Beban</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat bagan akun...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-center w-32 pl-6">Kode</TableHead>
                  <TableHead className="text-center">Nama Akun</TableHead>
                  <TableHead className="text-center w-36">Tipe</TableHead>
                  <TableHead className="text-center w-36">Saldo Normal</TableHead>
                  <TableHead className="text-center w-32">Status</TableHead>
                  <TableHead className="text-center w-36 pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-12 px-6 text-center bg-muted/10 border-t border-dashed border-border/70">
                        <p className="text-sm font-semibold text-foreground">
                          Tidak ada akun yang cocok
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Sesuaikan kata kunci pencarian atau filter tipe akun di kanan atas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((acc) => {
                    const isHeader = !acc.is_postable;
                    return (
                      <TableRow
                        key={acc.id}
                        className={cn(
                          "transition-colors",
                          isHeader
                            ? "bg-muted/40 hover:bg-muted/50 font-bold border-y border-border/80"
                            : "hover:bg-muted/20",
                        )}
                      >
                        <TableCell className={cn("pl-6 font-mono", isHeader ? "font-bold text-foreground" : "font-semibold")}>
                          {acc.code}
                        </TableCell>
                        <TableCell>
                          <span className={cn(isHeader ? "font-bold text-foreground tracking-wide" : "font-medium text-foreground")}>
                            {acc.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {!isHeader ? ACCOUNT_TYPE_LABELS[acc.account_type] : null}
                        </TableCell>
                        <TableCell className="text-center capitalize">
                          {!isHeader ? acc.normal_balance : null}
                        </TableCell>
                        <TableCell className="text-center">
                          {!isHeader ? (
                            <div className="-my-px inline-flex justify-center">
                              <StatusBadge
                                tone={acc.is_active ? "success" : "secondary"}
                                label={acc.is_active ? "Aktif" : "Nonaktif"}
                              />
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          {!isHeader ? (
                            <div className="flex justify-center items-center gap-1.5 -my-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Ubah Akun"
                                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => openEditDialog(acc)}
                              >
                                <PencilIcon className="size-4" />
                                <span className="sr-only">Ubah</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title={acc.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                                className={cn(
                                  "size-8 rounded-lg cursor-pointer",
                                  acc.is_active
                                    ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
                                )}
                                onClick={() => setToggleTarget(acc)}
                              >
                                <PowerIcon className="size-4" />
                                <span className="sr-only">
                                  {acc.is_active ? "Nonaktifkan" : "Aktifkan"}
                                </span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={acc.used_in_journal_count > 0}
                                title={
                                  acc.used_in_journal_count > 0
                                    ? "Tidak dapat dihapus karena sudah memiliki riwayat mutasi jurnal"
                                    : "Hapus Akun"
                                }
                                className="size-8 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-40"
                                onClick={() => setDeleteTarget(acc)}
                              >
                                <Trash2Icon className="size-4" />
                                <span className="sr-only">Hapus</span>
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah / Ubah Akun */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Ubah Akun Buku Besar" : "Tambah Akun Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="acc-code" required>Kode Akun</FieldLabel>
                  <Input
                    id="acc-code"
                    required
                    placeholder="Contoh: 5-1501"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel required>Tipe Akun</FieldLabel>
                  <Select
                    value={accountType}
                    onValueChange={(v) =>
                      handleAccountTypeChange(v as AccountType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="asset">Aset</SelectItem>
                        <SelectItem value="contra_asset">Kontra-Aset</SelectItem>
                        <SelectItem value="liability">Liabilitas</SelectItem>
                        <SelectItem value="equity">Ekuitas</SelectItem>
                        <SelectItem value="revenue">Pendapatan</SelectItem>
                        <SelectItem value="expense">Beban</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="acc-name" required>Nama Akun</FieldLabel>
                <Input
                  id="acc-name"
                  required
                  placeholder="Contoh: Beban Pengujian Keamanan Proyek"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>Saldo Normal</FieldLabel>
                  <Select
                    value={normalBalance}
                    onValueChange={(v) => setNormalBalance(v as NormalBalance)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Penanda Otomasi Sistem</FieldLabel>
                  <Select
                    value={systemTag}
                    onValueChange={(v) => setSystemTag(v as AccountSystemTag)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Umum (Tanpa Tag)</SelectItem>
                        <SelectItem value="cash_bank">Kas / Bank</SelectItem>
                        <SelectItem value="accounts_receivable">
                          Piutang Usaha
                        </SelectItem>
                        <SelectItem value="unbilled_receivable">
                          Piutang Belum Ditagih
                        </SelectItem>
                        <SelectItem value="work_in_progress">
                          Jasa dalam Proses (Progress Billing)
                        </SelectItem>
                        <SelectItem value="contract_billings">
                          Penagihan atas Kontrak (Progress Billing)
                        </SelectItem>
                        <SelectItem value="accounts_payable">
                          Utang Usaha
                        </SelectItem>
                        <SelectItem value="unearned_revenue">
                          Pendapatan Diterima di Muka
                        </SelectItem>
                        <SelectItem value="service_revenue">
                          Pendapatan Jasa Utama
                        </SelectItem>
                        <SelectItem value="retained_earnings">
                          Laba Ditahan
                        </SelectItem>
                        <SelectItem value="shared_expense">
                          Beban Operasional Bersama
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="acc-postable">
                  Dapat Diposting Langsung ke Jurnal
                </FieldLabel>
                <Switch
                  id="acc-postable"
                  checked={isPostable}
                  onCheckedChange={setIsPostable}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="acc-desc">Keterangan</FieldLabel>
                <Textarea
                  id="acc-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                  className="hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-colors"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Akun
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Aktif / Nonaktif */}
      <ConfirmActionDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
        title={
          toggleTarget?.is_active
            ? `Nonaktifkan akun ${toggleTarget.code} — ${toggleTarget.name}?`
            : `Aktifkan kembali akun ${toggleTarget?.code ?? ""}?`
        }
        description="Akun nonaktif tidak dapat dipilih pada jurnal atau pengajuan baru, namun seluruh histori laporan keuangan tetap terjaga."
        onConfirm={async () => {
          if (!toggleTarget) return;
          await saveAccount({
            id: toggleTarget.id,
            code: toggleTarget.code,
            name: toggleTarget.name,
            account_type: toggleTarget.account_type,
            normal_balance: toggleTarget.normal_balance,
            parent_id: toggleTarget.parent_id,
            system_tag: toggleTarget.system_tag,
            cash_flow_category: toggleTarget.cash_flow_category,
            is_postable: toggleTarget.is_postable,
            is_active: !toggleTarget.is_active,
            description: toggleTarget.description,
          });
          toast.success("Status akun berhasil diperbarui.");
          await reload();
        }}
      />

      {/* Konfirmasi Hapus Akun yang Belum Terpakai */}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus akun ${deleteTarget?.code ?? ""}?`}
        description="Hanya akun yang belum pernah digunakan pada jurnal maupun anggaran yang dapat dihapus."
        destructive
        confirmLabel="Ya, Hapus Akun"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteAccount(deleteTarget.id);
          toast.success("Akun berhasil dihapus.");
          await reload();
        }}
      />
    </div>
  );
}

