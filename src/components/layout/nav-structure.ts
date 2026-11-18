import type * as React from "react";
import {
  BookOpenIcon,
  Building2Icon,
  ClipboardListIcon,
  CoinsIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  ImageIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  ScaleIcon,
  SettingsIcon,
  ShieldAlertIcon,
  ShoppingCartIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database.types";

export type NavItem = {
  type: "item";
  to: string;
  key?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
};

export type NavGroup = {
  type: "group";
  id: string;
  key?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hubPath?: string;
  items: {
    to: string;
    key?: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[];
};

export type NavEntry = NavItem | NavGroup;

export const SIDEBAR_STORAGE_KEY = "altcycles_sidebar_collapsed";

export function getRoleShortName(
  role: UserRole,
  t?: (key: string, fallback?: string) => string,
): string {
  const translate = t || ((_k: string, f?: string) => f || _k);
  switch (role) {
    case "super_admin":
      return translate("role.super_admin", "Super Admin");
    case "admin":
      return translate("role.admin", "Bendahara");
    case "user":
      return translate("role.user", "Anggota Tim");
  }
}

export function getNavStructureForRole(
  role: UserRole,
  t?: (key: string, fallback?: string) => string,
): NavEntry[] {
  const translate = t || ((_k: string, f?: string) => f || _k);

  switch (role) {
    case "super_admin":
      return [
        {
          type: "item",
          to: "/super-admin/dashboard",
          key: "nav.dashboard_system",
          label: translate("nav.dashboard_system", "Dashboard Sistem"),
          icon: LayoutDashboardIcon,
        },
        {
          type: "item",
          to: "/super-admin/profil-perusahaan",
          key: "nav.company_profile",
          label: translate("nav.company_profile", "Profil Perusahaan (Altvira)"),
          icon: Building2Icon,
        },
        {
          type: "item",
          to: "/super-admin/administrasi",
          key: "nav.admin_settings",
          label: translate("nav.admin_settings", "Administrasi & Penomoran"),
          icon: SettingsIcon,
        },
        {
          type: "item",
          to: "/super-admin/pengguna",
          key: "nav.users_management",
          label: translate("nav.users_management", "Pengguna & Peran"),
          icon: UsersIcon,
        },
        {
          type: "item",
          to: "/super-admin/master-tinjau",
          key: "nav.accounting_controls",
          label: translate("nav.accounting_controls", "Pengaturan & Kontrol Akuntansi"),
          icon: BookOpenIcon,
        },
        {
          type: "item",
          to: "/super-admin/audit-trail",
          key: "nav.audit_trail",
          label: translate("nav.audit_trail", "Audit Trail"),
          icon: ShieldAlertIcon,
        },
        {
          type: "item",
          to: "/super-admin/media-login",
          key: "nav.login_media",
          label: translate("nav.login_media", "Media & Banner Login"),
          icon: ImageIcon,
        },
      ];

    case "admin":
      return [
        {
          type: "item",
          to: "/admin/dashboard",
          key: "nav.dashboard",
          label: translate("nav.dashboard", "Dashboard Keuangan"),
          icon: LayoutDashboardIcon,
        },
        {
          type: "group",
          id: "operasional-pengeluaran",
          key: "nav.group.operations",
          label: translate("nav.group.operations", "Operasional & PO"),
          icon: ShoppingCartIcon,
          items: [
            {
              to: "/admin/persetujuan",
              key: "nav.approvals",
              label: translate("nav.approvals", "Persetujuan Pembayaran"),
              icon: HandCoinsIcon,
            },
            {
              to: "/admin/po-internal",
              key: "nav.vendor_po",
              label: translate("nav.vendor_po", "PO Pembelian Vendor"),
              icon: ShoppingCartIcon,
            },
            {
              to: "/admin/anggaran",
              key: "nav.project_budget",
              label: translate("nav.project_budget", "Budgeting Proyek"),
              icon: WalletIcon,
            },
          ],
        },
        {
          type: "group",
          id: "proyek-penagihan",
          key: "nav.group.projects",
          label: translate("nav.group.projects", "Proyek & Pendapatan"),
          icon: FolderKanbanIcon,
          items: [
            {
              to: "/admin/proyek",
              key: "nav.client_projects",
              label: translate("nav.client_projects", "Proyek Klien & Termin"),
              icon: FolderKanbanIcon,
            },
            {
              to: "/admin/penagihan",
              key: "nav.invoicing",
              label: translate("nav.invoicing", "Invoice & Penagihan"),
              icon: ReceiptTextIcon,
            },
            {
              to: "/admin/bagi-hasil",
              key: "nav.profit_sharing",
              label: translate("nav.profit_sharing", "Bagi Hasil Proyek"),
              icon: CoinsIcon,
            },
          ],
        },
        {
          type: "item",
          to: "/admin/akuntansi",
          key: "nav.accounting",
          label: translate("nav.accounting", "Akuntansi & Laporan"),
          icon: ScaleIcon,
        },
        {
          type: "item",
          to: "/admin/master",
          key: "nav.parties",
          label: translate("nav.parties", "Master Vendor & Klien"),
          icon: ClipboardListIcon,
        },
      ];

    case "user":
      return [
        {
          type: "item",
          to: "/user/dashboard",
          key: "nav.user_dashboard",
          label: translate("nav.user_dashboard", "Dashboard & Bagi Hasil"),
          icon: LayoutDashboardIcon,
        },
        {
          type: "item",
          to: "/user/po",
          key: "nav.my_po",
          label: translate("nav.my_po", "PO Pembelian Saya"),
          icon: ShoppingCartIcon,
        },
        {
          type: "item",
          to: "/user/pembayaran",
          key: "nav.my_payments",
          label: translate("nav.my_payments", "Pengajuan Pembayaran"),
          icon: HandCoinsIcon,
        },
        {
          type: "item",
          to: "/user/anggaran",
          key: "nav.my_budget",
          label: translate("nav.my_budget", "Anggaran Proyek Saya"),
          icon: WalletIcon,
        },
      ];
  }
}

export const NAV_STRUCTURE_BY_ROLE: Record<UserRole, NavEntry[]> = {
  super_admin: getNavStructureForRole("super_admin"),
  admin: getNavStructureForRole("admin"),
  user: getNavStructureForRole("user"),
};
