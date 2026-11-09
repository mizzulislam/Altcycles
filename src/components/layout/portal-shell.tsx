import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BellIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  CheckCheckIcon,
  ChevronDownIcon,
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
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ReceiptTextIcon,
  ScaleIcon,
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
import { useAuth } from "@/features/auth/auth-context";
import { formatDateTimeID, ROLE_LABELS } from "@/lib/formatters";
import {
  listMyNotifications,
  markAllNotificationsRead,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type { NotificationRow, UserRole } from "@/types/database.types";

export type NavItem = {
  type: "item";
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
};

export type NavGroup = {
  type: "group";
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hubPath?: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[];
};

export type NavEntry = NavItem | NavGroup;

const NAV_STRUCTURE_BY_ROLE: Record<UserRole, NavEntry[]> = {
  super_admin: [
    {
      type: "item",
      to: "/super-admin/dashboard",
      label: "Dashboard Sistem",
      icon: LayoutDashboardIcon,
    },
    {
      type: "group",
      id: "admin-sistem",
      label: "Administrasi Sistem",
      icon: SettingsIcon,
      items: [
        {
          to: "/super-admin/pengguna",
          label: "Pengguna & Peran",
          icon: UsersIcon,
        },
        {
          to: "/super-admin/konfigurasi",
          label: "Konfigurasi & Dokumen",
          icon: SettingsIcon,
        },
        {
          to: "/super-admin/master-tinjau",
          label: "Tinjau Master & COA",
          icon: BookOpenIcon,
        },
      ],
    },
    {
      type: "item",
      to: "/super-admin/audit-trail",
      label: "Audit Trail",
      icon: ShieldAlertIcon,
    },
  ],
  admin: [
    {
      type: "item",
      to: "/admin/dashboard",
      label: "Dashboard Keuangan",
      icon: LayoutDashboardIcon,
    },
    {
      type: "group",
      id: "operasional-pengeluaran",
      label: "Operasional & PO",
      icon: ShoppingCartIcon,
      items: [
        {
          to: "/admin/persetujuan",
          label: "Persetujuan Pembayaran",
          icon: HandCoinsIcon,
        },
        {
          to: "/admin/po-internal",
          label: "PO Pembelian Vendor",
          icon: ShoppingCartIcon,
        },
        {
          to: "/admin/anggaran",
          label: "Budgeting Proyek",
          icon: WalletIcon,
        },
      ],
    },
    {
      type: "group",
      id: "proyek-penagihan",
      label: "Proyek & Pendapatan",
      icon: FolderKanbanIcon,
      items: [
        {
          to: "/admin/proyek",
          label: "Proyek Klien & Termin",
          icon: FolderKanbanIcon,
        },
        {
          to: "/admin/penagihan",
          label: "Invoice & Penagihan",
          icon: ReceiptTextIcon,
        },
        {
          to: "/admin/bagi-hasil",
          label: "Bagi Hasil Proyek",
          icon: CoinsIcon,
        },
      ],
    },
    {
      type: "group",
      id: "akuntansi-sak",
      label: "Akuntansi SAK & Laporan",
      icon: FileSpreadsheetIcon,
      hubPath: "/admin/akuntansi",
      items: [
        {
          to: "/admin/akuntansi",
          label: "Pusat Pembukuan (Hub)",
          icon: ScaleIcon,
        },
        {
          to: "/admin/akuntansi/jurnal",
          label: "Jurnal Umum & Koreksi",
          icon: FileSpreadsheetIcon,
        },
        {
          to: "/admin/akuntansi/laporan",
          label: "Laporan Keuangan SAK",
          icon: FileBarChart2Icon,
        },
        {
          to: "/admin/akuntansi/periode",
          label: "Periode & Tutup Buku",
          icon: CalendarRangeIcon,
        },
        {
          to: "/admin/akuntansi/akun",
          label: "Bagan Akun (COA SAK)",
          icon: BookOpenIcon,
        },
      ],
    },
    {
      type: "item",
      to: "/admin/master",
      label: "Master Vendor & Klien",
      icon: ClipboardListIcon,
    },
  ],
  user: [
    {
      type: "item",
      to: "/user/dashboard",
      label: "Dashboard & Bagi Hasil",
      icon: LayoutDashboardIcon,
    },
    {
      type: "group",
      id: "aktivitas-proyek",
      label: "Aktivitas Proyek",
      icon: FolderKanbanIcon,
      items: [
        {
          to: "/user/po",
          label: "PO Pembelian Saya",
          icon: ShoppingCartIcon,
        },
        {
          to: "/user/pembayaran",
          label: "Pengajuan Pembayaran",
          icon: HandCoinsIcon,
        },
        {
          to: "/user/anggaran",
          label: "Anggaran Proyek Saya",
          icon: WalletIcon,
        },
      ],
    },
  ],
};

const SIDEBAR_STORAGE_KEY = "altcycles_sidebar_collapsed";

export function PortalShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State Sidebar Buka / Tutup (Lipat / Expand)
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [changePwdOpen, setChangePwdOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);

  // State Accordion Sub-Menu Terbuka/Tertutup
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    // Buka otomatis grup yang memuat rute saat ini
    const initial: Record<string, boolean> = {
      "akuntansi-sak": true,
      "operasional-pengeluaran": true,
      "proyek-penagihan": true,
      "admin-sistem": true,
      "aktivitas-proyek": true,
    };
    return initial;
  });

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Abaikan
      }
      return next;
    });
  }, []);

  const toggleGroup = React.useCallback((groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const loadNotifications = React.useCallback(async () => {
    try {
      const rows = await listMyNotifications();
      setNotifications(rows);
    } catch {
      // Abaikan jika sesi beralih
    }
  }, []);

  React.useEffect(() => {
    if (profile) {
      void loadNotifications();
    }
  }, [profile, loadNotifications]);

  // Otomatis buka grup jika rute aktif berada di dalamnya
  React.useEffect(() => {
    if (!profile) return;
    const structure = NAV_STRUCTURE_BY_ROLE[profile.role] || [];
    for (const entry of structure) {
      if (entry.type === "group") {
        const hasActiveChild = entry.items.some(
          (child) => location.pathname === child.to,
        );
        if (hasActiveChild) {
          setOpenGroups((prev) => (prev[entry.id] ? prev : { ...prev, [entry.id]: true }));
        }
      }
    }
  }, [location.pathname, profile]);

  if (!profile) {
    return null;
  }

  const navStructure = NAV_STRUCTURE_BY_ROLE[profile.role] || [];
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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased">
      {/* =========================================================================
          HEADER SELULER (Mobile Only)
          ========================================================================= */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <AltviraLogoMark size={26} iconVariant="transparent" />
          <span className="font-bold text-sm tracking-tight">Altcycles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle size="sm" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            aria-label="Notifikasi"
            onClick={() => void handleOpenNotifications()}
          >
            <BellIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            aria-label="Buka menu navigasi"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </header>

      {/* =========================================================================
          OVERLAY BACKDROP SELULER
          ========================================================================= */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          SIDEBAR DUA MODE: EXPANDED (w-64) & COLLAPSED (w-20)
          ========================================================================= */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r bg-card shadow-xs transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCollapsed ? "md:w-20" : "md:w-64",
          "w-72 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Top Header: Brand Logo & Tombol Buka/Tutup Sidebar */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b px-4 transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {isCollapsed ? (
            /* Mode Collapsed: Tombol Logo yang beranimasi expand saat diklik/hover */
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Perluas Sidebar"
              className="group relative flex size-10 items-center justify-center rounded-xl bg-card border border-border/80 hover:bg-accent text-primary dark:text-white dark:hover:bg-white/10 transition-all duration-200 cursor-pointer shadow-2xs"
            >
              <AltviraLogoMark
                size={22}
                iconVariant="transparent"
                className="transition-transform duration-200 group-hover:scale-75 group-hover:opacity-0"
              />
              <PanelLeftOpenIcon className="size-4.5 absolute opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-primary dark:text-white" />
            </button>
          ) : (
            /* Mode Expanded: Logo Brand Lengkap + Notifikasi + Tombol Lipat */
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <AltviraLogoMark size={28} iconVariant="transparent" className="shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-bold tracking-tight text-foreground">
                    Altcycles
                  </span>
                  <span className="truncate text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    ERP Keuangan
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative size-8 rounded-lg text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10"
                  onClick={() => void handleOpenNotifications()}
                  title="Notifikasi Masuk"
                >
                  <BellIcon className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  title="Lipat Sidebar"
                  className="hidden md:inline-flex size-8 rounded-lg text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10"
                >
                  <PanelLeftCloseIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex md:hidden size-8 rounded-lg"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* =====================================================================
            DAFTAR NAVIGASI (Dengan Submenu & Indikator Aktif Terstruktur)
            ===================================================================== */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navStructure.map((entry) => {
            if (entry.type === "item") {
              const Icon = entry.icon;
              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  title={isCollapsed ? entry.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex h-10 items-center rounded-xl text-xs font-medium transition-all duration-200",
                      isCollapsed
                        ? "justify-center size-10 mx-auto p-0"
                        : "justify-start gap-3 px-3",
                      isActive
                        ? isCollapsed
                          ? "bg-primary text-white font-semibold shadow-xs"
                          : "bg-primary/10 text-primary font-semibold dark:bg-primary/25 dark:text-white shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar di sisi kiri (hanya saat expanded) */}
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary transition-all duration-200" />
                      )}
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-transform duration-200",
                          isActive
                            ? isCollapsed
                              ? "text-white"
                              : "text-primary dark:text-white"
                            : "text-muted-foreground group-hover:text-foreground dark:text-slate-400 dark:group-hover:text-white",
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{entry.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            }

            // Grup Navigasi dengan Submenu Accordion
            const GroupIcon = entry.icon;
            const isGroupOpen = Boolean(openGroups[entry.id]);
            const isChildActive = entry.items.some(
              (item) => location.pathname === item.to,
            );

            if (isCollapsed) {
              /* Mode Collapsed: Tampilkan ikon grup dengan indikator dot jika anak menu aktif */
              return (
                <div key={entry.id} className="relative flex justify-center py-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (entry.hubPath) {
                        navigate(entry.hubPath);
                      } else {
                        toggleCollapsed();
                      }
                    }}
                    title={`${entry.label} (${entry.items.length} sub-menu)`}
                    className={cn(
                      "group relative flex size-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
                      isChildActive
                        ? "bg-primary/15 text-primary dark:bg-primary/25 dark:text-white font-bold shadow-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    {isChildActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                    )}
                    <GroupIcon className="size-4 shrink-0" />
                    {isChildActive && (
                      <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </div>
              );
            }

            /* Mode Expanded: Grup Lengkap dengan Accordion Header & Sub-item */
            return (
              <div key={entry.id} className="pt-2 pb-1">
                {/* Header Sub-Menu */}
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition-colors cursor-pointer",
                    isChildActive
                      ? "text-primary dark:text-white"
                      : "text-foreground/80 hover:bg-muted/40 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon className="size-4 shrink-0 opacity-80" />
                    <span className="truncate">{entry.label}</span>
                  </div>
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-white transition-transform duration-200",
                      isGroupOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>

                {/* Daftar Anak Menu (Submenu List dengan garis pandu vertikal) */}
                {isGroupOpen && (
                  <div className="mt-1 ml-4 pl-2.5 border-l border-border/60 space-y-1">
                    {entry.items.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "group relative flex h-8.5 items-center rounded-lg px-2.5 text-xs font-medium transition-all duration-150",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold dark:bg-primary/25 dark:text-white shadow-2xs"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute -left-[11px] top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary ring-2 ring-card" />
                              )}
                              <SubIcon
                                className={cn(
                                  "size-3.5 mr-2 shrink-0 transition-colors",
                                  isActive
                                    ? "text-primary dark:text-white"
                                    : "text-muted-foreground group-hover:text-foreground dark:text-slate-400 dark:group-hover:text-white",
                                )}
                              />
                              <span className="truncate">{subItem.label}</span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* =========================================================================
            PROFIL PENGGUNA DI BAGIAN BAWAH
            ========================================================================= */}
        <div className="shrink-0 border-t bg-muted/20 p-3">
          {isCollapsed ? (
            /* Mode Collapsed: Avatar Ringkas & Tombol Keluar */
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setChangePwdOpen(true)}
                title={`${profile.full_name} (${ROLE_LABELS[profile.role]})\nProfil Pengguna`}
                className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 text-foreground font-bold text-xs shadow-2xs hover:bg-accent transition-all cursor-pointer"
              >
                {profile.full_name
                  ? profile.full_name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "U"}
              </button>
              <button
                type="button"
                onClick={() => setChangePwdOpen(true)}
                title="Ganti Kata Sandi Akun"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <KeyRoundIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar Sesi"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:text-slate-300 dark:hover:text-destructive transition-colors cursor-pointer"
              >
                <LogOutIcon className="size-4" />
              </button>
            </div>
          ) : (
            /* Mode Expanded: Profil Lengkap & Tombol Aksi */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate text-xs font-semibold text-foreground dark:text-white">
                    {profile.full_name}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground dark:text-slate-400">
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
                  className="text-xs h-8 px-2 justify-center gap-1.5 rounded-lg border-border/80 text-foreground dark:text-white dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-white"
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
                  className="text-xs h-8 px-2 justify-center gap-1.5 rounded-lg border-border/80 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-white/10"
                  title="Keluar Sesi"
                >
                  <LogOutIcon className="size-3.5" />
                  <span>Keluar</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          AREA KONTEN UTAMA (Margin menyesuaikan lebar sidebar dengan transisi mulus)
          ========================================================================= */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-x-hidden",
          isCollapsed ? "md:ml-20" : "md:ml-64",
        )}
      >
        <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
          {/* Tombol Pengalih Mode Terang/Gelap di Ujung Kanan Atas Desktop */}
          <ThemeToggle variant="floating" className="hidden md:inline-flex" />

          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* =========================================================================
          DIALOG NOTIFIKASI DALAM APLIKASI
          ========================================================================= */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Notifikasi dalam Aplikasi</DialogTitle>
            <DialogDescription>
              Pemberitahuan pengajuan pembayaran, persetujuan termin, dan perubahan data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => void handleMarkRead()}
              className="text-xs rounded-xl"
            >
              <CheckCheckIcon data-icon="inline-start" className="size-3.5 mr-1" />
              Tandai Semua Sudah Dibaca
            </Button>
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Belum ada notifikasi baru.
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
                    "flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors hover:bg-accent/60",
                    !n.is_read && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{n.title}</span>
                    {!n.is_read ? (
                      <StatusBadge tone="info" label="Baru" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTimeID(n.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ganti Kata Sandi */}
      <ChangePasswordDialog
        open={changePwdOpen}
        onOpenChange={setChangePwdOpen}
      />
    </div>
  );
}
