export interface HeaderBreadcrumbItem {
  label: string;
  to?: string;
}

export function getHeaderBreadcrumbs(pathname: string): HeaderBreadcrumbItem[] {
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
