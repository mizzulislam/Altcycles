import * as React from "react";
import { toast } from "sonner";
import { ModalFooterAction } from "@/components/patterns";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { inferRevenueMethodFromTerms } from "@/lib/formatters";
import { getLocalizedRevenueMethod } from "@/lib/glossary";
import { saveProject } from "@/lib/data-service";
import type {
  CustomerRow,
  ProfileRow,
  ProjectCategory,
  ProjectMemberRow,
  ProjectRow,
  ProjectStatus,
} from "@/types/database.types";

export interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: ProjectRow | null;
  members: ProjectMemberRow[];
  customers: CustomerRow[];
  teamUsers: ProfileRow[];
  language?: "id" | "en";
  onSuccess: () => Promise<void>;
  t: (k: string, fb?: string) => string;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  editingProject,
  members,
  customers,
  teamUsers,
  language,
  onSuccess,
  t,
}: ProjectFormDialogProps) {
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

  React.useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setCategory(editingProject.project_category);
      setCustomerId(editingProject.customer_id ?? "none");
      setStatus(editingProject.status);
      setStartDate(editingProject.start_date ?? "");
      setTargetEndDate(editingProject.target_end_date ?? "");
      setContractValue(editingProject.contract_value);
      setTermCount(editingProject.term_count);
      setDescription(editingProject.description ?? "");
      setSelectedUserIds(
        members
          .filter((m) => m.project_id === editingProject.id)
          .map((m) => m.user_id),
      );
    } else {
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
    }
  }, [editingProject, members, customers, open]);

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
        id: editingProject?.id,
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
        editingProject ? "Data proyek diperbarui." : "Proyek baru berhasil dibuat.",
      );
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan proyek.");
    } finally {
      setSaving(false);
    }
  }

  const previewMethod = inferRevenueMethodFromTerms(termCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingProject
              ? t("projects:modal.edit_title", "Perbarui Data Proyek")
              : t("projects:modal.create_title", "Tambah Proyek Baru")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="prj-name" required>
                {t("projects:modal.field_name", "Nama Proyek")}
              </FieldLabel>
              <Input
                id="prj-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("projects:modal.field_name_ph", "Contoh: Pembuatan Website E-Commerce")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel required>
                  {t("projects:modal.field_category", "Kategori Proyek")}
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
                        {t("projects:modal.cat_client", "Klien")}
                      </SelectItem>
                      <SelectItem value="internal">
                        {t("projects:modal.cat_internal", "Internal")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-disabled={category !== "client"}>
                <FieldLabel>{t("projects:modal.field_client", "Pelanggan")}</FieldLabel>
                <Select
                  value={customerId}
                  disabled={category !== "client"}
                  onValueChange={setCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("projects:modal.client_ph", "Pilih pelanggan")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">
                        {t("projects:modal.unassigned", "Belum Ditugaskan")}
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
                  {t("projects:modal.field_contract_value", "Nilai Kontrak")}
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
                  {t("projects:modal.field_milestones_count", "Jumlah Termin")}
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
                  {t("projects:modal.field_revenue_method", "Metode Pendapatan")}: {getLocalizedRevenueMethod(previewMethod, (language ?? "id") as "id" | "en")}
                </FieldDescription>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="prj-start">
                  {t("projects:modal.field_start_date", "Tanggal Mulai")}
                </FieldLabel>
                <DatePicker
                  id="prj-start"
                  value={startDate}
                  onChange={setStartDate}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prj-end">
                  {t("projects:modal.field_end_date", "Target Selesai")}
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
                {t("projects:modal.field_status", "Status Proyek")}
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
                    <SelectItem value="draft">{t("projects:status.draft", "Draf")}</SelectItem>
                    <SelectItem value="active">{t("projects:status.active", "Aktif")}</SelectItem>
                    <SelectItem value="on_hold">{t("projects:status.on_hold", "Ditunda")}</SelectItem>
                    <SelectItem value="completed">{t("projects:status.completed", "Selesai")}</SelectItem>
                    <SelectItem value="cancelled">{t("projects:status.cancelled", "Dibatalkan")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <FieldSet className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-4 space-y-3">
              <div>
                <FieldLegend className="text-xs font-semibold text-foreground">
                  {t("projects:modal.team_assignment_title", "Penugasan Anggota Tim")}
                </FieldLegend>
                <FieldDescription className="text-[11px]">
                  {t("projects:modal.team_assignment_desc", "Pilih anggota tim yang dapat mengakses dan mencatat beban pada proyek ini.")}
                </FieldDescription>
              </div>
              {teamUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("common:empty", "Tidak ada data")}
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
                {t("projects:modal.field_notes", "Catatan Tambahan")}
              </FieldLabel>
              <Textarea
                id="prj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("projects:modal.field_notes_ph", "Keterangan ruang lingkup proyek atau instruksi khusus...")}
              />
            </Field>

            <ModalFooterAction
              onCancel={() => onOpenChange(false)}
              saving={saving}
              cancelLabel={t("projects:modal.btn_cancel", "Batal")}
              submitLabel={t("projects:modal.btn_save", "Simpan Proyek")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
