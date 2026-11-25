export interface HeaderBreadcrumbItem {
  label: string;
  to?: string;
}

export function getHeaderBreadcrumbs(
  pathname: string,
  t?: (key: string, fallback?: string) => string,
): HeaderBreadcrumbItem[] {
  const translate = t || ((_k: string, f?: string) => f || _k);
  const homeLabel = translate("nav.home", "Beranda");

  if (pathname === "/profil") {
    return [{ label: homeLabel, to: "/" }, { label: translate("user.my_profile", "Profil Saya") }];
  }
  if (pathname === "/pengaturan/profil") {
    return [
      { label: homeLabel, to: "/" },
      { label: translate("user.my_profile", "Profil"), to: "/profil" },
      { label: translate("user.profile_settings", "Pengaturan Profil") },
    ];
  }
  if (pathname.startsWith("/admin/proyek/") && pathname !== "/admin/proyek") {
    return [
      { label: homeLabel, to: "/" },
      { label: translate("projects.title", "Master Proyek"), to: "/admin/proyek" },
      { label: translate("projects.col_milestones", "Dokumen & Termin") },
    ];
  }

  const staticTitles: Record<string, string> = {
    "/admin/dashboard": translate("nav.dashboard", "Dashboard Keuangan"),
    "/admin/persetujuan": translate("nav.approvals", "Persetujuan Pembayaran"),
    "/admin/po-internal": translate("nav.vendor_po", "PO Pembelian Vendor"),
    "/admin/anggaran": translate("nav.project_budget", "Budgeting Proyek"),
    "/admin/proyek": translate("projects.title", "Master Proyek"),
    "/admin/penagihan": translate("nav.invoicing", "Invoice & Penagihan"),
    "/admin/bagi-hasil": translate("nav.profit_sharing", "Bagi Hasil Proyek"),
    "/admin/akuntansi": translate("nav.accounting", "Akuntansi & Laporan"),
    "/admin/master": translate("nav.parties", "Master Vendor & Klien"),
    "/user/dashboard": translate("user_portal.dashboard_title", "Ringkasan Proyek & Hak"),
    "/user/po": translate("nav.my_po", "PO Pembelian Saya"),
    "/user/pembayaran": translate("nav.my_payments", "Pengajuan Pembayaran"),
    "/user/anggaran": translate("nav.my_budget", "Budgeting Proyek"),
    "/super-admin/dashboard": translate("nav.dashboard_system", "Dashboard Sistem"),
    "/super-admin/profil-perusahaan": translate("nav.company_profile", "Profil Perusahaan"),
    "/super-admin/administrasi": translate("nav.admin_settings", "Administrasi & Penomoran"),
    "/super-admin/pengguna": translate("nav.users_management", "Manajemen Pengguna"),
    "/super-admin/konfigurasi": translate("nav.accounting_controls", "Konfigurasi Sistem"),
    "/super-admin/master-tinjau": translate("nav.accounting_controls", "Tinjauan Data Master"),
    "/super-admin/audit-trail": translate("nav.audit_trail", "Jejak Audit"),
    "/super-admin/media-login": translate("nav.login_media", "Media & Banner Login"),
    "/super-admin/pintasan-keyboard": translate("nav.keyboard_shortcuts", "Pintasan Keyboard"),
    "/super-admin/pintasan": translate("nav.keyboard_shortcuts", "Pintasan Keyboard"),
  };

  const title = staticTitles[pathname];
  if (title) {
    return [{ label: homeLabel, to: "/" }, { label: title }];
  }
  return [{ label: homeLabel, to: "/" }];
}
