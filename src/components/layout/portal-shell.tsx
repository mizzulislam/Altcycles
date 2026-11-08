import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BellIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  CheckCheckIcon,
  ClipboardListIcon,
  CoinsIcon,
  FileBarChart2Icon,
  FileSpreadsheetIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  ReceiptTextIcon,
  SettingsIcon,
  ShieldAlertIcon,
  ShoppingCartIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { ChangePasswordDialog } from "@/components/shared/change-password-dialog";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/auth-context";
import { formatDateTimeID, ROLE_LABELS } from "@/lib/formatters";
import {
  listMyNotifications,
  markAllNotificationsRead,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type { NotificationRow, UserRole } from "@/types/database.types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  super_admin: [
    { to: "/super-admin/dashboard", label: "Dashboard Sistem", icon: LayoutDashboardIcon },
    { to: "/super-admin/pengguna", label: "Pengguna & Peran", icon: UsersIcon },
    { to: "/super-admin/konfigurasi", label: "Konfigurasi & Dokumen", icon: SettingsIcon },
    { to: "/super-admin/master-tinjau", label: "Tinjau Master & COA", icon: BookOpenIcon },
    { to: "/super-admin/audit-trail", label: "Audit Trail", icon: ShieldAlertIcon },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard Keuangan", icon: LayoutDashboardIcon },
    { to: "/admin/persetujuan", label: "Persetujuan Pembayaran", icon: HandCoinsIcon },
    { to: "/admin/po-internal", label: "PO Pembelian Vendor", icon: ShoppingCartIcon },
    { to: "/admin/proyek", label: "Proyek Klien & Termin", icon: FolderKanbanIcon },
    { to: "/admin/penagihan", label: "Invoice, Piutang, & Kuitansi", icon: ReceiptTextIcon },
    { to: "/admin/anggaran", label: "Budgeting Proyek", icon: WalletIcon },
    { to: "/admin/akuntansi/jurnal", label: "Jurnal Umum & Koreksi", icon: FileSpreadsheetIcon },
    { to: "/admin/akuntansi/laporan", label: "Laporan Keuangan SAK", icon: FileBarChart2Icon },
    { to: "/admin/bagi-hasil", label: "Bagi Hasil Proyek", icon: CoinsIcon },
    { to: "/admin/akuntansi/periode", label: "Periode & Tutup Buku", icon: CalendarRangeIcon },
    { to: "/admin/akuntansi/akun", label: "Bagan Akun (COA SAK)", icon: BookOpenIcon },
    { to: "/admin/master", label: "Master Vendor & Klien", icon: ClipboardListIcon },
  ],
  user: [
    { to: "/user/dashboard", label: "Dashboard & Bagi Hasil", icon: LayoutDashboardIcon },
    { to: "/user/po", label: "PO Pembelian Saya", icon: ShoppingCartIcon },
    { to: "/user/pembayaran", label: "Pengajuan Pembayaran", icon: HandCoinsIcon },
    { to: "/user/anggaran", label: "Anggaran Proyek Saya", icon: WalletIcon },
  ],
};

export function PortalShell() {
  const { profile, signOut, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [changePwdOpen, setChangePwdOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);

  const loadNotifications = React.useCallback(async () => {
    try {
      const rows = await listMyNotifications();
      setNotifications(rows);
    } catch {
      // Abaikan jika sesi sedang beralih
    }
  }, []);

  React.useEffect(() => {
    if (profile) {
      void loadNotifications();
    }
  }, [profile, loadNotifications]);

  if (!profile) {
    return null;
  }

  const navItems = NAV_BY_ROLE[profile.role];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleOpenNotifications() {
    await loadNotifications();
    setNotifOpen(true);
  }

  async function handleMarkRead() {
    await markAllNotificationsRead();
    await loadNotifications();
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Header Seluler */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <AltviraLogoMark size={24} iconVariant="transparent" />
          <span className="font-bold">Altcycles</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle size="sm" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Notifikasi"
            onClick={() => void handleOpenNotifications()}
          >
            <BellIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Buka menu navigasi"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </header>

      {/* Sidebar Navigasi */}
      <aside
        className={cn(
          "w-full shrink-0 border-b bg-card md:flex md:w-64 md:flex-col md:border-b-0 md:border-r",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <div className="flex flex-col gap-1 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AltviraLogoMark size={32} iconVariant="transparent" />
              <div>
                <p className="text-sm font-bold leading-none">Altcycles</p>
                <p className="text-xs text-muted-foreground">ERP Keuangan Altvira</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="relative px-2"
              onClick={() => void handleOpenNotifications()}
              title="Notifikasi dalam Aplikasi"
            >
              <BellIcon className="size-4" />
              {unreadCount > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusBadge tone="info" label={ROLE_LABELS[profile.role]} />
            {isDemoMode ? (
              <StatusBadge tone="warning" label="Mode Lokal" />
            ) : null}
          </div>
        </div>

        <Separator />

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <Separator />

        <div className="flex flex-col gap-2.5 p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="truncate text-xs font-semibold">
                {profile.full_name}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {profile.email}
              </span>
            </div>
            <StatusBadge tone="info" label={ROLE_LABELS[profile.role]} />
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChangePwdOpen(true)}
              className="text-xs h-8 px-2 justify-center gap-1.5"
              title="Ganti Kata Sandi Akun"
            >
              <KeyRoundIcon className="size-3.5" />
              <span>Ganti Sandi</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs h-8 px-2 justify-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Keluar Sesi"
            >
              <LogOutIcon className="size-3.5" />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-1 bg-background p-4 md:p-8">
        {/* Tombol Mode Gelap & Terang di Ujung Kanan Atas Halaman Desktop */}
        <ThemeToggle variant="floating" className="hidden md:inline-flex" />

        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <Outlet />
        </div>
      </main>

      {/* Dialog Notifikasi dalam Aplikasi (UC-03) */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notifikasi dalam Aplikasi</DialogTitle>
            <DialogDescription>
              Pemberitahuan pengajuan pembayaran, keputusan persetujuan, dan PO
              klien baru.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => void handleMarkRead()}
            >
              <CheckCheckIcon data-icon="inline-start" />
              Tandai Semua Sudah Dibaca
            </Button>
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada notifikasi.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    if (n.link_path) navigate(n.link_path);
                  }}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    !n.is_read && "border-primary/40 bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{n.title}</span>
                    {!n.is_read ? (
                      <StatusBadge tone="info" label="Baru" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTimeID(n.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ganti Kata Sandi Akun Pengguna */}
      <ChangePasswordDialog
        open={changePwdOpen}
        onOpenChange={setChangePwdOpen}
      />
    </div>
  );
}
