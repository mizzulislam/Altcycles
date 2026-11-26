# Catatan Temuan & Verifikasi Mobile Altcycles (`docs/temuan-mobile.md`)

Dokumen ini mencatat log verifikasi, temuan observasi, dan status pengujian responsif pada dimensi Mobile Device (iPhone, Android) dan Tablet, setelah implementasi 6 paket kerja responsif selesai.

---

## 1. Status Penyelesaian Paket Kerja (M1 - M6)

| Paket | ID Temuan | Komponen / Berkas Utama | Status | Hasil Verifikasi |
| :--- | :--- | :--- | :---: | :--- |
| **M1** | MB-01, MB-07, MB-12 | `index.html`<br>`input.tsx`, `select.tsx`, `textarea.tsx`<br>`responsive-guidelines.md` | **TUNTAS** | Viewport auto-zoom pada iOS Safari & Android Chrome berhasil dicegah (`text-base sm:text-sm`). Safe-area gesture bar aktif. |
| **M2** | MB-06, MB-10 | `dialog.tsx`, `confirm-dialog.tsx`<br>`command-palette-dialog.tsx` | **TUNTAS** | Modal dialog adaptif `max-h-[90dvh]` aman dari keyboard virtual. Command palette melayang di `top-4` pada layar ponsel. |
| **M3** | MB-02 | `portal-shell.tsx`<br>`shell-sidebar.tsx` | **TUNTAS** | Header mobile diringkas (Logo, Cari, Notifikasi, Menu). Utilitas tema dan bahasa berada di zona jempol bawah drawer. |
| **M4** | MB-03, MB-05 | `export-download-menu.tsx`<br>`po-page.tsx`, `invoicing-page.tsx`, `projects-page.tsx`<br>`button.tsx` | **TUNTAS** | Tombol aksi transaksi full-width di mobile (`w-full sm:w-auto`). Icon button aksi tabel memiliki target sentuh 44x44px. |
| **M5** | MB-04, MB-08 | `table.tsx`<br>`tabs.tsx` | **TUNTAS** | Edge fade hint halus di sisi kanan container tabel aktif di mobile/tablet (`lg:hidden`). Tab bar otomatis menengahkan tab aktif saat disentuh. |
| **M6** | MB-09, MB-11 | `dashboard-kpi-card.tsx`<br>`login-page.tsx` | **TUNTAS** | Padding kartu KPI `p-4 sm:p-5` memberi ruang leluasa bagi nilai moneter. Halaman login ponsel sempit rapi dengan `px-4 py-8 sm:p-10 lg:p-12`. |

---

## 2. Pengujian Regresi Tampilan Desktop (PC >= 1024px)

- **Tes Otomatis:** `tests/unit/desktop-freeze-guard.test.ts` (12/12 passed).
- **Hasil:** Seluruh kelas desktop (seperti `hidden md:flex h-16`, `md:w-64`, `max-w-lg`, `sm:p-6`, `lg:p-12`) terkunci 100% tanpa pergeseran atau regresi visual.
- **Kompilasi TypeScript:** 0 error.
- **Lint:** 0 error.
- **Build Produksi:** Berhasil dalam 12 detik (`dist/` lengkap dan valid).

---

## 3. Catatan Observasi Lanjutan untuk Evaluasi Pengguna

1. **Perilaku Drawer Navigasi Mobile:**
   Drawer samping dapat dibuka via tombol menu di header mobile, dan otomatis tertutup ketika pengguna memilih menu navigasi atau mengetuk backdrop overlay.
2. **Performa Scroll Tabel Lebar:**
   Tabel akuntansi dan jurnal memiliki 7 hingga 9 kolom. Pada layar ponsel (< 640px), tabel digeser horizontal secara halus dengan akselerasi momentum bawaan peramban (`touch-pan-x`), sementara kolom aksi dan status di ujung kanan tetap dapat diakses dengan mudah berkat petunjuk edge fade.
3. **Penyelarasan Input Angka (`NumberInput`):**
   Seluruh input angka menggunakan standar pemisah ribuan titik (`.`) dan desimal koma (`,`) yang tetap stabil saat difokuskan pada keyboard virtual ponsel.
