import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { getLocalizedRevenueMethod } from "@/lib/glossary";
import type { CustomerRow, ProjectRow } from "@/types/database.types";

export interface ProjectViewDialogProps {
  project: ProjectRow | null;
  onClose: () => void;
  customers: CustomerRow[];
  language?: "id" | "en";
  t: (k: string, fb?: string) => string;
}

export function ProjectViewDialog({
  project,
  onClose,
  customers,
  language,
  t,
}: ProjectViewDialogProps) {
  return (
    <Dialog
      open={Boolean(project)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {project
              ? `${t("projects:modal.view_title_client", "Rincian Proyek")} — ${project.code}`
              : t("projects:modal.view_title_internal", "Rincian Proyek")}
          </DialogTitle>
        </DialogHeader>
        {project ? (
          <div className="space-y-4">
            <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/15">
              {[
                { label: t("projects:col_code", "Kode"), value: project.code },
                { label: t("projects:col_name", "Nama Proyek"), value: project.name },
                {
                  label: t("projects:modal.field_client", "Pelanggan"),
                  value:
                    customers.find((c) => c.id === project.customer_id)?.name ??
                    t("projects:modal.internal_project", "Internal"),
                },
                {
                  label: t("projects:col_period", "Periode"),
                  value: `${formatDateI18n(project.start_date, language)} - ${formatDateI18n(project.target_end_date, language)}`,
                },
                {
                  label: t("projects:col_contract_val", "Nilai Kontrak"),
                  value: formatRupiah(project.contract_value),
                },
                {
                  label: t("projects:col_milestones", "Termin"),
                  value: `${project.term_count} ${t("projects:milestones_count", "Termin")}`,
                },
                {
                  label: t("projects:modal.field_revenue_method", "Metode Pendapatan"),
                  value: getLocalizedRevenueMethod(project.revenue_method, (language ?? "id") as "id" | "en"),
                },
                {
                  label: t("projects:modal.field_notes", "Catatan"),
                  value: project.description ?? "-",
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
                <Link to={`/admin/proyek/${project.id}`}>
                  {t("projects:modal.btn_open_workspace", "Buka Ruang Kerja")}
                </Link>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="cursor-pointer"
              >
                {t("projects:modal.btn_close", "Tutup")}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
