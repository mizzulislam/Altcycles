import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { TOOLBAR_BUTTON_CLASS } from "@/components/shared/toolbar-button";
import { useLanguage } from "@/lib/i18n";
import type { SemanticTone } from "@/components/shared/status-badge";
import type {
  ClientPurchaseOrderRow,
  HandoverReportRow,
  MilestoneRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectProgressRow,
  QuotationRow,
  UatChecklistRow,
} from "@/types/database.types";

export interface DraftMilestone {
  name: string;
  isDownPayment: boolean;
  isFinalSettlement: boolean;
  percentage: number;
  amount: number;
  achievementCriteria: string;
}

export const MILESTONE_STATUS_META: Record<string, { label: string; tone: SemanticTone }> = {
  planned: { label: "Direncanakan", tone: "info" },
  in_progress: { label: "Berjalan", tone: "info" },
  bakp_approved: { label: "BAKP Disetujui", tone: "warning" },
  invoiced: { label: "Ditagihkan", tone: "info" },
  paid: { label: "Lunas", tone: "success" },
};

export function getMilestoneStatusMeta(status: string, t: (k: string, fb?: string) => string) {
  const meta = MILESTONE_STATUS_META[status];
  return {
    label: t(`projects:status.${status}`, meta?.label ?? status),
    tone: meta?.tone ?? ("info" as SemanticTone),
  };
}

export const QUOTATION_STATUS_META: Record<string, { label: string; tone: SemanticTone }> = {
  draft: { label: "Draf", tone: "secondary" },
  sent: { label: "Terkirim", tone: "info" },
  accepted: { label: "Disetujui", tone: "success" },
  rejected: { label: "Ditolak", tone: "destructive" },
  expired: { label: "Kedaluwarsa", tone: "secondary" },
};

export function getQuotationStatusMeta(status: string, t: (k: string, fb?: string) => string) {
  const meta = QUOTATION_STATUS_META[status];
  return {
    label: t(`projects:status.${status}`, meta?.label ?? status),
    tone: meta?.tone ?? ("info" as SemanticTone),
  };
}

export const CPO_STATUS_META: Record<string, { label: string; tone: SemanticTone }> = {
  pending_verification: { label: "Menunggu Verifikasi", tone: "warning" },
  verified: { label: "Terverifikasi", tone: "success" },
  rejected: { label: "Ditolak", tone: "destructive" },
};

export function getCpoStatusMeta(status: string, t: (k: string, fb?: string) => string) {
  const meta = CPO_STATUS_META[status];
  return {
    label: t(`projects:status.${status}`, meta?.label ?? status),
    tone: meta?.tone ?? ("info" as SemanticTone),
  };
}

export const BAKP_STATUS_META: Record<string, { label: string; tone: SemanticTone }> = {
  draft: { label: "Draf", tone: "secondary" },
  submitted_to_client: { label: "Diajukan ke Klien", tone: "warning" },
  approved_by_client: { label: "Disetujui Klien", tone: "success" },
};

export function getBakpStatusMeta(status: string, t: (k: string, fb?: string) => string) {
  const meta = BAKP_STATUS_META[status];
  return {
    label: t(`projects:status.${status}`, meta?.label ?? status),
    tone: meta?.tone ?? ("info" as SemanticTone),
  };
}

export const UAT_CONCLUSION_META: Record<string, { label: string; tone: SemanticTone }> = {
  pending: { label: "Menunggu Hasil", tone: "warning" },
  accepted: { label: "Diterima Penuh", tone: "success" },
  accepted_with_notes: { label: "Diterima (Catatan)", tone: "info" },
  rejected: { label: "Ditolak / Revisi", tone: "destructive" },
};

export function getUatConclusionMeta(conclusion: string, t: (k: string, fb?: string) => string) {
  const meta = UAT_CONCLUSION_META[conclusion];
  return {
    label: t(`projects:status.${conclusion}`, meta?.label ?? conclusion),
    tone: meta?.tone ?? ("info" as SemanticTone),
  };
}

export const BAST_STATUS_META: Record<string, { label: string; tone: SemanticTone }> = {
  draft: { label: "Draf", tone: "secondary" },
  signed: { label: "Ditandatangani", tone: "success" },
};

export function getBastStatusMeta(status: string, t: (k: string, fb?: string) => string) {
  const meta = BAST_STATUS_META[status];
  return {
    label: t(`projects:status.${status}`, meta?.label ?? status),
    tone: meta?.tone ?? ("info" as SemanticTone),
  };
}

export type SectionKey =
  | "milestones"
  | "progress"
  | "quotations"
  | "clientPos"
  | "documents"
  | "bakp"
  | "uat"
  | "bast";

export type EditableRecord =
  | { section: "milestones"; item: MilestoneRow }
  | { section: "progress"; item: ProjectProgressRow }
  | { section: "quotations"; item: QuotationRow }
  | { section: "clientPos"; item: ClientPurchaseOrderRow }
  | { section: "documents"; item: ProjectDocumentRow }
  | { section: "bakp"; item: ProgressReportRow }
  | { section: "uat"; item: UatChecklistRow }
  | { section: "bast"; item: HandoverReportRow };

export interface ViewDetailState {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
  onDownloadPdf?: () => void;
  onDownloadWord?: () => void;
}

export function SectionEditControls({
  hasItems,
  isEditing,
  selectedCount,
  onStartEdit,
  onCancelEdit,
  onDeleteSelected,
}: {
  hasItems: boolean;
  isEditing: boolean;
  selectedCount: number;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDeleteSelected: () => void;
}) {
  const { t } = useLanguage();
  if (!hasItems) {
    return null;
  }

  if (!isEditing) {
    return (
      <ActionTooltip content={t("common:action.edit", "Edit")}>
        <button
          type="button"
          onClick={onStartEdit}
          className={TOOLBAR_BUTTON_CLASS}
          aria-label={t("common:action.edit", "Edit")}
        >
          <PencilIcon className="size-4 text-primary-foreground shrink-0" />
          <span className="sr-only">{t("common:action.edit", "Edit")}</span>
        </button>
      </ActionTooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancelEdit}
        className="h-9 rounded-xl text-xs font-medium cursor-pointer"
      >
        {t("common:action.cancel", "Batal")}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDeleteSelected}
        disabled={selectedCount === 0}
        className="h-9 rounded-xl text-xs font-medium cursor-pointer"
      >
        {t("common:action.delete_selected", "Hapus Pilihan")} ({selectedCount})
      </Button>
    </div>
  );
}

export function RowEditActionButtons({
  onView,
  onEdit,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-1 -my-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onView}
        className="size-8 rounded-lg text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-500/10"
        title={t("common:action.view", "Lihat rincian")}
        aria-label={t("common:action.view", "Lihat rincian")}
      >
        <EyeIcon className="size-4" />
        <span className="sr-only">{t("common:action.view", "Lihat rincian")}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onEdit}
        className="size-8 rounded-lg text-primary dark:text-sky-400 hover:bg-primary/10"
        title={t("common:action.edit", "Edit data")}
        aria-label={t("common:action.edit", "Edit data")}
      >
        <PencilIcon className="size-4" />
        <span className="sr-only">{t("common:action.edit", "Edit data")}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="size-8 rounded-lg text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10"
        title={t("common:action.delete", "Hapus data")}
        aria-label={t("common:action.delete", "Hapus data")}
      >
        <Trash2Icon className="size-4" />
        <span className="sr-only">{t("common:action.delete", "Hapus data")}</span>
      </Button>
    </div>
  );
}
