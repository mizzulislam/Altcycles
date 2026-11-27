import {
  CalendarCheck2Icon,
  ClipboardCheckIcon,
  FileCheck2Icon,
  FileSignatureIcon,
  FileTextIcon,
  FolderKanbanIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import type { CustomerRow, ProjectRow } from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

export type ProjectDetailTabId = "termin" | "quotation_po" | "sow_spk" | "bakp_uat_bast";

interface ProjectDetailHeaderProps {
  project: ProjectRow;
  bundle: ProjectWorkspaceBundle;
  allProjects: ProjectRow[];
  customer?: CustomerRow;
  activeTab: ProjectDetailTabId;
  onTabChange: (tab: ProjectDetailTabId) => void;
  onSwitchProject: (nextId: string) => void;
}

export function ProjectDetailHeader({
  project,
  bundle,
  allProjects,
  customer,
  activeTab,
  onTabChange,
  onSwitchProject,
}: ProjectDetailHeaderProps) {
  const { t, language } = useLanguage();

  const maxProgressPct = bundle.progressEntries.reduce(
    (m, p) => Math.max(m, p.cumulative_percentage),
    0,
  );

  const totalDocsCount =
    bundle.quotations.length +
    bundle.clientPos.length +
    bundle.documents.length +
    bundle.bakpList.length +
    bundle.uatList.length +
    bundle.bastList.length;
  const verifiedClientPosCount = bundle.clientPos.filter(
    (c) => c.status === "verified",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <PageHeader
        title={t("projects:header.title", "Dokumen & Termin Proyek")}
        badge={
          project.is_eliminated ? (
            <StatusBadge
              tone="success"
              label={t("projects:summary.eliminated_badge", "WIP & Penagihan Tereliminasi 100%")}
            />
          ) : null
        }
        description={t(
          "projects:header.subtitle",
          "Kelola jadwal termin, progres penyelesaian, dan dokumen resmi proyek.",
        )}
      />

      {/* Informasi Proyek: 2 Kelompok Seimbang */}
      <Card className="rounded-2xl border-border/80 bg-card px-6 py-4 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-8">
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t("projects:summary.code", "Kode Proyek")}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate tabular-nums">
                  {project.code}
                </p>
              </div>
              <Select
                value={project.id}
                onValueChange={(nextId) => {
                  if (nextId && nextId !== project.id) {
                    onSwitchProject(nextId);
                  }
                }}
              >
                <SelectTrigger
                  aria-label={t("projects:header.switch_project", "Pindah ke proyek lain")}
                  className="h-8.5 w-auto min-w-[150px] max-w-[210px] rounded-xl bg-card border-border/80 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer shrink-0 gap-2"
                >
                  <FolderKanbanIcon className="size-3.5 text-primary shrink-0" />
                  <SelectValue placeholder={t("projects:header.select_project", "Pilih kode proyek")} />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {allProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                {t("projects:summary.name", "Nama Proyek")}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                {project.name}
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px bg-border/60 shrink-0" />

          <div className="shrink-0 md:min-w-[230px] lg:min-w-[260px] flex flex-col justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                {t("projects:summary.client", "Klien")}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {customer?.name ?? t("projects:summary.internal_project", "Proyek Internal")}
              </p>
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                {t("projects:summary.period", "Periode Pelaksanaan")}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap tabular-nums">
                {formatDateI18n(project.start_date, language)} &minus;{" "}
                {formatDateI18n(project.target_end_date, language)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Ringkasan Eksekutif Proyek */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("projects:summary.contract_value", "Nilai Kontrak Proyek")}
          displayValue={formatRupiah(project.contract_value)}
          subtext={customer?.name ?? t("projects:summary.internal_project", "Proyek Internal")}
          icon={WalletIcon}
          iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
        />

        <KpiCard
          label={t("projects:summary.progress", "Progres Penyelesaian Proyek")}
          value={maxProgressPct}
          suffix="%"
          subtext={t("projects:summary.structured_milestones", {
            count: bundle.milestones.length,
            defaultValue: `${bundle.milestones.length} termin terstruktur`,
          })}
          icon={TrendingUpIcon}
          iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        />

        <KpiCard
          label={t("projects:summary.docs_completeness", "Kelengkapan Dokumen & PO")}
          value={totalDocsCount}
          suffix={` ${t("projects:summary.docs_unit", "Dokumen")}`}
          subtext={t("projects:summary.docs_verified", {
            count: verifiedClientPosCount,
            defaultValue: `${verifiedClientPosCount} PO klien terverifikasi`,
          })}
          icon={FileTextIcon}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        />
      </div>

      {/* Bar Navigasi Tab Dokumen & Termin Proyek */}
      <div className="bg-card rounded-2xl p-2 flex items-center gap-1.5 shadow-2xs border border-border/80 w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          {
            id: "termin" as const,
            label: t("projects:tabs.milestones", "Termin & Progres"),
            badge: `${maxProgressPct}%`,
            icon: CalendarCheck2Icon,
          },
          {
            id: "quotation_po" as const,
            label: t("projects:tabs.quotation_po", "Quotation & PO Klien"),
            badge: String(bundle.clientPos.length),
            icon: FileCheck2Icon,
          },
          {
            id: "sow_spk" as const,
            label: t("projects:tabs.sow_spk", "SoW & SPK"),
            badge: String(bundle.documents.length),
            icon: FileSignatureIcon,
          },
          {
            id: "bakp_uat_bast" as const,
            label: t("projects:tabs.bakp_uat_bast", "BAKP, UAT, & BAST"),
            badge: String(
              bundle.bakpList.length + bundle.uatList.length + bundle.bastList.length,
            ),
            icon: ClipboardCheckIcon,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none tabular-nums",
                  isActive
                    ? "bg-primary-foreground text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
