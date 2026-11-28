import * as React from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { useSidebarCollapsed } from "@/components/layout/portal-shell";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  deleteProjects,
  listCustomers,
  listProfiles,
  listProjects,
} from "@/lib/data-service";
import type {
  CustomerRow,
  ProfileRow,
  ProjectMemberRow,
  ProjectRow,
} from "@/types/database.types";
import {
  handleExportProjectsCsv,
  handleExportProjectsExcel,
  handleExportProjectsPdf,
} from "./projects/projects-export-handlers";
import { ProjectsTable } from "./projects/projects-table";
import { ProjectFormDialog } from "./projects/project-form-dialog";
import { ProjectViewDialog } from "./projects/project-view-dialog";

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
  const [editingProject, setEditingProject] = React.useState<ProjectRow | null>(null);

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

  const exportContext = {
    filteredProjects,
    members,
    language: (language ?? "id") as "id" | "en",
    t,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("projects.title", "Master Proyek & Penugasan Tim")}
        description={t(
          "projects.subtitle",
          "Pantau proyek klien, penugasan tim internal, dan metode pengakuan pendapatan.",
        )}
      />

      {/* Tabel Master Proyek */}
      <ProjectsTable
        loading={loading}
        filteredProjects={filteredProjects}
        members={members}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(k, o) => {
          setSortKey(k);
          setSortOrder(o);
        }}
        isEditMode={isEditMode}
        onToggleEditMode={() => {
          setIsEditMode(!isEditMode);
          setSelectedProjectIds([]);
        }}
        selectedProjectIds={selectedProjectIds}
        onSelectProjectIdsChange={setSelectedProjectIds}
        onOpenNew={() => {
          setEditingProject(null);
          setDialogOpen(true);
        }}
        onOpenEdit={(prj) => {
          setEditingProject(prj);
          setDialogOpen(true);
        }}
        onViewProject={(prj) => setViewProject(prj)}
        onDeleteTarget={(ids) => setDeleteTargetIds(ids)}
        onExportExcel={() => void handleExportProjectsExcel(exportContext)}
        onExportPdf={() => void handleExportProjectsPdf(exportContext)}
        onExportCsv={() => void handleExportProjectsCsv(exportContext)}
        isSidebarCollapsed={isSidebarCollapsed}
        language={(language ?? "id") as "id" | "en"}
        t={t}
      />

      {/* Dialog Buat / Edit Proyek */}
      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProject={editingProject}
        members={members}
        customers={customers}
        teamUsers={teamUsers}
        language={(language ?? "id") as "id" | "en"}
        onSuccess={reload}
        t={t}
      />

      {/* Dialog Lihat Rincian Proyek */}
      <ProjectViewDialog
        project={viewProject}
        onClose={() => setViewProject(null)}
        customers={customers}
        language={(language ?? "id") as "id" | "en"}
        t={t}
      />

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
