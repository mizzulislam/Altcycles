import { FilterIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Spinner } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import {
  getLocalizedAccountName,
  getLocalizedAccountDescription,
  getLocalizedAccountType,
  getLocalizedNormalBalance,
  getLocalizedSystemTag,
} from "@/lib/glossary";
import type { AccountRow, FixedAssetRow } from "@/types/database.types";

export interface CoaTableProps {
  accounts: AccountRow[];
  filtered: AccountRow[];
  fixedAssets: FixedAssetRow[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  typeFilter: string;
  onTypeFilterChange: (val: string) => void;
  onEditAccount: (acc: AccountRow) => void;
  onToggleActive: (acc: AccountRow) => void;
  onDeleteAccount: (acc: AccountRow) => void;
  onOpenNewAccount?: () => void;
}

export function CoaTable({
  accounts,
  filtered,
  fixedAssets,
  loading,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onEditAccount,
  onToggleActive,
  onDeleteAccount,
  onOpenNewAccount,
}: CoaTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("accounting:coa.card_coa_title", "Daftar Bagan Akun")}
        description={t(
          "accounting:coa.card_coa_desc",
          "Struktur klasifikasi akun buku besar untuk penjurnalan dan pelaporan keuangan.",
        )}
        headerClassName="px-6 py-4 border-b border-border/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        controls={
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
            <Input
              placeholder={t(
                "accounting:coa.search_placeholder",
                "Cari kode atau nama akun...",
              )}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-56 sm:w-64 h-9 rounded-xl bg-background text-xs sm:text-sm"
            />
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              {typeFilter === "all" ? (
                <ActionTooltip content={t("accounting:coa.all_types", "Semua Tipe Akun")}>
                  <SelectTrigger
                    aria-label={t("accounting:coa.all_types", "Semua Tipe Akun")}
                    className="size-9 min-w-9 p-0 rounded-xl justify-center cursor-pointer shrink-0 border-border/80 bg-card text-foreground shadow-2xs hover:bg-muted/70 hover:border-primary/40 [&>svg:last-child]:hidden [&>span]:hidden"
                  >
                    <FilterIcon className="size-4 text-primary shrink-0" />
                  </SelectTrigger>
                </ActionTooltip>
              ) : (
                <SelectTrigger
                  aria-label={t("accounting:coa.all_types", "Semua Tipe Akun")}
                  className="h-9 w-auto max-w-[200px] rounded-xl px-3 text-xs sm:text-sm font-semibold cursor-pointer shrink-0 gap-2 border-primary/40 bg-primary/5 text-primary"
                >
                  <FilterIcon className="size-3.5 shrink-0" />
                  <SelectValue
                    placeholder={t(
                      "accounting:coa.all_types",
                      "Semua Tipe Akun",
                    )}
                  />
                </SelectTrigger>
              )}
              <SelectContent align="end" className="w-[180px] min-w-[180px]">
                <SelectGroup>
                  <SelectItem value="all">
                    {t("accounting:coa.all_types", "Semua Tipe Akun")}
                  </SelectItem>
                  <SelectItem value="asset">
                    {t("accounting:account_types.asset", "Aset")}
                  </SelectItem>
                  <SelectItem value="contra_asset">
                    {t(
                      "accounting:account_types.contra_asset",
                      "Kontra-Aset",
                    )}
                  </SelectItem>
                  <SelectItem value="liability">
                    {t("accounting:account_types.liability", "Liabilitas")}
                  </SelectItem>
                  <SelectItem value="equity">
                    {t("accounting:account_types.equity", "Ekuitas")}
                  </SelectItem>
                  <SelectItem value="revenue">
                    {t("accounting:account_types.revenue", "Pendapatan")}
                  </SelectItem>
                  <SelectItem value="expense">
                    {t("accounting:account_types.expense", "Beban")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {onOpenNewAccount && (
              <ActionTooltip content={t("accounting:coa.btn_add_account", "Tambah Akun Baru")}>
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  onClick={onOpenNewAccount}
                  className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                  aria-label={t("accounting:coa.btn_add_account", "Tambah Akun Baru")}
                >
                  <PlusIcon className="size-4" />
                  <span className="sr-only">{t("accounting:coa.btn_add_account", "Tambah Akun Baru")}</span>
                </Button>
              </ActionTooltip>
            )}
          </div>
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32 pl-6 text-center">
                {t("accounting:coa.col_code", "Kode")}
              </TableHead>
              <TableHead className="text-center">
                {t("accounting:coa.col_name", "Nama Akun")}
              </TableHead>
              <TableHead className="w-32 text-center">
                {t("accounting:coa.col_type", "Tipe")}
              </TableHead>
              <TableHead className="w-32 text-center">
                {t("accounting:coa.col_balance", "Saldo Normal")}
              </TableHead>
              <TableHead className="w-48 text-center">
                {t("accounting:coa.col_system_tag", "Tag Sistem")}
              </TableHead>
              <TableHead className="w-28 text-center">
                {t("accounting:coa.col_status", "Status")}
              </TableHead>
              <TableHead className="w-28 text-center pr-6">
                {t("accounting:coa.col_actions", "Aksi")}
              </TableHead>
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
                    <span>
                      {t(
                        "accounting:coa.loading_accounts",
                        "Memuat bagan akun...",
                      )}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  {t(
                    "accounting:coa.empty_accounts",
                    "Tidak ada akun yang sesuai dengan filter.",
                  )}
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
                  <TableRow
                    key={acc.id}
                    className={isHeader ? "bg-muted/20" : ""}
                  >
                    <TableCell className="font-mono text-xs font-semibold pl-6 align-top">
                      {acc.code}
                    </TableCell>
                    <TableCell className="align-top">
                      <div
                        className={cn(
                          "font-medium text-foreground",
                          isHeader && "font-bold tracking-wide",
                        )}
                      >
                        {getLocalizedAccountName(acc, language)}
                      </div>
                      {acc.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {getLocalizedAccountDescription(
                            acc.code,
                            acc.description,
                            language,
                          )}
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
                          label={
                            acc.is_active
                              ? t("accounting:coa.status_active", "Aktif")
                              : t("accounting:coa.status_inactive", "Nonaktif")
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center pr-6 align-top">
                      <div className="flex items-center justify-center gap-1 -my-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditAccount(acc)}
                          title={t(
                            "accounting:coa.tooltip_edit_account",
                            "Ubah Akun",
                          )}
                          className="size-8 rounded-lg cursor-pointer"
                        >
                          <PencilIcon className="size-3.5" />
                          <span className="sr-only">
                            {t(
                              "accounting:coa.tooltip_edit_account",
                              "Ubah Akun",
                            )}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleActive(acc)}
                          title={
                            acc.is_active
                              ? t(
                                  "accounting:coa.tooltip_deactivate_account",
                                  "Nonaktifkan Akun",
                                )
                              : t(
                                  "accounting:coa.tooltip_activate_account",
                                  "Aktifkan Akun",
                                )
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
                              ? t(
                                  "accounting:coa.tooltip_deactivate_account",
                                  "Nonaktifkan Akun",
                                )
                              : t(
                                  "accounting:coa.tooltip_activate_account",
                                  "Aktifkan Akun",
                                )}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!canSafelyDelete}
                          onClick={() => {
                            if (!canSafelyDelete) return;
                            onDeleteAccount(acc);
                          }}
                          title={
                            canSafelyDelete
                              ? t(
                                  "accounting:coa.tooltip_delete_account",
                                  "Hapus Akun",
                                )
                              : t(
                                  "accounting:coa.tooltip_delete_disabled_in_use",
                                  "Akun sudah memiliki transaksi/referensi; gunakan Nonaktifkan",
                                )
                          }
                          className="size-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <Trash2Icon className="size-3.5" />
                          <span className="sr-only">
                            {t(
                              "accounting:coa.tooltip_delete_account",
                              "Hapus Akun",
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
  );
}
