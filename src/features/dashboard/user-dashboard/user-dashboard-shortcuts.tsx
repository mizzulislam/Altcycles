import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  HandCoinsIcon,
  PiggyBankIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ProjectRow, PurchaseOrderRow } from "@/types/database.types";

export interface UserDashboardShortcutsProps {
  pos: PurchaseOrderRow[];
  projects: ProjectRow[];
  pendingPa: number;
  rejectedPa: number;
}

export function UserDashboardShortcuts({
  pos,
  projects,
  pendingPa,
  rejectedPa,
}: UserDashboardShortcutsProps) {
  const { t } = useLanguage();

  const shortcuts = [
    {
      to: "/user/po",
      label: t("nav.vendor_po", "PO Pembelian Vendor"),
      desc: t("dashboard:user_dashboard.shortcut_po_desc", "Buat & pantau dokumen PO"),
      icon: ShoppingCartIcon,
      tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      badge: pos.length > 0 ? `${pos.length} PO` : null,
    },
    {
      to: "/user/pembayaran",
      label: t("nav.my_payments", "Pengajuan Pembayaran"),
      desc: t("dashboard:user_dashboard.shortcut_pay_desc", "Kirim klaim & lampiran bukti"),
      icon: HandCoinsIcon,
      tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      badge:
        rejectedPa > 0
          ? `${rejectedPa} ${t("dashboard:user_dashboard.needs_revision", "Perlu Revisi")}`
          : pendingPa > 0
            ? `${pendingPa} ${t("dashboard:user_dashboard.processing", "Proses")}`
            : null,
    },
    {
      to: "/user/anggaran",
      label: t("dashboard:user_dashboard.budget_vs_realization", "Anggaran vs Realisasi"),
      desc: t("dashboard:user_dashboard.shortcut_budget_desc", "Pantau sisa pagu proyek"),
      icon: PiggyBankIcon,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      badge:
        projects.length > 0
          ? `${projects.length} ${t("dashboard:user_dashboard.projects_count", "Proyek")}`
          : null,
    },
  ];

  return (
    <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 [&>*:nth-child(3)]:max-sm:col-span-2">
      {shortcuts.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-2xs transition-all duration-150 hover:border-primary/50 hover:bg-muted/30"
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-150 group-hover:scale-105",
                item.tone,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-semibold text-foreground block truncate">
                {item.label}
              </span>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground truncate">
                  {item.desc}
                </span>
                {item.badge ? (
                  <span className="shrink-0 rounded-full bg-primary/12 text-primary dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </div>
            <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        );
      })}
    </div>
  );
}
