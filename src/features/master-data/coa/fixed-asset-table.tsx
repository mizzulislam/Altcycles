import {
  CalculatorIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Spinner } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import { formatDateI18n, formatRupiah, roundRupiah } from "@/lib/formatters";
import type {
  FixedAssetDepreciationRow,
  FixedAssetRow,
} from "@/types/database.types";

export interface FixedAssetTableProps {
  fixedAssets: FixedAssetRow[];
  depreciations: FixedAssetDepreciationRow[];
  runningDepr: boolean;
  onRunOpenPeriodDepreciation: () => void;
  onOpenNewAssetDialog: () => void;
  onOpenEditAssetDialog: (fa: FixedAssetRow) => void;
  onDeleteAsset: (fa: FixedAssetRow) => void;
}

export function FixedAssetTable({
  fixedAssets,
  depreciations,
  runningDepr,
  onRunOpenPeriodDepreciation,
  onOpenNewAssetDialog,
  onOpenEditAssetDialog,
  onDeleteAsset,
}: FixedAssetTableProps) {
  const { t, language } = useLanguage();

  return (
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
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
            <ActionTooltip
              content={t(
                "accounting:fixed_assets.btn_run_depreciation",
                "Jalankan Penyusutan Periode Terbuka",
              )}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={runningDepr || fixedAssets.length === 0}
                onClick={onRunOpenPeriodDepreciation}
                className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                aria-label={t(
                  "accounting:fixed_assets.btn_run_depreciation",
                  "Jalankan Penyusutan Periode Terbuka",
                )}
              >
                {runningDepr ? (
                  <Spinner className="size-4" />
                ) : (
                  <CalculatorIcon className="size-4 text-primary" />
                )}
                <span className="sr-only">
                  {t(
                    "accounting:fixed_assets.btn_run_depreciation",
                    "Jalankan Penyusutan Periode Terbuka",
                  )}
                </span>
              </Button>
            </ActionTooltip>

            <ActionTooltip
              content={t(
                "accounting:fixed_assets.btn_add_asset",
                "Tambah Aset Tetap",
              )}
            >
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={onOpenNewAssetDialog}
                className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs"
                aria-label={t(
                  "accounting:fixed_assets.btn_add_asset",
                  "Tambah Aset Tetap",
                )}
              >
                <PlusIcon className="size-4" />
                <span className="sr-only">
                  {t(
                    "accounting:fixed_assets.btn_add_asset",
                    "Tambah Aset Tetap",
                  )}
                </span>
              </Button>
            </ActionTooltip>
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
                {t(
                  "accounting:fixed_assets.col_book_value",
                  "Nilai Buku Bersih",
                )}
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
                          onClick={() => onOpenEditAssetDialog(fa)}
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
                            onDeleteAsset(fa);
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
  );
}
