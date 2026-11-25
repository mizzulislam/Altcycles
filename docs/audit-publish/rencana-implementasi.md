# Rencana Implementasi Kesiapan Publish Altcycles (Tahap 2)

Rencana ini disusun secara berurutan dalam **10 paket kerja kecil yang aman**. Setiap paket memiliki ID temuan yang ditangani, daftar file terdampak, tes pembuktian, serta prosedur verifikasi dan rollback.

> [!IMPORTANT]
> **ATURAN EKSEKUSI TAHAP 2:**
> 1. Eksekusi HANYA dilakukan setelah rencana ini disetujui secara tertulis oleh User.
> 2. Pengerjaan dilakukan satu paket / satu commit per langkah.
> 3. Sebelum setiap commit: jalankan `git status` dan `git diff --stat`, verifikasi hanya file yang direncanakan yang berubah.
> 4. Setiap perubahan CSS/layout wajib diverifikasi di lebar desktop (1920 dan 1440) untuk memastikan piksel identik dengan baseline.

---

## Rincian Paket Kerja Berurutan

### Paket 1: Stabilisasi Fondasi Build & Perbaikan Error Kritis (PF-02, PF-03, UX-01)
- **Tujuan:** Menghilangkan seluruh error TypeScript dan ESLint sehingga `npm run build` dan seluruh suite test 100% lulus.
- **ID Temuan:** `PF-02`, `PF-03`, `UX-01`
- **Daftar File Terdampak:**
  - `src/features/profile/profile-overview-page.tsx` (perbaiki urutan hooks dan bersihkan import)
  - `src/lib/operations/fixed-assets.ts` (perbaiki tipe parameter mutasi aset)
  - `tests/unit/group-d-performance-optimizations.test.tsx` (hapus import tak terpakai dan tipe payload)
  - `tests/unit/profile-tax-ptkp-simulation.test.tsx` (bersihkan import React)
  - `tests/db/phase5-multi-role.test.ts` (spesifikasi eksplisit parameter `update_my_profile`)
- **Pengujian & Bukti:** `npm run typecheck`, `npm run lint`, `npm run test` (207/207 lulus).
- **Risiko & Rollback:** Sangat Rendah; `git checkout` bila ada test yang terpengaruh.

---

### Paket 2: Baseline Visual Desktop & Pengaman Regresi (RS-00)
- **Tujuan:** Mengambil tangkapan layar patokan (baseline) untuk seluruh rute utama di lebar 1920px dan 1440px sebelum menyentuh layout.
- **ID Temuan:** Pengaman Regresi Desktop
- **Daftar File Terdampak:**
  - `docs/render-check/publish/baseline-1920/` (folder tangkapan layar baru)
  - `docs/render-check/publish/baseline-1440/` (folder tangkapan layar baru)
- **Pengujian & Bukti:** Skrip tangkapan layar Playwright/headless browser menghasilkan file PNG referensi.
- **Risiko:** Nol (hanya menambah file gambar patokan).

---

### Paket 3: Sinkronisasi Token Desain & Dokumen Sumber Kebenaran (DS-01, DS-02)
- **Tujuan:** Menyelaraskan token breakpoint, tinggi komponen, dan token warna di `src/index.css` serta memperbarui dokumen desain.
- **ID Temuan:** `DS-01`, `DS-02`, `UX-02`, `UX-08`
- **Daftar File Terdampak:**
  - `src/index.css` (penyesuaian token kontras muted dark mode & breakpoint responsif)
  - `src/lib/motion-tokens.ts`
- **Pengujian & Bukti:** Periksa kontras WCAG AA dan build CSS Tailwind v4.
- **Risiko:** Rendah.

---

### Paket 4: Komponen Layout Bersama & Pengaman Responsif (RS-01, RS-02, RS-05)
- **Tujuan:** Menambahkan komponen wrapper responsif (`ResponsiveTableContainer`, `ResponsiveTabsList`) yang aktif secara aditif di layar kecil tanpa mengubah desktop.
- **ID Temuan:** `RS-01`, `RS-02`, `RS-05`
- **Daftar File Terdampak:**
  - `src/components/layout/portal-shell.tsx` (tambahkan ikon pencarian mobile di header atas)
  - `src/components/ui/table.tsx` (bungkus table dalam scroll container lokal)
  - `src/components/ui/tabs.tsx` (scrollable tabs di mobile)
- **Pengujian & Bukti:** Verifikasi visual desktop (1920 & 1440) identik dengan baseline Paket 2; uji scroll mobile di 360-412px.
- **Risiko:** Rendah (desktop menggunakan layout yang sama persis).

---

### Paket 5: Penyesuaian Responsif Dialog & Header Halaman (RS-03, RS-04, RS-06)
- **Tujuan:** Mencegah modal dialog meluap melebihi tinggi layar ponsel dan merapikan susunan tombol header pada tablet/mobile.
- **ID Temuan:** `RS-03`, `RS-04`, `RS-06`
- **Daftar File Terdampak:**
  - `src/components/ui/dialog.tsx`
  - `src/features/client-projects/dialogs/edit-record-dialog.tsx`
  - Header halaman transaksi (`projects-page.tsx`, `admin-approvals-page.tsx`)
- **Pengujian & Bukti:** Uji modal pada simulasi mobile 360x640px dengan keyboard virtual terbuka.
- **Risiko:** Rendah.

---

### Paket 6: Konsistensi UI/UX, Header Tabel, dan Sel Moneter (UX-03, UX-04, UX-06, UX-07, UX-09)
- **Tujuan:** Menyelaraskan seluruh tabel dan form agar 100% mematuhi aturan baku `AGENTS.md` (Proper Case, `text-center`, `MonetaryCell`, anti-clipping dropdown portal).
- **ID Temuan:** `UX-03`, `UX-04`, `UX-06`, `UX-07`, `UX-09`
- **Daftar File Terdampak:**
  - `src/features/purchase-orders/po-page.tsx`
  - `src/features/invoicing/invoicing-page.tsx`
  - `src/features/master-data/parties/customer-tab-content.tsx`
  - `src/features/client-projects/project-detail-page.tsx`
  - `src/features/system-config/company-profile-page.tsx`
- **Pengujian & Bukti:** Tes regresi visual desktop + tes header tabel.
- **Risiko:** Rendah.

---

### Paket 7: Konsistensi Alur, Halaman 404, dan Feedback Pengguna (FL-01, FL-03, FL-04, FL-05, FL-06, FL-07)
- **Tujuan:** Menyediakan halaman `NotFoundPage` (404), peringatan form kotor saat batal, dan standardisasi feedback ekspor.
- **ID Temuan:** `FL-01`, `FL-03`, `FL-04`, `FL-05`, `FL-06`, `FL-07`
- **Daftar File Terdampak:**
  - `src/pages/not-found-page.tsx` (file baru minimalis & responsif)
  - `src/App.tsx` (daftarkan NotFoundPage pada rute wildcard `*`)
  - `src/features/accounting/reports/reports-export-handlers.ts` (seragamkan `toast.promise`)
  - `src/features/dashboard/user-dashboard.tsx` (CTA empty state)
- **Pengujian & Bukti:** Navigasi ke URL acak `/halaman-tidak-ada` menampilkan 404 rapi; uji unduh laporan keuangan.
- **Risiko:** Rendah.

---

### Paket 8: Pemecahan File Kode Panjang (>1.000 Baris) (SP-01 s/d SP-08)
- **Tujuan:** Memecah file raksasa menjadi komponen modular per fitur secara bertahap (satu file per commit).
- **ID Temuan:** `SP-01`, `SP-02`, `SP-03`, `SP-04`, `SP-06`, `SP-07`
- **Urutan Eksekusi:**
  1. Commit 8.1: `coa-accounts-page.tsx` (ekstraksi `coa-table.tsx` & `coa-form-dialog.tsx`)
  2. Commit 8.2: `po-page.tsx` (ekstraksi `po-table.tsx` & `po-create-dialog.tsx`)
  3. Commit 8.3: `profile-settings-page.tsx` (ekstraksi sub-tab form)
  4. Commit 8.4: `company-profile-page.tsx` (ekstraksi sub-tab form)
  5. Commit 8.5: `journals-page.tsx` (ekstraksi `journals-table.tsx` & `manual-journal-dialog.tsx`)
  6. Commit 8.6: `invoicing-page.tsx` (ekstraksi `invoicing-table.tsx` & `invoice-create-dialog.tsx`)
- **Pengujian & Bukti:** Setiap commit wajib menjalankan `npm run typecheck`, `npm run test`, dan verifikasi render visual desktop identik.
- **Risiko:** Sedang; mitigasi dengan pengujian ketat per commit.

---

### Paket 9: Pembersihan Aset & File Tak Terpakai (CL-01 s/d CL-05)
- **Tujuan:** Menghapus file gambar arsip lama yang tidak dirujuk serta artefak audit usang.
- **ID Temuan:** `CL-01`, `CL-02`, `CL-03`, `CL-04`, `CL-05`
- **Daftar File Terdampak:**
  - Hapus `docs/archive/staffinc-notes-payment-detail.png`
  - Hapus `docs/archive/bootstrap-super-admin.sql`
  - Hapus `docs/audit-inventory.json`
- **Pengujian & Bukti:** Pemeriksaan `git status`, verifikasi pencarian teks bahwa tidak ada referensi kode/dokumen yang putus, jalankan `npm run build` dan `npm run test`.
- **Risiko:** Sangat Rendah.

---

### Paket 10: Penggabungan Dokumentasi, Tes CI Pencegahan, & Kesiapan Rilis (DOC-01 s/d DOC-03, DS-03, PF-01)
- **Tujuan:** Restrukturisasi folder `docs/`, penyusunan `docs/00-index.md`, penambahan assertion tes CI pencegah regresi desain, dan kompresi favicon.
- **ID Temuan:** `DOC-01`, `DOC-02`, `DOC-03`, `DS-03`, `PF-01`
- **Daftar File Terdampak:**
  - Gabungkan file audit di `docs/` menjadi `docs/standards/i18n-standards.md`, `docs/design-system/layout-and-components.md`, dan `docs/standards/document-pdf-specs.md`
  - Buat `docs/00-index.md` sebagai peta navigasi seluruh dokumen
  - Buat `tests/unit/design-token-enforcement.test.ts`
  - Kompresi `public/brand/altcycles-favicon.png` (< 40 KB)
- **Pengujian & Bukti:** Seluruh suite tes lulus (unit, db, dan visual), `npm run build` berhasil, dokumen tertata rapi.
- **Risiko:** Rendah.
