import * as React from "react";
import { Link } from "react-router-dom";
import {
  EyeIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/components/layout/portal-shell";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
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
  formatDateID,
  formatRupiah,
  inferRevenueMethodFromTerms,
  REVENUE_METHOD_LABELS,
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
  const isSidebarCollapsed = useSidebarCollapsed();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [members, setMembers] = React.useState<ProjectMemberRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [teamUsers, setTeamUsers] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
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
    return projects.filter((p) => {
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
  }, [projects, statusFilter, search]);

  async function handleExportExcel() {
    await downloadExcelSheet({
      fileName: "Daftar_Proyek_Altvira_Altcycles.xlsx",
      sheetName: "Daftar Proyek",
      columns: [
        { header: "Kode", width: 18 },
        { header: "Nama Proyek", width: 36 },
        { header: "Tanggal Mulai", width: 14 },
        { header: "Target Selesai", width: 14 },
        { header: "Nilai Kontrak (Rp)", width: 20 },
        { header: "Jumlah Termin", width: 14 },
        { header: "Metode Pengakuan", width: 32 },
        { header: "Anggota Tim", width: 14 },
        { header: "Status", width: 14 },
      ],
      rows: filteredProjects.map((p) => {
        const countMembers = members.filter((m) => m.project_id === p.id).length;
        return [
          p.code,
          p.name,
          formatDateID(p.start_date),
          formatDateID(p.target_end_date),
          p.contract_value,
          p.term_count,
          REVENUE_METHOD_LABELS[p.revenue_method],
          `${countMembers} Anggota`,
          PROJECT_STATUS_META[p.status]?.label ?? p.status,
        ];
      }),
    });
    await recordExportLog("PROJECTS_MASTER", "EXCEL");
    toast.success("Daftar proyek berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: "DAFTAR MASTER PROYEK & PENUGASAN TIM",
      docSubtitle: `Total Proyek Ditampilkan: ${filteredProjects.length} proyek`,
      docNumber: `PRJ-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: "Kode", widthRatio: 0.16 },
        { header: "Nama Proyek", widthRatio: 0.30 },
        { header: "Periode", widthRatio: 0.20 },
        { header: "Nilai Kontrak", widthRatio: 0.16, align: "right" },
        { header: "Termin", widthRatio: 0.08 },
        { header: "Status", widthRatio: 0.10 },
      ],
      tableRows: filteredProjects.map((p) => [
        p.code,
        p.name,
        `${formatDateID(p.start_date)} - ${formatDateID(p.target_end_date)}`,
        formatRupiah(p.contract_value),
        `${p.term_count}`,
        PROJECT_STATUS_META[p.status]?.label ?? p.status,
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, "Daftar_Proyek_Altvira_Altcycles.pdf");
    await recordExportLog("PROJECTS_MASTER", "PDF");
    toast.success("Daftar proyek berhasil diekspor ke PDF (.pdf).");
  }

  async function handleExportCsv() {
    downloadCsvFile(
      "Daftar_Proyek_Altvira_Altcycles.csv",
      [
        "Kode",
        "Nama Proyek",
        "Tanggal Mulai",
        "Target Selesai",
        "Nilai Kontrak (Rp)",
        "Jumlah Termin",
        "Metode Pengakuan",
        "Anggota Tim",
        "Status",
      ],
      filteredProjects.map((p) => {
        const countMembers = members.filter((m) => m.project_id === p.id).length;
        return [
          p.code,
          p.name,
          p.start_date ?? "-",
          p.target_end_date ?? "-",
          p.contract_value,
          p.term_count,
          REVENUE_METHOD_LABELS[p.revenue_method],
          countMembers,
          PROJECT_STATUS_META[p.status]?.label ?? p.status,
        ];
      }),
    );
    await recordExportLog("PROJECTS_MASTER", "CSV");
    toast.success("Daftar proyek berhasil diekspor ke CSV (.csv).");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Master Proyek &amp; Penugasan Tim
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Pantau proyek klien, penugasan tim internal, dan metode pengakuan pendapatan SAK.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
          <Button
            type="button"
            onClick={openNew}
            className="shrink-0"
          >
            <PlusIcon className="size-4" />
            <span>Tambah Proyek</span>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              Daftar Proyek Altvira
            </CardTitle>
            <CardDescription>
              Induk referensi PO pembelian, anggaran, termin penagihan, dan bagi hasil.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
            <Input
              placeholder="Cari kode atau nama proyek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 h-9 rounded-xl text-xs sm:text-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="draft">Draf</SelectItem>
                  <SelectItem value="on_hold">Ditunda</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {filteredProjects.length === 0 && !isEditMode ? null : !isEditMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="h-9 gap-1.5 rounded-xl text-xs font-medium cursor-pointer text-primary dark:text-sky-400 bg-primary/10 hover:bg-primary/15 border-primary/25 transition-colors shadow-2xs"
              >
                <PencilIcon className="size-3.5" />
                <span>Edit</span>
              </Button>
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
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTargetIds(selectedProjectIds)}
                  disabled={selectedProjectIds.length === 0}
                  className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Hapus Pilihan ({selectedProjectIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar proyek...</span>
            </div>
          ) : (
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
                          aria-label="Pilih semua proyek"
                        />
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Proyek</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Periode</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nilai Kontrak</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Termin</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Anggota Tim</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={isEditMode ? 9 : 8} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <FolderOpenIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {projects.length === 0
                            ? "Belum Ada Proyek Terdaftar"
                            : "Tidak Ada Proyek yang Cocok"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          {projects.length === 0
                            ? "Klik tombol Tambah Proyek di kanan atas untuk mendaftarkan proyek pertama."
                            : "Sesuaikan kata kunci pencarian atau filter status proyek."}
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
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                        {p.code}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground",
                          !isSidebarCollapsed ? "max-w-[205px]" : "max-w-[290px]",
                        )}
                      >
                        <div
                          className={cn(!isSidebarCollapsed && "line-clamp-2")}
                          title={!isSidebarCollapsed ? p.name : undefined}
                        >
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 text-muted-foreground whitespace-nowrap">
                        {formatDateID(p.start_date)} &minus;{" "}
                        {formatDateID(p.target_end_date)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={p.contract_value} />
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                        {p.term_count} Termin
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone="secondary"
                            label={`${countMembers} Anggota`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={statusMeta.tone}
                            label={statusMeta.label}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isEditMode ? (
                          <div className="flex items-center justify-center gap-1 -my-1.5">
                            <button
                              type="button"
                              onClick={() => setViewProject(p)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/20"
                              title="Lihat rincian proyek"
                              aria-label="Lihat rincian proyek"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-sky-500/20"
                              title="Edit proyek"
                              aria-label="Edit proyek"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetIds([p.id])}
                              className="p-1.5 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                              title="Hapus proyek"
                              aria-label="Hapus proyek"
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center items-center -my-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Dokumen & Termin"
                              className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Link to={`/admin/proyek/${p.id}`}>
                                <FolderOpenIcon className="size-4" />
                                <span className="sr-only">Dokumen &amp; Termin</span>
                              </Link>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Kelola Proyek & Anggota Tim" : "Tambah Proyek Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prj-name" required>Nama Proyek</FieldLabel>
                <Input
                  id="prj-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pengembangan ERP Logistik Nusantara"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>Kategori Proyek</FieldLabel>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as ProjectCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="client">Proyek Klien</SelectItem>
                        <SelectItem value="internal">
                          Proyek Internal Altvira
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-disabled={category !== "client"}>
                  <FieldLabel>Pelanggan / Klien</FieldLabel>
                  <Select
                    value={customerId}
                    disabled={category !== "client"}
                    onValueChange={setCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelanggan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">— Belum Dipilih —</SelectItem>
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
                    Nilai Kontrak (Rp Bulat)
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
                  <FieldLabel htmlFor="prj-terms" required>Jumlah Termin</FieldLabel>
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
                    Metode otomatis: {REVENUE_METHOD_LABELS[previewMethod]}
                  </FieldDescription>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="prj-start">Tanggal Mulai</FieldLabel>
                  <DatePicker
                    id="prj-start"
                    value={startDate}
                    onChange={setStartDate}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prj-end">Target Selesai</FieldLabel>
                  <DatePicker
                    id="prj-end"
                    value={targetEndDate}
                    onChange={setTargetEndDate}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel required>Status Proyek</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="draft">Draf</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="on_hold">Ditunda</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                      <SelectItem value="cancelled">Dibatalkan</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <FieldSet className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-4 space-y-3">
                <div>
                  <FieldLegend className="text-xs font-semibold text-foreground">
                    Penugasan Anggota Tim (Portal User)
                  </FieldLegend>
                  <FieldDescription className="text-[11px]">
                    Hanya User yang diaktifkan di bawah yang dapat melihat proyek dan anggarannya di Portal User.
                  </FieldDescription>
                </div>
                {teamUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada pengguna dengan peran User.
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
                <FieldLabel htmlFor="prj-desc">Catatan Proyek</FieldLabel>
                <Textarea
                  id="prj-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Proyek
                </Button>
              </DialogFooter>
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
              {viewProject ? `Rincian ${viewProject.code}` : "Rincian Proyek"}
            </DialogTitle>
          </DialogHeader>
          {viewProject ? (
            <div className="space-y-4">
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/15">
                {[
                  { label: "Kode Proyek", value: viewProject.code },
                  { label: "Nama Proyek", value: viewProject.name },
                  {
                    label: "Klien",
                    value:
                      customers.find((c) => c.id === viewProject.customer_id)?.name ??
                      "Proyek Internal",
                  },
                  {
                    label: "Periode",
                    value: `${formatDateID(viewProject.start_date)} - ${formatDateID(viewProject.target_end_date)}`,
                  },
                  {
                    label: "Nilai Kontrak",
                    value: formatRupiah(viewProject.contract_value),
                  },
                  { label: "Jumlah Termin", value: `${viewProject.term_count} Termin` },
                  {
                    label: "Metode Pengakuan",
                    value: REVENUE_METHOD_LABELS[viewProject.revenue_method],
                  },
                  {
                    label: "Catatan",
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
                    Buka Dokumen &amp; Termin
                  </Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewProject(null)}
                  className="cursor-pointer"
                >
                  Tutup
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

