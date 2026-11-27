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

- **Tes Otomatis:** `tests/unit/desktop-freeze-guard.test.ts` (13/13 passed).
- **Hasil:** Seluruh kelas desktop (seperti `hidden md:flex h-16`, `md:w-64`, `max-w-lg`, `sm:p-6`, `lg:p-12`) terkunci 100% tanpa pergeseran atau regresi visual.
- **Kompilasi TypeScript:** 0 error (`tsc -b`).
- **Unit & Integration Tests:** 35 berkas pengujian (227 tes) lulus 100%.
- **Build Produksi:** Berhasil dalam 12 detik (`dist/` lengkap dan valid).

---

## 3. Catatan Observasi Lanjutan untuk Evaluasi Pengguna

1. **Perilaku Drawer Navigasi Mobile:**
   Drawer samping dapat dibuka via tombol menu di header mobile, dan otomatis tertutup ketika pengguna memilih menu navigasi atau mengetuk backdrop overlay.
2. **Performa Scroll Tabel Lebar:**
   Tabel akuntansi dan jurnal memiliki 7 hingga 9 kolom. Pada layar ponsel (< 640px), tabel digeser horizontal secara halus dengan akselerasi momentum bawaan peramban (`touch-pan-x`), sementara kolom aksi dan status di ujung kanan tetap dapat diakses dengan mudah berkat petunjuk edge fade.
3. **Penyelarasan Input Angka (`NumberInput`):**
   Seluruh input angka menggunakan standar pemisah ribuan titik (`.`) dan desimal koma (`,`) yang tetap stabil saat difokuskan pada keyboard virtual ponsel.

---

## 4. Polesan Lanjutan Khusus Dimensi Mobile & Tablet (Tahap Final)

1. **Halaman Login Fit 100dvh Tanpa Scroll:**
   - [login-page.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/features/auth/login-page.tsx) dioptimalkan dengan `min-h-dvh flex flex-col justify-center items-center px-3 py-3 sm:p-10 lg:p-12`.
   - Ukuran input dan button disesuaikan menjadi `h-10 sm:h-11`, tab switcher `py-1.5 px-2.5 text-xs sm:text-sm`, dan box akses portal pembeli diringkas sehingga pas 1 layar penuh pada iPhone SE (375×667px).
2. **Standardisasi Icon Button pada Mobile (`<sm`):**
   - [export-download-menu.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/components/shared/export-download-menu.tsx) di mobile otomatis menjadi icon button `size-9` dengan teks disembunyikan (`max-sm:hidden`).
   - Seluruh tombol aksi header halaman (`po-page.tsx`, `budget-page.tsx`, `projects-page.tsx`, `user-payments-page.tsx`, `journals-page.tsx`, `invoicing-page.tsx`, `coa-accounts-page.tsx`, `login-media-page.tsx`, `shortcuts-management-page.tsx`, `users-management-page.tsx`) diatur memakai `max-sm:size-9 max-sm:p-0` dan `max-sm:hidden` pada label teks sehingga tersusun rapi berdampingan tanpa tumpukan vertikal.
3. **Proporsi & Kesejajaran Ikon Card/Div:**
   - Di [buyer-portal-page.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/features/buyer-portal/buyer-portal-page.tsx), logo mark Altvira `max-sm:size-10` sejajar vertikal di tengah dengan judul dan deskripsi.
   - Di [budget-page.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/features/budgeting/budget-page.tsx), ikon `FolderKanbanIcon` (`size-8 sm:size-9`) dan teks `Proyek Aktif` dibungkus bersama dalam satu baris sejajar (`flex items-center gap-2.5 shrink-0`).
4. **Pencegahan Teks Pecah 2 Baris (Anti-Shift):**
   - Judul portal pelanggan menggunakan `max-sm:text-base truncate` sehingga tidak pecah canggung ke baris kedua.
   - Di [dashboard-charts.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/components/shared/dashboard-charts.tsx), `ChartTypeSwitcher` (`[Kolom] [Area]` dan `[Laba Rugi] [Arus Kas]`) di mobile otomatis icon-only (`max-sm:size-7 max-sm:p-0`), menghemat ruang sehingga judul grafik tidak terpotong elipsis.
5. **Konsistensi Bayangan (Shadow):**
   - [theme-toggle.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/components/shared/theme-toggle.tsx) diseragamkan dengan token `shadow-2xs border-border/80` identik dengan `LanguageToggle`.
6. **Anti-Clipping Dropdown Bahasa:**
   - [language-toggle.tsx](file:///d:/08.%20Tech%20Workspaces/02.%20Development/Altcycles/src/components/shared/language-toggle.tsx) dilengkapi deteksi batas viewport dinamis dan `placement="top"` saat berada di drawer sidebar bawah.

---

## 5. Polesan Mobile Halaman /admin/persetujuan (Langkah 1: Item 1 & 2)

1. **Header Halaman & Truncation (Item 1):**
   - Font judul di mobile disesuaikan menjadi `max-sm:text-[22px] max-sm:leading-tight` dengan toleransi maksimal 2 baris (`max-sm:line-clamp-2 max-sm:whitespace-normal`) tanpa terpotong ellipsis premature.
   - Ikon info `(i)` tetap di samping judul halaman, dibungkus `ActionTooltip` Altcycles tanpa atribut native `title` browser.
2. **Tombol Unduh/Ekspor Melayang (Item 1):**
   - Menggunakan prop aditif `mobileFloating` pada `ExportDownloadMenu`.
   - Di mobile: menjadi floating action button melayang di pojok kanan bawah (`fixed bottom-6 right-5 z-50 size-12 rounded-2xl`).
   - Warna kotak tombol biru: `bg-primary/15 border-primary/30 text-primary` pada tema terang (ikon gelap di tema terang), dan `dark:bg-primary dark:border-primary/50 dark:text-white` pada tema gelap (ikon terang di tema gelap).
   - Menghilangkan baris kosong ~70px di bawah judul halaman pada tampilan mobile.
3. **KPI Card Mobile Padat (Item 2 - Target <= 84px):**
   - Menggunakan prop aditif `compactMobile` pada `KpiCard`.
   - Padding `max-sm:px-3.5 max-sm:py-2.5 max-sm:gap-1.5`, ikon `max-sm:size-8`, svg `max-sm:size-4`, nominal `max-sm:text-[17px]`, subtext tetap tampil.
   - Tinggi per kartu tercapai ~78px (memenuhi target <= 84px).
   - Pengguna menyetujui **Opsi B** (tiga kartu dalam satu baris dengan geser horizontal / carousel: `overflow-x-auto no-scrollbar snap-x snap-mandatory`, lebar `w-[82%]` peek-in) dengan total tinggi hanya **~82 px**, menghemat ~298 px ruang vertikal layar.
4. **Halaman Adaptif dvh & Empty State Fleksibel (Langkah 2: Item 3):**
   - Kontainer root halaman mobile menggunakan `max-sm:flex-1 max-sm:min-h-[calc(100dvh-5.5rem)]` sehingga mengisi penuh tinggi layar ponsel secara alami.
   - Kartu daftar dan `CardContent` di mobile menggunakan `max-sm:flex-1 max-sm:flex max-sm:flex-col`.
   - `Table` dilengkapi prop aditif `wrapperClassName` untuk meneruskan kelas flex ke pembungkus tabel.
   - Empty state tidak lagi memiliki tinggi statis kaku, melainkan menggunakan `max-sm:flex-1 max-sm:h-full max-sm:min-h-0` sehingga berada persis di tengah ruang vertikal yang tersisa saat data kosong.
   - Saat data banyak, tabel bertambah tinggi secara wajar dan halaman dapat di-scroll lancar.
5. **Catatan Audit Pengujian (Pra-ada di Luar Lingkup):**
   - `tests/unit/i18n-check.test.ts`: Kunci terjemahan `auth.signup_google` pada `login-page.tsx`.
   - `tests/unit/dashboard-card-footer-alignment.test.tsx`: Pengujian pra-ada mengharapkan `divide-x` pada `ChartSummaryFooter`.
