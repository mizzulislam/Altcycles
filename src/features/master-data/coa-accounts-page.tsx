import * as React from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  deleteAccount,
  deletePeriod,
  listAccounts,
  listPeriods,
  reopenPeriod,
  saveAccount,
} from "@/lib/data-service";
import {
  deleteFixedAsset,
  listFixedAssets,
  runPeriodClosingBook,
  runPeriodFixedAssetDepreciation,
  saveFixedAsset,
} from "@/lib/operations-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { useLanguage } from "@/lib/i18n";
import { formatRupiah } from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedPeriodName,
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
import { CoaTable } from "./coa/coa-table";
import { FixedAssetTable } from "./coa/fixed-asset-table";
import { CoaFormDialog } from "./coa/coa-form-dialog";
import { FixedAssetDialog } from "./coa/fixed-asset-dialog";

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
  const [normalBalance, setNormalBalance] = React.useState<NormalBalance>("debit");
  const [systemTag, setSystemTag] = React.useState<AccountSystemTag>("none");
  const [cashFlowCategory, setCashFlowCategory] = React.useState<CashFlowCategory>("operating");
  const [isPostable, setIsPostable] = React.useState(true);
  const [isActive, setIsActive] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Dialog Konfirmasi Nonaktifkan / Hapus Akun
  const [toggleTarget, setToggleTarget] = React.useState<AccountRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AccountRow | null>(null);

  // State Register & Otomatisasi Penyusutan Aset Tetap
  const [fixedAssets, setFixedAssets] = React.useState<FixedAssetRow[]>([]);
  const [depreciations, setDepreciations] = React.useState<FixedAssetDepreciationRow[]>([]);
  const [runningDepr, setRunningDepr] = React.useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = React.useState(false);
  const [savingAsset, setSavingAsset] = React.useState(false);
  const [deleteAssetTarget, setDeleteAssetTarget] = React.useState<FixedAssetRow | null>(null);
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

  // Aksi Register & Penyusutan Aset Tetap
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
        <PageHeader
          title={t("accounting:coa.title", "Setup Akuntansi")}
          description={t(
            "accounting:coa.subtitle",
            "Kelola struktur bagan akun (CoA) dan pembukaan periode pembukuan untuk pencatatan transaksi keuangan.",
          )}
          mobileFloating
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatePeriodOpen(true)}
                className="h-9 max-sm:size-9 max-sm:p-0 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
                aria-label={t("accounting:coa.btn_open_period", "Buka Periode Baru")}
              >
                <PlusIcon className="size-4" />
                <span className="max-sm:hidden">{t("accounting:coa.btn_open_period", "Buka Periode Baru")}</span>
              </Button>
              <Button
                type="button"
                onClick={openNewDialog}
                className="h-9 max-sm:size-9 max-sm:p-0 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
                aria-label={t("accounting:coa.btn_add_account", "Tambah Akun Baru")}
              >
                <PlusIcon className="size-4" />
                <span className="max-sm:hidden">{t("accounting:coa.btn_add_account", "Tambah Akun Baru")}</span>
              </Button>
            </>
          }
        />
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
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreatePeriodOpen(true)}
              className="h-9 max-sm:size-9 max-sm:p-0 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
              title={t("accounting:coa.btn_open_period", "Buka Periode Baru")}
            >
              <PlusIcon className="size-4" />
              <span className="max-sm:hidden">{t("accounting:coa.btn_open_period", "Buka Periode Baru")}</span>
            </Button>
            <Button
              type="button"
              onClick={openNewDialog}
              className="h-9 max-sm:size-9 max-sm:p-0 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs gap-1.5"
              title={t("accounting:coa.btn_add_account", "Tambah Akun Baru")}
            >
              <PlusIcon className="size-4" />
              <span className="max-sm:hidden">{t("accounting:coa.btn_add_account", "Tambah Akun Baru")}</span>
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

      {/* 2. Card Daftar Bagan Akun (Chart of Accounts) - Modular */}
      <CoaTable
        accounts={accounts}
        filtered={filtered}
        fixedAssets={fixedAssets}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onEditAccount={openEditDialog}
        onToggleActive={setToggleTarget}
        onDeleteAccount={setDeleteTarget}
      />

      {/* 3. Card Register & Otomatisasi Penyusutan Aset Tetap - Modular */}
      <FixedAssetTable
        fixedAssets={fixedAssets}
        depreciations={depreciations}
        runningDepr={runningDepr}
        onRunOpenPeriodDepreciation={handleRunOpenPeriodDepreciation}
        onOpenNewAssetDialog={openNewAssetDialog}
        onOpenEditAssetDialog={openEditAssetDialog}
        onDeleteAsset={setDeleteAssetTarget}
      />

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

      {/* Dialog Form Tambah / Ubah Akun - Modular */}
      <CoaFormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingId={editingId}
        code={code}
        setCode={setCode}
        name={name}
        setName={setName}
        accountType={accountType}
        onAccountTypeChange={handleAccountTypeChange}
        normalBalance={normalBalance}
        setNormalBalance={setNormalBalance}
        systemTag={systemTag}
        setSystemTag={setSystemTag}
        isPostable={isPostable}
        setIsPostable={setIsPostable}
        description={description}
        setDescription={setDescription}
        saving={saving}
        onSubmit={handleSave}
      />

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

      {/* Dialog Form Tambah / Ubah Aset Tetap - Modular */}
      <FixedAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        form={assetForm}
        setForm={setAssetForm}
        accounts={accounts}
        saving={savingAsset}
        onSubmit={handleSaveAsset}
      />

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
