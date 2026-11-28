import { Link } from "react-router-dom";
import {
  EyeIcon,
  FilterIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
} from "@/components/shared/toolbar-button";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
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
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateI18n } from "@/lib/formatters";
import type {
  ProjectMemberRow,
  ProjectRow,
} from "@/types/database.types";
import { PROJECT_STATUS_META } from "./projects-types";

export interface ProjectsTableProps {
  loading: boolean;
  filteredProjects: ProjectRow[];
  members: ProjectMemberRow[];
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortKey: "start_date" | "code" | "name" | "contract_amount";
  sortOrder: "asc" | "desc";
  onSortChange: (key: "start_date" | "code" | "name" | "contract_amount", order: "asc" | "desc") => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  selectedProjectIds: string[];
  onSelectProjectIdsChange: (ids: string[]) => void;
  onOpenNew: () => void;
  onOpenEdit: (prj: ProjectRow) => void;
  onViewProject: (prj: ProjectRow) => void;
  onDeleteTarget: (ids: string[]) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  isSidebarCollapsed: boolean;
  language?: "id" | "en";
  t: (k: string, fb?: string) => string;
}

export function ProjectsTable({
  loading,
  filteredProjects,
  members,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortKey,
  sortOrder,
  onSortChange,
  isEditMode,
  onToggleEditMode,
  selectedProjectIds,
  onSelectProjectIdsChange,
  onOpenNew,
  onOpenEdit,
  onViewProject,
  onDeleteTarget,
  onExportExcel,
  onExportPdf,
  onExportCsv,
  isSidebarCollapsed,
  language,
  t,
}: ProjectsTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeaderWithInfo
        title={t("projects.card_title", "Daftar Proyek Altvira")}
        description={t(
          "projects.card_desc",
          "Induk referensi PO pembelian, anggaran, termin penagihan, dan bagi hasil.",
        )}
        headerClassName="px-6 py-4 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        controls={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <Input
              placeholder={t("projects.search_placeholder", "Cari kode atau nama proyek...")}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-56 h-9 rounded-xl text-xs sm:text-sm"
            />
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              {statusFilter === "all" ? (
                <ActionTooltip content={t("status.all", "Semua Status")}>
                  <SelectTrigger
                    data-toolbar="true"
                    aria-label={t("status.all", "Semua Status")}
                    className={cn(TOOLBAR_BUTTON_CLASS, "[&>svg:last-child]:hidden [&>span]:hidden")}
                  >
                    <FilterIcon className="size-4 text-primary-foreground shrink-0" />
                  </SelectTrigger>
                </ActionTooltip>
              ) : (
                <SelectTrigger
                  data-toolbar="true"
                  aria-label={t("status.all", "Semua Status")}
                  className={cn(TOOLBAR_ACTIVE_EXPANDED_CLASS, "[&>svg:last-child]:hidden")}
                >
                  <FilterIcon className="size-3.5 text-primary-foreground shrink-0" />
                  <SelectValue placeholder={t("status.all", "Semua Status")} />
                </SelectTrigger>
              )}
              <SelectContent align="end" className="w-[180px] min-w-[180px]">
                <SelectGroup>
                  <SelectItem value="all">{t("status.all", "Semua Status")}</SelectItem>
                  <SelectItem value="active">{t("status.active", "Aktif")}</SelectItem>
                  <SelectItem value="draft">{t("status.draft", "Draf")}</SelectItem>
                  <SelectItem value="on_hold">{t("status.on_hold", "Ditunda")}</SelectItem>
                  <SelectItem value="completed">{t("status.completed", "Selesai")}</SelectItem>
                  <SelectItem value="cancelled">{t("status.cancelled", "Dibatalkan")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <TableSortMenu
              sortKey={sortKey}
              sortOrder={sortOrder}
              options={[
                { value: "start_date", label: t("projects:modal.field_start_date", "Tanggal Mulai") },
                { value: "code", label: t("projects:col_code", "Kode Proyek") },
                { value: "name", label: t("projects:col_name", "Nama Proyek") },
                { value: "contract_amount", label: t("projects:modal.field_contract_value", "Nilai Kontrak") },
              ]}
              onSortChange={(key, order) => {
                onSortChange(key as "start_date" | "code" | "name" | "contract_amount", order);
              }}
              defaultSortKey="start_date"
              defaultSortOrder="asc"
            />

            {!isEditMode ? (
              <ActionTooltip content={t("action.edit", "Edit")}>
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  onClick={onToggleEditMode}
                  disabled={filteredProjects.length === 0}
                  className={cn(TOOLBAR_BUTTON_CLASS, "disabled:opacity-50")}
                  aria-label={t("action.edit", "Edit")}
                >
                  <PencilIcon className="size-4 text-primary-foreground shrink-0" />
                  <span className="sr-only">{t("action.edit", "Edit")}</span>
                </Button>
              </ActionTooltip>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onToggleEditMode}
                  className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                >
                  {t("action.cancel", "Batal")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteTarget(selectedProjectIds)}
                  disabled={selectedProjectIds.length === 0}
                  className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                >
                  {t("action.delete", "Hapus")} ({selectedProjectIds.length})
                </Button>
              </div>
            )}

            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              onExportCsv={onExportCsv}
              size="icon"
              mobileFloating
            />

            <ActionTooltip content={t("projects.add_button", "Tambah Proyek")}>
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={onOpenNew}
                className={TOOLBAR_BUTTON_CLASS}
                aria-label={t("projects.add_button", "Tambah Proyek")}
              >
                <PlusIcon className="size-4 text-primary-foreground shrink-0" />
                <span className="sr-only">{t("projects.add_button", "Tambah Proyek")}</span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              {isEditMode && (
                <TableHead className="w-12 text-center align-middle px-3">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        filteredProjects.length > 0 &&
                        selectedProjectIds.length === filteredProjects.length
                      }
                      indeterminate={
                        selectedProjectIds.length > 0 &&
                        selectedProjectIds.length < filteredProjects.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectProjectIdsChange(filteredProjects.map((p) => p.id));
                        } else {
                          onSelectProjectIdsChange([]);
                        }
                      }}
                      aria-label={t("projects:select_all_projects", "Pilih Semua Proyek")}
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">{t("projects.col_code", "Kode")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("projects.col_name", "Nama Proyek")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("projects.col_period", "Periode")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("projects.col_contract_val", "Nilai Kontrak")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("projects.col_milestones", "Termin")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("projects.col_team", "Anggota Tim")}</TableHead>
              <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("projects.col_status", "Status")}</TableHead>
              <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap">{t("projects.col_actions", "Aksi")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={isEditMode ? 9 : 8}
                message={t("projects:loading_projects", "Memuat data proyek...")}
              />
            ) : filteredProjects.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={isEditMode ? 9 : 8} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <FolderOpenIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("projects:empty_title", "Belum Ada Proyek")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {t("projects:empty_desc", "Data proyek yang dibuat akan muncul di sini.")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((p) => {
                const countMembers = members.filter(
                  (m) => m.project_id === p.id,
                ).length;
                const statusMeta = PROJECT_STATUS_META[p.status] ?? {
                  label: p.status,
                  tone: "info" as SemanticTone,
                };
                const isChecked = selectedProjectIds.includes(p.id);
                return (
                  <TableRow key={p.id}>
                    {isEditMode && (
                      <TableCell className="align-top text-center px-3 py-3.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onSelectProjectIdsChange(
                                selectedProjectIds.includes(p.id)
                                  ? selectedProjectIds
                                  : [...selectedProjectIds, p.id],
                              );
                            } else {
                              onSelectProjectIdsChange(
                                selectedProjectIds.filter((id) => id !== p.id),
                              );
                            }
                          }}
                          className="mt-0.5"
                          aria-label={`Pilih proyek ${p.code}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                      {p.code}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-xs sm:text-sm leading-5 font-medium text-foreground transition-all duration-200",
                        !isSidebarCollapsed ? "max-w-[205px]" : "max-w-[290px]",
                      )}
                    >
                      <ActionTooltip content={p.name}>
                        <div className="line-clamp-2 break-words leading-5">
                          {p.name}
                        </div>
                      </ActionTooltip>
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 text-muted-foreground whitespace-nowrap">
                      {formatDateI18n(p.start_date, language)} &minus;{" "}
                      {formatDateI18n(p.target_end_date, language)}
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 whitespace-nowrap">
                      <MonetaryCell amount={p.contract_value} />
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                      {p.term_count} {t("projects:milestones_count", "Termin")}
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone="secondary"
                          label={`${countMembers} ${t("projects:members_count", "Anggota")}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone={statusMeta.tone}
                          label={t(`projects:status.${p.status}`, statusMeta.label)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 py-3.5 max-sm:py-2.5 text-center whitespace-nowrap">
                      {isEditMode ? (
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <ActionTooltip content={t("common:action.view", "Lihat")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onViewProject(p)}
                              className="size-8 rounded-lg text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                              aria-label={t("common:action.view", "Lihat")}
                            >
                              <EyeIcon className="size-4" />
                            </Button>
                          </ActionTooltip>
                          <ActionTooltip content={t("common:action.edit", "Edit")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onOpenEdit(p)}
                              className="size-8 rounded-lg text-sky-600 hover:text-sky-500 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer"
                              aria-label={t("common:action.edit", "Edit")}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                          </ActionTooltip>
                          <ActionTooltip content={t("common:action.delete", "Hapus")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteTarget([p.id])}
                              className="size-8 rounded-lg text-rose-600 hover:text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                              aria-label={t("common:action.delete", "Hapus")}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </ActionTooltip>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center -my-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title={t("projects:modal.btn_open_workspace", "Buka Ruang Kerja")}
                            className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Link to={`/admin/proyek/${p.id}`}>
                              <FolderOpenIcon className="size-4" />
                              <span className="sr-only">{t("projects:modal.btn_open_workspace", "Buka Ruang Kerja")}</span>
                            </Link>
                          </Button>
                        </div>
                      )}
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
