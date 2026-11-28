import { Link } from "react-router-dom";
import { ArrowRightIcon, FolderKanbanIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateI18n } from "@/lib/formatters";
import type { ProjectRow } from "@/types/database.types";
import { PROJECT_STATUS_LABELS } from "./user-dashboard-types";

export interface UserDashboardProjectsTableProps {
  projects: ProjectRow[];
}

export function UserDashboardProjectsTable({
  projects,
}: UserDashboardProjectsTableProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("dashboard:user_dashboard.my_active_projects", "Proyek Aktif Saya")}
        description={t("dashboard:user_dashboard.my_active_projects_desc", "Daftar proyek di mana Anda terdaftar aktif sebagai pelaksana tugas.")}
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                {t("projects:col_code", "Kode Proyek")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("projects:col_name", "Nama Proyek")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("dashboard:user_dashboard.execution_schedule", "Jadwal Pelaksanaan")}
              </TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">
                {t("common:table.status", "Status")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <FolderKanbanIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("dashboard:user_dashboard.no_projects_assigned", "Belum Ada Penugasan Proyek")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      {t("dashboard:user_dashboard.no_projects_assigned_desc", "Anda belum terdaftar dalam proyek aktif mana pun. Hubungi Admin atau manajer proyek untuk penugasan tim.")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) => {
                const pMeta = PROJECT_STATUS_LABELS[p.status] ?? {
                  label: p.status,
                  tone: "secondary" as const,
                };
                return (
                  <TableRow key={p.id}>
                    <TableCell className="align-top pl-6 pr-3 py-3.5 text-center font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                      {p.code}
                    </TableCell>
                    <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                      {p.name}
                    </TableCell>
                    <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap tabular-nums">
                      {formatDateI18n(p.start_date, language)} &ndash;{" "}
                      {formatDateI18n(p.target_end_date, language)}
                    </TableCell>
                    <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge tone={pMeta.tone} label={t(`projects:status.${p.status}`, pMeta.label)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end px-6 py-3 border-t border-border/70 bg-muted/10">
          <Link
            to="/user/anggaran"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
          >
            <span>{t("dashboard:user_dashboard.view_project_details", "Lihat Detail Proyek")}</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
