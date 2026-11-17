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
  deletePeriod,
  listAccounts,
  listPeriods,
  reopenPeriod,
  saveAccount,
} from "@/lib/data-service";
import { runPeriodClosingBook } from "@/lib/operations-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { ACCOUNT_TYPE_LABELS } from "@/lib/formatters";
import type {
  AccountRow,
  AccountSystemTag,
  AccountType,
  CashFlowCategory,
  NormalBalance,
  PeriodRow,
} from "@/types/database.types";
import { PeriodListTable } from "@/features/master-data/components/period-list-table";
import { PeriodCreateDialog } from "@/features/master-data/components/period-create-dialog";

export interface CoaAccountsPageProps {
  hideHeader?: boolean;
}

export function CoaAccountsPage({ hideHeader = false }: CoaAccountsPageProps = {}) {
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // State Dialog Periode
  const [createPeriodOpen, setCreatePeriodOpen] = React.useState(false);
  const [closePeriodTarget, setClosePeriodTarget] = React.useState<PeriodRow | null>(null);
  const [reopenPeriodTarget, setReopenPeriodTarget] = React.useState<PeriodRow | null>(null);
  const [deletePeriodTarget, setDeletePeriodTarget] = React.useState<PeriodRow | null>(null);

  // Dialog Form Tambah / Ubah Akun
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

  // Dialog Konfirmasi Nonaktifkan / Hapus Akun
  const [toggleTarget, setToggleTarget] = React.useState<AccountRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AccountRow | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [accData, perData] = await Promise.all([
        listAccounts(),
        listPeriods(),
      ]);
      setAccounts(accData);
      setPeriods(perData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeSync(reload);

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

  async function handleToggleActive() {
    if (!toggleTarget) return;
    try {
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
      toast.success(
        toggleTarget.is_active
          ? `Akun ${toggleTarget.code} dinonaktifkan.`
          : `Akun ${toggleTarget.code} diaktifkan kembali.`,
      );
      setToggleTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status akun.",
      );
    }
  }

  async function handleDeleteAccount() {
    if (!deleteTarget) return;
    try {
      await deleteAccount(deleteTarget.id);
      toast.success(`Akun ${deleteTarget.code} berhasil dihapus.`);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus akun.");
    }
  }

  async function handleSave(e: React.FormEvent) {
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

  // Aksi Periode
  async function handleClosePeriod() {
    if (!closePeriodTarget) return;
    try {
      await runPeriodClosingBook(closePeriodTarget.id);
      toast.success(`Periode ${closePeriodTarget.name} berhasil ditutup.`);
      setClosePeriodTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menutup periode.");
    }
  }

  async function handleReopenPeriod(reason?: string) {
    if (!reopenPeriodTarget) return;
    try {
      await reopenPeriod(reopenPeriodTarget.id, reason || "Pembukaan kembali periode akuntansi.");
      toast.success(`Periode ${reopenPeriodTarget.name} dibuka kembali.`);
      setReopenPeriodTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka kembali periode.");
    }
  }

  async function handleDeletePeriod() {
    if (!deletePeriodTarget) return;
    try {
      await deletePeriod(deletePeriodTarget.id);
      toast.success(`Periode ${deletePeriodTarget.name} berhasil dihapus.`);
      setDeletePeriodTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus periode.");
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
              Setup Akuntansi
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Kelola struktur bagan akun (CoA) dan pembukaan periode pembukuan untuk pencatatan transaksi keuangan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreatePeriodOpen(true)}
              className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>Buka Periode Baru</span>
            </Button>
            <Button
              type="button"
              onClick={openNewDialog}
              className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Akun Baru</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Setup Akuntansi
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Kelola struktur bagan akun (CoA) dan pembukaan periode pembukuan untuk pencatatan transaksi keuangan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreatePeriodOpen(true)}
              className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>Buka Periode Baru</span>
            </Button>
            <Button
              type="button"
              onClick={openNewDialog}
              className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Akun Baru</span>
            </Button>
          </div>
        </div>
      )}

      {/* 1. Card Daftar Periode Bulanan (Dipindahkan dari Tab Tutup Buku) */}
      <PeriodListTable
        periods={periods}
        loading={loading}
        onClosePeriod={setClosePeriodTarget}
        onReopenPeriod={setReopenPeriodTarget}
        onDeletePeriod={setDeletePeriodTarget}
      />

      {/* 2. Card Daftar Bagan Akun (Chart of Accounts) */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32 pl-6">Kode</TableHead>
                <TableHead>Nama Akun</TableHead>
                <TableHead className="w-36">Tipe Akun</TableHead>
                <TableHead className="w-28 text-center">Saldo Normal</TableHead>
                <TableHead className="w-28 text-center">Kategori Arus Kas</TableHead>
                <TableHead className="w-24 text-center">Postable</TableHead>
                <TableHead className="w-28 text-center">Status</TableHead>
                <TableHead className="w-24 text-center pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Spinner />
                      <span>Memuat bagan akun...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Tidak ada akun yang sesuai dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono text-xs font-semibold pl-6 align-top">
                      {acc.code}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium text-foreground">{acc.name}</div>
                      {acc.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {acc.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground align-top">
                      {ACCOUNT_TYPE_LABELS[acc.account_type] ?? acc.account_type}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium capitalize align-top">
                      {acc.normal_balance}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium capitalize align-top">
                      {acc.cash_flow_category}
                    </TableCell>
                    <TableCell className="text-center align-top">
                      {acc.is_postable ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Ya
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Header</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <StatusBadge
                        tone={acc.is_active ? "success" : "secondary"}
                        label={acc.is_active ? "Aktif" : "Nonaktif"}
                      />
                    </TableCell>
                    <TableCell className="text-center pr-6 align-top">
                      <div className="flex items-center justify-center gap-1 -my-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(acc)}
                          title="Ubah Akun"
                          className="size-8 rounded-lg cursor-pointer"
                        >
                          <PencilIcon className="size-3.5" />
                          <span className="sr-only">Ubah</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToggleTarget(acc)}
                          title={
                            acc.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"
                          }
                          className={cn(
                            "size-8 rounded-lg cursor-pointer",
                            acc.is_active
                              ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
                          )}
                        >
                          <PowerIcon className="size-3.5" />
                          <span className="sr-only">
                            {acc.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(acc)}
                          title="Hapus Akun"
                          className="size-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2Icon className="size-3.5" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Buka Periode Baru */}
      <PeriodCreateDialog
        open={createPeriodOpen}
        onOpenChange={setCreatePeriodOpen}
        onSuccess={reload}
      />

      {/* Dialog Konfirmasi Tutup Periode */}
      <ConfirmActionDialog
        open={Boolean(closePeriodTarget)}
        onOpenChange={(open) => {
          if (!open) setClosePeriodTarget(null);
        }}
        title={`Tutup Periode ${closePeriodTarget?.name ?? ""}?`}
        description={`Anda akan menutup periode buku ${closePeriodTarget?.name ?? ""}. Seluruh transaksi jurnal pada periode ini akan dikunci dan jurnal penutup dapat diposting otomatis atau manual.`}
        confirmLabel="Ya, Tutup Periode"
        destructive
        onConfirm={handleClosePeriod}
      />

      {/* Dialog Konfirmasi Buka Kembali Periode */}
      <ConfirmActionDialog
        open={Boolean(reopenPeriodTarget)}
        onOpenChange={(open) => {
          if (!open) setReopenPeriodTarget(null);
        }}
        title={`Buka Kembali Periode ${reopenPeriodTarget?.name ?? ""}?`}
        description={`Membuka kembali periode yang sudah ditutup memerlukan alasan audit trail resmi. Pastikan Anda telah mengonfirmasi dengan Super Admin/Auditor.`}
        confirmLabel="Ya, Buka Kembali"
        requireReason
        reasonLabel="Alasan Pembukaan Kembali (Audit Trail)"
        reasonPlaceholder="Tuliskan alasan pembukaan kembali periode secara jelas (minimal 5 karakter)..."
        onConfirm={handleReopenPeriod}
      />

      {/* Dialog Konfirmasi Hapus Periode */}
      <ConfirmActionDialog
        open={Boolean(deletePeriodTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletePeriodTarget(null);
        }}
        title={`Hapus Periode ${deletePeriodTarget?.name ?? ""}?`}
        description={`Periode ${deletePeriodTarget?.name ?? ""} yang belum memiliki transaksi dapat dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Periode"
        destructive
        onConfirm={handleDeletePeriod}
      />

      {/* Dialog Form Tambah / Ubah Akun */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Ubah Bagan Akun" : "Tambah Bagan Akun Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="acc-code" required>
                  Kode Akun
                </FieldLabel>
                <Input
                  id="acc-code"
                  required
                  placeholder="Contoh: 1101 atau 5201"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="acc-name" required>
                  Nama Akun
                </FieldLabel>
                <Input
                  id="acc-name"
                  required
                  placeholder="Contoh: Kas Operasional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            </FieldGroup>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="acc-type" required>
                  Tipe Akun
                </FieldLabel>
                <Select
                  value={accountType}
                  onValueChange={(val) =>
                    handleAccountTypeChange(val as AccountType)
                  }
                >
                  <SelectTrigger id="acc-type">
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
              <Field>
                <FieldLabel htmlFor="acc-balance" required>
                  Saldo Normal
                </FieldLabel>
                <Select
                  value={normalBalance}
                  onValueChange={(val) =>
                    setNormalBalance(val as NormalBalance)
                  }
                >
                  <SelectTrigger id="acc-balance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Kredit</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="acc-cf" required>
                  Arus Kas
                </FieldLabel>
                <Select
                  value={cashFlowCategory}
                  onValueChange={(val) =>
                    setCashFlowCategory(val as CashFlowCategory)
                  }
                >
                  <SelectTrigger id="acc-cf">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="operating">Operasional</SelectItem>
                      <SelectItem value="investing">Investasi</SelectItem>
                      <SelectItem value="financing">Pendanaan</SelectItem>
                      <SelectItem value="none">Bukan Kas (None)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="acc-tag">Tag Sistem Khusus</FieldLabel>
                <Select
                  value={systemTag}
                  onValueChange={(val) =>
                    setSystemTag(val as AccountSystemTag)
                  }
                >
                  <SelectTrigger id="acc-tag">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Tidak Ada (Reguler)</SelectItem>
                      <SelectItem value="cash">Kas &amp; Bank</SelectItem>
                      <SelectItem value="ar">Piutang Usaha (AR)</SelectItem>
                      <SelectItem value="ap">Utang Usaha (AP)</SelectItem>
                      <SelectItem value="retained_earnings">
                        Laba Ditahan
                      </SelectItem>
                      <SelectItem value="current_earnings">
                        Laba Tahun Berjalan
                      </SelectItem>
                      <SelectItem value="tax_vat_in">PPN Masukan</SelectItem>
                      <SelectItem value="tax_vat_out">PPN Keluaran</SelectItem>
                      <SelectItem value="tax_wht23_payable">
                        Utang PPh 23
                      </SelectItem>
                      <SelectItem value="tax_wht23_prepaid">
                        Uang Muka PPh 23
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch
                    checked={isPostable}
                    onCheckedChange={setIsPostable}
                  />
                  <span className="text-xs font-medium">Bisa Diposting</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-xs font-medium">Status Aktif</span>
                </label>
              </div>
            </FieldGroup>

            <Field>
              <FieldLabel htmlFor="acc-desc">Keterangan / Fungsi Akun</FieldLabel>
              <Textarea
                id="acc-desc"
                placeholder="Deskripsi singkat fungsi dan peruntukan akun ini..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Akun"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Ubah Status Aktif Akun */}
      <ConfirmActionDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
        title={
          toggleTarget?.is_active
            ? `Nonaktifkan Akun ${toggleTarget?.code ?? ""}?`
            : `Aktifkan Akun ${toggleTarget?.code ?? ""}?`
        }
        description={
          toggleTarget?.is_active
            ? `Akun ${toggleTarget?.name} tidak akan muncul lagi di daftar pilihan akun saat penjurnalan baru.`
            : `Akun ${toggleTarget?.name} akan diaktifkan kembali dan dapat dipilih saat penjurnalan.`
        }
        confirmLabel={
          toggleTarget?.is_active ? "Ya, Nonaktifkan" : "Ya, Aktifkan"
        }
        onConfirm={handleToggleActive}
      />

      {/* Dialog Konfirmasi Hapus Akun */}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus Akun ${deleteTarget?.code ?? ""}?`}
        description={`Akun ${deleteTarget?.name} akan dihapus secara permanen dari sistem. Tindakan ini hanya berhasil jika akun belum memiliki riwayat transaksi jurnal.`}
        confirmLabel="Ya, Hapus Akun"
        destructive
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
