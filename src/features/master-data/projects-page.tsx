import * as React from "react";
import { Link } from "react-router-dom";
import {
  EyeIcon,
  FilterIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { getLocalizedRevenueMethod } from "@/lib/glossary";
import { useSidebarCollapsed } from "@/components/layout/portal-shell";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
} from "@/components/shared/toolbar-button";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import { ModalFooterAction } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsvFile } from "@/lib/csv-exporter";
import {
  deleteProjects,
  getCompanyProfile,
  listCustomers,
  listProfiles,
  listProjects,
  saveProject,
} from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  formatDateI18n,
  formatRupiah,
  inferRevenueMethodFromTerms,
} from "@/lib/formatters";
import { recordExportLog } from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  CustomerRow,
  ProfileRow,
  ProjectCategory,
  ProjectMemberRow,
  ProjectRow,
  ProjectStatus,
} from "@/types/database.types";
import { PageHeader } from "@/components/shared/page-header";

const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: SemanticTone }
> = {
  draft: { label: "Draf", tone: "secondary" },
  active: { label: "Aktif", tone: "success" },
  on_hold: { label: "Ditunda", tone: "warning" },
  completed: { label: "Selesai", tone: "info" },
  cancelled: { label: "Dibatalkan", tone: "destructive" },
};

export function ProjectsPage() {
  const { t, language } = useLanguage();
  const isSidebarCollapsed = useSidebarCollapsed();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [members, setMembers] = React.useState<ProjectMemberRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [teamUsers, setTeamUsers] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortKey, setSortKey] = React.useState<"start_date" | "code" | "name" | "contract_amount">("start_date");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
  const [viewProject, setViewProject] = React.useState<ProjectRow | null>(null);
  const [deleteTargetIds, setDeleteTargetIds] = React.useState<string[] | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | undefined>();
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<ProjectCategory>("client");
  const [customerId, setCustomerId] = React.useState<string>("none");
  const [status, setStatus] = React.useState<ProjectStatus>("active");
  const [startDate, setStartDate] = React.useState("2026-11-07");
  const [targetEndDate, setTargetEndDate] = React.useState("2027-01-31");
  const [contractValue, setContractValue] = React.useState(0);
  const [termCount, setTermCount] = React.useState(3);
  const [description, setDescription] = React.useState("");
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [prjData, csts, users] = await Promise.all([
        listProjects(),
        listCustomers(),
        listProfiles(),
      ]);
      setProjects(prjData.projects);
      setMembers(prjData.members);
      setCustomers(csts.filter((c) => c.is_active));
      setTeamUsers(users.filter((u) => u.is_active && u.role === "user"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat proyek.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  function openNew() {
    setEditingId(undefined);
    setName("");
    setCategory("client");
    setCustomerId(customers[0]?.id ?? "none");
    setStatus("active");
    setStartDate("2026-11-07");
    setTargetEndDate("2027-01-31");
    setContractValue(0);
    setTermCount(3);
    setDescription("");
    setSelectedUserIds([]);
    setDialogOpen(true);
  }

  function openEdit(prj: ProjectRow) {
    setEditingId(prj.id);
    setName(prj.name);
    setCategory(prj.project_category);
    setCustomerId(prj.customer_id ?? "none");
    setStatus(prj.status);
    setStartDate(prj.start_date ?? "");
    setTargetEndDate(prj.target_end_date ?? "");
    setContractValue(prj.contract_value);
    setTermCount(prj.term_count);
    setDescription(prj.description ?? "");
    setSelectedUserIds(
      members
        .filter((m) => m.project_id === prj.id)
        .map((m) => m.user_id),
    );
    setDialogOpen(true);
  }

  function toggleMember(uid: string, checked: boolean) {
    setSelectedUserIds((prev) =>
      checked ? [...prev, uid] : prev.filter((id) => id !== uid),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProject({
        id: editingId,
        name,
        project_category: category,
        customer_id: category === "client" && customerId !== "none" ? customerId : null,
        status,
        start_date: startDate || null,
        target_end_date: targetEndDate || null,
        contract_value: Math.round(contractValue),
        term_count: termCount,
        description: description || null,
        memberUserIds: selectedUserIds,
      });
      toast.success(
        editingId ? "Data proyek diperbarui." : "Proyek baru berhasil dibuat.",
      );
      setDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan proyek.");
    } finally {
      setSaving(false);
    }
  }

  const previewMethod = inferRevenueMethodFromTerms(termCount);

  const filteredProjects = React.useMemo(() => {
    const list = projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "code") {
        cmp = a.code.localeCompare(b.code);
      } else if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "contract_amount") {
        cmp = a.contract_value - b.contract_value;
      } else {
        cmp = (a.start_date ?? "").localeCompare(b.start_date ?? "") || a.code.localeCompare(b.code);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [projects, statusFilter, search, sortKey, sortOrder]);

  async function handleExportExcel() {
    await downloadExcelSheet({
      fileName: t("projects:export.excel_filename"),
      sheetName: t("projects:export.excel_sheet"),
      columns: [
        { header: t("projects:col_code"), width: 18 },
        { header: t("projects:col_name"), width: 36 },
        { header: t("projects:modal.field_start_date"), width: 14 },
        { header: t("projects:modal.field_end_date"), width: 14 },
        { header: t("projects:modal.field_contract_value"), width: 20 },
        { header: t("projects:col_milestones"), width: 14 },
        { header: t("projects:modal.field_revenue_method"), width: 32 },
        { header: t("projects:col_team"), width: 14 },
        { header: t("projects:col_status"), width: 14 },
      ],
      rows: filteredProjects.map((p) => {
        const countMembers = members.filter((m) => m.project_id === p.id).length;
        const statusLabel = t(`projects:status.${p.status}`, PROJECT_STATUS_META[p.status]?.label ?? p.status);
        return [
          p.code,
          p.name,
          formatDateI18n(p.start_date, language),
          formatDateI18n(p.target_end_date, language),
          p.contract_value,
          p.term_count,
          getLocalizedRevenueMethod(p.revenue_method, language),
          `${countMembers} ${t("projects:members_count")}`,
          statusLabel,
        ];
      }),
    });
    await recordExportLog("PROJECTS_MASTER", "EXCEL");
    toast.success(t("projects:export.toast_excel_success"));
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: t("projects:export.pdf_title"),
      docSubtitle: t("projects:export.pdf_subtitle", { count: filteredProjects.length }),
      docNumber: `PRJ-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      orientation: "landscape",
      tableColumns: [
        { header: t("projects:col_code"), widthRatio: 0.12, align: "center" },
        { header: t("projects:col_name"), widthRatio: 0.28 },
        { header: t("projects:col_period"), widthRatio: 0.18, align: "center" },
        { header: t("projects:col_contract_val"), widthRatio: 0.14, align: "right" },
        { header: t("projects:col_milestones"), widthRatio: 0.08, align: "center" },
        { header: t("projects:col_team"), widthRatio: 0.10, align: "center" },
        { header: t("projects:col_status"), widthRatio: 0.10, align: "center" },
      ],
      tableRows: filteredProjects.map((p) => {
        const countMembers = members.filter((m) => m.project_id === p.id).length;
        const statusLabel = t(`projects:status.${p.status}`, PROJECT_STATUS_META[p.status]?.label ?? p.status);
        return [
          p.code,
          p.name,
          `${formatDateI18n(p.start_date, language)} - ${formatDateI18n(p.target_end_date, language)}`,
          formatRupiah(p.contract_value),
          `${p.term_count} ${t("projects:milestones_count", "Termin")}`,
          `${countMembers} ${t("projects:members_count", "Anggota")}`,
          statusLabel,
        ];
      }),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, t("projects:export.pdf_filename"));
    await recordExportLog("PROJECTS_MASTER", "PDF");
  }

  async function handleExportCsv() {
    downloadCsvFile(
      t("projects:export.csv_filename"),
      [
        t("projects:col_code"),
        t("projects:col_name"),
        t("projects:modal.field_start_date"),
        t("projects:modal.field_end_date"),
        t("projects:modal.field_contract_value"),
        t("projects:col_milestones"),
        t("projects:modal.field_revenue_method"),
        t("projects:col_team"),
        t("projects:col_status"),
      ],
      filteredProjects.map((p) => {
        const countMembers = members.filter((m) => m.project_id === p.id).length;
        const statusLabel = t(`projects:status.${p.status}`, PROJECT_STATUS_META[p.status]?.label ?? p.status);
        return [
          p.code,
          p.name,
          p.start_date ? formatDateI18n(p.start_date, language) : "-",
          p.target_end_date ? formatDateI18n(p.target_end_date, language) : "-",
          p.contract_value,
          p.term_count,
          getLocalizedRevenueMethod(p.revenue_method, language),
          countMembers,
          statusLabel,
        ];
      }),
    );
    await recordExportLog("PROJECTS_MASTER", "CSV");
    toast.success(t("projects:export.toast_csv_success"));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("projects.title", "Master Proyek & Penugasan Tim")}
        description={t(
          "projects.subtitle",
          "Pantau proyek klien, penugasan tim internal, dan metode pengakuan pendapatan.",
        )}
      />

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
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 h-9 rounded-xl text-xs sm:text-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  setSortKey(key as "start_date" | "code" | "name" | "contract_amount");
                  setSortOrder(order);
                }}
                defaultSortKey="start_date"
                defaultSortOrder="asc"
              />

              {!isEditMode ? (
                <ActionTooltip content={t("action.edit", "Edit")}>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    disabled={filteredProjects.length === 0}
                    className={cn(TOOLBAR_BUTTON_CLASS, "disabled:opacity-50")}
                    aria-label={t("action.edit", "Edit")}
                  >
                    <PencilIcon className="size-4 text-primary-foreground shrink-0" />
                    <span className="sr-only">{t("action.edit", "Edit")}</span>
                  </button>
                </ActionTooltip>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditMode(false);
                      setSelectedProjectIds([]);
                    }}
                    className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {t("action.cancel", "Batal")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTargetIds(selectedProjectIds)}
                    disabled={selectedProjectIds.length === 0}
                    className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {t("action.delete", "Hapus")} ({selectedProjectIds.length})
                  </Button>
                </div>
              )}

              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                onExportCsv={handleExportCsv}
                size="icon"
                mobileFloating
              />

              <ActionTooltip content={t("projects.add_button", "Tambah Proyek")}>
                <button
                  type="button"
                  onClick={openNew}
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={t("projects.add_button", "Tambah Proyek")}
                >
                  <PlusIcon className="size-4 text-primary-foreground shrink-0" />
                  <span className="sr-only">{t("projects.add_button", "Tambah Proyek")}</span>
                </button>
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
                              setSelectedProjectIds(filteredProjects.map((p) => p.id));
                            } else {
                              setSelectedProjectIds([]);
                            }
                          }}
                          aria-label={t("projects:select_all_projects")}
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
                    message={t("projects:loading_projects")}
                  />
                ) : filteredProjects.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={isEditMode ? 9 : 8} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <FolderOpenIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("projects:empty_title")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          {t("projects:empty_desc")}
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
                                setSelectedProjectIds((prev) =>
                                  prev.includes(p.id) ? prev : [...prev, p.id],
                                );
                              } else {
                                setSelectedProjectIds((prev) =>
                                  prev.filter((id) => id !== p.id),
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
                            <ActionTooltip content={t("common:action.view")}>
                            <button
                              type="button"
                              onClick={() => setViewProject(p)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/20"
                              aria-label={t("common:action.view")}
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            </ActionTooltip>
                            <ActionTooltip content={t("common:action.edit")}>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-sky-500/20"
                              aria-label={t("common:action.edit")}
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            </ActionTooltip>
                            <ActionTooltip content={t("common:action.delete")}>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetIds([p.id])}
                              className="p-1.5 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                              aria-label={t("common:action.delete")}
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                            </ActionTooltip>
                          </div>
                        ) : (
                          <div className="flex justify-center items-center -my-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title={t("projects:modal.btn_open_workspace")}
                              className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Link to={`/admin/proyek/${p.id}`}>
                                <FolderOpenIcon className="size-4" />
                                <span className="sr-only">{t("projects:modal.btn_open_workspace")}</span>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("projects:modal.edit_title")
                : t("projects:modal.create_title")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prj-name" required>
                  {t("projects:modal.field_name")}
                </FieldLabel>
                <Input
                  id="prj-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("projects:modal.field_name_ph")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>
                    {t("projects:modal.field_category")}
                  </FieldLabel>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as ProjectCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="client">
                          {t("projects:modal.cat_client")}
                        </SelectItem>
                        <SelectItem value="internal">
                          {t("projects:modal.cat_internal")}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-disabled={category !== "client"}>
                  <FieldLabel>{t("projects:modal.field_client")}</FieldLabel>
                  <Select
                    value={customerId}
                    disabled={category !== "client"}
                    onValueChange={setCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("projects:modal.client_ph")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          {t("projects:modal.unassigned")}
                        </SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="prj-val" required>
                    {t("projects:modal.field_contract_value")}
                  </FieldLabel>
                  <NumberInput
                    id="prj-val"
                    allowDecimal={false}
                    min={0}
                    required
                    value={contractValue}
                    onValueChange={setContractValue}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prj-terms" required>
                    {t("projects:modal.field_milestones_count")}
                  </FieldLabel>
                  <NumberInput
                    id="prj-terms"
                    allowDecimal={false}
                    min={1}
                    max={24}
                    required
                    value={termCount}
                    onValueChange={setTermCount}
                  />
                  <FieldDescription>
                    {t("projects:modal.field_revenue_method")}: {getLocalizedRevenueMethod(previewMethod, language)}
                  </FieldDescription>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="prj-start">
                    {t("projects:modal.field_start_date")}
                  </FieldLabel>
                  <DatePicker
                    id="prj-start"
                    value={startDate}
                    onChange={setStartDate}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prj-end">
                    {t("projects:modal.field_end_date")}
                  </FieldLabel>
                  <DatePicker
                    id="prj-end"
                    value={targetEndDate}
                    onChange={setTargetEndDate}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel required>
                  {t("projects:modal.field_status")}
                </FieldLabel>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="draft">{t("projects:status.draft")}</SelectItem>
                      <SelectItem value="active">{t("projects:status.active")}</SelectItem>
                      <SelectItem value="on_hold">{t("projects:status.on_hold")}</SelectItem>
                      <SelectItem value="completed">{t("projects:status.completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("projects:status.cancelled")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <FieldSet className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-4 space-y-3">
                <div>
                  <FieldLegend className="text-xs font-semibold text-foreground">
                    {t("projects:modal.team_assignment_title")}
                  </FieldLegend>
                  <FieldDescription className="text-[11px]">
                    {t("projects:modal.team_assignment_desc")}
                  </FieldDescription>
                </div>
                {teamUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("common:empty")}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {teamUsers.map((u) => (
                      <Field key={u.id} orientation="horizontal" className="justify-between rounded-lg border border-border/60 bg-card/80 px-3 py-2">
                        <FieldLabel htmlFor={`mem-${u.id}`} className="font-normal text-xs cursor-pointer">
                          <span className="font-semibold text-foreground">{u.full_name}</span>{" "}
                          <span className="text-muted-foreground">({u.email})</span>
                        </FieldLabel>
                        <Switch
                          id={`mem-${u.id}`}
                          checked={selectedUserIds.includes(u.id)}
                          onCheckedChange={(c) => toggleMember(u.id, c)}
                        />
                      </Field>
                    ))}
                  </div>
                )}
              </FieldSet>

              <Field>
                <FieldLabel htmlFor="prj-desc">
                  {t("projects:modal.field_notes")}
                </FieldLabel>
                <Textarea
                  id="prj-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("projects:modal.field_notes_ph")}
                />
              </Field>

              <ModalFooterAction
                onCancel={() => setDialogOpen(false)}
                saving={saving}
                cancelLabel={t("projects:modal.btn_cancel")}
                submitLabel={t("projects:modal.btn_save")}
              />
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Lihat Rincian Proyek */}
      <Dialog
        open={Boolean(viewProject)}
        onOpenChange={(open) => {
          if (!open) setViewProject(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewProject
                ? `${t("projects:modal.view_title_client")} — ${viewProject.code}`
                : t("projects:modal.view_title_internal")}
            </DialogTitle>
          </DialogHeader>
          {viewProject ? (
            <div className="space-y-4">
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/15">
                {[
                  { label: t("projects:col_code"), value: viewProject.code },
                  { label: t("projects:col_name"), value: viewProject.name },
                  {
                    label: t("projects:modal.field_client"),
                    value:
                      customers.find((c) => c.id === viewProject.customer_id)?.name ??
                      t("projects:modal.internal_project"),
                  },
                  {
                    label: t("projects:col_period"),
                    value: `${formatDateI18n(viewProject.start_date, language)} - ${formatDateI18n(viewProject.target_end_date, language)}`,
                  },
                  {
                    label: t("projects:col_contract_val"),
                    value: formatRupiah(viewProject.contract_value),
                  },
                  {
                    label: t("projects:col_milestones"),
                    value: `${viewProject.term_count} ${t("projects:milestones_count")}`,
                  },
                  {
                    label: t("projects:modal.field_revenue_method"),
                    value: getLocalizedRevenueMethod(viewProject.revenue_method, language),
                  },
                  {
                    label: t("projects:modal.field_notes"),
                    value: viewProject.description ?? "-",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {item.label}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground sm:text-right break-words">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="cursor-pointer"
                >
                  <Link to={`/admin/proyek/${viewProject.id}`}>
                    {t("projects:modal.btn_open_workspace")}
                  </Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewProject(null)}
                  className="cursor-pointer"
                >
                  {t("projects:modal.btn_close")}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Hapus Proyek */}
      <ConfirmActionDialog
        open={Boolean(deleteTargetIds && deleteTargetIds.length > 0)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetIds(null);
        }}
        title={
          deleteTargetIds && deleteTargetIds.length > 1
            ? `Hapus ${deleteTargetIds.length} proyek terpilih?`
            : "Hapus proyek ini?"
        }
        description="Data proyek dan jadwal termin terkait akan dihapus permanen. Proyek yang masih terhubung dengan jurnal, PO, atau invoice tidak dapat dihapus."
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={async () => {
          if (!deleteTargetIds || deleteTargetIds.length === 0) return;
          await deleteProjects(deleteTargetIds);
          toast.success(`${deleteTargetIds.length} proyek berhasil dihapus.`);
          setSelectedProjectIds([]);
          setIsEditMode(false);
          await reload();
        }}
      />
    </div>
  );
}

