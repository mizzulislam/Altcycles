import { Link } from "react-router-dom";
import { ActivityIcon, ArrowRightIcon } from "lucide-react";
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
import { formatDateTimeID } from "@/lib/formatters";
import type { AuditLogRow } from "@/types/database.types";

export interface SuperAdminDashboardAuditTableProps {
  recentLogs: AuditLogRow[];
  t: (key: string, fallback: string) => string;
}

export function SuperAdminDashboardAuditTable({
  recentLogs,
  t,
}: SuperAdminDashboardAuditTableProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("settings:super_admin.card_recent_audit", "Jejak Audit Terbaru")}
        description={t("settings:super_admin.card_recent_audit_desc", "Setiap perubahan konfigurasi, master data, dan status periode tercatat otomatis.")}
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_time", "Waktu")}</TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_actor_role", "Peran Pelaku")}</TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_action", "Aksi")}</TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_entity", "Entitas")}</TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:super_admin.col_record_id", "ID Rekaman")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentLogs.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                      <ActivityIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("settings:super_admin.empty_audit_title", "Belum Ada Jejak Audit")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {t("settings:super_admin.empty_audit_desc", "Rekaman perubahan konfigurasi dan transaksi akan tampil otomatis di sini.")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-6 pr-3 whitespace-nowrap tabular-nums text-muted-foreground align-middle">
                    {formatDateTimeID(log.created_at)}
                  </TableCell>
                  <TableCell className="px-3 text-center font-medium align-middle">
                    {log.actor_role ?? "sistem"}
                  </TableCell>
                  <TableCell className="px-3 text-center whitespace-nowrap align-middle">
                    <div className="inline-flex items-center min-h-5 -my-px">
                      <StatusBadge
                        tone={
                          log.action.toUpperCase() === "INSERT"
                            ? "success"
                            : log.action.toUpperCase() === "DELETE"
                              ? "destructive"
                              : "info"
                        }
                        label={log.action}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-mono font-medium text-xs align-middle">
                    {log.entity_name}
                  </TableCell>
                  <TableCell className="pl-2 pr-6 font-mono text-xs text-muted-foreground truncate max-w-44 align-middle">
                    {log.entity_id}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end px-6 py-3 border-t border-border/70 bg-muted/10">
          <Link
            to="/super-admin/audit-trail"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
          >
            <span>{t("settings:super_admin.btn_all_audits", "Semua Audit")}</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
