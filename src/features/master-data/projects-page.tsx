import * as React from "react";
import { Link } from "react-router-dom";
import { FolderOpenIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import {
  listCustomers,
  listProfiles,
  listProjects,
  saveProject,
} from "@/lib/data-service";
import {
  formatDateID,
  formatRupiah,
  inferRevenueMethodFromTerms,
  REVENUE_METHOD_LABELS,
} from "@/lib/formatters";
import type {
  CustomerRow,
  ProfileRow,
  ProjectCategory,
  ProjectMemberRow,
  ProjectRow,
  ProjectStatus,
} from "@/types/database.types";

export function ProjectsPage() {
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [members, setMembers] = React.useState<ProjectMemberRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [teamUsers, setTeamUsers] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Master Proyek &amp; Penugasan Tim
          </h1>
          <p className="text-sm text-muted-foreground">
            Metode pengakuan pendapatan disesuaikan dengan struktur termin proyek, dengan akses anggota tim yang aman dan terisolasi.
          </p>
        </div>
        <Button type="button" onClick={openNew}>
          <PlusIcon data-icon="inline-start" />
          Tambah Proyek
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Proyek Altvira</CardTitle>
          <CardDescription>
            Induk referensi PO pembelian, anggaran, termin penagihan, dan bagi
            hasil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar proyek...</span>
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="Belum ada proyek terdaftar"
              description="Klik tombol Tambah Proyek untuk mendaftarkan proyek pertama."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Proyek</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nilai Kontrak</TableHead>
                  <TableHead>Termin &amp; Metode</TableHead>
                  <TableHead>Anggota User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const countMembers = members.filter(
                    (m) => m.project_id === p.id,
                  ).length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {p.code}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDateID(p.start_date)} –{" "}
                        {formatDateID(p.target_end_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatRupiah(p.contract_value)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{p.term_count} Termin</div>
                        <div className="text-muted-foreground">
                          {REVENUE_METHOD_LABELS[p.revenue_method]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone="secondary"
                          label={`${countMembers} Anggota`}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={p.status === "active" ? "success" : "info"}
                          label={p.status}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/proyek/${p.id}`}>
                              <FolderOpenIcon data-icon="inline-start" />
                              Dokumen &amp; Termin
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(p)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            Kelola
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Kelola Proyek & Anggota Tim" : "Tambah Proyek Baru"}
            </DialogTitle>
            <DialogDescription>
              Nilai kontrak disimpan dalam nominal Rupiah bulat penuh.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prj-name">Nama Proyek</FieldLabel>
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
                  <FieldLabel>Kategori Proyek</FieldLabel>
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
                  <FieldLabel htmlFor="prj-val">
                    Nilai Kontrak (Rp Bulat)
                  </FieldLabel>
                  <Input
                    id="prj-val"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prj-terms">Jumlah Termin</FieldLabel>
                  <Input
                    id="prj-terms"
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={termCount}
                    onChange={(e) => setTermCount(Number(e.target.value))}
                  />
                  <FieldDescription>
                    Metode otomatis: {REVENUE_METHOD_LABELS[previewMethod]}
                  </FieldDescription>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="prj-start">Tanggal Mulai</FieldLabel>
                  <Input
                    id="prj-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prj-end">Target Selesai</FieldLabel>
                  <Input
                    id="prj-end"
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Status Proyek</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as ProjectStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <FieldSet>
                <FieldLegend>Penugasan Anggota Tim (Portal User)</FieldLegend>
                <FieldDescription>
                  Hanya User yang dicentang di bawah yang dapat melihat proyek
                  dan anggarannya di Portal User.
                </FieldDescription>
                {teamUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada pengguna dengan peran User.
                  </p>
                ) : (
                  teamUsers.map((u) => (
                    <Field key={u.id} orientation="horizontal">
                      <FieldLabel htmlFor={`mem-${u.id}`} className="font-normal">
                        {u.full_name} ({u.email})
                      </FieldLabel>
                      <Switch
                        id={`mem-${u.id}`}
                        checked={selectedUserIds.includes(u.id)}
                        onCheckedChange={(c) => toggleMember(u.id, c)}
                      />
                    </Field>
                  ))
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
    </div>
  );
}

