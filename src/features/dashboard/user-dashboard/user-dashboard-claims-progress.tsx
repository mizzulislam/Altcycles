import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import type { PaymentRequestRow } from "@/types/database.types";

export interface UserDashboardClaimsProgressProps {
  requests: PaymentRequestRow[];
  paidPa: number;
  approvedPa: number;
  pendingPa: number;
  rejectedPa: number;
}

export function UserDashboardClaimsProgress({
  requests,
  paidPa,
  approvedPa,
  pendingPa,
  rejectedPa,
}: UserDashboardClaimsProgressProps) {
  const { t } = useLanguage();

  if (requests.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/80 bg-card px-6 py-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">
          {t("dashboard:user_dashboard.claims_progress", {
            count: requests.length,
            defaultValue: `Progres Pengajuan Pembayaran Anda (${requests.length} total)`,
          })}
        </span>
        <Link
          to="/user/pembayaran"
          className="font-semibold text-primary dark:text-cyan-400 hover:underline"
        >
          {t("dashboard:user_dashboard.view_history", "Lihat Riwayat")}
        </Link>
      </div>
      <div className="flex h-2.5 w-full rounded-full bg-muted/50 overflow-hidden gap-0.5">
        {paidPa > 0 ? (
          <div
            style={{ width: `${(paidPa / requests.length) * 100}%` }}
            className="h-full bg-emerald-500"
            aria-label={`${t("dashboard:user_dashboard.status_paid", "Dibayar Lunas")}: ${paidPa}`}
          />
        ) : null}
        {approvedPa > 0 ? (
          <div
            style={{ width: `${(approvedPa / requests.length) * 100}%` }}
            className="h-full bg-amber-500"
            aria-label={`${t("dashboard:user_dashboard.status_approved", "Disetujui / Siap Cair")}: ${approvedPa}`}
          />
        ) : null}
        {pendingPa > 0 ? (
          <div
            style={{ width: `${(pendingPa / requests.length) * 100}%` }}
            className="h-full bg-sky-500"
            aria-label={`${t("dashboard:user_dashboard.status_submitted", "Menunggu Admin")}: ${pendingPa}`}
          />
        ) : null}
        {rejectedPa > 0 ? (
          <div
            style={{ width: `${(rejectedPa / requests.length) * 100}%` }}
            className="h-full bg-rose-500"
            aria-label={`${t("dashboard:user_dashboard.status_rejected", "Perlu Revisi")}: ${rejectedPa}`}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          {t("dashboard:user_dashboard.badge_paid", "Lunas:")} <strong className="text-foreground">{paidPa}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          {t("dashboard:user_dashboard.badge_approved", "Siap Cair:")} <strong className="text-foreground">{approvedPa}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" />
          {t("dashboard:user_dashboard.badge_submitted", "Menunggu:")} <strong className="text-foreground">{pendingPa}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          {t("dashboard:user_dashboard.badge_rejected", "Perlu Revisi:")} <strong className="text-foreground">{rejectedPa}</strong>
        </span>
      </div>
    </Card>
  );
}
