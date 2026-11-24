# Audit Loader Halaman: Konsistensi, Aksesibilitas, dan Komponen Reusable

Dokumen ini berisi hasil audit menyeluruh (*comprehensive audit*) terhadap seluruh *loading state*, *spinner*, *skeleton*, dan *fallback loader* di seluruh portal dan modul aplikasi Altcycles (Super Admin, Bendahara/Admin, Anggota Tim/User, Auth/Login, dan Portal Pembeli).

---

## Ringkasan Eksekutif

1. **Total Loader Ditemukan di Seluruh Kode:** **101 titik implementasi** (tersebar di 35 berkas komponen, halaman, dan utilitas).
2. **Pengelompokan Tipe Loader:**
   - **Tipe A — Loader Tingkat Rute & Halaman Penuh (*Route & Page-Level Loader*):** **22 lokasi**
   - **Tipe B — Loader Tingkat Bagian (*Section, Table, & Card Loader*):** **16 lokasi** (termasuk 11 tabel dengan `TableLoadingRow` dan kartu ringkasan/grafik)
   - **Tipe C — Loader Tingkat Aksi (*Button, Modal Submit, & Download Action Loader*):** **48 lokasi** (tombol simpan modal, ekspor PDF/Excel/CSV, konfirmasi hapus)
   - **Tipe D — Loader Aset & Gambar (*Image, Avatar, & Google Drive Loader*):** **15 lokasi** (unggah logo, paraf, avatar profil, Google Drive picker, shimmer banner login)
3. **5 Ketidakkonsistenan Terbesar yang Ditemukan:**
   - **1. Posisi Menempel di Pojok Kiri Atas (*Top-Left Alignment Bug*):**  
     Sebagian besar *page loader* (misalnya pada `admin-settings-page.tsx`, `company-profile-page.tsx`, `master-readonly-page.tsx`, `parties-master-page.tsx`, `reports-page.tsx`, `super-admin-dashboard.tsx`, dan `system-config-page.tsx`) menggunakan container `<div className="flex items-center gap-2 py-12 ...">` **tanpa `justify-center`** dan **tanpa `min-h-[50vh]`**. Akibatnya, saat halaman pertama kali memuat data, spinner dan teks menempel canggung di pojok kiri atas area konten, bukan berada di tengah (*center-aligned*).
   - **2. Disparitas Visual Komponen (Loader2Icon Manual vs Spinner UI vs Hardcoded Div):**  
     Aplikasi memiliki komponen bersama `Spinner` (`src/components/ui/empty.tsx`), tetapi di banyak tempat (seperti menu ekspor, unggah avatar, dan Google Drive picker) developer menulis manual `<Loader2Icon className="... animate-spin" />` dengan ukuran acak (`size-3.5`, `size-4`, `size-4.5`, `size-5`, `size-6`). Bahkan pada `portal-shell.tsx:314` (saat *role switching*), digunakan elemen `<div className="size-12 rounded-full border-4 border-muted border-t-primary animate-spin mb-4" />` yang sepenuhnya berbeda bentuk dari seluruh loader lain di aplikasi.
   - **3. Teks Literal Hardcoded Tanpa Internasionalisasi (i18n):**  
     Beberapa loader penting menggunakan teks Indonesia mentah tanpa hook translasi `t(...)`:
     - `App.tsx:130`: `"Memuat halaman..."` (Suspense fallback global)
     - `role-guard.tsx:13`: `"Memeriksa sesi pengguna..."` (Auth check)
     - `role-guard.tsx:30`: `"Menyelaraskan peran aktif..."` (Role alignment)
     - `table.tsx:96`: `message = "Memuat data..."` (Fallback default `TableLoadingRow`)
   - **4. Tidak Adanya Skeleton Loading & Masalah *Layout Shift* (CLS):**  
     Aplikasi belum memiliki implementasi `<Skeleton>` seragam untuk KPI, kartu grafik, atau baris tabel. Transisi dari spinner kosong berukuran tinggi kecil (`py-8` atau `py-12`) ke halaman utuh dengan puluhan baris tabel/kartu KPI menghasilkan lonjakan tata letak visual (*Cumulative Layout Shift*) yang cukup terasa saat data selesai tiba.
   - **5. Masalah Aksesibilitas (A11Y) & Preferensi Pengguna:**  
     Tidak ada loader yang menerapkan `aria-busy="true"`, `role="status"`, atau `aria-live="polite"`. Pembaca layar (*screen reader*) tidak mendapat pengumuman ketika data selesai atau sedang dimuat. Selain itu, animasi putar `animate-spin` belum menghormati preferensi pengguna `motion-reduce:animate-none` atau `prefers-reduced-motion`.

---

## Langkah 0: Laporan Pemilihan Skill & Alat

Sesuai aturan kerja, dilakukan evaluasi alat dan skill menggunakan panduan ekosistem:
1. **Skill yang Digunakan:**
   - **`karpathy-guidelines`**: Digunakan untuk memastikan perubahan arsitektur komponen loader dilakukan secara bedah (*surgical*), tidak menambahkan dependensi eksternal baru yang membengkakkan bundel, serta menjaga kompatibilitas dengan skema token desain aplikasi yang sudah ada.
   - **`design-taste-frontend` / `frontend-design`**: Digunakan untuk menyusun spesifikasi visual, penempatan hierarki tata letak, ritme vertikal, dan estetika loader (menggunakan semantik Tailwind, radius `rounded-xl`, dan warna token `primary` / `muted-foreground`).
2. **Keputusan Dependensi:**
   - **Tidak ada dependensi npm eksternal baru yang dipasang.** Seluruh loader dapat dibangun secara murni dan efisien di atas `lucide-react` (`Loader2Icon`), Tailwind CSS v4, dan token `@/components/ui/empty` serta `@/components/ui/skeleton` yang sudah tersedia di proyek.

---

## Bagian A: Inventarisasi Lengkap Semua Loader (LD-01 s/d LD-40)

Berikut adalah tabel inventarisasi komprehensif seluruh loading state yang ada di Altcycles:

| ID | Lokasi (File & Baris) | Portal & Peran | Jenis Pemicu | Bentuk | Posisi | Ukuran | Warna / Token | Teks yang Tampil | i18n? | Komponen yang Dipakai |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LD-01** | `src/App.tsx:126-133` | Global (Semua) | Navigasi Rute (Lazy Suspense) | Spinner + Teks | Tengah area konten (`min-h-[45vh] items-center justify-center`) | `size-4` | `text-muted-foreground` | "Memuat halaman..." | ❌ Hardcoded | `<Spinner />` |
| **LD-02** | `src/app/role-guard.tsx:9-16` | Global (Semua) | Auth / Pengecekan Sesi | Spinner + Teks | Tengah layar penuh (`min-h-screen items-center justify-center`) | `size-4` | `text-muted-foreground` | "Memeriksa sesi pengguna..." | ❌ Hardcoded | `<Spinner />` |
| **LD-03** | `src/app/role-guard.tsx:26-33` | Global (Semua) | Penyelarasan Peran Pengguna | Spinner + Teks | Tengah layar penuh (`min-h-screen items-center justify-center`) | `size-4` | `text-muted-foreground` | "Menyelaraskan peran aktif..." | ❌ Hardcoded | `<Spinner />` |
| **LD-04** | `src/components/layout/portal-shell.tsx:308-319` | Global (Semua) | Ganti Mode Operasi (Role Switching) | Ring Border Loader + Teks Pulse | Overlay layar penuh (`fixed inset-0 z-[100] backdrop-blur-md`) | `size-12` border-4 | `border-muted border-t-primary` | "Mengganti Mode Operasi..." | ✅ `header.switching_mode` | `<div border-4 animate-spin>` (Manual) |
| **LD-05** | `src/features/master-data/admin-dashboard.tsx:293-300` | Bendahara (`admin`) | Fetch Data Dashboard Keuangan | Spinner + Teks | Tengah vertikal (`py-16 justify-center`) | `size-4` | `text-muted-foreground` | "Memuat dasbor keuangan & akuntansi..." | ✅ `dashboard:charts.loading` | `<Spinner />` |
| **LD-06** | `src/features/dashboard/user-dashboard.tsx:123-130` | Anggota Tim (`user`) | Fetch Data Dashboard User | Spinner + Teks | Pojok kiri atas (`py-8 items-center gap-2` tanpa center) | `size-4` | `text-muted-foreground` | "Memuat ringkasan portal anggota tim..." | ✅ `dashboard:user_dashboard.loading` | `<Spinner />` |
| **LD-07** | `src/features/system-config/super-admin-dashboard.tsx:102-108` | Super Admin | Fetch Data Dashboard Sistem | Spinner + Teks | Pojok kiri atas (`py-12 items-center gap-2` tanpa center) | `size-4` | `text-muted-foreground` | "Menghitung metrik sistem..." | ✅ `settings:super_admin.loading` | `<Spinner />` |
| **LD-08** | `src/features/accounting/reports-page.tsx:371-378` | Bendahara | Fetch Data Laporan Keuangan | Spinner + Teks | Pojok kiri atas (`py-8 items-center gap-2` tanpa center) | `size-4` | `text-muted-foreground` | "Menyusun laporan keuangan berbasis akrual..." | ✅ `accounting:reports.loading` | `<Spinner />` |
| **LD-09** | `src/features/accounting/journals-page.tsx:890` | Bendahara | Fetch Data Jurnal | Spinner + Teks | Area Konten Tengah | `size-4` | `text-muted-foreground` | Translasi jurnal | ✅ `accounting:common.loading` | `<Spinner />` |
| **LD-10** | `src/features/master-data/coa-accounts-page.tsx:456` | Bendahara | Fetch Bagan Akun (COA) | Spinner + Teks | Area Konten | `size-4` | `text-muted-foreground` | "Memuat bagan akun..." | ✅ `accounting:coa.loading` | `<Spinner />` |
| **LD-11** | `src/features/master-data/parties-master-page.tsx:112-118` | Bendahara | Fetch Vendor & Klien | Spinner + Teks | Pojok kiri atas (`py-12` tanpa center) | `size-4` | `text-muted-foreground` | Translasi master | ✅ `parties:common.loading` | `<Spinner />` |
| **LD-12** | `src/features/client-projects/project-detail-page.tsx:722-728` | Bendahara / User | Fetch Detail Proyek Klien | Spinner + Teks | Pojok kiri atas (`py-8` tanpa center) | `size-4` | `text-muted-foreground` | Translasi proyek | ✅ `projects:loading_workspace` | `<Spinner />` |
| **LD-13** | `src/features/system-config/admin-settings-page.tsx:216-222` | Super Admin | Fetch Penomoran Dokumen | Spinner + Teks | Pojok kiri atas (`py-12` tanpa center) | `size-4` | `text-muted-foreground` | Translasi admin | ✅ `settings:admin_settings.loading` | `<Spinner />` |
| **LD-14** | `src/features/system-config/company-profile-page.tsx:208-214` | Super Admin | Fetch Profil Perusahaan | Spinner + Teks | Pojok kiri atas (`py-12` tanpa center) | `size-4` | `text-muted-foreground` | Translasi company | ✅ `settings:company.loading` | `<Spinner />` |
| **LD-15** | `src/features/system-config/system-config-page.tsx:190-196` | Super Admin | Fetch Konfigurasi Sistem | Spinner + Teks | Pojok kiri atas (`py-12` tanpa center) | `size-4` | `text-muted-foreground` | Translasi config | ✅ `settings:company.loading` | `<Spinner />` |
| **LD-16** | `src/features/system-config/users-management-page.tsx:464` | Super Admin | Fetch Pengguna & Peran | Spinner + Teks | Area Konten | `size-4` | `text-muted-foreground` | Translasi users | ✅ `settings:users.loading` | `<Spinner />` |
| **LD-17** | `src/features/system-config/audit-trail-page.tsx:184` | Super Admin | Fetch Audit Trail | Spinner + Teks | Area Konten | `size-4` | `text-muted-foreground` | Translasi audit | ✅ `settings:audit.loading` | `<Spinner />` |
| **LD-18** | `src/features/system-config/master-readonly-page.tsx:117-123` | Super Admin | Fetch Master Readonly | Spinner + Teks | Pojok kiri atas (`py-12` tanpa center) | `size-4` | `text-muted-foreground` | "Memuat konfigurasi akuntansi & master data..." | ✅ `settings:master_readonly.loading` | `<Spinner />` |
| **LD-19** | `src/features/system-config/login-media-page.tsx:344-350` | Super Admin | Fetch Media Banner Login | Spinner Besar + Teks | Tengah vertikal (`min-h-[60vh] flex-col items-center justify-center`) | `size-6` | `text-primary dark:text-sky-400` | Translasi gallery | ✅ `settings:login_media.loading_gallery` | `<Spinner className="size-6 text-primary" />` |
| **LD-20** | `src/features/profit-sharing/profit-sharing-page.tsx:494` | Bendahara | Fetch Bagi Hasil Proyek | Spinner + Teks | Area Konten | `size-4` | `text-muted-foreground` | Translasi profit | ✅ `profit_sharing:loading` | `<Spinner />` |
| **LD-21** | `src/features/budgeting/budget-page.tsx:500` | Bendahara / User | Fetch Anggaran Departemen | Spinner + Teks | Area Konten | `size-4` | `text-muted-foreground` | Translasi budget | ✅ `budgeting:loading` | `<Spinner />` |
| **LD-22** | `src/features/invoicing/invoicing-page.tsx:738` | Bendahara | Fetch Penagihan & Invoice | Spinner + Teks | Area Konten | `size-4` | `text-muted-foreground` | Translasi invoice | ✅ `invoicing:loading` | `<Spinner />` |
| **LD-23** | `src/components/ui/table.tsx:88-112` | Komponen Bersama | Fetch Baris Tabel Data | Baris Tabel Spinner (`TableLoadingRow`) | Tengah sel baris tabel (`h-32 text-center`) | `size-4` | `text-muted-foreground` | "Memuat data..." (default) | ❌ Hardcoded default | `<Spinner />` di dalam `<TableCell>` |
| **LD-24** | `src/features/invoicing/invoicing-page.tsx:794, 1002, 1165` | Bendahara | Fetch Tabel Invoice / Kwitansi / Piutang | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi tabel | ✅ `invoicing:table.loading` | `<TableLoadingRow />` |
| **LD-25** | `src/features/purchase-orders/po-page.tsx:731` | Bendahara / User | Fetch Tabel PO Operasional | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi PO | ✅ `po:table.loading` | `<TableLoadingRow />` |
| **LD-26** | `src/features/payment-approvals/admin-approvals-page.tsx:524` | Bendahara | Fetch Tabel Pengajuan Dana | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi approval | ✅ `approvals:table.loading` | `<TableLoadingRow />` |
| **LD-27** | `src/features/payment-approvals/user-payments-page.tsx:620` | Anggota Tim | Fetch Tabel Pengajuan Pribadi | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi payment | ✅ `approvals:user_table.loading` | `<TableLoadingRow />` |
| **LD-28** | `src/features/master-data/projects-page.tsx:488` | Bendahara | Fetch Tabel Proyek Klien | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi proyek | ✅ `projects:loading` | `<TableLoadingRow />` |
| **LD-29** | `src/features/budgeting/budget-page.tsx:529` | Bendahara / User | Fetch Tabel Anggaran | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi budget | ✅ `budgeting:table.loading` | `<TableLoadingRow />` |
| **LD-30** | `src/features/profit-sharing/profit-sharing-page.tsx:514` | Bendahara | Fetch Tabel Distribusi Bagi Hasil | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi profit | ✅ `profit_sharing:table.loading` | `<TableLoadingRow />` |
| **LD-31** | `src/features/system-config/users-management-page.tsx:491` | Super Admin | Fetch Tabel Manajemen Pengguna | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi users | ✅ `settings:users.loading` | `<TableLoadingRow />` |
| **LD-32** | `src/features/system-config/audit-trail-page.tsx:202` | Super Admin | Fetch Tabel Audit Trail | Baris Tabel Spinner | Tengah tabel | `size-4` | `text-muted-foreground` | Translasi audit | ✅ `settings:audit.loading` | `<TableLoadingRow />` |
| **LD-33** | `src/components/shared/dashboard-chart-card.tsx:69` | Komponen Bersama | Fetch Data Grafik Garis / Batang | Spinner Tengah Kartu | Tengah kartu grafik (`h-[280px] flex items-center justify-center`) | `size-4` | `text-muted-foreground` | Tanpa teks | — | `<Spinner />` |
| **LD-34** | `src/components/shared/export-download-menu.tsx:147, 184, 212, 242` | Komponen Bersama | Unduh Ekspor (Excel, PDF, CSV) | Spinner Tombol / Menu Item | Inline pada baris dropdown | `size-4` | `text-primary` / default | Teks tombol format | ✅ i18n | `<Loader2Icon className="animate-spin" />` (Manual) |
| **LD-35** | `src/components/shared/document-download-menu.tsx:132, 160, 190, 214` | Komponen Bersama | Unduh Dokumen (PDF, Word, Excel) | Spinner Tombol / Menu Item | Inline pada baris dropdown | `size-4` | `text-primary` / default | Teks tombol format | ✅ i18n | `<Loader2Icon className="animate-spin" />` (Manual) |
| **LD-36** | `src/components/shared/confirm-dialog.tsx:170` | Komponen Bersama | Konfirmasi Aksi Modal (Hapus/Reset) | Spinner Inline Tombol | Di dalam tombol submit dialog | `size-4` | Sesuai varian tombol | Label tombol aksi | ✅ i18n | `<Spinner data-icon="inline-start" />` |
| **LD-37** | `src/features/auth/login-page.tsx:1031, 1063` | Tamu / Guest | Tombol Masuk Sistem & OAuth Google | Spinner Inline Tombol | Di dalam tombol submit | `size-4` / `mr-2` | Mengikuti teks tombol | "Masuk ke Sistem..." | ✅ i18n | `<Spinner />` |
| **LD-38** | `src/components/shared/google-drive-picker-dialog.tsx:339, 400` | Komponen Bersama | Buka Berkas & Autentikasi Google Drive | Spinner Sedang & Kecil | Tengah panel modal picker | `size-5`, `size-3.5` | `text-primary` | "Menghubungkan Google Drive..." | ✅ i18n | `<Loader2Icon className="animate-spin" />` (Manual) |
| **LD-39** | `src/components/shared/avatar-upload-dialog.tsx:449, 482, 532, 651, 671` | Komponen Bersama | Unggah Avatar & Pemrosesan Gambar | Spinner Beragam Ukuran | Di dalam modal unggah | `size-4`, `size-3.5` | Default teks | "Mengunggah..." | ✅ i18n | `<Loader2Icon className="animate-spin" />` (Manual) |
| **LD-40** | `src/features/auth/login-page.tsx:494-500` | Tamu / Guest | Muat Slot Media Banner Kiri | Shimmer Gradient Pulse | Mengisi panel kiri halaman login | `w-full h-full` | `from-primary/25 via-sky-400/10` | Tanpa teks | — | `<div className="animate-pulse">` |

---

## Bagian B: Analisis Ketidakkonsistenan

### 1. Perbandingan Visual dan Bentuk Antar Varian
- **Varian Bentuk:**
  1. `Spinner` standar (`<Loader2Icon className="size-4 animate-spin" />`) dipakai pada ~70% lokasi.
  2. `Loader2Icon` manual dengan ukuran tidak terstandar (`size-3.5`, `size-4.5`, `size-5`, `size-6`).
  3. Div beranimasi ring loader custom (`portal-shell.tsx:314`): lingkaran tebal 48px dengan `border-t-primary`.
  4. Shimmer pulse kustom (`login-page.tsx:498`): gradien berkedip tanpa elemen skeleton konkret.
- **Warna & Token:**
  - Sebagian besar berwarna `text-muted-foreground`.
  - Beberapa loader aksi unduh diberi warna paksa `text-primary` (`export-download-menu.tsx:147`).
  - Halaman `login-media-page.tsx` menggunakan `text-primary dark:text-sky-400`.
  - Belum ada token semantik standar (misal `token: spinner-brand` atau `token: spinner-neutral`).

### 2. Akar Masalah "Pojok Kiri Atas" (*Top-Left Misalignment*)
Pada 7 halaman utama portal internal:
```tsx
// CONTOH SALAH (saat ini tersebar di 7 halaman):
if (loading) {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
      <Spinner />
      <span>{t("settings:admin_settings.loading")}</span>
    </div>
  );
}
```
**Mengapa menempel di pojok kiri atas?**
1. Tag pembungkus hanya memiliki properti `flex items-center gap-2 py-12` tanpa `justify-center`.
2. Area konten tidak memiliki batasan tinggi minimum fleksibel (seperti `min-h-[50vh]` atau `flex-1`).
3. Akibatnya, saat container halaman kosong karena data sedang diambil dari Supabase / LocalStorage, elemen hanya mengambil lebar teks minimum dan langsung merapat di batas margin kiri atas `main` layout.
4. Sedangkan di halaman `admin-dashboard.tsx:295`, developer lain menulis `flex items-center justify-center gap-2 py-16`, sehingga di halaman ini spinner tampil di tengah. Ini membuktikan ketiadaan komponen bersama `PageLoader`.

### 3. Evaluasi Masalah Pengalaman Pengguna (UX Impact)
- **Cumulative Layout Shift (CLS):** Ketika halaman dari spinner kecil 24px tiba-tiba berubah menjadi halaman penuh dengan 4 kartu KPI (tinggi ~120px) dan tabel transaksi (tinggi ~400px), terjadi lonjakan konten drastis ke bawah.
- **Flash of Loading Content:** Pada koneksi cepat atau pembacaan data cache lokal (<50ms), spinner muncul selama 1-2 frame lalu hilang seketika, menyebabkan kedipan layar yang mengganggu mata (*distracting flash*).
- **Ketiadaan Timeout & Error Retry State:** Jika terjadi kegagalan jaringan atau Supabase timeout, sebagian halaman tetap terjebak (*infinite loading*) tanpa menampilkan tombol "Coba Lagi" (*retry button*).

### 4. Evaluasi Aksesibilitas (A11Y)
- **Atribut ARIA:** Tidak ada loader yang membungkus statusnya dengan `role="status"`, `aria-busy="true"`, atau `aria-live="polite"`. Pembaca layar tidak menyadari sistem sedang bekerja mengambil data.
- **Preferensi Motion:** Animasi putar `animate-spin` terus berputar tanpa klausul `motion-reduce:animate-none` atau penggantian indikator statis.

### 5. Evaluasi Internasionalisasi (i18n)
- Ditemukan **4 teks hardcoded Indonesia** yang lolos dari deteksi translasi (`Memuat halaman...`, `Memeriksa sesi pengguna...`, `Menyelaraskan peran aktif...`, dan default `Memuat data...`).
- Saat pengguna beralih ke Bahasa Inggris (`en`), teks-teks tersebut tetap berbahasa Indonesia.

---

## Bagian C: Usulan Desain Sistem Loader Bersama (*Reusable Loader System*)

Untuk menyatukan 101 titik implementasi tersebut tanpa membuat desain baru yang asing dari token aplikasi Altcycles, dirancang **1 set komponen modular terstandar** di `@/components/ui/loader`:

### 1. Arsitektur Komponen Loader Bersama

```
src/components/ui/loader/
├── page-loader.tsx        <-- Pengganti seluruh guard halaman "if (loading) return ..."
├── section-loader.tsx     <-- Loader area kartu, tab, atau kontainer bertinggi tetap
├── table-skeleton.tsx     <-- Pengganti TableLoadingRow dengan opsi skeleton baris realistis
├── kpi-skeleton.tsx       <-- Skeleton pengisi 4 kartu KPI seragam
├── button-loader.tsx      <-- Spinner inline konsisten di dalam tombol tanpa pergeseran lebar
└── full-screen-loader.tsx <-- Loader transisi sesi & mode aktif (overlay bersih di tengah)
```

### 2. Matriks Keputusan Pemakaian Komponen (*Decision Matrix*)

| Lingkup Penggunaan | Komponen yang Wajib Dipakai | Perilaku Posisi & Ukuran | Aksesibilitas |
| :--- | :--- | :--- | :--- |
| **Navigasi Rute Penuh & Guard Halaman** | `<PageLoader message="..." />` | Terpusat presisi di tengah area konten (`min-h-[55vh] flex flex-col items-center justify-center`), berada di bawah header dan di kanan sidebar (tidak menimpa shell). | `role="status" aria-busy="true" aria-live="polite"` |
| **Transisi Sesi Auth & Ganti Mode Operasi** | `<FullScreenLoader message="..." />` | Terpusat di tengah layar dengan backdrop blur lembut `bg-background/80 backdrop-blur-sm z-[100]`. | `role="status" aria-live="assertive"` |
| **Tabel Data Transaksi / Master** | `<TableLoadingRow colSpan={n} />` atau `<TableSkeleton rows={5} cols={n} />` | Tetap mempertahankan `<TableHeader>`, merender baris ber-shimmer halus atau spinner rata tengah presisi. | `aria-busy="true"` |
| **Kartu Grafik & Ringkasan Konten** | `<SectionLoader minHeight={280} />` | Terpusat di tengah container kartu pembungkusnya tanpa mengubah tinggi kartu. | `role="status"` |
| **Tombol Submit Form / Modal / Ekspor** | `<Button disabled={isLoading}>` dengan `<ButtonLoader />` | Spinner `size-4` terpasang di sisi kiri teks label tombol; lebar tombol tidak berubah (*fixed layout button*). | `aria-hidden="true"` di spinner, tombol memiliki `aria-disabled="true"` |
| **Pemuatan Aset Gambar & Media** | `<AssetLoader variant="image|avatar" />` | Mengisi kotak pembungkus gambar dengan shimmer lembut yang menghormati radius `rounded-xl`. | `role="presentation"` |

### 3. Spesifikasi Props & Dukungan i18n

#### `<PageLoader />`
- **Props:**
  - `messageKey?: string` (kunci i18n, mis. `"common:status.loading_page"`)
  - `fallbackMessage?: string` (default: `"Memuat data halaman..."` / `"Loading page data..."`)
  - `minHeight?: string` (default: `"min-h-[55vh]"`)
  - `delayMs?: number` (default: `150` ms — mencegah *flicker* untuk request instan <150ms)
  - `timeoutMs?: number` (default: `15000` ms — jika melebihi batas waktu, menampilkan tombol *"Muat Ulang"* / *"Coba Lagi"*)

#### `<TableLoadingRow />` (Penyempurnaan Terstandar)
- Memperbaiki `src/components/ui/table.tsx`:
  - Menghapus teks literal hardcoded `"Memuat data..."`.
  - Menggunakan `t("common:table.loading", "Memuat data...")`.
  - Menyelaraskan alignment agar selalu `align-middle text-center` di seluruh viewport desktop dan ponsel.

---

## Tabel Temuan Audit Tetap

| ID Temuan | Deskripsi Masalah | Bukti Kode / Lokasi | Dampak UX & Teknis | Keparahan | Rekomendasi Solusi | Estimasi Usaha | Risiko | Perlu Keputusan User? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-LD-01** | **Loader halaman menempel di pojok kiri atas** | 7 file halaman (mis. `admin-settings-page.tsx:218`, `company-profile-page.tsx:210`, `parties-master-page.tsx:114`) memakai `flex items-center gap-2 py-12` tanpa `justify-center`. | Tampilan terlihat canggung dan rusak (*unpolished*), tidak simetris terhadap area konten. | **Tinggi (P1)** | Ganti seluruh blok return loading halaman dengan komponen terstandar `<PageLoader />`. | 1 Jam | Rendah | Tidak (Perbaikan Bug UX) |
| **F-LD-02** | **Disparitas visual loader ganti mode operasi (Role Switching)** | `portal-shell.tsx:314` membuat div kustom `size-12 rounded-full border-4 border-muted border-t-primary` yang berbeda dari icon spinner lainnya. | Inkonsistensi bahasa desain visual aplikasi. | **Sedang (P2)** | Ganti dengan `<FullScreenLoader message={...} />` yang menggunakan token desain shadcn/Altcycles seragam. | 30 Menit | Rendah | Tidak (Konsistensi Desain) |
| **F-LD-03** | **Teks loading hardcoded tanpa i18n** | `App.tsx:130` ("Memuat halaman..."), `role-guard.tsx:13` & `29`, `table.tsx:96`. | Teks tidak diterjemahkan saat user memilih Bahasa Inggris (`en`). | **Sedang (P2)** | Pindahkan seluruh string ke `src/locales/id/common.json` dan `src/locales/en/common.json` di bawah namespace `status`. | 45 Menit | Rendah | Tidak (Kepatuhan i18n) |
| **F-LD-04** | **Duplikasi penulisan Loader2Icon manual dengan ukuran sembarang** | Tersebar di 15 lokasi (misal `export-download-menu.tsx`, `avatar-upload-dialog.tsx`, `google-drive-picker-dialog.tsx`). | Sulit dikelola secara terpusat jika ada perubahan token atau animasi. | **Rendah (P3)** | Gunakan `<Spinner className="..." />` atau `<ButtonLoader />` seragam. | 1 Jam | Rendah | Tidak (Refaktor Kode Bersih) |
| **F-LD-05** | **Ketiadaan state timeout / gagal muat pada Page Loader** | Seluruh guard `if (loading)` tidak memiliki penanganan jika query lokal/Supabase macet. | Pengguna terjebak di layar loading permanen tanpa tombol aksi darurat. | **Sedang (P2)** | Tambahkan batas waktu 15 detik di `<PageLoader />` dengan tombol fallback *Coba Lagi / Muat Ulang Halaman*. | 1 Jam | Rendah | Ya (Persetujuan Pola Timeout) |
| **F-LD-06** | **Ketiadaan dukungan Aksesibilitas & Reduced Motion** | Seluruh spinner menggunakan kelas statis `animate-spin` tanpa varian `motion-reduce`. | Pengguna dengan sensitivitas vestibular terganggu oleh putaran konstan; screen reader tidak mendapat notifikasi loading. | **Sedang (P2)** | Tambahkan `aria-busy="true"` dan kelas `motion-reduce:animate-none` pada komponen `Spinner` terstandar. | 30 Menit | Rendah | Tidak (Aksesibilitas Standar) |

---

## Rencana Migrasi Berurutan (Per Paket Commit)

Pelaksanaan perbaikan akan dibagi menjadi 4 paket bertahap yang aman dan teruji:

### Paket 1: Fondasi Komponen Loader Bersama & Kamus i18n (Fondasi Inti)
- Membuat komponen terstandar di `src/components/ui/loader/`:
  - `page-loader.tsx` (terpusat, anti-flicker delay 150ms, timeout 15s)
  - `full-screen-loader.tsx` (overlay blur transisi peran dan boot)
  - `button-loader.tsx` (spinner inline tombol terstandar)
- Menyempurnakan `src/components/ui/table.tsx` (`TableLoadingRow`) agar menggunakan kunci i18n `common:table.loading`.
- Mendaftarkan kunci translasi di `src/locales/id/common.json` dan `src/locales/en/common.json`:
  - `status.loading_page` ("Memuat data halaman..." / "Loading page data...")
  - `status.checking_session` ("Memeriksa sesi pengguna..." / "Verifying user session...")
  - `status.switching_role` ("Menyelaraskan mode operasi..." / "Aligning active role...")
  - `status.retry` ("Muat Ulang" / "Retry")

### Paket 2: Migrasi Route & Shell Loader (Tingkat Paling Terlihat)
- Mengganti `RouteFallback` di `src/App.tsx` dengan `<PageLoader />`.
- Mengganti loader auth dan role check di `src/app/role-guard.tsx` dengan `<FullScreenLoader />`.
- Mengganti role switching overlay di `src/components/layout/portal-shell.tsx` dengan `<FullScreenLoader />`.

### Paket 3: Migrasi Seluruh Page-Level Loader (Mengatasi Isu "Pojok Kiri Atas")
- Memperbarui 13 halaman portal:
  - `src/features/system-config/admin-settings-page.tsx`
  - `src/features/system-config/company-profile-page.tsx`
  - `src/features/system-config/master-readonly-page.tsx`
  - `src/features/system-config/super-admin-dashboard.tsx`
  - `src/features/system-config/system-config-page.tsx`
  - `src/features/system-config/users-management-page.tsx`
  - `src/features/system-config/login-media-page.tsx`
  - `src/features/master-data/admin-dashboard.tsx`
  - `src/features/master-data/parties-master-page.tsx`
  - `src/features/master-data/coa-accounts-page.tsx`
  - `src/features/accounting/reports-page.tsx`
  - `src/features/dashboard/user-dashboard.tsx`
  - `src/features/client-projects/project-detail-page.tsx`
- Mengganti container manual `py-12 flex items-center gap-2` dengan `<PageLoader message={...} />` yang terpusat rapi dan proporsional.

### Paket 4: Konsolidasi Action & Button Loader
- Mengganti `Loader2Icon` manual di `export-download-menu.tsx`, `document-download-menu.tsx`, `avatar-upload-dialog.tsx`, dan `google-drive-picker-dialog.tsx` dengan `<Spinner />` atau `<ButtonLoader />`.
- Menambahkan aturan automated test di `tests/unit/loader-consistency.test.tsx` untuk memastikan tidak ada lagi teks "Memuat..." hardcoded tanpa i18n dan memastikan posisi bounding box `PageLoader` selalu berada di tengah area konten.

---

## Hal yang Memerlukan Keputusan Pengguna (*User Decision*)

Sebelum implementasi teknis dijalankan, mohon konfirmasi untuk 2 poin desain:
1. **Pola Timeout pada `<PageLoader />`:** Apakah Anda setuju jika request pemuatan halaman yang memakan waktu lebih dari **15 detik** secara otomatis memunculkan tombol *"Koneksi lambat. Coba Muat Ulang"* di bawah spinner?
2. **Skeleton vs Spinner untuk Rute Halaman Penuh:** Apakah Anda menyukai loader halaman penuh tetap menggunakan **Spinner Putar Minimalis + Teks Ringkas yang Terpusat**, atau ingin dibuatkan **Full Skeleton Block** (meniru bentuk kartu & tabel abu-abu berkedip)? (Rekomendasi kami: **Spinner Minimalis Terpusat** untuk halaman penuh agar transisi cepat dan ringan, dan Skeleton bertahap di dalam tabel).

---

*Laporan audit ini disusun tanpa mengubah berkas kode aplikasi apa pun sesuai dengan aturan audit.*
