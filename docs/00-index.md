# Peta Navigasi Dokumentasi Sistem Altcycles (`docs/00-index.md`)

Selamat datang di pusat dokumentasi resmi **Altcycles** (Sistem ERP Administrasi Keuangan dan Akuntansi Internal PT Altvira). Dokumen ini berfungsi sebagai peta navigasi (*Index & Sitemap*) untuk seluruh standar teknis, konvensi desain, dan riwayat audit.

---

## 1. Desain & Antarmuka Pengguna (`docs/design-system/`)
- **[AGENTS.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/AGENTS.md)** — Dokumen aturan baku arsitektur komponen, header halaman, kartu KPI, header tabel, tombol unduh, dan format moneter.
- **[layout-and-components.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/design-system/layout-and-components.md)** — Standar terpadu header halaman, kartu konten, tabel data, modal dialog, dan dropdown anti-clipping.
- **[Token Desain & Tema](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/index.css)** — Konfigurasi variabel tema Tailwind v4, kontras gelap/terang WCAG AA, dan radius terstandar.
- **[Motion & Transisi](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/lib/motion-tokens.ts)** — Kurva animasi cubic-bezier dan token durasi transisi antarmuka.

---

## 2. Standar Teknis & Modul (`docs/standards/`)
- **[document-pdf-specs.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/standards/document-pdf-specs.md)** — Spesifikasi kertas A4, margin, font header seragam 9.5pt, matriks 11 dokumen & 9 laporan, serta proteksi tabrakan sel.
- **[i18n-standards.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/standards/i18n-standards.md)** — Kamus resmi istilah baku (ID vs EN), struktur namespace, aturan pencegahan teks literal, dan proteksi CI.
- **[Pemetaan Akun Akuntansi (COA)](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/ACCOUNTING_MAPPING.md)** — Pemetaan hierarki bagan akun dan aturan penutupan buku.
- **[Asumsi Bisnis & Penomoran](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/ASSUMPTIONS.md)** — Format nomor invoice, kuitansi, PO, dan pembagian termin proyek.
- **[Registrasi Pintasan Keyboard](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-pintasan-keyboard.md)** — Peta pemicu shortcut global, urutan 'G lalu X', dan Command Palette.

---

## 3. Laporan Kesiapan Publish & Audit Sistem (`docs/audit-publish/`)
- **[00-ringkasan.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/00-ringkasan.md)** — Ringkasan eksekutif skor kesiapan per bidang dan matriks rute.
- **[bidang-a-alur-fitur.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-a-alur-fitur.md)** — Audit fitur, alur pengguna, dan status ekspor.
- **[bidang-b-ui-ux-desain.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-b-ui-ux-desain.md)** — Audit kepatuhan desain visual dan aksesibilitas.
- **[bidang-c-responsivitas.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-c-responsivitas.md)** — Matriks responsif perangkat 1920px s/d 320px.
- **[bidang-d-kebersihan-file.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-d-kebersihan-file.md)** — Laporan eliminasi aset dan file tak terpakai.
- **[bidang-e-pemecahan-kode.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-e-pemecahan-kode.md)** — Arsitektur pemecahan file raksasa >1.000 baris.
- **[bidang-f-struktur-dokumen.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-f-struktur-dokumen.md)** — Rencana konsolidasi dokumen tematik.
- **[bidang-g-aturan-desain-token.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-g-aturan-desain-token.md)** — Sumber kebenaran desain dan pencegahan CI.
- **[bidang-h-performa-rilis.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/bidang-h-performa-rilis.md)** — Checklist kesiapan rilis produksi.
- **[audit-mobile.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-mobile.md)** — Laporan audit UI/UX mobile & tablet serta rencana implementasi 6 paket aditif (desktop terkunci).
- **[temuan-mobile.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/temuan-mobile.md)** — Catatan temuan, log verifikasi, dan observasi responsif mobile/tablet pasca-implementasi.
- **[rencana-implementasi.md](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/docs/audit-publish/rencana-implementasi.md)** — Rencana bertahap 10 paket kerja rilis.
