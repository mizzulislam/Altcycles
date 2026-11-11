import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import {
  ArrowRightLeftIcon,
  BellIcon,
  BookOpenIcon,
  Building2Icon,
  CheckCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardListIcon,
  CoinsIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  ImageIcon,
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
  UserCircleIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
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

interface HeaderBreadcrumbItem {
  label: string;
  to?: string;
}

function getHeaderBreadcrumbs(pathname: string): HeaderBreadcrumbItem[] {
  if (pathname === "/profil") {
    return [{ label: "Beranda", to: "/" }, { label: "Profil Saya" }];
  }
  if (pathname === "/pengaturan/profil") {
    return [
      { label: "Beranda", to: "/" },
      { label: "Profil", to: "/profil" },
      { label: "Pengaturan Profil" },
    ];
  }
  if (pathname.startsWith("/admin/proyek/") && pathname !== "/admin/proyek") {
    return [
      { label: "Beranda", to: "/" },
      { label: "Master Proyek", to: "/admin/proyek" },
      { label: "Dokumen & Termin" },
    ];
  }

  const staticTitles: Record<string, string> = {
    "/admin/dashboard": "Dashboard Keuangan",
    "/admin/persetujuan": "Persetujuan Pembayaran",
    "/admin/po-internal": "PO Pembelian Vendor",
    "/admin/anggaran": "Budgeting Proyek",
    "/admin/proyek": "Master Proyek",
    "/admin/penagihan": "Invoice & Penagihan",
    "/admin/bagi-hasil": "Bagi Hasil Proyek",
    "/admin/akuntansi": "Akuntansi & Laporan",
    "/admin/master": "Master Vendor & Klien",
    "/user/dashboard": "Ringkasan Proyek & Hak",
    "/user/po": "PO Pembelian Vendor",
    "/user/pembayaran": "Pengajuan Pembayaran",
    "/user/anggaran": "Budgeting Proyek",
    "/super-admin/dashboard": "Dashboard Sistem",
    "/super-admin/profil-perusahaan": "Profil Perusahaan (Altvira)",
    "/super-admin/administrasi": "Administrasi & Penomoran",
    "/super-admin/pengguna": "Manajemen Pengguna",
    "/super-admin/konfigurasi": "Konfigurasi Sistem",
    "/super-admin/master-tinjau": "Tinjauan Data Master",
    "/super-admin/audit-trail": "Jejak Audit",
    "/super-admin/media-login": "Media & Banner Login",
  };

  const title = staticTitles[pathname];
  if (title) {
    return [{ label: "Beranda", to: "/" }, { label: title }];
  }
  return [{ label: "Beranda", to: "/" }];
}

const NAV_STRUCTURE_BY_ROLE: Record<UserRole, NavEntry[]> = {
  super_admin: [
    {
      type: "item",
      to: "/super-admin/dashboard",
      label: "Dashboard Sistem",
      icon: LayoutDashboardIcon,
    },
    {
      type: "item",
      to: "/super-admin/profil-perusahaan",
      label: "Profil Perusahaan (Altvira)",
      icon: Building2Icon,
    },
    {
      type: "item",
      to: "/super-admin/administrasi",
      label: "Administrasi & Penomoran",
      icon: SettingsIcon,
    },
    {
      type: "item",
      to: "/super-admin/pengguna",
      label: "Pengguna & Peran",
      icon: UsersIcon,
    },
    {
      type: "item",
      to: "/super-admin/master-tinjau",
      label: "Pengaturan & Kontrol Akuntansi",
      icon: BookOpenIcon,
    },
    {
      type: "item",
      to: "/super-admin/audit-trail",
      label: "Audit Trail",
      icon: ShieldAlertIcon,
    },
    {
      type: "item",
      to: "/super-admin/media-login",
      label: "Media & Banner Login",
      icon: ImageIcon,
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
      type: "item",
      to: "/admin/akuntansi",
      label: "Akuntansi & Laporan",
      icon: ScaleIcon,
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
      type: "item",
      to: "/user/po",
      label: "PO Pembelian Saya",
      icon: ShoppingCartIcon,
    },
    {
      type: "item",
      to: "/user/pembayaran",
      label: "Pengajuan Pembayaran",
      icon: HandCoinsIcon,
    },
    {
      type: "item",
      to: "/user/anggaran",
      label: "Anggaran Proyek Saya",
      icon: WalletIcon,
    },
  ],
};

const SIDEBAR_STORAGE_KEY = "altcycles_sidebar_collapsed";

const SidebarStateContext = React.createContext<boolean>(false);

/** Mengembalikan true apabila sidebar desktop sedang dalam kondisi tertutup/collapsed. */
export function useSidebarCollapsed(): boolean {
  return React.useContext(SidebarStateContext);
}

function getRoleShortName(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Bendahara";
    case "user":
      return "Anggota Tim";
  }
}

export function PortalShell() {
  const { profile, activeRole, availableRoles, switchRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State Sidebar Buka / Tutup
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);

  // State Dropdown Mode Aktif (Role Switcher)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = React.useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = React.useState(false);
  const roleDropdownRef = React.useRef<HTMLDivElement>(null);

  // State Popover Menu User di Sidebar Bawah & Ref Sidebar
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const sidebarRef = React.useRef<HTMLElement>(null);

  // State Accordion Sub-Menu Terbuka/Tertutup
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    return {
      "akuntansi-sak": true,
      "operasional-pengeluaran": true,
      "proyek-penagihan": true,
    };
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

  // Handle Klik di Luar & Escape untuk Popover User Menu dan Dropdown Mode Aktif
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(target)) {
        setIsRoleDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsRoleDropdownOpen(false);
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Otomatis tutup sidebar desktop saat kursor diklik di area mana pun selain area sidebar
  React.useEffect(() => {
    if (isCollapsed) return;

    function handleClickOutsideSidebar(event: MouseEvent) {
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setIsCollapsed(true);
        try {
          localStorage.setItem(SIDEBAR_STORAGE_KEY, "true");
        } catch {
          // Abaikan
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutsideSidebar);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSidebar);
    };
  }, [isCollapsed]);

  // Otomatis buka grup jika rute aktif berada di dalamnya
  React.useEffect(() => {
    if (!profile) return;
    const currentRole = activeRole || profile.role;
    const structure = NAV_STRUCTURE_BY_ROLE[currentRole] || [];
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
  }, [location.pathname, profile, activeRole]);

  if (!profile) {
    return null;
  }

  const currentRole = activeRole || profile.role;
  const navStructure = NAV_STRUCTURE_BY_ROLE[currentRole] || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  async function handleLogout() {
    setIsUserMenuOpen(false);
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

  // Handle Pergantian Peran (Mengikuti Pola Splitz)
  async function handleRoleSwitch(targetRole: UserRole) {
    if (targetRole === currentRole) {
      setIsRoleDropdownOpen(false);
      return;
    }
    setIsRoleDropdownOpen(false);
    setIsSwitchingRole(true);
    try {
      await switchRole(targetRole);
      navigate(portalHomeForRole(targetRole), { replace: true });
    } catch (err) {
      console.error("Gagal beralih peran:", err);
    } finally {
      setTimeout(() => setIsSwitchingRole(false), 500);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased">
      {/* =========================================================================
          FULLSCREEN OVERLAY LOADER SAAT GANTI PERAN (Persis Splitz)
          ========================================================================= */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-300",
          isSwitchingRole ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="size-12 rounded-full border-4 border-muted border-t-primary animate-spin mb-4" />
        <p className="text-foreground font-semibold text-sm tracking-tight animate-pulse">
          Mengganti Mode Operasi...
        </p>
      </div>

      {/* =========================================================================
          HEADER MOBILE (Hanya tampil di layar kecil)
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
            className="size-9 rounded-xl relative"
            aria-label="Notifikasi"
            onClick={() => void handleOpenNotifications()}
          >
            <BellIcon className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full" />
            )}
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
          OVERLAY BACKDROP MOBILE
          ========================================================================= */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          SIDEBAR DUA MODE (EXPANDED w-64 & COLLAPSED w-16 / 64px)
          Warna: Biru Resmi Altvira #0B43C8 Konsisten di Light & Dark Mode
          ========================================================================= */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-[#0836A3]/40 bg-[#0B43C8] text-white shadow-md transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCollapsed ? "md:w-16" : "md:w-64",
          "w-72 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Top Header Sidebar: Logo Hover Toggle Persis Splitz */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-white/15 px-3 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isCollapsed ? "justify-center" : "justify-start gap-3",
          )}
        >
          <ActionTooltip
            content={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            side={isCollapsed ? "right" : "bottom"}
          >
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
              className={cn(
                "group relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl",
                "bg-white/20 text-white ring-1 ring-white/40 shadow-lg focus:outline-none focus:ring-white/60",
                "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/30 cursor-pointer",
                isCollapsed && "scale-95 rounded-lg",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />

              {/* Logo Altvira saat normal */}
              <div
                className={cn(
                  "absolute z-10 flex items-center justify-center transition-all duration-300",
                  "opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-50",
                )}
              >
                <AltviraLogoMark
                  size={24}
                  iconVariant="transparent"
                  variant="white"
                  className="shrink-0 pointer-events-none"
                />
              </div>

              {/* Icon Toggle saat hover */}
              {isCollapsed ? (
                <PanelLeftOpenIcon
                  className={cn(
                    "absolute z-10 size-5 transition-all duration-300 text-white",
                    "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-110",
                  )}
                />
              ) : (
                <PanelLeftCloseIcon
                  className={cn(
                    "absolute z-10 size-5 transition-all duration-300 text-white",
                    "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-110",
                  )}
                />
              )}
            </button>
          </ActionTooltip>

          {/* Nama Aplikasi & Subtitle */}
          <div
            className={cn(
              "grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] select-none",
              isCollapsed
                ? "w-0 translate-x-2 opacity-0 pointer-events-none"
                : "w-[170px] translate-x-0 opacity-100",
            )}
          >
            <span className="truncate text-base font-bold tracking-tight text-white leading-tight">
              Altcycles
            </span>
            <span className="truncate text-[10px] uppercase tracking-wider font-semibold text-white/70 leading-tight mt-0.5">
              ERP Keuangan
            </span>
          </div>

          {/* Tombol Tutup Mobile (Hanya tampil di layar kecil) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="ml-auto inline-flex md:hidden size-8 rounded-lg text-white/80 hover:text-white hover:bg-white/15"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {/* =====================================================================
            DAFTAR NAVIGASI (Dinamis Sesuai Peran Aktif)
            Rata Tengah Sempurna 1 Garis Vertikal saat Collapsed
            ===================================================================== */}
        <MotionConfig reducedMotion="user">
        <nav
          className={cn(
            "flex-1 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            isCollapsed ? "p-0 py-3 w-16 flex flex-col items-center" : "p-3 w-full",
          )}
        >
          {navStructure.map((entry) => {
            if (entry.type === "item") {
              const Icon = entry.icon;

              if (isCollapsed) {
                return (
                  <div key={entry.to} className="w-16 flex items-center justify-center py-0.5">
                    <ActionTooltip content={entry.label} side="right">
                      <NavLink
                        to={entry.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex size-10 items-center justify-center rounded-xl text-xs font-medium transition-all duration-200",
                            isActive
                              ? "bg-white/25 text-white font-bold shadow-xs"
                              : "text-white/80 hover:bg-white/15 hover:text-white",
                          )
                        }
                      >
                        <Icon className="size-4.5 shrink-0 text-white" />
                      </NavLink>
                    </ActionTooltip>
                  </div>
                );
              }

              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex h-10 items-center rounded-xl text-xs font-medium transition-all duration-200 justify-start gap-3 px-3",
                      isActive
                        ? "bg-white/25 text-white font-bold shadow-xs"
                        : "text-white/80 hover:bg-white/15 hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-r-full bg-white transition-all duration-200" />
                      )}
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-transform duration-200",
                          isActive ? "text-white" : "text-white/80 group-hover:text-white",
                        )}
                      />
                      <span className="truncate">{entry.label}</span>
                    </>
                  )}
                </NavLink>
              );
            }

            // Grup Navigasi dengan Submenu
            const GroupIcon = entry.icon;
            const isGroupOpen = Boolean(openGroups[entry.id]);
            const isChildActive = entry.items.some(
              (item) => location.pathname === item.to,
            );

            if (isCollapsed) {
              return (
                <div key={entry.id} className="w-16 flex items-center justify-center py-0.5">
                  <ActionTooltip
                    content={`${entry.label} (${entry.items.length} menu)`}
                    side="right"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (entry.hubPath) {
                          navigate(entry.hubPath);
                        } else {
                          toggleCollapsed();
                        }
                      }}
                      className={cn(
                        "group relative flex size-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
                        isChildActive
                          ? "bg-white/25 text-white font-bold shadow-xs"
                          : "text-white/80 hover:bg-white/15 hover:text-white",
                      )}
                    >
                      {isChildActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white" />
                      )}
                      <GroupIcon className="size-4.5 shrink-0" />
                      {isChildActive && (
                        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  </ActionTooltip>
                </div>
              );
            }

            // Mode Expanded
            return (
              <div key={entry.id} className="pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition-colors cursor-pointer",
                    isChildActive
                      ? "text-white bg-white/15 font-bold"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon className="size-4 shrink-0 opacity-90" />
                    <span className="truncate">{entry.label}</span>
                  </div>
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 shrink-0 text-white/70 transition-transform duration-200",
                      isGroupOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>

                {isGroupOpen && (
                  <div className="relative mt-1 ml-4 pl-3.5 space-y-1">
                    {/* Track garis vertikal sejajar persis dengan indikator bulat aktif */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[11px] flex justify-center"
                    >
                      <span className="w-px h-full bg-white/25" />
                    </span>
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
                                ? "bg-white/25 text-white font-semibold shadow-2xs"
                                : "text-white/75 hover:bg-white/15 hover:text-white",
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.span
                                  layoutId={`sidebar-submenu-dot-${entry.id}`}
                                  transition={{
                                    type: "spring",
                                    stiffness: 420,
                                    damping: 32,
                                    mass: 0.75,
                                  }}
                                  className="pointer-events-none absolute -left-3.5 inset-y-0 w-[11px] flex items-center justify-center z-10"
                                >
                                  <span className="size-[7px] rounded-full bg-white ring-2 ring-[#0B43C8] shadow-xs" />
                                </motion.span>
                              )}
                              <SubIcon
                                className={cn(
                                  "size-3.5 mr-2 shrink-0 transition-colors",
                                  isActive
                                    ? "text-white"
                                    : "text-white/75 group-hover:text-white",
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
        </MotionConfig>

        {/* =========================================================================
            MENU USER DI UJUNG BAWAH SIDEBAR (Poin 4 - Mengikuti Splitz)
            Rata Tengah Sempurna 1 Garis Vertikal saat Collapsed (Tidak Bergeser)
            ========================================================================= */}
        <div
          className={cn(
            "relative shrink-0 border-t border-white/15 bg-black/15 transition-all duration-300 p-3",
            isCollapsed ? "w-16 flex items-center justify-center" : "w-full",
          )}
          ref={userMenuRef}
        >
          {/* Popover Menu saat Kartu User Diklik */}
          {isUserMenuOpen && (
            <div
              className={cn(
                "absolute z-50 bg-card border border-border/90 rounded-2xl shadow-xl py-1.5 min-w-[210px] overflow-hidden text-foreground",
                "animate-in fade-in zoom-in-95 duration-150",
                isCollapsed
                  ? "left-full bottom-2 ml-2"
                  : "bottom-full left-2 right-2 mb-2 w-auto",
              )}
            >
              {isCollapsed && (
                <div className="px-4 py-2 border-b border-border/60 mb-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">
                    {ROLE_LABELS[currentRole] || currentRole}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate("/profil");
                }}
                className="w-full flex items-center px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <UserCircleIcon className="size-4 mr-2.5 text-muted-foreground" />
                <span>Profil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate("/pengaturan/profil");
                }}
                className="w-full flex items-center px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <SettingsIcon className="size-4 mr-2.5 text-muted-foreground" />
                <span>Pengaturan</span>
              </button>

              <div className="h-px bg-border/60 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
              >
                <LogOutIcon className="size-4 mr-2.5" />
                <span>Keluar</span>
              </button>
            </div>
          )}

          {/* Trigger Kartu Profil Utama di Bagian Bawah (Terkunci Sempurna di Koordinat yang Sama saat Dibuka/Tutup) */}
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-expanded={isUserMenuOpen}
            className={cn(
              "flex items-center rounded-2xl transition-all duration-200 cursor-pointer text-left group",
              "hover:bg-white/15 focus:outline-hidden",
              isUserMenuOpen && "bg-white/20",
              isCollapsed ? "size-10 justify-center p-0" : "w-full justify-between h-11 px-0.5 py-1",
            )}
          >
            <div className="flex items-center min-w-0">
              <div className="size-9 rounded-full bg-white/20 text-white border border-white/30 flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="size-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {!isCollapsed && (
                <div className="ml-2.5 min-w-0 text-left">
                  <p className="text-xs font-bold truncate text-white leading-tight">
                    {profile.full_name || "User"}
                  </p>
                  <p className="text-[10px] text-white/75 truncate leading-tight mt-0.5">
                    {getRoleShortName(currentRole)}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <ChevronUpIcon
                className={cn(
                  "size-4 text-white/80 transition-transform duration-200 shrink-0 mr-1",
                  isUserMenuOpen && "rotate-180",
                )}
              />
            )}
          </button>
        </div>
      </aside>

      {/* =========================================================================
          AREA KONTEN UTAMA DENGAN DESKTOP HEADER SEJAJAR (Poin 1, 2, 5)
          Lebar Collapsed Baru: md:ml-16 (64px)
          ========================================================================= */}
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col min-h-screen transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-x-clip",
          isCollapsed ? "md:ml-16" : "md:ml-64",
        )}
      >
        {/* Desktop Top Header Bar (Sticky terkunci di atas saat scroll) */}
        <header className="hidden md:flex h-16 border-b border-border/80 bg-card/90 backdrop-blur-md px-6 items-center justify-between sticky top-0 z-30">
          {/* Sisi Kiri: Breadcrumb Navigasi Halaman Sejajar Vertikal dengan Kontrol Header Kanan */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground min-w-0"
          >
            {getHeaderBreadcrumbs(location.pathname).map((crumb, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 ? (
                    <span className="text-muted-foreground/60 select-none">/</span>
                  ) : null}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="hover:text-foreground transition-colors font-medium whitespace-nowrap"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-semibold truncate">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Sisi Kanan: Baris Sejajar (Mode Aktif [jika multi-role] + Notifikasi + Tema) */}
          <div className="flex items-center space-x-3">
            {/* Tombol Dropdown MODE AKTIF (Poin 1 & 2 - Hanya Tampil Jika Memiliki >= 2 Peran) */}
            {availableRoles.length >= 2 && (
              <div className="relative" ref={roleDropdownRef}>
                <ActionTooltip content="Ganti peran aktif sistem" side="bottom">
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                    className="flex items-center bg-card hover:bg-muted/60 border border-border rounded-2xl px-3 py-1.5 transition-all duration-200 group cursor-pointer shadow-2xs"
                  >
                    <div className="size-6 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-2.5 shrink-0">
                      <ArrowRightLeftIcon className="size-3.5" />
                    </div>
                    <div className="text-left hidden sm:block mr-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">
                        Mode Aktif
                      </p>
                      <p className="text-xs font-bold text-foreground leading-none">
                        {getRoleShortName(currentRole)}
                      </p>
                    </div>
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
                        isRoleDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>
                </ActionTooltip>

                {/* Menu Dropdown Mode Aktif */}
                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150 z-50">
                    <div className="px-3.5 py-1.5 border-b border-border/60 mb-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Pilih Mode Peran
                      </p>
                    </div>
                    {availableRoles.map((role) => {
                      const isSelected = currentRole === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => void handleRoleSwitch(role)}
                          className={cn(
                            "w-full px-3.5 py-2.5 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <span className="capitalize">
                            Mode {getRoleShortName(role)}
                          </span>
                          {isSelected && <CheckIcon className="size-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tombol Lonceng Notifikasi (Poin 2 - Pindah ke Header Kanan Atas) */}
            <ActionTooltip content="Notifikasi sistem" side="bottom">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleOpenNotifications()}
                className="relative size-9 rounded-2xl border-border bg-card hover:bg-muted/60 shadow-2xs cursor-pointer"
                aria-label="Buka notifikasi"
              >
                <BellIcon className="size-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 bg-destructive rounded-full" />
                )}
              </Button>
            </ActionTooltip>

            {/* Tombol Mode Tema Terang / Gelap (Sejajar di Kanan Header) */}
            <ActionTooltip content="Ganti mode tema" side="bottom">
              <div>
                <ThemeToggle size="sm" className="size-9 rounded-2xl border border-border shadow-2xs" />
              </div>
            </ActionTooltip>
          </div>
        </header>

        {/* Konten Halaman: Lebar stabil dan tidak bergeser jauh saat sidebar dibuka/tutup */}
        <main className="flex-1 min-w-0 bg-background px-4 sm:px-6 lg:px-8 pt-4 pb-8 overflow-x-clip">
          <div className="w-full max-w-[1400px] min-w-0 flex flex-col gap-5">
            <SidebarStateContext.Provider value={isCollapsed}>
              <Outlet />
            </SidebarStateContext.Provider>
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
    </div>
  );
}
