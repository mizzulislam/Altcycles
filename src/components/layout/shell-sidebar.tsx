import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  UserCircleIcon,
  XIcon,
} from "lucide-react";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { NavEntry } from "./nav-structure";
import { getRoleShortName } from "./nav-structure";
import type { ProfileRow, UserRole } from "@/types/database.types";

export interface ShellSidebarProps {
  sidebarRef: React.RefObject<HTMLElement | null>;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  navStructure: NavEntry[];
  openGroups: Record<string, boolean>;
  toggleGroup: (groupId: string) => void;
  profile: ProfileRow;
  currentRole: UserRole;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  handleLogout: () => Promise<void> | void;
}

export function ShellSidebar({
  sidebarRef,
  isCollapsed,
  toggleCollapsed,
  mobileOpen,
  setMobileOpen,
  navStructure,
  openGroups,
  toggleGroup,
  profile,
  currentRole,
  isUserMenuOpen,
  setIsUserMenuOpen,
  userMenuRef,
  handleLogout,
}: ShellSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
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

                <div
                  className={cn(
                    "grid transition-all duration-200 ease-in-out overflow-hidden motion-reduce:transition-none",
                    isGroupOpen
                      ? "grid-rows-[1fr] opacity-100 mt-1"
                      : "grid-rows-[0fr] opacity-0 mt-0",
                  )}
                >
                  <div className="min-h-0 relative ml-4 pl-3.5 space-y-1">
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
                </div>
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
              onClick={() => void handleLogout()}
              className="w-full flex items-center px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
            >
              <LogOutIcon className="size-4 mr-2.5" />
              <span>Keluar</span>
            </button>
          </div>
        )}

        {/* Trigger Kartu Profil Utama di Bagian Bawah */}
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
  );
}
