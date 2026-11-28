import { PencilIcon, PlusIcon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { JournalRow } from "@/types/database.types";

export interface JournalsToolbarControlsProps {
  filterMode: "all" | "adjusting";
  sortedJournals: JournalRow[];
  sortKey: "date" | "number" | "description";
  sortOrder: "asc" | "desc";
  onSortChange: (key: "date" | "number" | "description", dir: "asc" | "desc") => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  selectedJournalIds: string[];
  setSelectedJournalIds: (ids: string[]) => void;
  setIsBatchDeleteDialogOpen: (val: boolean) => void;
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
  onOpenNewJournal: () => void;
}

export function JournalsToolbarControls({
  filterMode,
  sortedJournals,
  sortKey,
  sortOrder,
  onSortChange,
  isEditMode,
  setIsEditMode,
  selectedJournalIds,
  setSelectedJournalIds,
  setIsBatchDeleteDialogOpen,
  onExportExcel,
  onExportPdf,
  onExportCsv,
  onOpenNewJournal,
}: JournalsToolbarControlsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <TableSortMenu
        options={[
          { key: "date", label: t("accounting:journals.col_date", "Tanggal Transaksi") },
          { key: "number", label: t("accounting:journals.col_number", "Nomor Bukti") },
          { key: "description", label: t("accounting:journals.col_desc", "Keterangan") },
        ]}
        selectedKey={sortKey}
        sortDirection={sortOrder}
        onSortChange={(key, dir) => {
          onSortChange(key as "date" | "number" | "description", dir);
        }}
        defaultKey="date"
        defaultDirection="asc"
      />

      {sortedJournals.length === 0 && !isEditMode ? null : !isEditMode ? (
        <ActionTooltip content={t("common:action.edit", "Edit")}>
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={() => setIsEditMode(true)}
            className="size-9 rounded-xl font-semibold cursor-pointer shadow-xs"
            aria-label={t("common:action.edit", "Edit")}
          >
            <PencilIcon className="size-4 shrink-0" />
            <span className="sr-only">{t("common:action.edit", "Edit")}</span>
          </Button>
        </ActionTooltip>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditMode(false);
              setSelectedJournalIds([]);
            }}
            className="h-9 rounded-xl text-xs font-medium cursor-pointer"
          >
            {t("common:action.cancel", "Batal")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setIsBatchDeleteDialogOpen(true)}
            disabled={selectedJournalIds.length === 0}
            className="h-9 rounded-xl text-xs font-medium cursor-pointer"
          >
            {t("common:action.delete_selected", "Hapus Pilihan")} ({selectedJournalIds.length})
          </Button>
        </div>
      )}

      <ExportDownloadMenu
        label={t("common:action.export_download", "Unduh / Ekspor")}
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
        onExportCsv={onExportCsv}
        size="icon"
      />

      <ActionTooltip
        content={
          filterMode === "adjusting"
            ? t("accounting:journals.btn_record_adj", "Catat Jurnal Penyesuaian")
            : t("accounting:journals.btn_record", "Catat Transaksi")
        }
      >
        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={onOpenNewJournal}
          className="size-9 rounded-xl font-semibold cursor-pointer shadow-xs"
          aria-label={
            filterMode === "adjusting"
              ? t("accounting:journals.btn_record_adj", "Catat Jurnal Penyesuaian")
              : t("accounting:journals.btn_record", "Catat Transaksi")
          }
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="sr-only">
            {filterMode === "adjusting"
              ? t("accounting:journals.btn_record_adj", "Catat Jurnal Penyesuaian")
              : t("accounting:journals.btn_record", "Catat Transaksi")}
          </span>
        </Button>
      </ActionTooltip>
    </div>
  );
}
