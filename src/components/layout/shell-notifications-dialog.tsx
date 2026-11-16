import * as React from "react";
import {
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  ChevronRightIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  ScaleIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTimeID } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types/database.types";

/** Merapikan nominal mentah seperti Rp5000000 menjadi format ribuan Rp5.000.000 pada pesan notifikasi. */
export function formatNotificationMessage(message: string): string {
  return message.replace(/Rp\s?(\d{4,})(?![.,\d])/g, (_match, digits: string) => {
    const parsed = Number(digits);
    return Number.isFinite(parsed)
      ? `Rp${parsed.toLocaleString("id-ID")}`
      : `Rp${digits}`;
  });
}

export function getNotificationVisual(n: NotificationRow): {
  Icon: React.ComponentType<{ className?: string }>;
  boxClass: string;
} {
  const haystack = `${n.title} ${n.link_path ?? ""}`.toLowerCase();
  if (haystack.includes("po ") || haystack.includes("/po")) {
    return {
      Icon: ShoppingCartIcon,
      boxClass:
        "bg-primary/10 text-primary border-primary/20 dark:bg-sky-400/10 dark:text-sky-400 dark:border-sky-400/20",
    };
  }
  if (
    haystack.includes("persetujuan") ||
    haystack.includes("pembayaran") ||
    haystack.includes("dana")
  ) {
    return {
      Icon: HandCoinsIcon,
      boxClass:
        "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    };
  }
  if (haystack.includes("proyek") || haystack.includes("termin")) {
    return {
      Icon: FolderKanbanIcon,
      boxClass:
        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    };
  }
  if (haystack.includes("jurnal") || haystack.includes("akuntansi")) {
    return {
      Icon: ScaleIcon,
      boxClass:
        "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
    };
  }
  return {
    Icon: BellIcon,
    boxClass:
      "bg-primary/10 text-primary border-primary/20 dark:bg-sky-400/10 dark:text-sky-400 dark:border-sky-400/20",
  };
}

export interface ShellNotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationRow[];
  unreadCount: number;
  onMarkAllRead: () => Promise<void> | void;
  onNavigate: (path: string) => void;
}

export function ShellNotificationsDialog({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAllRead,
  onNavigate,
}: ShellNotificationsDialogProps) {
  const [notifFilter, setNotifFilter] = React.useState<"all" | "unread">("all");

  const visibleNotifications =
    notifFilter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) setNotifFilter("all");
      }}
    >
      <DialogContent aria-describedby={undefined} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notifikasi dalam Aplikasi</DialogTitle>
        </DialogHeader>

        {/* Bar Filter & Aksi Cepat */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setNotifFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                notifFilter === "all"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Semua</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {notifications.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setNotifFilter("unread")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                notifFilter === "unread"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Belum Dibaca</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  unreadCount > 0
                    ? "bg-primary/15 text-primary dark:bg-sky-400/15 dark:text-sky-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {unreadCount}
              </span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => void onMarkAllRead()}
            className={cn(
              "h-8 rounded-xl px-3 text-xs font-medium gap-1.5 shrink-0 transition-colors",
              unreadCount > 0 &&
                "border-primary/30 bg-primary/[0.06] text-primary hover:bg-primary/10 dark:border-sky-400/30 dark:bg-sky-400/[0.08] dark:text-sky-400 dark:hover:bg-sky-400/15",
            )}
          >
            <CheckCheckIcon className="size-3.5" />
            <span>Tandai Semua Sudah Dibaca</span>
          </Button>
        </div>

        {/* Feed Daftar Notifikasi Terpadu */}
        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/75 bg-muted/15 py-12 px-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground shadow-2xs">
              {notifFilter === "unread" && notifications.length > 0 ? (
                <CheckIcon className="size-5 text-emerald-500" />
              ) : (
                <BellIcon className="size-5" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {notifFilter === "unread" && notifications.length > 0
                  ? "Semua Notifikasi Telah Dibaca"
                  : "Belum Ada Notifikasi Baru"}
              </p>
              <p className="text-xs text-muted-foreground">
                {notifFilter === "unread" && notifications.length > 0
                  ? "Anda sudah meninjau seluruh pemberitahuan yang masuk."
                  : "Pemberitahuan pengajuan, verifikasi, dan aktivitas akun akan muncul di sini."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-2xs">
            <div className="max-h-[24rem] divide-y divide-border/60 overflow-y-auto">
              {visibleNotifications.map((n) => {
                const { Icon, boxClass } = getNotificationVisual(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      if (n.link_path) onNavigate(n.link_path);
                    }}
                    className={cn(
                      "group flex w-full items-start gap-3.5 px-4 py-3.5 sm:px-5 text-left transition-colors cursor-pointer",
                      !n.is_read
                        ? "bg-primary/[0.04] hover:bg-primary/[0.08] dark:bg-sky-400/[0.05] dark:hover:bg-sky-400/[0.09]"
                        : "hover:bg-muted/50 dark:hover:bg-white/[0.03]",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border",
                        boxClass,
                      )}
                    >
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "text-xs sm:text-sm leading-tight text-foreground",
                              !n.is_read ? "font-semibold" : "font-medium",
                            )}
                          >
                            {n.title}
                          </span>
                          {!n.is_read ? (
                            <StatusBadge tone="info" label="Baru" />
                          ) : null}
                        </div>
                        <span className="shrink-0 pt-px text-[11px] leading-tight font-medium text-muted-foreground/80 tabular-nums whitespace-nowrap">
                          {formatDateTimeID(n.created_at)}
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {formatNotificationMessage(n.message)}
                        </p>
                        {n.link_path ? (
                          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/45 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary dark:group-hover:text-sky-400" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
