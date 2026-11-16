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

export const SIDEBAR_STORAGE_KEY = "altcycles_sidebar_collapsed";

export function getRoleShortName(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Bendahara";
    case "user":
      return "Anggota Tim";
  }
}

export const NAV_STRUCTURE_BY_ROLE: Record<UserRole, NavEntry[]> = {
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
