import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProjectRow,
} from "@/types/database.types";

export interface UserDashboardSharingTableProps {
  sharingLines: ProfitSharingLineRow[];
  sharingResults: ProfitSharingResultRow[];
  projects: ProjectRow[];
}

export function UserDashboardSharingTable({
  sharingLines,
  sharingResults,
  projects,
}: UserDashboardSharingTableProps) {
  const { t } = useLanguage();

  if (sharingLines.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeaderWithInfo
        title={t("dashboard:user_dashboard.my_sharing_detail", "Rincian Hak Bagi Hasil Saya")}
        description={t("dashboard:user_dashboard.my_sharing_detail_desc", "Daftar alokasi pembagian hasil dari proyek yang telah selesai dan disetujui.")}
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                {t("projects:title", "Proyek")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                {t("dashboard:user_dashboard.portion_pct", "Porsi (%)")}
              </TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">
                {t("dashboard:user_dashboard.sharing_amount", "Nominal Hak Bagi Hasil")}
              </TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">
                {t("dashboard:user_dashboard.calc_status", "Status Perhitungan")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sharingLines.map((line) => {
              const res = sharingResults.find((r) => r.id === line.result_id);
              const prj = projects.find((p) => p.id === res?.project_id);
              return (
                <TableRow key={line.id}>
                  <TableCell className="align-top pl-6 pr-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                    {prj ? `${prj.code}: ${prj.name}` : t("projects:title", "Proyek")}
                  </TableCell>
                  <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                    {line.percentage}%
                  </TableCell>
                  <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                    <MonetaryCell amount={line.share_amount} />
                  </TableCell>
                  <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center min-h-5 -my-px">
                      <StatusBadge
                        tone={res?.status === "finalized" ? "success" : "warning"}
                        label={
                          res?.status === "finalized"
                            ? t("profit_sharing:badge_finalized", "Difinalisasi & Terkunci")
                            : t("profit_sharing:badge_draft", "Simulasi Draf")
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
