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
5. **Penempatan Tombol Aksi Header Kartu (Buku Jurnal & Kelola Tagihan):**
   - *Status:* **Perlu Keputusanku: YA**
   - *Deskripsi:* Sesuai arahan Item 9, tombol "Lihat Semua Jurnal" pada kartu "5 Transaksi Terakhir" telah dipindahkan ke footer kartu sebagai tautan teks dengan ikon panah (`ArrowRightIcon`) di atas pembatas garis tipis (`border-t border-border/70 bg-muted/10 px-6 py-3`).
   - *Pertanyaan:* Kartu "Realisasi Penagihan & Umur Piutang" saat ini masih memiliki tombol/tautan header "Kelola Tagihan". Apakah tombol ini juga ingin dipindahkan ke footer kartu agar seluruh header kartu grafik di dashboard Finance 100% konsisten hanya menampilkan judul dan ikon info? (Rekomendasi sistem: Ya, pindahkan ke footer untuk konsistensi penuh).


---

# II. AUDIT, TEMUAN, & RENCANA IKON INFO + GAME-DIALOG UNTUK DESKRIPSI KARTU DI SELURUH APLIKASI
**Status:** Langkah 0 & Langkah 1 Selesai — Menunggu Persetujuan Pengguna  
**Tanggal:** 23 November 2026  
**Cakupan:** Seluruh Kartu Konten/Div di Seluruh Portal Altcycles (Admin/Bendahara, Super Admin, User/Anggota Tim, Profil & Halaman Bersama)

---

## 1. Langkah 0: Evaluasi Skill & Tool

Sesuai arahan Langkah 0, dilakukan evaluasi terhadap ekosistem skill dan tool yang relevan untuk dialog bergaya gim, animasi performan, aksesibilitas modal (a11y), dan audit komponen:

| Skill / Tool | Status | Alasan Pemilihan & Kesesuaian Stack |
| :--- | :--- | :--- |
| **`find-skills`** | **Digunakan** | Menemukan dan memverifikasi kapabilitas terbaik di repositori untuk aksesibilitas modal dialog dan panduan animasi. |
| **`web-design-guidelines`** | **Digunakan** | Memastikan pemenuhan standar WCAG & a11y untuk modal dialog: atribut ARIA (`role="dialog"`, `aria-labelledby`, `aria-describedby`), jebakan fokus (*focus trap*), navigasi keyboard penuh (Esc untuk menutup, Enter/Space pada ikon info untuk membuka), dan restorasi fokus kembali ke ikon info saat dialog ditutup. |
| **`ui-ux-pro-max`** | **Digunakan** | Memberikan inteligensi proporsi visual game HUD/RPG card description: posisi menempel di dasar area konten (*bottom-anchored HUD*), tab label di tepi atas bingkai, padding nyaman, keterbacaan teks deskripsi pada tema gelap (*dark mode*) dan terang (*light mode*), serta rasio kontras tinggi tanpa *layout shift*. |
| **`karpathy-guidelines`** | **Digunakan** | Menjaga prinsip perubahan kode yang bedah (*surgical edits*), menghindari perombakan kode di luar lingkup permintaan, tanpa modifikasi format/lint massal, serta mempertahankan integritas data dan angka keuangan 100%. |
| **`react-best-practices`** | **Digunakan** | Memastikan transisi state dialog bersih (*entering*, *open*, *exiting*, *closed*), penanganan klik cepat tanpa kebocoran memori, unmount bersih dari DOM setelah animasi keluar selesai (180ms), dan scrollbar locking tanpa lompatan lebar viewport (*zero layout shift*). |
| **Library Animasi** | **TIDAK MENAMBAH DEPENDENSI BARU** | **ATURAN KERAS DIPATUHI:** Menggunakan murni CSS `transform: translateY` dan `opacity` dengan transisi halus (~220ms masuk, ~180ms keluar). Menghormati penuh `prefers-reduced-motion` (tanpa gerak vertikal, hanya fade singkat). Tidak ada library animasi eksternal baru yang diinstal. |

---

## 2. Langkah 1: Audit Penuh Seluruh Kartu Sistem

Penelusuran menyeluruh telah dilakukan terhadap seluruh file rute, sub-komponen, tab, dan dialog di direktori `src/features/` dan `src/components/`. 

### 2.1. Tabel Audit Kartu Konten (Cakupan Penuh)

| No | Rute | Role | Tab | Judul Kartu | Teks Deskripsi (Kunci i18n) | Komponen / File | Pola | Masuk Cakupan | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `/admin/dashboard` | `admin` | - | dashboard.charts.trends_title ("Tren Pendapatan, Beban, & Kas Bersih") | dashboard.charts.trends_subtitle ("Visualisasi pergerakan arus kas dan perbandingan pendapatan terhadap beban operasional") | `src/features/master-data/admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip bawaan ChartCard ke GameDialog |
| 2 | `/admin/dashboard` | `admin` | - | dashboard.charts.composition_title ("Komposisi Keuangan") | dashboard.charts.composition_subtitle ("Porsi pendapatan vs beban operasional periode terpilih") | `src/features/master-data/admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip bawaan ChartCard ke GameDialog |
| 3 | `/admin/dashboard` | `admin` | - | dashboard:charts.tx_frequency_title ("Frekuensi Transaksi") | dashboard:charts.tx_frequency_desc ("Distribusi volume transaksi jurnal terposting per bulan") | `src/features/master-data/admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip bawaan ChartCard ke GameDialog |
| 4 | `/admin/dashboard` | `admin` | - | dashboard:charts.billing_title ("Realisasi Penagihan & Piutang") | dashboard:charts.billing_desc ("Perbandingan nilai penagihan termin invoice vs outstanding") | `src/features/master-data/admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip bawaan ChartCard ke GameDialog |
| 5 | `/admin/dashboard` | `admin` | - | dashboard:charts.recent_5_tx_title ("5 Transaksi Terakhir") | dashboard:charts.recent_5_tx_desc ("Transaksi jurnal terposting paling baru dalam pembukuan") | `src/features/master-data/admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip bawaan ChartCard ke GameDialog |
| 6 | `/admin/persetujuan` | `admin` | - | approvals:admin.table_title ("Daftar Pengajuan Pembayaran Tim") | approvals:admin.table_desc ("Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana.") | `src/features/payment-approvals/admin-approvals-page.tsx` | CardHeader manual | **ya** | Contoh eksplisit dalam instruksi pengguna |
| 7 | `/admin/po-internal` | `admin` | - | po:table_title ("Daftar Purchase Order Vendor") | po:table_desc ("Pantau riwayat penerbitan PO internal dan status konfirmasi rekanan.") | `src/features/purchase-orders/po-page.tsx` | CardHeader manual | **ya** | Contoh eksplisit dalam instruksi pengguna (mode admin) |
| 8 | `/admin/proyek` | `admin` | - | projects:table_title ("Daftar Proyek Altvira") | projects:table_desc ("Induk referensi PO pembelian, anggaran, termin penagihan, dan bagi hasil.") | `src/features/master-data/projects-page.tsx` | CardHeader manual | **ya** | Contoh eksplisit dalam instruksi pengguna |
| 9 | `/admin/proyek/:projectId` | `admin` | milestones | projects:milestones.card_title ("Jadwal Termin Penagihan Klien") | projects:milestones.card_desc ("Daftar termin pembayaran yang ditagihkan bertahap sesuai progres kontrak.") | `src/features/client-projects/tabs/milestones-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu termin penagihan |
| 10 | `/admin/proyek/:projectId` | `admin` | milestones | projects:milestones.progress_card_title ("Progres Fisik Milestone Pekerjaan") | projects:milestones.progress_card_desc ("Pencapaian fisik proyek sebagai syarat verifikasi dokumen penagihan.") | `src/features/client-projects/tabs/milestones-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu progres pekerjaan |
| 11 | `/admin/proyek/:projectId` | `admin` | quotation_po | projects:quotation.card_title ("Dokumen Penawaran Harga (Quotation)") | projects:quotation.card_desc ("Surat penawaran resmi yang diajukan ke klien sebelum penerbitan PO.") | `src/features/client-projects/tabs/quotation-po-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu dokumen quotation |
| 12 | `/admin/proyek/:projectId` | `admin` | quotation_po | projects:client_po.card_title ("Purchase Order (PO) dari Klien") | projects:client_po.card_desc ("Dokumen komitmen resmi dari klien sebagai dasar penerbitan invoice.") | `src/features/client-projects/tabs/quotation-po-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu PO klien |
| 13 | `/admin/proyek/:projectId` | `admin` | sow_spk | projects:sow_spk.card_title ("Scope of Work (SOW) & SPK Kontrak") | projects:sow_spk.card_desc ("Ruang lingkup kerja resmi dan surat perintah kerja pelaksanaan proyek.") | `src/features/client-projects/tabs/sow-spk-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu SOW/SPK |
| 14 | `/admin/proyek/:projectId` | `admin` | acceptance_docs | projects:acceptance.bakp_title ("Berita Acara Kemajuan Pekerjaan (BAKP) - Lampiran A.6") | projects:acceptance.bakp_desc ("Dokumen verifikasi progres fisik sebelum penerbitan invoice termin berkala.") | `src/features/client-projects/tabs/acceptance-docs-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu BAKP |
| 15 | `/admin/proyek/:projectId` | `admin` | acceptance_docs | projects:acceptance.uat_title ("User Acceptance Testing (UAT) - Lampiran A.7") | projects:acceptance.uat_desc ("Berita acara uji terima fungsi aplikasi/sistem bersama perwakilan klien.") | `src/features/client-projects/tabs/acceptance-docs-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu UAT |
| 16 | `/admin/proyek/:projectId` | `admin` | acceptance_docs | Berita Acara Serah Terima / BAST (Lampiran A.8) | Syarat wajib penerbitan Invoice Pelunasan Akhir. | `src/features/client-projects/tabs/acceptance-docs-tab.tsx` | CardHeader manual | **ya** | Subjudul kartu BAST |
| 17 | `/admin/penagihan` | `admin` | invoices | invoicing:table.card_title ("Daftar Invoice Klien") | invoicing:table.card_desc ("Klik ikon catat bayar pada baris invoice ketika dana klien masuk...") | `src/features/invoicing/invoicing-page.tsx` | CardHeader manual | **ya** | Contoh eksplisit dalam instruksi pengguna |
| 18 | `/admin/penagihan` | `admin` | receipts | invoicing:table_kuitansi.card_title ("Daftar Kuitansi Resmi") | invoicing:table_kuitansi.card_desc ("Kuitansi diterbitkan otomatis saat pencatatan pelunasan invoice berhasil disimpan.") | `src/features/invoicing/invoicing-page.tsx` | CardHeader manual | **ya** | Subjudul kartu tab kuitansi |
| 19 | `/admin/penagihan` | `admin` | quotations | invoicing:table_quotation.card_title ("Daftar Dokumen Quotation Resmi") | invoicing:table_quotation.card_desc ("Dokumen penawaran harga resmi sebelum penerbitan PO klien.") | `src/features/invoicing/invoicing-page.tsx` | CardHeader manual | **ya** | Subjudul kartu tab quotation |
| 20 | `/admin/anggaran` | `admin` | - | budgeting:common.card_title ("Perbandingan Anggaran vs Realisasi per Akun Beban") | budgeting:common.card_desc ("Persentase serapan dan status ambang batas peringatan setiap akun.") | `src/features/budgeting/budget-page.tsx` | CardHeader manual | **ya** | Contoh eksplisit dalam instruksi pengguna |
| 21 | `/admin/akuntansi` | `admin` | laba_rugi | Laporan Laba Rugi Basis Akrual | Penyajian terstruktur beban langsung proyek dan beban operasional bersama periode [startDate - endDate]. | `src/features/accounting/reports/income-statement-view.tsx` | CardHeader manual | **ya** | Subjudul kartu laporan laba rugi |
| 22 | `/admin/akuntansi` | `admin` | neraca | Laporan Posisi Keuangan (Neraca) per [endDate] | Menyajikan posisi Aset, Liabilitas, Ekuitas, serta Aset/Liabilitas Kontrak proyek secara akrual. | `src/features/accounting/reports/balance-sheet-view.tsx` | CardHeader manual | **ya** | Subjudul kartu laporan neraca |
| 23 | `/admin/akuntansi` | `admin` | arus_kas | Laporan Arus Kas Metode Langsung | Klasifikasi aktivitas Operasi, Investasi, dan Pendanaan secara langsung dari mutasi kas periode [startDate - endDate]. | `src/features/accounting/reports/cash-flow-view.tsx` | CardHeader manual | **ya** | Subjudul kartu laporan arus kas |
| 24 | `/admin/akuntansi` | `admin` | perubahan_ekuitas | accounting:reports.equity_report_as_of ("Laporan Perubahan Ekuitas per [endDate]") | accounting:reports.equity_report_desc ("Menyajikan mutasi laba ditahan dan saldo modal disetor selama periode [startDate - endDate].") | `src/features/accounting/reports/equity-statement-view.tsx` | CardHeader manual | **ya** | Subjudul kartu laporan ekuitas |
| 25 | `/admin/bagi-hasil` | `admin` | - | profit_sharing:scheme_card_title ("Skema Porsi Bagi Hasil Proyek") | profit_sharing:scheme_card_desc ("Persentase pembagian laba bersih untuk masing-masing penerima manfaat.") | `src/features/profit-sharing/profit-sharing-page.tsx` | CardHeader manual | **ya** | Subjudul kartu skema penerima manfaat |
| 26 | `/admin/bagi-hasil` | `admin` | - | profit_sharing:result_card_title ("Kalkulasi Alokasi Laba Bersih") | profit_sharing:draft_simulation_desc / finalized_at_label ("Perhitungan pembagian laba bersih draf atau final") | `src/features/profit-sharing/profit-sharing-page.tsx` | CardHeader manual | **ya** | Subjudul kartu hasil simulasi bagi hasil |
| 27 | `/admin/master` | `admin` | vendors | parties:vendor.card_title ("Daftar Vendor & Rekanan Pengadaan") | parties:vendor.card_desc ("Kelola data vendor rekanan, kontak, rekening pembayaran, dan kategori barang/jasa.") | `src/features/master-data/parties/vendor-tab-content.tsx` | CardHeader manual | **ya** | Subjudul kartu tab master vendor |
| 28 | `/admin/master` | `admin` | customers | parties:customer.card_title ("Daftar Pelanggan / Klien Perusahaan") | parties:customer.card_desc ("Kelola direktori kontak klien, alamat penagihan, dan penanggung jawab invoice.") | `src/features/master-data/parties/customer-tab-content.tsx` | CardHeader manual | **ya** | Subjudul kartu tab master pelanggan |
| 29 | `/admin/master` | `admin` | catalog | parties:catalog.card_title ("Katalog Produk & Layanan Standar") | parties:catalog.card_desc ("Referensi harga satuan dan deskripsi item untuk dokumen penawaran dan PO.") | `src/features/master-data/parties/product-service-tab-content.tsx` | CardHeader manual | **ya** | Subjudul kartu tab master katalog |
| 30 | `/admin/master` | `admin` | coa | accounting:coa.card_title ("Bagan Akun Standar (Chart of Accounts)") | accounting:coa.card_desc ("Daftar akun buku besar untuk pencatatan jurnal umum dan laporan keuangan.") | `src/features/master-data/coa-accounts-page.tsx` | CardHeader manual | **ya** | Subjudul kartu tab master CoA |
| 31 | `/admin/master` | `admin` | periods | accounting:periods.card_title ("Daftar Periode Akuntansi") | accounting:periods.card_desc ("Status periode buku aktif dan tertutup untuk pembatasan pencatatan transaksi.") | `src/features/master-data/components/period-list-table.tsx` | CardHeader manual | **ya** | Subjudul kartu tab periode aktif |
| 32 | `/admin/master` | `admin` | closing_history | accounting:closing.history_card_title ("Riwayat Tutup Buku Akuntansi") | accounting:closing.history_card_desc ("Catatan penutupan periode dan rekapitulasi laba rugi tahun berjalan.") | `src/features/master-data/components/period-closing-table.tsx` | CardHeader manual | **ya** | Subjudul kartu tab riwayat tutup buku |
| 33 | `/super-admin/dashboard` | `super_admin` | - | settings:super_admin.card_audit_title ("Aktivitas Audit & Perubahan Data") | settings:super_admin.card_audit_desc ("Volume rekaman audit trail sistem per periode waktu") | `src/features/system-config/super-admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip ChartCard ke GameDialog |
| 34 | `/super-admin/dashboard` | `super_admin` | - | settings:super_admin.card_master_title ("Komposisi Master Sistem") | settings:super_admin.card_master_desc ("Proporsi entitas master data terdaftar di database") | `src/features/system-config/super-admin-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip ChartCard ke GameDialog |
| 35 | `/super-admin/dashboard` | `super_admin` | - | settings:super_admin.card_recent_audit ("Jejak Audit Terbaru") | settings:super_admin.card_recent_audit_desc ("Setiap perubahan konfigurasi, master data, dan status periode tercatat otomatis.") | `src/features/system-config/super-admin-dashboard.tsx` | CardHeader manual | **ya** | Subjudul kartu tabel audit super admin |
| 36 | `/super-admin/profil-perusahaan` | `super_admin` | identitas | settings:company.identity_title ("Identitas Resmi & Kontak Kantor Pusat") | settings:company.identity_desc ("Informasi legalitas perusahaan yang ditampilkan pada kop dokumen resmi...") | `src/features/system-config/company-profile-page.tsx` | CardHeader manual | **ya** | Subjudul kartu form identitas perusahaan |
| 37 | `/super-admin/profil-perusahaan` | `super_admin` | bank_ttd | settings:company.accounts_signatures_title ("Rekening Transfer & Aset Tanda Tangan Resmi") | settings:company.accounts_signatures_desc ("Rekening bank penerima pembayaran Invoice/SPK...") | `src/features/system-config/company-profile-page.tsx` | CardHeader manual | **ya** | Subjudul kartu form rekening & TTD |
| 38 | `/super-admin/profil-perusahaan` | `super_admin` | sosial | settings:company.social_accounts_title ("Akun Sosial Media Footer Dokumen") | settings:company.social_accounts_desc ("Ikon platform beserta username di bawah ini otomatis disematkan...") | `src/features/system-config/company-profile-page.tsx` | CardHeader manual | **ya** | Subjudul kartu form media sosial |
| 39 | `/super-admin/profil-perusahaan` | `super_admin` | pajak | settings:company.tax_pkp_title ("Status Pengusaha Kena Pajak (PKP) & Tarif PPN") | settings:company.tax_pkp_desc ("Konfigurasi pengenaan Pajak Pertambahan Nilai (PPN)...") | `src/features/system-config/company-profile-page.tsx` | CardHeader manual | **ya** | Subjudul kartu form perpajakan |
| 40 | `/super-admin/administrasi` | `super_admin` | - | settings:admin_settings.card_title ("Format Penomoran Dokumen Operasional") | settings:admin_settings.card_desc ("Tentukan format prefiks, urutan tahun/bulan, dan digit penomoran unik...") | `src/features/system-config/admin-settings-page.tsx` | CardHeader manual | **ya** | Subjudul kartu format penomoran |
| 41 | `/super-admin/administrasi` | `super_admin` | - | settings:admin_settings.sequences_card_title ("Urutan Dokumen & Reset Counter") | settings:admin_settings.sequences_card_desc ("Pemantauan nomor urut dokumen transaksi berjalan per tahun/bulan buku.") | `src/features/system-config/admin-settings-page.tsx` | CardHeader manual | **ya** | Subjudul kartu nomor urut counter |
| 42 | `/super-admin/pengguna` | `super_admin` | - | settings:users.card_title ("Daftar Pengguna Internal") | settings:users.card_desc ("Atur hak akses tunggal atau multi-peran untuk Super Admin, Admin, dan User.") | `src/features/system-config/users-management-page.tsx` | CardHeader manual | **ya** | Subjudul kartu daftar pengguna |
| 43 | `/super-admin/master-tinjau` | `super_admin` | coa | settings:master_readonly.coa_card_title ("Bagan Akun (Chart of Accounts)") | settings:master_readonly.coa_card_desc ("Tampilan pemantauan hanya-baca untuk Super Admin.") | `src/features/system-config/master-readonly-page.tsx` | CardHeader manual | **ya** | Subjudul kartu CoA readonly |
| 44 | `/super-admin/master-tinjau` | `super_admin` | projects | settings:master_readonly.projects_card_title ("Daftar Proyek") | settings:master_readonly.projects_card_desc ("Tampilan pemantauan hanya-baca proyek klien dan internal.") | `src/features/system-config/master-readonly-page.tsx` | CardHeader manual | **ya** | Subjudul kartu proyek readonly |
| 45 | `/super-admin/master-tinjau` | `super_admin` | vendors | settings:master_readonly.vendors_card_title ("Daftar Vendor") | settings:master_readonly.vendors_card_desc ("Direktori vendor pemasok hanya-baca untuk pengawasan sistem.") | `src/features/system-config/master-readonly-page.tsx` | CardHeader manual | **ya** | Subjudul kartu vendor readonly |
| 46 | `/super-admin/master-tinjau` | `super_admin` | customers | settings:master_readonly.customers_card_title ("Daftar Pelanggan") | settings:master_readonly.customers_card_desc ("Basis data pelanggan dan klien perusahaan hanya-baca.") | `src/features/system-config/master-readonly-page.tsx` | CardHeader manual | **ya** | Subjudul kartu pelanggan readonly |
| 47 | `/super-admin/audit-trail` | `super_admin` | - | settings:audit.card_title ("Catatan Log Aktivitas & Perubahan Data Sistem") | settings:audit.card_desc ("Rekaman tidak dapat diubah (immutable) untuk akuntabilitas kepatuhan operasional keuangan.") | `src/features/system-config/audit-trail-page.tsx` | CardHeader manual | **ya** | Subjudul kartu audit trail |
| 48 | `/super-admin/media-login` | `super_admin` | - | settings:login_media.preview_panel_title ("Pratinjau Media Login") | settings:login_media.preview_panel_desc ("Tampilan visual latar halaman autentikasi sesuai media yang aktif.") | `src/features/system-config/login-media-page.tsx` | CardHeader manual | **ya** | Subjudul kartu pratinjau media |
| 49 | `/super-admin/media-login` | `super_admin` | - | settings:login_media.table_title ("Daftar Media & Gambar Latar Login") | settings:login_media.table_desc ("Kelola berkas ilustrasi, foto perusahaan, dan video latar masuk sistem.") | `src/features/system-config/login-media-page.tsx` | CardHeader manual | **ya** | Subjudul kartu tabel media |
| 50 | `/super-admin/pintasan-keyboard` | `super_admin` | - | shortcuts.card_title ("Daftar Pemetaan Pintasan") | shortcuts.card_desc ("Kelola kombinasi tombol cepat untuk membuka menu dan menjalankan fungsi operasional.") | `src/features/system-config/shortcuts-management-page.tsx` | CardHeader manual | **ya** | Subjudul kartu pintasan keyboard |
| 51 | `/user/dashboard` | `user` | - | dashboard:user_dashboard.chart_activity_title ("Aktivitas PO & Pengajuan Pembayaran") | dashboard:user_dashboard.chart_activity_subtitle ("Tren pembuatan dokumen pengadaan dan klaim dana bulanan") | `src/features/dashboard/user-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip ChartCard ke GameDialog |
| 52 | `/user/dashboard` | `user` | - | dashboard:user_dashboard.chart_claims_sharing_title ("Status Klaim & Hak Bagi Hasil") | dashboard:user_dashboard.chart_claims_sharing_subtitle ("Perbandingan realisasi pencairan vs hak tertahan") | `src/features/dashboard/user-dashboard.tsx` | ChartCard (Komponen Bersama) | **ya** | Dipindahkan dari tooltip ChartCard ke GameDialog |
| 53 | `/user/dashboard` | `user` | - | dashboard:user_dashboard.assigned_projects_title ("Daftar Proyek Ditugaskan") | dashboard:user_dashboard.assigned_projects_desc ("Proyek yang melibatkan Anda sebagai pelaksana teknis atau penanggung jawab.") | `src/features/dashboard/user-dashboard.tsx` | CardHeader manual | **ya** | Subjudul kartu proyek user |
| 54 | `/user/dashboard` | `user` | - | dashboard:user_dashboard.profit_sharing_title ("Hak Bagi Hasil Proyek") | dashboard:user_dashboard.profit_sharing_desc ("Ringkasan hak bagi hasil teralokasi dari proyek-proyek yang telah difinalisasi.") | `src/features/dashboard/user-dashboard.tsx` | CardHeader manual | **ya** | Subjudul kartu bagi hasil user |
| 55 | `/user/po` | `user` | - | po:table_title ("Daftar Purchase Order Vendor") | po:table_desc ("Pantau riwayat penerbitan PO internal dan status konfirmasi rekanan.") | `src/features/purchase-orders/po-page.tsx` | CardHeader manual | **ya** | Mode user pada komponen bersama po-page |
| 56 | `/user/pembayaran` | `user` | - | approvals:user.table_title ("Daftar Pengajuan Pembayaran Saya") | approvals:user.table_desc ("Pantau status verifikasi dan persetujuan pengajuan dana yang Anda buat.") | `src/features/payment-approvals/user-payments-page.tsx` | CardHeader manual | **ya** | Subjudul kartu pengajuan pembayaran tim |
| 57 | `/user/anggaran` | `user` | - | budgeting:common.card_title ("Perbandingan Anggaran vs Realisasi per Akun Beban") | budgeting:common.card_desc ("Persentase serapan dan status ambang batas peringatan setiap akun.") | `src/features/budgeting/budget-page.tsx` | CardHeader manual | **ya** | Mode user pada budget-page |
| 58 | `/pengaturan/profil` | `any` | identitas | settings:profile.card_profile_title ("Informasi Profil Publik") | settings:profile.card_profile_desc ("Atur nama lengkap, sebutan jabatan, foto profil, dan avatar digital Anda.") | `src/features/profile/profile-settings-page.tsx` | CardHeader manual | **ya** | Subjudul kartu pengaturan profil pengguna |
| 59 | `/pengaturan/profil` | `any` | personal | settings:profile.card_personal_title ("Informasi Kontak & Pribadi") | settings:profile.card_personal_desc ("Nomor telepon WhatsApp, alamat domisili, dan nomor identitas KTP/NPWP.") | `src/features/profile/profile-settings-page.tsx` | CardHeader manual | **ya** | Subjudul kartu pengaturan informasi pribadi |
| 60 | `/pengaturan/profil` | `any` | akun | settings:profile.card_account_title ("Akun & Keamanan Akses") | settings:profile.card_account_desc ("Informasi email akun terdaftar, status autentikasi, dan pengaturan kata sandi.") | `src/features/profile/profile-settings-page.tsx` | CardHeader manual | **ya** | Subjudul kartu akun & kata sandi |
| 61 | `/pengaturan/profil` | `any` | notifikasi | settings:profile.card_notif_title ("Preferensi Notifikasi") | settings:profile.card_notif_desc ("Kelola pemberitahuan permohonan pembayaran, penugasan proyek, dan pengumuman sistem.") | `src/features/profile/profile-settings-page.tsx` | CardHeader manual | **ya** | Subjudul kartu notifikasi profil |
| 62 | `/super-admin/konfigurasi` | `super_admin` | sandbox | Mode Testing / Sandbox Sistem | Bungkus kontrol pengujian integritas akuntansi dan pencatatan dokumen. Saat mode testing aktif, transaksi jurnal dapat diedit/dihapus untuk pengujian dan nomor urut dokumen dapat dibersihkan. | `src/features/system-config/system-config-page.tsx` | CardHeader manual | **ya** | Subjudul kartu mode sandbox testing |
| 63 | `/portal-pembeli` | `unauthenticated` | - | projects:buyer_portal.card_lookup_title ("Lacak Dokumen Purchase Order & Status Tagihan") | projects:buyer_portal.card_lookup_desc ("Masukkan nomor PO atau kode akses dokumen yang Anda terima dari Altvira.") | `src/features/buyer-portal/buyer-portal-page.tsx` | CardHeader manual | **ragu** | Portal publik eksternal klien pembeli tanpa autentikasi; perlu keputusan apakah dipasang ikon info game dialog atau tetap teks statis |
| 64 | `/portal-pembeli` | `unauthenticated` | - | projects:buyer_portal.milestones_title ("Jadwal Termin Pembayaran Kontrak") | projects:buyer_portal.milestones_desc ("Daftar tahapan penagihan resmi yang telah disepakati dalam kontrak.") | `src/features/buyer-portal/buyer-portal-page.tsx` | CardHeader manual | **ragu** | Portal publik eksternal klien pembeli; perlu keputusan |
| 65 | `/portal-pembeli` | `unauthenticated` | - | projects:buyer_portal.docs_title ("Lampiran Dokumen Serah Terima Resmi") | projects:buyer_portal.docs_desc ("Unduh berkas PDF dokumen BAKP, UAT, dan BAST yang telah disahkan.") | `src/features/buyer-portal/buyer-portal-page.tsx` | CardHeader manual | **ragu** | Portal publik eksternal klien pembeli; perlu keputusan |
| 66 | `/portal-pembeli` | `unauthenticated` | - | projects:buyer_portal.form_title ("Formulir Konfirmasi PO Baru Klien") | projects:buyer_portal.form_desc ("Setelah dikirim, sistem menerbitkan Nomor PO dengan kode unik PO-YYYYMM-XXXXXX.") | `src/features/buyer-portal/buyer-portal-page.tsx` | CardHeader manual | **ragu** | Portal publik eksternal klien pembeli form input; perlu keputusan |


---

### 2.2. Tabel Pengecualian Terdaftar (DILARANG DISENTUH SAMA SEKALI)

Sesuai aturan keras pada *Batas Cakupan (Paling Penting)*, elemen-elemen berikut **dikecualikan 100%** dan tidak disentuh:

| Kategori Elemen | Lokasi & Contoh Teks | Alasan Pengecualian Sesuai Arahan |
| :--- | :--- | :--- |
| **Deskripsi Judul Halaman** | `<h1>Persetujuan Pembayaran...</h1>` → *"Verifikasi permohonan dana, persetujuan pengajuan, dan pencairan kas tim."* (`/admin/persetujuan`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman, bukan di dalam kartu/div). |
| **Deskripsi Judul Halaman** | `<h1>Daftar Purchase Order...</h1>` → *"Kelola penerbitan, persetujuan status, dan dokumen purchase order vendor."* (`/admin/po-internal`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Daftar Proyek Altvira</h1>` → *"Master referensi proyek, anggaran biaya, dan termin penagihan."* (`/admin/proyek`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Manajemen Penagihan & Invoice</h1>` → *"Kelola penerbitan invoice, pelunasan pembayaran, kuitansi resmi, dan quotation."* (`/admin/penagihan`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Anggaran Operasional & Realisasi Beban</h1>` → *"Monitoring serapan anggaran beban operasional..."* (`/admin/anggaran`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Pusat Akuntansi & Pelaporan Keuangan</h1>` → *"Buku jurnal harian, AJP penyesuaian, laporan keuangan SAK..."* (`/admin/akuntansi`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Bagi Hasil & Alokasi Laba Proyek</h1>` → *"Simulasi alokasi persentase laba bersih proyek..."* (`/admin/bagi-hasil`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Master Data Pihak & Entitas</h1>` → *"Katalog entitas pihak ketiga, vendor rekanan, data pelanggan..."* (`/admin/master`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Dashboard Pengawasan Sistem</h1>` → *"Pemantauan aktivitas audit sistem, status perpajakan, dan integritas basis data."* (`/super-admin/dashboard`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Profil Perusahaan (Altvira)</h1>` → *"Kelola identitas resmi, rekening bank, perpajakan, dan aset tanda tangan Altvira."* (`/super-admin/profil-perusahaan`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Administrasi & Penomoran Dokumen</h1>` → *"Konfigurasi format penomoran dokumen operasional dan reset counter penomoran."* (`/super-admin/administrasi`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Pengguna & Peran Akses</h1>` → *"Manajemen akun pengguna internal, hak akses multi-peran, dan status aktif."* (`/super-admin/pengguna`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Tinjauan Master Data</h1>` → *"Pengawasan hanya-baca data master proyek, vendor, pelanggan, dan bagan akun."* (`/super-admin/master-tinjau`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Jejak Audit Sistem (Audit Trail)</h1>` → *"Catatan riwayat perubahan data, mutasi akun, dan aktivitas pengguna sistem."* (`/super-admin/audit-trail`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Pengaturan Media Halaman Login</h1>` → *"Kustomisasi gambar ilustrasi dan media latar belakang halaman login."* (`/super-admin/media-login`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Manajemen Pintasan Keyboard</h1>` → *"Kelola kombinasi tombol cepat keyboard untuk navigasi dan aksi cepat."* (`/super-admin/pintasan-keyboard`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Dasbor Anggota Tim</h1>` → *"Pantau proyek penugasan, status klaim pengeluaran, dan alokasi bagi hasil Anda."* (`/user/dashboard`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Pengajuan Pembayaran & Klaim Dana</h1>` → *"Ajukan pencairan dana pengeluaran operasional dan pantau proses verifikasi."* (`/user/pembayaran`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Profil Saya</h1>` → *"Ringkasan informasi identitas pengguna dan peran akses aktif dalam sistem."* (`/profil`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Deskripsi Judul Halaman** | `<h1>Pengaturan Profil & Akun</h1>` → *"Atur informasi identitas, foto profil, keamanan akun, dan preferensi notifikasi."* (`/pengaturan/profil`) | **Deskripsi Halaman Utama** (di bawah `<h1>` halaman). |
| **Keterangan Kecil KPI** | Subjudul `text-[11px] text-muted-foreground mt-1` pada seluruh kartu ringkasan KPI (misal: *"Tidak ada antrean pengajuan baru"*, *"0 dokumen invoice terbit"*, persentase delta sparkline) | **Keterangan Metrik KPI** (bukan deskripsi kartu data). |
| **Teks Empty State** | Pesan saat data kosong (misal: *"Belum ada transaksi jurnal"*, *"Belum ada dokumen PO vendor"*, *"Tidak ada antrean pengajuan"*) | **Empty State Konten** (kondisi data nol). |
| **Teks Bantuan Form** | Teks bantuan input/dialog (misal: *"Contoh: PT Altvira Solusi Teknologi"*, *"Format telepon diawali +62"*, panduan drag-and-drop upload gambar) | **Helper Text Formulir** (petunjuk pengisian field). |
| **Isi Baris Tabel / Label** | Seluruh data transaksi, nominal moneter, tanggal, status badge, dan nama vendor | **Data Transaksi** (data operasional murni). |

---

## 3. Analisis Komponen & Desain Arsitektur (Langkah 1 Butir 3)

### 3.1. Evaluasi Komponen GameDialog
- **Status Komponen Eksisting:**
  Komponen modal bawaan (`src/components/ui/dialog.tsx`) berbasis Radix UI dibangun khusus untuk modal formulir/konfirmasi di tengah layar (`top-1/2 left-1/2 -translate-y-1/2`), memiliki radius membulat besar (`rounded-2xl`), dan backdrop tebal.
- **Rancangan GameDialog (`src/components/shared/game-dialog.tsx`):**
  - **Bangun Sebagai Komponen Baru Bersama:** Dibuat satu pengelola dialog game terpadu (`GameDialogProvider` + singleton controller) menggunakan React Portal (`document.body`).
  - **Struktur HUD Gim:**
    - Sudut tegas (*crisp border*, `rounded-none` atau `rounded-xs`) dengan bingkai tipis dari token sistem (`border border-border/90 dark:border-border`).
    - Latar belakang token permukaan kartu (`bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xs`).
    - Tab label menempel di tepi atas kiri bingkai: ikon info `(i)` + Judul Kartu.
    - Tombol tutup (X) di sudut kanan atas dengan ukuran area sentuh minimal 40px (`min-w-[40px] min-h-[40px]`).
    - Penanda sudut segitiga dekoratif: ditiadakan (dibersihkan) agar tampilan tetap profesional, minimalis, dan tidak bising.
    - Posisi: Menempel di dasar area konten (`bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2`), lebar maksimal 720px (`w-[calc(100%-2rem)] max-w-[720px]`), dengan scroll internal halus jika teks deskripsi panjang.
  - **Perilaku & Animasi:**
    - Buka: Klik atau Enter/Space pada tombol ikon info. **Tidak muncul saat hover.**
    - Tooltip hover lama khusus ikon info pada `ChartCard` dihapus sepenuhnya.
    - Animasi Masuk: Naik dari bawah (`translateY(16px)` → `translateY(0)`) + fade in (220ms ease-out).
    - Animasi Keluar: Turun ke bawah (`translateY(0)` → `translateY(16px)`) + fade out (180ms ease-in), lalu komponen di-unmount dari DOM.
    - Preferensi Gerak: Mendukung `prefers-reduced-motion` (tanpa translasi vertikal, hanya fade singkat 150ms).
    - Tutup: Klik di luar dialog (overlay tipis tanpa blur berat), tombol X, atau tombol `Esc`.
    - State Machine: State `closed` → `entering` → `open` → `exiting`. Klik cepat berulang atau membuka dialog kartu lain saat dialog sebelumnya terbuka langsung mengalihkan konten secara mulus tanpa tumpang tindih (*zero glitch / zero flicker*).
    - Scroll Lock Aman: Scroll halaman di belakang tidak bergeser dan lebar scrollbar tidak melompat.
    - Aksesibilitas: `role="dialog"`, `aria-labelledby`, `aria-describedby`, fokus otomatis ke dialog/tombol tutup saat buka, dan mengembalikan fokus ke ikon info pemicu saat tutup.

### 3.2. Evaluasi Header Kartu Bersama
- **Status Komponen Eksisting:**
  - Saat ini terdapat 2 pola: `ChartCard` untuk kartu dasbor, dan `<CardHeader>` manual pada kartu tabel/form.
- **Rancangan Header Kartu Terstandar:**
  - Disediakan satu subkomponen / integrasi bersama `<CardHeaderWithInfo>` (atau opsi terintegrasi pada `<CardHeader title={...} description={...} controls={...} />` di `src/components/ui/card.tsx`).
  - **Spesifikasi Posisi Ikon Info:**
    - Pusat vertikal ikon info (i) **sejajar sempurna dengan pusat baris judul kartu** (toleransi 1 px).
    - Jarak horizontal seragam (`gap-2` atau `ml-2`).
    - Tombol ikon berupa `<button type="button">` tanpa margin vertikal, tinggi sama dengan `line-height` judul kartu.
    - Tanpa atribut `title` (tidak memicu tooltip jelek bawaan browser).
    - Memiliki atribut `aria-label` bilingual melalui i18n (`t("common.card_info", "Informasi {{title}}", { title })`).
    - Bila kartu tidak memiliki deskripsi (misal Buku Jurnal di `journals-page.tsx`), ikon info tidak dirender.
    - Aturan teks judul panjang: Judul memotong atau membungkus secara konsisten (`truncate min-w-0` pada judul, ikon info memiliki `shrink-0` sehingga tidak pernah terpotong atau terdesak keluar).

---

## 4. Perkiraan Daftar File yang Akan Diubah per Tahap

Sesuai aturan keras untuk mencatat daftar file sebelum memulai pengkodean:

### Tahap 2: Komponen Bersama & Percontohan (/admin/persetujuan)
1. `src/components/shared/game-dialog.tsx` — *File Baru:* Komponen dialog bergaya gim, overlay tipis, animasi CSS transform/opacity, trap fokus, dan state manager singleton.
2. `src/components/shared/card-header-with-info.tsx` (atau penyempurnaan `src/components/ui/card.tsx`) — *File Baru / Modifikasi:* Integrasi ikon info sejajar judul kartu dengan pemicu GameDialog.
3. `src/components/layout/portal-shell.tsx` — *Modifikasi:* Menempatkan host GameDialog di tingkat shell agar render via Portal terpusat dan mulus.
4. `src/features/payment-approvals/admin-approvals-page.tsx` — *Modifikasi:* Halaman percontohan penerapan ikon info + GameDialog pada kartu "Daftar Pengajuan Pembayaran Tim".
5. `src/locales/id/common.json` & `src/locales/en/common.json` — *Modifikasi:* Kunci aria-label aksesibilitas untuk tombol info kartu.

### Tahap 3.1: Migrasi Portal Admin / Bendahara (Satu Commit)
1. `src/components/shared/dashboard-chart-card.tsx` — *Modifikasi:* Integrasikan `ChartCard` dengan `GameDialog` (menghapus tooltip hover lama).
2. `src/features/master-data/admin-dashboard.tsx` — *Modifikasi:* Migrasi 5 ChartCard ke GameDialog.
3. `src/features/purchase-orders/po-page.tsx` — *Modifikasi:* Migrasi kartu PO Vendor.
4. `src/features/master-data/projects-page.tsx` — *Modifikasi:* Migrasi kartu Daftar Proyek Altvira.
5. `src/features/client-projects/tabs/milestones-tab.tsx` — *Modifikasi:* Migrasi 2 kartu termin & progres.
6. `src/features/client-projects/tabs/quotation-po-tab.tsx` — *Modifikasi:* Migrasi 2 kartu quotation & PO klien.
7. `src/features/client-projects/tabs/sow-spk-tab.tsx` — *Modifikasi:* Migrasi kartu SOW/SPK.
8. `src/features/client-projects/tabs/acceptance-docs-tab.tsx` — *Modifikasi:* Migrasi 3 kartu BAKP, UAT, BAST.
9. `src/features/invoicing/invoicing-page.tsx` — *Modifikasi:* Migrasi 3 kartu Invoice, Kuitansi, Quotation.
10. `src/features/budgeting/budget-page.tsx` — *Modifikasi:* Migrasi kartu Anggaran vs Realisasi.
11. `src/features/accounting/reports/income-statement-view.tsx` — *Modifikasi:* Migrasi kartu Laba Rugi.
12. `src/features/accounting/reports/balance-sheet-view.tsx` — *Modifikasi:* Migrasi kartu Neraca.
13. `src/features/accounting/reports/cash-flow-view.tsx` — *Modifikasi:* Migrasi kartu Arus Kas.
14. `src/features/accounting/reports/equity-statement-view.tsx` — *Modifikasi:* Migrasi kartu Perubahan Ekuitas.
15. `src/features/profit-sharing/profit-sharing-page.tsx` — *Modifikasi:* Migrasi 2 kartu skema & simulasi.
16. `src/features/master-data/parties/vendor-tab-content.tsx` — *Modifikasi:* Migrasi kartu Vendor.
17. `src/features/master-data/parties/customer-tab-content.tsx` — *Modifikasi:* Migrasi kartu Pelanggan.
18. `src/features/master-data/parties/product-service-tab-content.tsx` — *Modifikasi:* Migrasi kartu Katalog.
19. `src/features/master-data/coa-accounts-page.tsx` — *Modifikasi:* Migrasi kartu Bagan Akun.
20. `src/features/master-data/components/period-list-table.tsx` — *Modifikasi:* Migrasi kartu Periode Akuntansi.
21. `src/features/master-data/components/period-closing-table.tsx` — *Modifikasi:* Migrasi kartu Riwayat Tutup Buku.

### Tahap 3.2: Migrasi Portal Super Admin (Satu Commit)
1. `src/features/system-config/super-admin-dashboard.tsx` — *Modifikasi:* Migrasi 2 ChartCard dan kartu Jejak Audit.
2. `src/features/system-config/company-profile-page.tsx` — *Modifikasi:* Migrasi 4 kartu tab profil perusahaan.
3. `src/features/system-config/admin-settings-page.tsx` — *Modifikasi:* Migrasi 2 kartu format penomoran & counter.
4. `src/features/system-config/users-management-page.tsx` — *Modifikasi:* Migrasi kartu Pengguna Internal.
5. `src/features/system-config/master-readonly-page.tsx` — *Modifikasi:* Migrasi 4 kartu master readonly.
6. `src/features/system-config/audit-trail-page.tsx` — *Modifikasi:* Migrasi kartu Catatan Log Audit.
7. `src/features/system-config/login-media-page.tsx` — *Modifikasi:* Migrasi 2 kartu media login.
8. `src/features/system-config/shortcuts-management-page.tsx` — *Modifikasi:* Migrasi kartu Pintasan Keyboard.
9. `src/features/system-config/system-config-page.tsx` — *Modifikasi:* Migrasi kartu Sandbox Testing.

### Tahap 3.3: Migrasi Portal Team Member / User (Satu Commit)
1. `src/features/dashboard/user-dashboard.tsx` — *Modifikasi:* Migrasi 2 ChartCard dan 2 kartu tabel user.
2. `src/features/payment-approvals/user-payments-page.tsx` — *Modifikasi:* Migrasi kartu Pengajuan Pembayaran Saya.

### Tahap 3.4: Migrasi Halaman Bersama (Profil) & Portal Pembeli (Satu Commit)
1. `src/features/profile/profile-settings-page.tsx` — *Modifikasi:* Migrasi 4 kartu tab profil pengguna.
2. `src/features/buyer-portal/buyer-portal-page.tsx` — *Modifikasi (Tergantung Keputusan):* Migrasi kartu portal pembeli jika disetujui.

### Tahap Pengujian Komprehensif
1. `tests/unit/card-info-dialog.test.tsx` — *File Baru:* Pengujian otomatis cakupan (router traversal, deteksi kebocoran deskripsi kartu, verifikasi pengecualian judul halaman & KPI, interaksi buka/tutup, Escape, klik luar, a11y role & aria, prefers-reduced-motion, dan parity bilingual ID/EN).
2. `docs/render-check/dashboard/` — *File Gambar Baru:* Tangkapan layar bukti sebelum/sesudah render kartu & animasi GameDialog.

---

## 5. Daftar "Perlu Keputusanku: YA"

Berikut adalah poin-poin keputusan yang memerlukan arahan dan konfirmasi pengguna:

1. **Status 4 Kartu di Portal Pembeli Publik (`/portal-pembeli`):**
   - *Status:* **Perlu Keputusanku: YA**
   - *Konteks:* Halaman `/portal-pembeli` adalah portal publik eksternal tanpa autentikasi yang diakses oleh pembeli/klien Altvira untuk melacak status PO dan mengunduh berkas BAST.
   - *Pertanyaan:* Apakah 4 kartu di halaman ini juga ingin dipasangi ikon info + GameDialog, atau tetap mempertahankan teks deskripsi statis di bawah judul kartu agar pembeli eksternal langsung membaca petunjuk tanpa harus mengklik ikon info?
   - *Rekomendasi Sistem:* Tetap pertahankan teks statis di portal pembeli eksternal karena pengguna publik membutuhkan instruksi instan tanpa interaksi klik tambahan, sedangkan ikon info GameDialog diprioritaskan untuk seluruh portal internal (Admin, Super Admin, User, Profil).

2. **Format Teks Panjang di Dalam GameDialog:**
   - *Status:* **Perlu Keputusanku: YA**
   - *Konteks:* Sebagian kecil deskripsi (seperti pada mode Sandbox atau BAST) memiliki 2-3 kalimat.
   - *Rancangan Sistem:* Dialog dibatasi lebar maksimum 720px, tinggi maksimal konten `max-h-[36vh]` dengan `overflow-y-auto` berkas scrollbar halus tersembunyi, sehingga tidak pernah melebihi batas layar ponsel maupun desktop. Apakah batasan ini disetujui?

3. **Dekorasi Penanda Sudut Segitiga Kecil (Kanan Bawah):**
   - *Status:* **Perlu Keputusanku: YA**
   - *Konteks:* Instruksi menyebutkan: *"Penanda segitiga kecil di sudut kanan bawah hanya bila cocok dengan token (hiasan, tidak berfungsi); bila ramai, hilangkan dan catat."*
   - *Rekomendasi Sistem:* Ditiadakan/dihilangkan. Bingkai HUD tipis tegas (`border border-border/90`) dengan tab label atas sudah sangat mencerminkan struktur gim modern yang elegan tanpa membuat antarmuka ERP keuangan terlihat berantakan (*cluttered*).

4. **Efek Mengetik (*Typewriter Effect*):**
   - *Status:* **Perlu Keputusanku: YA**
   - *Konteks:* Sesuai instruksi: *"Tanpa ilustrasi karakter, tanpa font piksel, tanpa efek mengetik (catat opsi typewriter sebagai 'perlu keputusanku: ya')."*
   - *Rekomendasi Sistem:* Dinonaktifkan (teks deskripsi langsung tampil utuh seketika dialog fade-in). Efek typewriter pada aplikasi keuangan dapat memperlambat keterbacaan (*time-to-read*) pengguna.

5. **Aturan Judul Kartu Panjang (Truncate vs Wrap):**
   - *Status:* **Perlu Keputusanku: YA**
   - *Konteks:* Instruksi menyatakan: *"Ikon info tidak menggeser atau memotong judul panjang (judul membungkus atau terpotong dengan aturan yang sama di semua kartu; pilih satu aturan dan catat)."*
   - *Rancangan Sistem Terpilih:* Judul kartu menggunakan aturan **Truncate dengan Tooltip jika terpotong pada desktop (`truncate min-w-0`)**, dan tombol ikon info memiliki `shrink-0 ml-2` yang terkunci sejajar. Pada layar ponsel (<640px), judul kartu diizinkan membungkus (`break-words`) dengan baris baru tanpa menutupi tombol ikon info. Apakah aturan ini disetujui?

---
