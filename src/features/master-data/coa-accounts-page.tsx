import * as React from "react";
import { PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
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

export function CoaAccountsPage() {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bagan Akun (Chart of Accounts SAK)
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun buku besar berbasis SAK. Akun yang telah memiliki transaksi jurnal terkunci dari penghapusan demi integritas audit pembukuan.
          </p>
        </div>
        <Button type="button" onClick={openNewDialog}>
          <PlusIcon data-icon="inline-start" />
          Tambah Akun Baru
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Bagan Akun</CardTitle>
          <CardDescription>
            Akun bertanda <code>work_in_progress</code> dan{" "}
            <code>contract_billings</code> digunakan otomatis oleh mesin
            Progress Billing (≥ 3 termin).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Cari kode atau nama akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sm:w-56">
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

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat bagan akun...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Tidak ada akun yang cocok"
              description="Sesuaikan kata kunci atau tipe akun."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Saldo Normal</TableHead>
                  <TableHead>Tag Sistem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono font-semibold">
                      {acc.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{acc.name}</span>
                        {!acc.is_postable ? (
                          <span className="text-xs text-muted-foreground">
                            Akun Induk (Header)
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{ACCOUNT_TYPE_LABELS[acc.account_type]}</TableCell>
                    <TableCell className="capitalize">
                      {acc.normal_balance}
                    </TableCell>
                    <TableCell>
                      {acc.system_tag !== "none" ? (
                        <StatusBadge tone="info" label={acc.system_tag} />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={acc.is_active ? "success" : "secondary"}
                        label={acc.is_active ? "Aktif" : "Nonaktif"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(acc)}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setToggleTarget(acc)}
                        >
                          <PowerIcon data-icon="inline-start" />
                          {acc.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={acc.used_in_journal_count > 0}
                          title={
                            acc.used_in_journal_count > 0
                              ? "Tidak dapat dihapus karena sudah memiliki riwayat mutasi jurnal"
                              : "Hapus akun yang belum pernah dipakai"
                          }
                          onClick={() => setDeleteTarget(acc)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah / Ubah Akun */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Ubah Akun Buku Besar" : "Tambah Akun Baru"}
            </DialogTitle>
            <DialogDescription>
              Pastikan tipe akun dan saldo normal sesuai klasifikasi SAK.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="acc-code">Kode Akun</FieldLabel>
                  <Input
                    id="acc-code"
                    required
                    placeholder="Contoh: 5-1501"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Tipe Akun</FieldLabel>
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
                <FieldLabel htmlFor="acc-name">Nama Akun</FieldLabel>
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
                  <FieldLabel>Saldo Normal</FieldLabel>
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

