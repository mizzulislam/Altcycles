import * as React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRightLeftIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import { initSupabaseRealtimeSync } from "@/lib/realtime-cache";
import { OverlayPageScrollbar } from "./overlay-page-scrollbar";
import {
  listMyNotifications,
  markAllNotificationsRead,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type { NotificationRow, UserRole } from "@/types/database.types";
import {
  NAV_STRUCTURE_BY_ROLE,
  SIDEBAR_STORAGE_KEY,
  getNavStructureForRole,
  getRoleShortName,
  type NavEntry,
  type NavGroup,
  type NavItem,
} from "./nav-structure";
import { getHeaderBreadcrumbs } from "./breadcrumb-map";
import { ShellSidebar } from "./shell-sidebar";
import { ShellNotificationsDialog } from "./shell-notifications-dialog";

export type { NavEntry, NavGroup, NavItem };
export { NAV_STRUCTURE_BY_ROLE, getRoleShortName };

export const SidebarStateContext = React.createContext<boolean>(false);

/** Mengembalikan true apabila sidebar desktop sedang dalam kondisi tertutup/collapsed. */
export function useSidebarCollapsed(): boolean {
  return React.useContext(SidebarStateContext);
}

export function PortalShell() {
  const { profile, activeRole, availableRoles, switchRole, signOut } = useAuth();
  const { language, t } = useLanguage();
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
      "akuntansi": true,
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
    // Inisialisasi Supabase Realtime Synchronization secara global
    const cleanupRealtime = initSupabaseRealtimeSync();
    return () => {
      cleanupRealtime();
    };
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
  const navStructure = React.useMemo(
    () => getNavStructureForRole(currentRole, t),
    [currentRole, language, t],
  );
  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  // Handle Pergantian Peran
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
      toast.error(err instanceof Error ? err.message : "Gagal beralih peran.");
    } finally {
      setTimeout(() => setIsSwitchingRole(false), 500);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased">
      {/* Fullscreen Overlay Loader saat Ganti Peran */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-300",
          isSwitchingRole ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="size-12 rounded-full border-4 border-muted border-t-primary animate-spin mb-4" />
        <p className="text-foreground font-semibold text-sm tracking-tight animate-pulse">
          {t("header.switching_mode", "Mengganti Mode Operasi...")}
        </p>
      </div>

      {/* Header Mobile */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <AltviraLogoMark size={26} iconVariant="transparent" />
          <span className="font-bold text-sm tracking-tight">Altcycles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl relative"
            aria-label={t("header.notifications", "Notifikasi")}
            onClick={() => void handleOpenNotifications()}
          >
            <BellIcon className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full" />
            )}
          </Button>
          <LanguageToggle size="sm" className="size-9 rounded-xl border border-border/80" />
          <ThemeToggle size="sm" className="size-9 rounded-xl" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            aria-label={t("header.open_nav", "Buka menu navigasi")}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Overlay Backdrop Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Dekstop & Mobile Drawer */}
      <ShellSidebar
        sidebarRef={sidebarRef}
        isCollapsed={isCollapsed}
        toggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        navStructure={navStructure}
        openGroups={openGroups}
        toggleGroup={toggleGroup}
        profile={profile}
        currentRole={currentRole}
        isUserMenuOpen={isUserMenuOpen}
        setIsUserMenuOpen={setIsUserMenuOpen}
        userMenuRef={userMenuRef}
        handleLogout={handleLogout}
      />

      {/* Area Konten Utama */}
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col min-h-screen transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-x-clip",
          isCollapsed ? "md:ml-16" : "md:ml-64",
        )}
      >
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 border-b border-border/80 bg-card/90 backdrop-blur-md px-6 items-center justify-between sticky top-0 z-30">
          {/* Breadcrumb Navigasi Halaman */}
          <nav
            aria-label={t("common:nav.breadcrumb", "Breadcrumb")}
            className="flex items-center gap-2 text-xs text-muted-foreground min-w-0"
          >
            {getHeaderBreadcrumbs(location.pathname, t).map((crumb, idx, arr) => {
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

          {/* Sisi Kanan Header: Mode Aktif + Notifikasi + Tema */}
          <div className="flex items-center space-x-3">
            {availableRoles.length >= 2 && (
              <div className="relative" ref={roleDropdownRef}>
                <ActionTooltip content={t("header.role_switch", "Ganti peran aktif sistem")} side="bottom">
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
                        {t("header.active_mode", "Mode Aktif")}
                      </p>
                      <p className="text-xs font-bold text-foreground leading-none">
                        {getRoleShortName(currentRole, t)}
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

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150 z-50">
                    <div className="px-3.5 py-1.5 border-b border-border/60 mb-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("header.role_switch", "Pilih Mode Peran")}
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
                            {getRoleShortName(role, t)}
                          </span>
                          {isSelected && <CheckIcon className="size-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tombol Lonceng Notifikasi */}
            <ActionTooltip content={t("header.notifications", "Notifikasi sistem")} side="bottom">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleOpenNotifications()}
                className="relative size-9 rounded-2xl border-border bg-card hover:bg-muted/60 shadow-2xs cursor-pointer"
                aria-label={t("common:header.notifications", "Notifikasi sistem")}
              >
                <BellIcon className="size-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 bg-destructive rounded-full" />
                )}
              </Button>
            </ActionTooltip>

            {/* Tombol Pengalih Bahasa (Dual/Multi Bahasa) */}
            <div>
              <LanguageToggle size="sm" className="size-9 rounded-2xl border border-border shadow-2xs" />
            </div>

            {/* Tombol Mode Tema */}
            <ActionTooltip content={t("header.theme", "Ganti mode tema")} side="bottom">
              <div>
                <ThemeToggle size="sm" className="size-9 rounded-2xl border border-border shadow-2xs" />
              </div>
            </ActionTooltip>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 min-w-0 bg-background px-4 sm:px-6 lg:px-8 pt-4 pb-8 overflow-x-clip">
          <div className="w-full max-w-[1400px] min-w-0 flex flex-col gap-5">
            <SidebarStateContext.Provider value={isCollapsed}>
              <Outlet />
            </SidebarStateContext.Provider>
          </div>
        </main>
      </div>

      {/* Floating Scrollbar */}
      <OverlayPageScrollbar />

      {/* Dialog Notifikasi */}
      <ShellNotificationsDialog
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkRead}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
}
