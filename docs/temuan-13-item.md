# Dokumen Audit, Diagnosis, dan Usulan Teknis: 13 Perbaikan & Fitur Altcycles (Tahap 0)

> **Status Dokumen:** TAHAP 0 — AUDIT DAN USULAN (Tanpa Perubahan Kode Sumber)  
> **Tanggal Audit:** 25 November 2026  
> **Aturan Keras:** Tidak ada berkas kode sumber, skema database, lockfile, atau konfigurasi yang diubah pada tahap ini. Seluruh perubahan skema database dan daftar berkas per kelompok menunggu persetujuan pemilik proyek (`perlu keputusanku: ya`).

---

## Langkah 0: Pemilihan Skill & Tool Pendukung

Berdasarkan penelusuran katalog skill menggunakan **`find-skills`** (`.agents/skills/find-skills/SKILL.md`), berikut adalah skill yang dipilih untuk memandu pelaksanaan 13 item tanpa menambah dependensi baru ke proyek:

| No | Skill yang Dipakai | Lokasi Skill | Alasan Pemilihan & Cakupan Tugas | Mengubah Dependensi? |
| :-: | :--- | :--- | :--- | :-: |
| 1 | **`react-best-practices`** / **`vercel-react-best-practices`** | `C:\Users\ASUS\.gemini\config\plugins\vercel-plugin\skills\react-best-practices\SKILL.md` | Memandu diagnosis dan optimasi performa (Item 9): eliminasi network waterfall, deduplikasi request SWR, paginasi sisi server, pengurangan re-render akibat interval/state global, dan lazy loading aset. | **Tidak** |
| 2 | **`web-design-guidelines`** & **`ui-ux-pro-max`** | `.agents/skills/web-design-guidelines/SKILL.md` & `.agents/skills/ui-ux-pro-max/SKILL.md` | Memandu audit konsistensi UI/UX (Item 1, 2, 5, 8, 10, 11, 12, 13): aksesibilitas tooltip (`aria-describedby`, fokus keyboard), pemotongan teks satu baris (`truncate` + deteksi overflow), tata letak grid proporsional, dan keseragaman kartu KPI. | **Tidak** |
| 3 | **`playwright-cli`** | `.agents/skills/playwright-cli/SKILL.md` | Memandu verifikasi visual lintas viewport (desktop sidebar terbuka/tertutup, tablet, mobile, mode terang/gelap, bahasa ID/EN) dan pengambilan tangkapan layar ke `docs/render-check/`. | **Tidak** |
| 4 | **`safe-refactor`** & **`karpathy-guidelines`** | `C:\Users\ASUS\.agents\skills\safe-refactor\SKILL.md` & `.agents/skills/karpathy-guidelines/SKILL.md` | Memastikan perubahan bersifat bedah (*surgical changes*), tidak menyentuh file di luar daftar yang disetujui, menjaga kompatibilitas mundur data lama, serta memagari setiap perubahan dengan tes unit. | **Tidak** |

> **Catatan Dependensi:** Tidak ada paket npm baru yang diinstal. Seluruh fitur unggah berkas aman, validasi NPWP/rekening, pemotongan gambar/TTD, dan komponen UI menggunakan fondasi `shadcn` + Supabase Storage (`altcycles-files`) yang sudah tersedia di repositori.

---

## Bagian A: Diagnosis Penyebab Loading Lambat (Item 9)

### 1. Temuan Arsitektural & Akar Masalah Performa

Dari hasil penelusuran seluruh rute di 3 portal (**Super Admin**, **Bendahara/Admin**, **Anggota Tim/User**) serta inspeksi lapisan layanan (`src/lib/services/` dan `src/lib/operations/`), ditemukan **7 akar masalah utama** yang menyebabkan waktu muat halaman lambat:

1. **Query Tanpa Cache & Payload JSONB Raksasa pada Audit Trail (`/super-admin/audit-trail`):**
   - `listAuditLogs()` (`src/lib/services/system-settings-service.ts:777-793`) mengeksekusi `SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 1000` **tanpa `cachedQuery()`** dan **tanpa paginasi server**.
   - Setiap baris `audit_logs` memuat kolom `old_data` dan `new_data` bertipe `JSONB`. Ketika terjadi pembaruan pada `company_profile`, `customers`, atau `login_media_items` yang menyimpan gambar Base64 Data URL, setiap baris log menyimpan salinan penuh string Base64 di `old_data` dan `new_data`. Akibatnya, 1.000 baris log dapat menghasilkan payload jaringan **2 MB – 15 MB** dalam satu request.
   - Di `audit-trail-page.tsx:90`, `React.useEffect(..., [t])` bergantung pada referensi fungsi `t` dari `useLanguage()`, yang berpotensi memicu fetch ulang saat konteks bahasa dirender ulang.

2. **Penyimpanan Gambar Base64 di Dalam Baris Tabel & Re-render Interval pada Media Login (`/super-admin/media-login`):**
   - `listAllLoginMedia()` (`system-settings-service.ts:411-440`) mengambil `SELECT * FROM login_media_items` **tanpa `cachedQuery()`**, lalu menulis ulang seluruh array (termasuk `image_url` yang berisi Base64 Data URL berukuran ratusan KB hingga MB per gambar) ke `localStorage` (`writeLocalJson`) secara sinkron di main thread setiap kali halaman dibuka.
   - Di `login-media-page.tsx:333-343`, timer `setInterval` untuk *Cycling Ticker* KPI ke-3 berjalan setiap `3200ms` dan mengubah state `tickerAnimating` serta `activeTickerIdx` di level komponen induk (`LoginMediaPage` — 1.198 baris). Akibatnya, **setiap 3,2 detik seluruh halaman, pratinjau carousel, dan seluruh baris tabel galeri dirender ulang secara penuh**.
   - Elemen `<img>` pada tabel galeri (`login-media-page.tsx:832`) tidak menyertakan atribut `loading="lazy"` dan `decoding="async"`.

3. **Over-Fetching 17 Tabel Sekaligus pada Dashboard Bendahara (`/admin/dashboard`) & Workspace Proyek (`/admin/proyek/:projectId`):**
   - `AdminDashboardPage` (`admin-dashboard.tsx:219-227`) memanggil 7 fungsi secara paralel, salah satunya `getProjectWorkspace()` (`src/lib/operations/client-projects.ts`).
   - Fungsi `getProjectWorkspace()` mengambil **13 tabel penuh tanpa filter `project_id`** (`projects`, `customers`, `quotations`, `quotation_items`, `project_documents`, `client_purchase_orders`, `milestones`, `progress_reports`, `uat_checklists`, `uat_items`, `handover_reports`, `sales_invoices`, `receipts`), padahal `AdminDashboardPage` hanya membutuhkan daftar ringkas `invoices` dan jumlah `clientPos` yang berstatus `pending_verification`!
   - Demikian pula saat membuka detail satu proyek `/admin/proyek/:projectId` (`project-detail-page.tsx`), `getProjectWorkspace()` menarik data milik **seluruh proyek** di database lalu memfilternya di memori browser, serta tidak dibungkus `cachedQuery()`.

4. **Query `getCompanyProfile()` Berulang di Setiap Perpindahan Rute pada `PortalShell`:**
   - Di `src/components/layout/portal-shell.tsx:91-106`, `React.useEffect` memiliki dependency `[location.pathname]`, sehingga setiap kali pengguna berpindah menu, shell memanggil `getCompanyProfile()` kembali.
   - Selain itu, `listMyNotifications()` (`portal-shell.tsx:163-170`) dipanggil saat mount dan setiap kali lonceng notifikasi dibuka tanpa `cachedQuery()`, mengambil `SELECT * FROM notifications` tanpa `.limit(50)`.

5. **Fetch Seluruh Baris Jurnal Tanpa Batas & Waterfall di Modul Akuntansi (`/admin/akuntansi`):**
   - `AccountingPage` (`accounting-page.tsx:163`) memanggil `Promise.all([listPeriods(), listProjects()])` saat mount, lalu komponen anak yang dirender di dalam tab (`JournalsPage`, `AccountingReportsPage`, `PeriodsPage`, `CoaAccountsPage`) memanggil kembali `listJournalsWithLines()`, `listAccounts()`, `listPeriods()`, dan `listProjects()`.
   - Walaupun sebagian terbantu oleh `cachedQuery`, `listJournalsWithLines()` (`src/lib/operations/accounting.ts:38-45`) menarik seluruh baris `journals` dan `journal_lines` dari awal perusahaan berdiri tanpa filter tanggal/periode di sisi server.

6. **Tidak Adanya Timeout Pengaman pada Loader & Inisialisasi Sesi:**
   - Apabila koneksi ke Supabase lambat atau menggantung, komponen halaman yang menunggu promise di `useEffect` menampilkan `PageLoader` tanpa batas waktu (*timeout* / *abort controller*) atau pesan pemulihan (*retry*).

7. **Ukuran Bundel Utama & Chunk Halaman Besar:**
   - Hasil ukur nyata `vite build`:
     - `dist/assets/index.js`: **689,34 kB** (gzip: 201,62 kB)
     - `dist/assets/vendor-pdf.js`: **430,80 kB** (gzip: 178,19 kB)
     - `dist/assets/vendor-react.js`: **344,77 kB** (gzip: 110,94 kB)
     - `dist/assets/accounting-page.js`: **254,91 kB** (gzip: 51,48 kB)
     - `dist/assets/vendor-supabase.js`: **229,19 kB** (gzip: 59,66 kB)
     - `dist/assets/vendor-docx.js`: **199,33 kB** (gzip: 56,95 kB)
     - `dist/assets/project-detail-page.js`: **175,33 kB** (gzip: 38,49 kB)
   - Sejumlah halaman (seperti `parties-master-page.tsx`, `invoicing-page.tsx`, `admin-dashboard.tsx`, `profit-sharing-page.tsx`) mengimpor `pdf-generator` / `word-generator` / `excel-exporter` secara statis di top-level, sehingga saat membuka halaman tersebut browser harus mengunduh dan mem-parsing chunk generator dokumen meskipun pengguna belum menekan tombol ekspor.

### 2. Tabel Diagnosis Performa Per Rute Utama (Item 9a)

| Rute & Portal | Metrik Saat Ini (Query / Payload / Bundel) | Penyebab Lambat | Bukti Kode (`File:Baris`) | Usulan Perbaikan | Usaha | Risiko |
| :--- | :--- | :--- | :--- | :--- | :-: | :-: |
| **`/super-admin/audit-trail`**<br>*(Super Admin)* | **1 query berat** (`LIMIT 1000` dengan `old_data` & `new_data` JSONB penuh); tanpa cache; payload dapat mencapai **2–15 MB** jika ada log gambar Base64; chunk `14,65 kB`. | 1) `SELECT *` menarik `old_data` & `new_data` untuk 1.000 baris sekaligus.<br>2) Tidak memakai `cachedQuery`.<br>3) Paginasi & pencarian dilakukan di klien atas 1.000 baris.<br>4) Tidak ada indeks komposit `(action, created_at DESC)`. | `system-settings-service.ts:777-793`<br>`audit-trail-page.tsx:75-110`<br>`0002_core_identity_and_audit.sql` | 1) Paginasi & filter (`action`, `search`, `page`, `pageSize`) di sisi server menggunakan `.range(from, to)` dan `{ count: 'exact' }`.<br>2) Bungkus dengan `cachedQuery("audit:list:...")`.<br>3) Sanitasi/potong string Base64 panjang saat mencatat ke `audit_logs` & tambah indeks `idx_audit_logs_created_at_id`. | Sedang | Rendah |
| **`/super-admin/media-login`**<br>*(Super Admin)* | **1 query** tanpa cache + sinkron `localStorage` baca/tulis payload Base64 (**1–8 MB**); **re-render penuh seluruh halaman tiap 3,2 detik**; chunk `26,23 kB`. | 1) `listAllLoginMedia()` tidak memakai `cachedQuery`.<br>2) `setInterval` ticker berada di komponen induk `LoginMediaPage`, memicu re-render tabel & carousel setiap 3,2 detik.<br>3) Gambar tabel tidak memakai `loading="lazy"` & `decoding="async"`.<br>4) Unggahan gambar lokal disimpan sebagai Data URL Base64 mentah di kolom `image_url`. | `system-settings-service.ts:411-440`<br>`login-media-page.tsx:333-343`<br>`login-media-page.tsx:830-838` | 1) Isolasi ticker ke sub-komponen kecil `<CategoryCompositionTicker />` agar `setInterval` tidak me-rerender tabel & halaman.<br>2) Bungkus `listAllLoginMedia` dengan `cachedQuery("login_media:all")`.<br>3) Tambahkan `loading="lazy" decoding="async"` pada `<img>` tabel.<br>4) Unggah gambar ke bucket storage (dengan kompresi/batas ukuran) alih-alih menyimpan Base64 besar di kolom teks. | Rendah | Rendah |
| **`/super-admin/dashboard`**<br>*(Super Admin)* | **4 query paralel** (`profiles`, `company_profile`, `accounts`, `audit_logs` 1.000 baris penuh); chunk `15,94 kB`. | Mengambil 1.000 baris `audit_logs` beserta JSONB `old_data`/`new_data`, padahal dashboard hanya membutuhkan `id, actor_id, actor_role, action, entity_name, entity_id, created_at` (tanpa payload JSONB berat). | `super-admin-dashboard.tsx:93-98`<br>`system-settings-service.ts:785-791` | Buat query ringan `listAuditLogsSummary(limit = 500)` yang hanya memilih kolom metadata (`id, actor_role, action, entity_name, entity_id, created_at`) dengan `cachedQuery`, menghemat >90% ukuran payload dashboard Super Admin. | Rendah | Rendah |
| **`/admin/dashboard`**<br>*(Bendahara)* | **17 query tabel Supabase** saat mount (6 service + 11 query di dalam `getProjectWorkspace()`); chunk `25,37 kB` + statis tarik `pdf-engine` (`58,97 kB`) & `excel-exporter` (`6,89 kB`). | 1) Memanggil `getProjectWorkspace()` penuh hanya untuk membaca `invoices` dan jumlah `clientPos` pending.<br>2) Impor statis `generateDocumentPdf` dan `downloadExcelSheet` di top-level halaman. | `admin-dashboard.tsx:219-238`<br>`client-projects.ts:19-68` | 1) Ganti `getProjectWorkspace()` di dashboard dengan query ringan terfokus `listDashboardBillingSummary()` (hanya `sales_invoices` & count `client_purchase_orders`) dengan `cachedQuery`.<br>2) Lazy-import `pdf-generator` & `excel-exporter` saat tombol ekspor diklik. | Sedang | Rendah |
| **`/admin/proyek/:projectId`**<br>*(Bendahara)* | **13 query tabel penuh** di `getProjectWorkspace()` tanpa filter `project_id` dan tanpa `cachedQuery`; chunk **`175,33 kB`**. | 1) `getProjectWorkspace()` menarik seluruh data semua proyek lalu memfilter di JS.<br>2) Tidak menggunakan `cachedQuery`.<br>3) Impor statis builder PDF/DOCX di halaman detail proyek. | `client-projects.ts:19-105`<br>`project-detail-page.tsx:210-245` | 1) Tambahkan parameter opsional `getProjectWorkspace(projectId?: string)` dengan filter `.eq("project_id", projectId)` di Supabase dan bungkus dalam `cachedQuery`.<br>2) Dynamic import generator PDF/Word saat aksi unduh dijalankan. | Sedang | Rendah |
| **`/admin/akuntansi`**<br>*(Bendahara)* | **4–6 query** (`periods`, `projects`, `accounts`, `journals`, `journal_lines`); chunk **`254,91 kB`**. | 1) Semua 7 sub-tab (`JournalsPage`, `ReportsPage`, `PeriodsPage`, `CoaAccountsPage`, dll.) dibundel statis dalam satu chunk `254,91 kB`.<br>2) Generator PDF/Excel diimpor statis. | `accounting-page.tsx:14-17`<br>`operations/accounting.ts:20-53` | 1) Pecah sub-tab berat (`AccountingReportsPage`, `PeriodsPage`, `CoaAccountsPage`) dan handler ekspor PDF/Excel dengan `React.lazy` / dynamic `import()`.<br>2) Pastikan `listPeriods` & `listProjects` menggunakan cache bersama tanpa fetch ganda. | Sedang | Rendah |
| **`/admin/penagihan`**<br>*(Bendahara)* | **13 query** via `getProjectWorkspace()`; chunk `52,92 kB`. | Memanggil `getProjectWorkspace()` penuh (termasuk UAT, BAST, Quotation items) padahal hanya memerlukan `projects`, `customers`, `milestones`, `progress_reports`, `sales_invoices`, `receipts`, `client_purchase_orders`. | `invoicing-page.tsx:195-225`<br>`client-projects.ts:19-105` | Bungkus `getProjectWorkspace()` dengan `cachedQuery("projects:workspace")` sehingga perpindahan antara Dashboard, Proyek, dan Penagihan instan (0 ms network wait dari SWR cache). | Rendah | Rendah |
| **`/user/dashboard`** & **`/user/pembayaran`**<br>*(Anggota Tim)* | **4–6 query paralel** (`projects`, `purchase_orders`, `payment_requests`, `profit_sharing_*`); chunk `22,47 kB` & `26,32 kB`. | `listPurchaseOrders()`, `listPaymentRequests()`, dan `getProfitSharingBundle()` di `src/lib/operations/` belum dibungkus `cachedQuery()`, sehingga setiap berpindah antar menu User selalu memicu 4–6 request jaringan baru. | `notifications-and-po.ts:90-130`<br>`payments-and-budget.ts:20-65`<br>`profit-sharing-and-buyer.ts:20-60` | Bungkus `listPurchaseOrders`, `listPaymentRequests`, dan `getProfitSharingBundle` dengan `cachedQuery` dan invalidasi via `invalidateAndNotifyDataChange`. | Rendah | Rendah |
| **Semua Rute (`PortalShell`)** | **2 query tambahan** di shell (`company_profile` setiap ganti path, `notifications` tanpa limit/cache). | 1) `useEffect` di `portal-shell.tsx:106` bergantung pada `[location.pathname]`.<br>2) `listMyNotifications()` mengambil semua notifikasi tanpa `.limit(50)` dan tanpa `cachedQuery`. | `portal-shell.tsx:91-106`<br>`portal-shell.tsx:163-184`<br>`notifications-and-po.ts:19-34` | 1) Hapus `location.pathname` dari dependency array `updateTestingMode` di `PortalShell` (cukup saat mount + event `altcycles:journal-lock-changed` & `altcycles:data-updated`).<br>2) Tambahkan `.limit(50)` dan `cachedQuery("notifications:my")` pada `listMyNotifications()`. | Rendah | Rendah |

---

## Bagian B: Reproduksi & Analisis Error Penambahan Akun Sosial Media (Item 6)

### 1. Reproduksi & Pesan Error Aktual
Berdasarkan reproduksi alur pada halaman **Profil Perusahaan > Tab Sosial Media Footer** (`/super-admin/profil-perusahaan?tab=sosmed`) serta dikonfirmasi dari tangkapan layar yang dilampirkan pengguna (`media_1795569636416_ac69c4e6.png`), ketika pengguna menekan tombol **"+ Tambah Sosial Media"**, mengisi platform/username/URL, lalu menekan **"Simpan Sosial Media Footer"**, muncul pesan error toast berwarna merah:

> **`Could not find the 'telephone_fax' column of 'company_profile' in the schema cache`**

### 2. Akar Penyebab (Root Cause Analysis)

Terdapat **3 akar penyebab berlapis** pada kode sumber:

1. **Payload Monolitik Lintas Tab di `company-profile-page.tsx:119-164` (`handleSaveCompany`):**
   - Keempat tab pada halaman Profil Perusahaan (*Identitas & Logo*, *Rekening & TTD*, *Sosial Media Footer*, dan *Perpajakan (PKP)*) menggunakan satu fungsi submit yang sama yaitu `handleSaveCompany`.
   - Saat menyimpan perubahan di tab **Sosial Media Footer**, `handleSaveCompany` tetap mengirimkan **seluruh kolom dari semua tab** ke `updateCompanyProfile(...)`, termasuk:
     ```ts
     telephone_fax: (company.telephone_fax ?? "").trim() || null,
     website: (company.website ?? "").trim() || null,
     ```
2. **Bug Fallback Schema Cache yang Tidak Lengkap di `src/lib/services/system-settings-service.ts:128-151`:**
   - Pada `updateCompanyProfile` (`system-settings-service.ts:78-89`), daftar `extKeys` sudah mencantumkan 10 kolom ekstensi:
     `["tagline", "signing_city", "tax_id_number", "signer_signature_path", "signer_paraf_path", "social_links_json", "bank_accounts_json", "logo_storage_path", "telephone_fax", "website"]`.
   - Namun, pada blok *fallback* ketika PostgREST/Supabase mengembalikan error `column ... schema cache` (baris 129–138), kode **lupa menghapus `telephone_fax` dan `website`** dari `corePatch`:
     ```ts
     // Baris 130-137 saat ini:
     const corePatch: Record<string, unknown> = { ...patch };
     delete corePatch.tagline;
     delete corePatch.signing_city;
     delete corePatch.tax_id_number;
     delete corePatch.signer_signature_path;
     delete corePatch.signer_paraf_path;
     delete corePatch.social_links_json;
     delete corePatch.bank_accounts_json;
     // BUG: corePatch.telephone_fax dan corePatch.website TIDAK DIHAPUS!
     ```
   - Akibatnya, ketika database Supabase Cloud belum menjalankan migrasi `0018_company_phone_fax_and_website.sql`, percobaan update pertama gagal karena kolom `telephone_fax` tidak ditemukan, lalu masuk ke blok fallback, dan **percobaan update kedua (`corePatch`) kembali gagal dengan error yang sama persis**: `Could not find the 'telephone_fax' column of 'company_profile' in the schema cache`!
3. **Penghapusan Kolom Fallback yang Terlalu Agresif (*Over-Stripping*) & Belum Adanya Validasi Input Sosial Media:**
   - Bila hanya kolom `telephone_fax` (Migrasi 0018) yang belum ada di database cloud sedangkan `social_links_json` (Migrasi 0014) **sudah ada**, blok fallback saat ini ikut menghapus `delete corePatch.social_links_json;`, sehingga data sosial media gagal tersimpan ke database cloud dan hanya jatuh ke `localStorage`.
   - Selain itu, pada form Sosial Media (`company-profile-page.tsx:733-847`), belum ada validasi yang menolak entri dengan username/handle kosong, memvalidasi format URL (`https://...`), atau menormalisasi handle/tautan sebelum disimpan.

### 3. Usulan Perbaikan (untuk Kelompok B — Item 6)

1. **Perbaikan Fallback Dinamis & Selektif di `updateCompanyProfile` (`system-settings-service.ts`):**
   - Jika Supabase mengembalikan error kolom tidak ditemukan di schema cache (mis. `Could not find the '<col>' column`), ekstrak nama kolom yang bermasalah dari pesan error PostgREST, hapus hanya kolom yang belum ada di skema DB tersebut, dan ulangi `.update()` secara iteratif sehingga kolom lain yang sudah ada di DB (seperti `social_links_json`) **tetap tersimpan di Supabase Cloud**.
   - Pastikan seluruh `extKeys` (termasuk `telephone_fax` dan `website`) terdaftar lengkap pada mekanisme fallback dan migrasi konsolidasi diusulkan.
2. **Pemisahan Payload Simpan per Tab & Validasi Input Sosial Media di `company-profile-page.tsx`:**
   - Saat menyimpan di tab `sosmed`, validasi setiap slot sosial media:
     - Platform wajib dipilih dari daftar valid.
     - `username` / handle wajib diisi (tidak boleh kosong; tampilkan pesan error ramah lewat i18n).
     - `url` (jika diisi) wajib berupa URL `http://` atau `https://` yang valid (atau dinormalisasi otomatis jika pengguna memasukkan domain seperti `instagram.com/altvira.tech`).
   - Pastikan fungsi `drawSocialMediaFooters` di `pdf-engine.ts` dan `docx-header-footer.ts` tidak berubah perilakunya.

---

## Bagian C: Usulan Desain Penyusutan Aset Tetap (Item 3)

### 1. Evaluasi & Penyempurnaan Arsitektur

Rekomendasi Anda — **"mesin di belakang layar dengan jejak terlihat: register aset tetap kecil di tab Setup, jurnal penyusutan bulanan otomatis saat tutup periode (idempoten, tidak boleh dobel), tampil di tab Jurnal Penyesuaian dengan template berkunci i18n, memakai akun `1-2101`, `1-2102`, `6-1401` yang sudah ada"** — sangat tepat karena menjaga antarmuka tetap bersih tanpa menambah menu utama baru, sekaligus memenuhi standar akuntansi akrual (PSAK 16 / IAS 16).

#### Temuan Penting Terkait Akun `1-2101`, `1-2102`, `6-1401`:
- Ketiga akun tersebut **sudah terdaftar** di `supabase/seed.sql` (baris 122, 124, 170) dan `src/lib/glossary.ts` (baris 180, 181, 214):
  - `1-2101`: **Peralatan & Perangkat Keras** (*Equipment & Hardware*) — `asset`, saldo normal `debit`, arus kas `investing`.
  - `1-2102`: **Akumulasi Penyusutan Peralatan** (*Accumulated Depreciation - Equipment*) — `contra_asset`, saldo normal `credit`, arus kas `operating`.
  - `6-1401`: **Beban Penyusutan Peralatan** (*Equipment Depreciation Expense*) — `expense`, saldo normal `debit`, `system_tag = 'shared_expense'`, arus kas `operating`.
- **Namun**, ketiga akun tersebut **belum dimasukkan ke dalam `DEMO_ACCOUNTS` di `src/lib/demo-seed.ts`**! Pada Kelompok C nanti, kita wajib memastikan `1-2101`, `1-2102`, dan `6-1401` tersedia baik di database Supabase maupun di `DEMO_ACCOUNTS` (auto-seed bila belum ada).

### 2. Rumus Perhitungan & Penanganan Kasus Pinggir (*Edge Cases*)

1. **Metode Garis Lurus (*Straight-Line Method*):**
   - $\text{Dasar Penyusutan (Depreciable Base)} = \max(0, \text{Harga Perolehan} - \text{Nilai Sisa})$
   - $\text{Beban Penyusutan Bulanan Penuh} = \text{roundRupiah}\left(\frac{\text{Dasar Penyusutan}}{\text{Umur Manfaat (Bulan)}}\right)$

2. **Kasus Pinggir 1 — Bulan Parsial (*Partial Month* saat Perolehan atau Pelepasan):**
   - Jika aset diperoleh di tengah bulan (misal tanggal 18 November 2026 pada periode November 2026):
     - $\text{Hari Aktif} = (\text{Tanggal Akhir Periode} - \text{Tanggal Perolehan}) + 1$
     - $\text{Total Hari Bulan Periode} = \text{Jumlah Hari dalam Bulan Tersebut}$
     - $\text{Penyusutan Bulan Pertama} = \text{roundRupiah}\left(\text{Beban Bulanan Penuh} \times \frac{\text{Hari Aktif}}{\text{Total Hari Bulan Periode}}\right)$
     - *(Jika tanggal perolehan = tanggal 1 bulan tersebut, maka $\text{Hari Aktif} = \text{Total Hari}$, sehingga menghasilkan 1 bulan penuh).*

3. **Kasus Pinggir 2 — Pembulatan Bulan Terakhir & Aset Sepenuhnya Disusutkan (*Clamping Residual Value*):**
   - Sebelum membuat jurnal pada suatu periode, mesin menghitung $\text{Sisa Dasar Penyusutan} = \text{Dasar Penyusutan} - \text{Akumulasi Penyusutan Terposting Sebelumnya}$.
   - Jika $\text{Sisa Dasar Penyusutan} \le 0$, aset sudah **sepenuhnya disusutkan** (`fully_depreciated`): mesin menghasilkan `Rp0` (tidak memposting jurnal) dan memperbarui status aset menjadi `fully_depreciated`.
   - Jika $\text{Beban Bulan Ini} > \text{Sisa Dasar Penyusutan}$ (misalnya pada bulan terakhir umur manfaat akibat akumulasi pembulatan Rupiah), maka $\text{Beban Bulan Ini} = \text{Sisa Dasar Penyusutan}$. Dengan demikian, **Nilai Buku Bersih tidak akan pernah menembus di bawah Nilai Sisa (`salvage_value`)**.

4. **Kasus Pinggir 3 — Aset Dilepas / Dijual / Dihapusbukukan (`disposed`):**
   - Jika aset memiliki `disposed_date`:
     - Bila `disposed_date < period.start_date`: aset sudah dilepas sebelum periode ini, tidak disusutkan (`Rp0`).
     - Bila `disposed_date` berada di dalam periode berjalan (`period.start_date <= disposed_date <= period.end_date`): disusutkan secara prorata sejumlah hari aktif dari `max(acquisition_date, period.start_date)` hingga `disposed_date`.

5. **Kasus Pinggir 4 — Perubahan Umur Manfaat atau Nilai Sisa (*Prospective Revision* sesuai PSAK 25):**
   - Jika aset sudah memiliki jurnal penyusutan terposting di periode sebelumnya lalu pengguna mengubah `useful_life_months` atau `salvage_value`:
   - Jurnal periode masa lalu yang sudah terposting **tidak diubah** (menjaga *immutability* historis).
   - Untuk periode berjalan dan ke depan, beban bulanan dihitung secara prospektif dari $\text{Sisa Dasar Penyusutan Saat Ini} / \text{Sisa Bulan Umur Manfaat}$.

6. **Kasus Pinggir 5 — Periode Sudah Ditutup & Idempotensi Anti-Dobel:**
   - Setiap jurnal penyusutan yang dihasilkan otomatis diberi metadata:
     - `journal_type = 'adjustment'`
     - `source_type = 'fixed_asset_depreciation'`
     - `source_id = period.id` (atau tercatat di tabel jadwal `fixed_asset_depreciations` dengan constraint `UNIQUE (asset_id, period_id)`).
   - Saat proses **Tutup Periode (`closePeriod` / `runPeriodClosingBook`)** dijalankan:
     1. Mesin penyusutan berjalan **sebelum** status periode diubah menjadi `'closed'` (dan sebelum jurnal penutup laba-rugi dihitung, sehingga beban penyusutan `6-1401` bulan tersebut ikut tertutup ke Ikhtisar Laba Rugi!).
     2. Mesin mengecek untuk setiap aset aktif apakah sudah ada jurnal penyusutan terposting untuk `(asset_id, period_id)`. Jika **sudah ada**, aset tersebut dilewati (**100% idempoten, tidak mungkin dobel** walaupun periode dibuka kembali lalu ditutup ulang).
   - Bendahara juga dapat menekan tombol **"Jalankan Penyusutan Periode Terbuka"** dari kartu Register Aset Tetap di tab Setup Akuntansi kapan saja sebelum tutup buku (juga idempoten).

7. **Format Deskripsi Jurnal Berkunci i18n:**
   - Deskripsi header jurnal:
     `Penyusutan Aset Tetap: {{asset_code}} - {{asset_name}} ({{period_name}})`
   - Terdaftar di `getLocalizedTransactionDescription` (`src/lib/glossary.ts`) sehingga saat aplikasi beralih ke bahasa Inggris (`en`), deskripsi jurnal otomatis tampil sebagai:
     `Fixed Asset Depreciation: {{asset_code}} - {{asset_name}} ({{period_name}})` di tabel Jurnal Penyesuaian, Buku Besar, maupun ekspor PDF/Excel!

---

## Bagian D: Usulan Skema Database, RLS, & Penyimpanan Berkas (Item 1, 2, 3, 4, 7)

> **[!IMPORTANT]**  
> **`perlu keputusanku: ya`** — Sesuai aturan keras, perubahan skema database di bawah ini **belum dijalankan** dan diusulkan dalam satu berkas migrasi baru `supabase/migrations/0022_13_items_schema_and_security.sql` setelah Anda menyetujuinya.

### 1. Ringkasan Usulan Skema per Item

| Item | Tabel Target | Kolom / Struktur yang Diusulkan | Tipe & Constraint | Nullable / Default | Indeks & Kebijakan RLS / Storage |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **Item 1**<br>*(Master Klien)* | `public.customers` | 1) `npwp` *(sudah ada di migrasi 0003:207, tinggal dipakai di UI)*<br>2) `shipping_address`<br>3) `shipping_same_as_office` | `TEXT`<br>`TEXT`<br>`BOOLEAN NOT NULL` | `NULL`<br>`NULL`<br>`DEFAULT false` | - Validasi constraint/RPC: `npwp IS NULL OR npwp ~ '^[0-9]{15,16}$'` (disimpan ternormalisasi hanya digit 15/16 angka, diformat `XX.XXX.XXX.X-XXX.XXX` di UI).<br>- RLS: Hanya `admin` (kelola) dan `super_admin` (baca). Role `user` & `anon` ditolak oleh RLS `customers_select_policy`. |
| **Item 2 & 4**<br>*(Data Keuangan & TTD Pengguna)* | `public.profiles` | 1) `npwp`<br>2) `bank_name`<br>3) `bank_account_number`<br>4) `bank_account_holder`<br>5) `signature_storage_path` | `TEXT`<br>`TEXT`<br>`TEXT`<br>`TEXT`<br>`TEXT` | `NULL`<br>`NULL`<br>`NULL`<br>`NULL`<br>`NULL` | - Check Constraint: `chk_profiles_npwp_digits CHECK (npwp IS NULL OR npwp ~ '^[0-9]{15,16}$')` dan `chk_profiles_bank_acc_digits CHECK (bank_account_number IS NULL OR bank_account_number ~ '^[0-9]{5,30}$')`.<br>- RLS `profiles_select_policy` (sudah ada di `0004:54`): `id = auth.uid()` (pemilik) ATAU `current_user_role() IN ('admin', 'super_admin')`. Anggota tim lain (`user`) **ditolak server** membaca profil rekan lain.<br>- RPC `update_my_profile` & `update_my_financial_profile` (`SECURITY DEFINER`): memvalidasi format di server dan melakukan **masking data sensitif pada payload `audit_logs`**.<br>- Storage TTD: disimpan di bucket privat `altcycles-files` pada path `signatures/{user_id}/{timestamp}.{ext}` (batas maks 2 MB, mime `image/png`, `image/jpeg`, `image/webp`), diakses dengan Signed URL bertanda waktu (`createSignedUrl(..., 3600)`). |
| **Item 3**<br>*(Penyusutan Aset Tetap)* | Tabel Baru:<br>`public.fixed_assets`<br>&<br>`public.fixed_asset_depreciations` | **`fixed_assets`**:<br>- `id` (`UUID PK`)<br>- `asset_code` (`VARCHAR(30) UNIQUE NOT NULL`)<br>- `asset_name` (`TEXT NOT NULL`)<br>- `acquisition_date` (`DATE NOT NULL`)<br>- `acquisition_cost` (`BIGINT NOT NULL CHECK >= 0`)<br>- `useful_life_months` (`INT NOT NULL CHECK BETWEEN 1 AND 600`)<br>- `salvage_value` (`BIGINT NOT NULL DEFAULT 0 CHECK >= 0`)<br>- `depreciation_method` (`TEXT NOT NULL DEFAULT 'straight_line'`)<br>- `asset_account_id` (`UUID FK accounts`)<br>- `accum_depr_account_id` (`UUID FK accounts`)<br>- `expense_account_id` (`UUID FK accounts`)<br>- `status` (`TEXT NOT NULL DEFAULT 'active'`)<br>- `disposed_date` (`DATE NULL`)<br>- `notes` (`TEXT NULL`)<br><br>**`fixed_asset_depreciations`**:<br>- `id` (`UUID PK`)<br>- `asset_id` (`UUID FK fixed_assets ON DELETE CASCADE`)<br>- `period_id` (`UUID FK periods ON DELETE RESTRICT`)<br>- `journal_id` (`UUID FK journals ON DELETE SET NULL`)<br>- `depreciation_amount` (`BIGINT NOT NULL CHECK > 0`)<br>- `accumulated_after` (`BIGINT NOT NULL`)<br>- `book_value_after` (`BIGINT NOT NULL`)<br>- `UNIQUE (asset_id, period_id)` | Constraint:<br>`salvage_value <= acquisition_cost`<br>`status IN ('active', 'fully_depreciated', 'disposed')` | Lihat kolom di kiri | - Indeks: `idx_fixed_assets_status (status, acquisition_date)`, `idx_fixed_asset_depr_period (period_id)`, `uq_fixed_asset_period (asset_id, period_id)`.<br>- RLS: `admin` kelola penuh (`FOR ALL`), `super_admin` hanya baca (`FOR SELECT`), `user` & `anon` ditolak total. |
| **Item 6 & 7**<br>*(Sosmed, Telp/Fax, & Bukti PKP)* | `public.company_profile` | 1) Pastikan kolom `telephone_fax TEXT`, `website TEXT`, `social_links_json JSONB`, `bank_accounts_json JSONB` termigrasi.<br>2) `pkp_proof_storage_path`<br>3) `pkp_proof_file_name`<br>4) `pkp_proof_mime_type`<br>5) `pkp_proof_size_bytes` | `TEXT`<br>`TEXT`<br>`TEXT`<br>`INT` | `NULL`<br>`NULL`<br>`NULL`<br>`NULL` | - Trigger / Validasi Server pada `company_profile`: ketika `NEW.pkp_enabled = true` dan terjadi transisi atau penyimpanan konfigurasi pajak (`OLD.pkp_enabled = false` atau update pengaturan pajak), wajib memiliki `NEW.pkp_proof_storage_path IS NOT NULL AND length(trim(NEW.pkp_proof_storage_path)) > 0`.<br>- Saat toggle `pkp_enabled` dimatikan ke `false`, kolom `pkp_proof_*` **tidak dihapus**.<br>- Storage Bukti PKP: disimpan di bucket privat `altcycles-files` pada path `company-pkp/pkp-proof-{timestamp}.{ext}` (format: `application/pdf`, `image/png`, `image/jpeg`, maks 5 MB), diakses via Signed URL bertanda waktu. |

---

## Bagian E: Inventaris Lengkap (Item 4, 10, 11, 12, 13)

### 1. Audit Mekanisme Blok Pengesahan (Tanda Tangan) di Semua Pembuat PDF (Item 4)

Saat ini, seluruh pembuat PDF menarik nama dan gambar tanda tangan secara hardcoded dari `company.signer_name`, `company.signer_title`, dan `company.signer_signature_path`. Berikut adalah inventaris seluruh dokumen PDF dan usulan **Tabel Konfigurasi Tunggal (`DOCUMENT_SIGNER_CONFIG`)**:

| Kode / Jenis Dokumen | File Pembuat Spec PDF | Penandatangan Kiri Saat Ini | Penandatangan Kanan Saat Ini | Usulan Sumber TTD Otomatis di Tabel Konfigurasi Tunggal |
| :--- | :--- | :--- | :--- | :--- |
| **1. Invoice (`INV`)** | `src/lib/pdf/specs/transaction-specs.ts:334-339` | *(Tidak ada — 1 kolom kanan)* | `company.signer_name - company.signer_title` (`company.signer_signature_path`) | **Pejabat Keuangan (Bendahara / Default Signer Perusahaan)**: mencari profil aktif dengan peran/jabatan Finance/Bendahara (atau pengguna yang cocok dengan `company.signer_name`), memakai `profile.signature_storage_path` bila tersedia, fallback ke `company.signer_signature_path`, fallback tanpa gambar. |
| **2. Kuitansi (`KW`)** | `src/lib/pdf/specs/transaction-specs.ts:450-455` | *(Tidak ada — 1 kolom kanan)* | `company.signer_name - company.signer_title` (`company.signer_signature_path`) | **Pejabat Keuangan (Bendahara / Default Signer Perusahaan)** dengan rantai fallback yang sama. |
| **3. Form Persetujuan Pembayaran (`PA`)** | `src/lib/pdf/specs/transaction-specs.ts:772-783` | **Pemohon (`requesterName`)** — *Saat ini belum menyertakan gambar TTD pemohon!* | **Penyetuju (`approverName` / Finance)** (`company.signer_signature_path`) | - **Kiri (Pemohon):** Otomatis memakai `signature_storage_path` milik pengguna `requester_id` (`profiles`).<br>- **Kanan (Penyetuju):** Otomatis memakai `signature_storage_path` milik pengguna `approver_id` (`profiles`), fallback ke `company.signer_signature_path`. |
| **4. PO Pembelian Vendor (`POP`)** | `src/features/purchase-orders/po-page.tsx:220-265` | **Vendor / Pemasok** (tanpa gambar TTD internal) | **Pembuat/Pejabat PO Altvira** (`company.signer_name`) | - **Kanan (Altvira):** Memakai profil pembuat PO (`po.created_by`) atau Pejabat Pengadaan/Default Signer sesuai konfigurasi, dengan `profile.signature_storage_path` -> fallback `company.signer_signature_path`. |
| **5. PO Klien (`CLIENT_PO`)** | `src/lib/pdf/specs/transaction-specs.ts:584-591` | **Pihak Klien (`clientName`)** | **Penerima Altvira** (`company.signer_name`) | - **Kiri:** `customer.signature_storage_path` (bila ada).<br>- **Kanan:** Profil pejabat penerima / Default Signer Altvira. |
| **6. Quotation (`QT`)** | `src/features/client-projects/project-specs-builder.ts:138-145` | **Perwakilan Klien** (`customer.signature_storage_path`) | **Pejabat Altvira** (`company.signer_name`) | - **Kanan:** Profil pejabat pembuat Quotation (`quotation.created_by` / Project Manager) atau Default Signer Perusahaan (`company.signer_name`). |
| **7. Scope of Work (`SOW`)** | `src/features/client-projects/project-specs-builder.ts:242-249` | **Perwakilan Klien** (`customer.signature_storage_path`) | **Pejabat Altvira** (`company.signer_name`) | - **Kanan:** Profil pejabat yang menjabat sesuai `signer_title` / pembuat dokumen (`uploaded_by`) -> fallback `company.signer_signature_path`. |
| **8. SPK / Kontrak (`SPK`)** | `src/lib/pdf/spk-charter-pdf.ts:55-75` | **Pihak Pertama (Altvira)** (`content.partyOneSignerName`) | **Pihak Kedua (Klien)** (`customer.signature_storage_path`) | - **Pihak Pertama (Altvira):** Mencocokkan nama/jabatan penandatangan Pihak Pertama dengan `profiles` (mis. Project Manager / Direktur / CTO) untuk mengambil `profile.signature_storage_path`, fallback ke `company.signer_signature_path`. |
| **9. BAKP (`BAKP`)** | `src/features/client-projects/project-specs-builder.ts:384-391` | **Perwakilan Klien** (`customer.signature_storage_path`) | **Pejabat Proyek Altvira** (`company.signer_name`) | - **Kanan:** Mencocokkan profil pembuat BAKP (`bakp.created_by`) atau pejabat Project Manager di `profiles`, fallback ke `company.signer_signature_path`. |
| **10. UAT (`UAT`)** | `src/features/client-projects/project-specs-builder.ts:518-531` | **Penguji Klien (`uat.client_tester_name`)** | **Pendamping Altvira (`uat.altvira_companion_name`)** | - **Kanan (Pendamping UAT Altvira):** Nama penandatangan di UAT adalah `uat.altvira_companion_name` (bukan Finance!). Otomatis mencocokkan `uat.altvira_companion_name` atau `uat.created_by` dengan tabel `profiles` dan memakai `profile.signature_storage_path` milik pegawai pendamping UAT tersebut! Jika belum punya TTD, fallback tanpa gambar (tidak memakai TTD Finance milik orang lain). |
| **11. BAST (`BAST`)** | `src/features/client-projects/project-specs-builder.ts:633-640` | **Perwakilan Klien** (`customer.signature_storage_path`) | **Pejabat Altvira** (`company.signer_name`) | - **Kanan:** Mencocokkan pejabat penandatangan / `bast.created_by` di `profiles` -> fallback `company.signer_signature_path`. |
| **12. Laporan Akuntansi & Rekap Ekspor** | `accounting-specs.ts`, `profit-sharing-page.tsx`, `admin-approvals-page.tsx`, dll. | *(1 kolom kanan)* | `company.signer_name - company.signer_title` | Tetap menggunakan Pejabat Keuangan / Default Signer Perusahaan. |

> **`perlu keputusanku: ya` (Aturan Penandatangan Dokumen):**  
> Apakah Anda menyetujui aturan resolusi di atas, yaitu:
> 1. Bila dokumen memiliki penandatangan spesifik (seperti **Pemohon & Penyetuju pada Form PA**, **Pendamping UAT pada UAT**, **Pihak Pertama pada SPK**, atau **Pembuat Dokumen/Pejabat Jabatan terkait**), sistem otomatis memakai `profile.signature_storage_path` milik pengguna tersebut; dan bila pengguna tersebut belum mengunggah TTD, kotak tanda tangan dibiarkan kosong (tanpa menyematkan TTD milik orang lain)?
> 2. Untuk dokumen tingkat perusahaan/keuangan (**Invoice, Kuitansi, Laporan Keuangan**), sistem mencocokkan profil pejabat yang namanya terdaftar sebagai `company.signer_name` (atau `company.signer_signature_path` sebagai fallback)?

---

### 2. Inventaris Komponen KPI di Seluruh Halaman (Item 10)

**Patokan Desain (`ShortcutsManagementPage` — `src/features/system-config/shortcuts-management-page.tsx:478-518`):**
- Memakai komponen bersama `KpiCard` (`src/components/shared/dashboard-kpi-card.tsx`).
- Ketika dipakai di halaman non-dashboard (tanpa `sparklineData` dan tanpa `changePercent`), `KpiCard` saat ini masih merender baris footer bawah dengan placeholder kosong `<div className="w-[58px] h-[22px] shrink-0" />` dan garis `border-t border-border/50`.
- Pada Kelompok E (Item 10), `KpiCard` akan dijadikan **SATU-SATUNYA komponen KPI bersama** di seluruh aplikasi (mendukung varian standar seperti di Pintasan Keyboard maupun slot opsional `sparklineData`/`changePercent` di Dashboard, serta slot `customValueNode` / `valueClassName`), dengan tinggi kartu sebaris yang seragam (`h-full`).

Berikut adalah daftar **seluruh 12 halaman** yang memiliki kartu KPI di aplikasi:

| No | Halaman & Rute | File & Baris | Jumlah KPI | Komponen Saat Ini | Status & Tindakan Migrasi (Item 10) |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 1 | **Pintasan Keyboard** (`/super-admin/pintasan-keyboard`) | `src/features/system-config/shortcuts-management-page.tsx:478-518` | 4 | `<KpiCard>` | **Patokan Referensi** (Sudah memakai `KpiCard`). |
| 2 | **Dashboard Bendahara** (`/admin/dashboard`) | `src/features/master-data/admin-dashboard.tsx:634-705` | 4 | `<KpiCard>` (dengan sparkline) | Sudah memakai `KpiCard`. |
| 3 | **Dashboard Super Admin** (`/super-admin/dashboard`) | `src/features/system-config/super-admin-dashboard.tsx:295-351` | 4 | `<KpiCard>` (dengan sparkline) | Sudah memakai `KpiCard`. |
| 4 | **Dashboard Anggota Tim** (`/user/dashboard`) | `src/features/dashboard/user-dashboard.tsx:365-430` | 4 | `<KpiCard>` (dengan sparkline) | Sudah memakai `KpiCard`. |
| 5 | **Budgeting Proyek** (`/admin/anggaran` & `/user/anggaran`) | `src/features/budgeting/budget-page.tsx:393-460` | 3 | **Manual `<Card>`** (`p-5 flex items-center justify-between gap-4`) | **Wajib dimigrasikan ke `<KpiCard>`** (terlihat pada tangkapan layar ke-2 Anda, tinggi subteks kartu ke-3 membungkus 2 baris sehingga posisi nominal `Rp0` tidak sejajar dengan kartu 1 & 2!). |
| 6 | **Invoice & Penagihan** (`/admin/penagihan`) | `src/features/invoicing/components/invoice-kpi-summary.tsx:26-77` | 3 | **Manual `<Card>`** | **Wajib dimigrasikan ke `<KpiCard>`**. |
| 7 | **Persetujuan Pembayaran** (`/admin/persetujuan`) | `src/features/payment-approvals/admin-approvals-page.tsx:414-470` | 3 | **Manual `<Card>`** | **Wajib dimigrasikan ke `<KpiCard>`**. |
| 8 | **Pengajuan Pembayaran Saya** (`/user/pembayaran`) | `src/features/payment-approvals/user-payments-page.tsx:542-598` | 3 | **Manual `<Card>`** | **Wajib dimigrasikan ke `<KpiCard>`**. |
| 9 | **Detail Proyek & Termin** (`/admin/proyek/:projectId`) | `src/features/client-projects/components/project-detail-header.tsx:167-225` | 3 | **Manual `<Card>`** | **Wajib dimigrasikan ke `<KpiCard>`**. |
| 10 | **Media & Banner Login** (`/super-admin/media-login`) | `src/features/system-config/login-media-page.tsx:431-501` | 3 | **Manual `<Card>`** (Kartu ke-3 memiliki cycling ticker) | **Wajib dimigrasikan ke `<KpiCard>`** (menggunakan prop `displayValue` untuk ticker kategori). |
| 11 | **Profil Saya / Overview** (`/profil`) | `src/features/profile/profile-overview-page.tsx:174-240` | 4 | **Manual `<Card>`** (4 kartu statistik akun) | **Wajib dimigrasikan ke `<KpiCard>`**. |

---

### 3. Inventaris Semua Tooltip Bawaan Browser (`title=`) & Tombol Tanpa Tooltip (Item 11 & 13)

Hasil pemindaian menyeluruh menemukan **78 atribut HTML `title=` pada elemen UI** di 32 file yang memunculkan tooltip native browser (serta belum memiliki `aria-describedby` dan dukungan fokus keyboard `ActionTooltip`):

| Kategori Lokasi | File & Baris yang Memiliki Atribut HTML `title=` | Jumlah Elemen | Tindakan pada Kelompok E (Item 11 & 13) |
| :--- | :--- | :-: | :--- |
| **1. Header & Komponen Global (`src/components/`)** | - `language-toggle.tsx:128` (`title="Pilih Bahasa"`)<br>- `theme-toggle.tsx:55` (`title="Mode Terang..."` — menyebabkan tooltip ganda!)<br>- `command-palette-dialog.tsx:316` (tombol Reset)<br>- `shortcuts-sheet.tsx:164` (tombol Reset)<br>- `avatar-upload-dialog.tsx:433` (tombol akun Google)<br>- `dashboard-charts.tsx:79, 245` (tombol seri legenda & switcher tipe grafik)<br>- `dashboard-kpi-card.tsx:178` (`changeLabel`)<br>- `document-download-menu.tsx:128, 149` (tombol unduh dokumen)<br>- `json-code-view.tsx:224` (`title="Salin JSON"`)<br>- `spk-charter-fields.tsx:397` (`title="Hapus kategori"`)<br>- `date-picker.tsx:453, 507, 553, 561` (Pilih Bulan, Pilih Tahun, Bulan sebelumnya/berikutnya) | **16** | Ganti seluruh `title=` dengan `<ActionTooltip content={t(...)}>` (dengan `aria-describedby` saat terbuka), dan bungkus `<LanguageToggle>` di `portal-shell.tsx:345, 541` dengan `<ActionTooltip>` (Item 13). |
| **2. Modul Akuntansi & Laporan (`src/features/accounting/`)** | - `accounting-page.tsx:273` (7 tombol tab Siklus Akuntansi: Jurnal Umum, Buku Besar, Neraca Saldo, Jurnal Penyesuaian, Laporan Keuangan, Tutup Buku, Setup Akuntansi)<br>- `journals-page.tsx:902, 1094, 1103, 1112` (badge pengakuan pendapatan, tombol Lihat Detail, Edit, Hapus transaksi)<br>- `reports/balance-sheet-view.tsx:86` (tombol Unduh PDF)<br>- `reports/cash-flow-view.tsx:58` (tombol Unduh PDF)<br>- `reports/equity-statement-view.tsx:62` (tombol Unduh PDF)<br>- `reports/income-statement-view.tsx:65` (tombol Unduh PDF) | **15** | Bungkus seluruh tombol tab Akuntansi, tombol unduh PDF laporan, dan tombol aksi baris jurnal dengan `<ActionTooltip>` lewat i18n, serta hapus atribut `title=`. |
| **3. Modul Proyek Klien, Termin & Buyer Portal (`src/features/client-projects/` & `buyer-portal/`)** | - `project-detail-header.tsx:111`<br>- `project-detail-shared.tsx:219, 231, 243` (tombol Lihat, Edit, Hapus)<br>- `milestone-schedule-dialog.tsx:172` (Hapus baris termin)<br>- `view-detail-dialog.tsx:65` (Unduh PDF/Word)<br>- `acceptance-docs-tab.tsx:121, 255, 264, 424, 470, 599` (Setujui/Unduh BAKP, UAT, BAST)<br>- `milestones-tab.tsx:122`<br>- `quotation-po-tab.tsx:249, 406, 417, 428` (Unduh Quotation, Verifikasi/Tolak/Unduh PO Klien)<br>- `sow-spk-tab.tsx:246` (Unduh SOW/SPK)<br>- `buyer-portal-page.tsx:721, 989, 1029, 1205, 1282` | **21** | Ganti seluruh `title=` dengan `<ActionTooltip>` memakai kunci i18n yang sesuai. |
| **4. Modul Master Data, Dashboard & Invoicing (`src/features/master-data/` & `invoicing/`)** | - `admin-dashboard.tsx:1051, 1090, 1173`<br>- `user-dashboard.tsx:694, 701, 708, 715`<br>- `coa-accounts-page.tsx:520, 530, 553` (Ubah, Nonaktifkan, Hapus Akun)<br>- `period-closing-table.tsx:433, 442, 451` (Lihat, Edit, Hapus jurnal penutup)<br>- `period-list-table.tsx:125, 137, 149` (Tutup Buku, Buka Kembali, Hapus Periode)<br>- `customer-tab-content.tsx:324, 343` (Edit, Hapus Pelanggan)<br>- `vendor-tab-content.tsx:322, 341` (Edit, Hapus Vendor)<br>- `product-service-tab-content.tsx:294, 332, 351` (Edit, Hapus Produk)<br>- `projects-page.tsx:551, 589, 598, 607, 619` (Lihat, Edit, Hapus, Workspace Proyek)<br>- `invoicing-page.tsx:918, 931, 1243` & `invoice-view-detail-dialog.tsx:77` | **30** | Ganti seluruh `title=` pada tombol aksi dan elemen interaktif dengan `<ActionTooltip>`. |
| **5. Modul Operasional, PO, Pembayaran & Bagi Hasil** | - `budget-page.tsx:655`<br>- `admin-approvals-page.tsx:665, 683, 702, 716` (Unduh PA, Setujui, Tolak, Cairkan)<br>- `user-payments-page.tsx:734, 743` (Unduh PA, Revisi)<br>- `profit-sharing-page.tsx:785` (Hapus penerima)<br>- `po-page.tsx:801, 814, 823, 832, 849, 866, 1058` (Edit, Hapus, Unduh, Terbitkan, Selesai, Batalkan PO) | **15** | Ganti seluruh `title=` dengan `<ActionTooltip>`. |
| **6. Modul Super Admin (`src/features/system-config/`)** | - `admin-settings-page.tsx:338, 350, 409` (Edit format, Reset urutan, Edit template)<br>- `audit-trail-page.tsx:285, 327` (Halaman sebelumnya/berikutnya)<br>- `company-profile-page.tsx:603, 754, 865` (Hapus rekening, Hapus sosmed, ikon platform)<br>- `login-media-page.tsx:864, 908, 921, 959, 1001` (Tautan, Edit, Hapus, Paginasi)<br>- `shortcuts-management-page.tsx:744, 760` (Ubah, Reset pintasan)<br>- `system-config-page.tsx:681`<br>- `users-management-page.tsx:552, 573` (Nonaktifkan/Aktifkan, Hapus pengguna) | **18** | Ganti seluruh `title=` dengan `<ActionTooltip>`. |

> **Catatan Proteksi CI:** Pada Kelompok E akan ditambahkan pengujian otomatis (`tests/unit/tooltip-and-header-consistency.test.tsx`) yang memindai seluruh pohon AST/JSX dan **gagal secara otomatis** apabila ditemukan atribut `title=` pada elemen HTML interaktif (`<button>`, `<a`, `<input`, `<select`, `<svg`, atau `<Button`). Ikon info kartu (`CardHeaderWithInfo`) tetap memakai `GameDialog` sesuai instruksi.

---

### 4. Inventaris Semua Judul Halaman (`<h1>`) dan Deskripsi Subjudul (Item 12)

Saat ini, judul halaman (`<h1>`) dan subjudul (`<p>`) ditulis secara manual di **21 file halaman** tanpa kelas `truncate` (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`). Akibatnya, ketika sidebar desktop terbuka (`md:ml-64`, mengurangi lebar viewport sebesar `256px`), judul panjang seperti **"Budgeting & Pengendalian Anggaran Proyek"** atau **"Persetujuan Pembayaran 1-Level & Pencairan Dana"** patah menjadi 2 baris (seperti pada tangkapan layar ke-2 Anda).

| No | Halaman & Rute | File & Baris | Teks Judul (`ID` / `EN`) | Risiko Patah Baris Saat Sidebar Terbuka? |
| :-: | :--- | :--- | :--- | :-: |
| 1 | **Dashboard Bendahara** (`/admin/dashboard`) | `admin-dashboard.tsx:600-607` | *Dasbor Keuangan & Akuntansi* | Sedang (Subjudul panjang + 2 tombol aksi kanan) |
| 2 | **Persetujuan Pembayaran** (`/admin/persetujuan`) | `admin-approvals-page.tsx:397-403` | *Persetujuan Pembayaran 1-Level & Pencairan Dana* | **Tinggi** (47 karakter + tombol Ekspor kanan) |
| 3 | **PO Pembelian Vendor** (`/admin/po-internal` & `/user/po`) | `po-page.tsx:595-605` | *Seluruh Purchase Order Pembelian Vendor* | **Tinggi** (39 karakter + 2 tombol aksi kanan) |
| 4 | **Budgeting Proyek** (`/admin/anggaran` & `/user/anggaran`) | `budget-page.tsx:307-318` | *Budgeting & Pengendalian Anggaran Proyek* | **Sangat Tinggi** (Terbukti patah 2 baris di screenshot Anda + 2 tombol aksi kanan) |
| 5 | **Master Proyek & Tim** (`/admin/proyek`) | `projects-page.tsx:348-356` | *Master Proyek & Penugasan Tim* | **Tinggi** (Subjudul panjang + 2 tombol aksi kanan) |
| 6 | **Detail Proyek & Termin** (`/admin/proyek/:id`) | `project-detail-header.tsx:72-95` | *Dokumen & Termin Proyek* | Sedang (Ada badge status + dropdown pemilih proyek) |
| 7 | **Invoice & Penagihan** (`/admin/penagihan`) | `invoicing-page.tsx:596-602` | *Invoice Penagihan, Umur Piutang, & Kuitansi* | **Tinggi** (43 karakter + 2 tombol aksi kanan) |
| 8 | **Bagi Hasil Proyek** (`/admin/bagi-hasil`) | `profit-sharing-page.tsx:351-357` | *Bagi Hasil Proyek (Profit Sharing)* | Sedang |
| 9 | **Siklus Akuntansi** (`/admin/akuntansi`) | `accounting-page.tsx:240-246` | *Siklus Akuntansi & Laporan Keuangan* | Sedang (`max-w-2xl` saat ini memaksa wrap lebih cepat!) |
| 10 | **Laporan Keuangan Akrual** (Sub-halaman) | `reports-page.tsx:387-395` | *Laporan Keuangan Akrual* | Rendah |
| 11 | **Tutup Buku & Periode** (Sub-halaman) | `periods-page.tsx:223-229` | *Tutup Buku & Periode Akuntansi* | Sedang |
| 12 | **Setup Akuntansi (CoA)** (Sub-halaman) | `coa-accounts-page.tsx:334-340` | *Setup Akuntansi* | Rendah |
| 13 | **Master Vendor & Pelanggan** (`/admin/master`) | `parties-master-page.tsx:120-129` | *Master Data Vendor & Pelanggan* | **Tinggi** (`max-w-2xl` memaksa deskripsi panjang patah menjadi 2 baris) |
| 14 | **Dashboard Anggota Tim** (`/user/dashboard`) | `user-dashboard.tsx:328-337` | *Dasbor Anggota Tim* | Sedang (Subjudul sapaan nama pengguna + 2 tombol kanan) |
| 15 | **Pengajuan Pembayaran Saya** (`/user/pembayaran`) | `user-payments-page.tsx:516-522` | *Pengajuan Pembayaran & Klaim Biaya Saya* | **Tinggi** (39 karakter + 2 tombol aksi kanan) |
| 16 | **Dashboard Super Admin** (`/super-admin/dashboard`) | `super-admin-dashboard.tsx:273-279` | *Dasbor Pengelola Sistem* | Sedang |
| 17 | **Profil Perusahaan** (`/super-admin/profil-perusahaan`) | `company-profile-page.tsx:221-227` | *Profil Perusahaan* *(tanpa "(Altvira)" sesuai Item 5)* | **Tinggi** (Deskripsi sangat panjang, 134 karakter) |
| 18 | **Pengaturan Administrasi** (`/super-admin/administrasi`) | `admin-settings-page.tsx:218-224` | *Pengaturan Penomoran & Template Dokumen* | Sedang |
| 19 | **Manajemen Akun Internal** (`/super-admin/pengguna`) | `users-management-page.tsx:415-421` | *Manajemen Akun & Peran Internal* | Sedang (+ tombol Tambah Akun di kanan) |
| 20 | **Pengaturan & Kontrol Akuntansi** (`/super-admin/master-tinjau`) | `master-readonly-page.tsx:132-138` | *Pengaturan & Kontrol Akuntansi* | Sedang |
| 21 | **Jejak Audit Sistem** (`/super-admin/audit-trail`) | `audit-trail-page.tsx:128-134` | *Jejak Audit Sistem (Audit Trail)* | Sedang |
| 22 | **Media & Banner Login** (`/super-admin/media-login`) | `login-media-page.tsx:405-411` | *Media & Banner Halaman Login* | **Tinggi** (+ tombol Tambah Media di kanan) |
| 23 | **Pintasan Keyboard** (`/super-admin/pintasan-keyboard`) | `shortcuts-management-page.tsx:455-464` | *Pintasan Keyboard* | Sedang (+ tombol Reset di kanan) |
| 24 | **Pengaturan Profil Pengguna** (`/pengaturan/profil`) | `profile-settings-page.tsx:244-250` | *Pengaturan Akun & Preferensi* | Rendah |

#### Solusi Struktural Bersama (`<PageHeader />` di `src/components/shared/page-header.tsx`):
- Membuat komponen bersama `<PageHeader title={...} description={...} actions={...} />` yang memiliki:
  - Container luar: `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between min-w-0`
  - Kolom teks kiri: `min-w-0 flex-1` (menghapus `max-w-2xl` yang selama ini mempersempit ruang judul/deskripsi!).
  - Elemen `<TruncatedTooltipText as="h1">` dan `<TruncatedTooltipText as="p">`:
    - Menggunakan `truncate whitespace-nowrap overflow-hidden text-ellipsis block w-full` dan `aria-label={fullText}`.
    - Mendeteksi secara dinamis melalui `ResizeObserver` + pemeriksaan `el.scrollWidth > el.clientWidth` (termasuk saat sidebar dibuka/ditutup atau bahasa diganti ID/EN).
    - **Hanya menampilkan `<ActionTooltip content={fullText}>` apabila teks benar-benar terpotong (`isTruncated === true`)**!
  - Kolom tombol aksi kanan: `shrink-0 flex flex-wrap items-center gap-2.5 sm:items-end` sehingga tombol di kanan tidak pernah tergeser atau terdorong keluar.

---

## Bagian F: Rencana Daftar File yang Akan Diubah per Kelompok & Daftar Keputusan

### 1. Perkiraan Daftar File per Kelompok (1 Commit per Kelompok)

#### **Migrasi Database (Setelah Disetujui)**
- `supabase/migrations/0022_13_items_schema_and_security.sql` *(File baru — migrasi skema untuk Item 1, 2, 3, 4, 6, 7)*
- `src/types/database.types.ts` *(Update tipe TypeScript untuk kolom baru)*

#### **Kelompok A: Data Pelanggan/Klien, Pengaturan Pengguna, Profil & TTD PDF (Item 1, 2, 4)**
1. `src/types/database.types.ts` *(Penambahan field pada `CustomerRow`, `ProfileRow`, dan konfigurasi signer)*
2. `src/lib/formatters.ts` *(Helper validasi, normalisasi, dan masking NPWP 15/16 digit serta nomor rekening bank)*
3. `src/lib/services/master-data-service.ts` *(Simpan/baca `npwp`, `shipping_address`, `shipping_same_as_office` pada `saveCustomer` & `listCustomers`)*
4. `src/features/master-data/parties/customer-tab-content.tsx` *(Tambah field NPWP, Alamat Pengiriman, dan checkbox "Samakan dengan alamat kantor" di dialog Pelanggan)*
5. `src/lib/services/auth-profile-service.ts` *(Simpan/baca Data Keuangan `npwp`, `bank_name`, `bank_account_number`, `bank_account_holder`, unggah `signature_storage_path` ke storage privat dengan Signed URL, dan masking pada audit log)*
6. `src/features/profile/profile-settings-page.tsx` *(Tambah tab ke-5 "Data Keuangan" dengan grid 5 kolom sama lebar, serta unggah Gambar Tanda Tangan di tab "Data Pribadi")*
7. `src/features/profile/profile-overview-page.tsx` *(Tampilkan seksi Data Keuangan di halaman Profil Saya dengan masking NPWP & rekening beserta tombol Lihat/Sembunyikan untuk pemilik)*
8. `src/features/profit-sharing/profit-sharing-page.tsx` *(Menampilkan informasi rekening & NPWP anggota tim dari sumber profil yang sama saat Bendahara memilih penerima bagi hasil)*
9. `src/lib/pdf/document-signer-config.ts` *(File baru — tabel konfigurasi tunggal penentu sumber penandatangan & gambar TTD otomatis per jenis dokumen PDF)*
10. `src/lib/pdf/specs/transaction-specs.ts`, `src/features/client-projects/project-specs-builder.ts`, `src/lib/pdf/spk-charter-pdf.ts`, `src/features/purchase-orders/po-page.tsx` *(Menghubungkan pembuat PDF ke `resolveDocumentSigner` tanpa mengubah layout/header PDF)*
11. `src/locales/id/parties.json`, `src/locales/en/parties.json`, `src/locales/id/settings.json`, `src/locales/en/settings.json`, `src/locales/id/profit_sharing.json`, `src/locales/en/profit_sharing.json`
12. `tests/unit/group-a-customers-profile-signatures.test.tsx` *(File tes baru Kelompok A)*

#### **Kelompok B: Profil Perusahaan & Super Admin (Item 5, 6, 7)**
1. `src/features/system-config/company-profile-page.tsx` *(Hapus field "Gambar Paraf Pihak Pertama" dari UI tab Rekening & TTD, rombak grid agar penuh & proporsional tanpa ruang kosong di kanan, hapus kata "(Altvira)" dari judul, perbaiki validasi & simpan Sosial Media Footer, tambah unggah bukti PKP wajib saat toggle PKP aktif)*
2. `src/lib/services/system-settings-service.ts` *(Perbaiki bug fallback `telephone_fax`/`website` di `updateCompanyProfile`, validasi server/klien bukti PKP saat `pkp_enabled = true`, unggah bukti PKP ke storage privat)*
3. `src/components/layout/nav-structure.ts`, `src/components/layout/breadcrumb-map.ts`, `src/lib/navigation-shortcuts-registry.ts`, `src/lib/i18n.tsx` *(Hapus kata "(Altvira)" dari label menu, breadcrumb, command palette, dan kamus i18n untuk Profil Perusahaan tanpa mengubah rute)*
4. `src/locales/id/common.json`, `src/locales/en/common.json`, `src/locales/id/settings.json`, `src/locales/en/settings.json`
5. `tests/unit/group-b-company-profile-pkp-socials.test.tsx` *(File tes baru Kelompok B)*

#### **Kelompok C: Akuntansi — Penyusutan Aset Tetap & Grid 4 Kolom Tab Kontrol Akuntansi (Item 3, 8)**
1. `src/lib/demo-seed.ts` *(Pastikan akun `1-2101`, `1-2102`, `6-1401` terdaftar di `DEMO_ACCOUNTS` dan seed data)*
2. `src/lib/services/fixed-assets-service.ts` *(File baru — mesin perhitungan penyusutan garis lurus, prorata bulan parsial, nilai sisa, pelepasan aset, revisi umur prospektif, dan pembuatan jurnal penyesuaian otomatis yang idempoten)*
3. `src/lib/services/accounting-master-service.ts` & `src/lib/operations/accounting.ts` *(Integrasi eksekusi penyusutan otomatis yang idempoten saat `closePeriod` / `runPeriodClosingBook`)*
4. `src/features/master-data/coa-accounts-page.tsx` *(Kartu/tabel Register Aset Tetap kecil di tab Setup Akuntansi)*
5. `src/lib/glossary.ts` *(Template terjemahan otomatis i18n untuk deskripsi jurnal penyusutan di tab Jurnal Penyesuaian)*
6. `src/features/system-config/master-readonly-page.tsx` *(Ubah barisan tab Bagan Akun (CoA), Proyek, Vendor, Pelanggan di halaman Pengaturan & Kontrol Akuntansi menjadi grid 4 kolom sama lebar yang membungkus rapi di semua ukuran layar)*
7. `src/locales/id/accounting.json`, `src/locales/en/accounting.json`, `src/locales/id/settings.json`, `src/locales/en/settings.json`
8. `tests/unit/group-c-depreciation-and-tabs.test.tsx` *(File tes baru Kelompok C)*

#### **Kelompok D: Optimasi Performa Terukur (Item 9)**
1. `src/lib/services/system-settings-service.ts` *(Paginasi/filter server & `cachedQuery` pada `listAuditLogs`, query ringan metadata `listAuditLogsSummary`, `cachedQuery` pada `listAllLoginMedia`, dan pemotongan payload Base64 pada audit log)*
2. `src/features/system-config/audit-trail-page.tsx` *(Integrasi paginasi & filter teroptimasi tanpa re-fetch berulang)*
3. `src/features/system-config/login-media-page.tsx` *(Isolasi komponen `<CategoryCompositionTicker />` agar interval 3,2 detik tidak me-rerender seluruh halaman/tabel, tambah `loading="lazy" decoding="async"`)*
4. `src/lib/operations/client-projects.ts` *(Bungkus `getProjectWorkspace` dengan `cachedQuery` + filter `projectId` opsional serta fungsi ringan `listDashboardBillingSummary`)*
5. `src/lib/operations/notifications-and-po.ts`, `src/lib/operations/payments-and-budget.ts`, `src/lib/operations/profit-sharing-and-buyer.ts` *(Tambahkan `cachedQuery` & `.limit(50)` pada notifikasi)*
6. `src/components/layout/portal-shell.tsx` *(Hilangkan pemanggilan ulang `getCompanyProfile()` pada setiap perubahan `location.pathname`)*
7. `src/features/master-data/admin-dashboard.tsx`, `src/features/system-config/super-admin-dashboard.tsx` *(Gunakan query ringkasan ringan & dynamic import untuk generator ekspor berat)*
8. `tests/unit/group-d-performance.test.ts` *(File tes verifikasi dedupe, cache, dan paginasi Kelompok D)*

#### **Kelompok E: Konsistensi UI Sekelompok — KPI, Tooltip, Header Ellipsis, & Tombol Bahasa (Item 10, 11, 12, 13)**
1. `src/components/shared/dashboard-kpi-card.tsx` *(Standarisasi `KpiCard` sebagai komponen KPI tunggal untuk seluruh halaman sesuai patokan Pintasan Keyboard, mendukung mode kompak tanpa ruang kosong sparkline bila tidak dikirim, serta slot `sparklineData`/`changePercent` untuk Dashboard)*
2. `src/components/shared/page-header.tsx` *(File baru — komponen header halaman bersama dengan `<h1>` dan `<p>` satu baris `truncate`, deteksi overflow `ResizeObserver`, tooltip `ActionTooltip` hanya saat teks terpotong, dan slot aksi kanan anti-geser)*
3. `src/components/ui/action-tooltip.tsx` *(Pastikan dukungan penuh `aria-describedby`, hover, fokus keyboard, dan smart viewport clamping anti-clipping)*
4. `src/components/shared/language-toggle.tsx`, `src/components/shared/theme-toggle.tsx`, `src/components/layout/portal-shell.tsx` *(Hapus atribut `title=` native dan pasang `<ActionTooltip>` pada tombol ganti bahasa di header — Item 13)*
5. File halaman yang dimigrasikan ke `<KpiCard>`, `<PageHeader>`, dan `<ActionTooltip>` (penggantian seluruh atribut `title=`):
   - `src/features/budgeting/budget-page.tsx`
   - `src/features/invoicing/components/invoice-kpi-summary.tsx`, `src/features/invoicing/invoicing-page.tsx`, `src/features/invoicing/components/invoice-view-detail-dialog.tsx`
   - `src/features/payment-approvals/admin-approvals-page.tsx`, `src/features/payment-approvals/user-payments-page.tsx`
   - `src/features/client-projects/components/project-detail-header.tsx`, `src/features/client-projects/components/project-detail-shared.tsx`, `src/features/client-projects/project-detail-page.tsx`, `src/features/client-projects/dialogs/milestone-schedule-dialog.tsx`, `src/features/client-projects/dialogs/view-detail-dialog.tsx`, `src/features/client-projects/tabs/acceptance-docs-tab.tsx`, `src/features/client-projects/tabs/milestones-tab.tsx`, `src/features/client-projects/tabs/quotation-po-tab.tsx`, `src/features/client-projects/tabs/sow-spk-tab.tsx`
   - `src/features/system-config/login-media-page.tsx`, `src/features/system-config/shortcuts-management-page.tsx`, `src/features/system-config/admin-settings-page.tsx`, `src/features/system-config/audit-trail-page.tsx`, `src/features/system-config/company-profile-page.tsx`, `src/features/system-config/master-readonly-page.tsx`, `src/features/system-config/super-admin-dashboard.tsx`, `src/features/system-config/system-config-page.tsx`, `src/features/system-config/users-management-page.tsx`
   - `src/features/profile/profile-overview-page.tsx`, `src/features/profile/profile-settings-page.tsx`
   - `src/features/accounting/accounting-page.tsx`, `src/features/accounting/journals-page.tsx`, `src/features/accounting/reports-page.tsx`, `src/features/accounting/reports/balance-sheet-view.tsx`, `src/features/accounting/reports/cash-flow-view.tsx`, `src/features/accounting/reports/equity-statement-view.tsx`, `src/features/accounting/reports/income-statement-view.tsx`
   - `src/features/master-data/admin-dashboard.tsx`, `src/features/master-data/coa-accounts-page.tsx`, `src/features/master-data/parties-master-page.tsx`, `src/features/master-data/periods-page.tsx`, `src/features/master-data/projects-page.tsx`, `src/features/master-data/components/period-closing-table.tsx`, `src/features/master-data/components/period-list-table.tsx`, `src/features/master-data/parties/customer-tab-content.tsx`, `src/features/master-data/parties/vendor-tab-content.tsx`, `src/features/master-data/parties/product-service-tab-content.tsx`
   - `src/features/dashboard/user-dashboard.tsx`, `src/features/profit-sharing/profit-sharing-page.tsx`, `src/features/purchase-orders/po-page.tsx`, `src/features/buyer-portal/buyer-portal-page.tsx`
   - `src/components/navigation/command-palette-dialog.tsx`, `src/components/navigation/shortcuts-sheet.tsx`, `src/components/shared/avatar-upload-dialog.tsx`, `src/components/shared/dashboard-charts.tsx`, `src/components/shared/document-download-menu.tsx`, `src/components/shared/json-code-view.tsx`, `src/components/shared/spk-charter-fields.tsx`, `src/components/ui/date-picker.tsx`
6. `tests/unit/group-e-ui-kpi-tooltips-headers.test.tsx` *(File tes baru Kelompok E, termasuk penjaga CI anti-`title=` dan tes deteksi `KpiCard` tunggal)*

---

### 2. Daftar Keputusan yang Membutuhkan Persetujuan Anda (`perlu keputusanku: ya`)

1. **`perlu keputusanku: ya` — Persetujuan Skema Database & Migrasi (`0022_13_items_schema_and_security.sql`):**
   - Apakah Anda menyetujui penambahan kolom pada `public.customers` (`shipping_address`, `shipping_same_as_office`), `public.profiles` (`npwp`, `bank_name`, `bank_account_number`, `bank_account_holder`, `signature_storage_path`), `public.company_profile` (`pkp_proof_storage_path`, `pkp_proof_file_name`, `pkp_proof_mime_type`, `pkp_proof_size_bytes`), serta pembuatan tabel `public.fixed_assets` & `public.fixed_asset_depreciations` beserta indeks dan kebijakan RLS-nya seperti diuraikan pada Bagian D?
2. **`perlu keputusanku: ya` — Status Wajib/Opsional Field Tab "Data Keuangan" Pengguna (Item 2):**
   - Pada tab baru **"Data Keuangan"** di Pengaturan Pengguna (`NPWP`, `Nama Bank`, `Nomor Rekening`, `Atas Nama Rekening`):
     - Rekomendasi kami: **`NPWP` bersifat opsional** (karena tidak semua anggota tim memiliki NPWP sendiri; namun jika diisi wajib valid 15 atau 16 digit), sedangkan **`Nama Bank`, `Nomor Rekening`, dan `Atas Nama Rekening` wajib diisi berpasangan** apabila pengguna menyimpan form tab Data Keuangan (agar data rekening penerima selalu lengkap untuk transfer bagi hasil/klaim).
     - Untuk keterhubungan dengan portal Bendahara: saat ini halaman yang sudah ada dan relevan adalah **Bagi Hasil Proyek (`/admin/bagi-hasil`)** dan **Persetujuan Pembayaran (`/admin/persetujuan`)**. Halaman khusus *"Perhitungan PPh 21"* atau *"Database Bendahara"* tersendiri belum ada di aplikasi; sesuai aturan Anda, kami hanya akan menghubungkan & menampilkan data keuangan tersebut pada halaman Bendahara yang sudah ada (`/admin/bagi-hasil` & `/admin/persetujuan`) tanpa membuat halaman fitur baru. Apakah Anda setuju?
3. **`perlu keputusanku: ya` — Aturan Penandatangan Otomatis per Jenis Dokumen PDF (Item 4):**
   - Apakah Anda menyetujui pemetaan pada tabel konfigurasi tunggal di Bagian E.1 (di mana dokumen seperti **Form PA** memakai TTD Pemohon & Penyetuju, **UAT** memakai TTD Pendamping UAT Altvira `altvira_companion_name`, **SPK/BAKP/BAST/SOW/POP** mencocokkan pejabat penandatangan/pembuat dokumen di `profiles`, dan bila pengguna yang bersangkutan belum mengunggah TTD pada dokumen khusus non-Finance maka area TTD dibiarkan kosong tanpa error)?
4. **`perlu keputusanku: ya` — Dampak Penghapusan Field "Gambar Paraf Pihak Pertama" pada PDF SPK (Item 5):**
   - Saat ini `spk-charter-pdf.ts:64` memeriksa `content.partyOneParafUrl ?? company.signer_paraf_path` untuk kotak `"Paraf Pihak Pertama:"` di bagian bawah halaman SPK, dan jatuh ke titik-titik `".................."` bila bernilai `null`.
   - Jika field UI *"Gambar Paraf Pihak Pertama"* dihapus dari halaman Rekening & TTD (tanpa menghapus kolom DB), apakah untuk data perusahaan yang sebelumnya sudah telanjur mengunggah paraf tetap ditampilkan apa adanya dari DB atau diabaikan (`null`) sehingga selalu menampilkan `".................."`? (Rekomendasi kami: tetap aman tidak error; bila `signer_paraf_path` ada tidak menyebabkan error, dan PDF tidak diubah sesuai aturan Anda).
5. **`perlu keputusanku: ya` — Penanganan Data Lama yang Sudah PKP Tanpa Berkas Bukti PKP (Item 7):**
   - Untuk data lama yang kebetulan sudah berstatus `pkp_enabled = true` tetapi belum memiliki berkas bukti PKP: halaman tidak diblokir dan menampilkan banner peringatan ramah di tab Perpajakan (PKP). Saat Super Admin menyunting dan menekan tombol **"Simpan Pengaturan Pajak"** pada tab Perpajakan selama toggle PKP masih aktif, sistem akan mewajibkan unggah berkas bukti PKP terlebih dahulu (sementara penyimpanan di tab lain seperti *Identitas*, *Rekening & TTD*, dan *Sosial Media* tetap diizinkan tanpa terblokir). Apakah Anda setuju dengan aturan ini?
6. **`perlu keputusanku: ya` — Konvensi Bulan Parsial pada Desain Penyusutan Aset Tetap (Item 3):**
   - Untuk aset tetap yang diperoleh di tengah bulan, apakah Anda memilih **Prorata Hari Aktual di Bulan Pertama** ($\text{Beban Bulanan} \times \frac{\text{Hari Aktif}}{\text{Total Hari Bulan}}$, dengan *clamping* nilai sisa di bulan terakhir) seperti diusulkan pada Bagian C.2, atau **Konvensi Bulan Penuh** (perolehan tanggal 1–15 dihitung 1 bulan penuh, tanggal >15 mulai disusutkan bulan berikutnya)?
