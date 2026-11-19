# Dokumen Audit, Temuan, dan Rencana Redesain Dashboard Altcycles
**Status:** Langkah 0 & Langkah 1 Selesai — Menunggu Persetujuan Pengguna  
**Tanggal:** 19 November 2026  
**Cakupan:** Semua Dasbor Portal Internal Altcycles (`/admin/dashboard`, `/user/dashboard`, `/super-admin/dashboard`)

---

## 1. Langkah 0: Evaluasi Skill & Tool

Sesuai instruksi Langkah 0, dilakukan evaluasi terhadap skill dan kapabilitas yang tersedia di workspace untuk mendukung redesain dasbor keuangan modern, minimalis, dan informatif:

| Skill / Tool | Status | Alasan Pemilihan & Kesesuaian Stack |
| :--- | :--- | :--- |
| **`ui-ux-pro-max`** | **Digunakan** | Menyediakan inteligensi desain visual untuk dasbor keuangan web/desktop, hierarki tipografi, palet warna semantik, rasio kontras WCAG, dan pedoman UX visualisasi data pada stack React 19 + Tailwind CSS v4. |
| **`frontend-design`** | **Digunakan** | Menjaga estetika desain berkarakter kuat, elegan, bernuansa profesional ala SaaS keuangan modern (menghindari tampilan generik/slop) dengan tetap tunduk pada token desain Altcycles. |
| **`web-design-guidelines`** | **Digunakan** | Memastikan aksesibilitas (a11y), kontras warna dark/light mode, fokus keyboard, kelengkapan label ARIA pada grafik interaktif, dan keterbacaan font angka tabular. |
| **`react-best-practices`** | **Digunakan** | Menghindari re-render berlebih saat filter periode global berubah, optimasi kalkulasi agregasi data terposting menggunakan `React.useMemo`, dan transisi visual halus (*respect prefers-reduced-motion*). |
| **Library Grafik** | **Eksisting (`dashboard-charts.tsx`)** | **TIDAK MENAMBAH DEPENDENSI BARU.** Menggunakan mesin visualisasi grafik bawaan sistem berbasis SVG murni dan React yang sudah ada di `src/components/shared/dashboard-charts.tsx`. Dipoles dengan konfigurasi tema tunggal yang seragam. |

---

## 2. Langkah 1: Audit Mendalam Seluruh Dashboard Sistem

Berdasarkan penelusuran router pada `src/App.tsx`, `src/components/layout/nav-structure.ts`, dan registry navigasi, terdapat **3 halaman dasbor utama** di Altcycles:

### 2.1. Inventarisasi Dasbor

| Atribut | 1. Finance / Admin Dashboard | 2. Team Member / User Dashboard | 3. System Admin / Super Admin Dashboard |
| :--- | :--- | :--- | :--- |
| **Rute & File** | `/admin/dashboard`<br>`src/features/master-data/admin-dashboard.tsx` | `/user/dashboard`<br>`src/features/dashboard/user-dashboard.tsx` | `/super-admin/dashboard`<br>`src/features/system-config/super-admin-dashboard.tsx` |
| **Role Akses** | `admin` (Bendahara / Akuntan) | `user` (Anggota Tim Proyek) | `super_admin` (Pengelola Sistem) |
| **Kartu KPI Saat Ini** | 1. Kas & Bank Terkini<br>2. Antrean Pembayaran<br>3. Piutang Belum Tertagih<br>4. Komitmen Kontrak | 1. Proyek Ditugaskan<br>2. PO Pembelian Vendor<br>3. Pengajuan Pembayaran<br>4. Hak Bagi Hasil | 1. Pengguna Internal<br>2. Status Perpajakan<br>3. Bagan Akun Keuangan<br>4. Jejak Audit Terbaru |
| **Pintasan Cepat** | 8 Kartu Besar Modul Keuangan (grid 4 kolom, memakan banyak ruang vertikal) | 3 Kartu Modul Proyek (PO, Pembayaran, Anggaran) | Tombol Link Header ke Audit Trail |
| **Grafik & Visualisasi** | 1. Tren Pendapatan, Beban, & Kas (`column`, `bar`, `line`, `area`, `bubble`)<br>2. Komposisi Laba Rugi / Kas (`donut`, `pie`, `bar`)<br>3. Progress Penagihan & Aging (`bar`, `column`, `pie`, `bubble`)<br>4. Pos Beban & Histogram (`bar`, `pie`, `histogram`) | 1. Aktivitas PO & Pengajuan (`column`, `bar`, `line`, `area`, `histogram`)<br>2. Komposisi Klaim / Bagi Hasil (`donut`, `pie`, `bar`) | 1. Aktivitas Audit Data Harian/Entitas (`column`, `bar`, `line`, `area`)<br>2. Komposisi Peran / Akun (`donut`, `pie`, `bar`) |
| **Tabel Data** | List 5 Jurnal Terbaru (format sederhana di dalam card beban) | Tabel Proyek Terdaftar Anggota Tim | Tabel 8 Jejak Audit Terbaru Sistem |
| **Sumber Data** | `listAccounts`, `listPeriods`, `listProjects`, `listCustomers`, `listJournalsWithLines`, `listPaymentRequests`, `getProjectWorkspace`, `listPurchaseOrders` | `listProjects`, `listPurchaseOrders`, `listPaymentRequests`, `getProfitSharingBundle` | `listProfiles`, `getCompanyProfile`, `listAccounts`, `listAuditLogs` |
| **Status i18n & Bahasa** | Sebagian besar menggunakan namespace `dashboard`, namun beberapa label opsi toggle masih menggunakan teks literal bahasa Indonesia. | Ditemukan teks campur bahasa (*hardcoded* ID saat mode EN: *"Belum ada alokasi bagi hasil"*, *"PO Pembelian Vendor"*, *"Aktivitas PO & Pengajuan Pembayaran"*, dsb.). | Sebagian besar menggunakan namespace `settings:super_admin`, opsi toggle grafik masih bahasa Inggris statis (`Column`, `Bar`, `Line`, `Area`). |

---

### 2.2. Audit Konsistensi Antar Dashboard

| Dashboard | Elemen | Kondisi Saat Ini | Standar yang Direkomendasikan (AGENTS.md & Instruksi) |
| :--- | :--- | :--- | :--- |
| **Semua Dasbor** | **Jenis Grafik Toggle** | Masih menyediakan opsi `Line` dan `Bubble`. Pada layar sempit, grafik `Bubble` sangat padat dan sulit dibaca. | **Hapus total opsi `Line` dan `Bubble`** dari seluruh toggle grafik. Sisa pilihan tren: `column`, `bar`, `area`. Nilai preferensi lama otomatis jatuh ke default (`column`) tanpa error. |
| **Semua Dasbor** | **Kartu KPI** | Format kartu bervariasi; belum ada sparkline mini; belum ada indikator tren persentase perubahan vs periode sebelumnya; belum memiliki interaksi klik ke halaman modul terkait. | Standardisasi memakai komponen bersama `KpiCard`: `p-5 rounded-2xl border-border/80 bg-card shadow-2xs`, label Proper Case `text-xs font-medium text-muted-foreground`, nilai `text-xl sm:text-2xl font-bold tabular-nums` dengan `AnimatedNumber`, subjudul ringkas `text-[11px]`, ikon semantik kotak `size-10 rounded-xl`, **sparkline mini SVG**, **persentase perubahan vs periode sebelumnya** (panah hijau/merah atau `"-"` jika tanpa pembanding), dan **dapat diklik langsung menuju rute modul terkait**. |
| **Finance (`/admin/dashboard`)** | **Filter Periode Global** | Belum ada filter periode terpadu di header; kartu menampilkan agregasi campur ad-hoc (sebagian all-time, sebagian 6 bulan terakhir). | Tambahkan **SATU filter periode global** di header (Bulan Ini, Bulan Lalu, Tahun Ini, Semua Periode, atau Periode Buku Aktif) yang menyaring seluruh kartu KPI, grafik tren, komposisi, top beban, frekuensi transaksi, dan 5 transaksi terakhir secara serempak. |
| **Finance (`/admin/dashboard`)** | **Pintasan Modul** | Memakan 8 kartu besar berukuran vertikal tinggi (`p-4`), mendominasi separuh area layar di atas grafik. | **Padatkan menjadi Baris Chip Horizontal / Compact Navigation Bar** yang ringkas, elegan, dan hemat ruang vertikal dengan mempertahankan seluruh rute dan akses. |
| **Finance (`/admin/dashboard`)** | **Top Beban & Frekuensi Transaksi** | Pos beban saat ini digabung berdesakan di samping histogram dalam satu kartu; frekuensi transaksi bulanan belum ada. | Pecah menjadi **Baris 3 dengan 3 kartu sejajar**: (1) **Top 5 Beban** (batang horizontal, kode & nama akun via glosarium, nominal, persentase dari total beban), (2) **Frekuensi Transaksi** (batang tipis jumlah jurnal terposting per bulan + ringkasan total & rata-rata per bulan), dan (3) **Penagihan & Umur Piutang**. |
| **Finance (`/admin/dashboard`)** | **Transaksi Terakhir** | Berupa list teks kecil di dalam kartu grafik beban tanpa tabel terstandar. | Bangun **Baris 4: "5 Transaksi Terakhir"** dengan format tabel edge-to-edge penuh (`RecentTable`): kolom Tanggal, Nomor Jurnal, Deskripsi (bilingual via glosarium), Akun Utama, Nominal Moneter (`MonetaryCell`), dan tombol/tautan *"Lihat Semua"* ke Jurnal Umum. |
| **User (`/user/dashboard`)** | **Lokalisasi Bahasa** | Ditemukan teks statis bahasa Indonesia yang tidak berubah saat switch ke mode bahasa Inggris (misal: tombol status klaim, legenda, dan toggle). | Migrasikan seluruh teks ke kamus i18n `dashboard.json` namespace `user_dashboard` di `id` dan `en`. Pastikan zero string mentah. |
| **Super Admin (`/super-admin/dashboard`)** | **Konsistensi Desain** | Menggunakan kartu manual dan layout tabel yang sedikit berbeda dengan portal admin/user. | Sesuaikan agar menggunakan keluarga komponen bersama `KpiCard`, `ChartCard`, dan `DashboardThemeConfig` yang identik. |

---

## 3. Rencana Arsitektur Komponen Bersama (Langkah 1 Butir 3)

Untuk mencegah pembuatan komponen ganda atau paralel, komponen bersama akan dirancang di direktori `src/components/shared/` dengan memanfaatkan token dan komponen dasar (`Card`, `Button`, `Table`, `Badge`) yang sudah ada:

1. **`KpiCard` (`src/components/shared/dashboard-kpi-card.tsx`):**
   - **Label:** Proper Case `text-xs font-medium text-muted-foreground`.
   - **Nominal:** Ukuran besar `text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums` terintegrasi dengan `AnimatedNumber`.
   - **Sparkline Mini:** Elemen SVG ringan 6 titik tanpa library eksternal, berdimensi proporsional (`w-16 h-7`), dengan gradien halus sesuai warna tren.
   - **Indikator Perubahan:** Panah naik/turun (`TrendingUpIcon` / `TrendingDownIcon`) beserta persentase (`+12.5%`, `-3.2%`, atau `"-"` jika tidak ada data periode pembanding). Warna semantik: hijau untuk kenaikan positif, merah untuk penurunan merugikan, dan netral untuk metrik yang netral.
   - **Subjudul:** Keterangan polos 1 baris `text-[11px] text-muted-foreground mt-1`.
   - **Ikon Kotak:** `size-10 rounded-xl border` di sisi kanan dengan warna semantik terstandar.
   - **Interaktivitas:** Opsional prop `to?: string`. Jika diberikan, kartu memiliki efek hover halus (`hover:border-primary/50 hover:bg-card/90 transition-all cursor-pointer`) dan membawa pengguna langsung ke halaman operasional terkait.

2. **`ChartCard` (`src/components/shared/dashboard-chart-card.tsx`):**
   - Struktur kartu seragam: `rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col`.
   - Header terstandar berpemisah: `px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`.
   - Spasi rapat judul-deskripsi: `CardTitle` + `CardDescription` konsisten jarak 4px (`space-y-1 min-w-0`).
   - Slot kontrol fleksibel: untuk menampung toggle switcher jenis grafik atau tab filter dataset.
   - Area render grafik responsif dengan status `loading` (skeleton terpadu) dan `empty` (pesan ramah pengguna).
   - Footer kartu terstandar (`ChartCardFooter` dan `ChartTypeSwitcher` yang telah dibersihkan dari opsi `Line` dan `Bubble`).

3. **`DashboardThemeConfig` (Konfigurasi Tema Grafik Tunggal):**
   - **Palet Semantik Tetap:**
     - Pendapatan / Sukses: `#10b981` (Emerald)
     - Beban / Peringatan: `#f59e0b` (Amber)
     - Kas Bersih / Warna Utama: `#0B43C8` (Altcycles Brand Blue) / Dark: `#38bdf8` (Sky)
     - Penurunan / Kerugian / Bahaya: `#f43f5e` (Rose)
     - Komitmen / Kontrak / Netral: `#64748b` (Slate)
   - **Tipografi:** Font angka tabular (`tabular-nums`) di seluruh label nilai, sumbu, dan tooltip.
   - **Sumbu & Grid:** Sumbu menggunakan format Rp ringkas (`formatCompactRupiah`: jt, rb, M), garis grid putus-putus tipis beropasitas rendah, dan garis dasar nol (*zero baseline*) tegas.
   - **Tooltip & Legenda:** Tooltip menampilkan seluruh seri pada titik bulan yang sama dengan nominal penuh (`formatRupiah`), legenda interaktif dapat diklik untuk menyembunyikan/menampilkan seri.

4. **`PeriodFilter` (`src/components/shared/dashboard-period-filter.tsx`):**
   - Komponen pemilih periode global menggunakan `<Select>` atau popover button terpadu dengan preset standar:
     - `this_month`: Bulan Ini
     - `last_month`: Bulan Lalu
     - `this_year`: Tahun Ini
     - `all`: Semua Periode
     - Pilihan periode buku akuntansi spesifik (dari database `listPeriods`).
   - Perubahan periode secara instan menyaring seluruh kartu KPI dan grafik di dasbor.

5. **`RecentTable` & `EmptyState` Ringkas:**
   - Tabel 5 Transaksi Terakhir dengan format edge-to-edge (`CardContent className="p-0"`), header Proper Case rata tengah, sel moneter rata kanan-kiri (`MonetaryCell`), dan deskripsi transaksi terjemahan otomatis via glosarium dengan tooltip teks lengkap.

6. **Format Pemadatan Pintasan Modul (Keputusan Desain):**
   - **Pilihan Terpilih:** **Baris Chip Horizontal (Horizontal Quick-Chips Bar)**.
   - **Alasan:** Menjaga agar seluruh 8 rute cepat keuangan tetap dapat diakses dengan **1 kali klik langsung** tanpa harus membuka menu dropdown/collapsible terlebih dahulu, namun menghemat ruang vertikal hingga 60% dibandingkan 8 kartu besar sebelumnya. Pada layar sempit, chip bar dapat digeser mendatar (*horizontal scroll*) dengan rapi tanpa memotong tata letak halaman.

---

## 4. Perkiraan File yang Akan Diubah per Tahap

Sesuai aturan keras untuk mencatat daftar file sebelum memulai pengkodean:

### Tahap 2: Fondasi Bersama + Dashboard Finance (/admin/dashboard)
1. `src/components/shared/dashboard-charts.tsx` — *Modifikasi:* Hapus opsi `line` dan `bubble`, terapkan konfigurasi tema tunggal, perbaiki styling tooltip dan sumbu.
2. `src/components/shared/dashboard-kpi-card.tsx` — *File Baru:* Komponen `KpiCard` terstandar dengan sparkline mini & indikator delta vs periode sebelumnya.
3. `src/components/shared/dashboard-chart-card.tsx` — *File Baru:* Komponen `ChartCard` pembungkus seragam.
4. `src/components/shared/dashboard-period-filter.tsx` — *File Baru:* Komponen filter periode global terpadu.
5. `src/features/master-data/admin-dashboard.tsx` — *Modifikasi:* Redesain tata letak Finance sesuai urutan A1-A7 dan fitur B1-B3.
6. `src/locales/id/dashboard.json` — *Modifikasi:* Penambahan kunci lokalisasi baru untuk Finance Dashboard (Top 5 Beban, Frekuensi Transaksi, 5 Transaksi Terakhir, Filter Periode).
7. `src/locales/en/dashboard.json` — *Modifikasi:* Penambahan kunci terjemahan bahasa Inggris yang sepadan.

### Tahap 3.1: Dashboard Anggota Tim (/user/dashboard)
1. `src/features/dashboard/user-dashboard.tsx` — *Modifikasi:* Terapkan `KpiCard`, `ChartCard`, bersihkan toggle `line`/`bubble`, perbaiki isu teks campur bahasa, padatkan pintasan modul.
2. `src/locales/id/dashboard.json` & `src/locales/en/dashboard.json` — *Modifikasi:* Lokalisasi menyeluruh `user_dashboard`.

### Tahap 3.2: Dashboard Super Admin (/super-admin/dashboard)
1. `src/features/system-config/super-admin-dashboard.tsx` — *Modifikasi:* Terapkan `KpiCard`, `ChartCard`, bersihkan toggle `line`/`bubble`, seragamkan tabel jejak audit.
2. `src/locales/id/settings.json` & `src/locales/en/settings.json` — *Modifikasi:* Tambahkan kunci i18n untuk opsi toggle grafik Super Admin.

### Tahap Pengujian & Verifikasi Visual
1. `tests/unit/dashboard-consistency.test.tsx` — *File Baru:* Unit test untuk memverifikasi konsistensi penggunaan `KpiCard`, `ChartCard`, ketiadaan `line`/`bubble` pada toggle, serta integritas data KPI.
2. `docs/render-check/dashboard/` — *Tangkapan Layar Baru:* Bukti render sebelum dan sesudah (ID & EN, dark & light mode).

---

## 5. Sumber Data Informasi Baru (Finance Dashboard)

Seluruh informasi baru diturunkan murni dari data terposting yang sudah ada tanpa mengubah skema basis data:
1. **Top 5 Beban:** Diambil dari hasil kalkulasi `buildIncomeStatement(accounts, journals, lines)` yang difilter berdasarkan periode terpilih, mengagregasikan `directExpenses` dan `sharedExpenses`, lalu diurutkan secara menurun (`slice(0, 5)`). Persentase dihitung terhadap total beban operasional pada periode tersebut.
2. **Frekuensi Transaksi:** Menghitung jumlah record jurnal dengan `status === 'posted'` per bulan kalender. Total dan rata-rata dihitung dari total jurnal dibagi jumlah bulan aktif dalam periode terpilih.
3. **5 Transaksi Terakhir:** Diambil dari array `journals` dengan `status === 'posted'`, diurutkan dari `journal_date` terbaru (`slice(0, 5)`), dengan akun utama diambil dari baris debit pertama jurnal tersebut.

---

## 6. Daftar "Perlu Keputusanku: YA"

Berikut adalah daftar keputusan desain yang membutuhkan persetujuan/konfirmasi pengguna sebelum eksekusi pengkodean Langkah 2 dimulai:

1. **Definisi Frekuensi Transaksi & Visualisasi (Finance):**
   - *Pertanyaan:* Apakah Anda setuju definisi frekuensi transaksi adalah **1 jurnal terposting = 1 transaksi**?
   - *Opsi Tampilan:* Apakah ingin ditampilkan dalam bentuk **batang vertikal tipis bulanan dengan tooltip detail** (disertai ringkasan total dan rata-rata per bulan di bawahnya), atau Anda ingin opsi **heatmap kalender aktivitas harian**? (Rekomendasi sistem: batang vertikal bulanan tipis karena lebih bersih, informatif, dan tidak menghabiskan ruang vertikal).
2. **Pilihan Jenis Grafik Pie & Histogram:**
   - *Pertanyaan:* Opsi `Line` dan `Bubble` sudah pasti dihapus dari seluruh toggle. Apakah jenis grafik **Pie** (yang redundan dengan Donut) dan **Histogram** ingin dipertahankan pada kartu yang relevan, atau Pie dihapus sehingga hanya tersisa Donut dan Bar? (Rekomendasi sistem: Pie dihapus dari switcher tren/komposisi agar terfokus pada Donut dan Bar; Histogram tetap dipertahankan khusus pada analisis distribusi transaksi).
3. **Format Pemadatan Pintasan Modul Keuangan:**
   - *Pertanyaan:* Apakah Anda menyetujui pemadatan 8 kartu besar modul keuangan menjadi **Baris Chip Horizontal (Horizontal Quick-Chips Bar)** dengan ikon mini, label, dan badge ringkas yang dapat diklik langsung?
4. **Navigasi Klik Baris Top 5 Beban:**
   - *Pertanyaan:* Saat pengguna mengklik salah satu baris akun pada kartu "Top 5 Beban", apakah baris tersebut cukup menampilkan tooltip rincian, atau langsung diarahkan menuju halaman **Buku Besar Akuntansi** (`/admin/akuntansi?tab=buku_besar&accountId=[id]`)? (Catatan: rute tab akuntansi saat ini adalah `/admin/akuntansi?tab=jurnal` dan `/admin/akuntansi?tab=laporan`).
