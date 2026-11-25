import * as React from "react";
import {
  CalculatorIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { DatePicker } from "@/components/ui/date-picker";
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
import { NumberInput } from "@/components/ui/number-input";
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
import {
  formatDateI18n,
  formatRupiah,
  roundRupiah,
} from "@/lib/formatters";
import {
  deleteFixedAsset,
  listFixedAssets,
  runPeriodClosingBook,
  runPeriodFixedAssetDepreciation,
  saveFixedAsset,
} from "@/lib/operations-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { useLanguage } from "@/lib/i18n";
import {
  getLocalizedAccountName,
  getLocalizedAccountDescription,
  getLocalizedAccountType,
  getLocalizedNormalBalance,
  getLocalizedPeriodName,
  getLocalizedSystemTag,
  SYSTEM_TAG_MAP,
} from "@/lib/glossary";
import type {
  AccountRow,
  AccountSystemTag,
  AccountType,
  CashFlowCategory,
  FixedAssetDepreciationRow,
  FixedAssetRow,
  FixedAssetStatus,
  NormalBalance,
  PeriodRow,
} from "@/types/database.types";
import { PeriodListTable } from "@/features/master-data/components/period-list-table";
import { PeriodCreateDialog } from "@/features/master-data/components/period-create-dialog";

export interface CoaAccountsPageProps {
  hideHeader?: boolean;
}

export function CoaAccountsPage({ hideHeader = false }: CoaAccountsPageProps = {}) {
  const { t, language } = useLanguage();
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

  // State Register & Otomatisasi Penyusutan Aset Tetap (Item 3)
  const [fixedAssets, setFixedAssets] = React.useState<FixedAssetRow[]>([]);
  const [depreciations, setDepreciations] = React.useState<
    FixedAssetDepreciationRow[]
  >([]);
  const [runningDepr, setRunningDepr] = React.useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = React.useState(false);
  const [savingAsset, setSavingAsset] = React.useState(false);
  const [deleteAssetTarget, setDeleteAssetTarget] =
    React.useState<FixedAssetRow | null>(null);
  const [assetForm, setAssetForm] = React.useState({
    id: undefined as string | undefined,
    asset_code: "",
    asset_name: "",
    acquisition_date: "2026-11-01",
    acquisition_cost: 12_000_000,
    useful_life_months: 48,
    salvage_value: 0,
    asset_account_id: "",
    accum_depr_account_id: "",
    expense_account_id: "",
    status: "active" as FixedAssetStatus,
    disposed_date: "",
    notes: "",
  });

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [accData, perData, faBundle] = await Promise.all([
        listAccounts(),
        listPeriods(),
        listFixedAssets(),
      ]);
      setAccounts(accData);
      setPeriods(perData);
      setFixedAssets(faBundle.assets);
      setDepreciations(faBundle.depreciations);
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
          ? t("accounting:coa.toast_acc_deactivated", {
              code: toggleTarget.code,
              defaultValue: `Akun ${toggleTarget.code} dinonaktifkan.`,
            })
          : t("accounting:coa.toast_acc_activated", {
              code: toggleTarget.code,
              defaultValue: `Akun ${toggleTarget.code} diaktifkan kembali.`,
            }),
      );
      setToggleTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common:error", "Gagal mengubah status akun."),
      );
    }
  }

  async function handleDeleteAccount() {
    if (!deleteTarget) return;
    try {
      await deleteAccount(deleteTarget.id);
      toast.success(
        t("accounting:coa.toast_acc_deleted", {
          code: deleteTarget.code,
          defaultValue: `Akun ${deleteTarget.code} berhasil dihapus.`,
        }),
      );
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common:error", "Gagal menghapus akun."));
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
          ? t("accounting:coa.toast_acc_updated", {
              code,
              defaultValue: `Akun ${code} diperbarui.`,
            })
          : t("accounting:coa.toast_acc_added", {
              code,
              defaultValue: `Akun ${code} berhasil ditambahkan.`,
            }),
      );
      setEditorOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common:error", "Gagal menyimpan akun."));
    } finally {
      setSaving(false);
    }
  }

  // Aksi Periode
  async function handleClosePeriod() {
    if (!closePeriodTarget) return;
    try {
      await runPeriodClosingBook(closePeriodTarget.id);
      toast.success(
        t("accounting:closing.toast_closed_success", {
          name: getLocalizedPeriodName(closePeriodTarget.name, language),
          defaultValue: `Periode ${closePeriodTarget.name} berhasil ditutup.`,
        }),
      );
      setClosePeriodTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("accounting:closing.toast_closed_error", "Gagal menutup periode."),
      );
    }
  }

  async function handleReopenPeriod(reason?: string) {
    if (!reopenPeriodTarget) return;
    try {
      await reopenPeriod(
        reopenPeriodTarget.id,
        reason || (language === "en" ? "Reopening of accounting period." : "Pembukaan kembali periode akuntansi."),
      );
      toast.success(
        t("accounting:closing.toast_reopened_success", {
          name: getLocalizedPeriodName(reopenPeriodTarget.name, language),
          defaultValue: `Periode ${reopenPeriodTarget.name} dibuka kembali.`,
        }),
      );
      setReopenPeriodTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("accounting:closing.toast_reopened_error", "Gagal membuka kembali periode."),
      );
    }
  }

  async function handleDeletePeriod() {
    if (!deletePeriodTarget) return;
    try {
      await deletePeriod(deletePeriodTarget.id);
      toast.success(
        t("accounting:coa.toast_period_deleted", {
          name: getLocalizedPeriodName(deletePeriodTarget.name, language),
          defaultValue: `Periode ${deletePeriodTarget.name} berhasil dihapus.`,
        }),
      );
      setDeletePeriodTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common:error", "Gagal menghapus periode."));
    }
  }

  // Aksi Register & Penyusutan Aset Tetap (Item 3)
  function openNewAssetDialog() {
    const defaultAssetAcc =
      accounts.find((a) => a.code === "1-2101") ??
      accounts.find((a) => a.account_type === "asset" && a.is_postable);
    const defaultAccumAcc =
      accounts.find((a) => a.code === "1-2102") ??
      accounts.find((a) => a.account_type === "contra_asset" && a.is_postable);
    const defaultExpAcc =
      accounts.find((a) => a.code === "6-1401") ??
      accounts.find((a) => a.account_type === "expense" && a.is_postable);

    setAssetForm({
      id: undefined,
      asset_code: `FA-2026-${String(fixedAssets.length + 1).padStart(3, "0")}`,
      asset_name: "",
      acquisition_date: new Date().toISOString().slice(0, 10),
      acquisition_cost: 12_000_000,
      useful_life_months: 48,
      salvage_value: 0,
      asset_account_id: defaultAssetAcc?.id ?? "",
      accum_depr_account_id: defaultAccumAcc?.id ?? "",
      expense_account_id: defaultExpAcc?.id ?? "",
      status: "active",
      disposed_date: "",
      notes: "",
    });
    setAssetDialogOpen(true);
  }

  function openEditAssetDialog(fa: FixedAssetRow) {
    setAssetForm({
      id: fa.id,
      asset_code: fa.asset_code,
      asset_name: fa.asset_name,
      acquisition_date: fa.acquisition_date,
      acquisition_cost: fa.acquisition_cost,
      useful_life_months: fa.useful_life_months,
      salvage_value: fa.salvage_value,
      asset_account_id: fa.asset_account_id,
      accum_depr_account_id: fa.accum_depr_account_id,
      expense_account_id: fa.expense_account_id,
      status: fa.status,
      disposed_date: fa.disposed_date ?? "",
      notes: fa.notes ?? "",
    });
    setAssetDialogOpen(true);
  }

  async function handleSaveAsset(e: React.FormEvent) {
    e.preventDefault();
    setSavingAsset(true);
    try {
      await saveFixedAsset({
        id: assetForm.id,
        asset_code: assetForm.asset_code,
        asset_name: assetForm.asset_name,
        acquisition_date: assetForm.acquisition_date,
        acquisition_cost: assetForm.acquisition_cost,
        useful_life_months: assetForm.useful_life_months,
        salvage_value: assetForm.salvage_value,
        asset_account_id: assetForm.asset_account_id,
        accum_depr_account_id: assetForm.accum_depr_account_id,
        expense_account_id: assetForm.expense_account_id,
        status: assetForm.status,
        disposed_date: assetForm.disposed_date || null,
        notes: assetForm.notes || null,
      });
      toast.success(
        t(
          "accounting:fixed_assets.toast_saved",
          "Data aset tetap berhasil disimpan.",
        ),
      );
      setAssetDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:fixed_assets.toast_save_error", "Gagal menyimpan aset tetap."),
      );
    } finally {
      setSavingAsset(false);
    }
  }

  async function handleDeleteAsset() {
    if (!deleteAssetTarget) return;
    try {
      await deleteFixedAsset(deleteAssetTarget.id);
      toast.success(
        t("accounting:fixed_assets.toast_deleted", {
          code: deleteAssetTarget.asset_code,
          defaultValue: `Aset tetap ${deleteAssetTarget.asset_code} berhasil dihapus.`,
        }),
      );
      setDeleteAssetTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:fixed_assets.toast_delete_error", "Gagal menghapus aset tetap."),
      );
    }
  }

  async function handleRunOpenPeriodDepreciation() {
    const openPeriod = periods.find((p) => p.status === "open");
    if (!openPeriod) {
      toast.error(
        t(
          "accounting:fixed_assets.toast_no_open_period",
          "Tidak ada periode akuntansi terbuka untuk memposting jurnal penyusutan.",
        ),
      );
      return;
    }
    setRunningDepr(true);
    try {
      const summary = await runPeriodFixedAssetDepreciation(openPeriod.id);
      if (summary.postedCount > 0) {
        toast.success(
          t("accounting:fixed_assets.toast_depr_posted", {
            count: summary.postedCount,
            period: getLocalizedPeriodName(summary.periodName, language),
            amount: formatRupiah(summary.totalDepreciationAmount),
            defaultValue: `${summary.postedCount} jurnal penyusutan aset tetap (${formatRupiah(summary.totalDepreciationAmount)}) berhasil diposting untuk periode ${summary.periodName}.`,
          }),
        );
      } else {
        toast.info(
          t("accounting:fixed_assets.toast_depr_already_posted", {
            period: getLocalizedPeriodName(summary.periodName, language),
            defaultValue: `Seluruh aset tetap aktif sudah disusutkan pada periode ${summary.periodName} (idempoten, tidak ada jurnal ganda).`,
          }),
        );
      }
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:fixed_assets.toast_depr_error", "Gagal menjalankan penyusutan aset tetap."),
      );
    } finally {
      setRunningDepr(false);
    }
  }

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    const localizedName = getLocalizedAccountName(a, language).toLowerCase();
    const matchText =
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      localizedName.includes(q);
    const matchType = typeFilter === "all" || a.account_type === typeFilter;
    return matchText && matchType;
  });

  return (
    <div className="flex flex-col gap-6">
      {!hideHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t("accounting:coa.title", "Setup Akuntansi")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("accounting:coa.subtitle", "Kelola struktur bagan akun (CoA) dan pembukaan periode pembukuan untuk pencatatan transaksi keuangan.")}
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
              <span>{t("accounting:coa.btn_open_period", "Buka Periode Baru")}</span>
            </Button>
            <Button
              type="button"
              onClick={openNewDialog}
              className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>{t("accounting:coa.btn_add_account", "Tambah Akun Baru")}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("accounting:coa.title", "Setup Akuntansi")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("accounting:coa.subtitle", "Kelola struktur bagan akun (CoA) dan pembukaan periode pembukuan untuk pencatatan transaksi keuangan.")}
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
              <span>{t("accounting:coa.btn_open_period", "Buka Periode Baru")}</span>
            </Button>
            <Button
              type="button"
              onClick={openNewDialog}
              className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>{t("accounting:coa.btn_add_account", "Tambah Akun Baru")}</span>
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
        <CardHeaderWithInfo
          title={t("accounting:coa.card_coa_title", "Daftar Bagan Akun")}
          description={t("accounting:coa.card_coa_desc", "Struktur klasifikasi akun buku besar untuk penjurnalan dan pelaporan keuangan.")}
          headerClassName="px-6 py-4 border-b border-border/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          controls={
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Input
                placeholder={t("accounting:coa.search_placeholder", "Cari kode atau nama akun...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 sm:w-64 h-9 rounded-xl bg-background"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 h-9 rounded-xl bg-background">
                  <SelectValue placeholder={t("accounting:coa.all_types", "Semua Tipe Akun")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{t("accounting:coa.all_types", "Semua Tipe Akun")}</SelectItem>
                    <SelectItem value="asset">{t("accounting:account_types.asset", "Aset")}</SelectItem>
                    <SelectItem value="contra_asset">{t("accounting:account_types.contra_asset", "Kontra-Aset")}</SelectItem>
                    <SelectItem value="liability">{t("accounting:account_types.liability", "Liabilitas")}</SelectItem>
                    <SelectItem value="equity">{t("accounting:account_types.equity", "Ekuitas")}</SelectItem>
                    <SelectItem value="revenue">{t("accounting:account_types.revenue", "Pendapatan")}</SelectItem>
                    <SelectItem value="expense">{t("accounting:account_types.expense", "Beban")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32 pl-6 text-center">{t("accounting:coa.col_code", "Kode")}</TableHead>
                <TableHead className="text-center">{t("accounting:coa.col_name", "Nama Akun")}</TableHead>
                <TableHead className="w-32 text-center">{t("accounting:coa.col_type", "Tipe")}</TableHead>
                <TableHead className="w-32 text-center">{t("accounting:coa.col_balance", "Saldo Normal")}</TableHead>
                <TableHead className="w-48 text-center">{t("accounting:coa.col_system_tag", "Tag Sistem")}</TableHead>
                <TableHead className="w-28 text-center">{t("accounting:coa.col_status", "Status")}</TableHead>
                <TableHead className="w-28 text-center pr-6">{t("accounting:coa.col_actions", "Aksi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Spinner />
                      <span>{t("accounting:coa.loading_accounts", "Memuat bagan akun...")}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {t("accounting:coa.empty_accounts", "Tidak ada akun yang sesuai dengan filter.")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((acc) => {
                  const isHeader = !acc.is_postable;
                  const hasChildAccounts = accounts.some(
                    (child) => child.parent_id === acc.id,
                  );
                  const usedInFixedAsset = fixedAssets.some(
                    (fa) =>
                      fa.asset_account_id === acc.id ||
                      fa.accum_depr_account_id === acc.id ||
                      fa.expense_account_id === acc.id,
                  );
                  const canSafelyDelete =
                    acc.used_in_journal_count === 0 &&
                    !hasChildAccounts &&
                    !usedInFixedAsset;

                  return (
                    <TableRow key={acc.id} className={isHeader ? "bg-muted/20" : ""}>
                      <TableCell className="font-mono text-xs font-semibold pl-6 align-top">
                        {acc.code}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className={cn("font-medium text-foreground", isHeader && "font-bold tracking-wide")}>
                          {getLocalizedAccountName(acc, language)}
                        </div>
                        {acc.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {getLocalizedAccountDescription(acc.code, acc.description, language)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-center align-top">
                        {getLocalizedAccountType(acc.account_type, language)}
                      </TableCell>
                      <TableCell className="text-xs text-center font-medium capitalize align-top">
                        {getLocalizedNormalBalance(acc.normal_balance, language)}
                      </TableCell>
                      <TableCell className="text-center align-top">
                        {isHeader ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : acc.system_tag && acc.system_tag !== "none" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <span className="size-1.5 rounded-full bg-sky-400" />
                            {getLocalizedSystemTag(acc.system_tag, language)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center align-top">
                        <div className="-my-px inline-flex justify-center">
                          <StatusBadge
                            tone={acc.is_active ? "success" : "secondary"}
                            label={acc.is_active ? t("accounting:coa.status_active", "Aktif") : t("accounting:coa.status_inactive", "Nonaktif")}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center pr-6 align-top">
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(acc)}
                            title={t("accounting:coa.tooltip_edit_account", "Ubah Akun")}
                            className="size-8 rounded-lg cursor-pointer"
                          >
                            <PencilIcon className="size-3.5" />
                            <span className="sr-only">{t("accounting:coa.tooltip_edit_account", "Ubah Akun")}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setToggleTarget(acc)}
                            title={
                              acc.is_active
                                ? t("accounting:coa.tooltip_deactivate_account", "Nonaktifkan Akun")
                                : t("accounting:coa.tooltip_activate_account", "Aktifkan Akun")
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
                              {acc.is_active
                                ? t("accounting:coa.tooltip_deactivate_account", "Nonaktifkan Akun")
                                : t("accounting:coa.tooltip_activate_account", "Aktifkan Akun")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canSafelyDelete}
                            onClick={() => {
                              if (!canSafelyDelete) return;
                              setDeleteTarget(acc);
                            }}
                            title={
                              canSafelyDelete
                                ? t("accounting:coa.tooltip_delete_account", "Hapus Akun")
                                : t(
                                    "accounting:coa.tooltip_delete_disabled_in_use",
                                    "Akun sudah memiliki transaksi/referensi; gunakan Nonaktifkan",
                                  )
                            }
                            className="size-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <Trash2Icon className="size-3.5" />
                            <span className="sr-only">{t("accounting:coa.tooltip_delete_account", "Hapus Akun")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Card Register & Otomatisasi Penyusutan Aset Tetap (Item 3) */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t(
            "accounting:fixed_assets.card_title",
            "Register & Otomatisasi Penyusutan Aset Tetap",
          )}
          description={t(
            "accounting:fixed_assets.card_desc",
            "Perhitungan penyusutan metode garis lurus (straight-line) dengan pembuatan Ayat Jurnal Penyesuaian otomatis saat proses tutup buku periode.",
          )}
          headerClassName="px-6 py-4 border-b border-border/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          controls={
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={runningDepr || fixedAssets.length === 0}
                onClick={handleRunOpenPeriodDepreciation}
                className="h-9 rounded-xl px-3.5 text-xs font-semibold cursor-pointer gap-1.5"
              >
                {runningDepr ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <CalculatorIcon className="size-3.5 text-primary" />
                )}
                <span>
                  {t(
                    "accounting:fixed_assets.btn_run_depreciation",
                    "Jalankan Penyusutan Periode Terbuka",
                  )}
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={openNewAssetDialog}
                className="h-9 rounded-xl px-3.5 text-xs font-semibold cursor-pointer gap-1.5"
              >
                <PlusIcon className="size-3.5" />
                <span>
                  {t("accounting:fixed_assets.btn_add_asset", "Tambah Aset Tetap")}
                </span>
              </Button>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 text-center">
                  {t("accounting:fixed_assets.col_asset", "Kode & Nama Aset")}
                </TableHead>
                <TableHead className="text-center whitespace-nowrap">
                  {t("accounting:fixed_assets.col_acq_date", "Tgl Perolehan")}
                </TableHead>
                <TableHead className="text-center whitespace-nowrap">
                  {t("accounting:fixed_assets.col_cost", "Harga Perolehan")}
                </TableHead>
                <TableHead className="text-center whitespace-nowrap">
                  {t("accounting:fixed_assets.col_salvage", "Nilai Sisa")}
                </TableHead>
                <TableHead className="text-center whitespace-nowrap">
                  {t("accounting:fixed_assets.col_life", "Umur Manfaat")}
                </TableHead>
                <TableHead className="text-center whitespace-nowrap">
                  {t("accounting:fixed_assets.col_book_value", "Nilai Buku Bersih")}
                </TableHead>
                <TableHead className="text-center">
                  {t("accounting:fixed_assets.col_status", "Status")}
                </TableHead>
                <TableHead className="pr-6 text-center">
                  {t("accounting:coa.col_actions", "Aksi")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedAssets.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="p-0">
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-11 items-center justify-center rounded-full bg-muted/60 mb-2.5 text-muted-foreground">
                        <LayersIcon className="size-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t(
                          "accounting:fixed_assets.empty_title",
                          "Belum Ada Aset Tetap Terdaftar",
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        {t(
                          "accounting:fixed_assets.empty_desc",
                          "Tambahkan aset tetap (peralatan, perangkat keras, atau inventaris) untuk mengotomatisasi perhitungan dan jurnal penyesuaian penyusutan bulanan.",
                        )}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fixedAssets.map((fa) => {
                  const assetDeprs = depreciations.filter(
                    (d) => d.asset_id === fa.id,
                  );
                  const totalAccum = assetDeprs.reduce(
                    (sum, d) => sum + d.depreciation_amount,
                    0,
                  );
                  const netBookValue = Math.max(
                    fa.salvage_value,
                    fa.acquisition_cost - totalAccum,
                  );
                  const monthlyEst = roundRupiah(
                    Math.max(0, fa.acquisition_cost - fa.salvage_value) /
                      Math.max(1, fa.useful_life_months),
                  );
                  const canDeleteAsset = assetDeprs.length === 0;

                  const statusLabel =
                    fa.status === "fully_depreciated"
                      ? t(
                          "accounting:fixed_assets.status_fully_depreciated",
                          "Disusutkan Penuh",
                        )
                      : fa.status === "disposed"
                        ? t("accounting:fixed_assets.status_disposed", "Dilepas")
                        : t("accounting:fixed_assets.status_active", "Aktif");
                  const statusTone =
                    fa.status === "active"
                      ? "success"
                      : fa.status === "fully_depreciated"
                        ? "info"
                        : "secondary";

                  return (
                    <TableRow key={fa.id}>
                      <TableCell className="pl-6 align-top">
                        <div className="font-mono text-xs font-semibold text-primary">
                          {fa.asset_code}
                        </div>
                        <div className="font-medium text-foreground">
                          {fa.asset_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-center whitespace-nowrap align-top">
                        {formatDateI18n(fa.acquisition_date, language)}
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <MonetaryCell amount={fa.acquisition_cost} />
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <MonetaryCell amount={fa.salvage_value} />
                      </TableCell>
                      <TableCell className="text-xs text-center align-top whitespace-nowrap">
                        <div className="font-semibold text-foreground tabular-nums">
                          {fa.useful_life_months}{" "}
                          {t("accounting:fixed_assets.months_unit", "Bulan")}
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {formatRupiah(monthlyEst)}/
                          {t("accounting:fixed_assets.per_month_short", "bln")}
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <MonetaryCell amount={netBookValue} />
                        {totalAccum > 0 ? (
                          <div className="text-[11px] text-muted-foreground text-right tabular-nums mt-0.5">
                            {t("accounting:fixed_assets.accum_short", "Akum")}:{" "}
                            {formatRupiah(totalAccum)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center align-top">
                        <div className="-my-px inline-flex justify-center">
                          <StatusBadge tone={statusTone} label={statusLabel} />
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-center align-top">
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditAssetDialog(fa)}
                            title={t(
                              "accounting:fixed_assets.tooltip_edit",
                              "Ubah Aset Tetap",
                            )}
                            className="size-8 rounded-lg cursor-pointer"
                          >
                            <PencilIcon className="size-3.5" />
                            <span className="sr-only">
                              {t(
                                "accounting:fixed_assets.tooltip_edit",
                                "Ubah Aset Tetap",
                              )}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!canDeleteAsset}
                            onClick={() => {
                              if (!canDeleteAsset) return;
                              setDeleteAssetTarget(fa);
                            }}
                            title={
                              canDeleteAsset
                                ? t(
                                    "accounting:fixed_assets.tooltip_delete",
                                    "Hapus Aset Tetap",
                                  )
                                : t(
                                    "accounting:fixed_assets.tooltip_delete_disabled",
                                    "Aset sudah memiliki jurnal penyusutan terposting",
                                  )
                            }
                            className="size-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <Trash2Icon className="size-3.5" />
                            <span className="sr-only">
                              {t(
                                "accounting:fixed_assets.tooltip_delete",
                                "Hapus Aset Tetap",
                              )}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
        title={t("accounting:coa.close_period_title", {
          name: getLocalizedPeriodName(closePeriodTarget?.name, language),
          defaultValue: `Tutup Periode ${closePeriodTarget?.name ?? ""}?`,
        })}
        description={t("accounting:coa.close_period_desc", {
          name: getLocalizedPeriodName(closePeriodTarget?.name, language),
          defaultValue: `Anda akan menutup periode buku ${closePeriodTarget?.name ?? ""}. Seluruh transaksi jurnal pada periode ini akan dikunci dan jurnal penutup dapat diposting otomatis atau manual.`,
        })}
        confirmLabel={t("accounting:coa.close_period_confirm", "Ya, Tutup Periode")}
        destructive
        onConfirm={handleClosePeriod}
      />

      {/* Dialog Konfirmasi Buka Kembali Periode */}
      <ConfirmActionDialog
        open={Boolean(reopenPeriodTarget)}
        onOpenChange={(open) => {
          if (!open) setReopenPeriodTarget(null);
        }}
        title={t("accounting:coa.reopen_period_title", {
          name: getLocalizedPeriodName(reopenPeriodTarget?.name, language),
          defaultValue: `Buka Kembali Periode ${reopenPeriodTarget?.name ?? ""}?`,
        })}
        description={t("accounting:coa.reopen_period_desc", "Membuka kembali periode yang sudah ditutup memerlukan alasan audit trail resmi. Pastikan Anda telah mengonfirmasi dengan Super Admin/Auditor.")}
        confirmLabel={t("accounting:coa.reopen_period_confirm", "Ya, Buka Kembali")}
        requireReason
        reasonLabel={t("accounting:coa.reopen_period_reason_label", "Alasan Pembukaan Kembali (Audit Trail)")}
        reasonPlaceholder={t("accounting:coa.reopen_period_reason_placeholder", "Tuliskan alasan pembukaan kembali periode secara jelas (minimal 5 karakter)...")}
        onConfirm={handleReopenPeriod}
      />

      {/* Dialog Konfirmasi Hapus Periode */}
      <ConfirmActionDialog
        open={Boolean(deletePeriodTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletePeriodTarget(null);
        }}
        title={t("accounting:coa.delete_period_title", {
          name: getLocalizedPeriodName(deletePeriodTarget?.name, language),
          defaultValue: `Hapus Periode ${deletePeriodTarget?.name ?? ""}?`,
        })}
        description={t("accounting:coa.delete_period_desc", {
          name: getLocalizedPeriodName(deletePeriodTarget?.name, language),
          defaultValue: `Periode ${deletePeriodTarget?.name ?? ""} yang belum memiliki transaksi dapat dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.`,
        })}
        confirmLabel={t("accounting:coa.delete_period_confirm", "Hapus Periode")}
        destructive
        onConfirm={handleDeletePeriod}
      />

      {/* Dialog Form Tambah / Ubah Akun */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("accounting:coa.dialog_edit_title", "Ubah Akun Buku Besar")
                : t("accounting:coa.dialog_add_title", "Tambah Akun Baru")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <FieldGroup className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="acc-code" required>
                    {t("accounting:coa.field_code", "Kode Akun")}
                  </FieldLabel>
                  <Input
                    id="acc-code"
                    required
                    placeholder={t("accounting:coa.code_placeholder", "Contoh: 5-1501")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="acc-type" required>
                    {t("accounting:coa.field_type", "Tipe Akun")}
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
                        <SelectItem value="asset">{t("accounting:account_types.asset", "Aset")}</SelectItem>
                        <SelectItem value="contra_asset">{t("accounting:account_types.contra_asset", "Kontra-Aset")}</SelectItem>
                        <SelectItem value="liability">{t("accounting:account_types.liability", "Liabilitas")}</SelectItem>
                        <SelectItem value="equity">{t("accounting:account_types.equity", "Ekuitas")}</SelectItem>
                        <SelectItem value="revenue">{t("accounting:account_types.revenue", "Pendapatan")}</SelectItem>
                        <SelectItem value="expense">{t("accounting:account_types.expense", "Beban")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="acc-name" required>
                  {t("accounting:coa.field_name", "Nama Akun")}
                </FieldLabel>
                <Input
                  id="acc-name"
                  required
                  placeholder={t("accounting:coa.name_placeholder", "Contoh: Beban Pengujian Keamanan Proyek")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="acc-balance" required>
                    {t("accounting:coa.field_normal_balance", "Saldo Normal")}
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
                        <SelectItem value="debit">{t("accounting:normal_balance.debit", "Debit")}</SelectItem>
                        <SelectItem value="credit">{t("accounting:normal_balance.credit", "Kredit")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="acc-tag">
                    {t("accounting:coa.field_system_tag", "Penanda Otomasi Sistem")}
                  </FieldLabel>
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
                        {(Object.keys(SYSTEM_TAG_MAP) as AccountSystemTag[]).map((tagKey) => (
                          <SelectItem key={tagKey} value={tagKey}>
                            {SYSTEM_TAG_MAP[tagKey]?.[language] ?? tagKey}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="acc-postable">
                  {t("accounting:coa.field_postable", "Dapat Diposting Langsung ke Jurnal")}
                </FieldLabel>
                <Switch
                  id="acc-postable"
                  checked={isPostable}
                  onCheckedChange={setIsPostable}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="acc-desc">
                  {t("accounting:coa.field_description", "Keterangan")}
                </FieldLabel>
                <Textarea
                  id="acc-desc"
                  placeholder={t("accounting:coa.desc_placeholder", "Deskripsi singkat fungsi dan peruntukan akun ini...")}
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
                  {t("common:action.cancel", "Batal")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? t("common:saving", "Menyimpan...") : t("accounting:coa.btn_save_account", "Simpan Akun")}
                </Button>
              </DialogFooter>
            </FieldGroup>
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
            ? t("accounting:coa.deactivate_acc_title", {
                code: toggleTarget?.code ?? "",
                defaultValue: `Nonaktifkan Akun ${toggleTarget?.code ?? ""}?`,
              })
            : t("accounting:coa.activate_acc_title", {
                code: toggleTarget?.code ?? "",
                defaultValue: `Aktifkan Akun ${toggleTarget?.code ?? ""}?`,
              })
        }
        description={
          toggleTarget?.is_active
            ? t("accounting:coa.deactivate_acc_desc", {
                name: toggleTarget ? getLocalizedAccountName(toggleTarget, language) : "",
                defaultValue: `Akun ${toggleTarget?.name} tidak akan muncul lagi di daftar pilihan akun saat penjurnalan baru.`,
              })
            : t("accounting:coa.activate_acc_desc", {
                name: toggleTarget ? getLocalizedAccountName(toggleTarget, language) : "",
                defaultValue: `Akun ${toggleTarget?.name} akan diaktifkan kembali dan dapat dipilih saat penjurnalan.`,
              })
        }
        confirmLabel={
          toggleTarget?.is_active
            ? t("accounting:coa.deactivate_acc_confirm", "Ya, Nonaktifkan")
            : t("accounting:coa.activate_acc_confirm", "Ya, Aktifkan")
        }
        onConfirm={handleToggleActive}
      />

      {/* Dialog Konfirmasi Hapus Akun */}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("accounting:coa.delete_acc_title", {
          code: deleteTarget?.code ?? "",
          defaultValue: `Hapus Akun ${deleteTarget?.code ?? ""}?`,
        })}
        description={t("accounting:coa.delete_acc_desc", {
          name: deleteTarget ? getLocalizedAccountName(deleteTarget, language) : "",
          defaultValue: `Akun ${deleteTarget?.name} akan dihapus secara permanen dari sistem. Tindakan ini hanya berhasil jika akun belum memiliki riwayat transaksi jurnal.`,
        })}
        confirmLabel={t("accounting:coa.delete_acc_confirm", "Ya, Hapus Akun")}
        destructive
        onConfirm={handleDeleteAccount}
      />

      {/* Dialog Form Tambah / Ubah Aset Tetap (Item 3) */}
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {assetForm.id
                ? t(
                    "accounting:fixed_assets.dialog_edit_title",
                    "Ubah Data Aset Tetap",
                  )
                : t(
                    "accounting:fixed_assets.dialog_add_title",
                    "Tambah Aset Tetap Baru",
                  )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAsset}>
            <FieldGroup className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="fa-code" required>
                    {t("accounting:fixed_assets.field_code", "Kode Aset")}
                  </FieldLabel>
                  <Input
                    id="fa-code"
                    required
                    value={assetForm.asset_code}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, asset_code: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fa-name" required>
                    {t("accounting:fixed_assets.field_name", "Nama Aset Tetap")}
                  </FieldLabel>
                  <Input
                    id="fa-name"
                    required
                    placeholder={t(
                      "accounting:fixed_assets.field_name_ph",
                      "Contoh: MacBook Pro M3 Engineering",
                    )}
                    value={assetForm.asset_name}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, asset_name: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="fa-acq-date" required>
                    {t(
                      "accounting:fixed_assets.field_acq_date",
                      "Tanggal Perolehan",
                    )}
                  </FieldLabel>
                  <DatePicker
                    id="fa-acq-date"
                    value={assetForm.acquisition_date}
                    onChange={(acquisition_date) =>
                      setAssetForm({ ...assetForm, acquisition_date })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fa-cost" required>
                    {t(
                      "accounting:fixed_assets.field_cost",
                      "Harga Perolehan (Rp)",
                    )}
                  </FieldLabel>
                  <NumberInput
                    id="fa-cost"
                    allowDecimal={false}
                    min={0}
                    required
                    value={assetForm.acquisition_cost}
                    onValueChange={(acquisition_cost) =>
                      setAssetForm({ ...assetForm, acquisition_cost })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fa-salvage" required>
                    {t(
                      "accounting:fixed_assets.field_salvage",
                      "Nilai Sisa / Residu (Rp)",
                    )}
                  </FieldLabel>
                  <NumberInput
                    id="fa-salvage"
                    allowDecimal={false}
                    min={0}
                    required
                    value={assetForm.salvage_value}
                    onValueChange={(salvage_value) =>
                      setAssetForm({ ...assetForm, salvage_value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="fa-life" required>
                    {t(
                      "accounting:fixed_assets.field_life_months",
                      "Umur Manfaat (Bulan)",
                    )}
                  </FieldLabel>
                  <NumberInput
                    id="fa-life"
                    allowDecimal={false}
                    min={1}
                    max={600}
                    required
                    value={assetForm.useful_life_months}
                    onValueChange={(useful_life_months) =>
                      setAssetForm({
                        ...assetForm,
                        useful_life_months: Math.max(1, useful_life_months),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fa-status">
                    {t("accounting:fixed_assets.field_status", "Status Aset")}
                  </FieldLabel>
                  <Select
                    value={assetForm.status}
                    onValueChange={(val) =>
                      setAssetForm({
                        ...assetForm,
                        status: val as FixedAssetStatus,
                      })
                    }
                  >
                    <SelectTrigger id="fa-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="active">
                          {t("accounting:fixed_assets.status_active", "Aktif")}
                        </SelectItem>
                        <SelectItem value="fully_depreciated">
                          {t(
                            "accounting:fixed_assets.status_fully_depreciated",
                            "Disusutkan Penuh",
                          )}
                        </SelectItem>
                        <SelectItem value="disposed">
                          {t("accounting:fixed_assets.status_disposed", "Dilepas")}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="fa-disp-date">
                    {t(
                      "accounting:fixed_assets.field_disposed_date",
                      "Tanggal Pelepasan (Opsional)",
                    )}
                  </FieldLabel>
                  <DatePicker
                    id="fa-disp-date"
                    value={assetForm.disposed_date}
                    onChange={(disposed_date) =>
                      setAssetForm({ ...assetForm, disposed_date })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="fa-acc-asset" required>
                    {t(
                      "accounting:fixed_assets.field_asset_account",
                      "Akun Aset Tetap",
                    )}
                  </FieldLabel>
                  <Select
                    value={assetForm.asset_account_id}
                    onValueChange={(asset_account_id) =>
                      setAssetForm({ ...assetForm, asset_account_id })
                    }
                  >
                    <SelectTrigger id="fa-acc-asset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {accounts
                          .filter(
                            (a) => a.account_type === "asset" && a.is_postable,
                          )
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {getLocalizedAccountName(a, language)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="fa-acc-accum" required>
                    {t(
                      "accounting:fixed_assets.field_accum_account",
                      "Akun Akumulasi Penyusutan",
                    )}
                  </FieldLabel>
                  <Select
                    value={assetForm.accum_depr_account_id}
                    onValueChange={(accum_depr_account_id) =>
                      setAssetForm({ ...assetForm, accum_depr_account_id })
                    }
                  >
                    <SelectTrigger id="fa-acc-accum">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {accounts
                          .filter(
                            (a) =>
                              (a.account_type === "contra_asset" ||
                                a.account_type === "asset") &&
                              a.is_postable,
                          )
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {getLocalizedAccountName(a, language)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="fa-acc-exp" required>
                    {t(
                      "accounting:fixed_assets.field_expense_account",
                      "Akun Beban Penyusutan",
                    )}
                  </FieldLabel>
                  <Select
                    value={assetForm.expense_account_id}
                    onValueChange={(expense_account_id) =>
                      setAssetForm({ ...assetForm, expense_account_id })
                    }
                  >
                    <SelectTrigger id="fa-acc-exp">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {accounts
                          .filter(
                            (a) => a.account_type === "expense" && a.is_postable,
                          )
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {getLocalizedAccountName(a, language)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssetDialogOpen(false)}
                  disabled={savingAsset}
                >
                  {t("common:action.cancel", "Batal")}
                </Button>
                <Button type="submit" disabled={savingAsset}>
                  {savingAsset
                    ? t("common:saving", "Menyimpan...")
                    : t(
                        "accounting:fixed_assets.btn_save_asset",
                        "Simpan Aset Tetap",
                      )}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Aset Tetap */}
      <ConfirmActionDialog
        open={Boolean(deleteAssetTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteAssetTarget(null);
        }}
        title={t("accounting:fixed_assets.delete_title", {
          code: deleteAssetTarget?.asset_code ?? "",
          defaultValue: `Hapus Aset Tetap ${deleteAssetTarget?.asset_code ?? ""}?`,
        })}
        description={t("accounting:fixed_assets.delete_desc", {
          name: deleteAssetTarget?.asset_name ?? "",
          defaultValue: `Aset tetap ${deleteAssetTarget?.asset_name ?? ""} yang belum memiliki riwayat jurnal penyusutan akan dihapus dari register.`,
        })}
        confirmLabel={t(
          "accounting:fixed_assets.delete_confirm",
          "Ya, Hapus Aset",
        )}
        destructive
        onConfirm={handleDeleteAsset}
      />
    </div>
  );
}
