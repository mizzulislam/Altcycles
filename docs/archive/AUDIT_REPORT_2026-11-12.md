# Laporan Audit Menyeluruh Codebase — Altcycles (ERP Keuangan Altvira)

**Tanggal Audit:** 12 November 2026  
**Mode Audit:** Pemeriksaan Read-Only (belum ada file kode aplikasi yang diubah/dihapus)  
**Cakupan:** Seluruh file sumber (`src/`: 92 file), database & Edge Functions (`supabase/`: 23 file), skrip (`scripts/`: 3 file), test (`tests/`: 8 file), aset (`public/`: 7 file), konfigurasi build/lint, serta inspeksi runtime browser headless (Chrome CDP, tema terang/gelap, desktop `1440×900` & mobile `390×844` karena binary `playwright-cli` tidak terpasang di environment lokal).

---

## 1. Ringkasan Eksekutif & Skor Kondisi

Altcycles memiliki fondasi domain akuntansi SAK yang kuat (`accounting-engine.ts`, RLS PostgreSQL multi-role, dan test PGlite 33 kasus yang seluruhnya lolos secara sekuensial). Namun, audit menemukan dua celah kritikal pada alur lintas-peran dan keandalan build/test: perpindahan peran lewat URL (`tabRole`) tidak menyinkronkan peran aktif di backend/store (`switchActiveRole`), sehingga memicu *unhandled promise rejection* serta error *"Hanya Admin yang dapat mengakses daftar jurnal akuntansi."* secara langsung di browser; selain itu `npm run lint` gagal dengan 15 error + 1 warning dan `npm test` default mengalami crash WASM OOM bila dijalankan paralel. Dari sisi kode dan performa, terdapat 4 file yatim (*orphaned*, 1.038 baris), 1 rute duplikat tak terjangkau (`/super-admin/konfigurasi`), file monolit hingga 4.667 baris (`project-detail-page.tsx`), serta bundle produksi tunggal 2,55 MB (`gzip` 734 kB) tanpa *code-splitting*. Pada akuntansi dan keamanan, ditemukan celah *role metadata* pada trigger signup (`0009`), belum terpisahnya akun **PPN Keluaran** saat mode PKP aktif, serta beberapa ketidakseragaman UI/UX minor terutama empty state tabel di layar mobile.

| Area Audit | Skor | Ringkasan Kondisi Utama |
| --- | :---: | --- |
| **Kualitas Kode & Struktur** | **6.5 / 10** | Typecheck lolos (`tsc`), tetapi ESLint gagal (15 error), ada 4 file yatim + 11 export tak terpakai, 1 dependency tak terpakai (`driver.js`), dan monolit >1.500–4.667 baris. |
| **UI/UX & Konsistensi** | **7.8 / 10** | Mayoritas komponen mengikuti `AGENTS.md` (`shadcn` + token tema terang/gelap konsisten), namun ada `<select>` HTML mentah, hex hardcoded di `Button`, empty state tabel tergeser di mobile, dan overlap toast di kanan atas. |
| **Alur Sistem & Akuntansi** | **6.0 / 10** | Bug live desinkronisasi `tabRole` vs `activeRole` saat navigasi URL, guard `verify_client_po` belum mengunci PO terverifikasi, bug PPN PKP masuk pendapatan, tanggal default hardcoded (`2026-11-07`), serta 5 halaman menelan error async tanpa `catch`. |
| **Keamanan** | **6.5 / 10** | Tidak ada secret ter-commit di git, tetapi trigger `handle_new_auth_user()` membaca metadata signup, email pribadi ter-hardcode di klien, prefix migrasi `0010_` ganda + bug `old_data` audit log, serta CORS `*` dan fallback Turnstile opsional. |
| **Performa** | **6.0 / 10** | Semua 30+ halaman dan generator PDF/DOCX/XLSX dimuat eager dalam 1 chunk JS `2.554,04 kB` (`734,32 kB` gzip) dan re-fetch berulang pada filter PO. |

---

## 2. Peta Arsitektur & Klasifikasi Folder

### 2.1 Ringkasan Stack, Portal/Peran, Modul & Autentikasi

- **Stack Utama (`package.json:17-61`):** React 19 + TypeScript `~5.7.3` + Vite `^6.2.2` + Tailwind CSS v4 (`@tailwindcss/vite`) + `@radix-ui/*` (`shadcn` pola komponen lokal) + `react-router-dom` `^7.4.0` + `@supabase/supabase-js` `^2.49.1` + `sonner` + `lucide-react` + `motion` `^14.10.1` + generator ekspor (`pdf-lib`, `docx`, `write-excel-file`).
- **Portal & Peran (`src/app/role-guard.tsx`, `src/components/layout/portal-shell.tsx:167-255`):**
  1. **Publik:** `/login`, `/lupa-kata-sandi`, `/reset-kata-sandi`, `/portal-pembeli` (lacak progres & pengajuan PO klien tanpa login).
  2. **Super Admin (`super_admin`):** Dashboard Sistem, Profil Perusahaan, Administrasi & Penomoran, Pengguna & Peran, Master Tinjau (read-only), Audit Trail, Media & Banner Login (+ rute yatim `/super-admin/konfigurasi`).
  3. **Admin / Bendahara (`admin`):** Dashboard Keuangan, Persetujuan Pembayaran, PO Pembelian Vendor, Budgeting Proyek, Proyek Klien & Termin (`/admin/proyek/:projectId`), Invoice & Penagihan, Bagi Hasil Proyek, Akuntansi & Laporan SAK (`jurnal`, `buku_besar`, `neraca_saldo`, `penyesuaian`, `laporan`, `tutup_buku`, `coa`), Master Vendor & Klien.
  4. **Anggota Tim Internal (`user`):** Dashboard Anggota, PO Pembelian Proyek, Pengajuan Pembayaran, Anggaran Proyek.
  5. **Rute Bersama Terautentikasi (`allowedRole="any"`):** `/profil`, `/pengaturan/profil`.
- **Alur Autentikasi (`src/features/auth/auth-context.tsx:1-594`, `src/lib/supabase.ts:1-52`):**
  - Mendukung 2 mode: **Supabase Cloud** (`signInWithPassword` & `signInWithGoogle` OAuth dengan animasi transisi `OAuthLoadingCard`) dan **Demo Mode Lokal** (`isDemoMode`, penyimpanan sesi di `localStorage["altcycles_demo_session"]`).
  - Mendukung **multi-role per tab** melalui `sessionStorage["altcycles_tab_role_override"]`, idle auto-logout (`IDLE_TIMEOUT_MINUTES`), dan *failsafe upsert* profil saat pengguna OAuth login pertama kali.

### 2.2 Inventaris & Klasifikasi File Workspace

| Direktori | Jumlah File | Kategori Dominan | Catatan Penempatan / Tanggung Jawab Ganda |
| --- | :---: | --- | --- |
| `src/App.tsx`, `src/main.tsx`, `src/index.css` | 3 | Entrypoint, Routing & Token CSS | `App.tsx` mengimpor seluruh 28+ halaman secara *eager*. |
| `src/app/` (`role-guard.tsx`) | 1 | Route Guard | Tepat berada di layer app/routing. |
| `src/components/ui/` | 20 | Komponen Primitif `shadcn` | Konsisten, kecuali `button.tsx:11` meng-hardcode `#0B43C8` dan `dialog.tsx` / `alert-dialog.tsx` tetap mengekspor `DialogDescription` / `AlertDialogDescription`. |
| `src/components/layout/` | 1 | Shell Layout (`portal-shell.tsx`, 1.337 baris) | Menggabungkan sidebar, header, dialog notifikasi, breadcrumb map, dan wrapper `motion`. |
| `src/components/shared/` | 17 | Komponen Bisnis Bersama | **Terdapat 2 file yatim** (`change-password-dialog.tsx`, `lattice-loader.tsx`). `dashboard-charts.tsx` (1.200 baris) berisi seluruh chart SVG kustom. |
| `src/features/auth/` | 3 | Autentikasi & Konteks | `auth-context.tsx` (594 baris) bercampur di folder `features/auth/` bersama `login-page.tsx` (1.073 baris) & `password-reset-pages.tsx`. |
| `src/features/accounting/` | 4 | Halaman Fitur Akuntansi | **Terdapat 1 file yatim** (`accounting-hub-page.tsx`). `reports-page.tsx` (2.229 baris) dan `journals-page.tsx` (1.708 baris) sangat besar. |
| `src/features/master-data/` | 5 | Halaman Master Data | **Salah penempatan:** `admin-dashboard.tsx` (1.319 baris) berada di `master-data/`, bukan `features/dashboard/`. `periods-page.tsx` (1.229 baris) juga merangkap tutup buku akuntansi. |
| `src/features/dashboard/` | 1 | Halaman Dashboard | Hanya berisi `user-dashboard.tsx`; `admin-dashboard.tsx` & `super-admin-dashboard.tsx` tersebar di folder lain. |
| `src/features/client-projects/` | 1 | Halaman Detail Proyek & Termin | `project-detail-page.tsx` mencapai **4.667 baris** (monolit terbesar: UI termin, PO klien, dokumen SoW/SPK/BAKP/UAT/BAST, modal PDF/Word, serta progres persentase penyelesaian). |
| `src/features/system-config/` | 8 | Halaman Portal Super Admin | `system-config-page.tsx` (734 baris) tumpang tindih dengan `company-profile-page.tsx` + `admin-settings-page.tsx` dan tidak ada di navigasi sidebar. |
| `src/features/` lainnya (`budgeting`, `buyer-portal`, `invoicing`, `payment-approvals`, `profile`, `profit-sharing`, `purchase-orders`) | 9 | Halaman Fitur Bisnis | **Terdapat 1 file yatim** (`buyer-portal/buyer-placeholder-page.tsx`, 53 baris). |
| `src/lib/` | 15 | Service/API, Formatter, Engine, Exporter | `operations-service.ts` (**3.443 baris**) & `data-service.ts` (**1.901 baris**) menangani puluhan domain + mode ganda Demo/Supabase. |
| `src/types/` | 1 | Tipe & Schema (`database.types.ts`, 1.352 baris) | Tipe database terpusat. |
| `supabase/migrations/` & `supabase/functions/` | 23 | Skema SQL, RPC, Trigger & Edge Functions | Terdapat **konflik prefix** `0010_journal_lock_setting.sql` dan `0010_user_deletion_and_multi_role_management.sql`. `supabase/.temp/` ada di disk lokal (ter-ignore git). |
| `scripts/` & `tests/` & `public/` | 18 | Skrip (`3`), Test Vitest/PGlite (`8`), Aset (`7`) | Seluruh 7 aset di `public/brand/` terpakai; seluruh 7 berkas test DB/unit lolos sekuensial, tetapi **belum ada test komponen UI / E2E browser**. |

---

## 3. Tabel Temuan Audit

| ID | Kategori | Prioritas | Lokasi (`file:baris`) | Masalah | Rekomendasi | Estimasi Usaha | Risiko |
| --- | --- | :---: | --- | --- | --- | :---: | --- |
| **AUD-01** | Alur / Auth | **P0** | `src/features/auth/auth-context.tsx:492-511`, `src/lib/operations-service.ts:1021-1025` | Saat user multi-role mengakses URL peran lain langsung (mis. `/admin/dashboard` atau `/admin/akuntansi` ketika `profile.role` = `super_admin`), `AuthProvider` hanya mengubah `tabRole` lokal tanpa memanggil `switchActiveRole(routeRole)`. Di Demo Mode `getDemoActor()` tetap ber-role `super_admin`, dan di Cloud RLS `current_user_role()` tetap membaca kolom `profiles.role` lama -> memicu toast error & 6 *uncaught promise rejection* live di Chrome. | Sinkronkan `switchActiveRole(routeRole)` saat `routeRole` berbeda dari role aktif aktual (atau ubah kontrak RLS/Demo agar menggunakan header/peran efektif tab yang tervalidasi terhadap `profiles.roles`). | Sedang | Tinggi (alur multi-role) |
| **AUD-02** | Keamanan | **P0** | `supabase/migrations/0009_multi_role_and_profile_extensions.sql:42-50`, `src/features/auth/auth-context.tsx:144-165,393-425` | Trigger `handle_new_auth_user()` membaca `NEW.raw_user_meta_data ->> 'role'` dan `'roles'` langsung dari payload signup klien. Jika self-signup Supabase belum dimatikan di dashboard Auth, pemanggil eksternal berpotensi mendaftar dengan `role: 'super_admin'`. Selain itu email pribadi `mizzulislam.id@gmail.com` ter-hardcode di bundle klien, dan panjang password minimal berbeda (`signUp`: 6, `updatePassword`: 8). | Kunci trigger signup agar selalu menetapkan default `'user'` (abaikan metadata role kecuali dari RPC/Edge Function service-role), pindahkan email bootstrap ke konfigurasi server/seed, dan samakan validasi minimal 8 karakter. | Sedang | Rendah (jika teruji) |
| **AUD-03** | Akuntansi | **P1** | `supabase/migrations/0007_phase4_projects_documents_invoicing_profit_sharing.sql:653-697`, `src/lib/operations-service.ts:2239-2267` | Ketika perusahaan dalam mode PKP (`pkp_enabled = true`), nilai `ppnAmount` (11%) dijumlahkan ke `total_amount` faktur, lalu **seluruh `total_amount`** dikreditkan ke pendapatan/termin (`contract_billings` / `service_revenue` / `unearned_revenue`) tanpa memisahkan akun liabilitas **PPN Keluaran** (`2xxx`). | Pisahkan baris kredit jurnal faktur PKP: kredit pendapatan/tagihan termin sebesar `subtotal` (DPP) dan kredit akun liabilitas **PPN Keluaran** sebesar `ppnAmount`. | Sedang | Sedang (dampak jurnal faktur) |
| **AUD-04** | Kualitas / CI | **P1** | `src/components/ui/date-picker.tsx:76`, `src/lib/data-service.ts:812,822,837`, `src/lib/google-drive-picker.ts:8,9,74,75,320,380,386`, `src/lib/theme-context.tsx:81`, `tests/db/phase5-multi-role.test.ts:49` | `npm run lint` gagal (exit code 1): **15 error** (`no-useless-escape`, `no-explicit-any`) + **1 warning** (`react-hooks/exhaustive-deps`). `eslint.config.js:8-11` juga mengecualikan `supabase/functions` dan mengabaikan `scripts/`. | Perbaiki 15 error & 1 warning agar `npm run lint` hijau sebagai gerbang CI; pertimbangkan lint terpisah untuk `scripts/`. | Kecil | Sangat Rendah |
| **AUD-05** | Test / CI | **P1** | `vite.config.ts:13-18`, `package.json:13` | `npm test` (`vitest run`) gagal crash OOM WASM (`Commit wasm code space Allocation failed`) ketika menjalankan berkas test `@electric-sql/pglite` secara paralel, padahal lolos 100% (7 berkas, 33 test) bila dijalankan berurutan. | Konfigurasi `test: { fileParallelism: false }` atau `pool: "forks"` dengan `singleFork: true` di `vite.config.ts` agar `npm test` andal di semua mesin. | Kecil | Sangat Rendah |
| **AUD-06** | Akuntansi / Alur | **P1** | `supabase/migrations/0007_phase4...sql:1607-1653`, `src/lib/data-service.ts:541,550` | (a) RPC `verify_client_po` tidak memblokir perubahan status PO yang sudah `verified` (dan sudah punya proyek/tagihan), serta cabang penolakan (`ELSE`) tidak menulis `audit_logs`. (b) Mode Demo `deleteInternalUser` (`data-service.ts:541,550`) memeriksa field yang tidak ada `(po as any).verified_by` & `(pr as any).reviewed_by` (seharusnya `approver_id`). | Tambah guard status `pending_verification` + log penolakan di `verify_client_po`, serta perbaiki pengecekan relasi user di `data-service.ts` dengan tipe eksplisit. | Kecil | Rendah |
| **AUD-07** | Keamanan / DB | **P1** | `supabase/migrations/0010_journal_lock_setting.sql:166-184`, `supabase/migrations/0010_user_deletion_and_multi_role_management.sql:199-225` | (a) Dua file migrasi memakai nomor urut identik `0010_`. (b) `update_user_roles` menjalankan `UPDATE ... RETURNING * INTO v_target_profile` sebelum mencatat `'previous_active_role', v_target_profile.role`, sehingga `old_data` audit mencatat role baru. (c) `set_journal_lock_status` mengizinkan `admin` membuka kunci jurnal sendiri dan belum memanggil `REVOKE EXECUTE ... FROM PUBLIC, anon`. | Buat migrasi korektif bernomor urut baru (`0017_*`) untuk memperbaiki pembacaan `old_data`, membatasi toggle `journal_lock` hanya ke `super_admin` (sesuai kebijakan kontrol), dan menambahkan `REVOKE EXECUTE`. (File `0010_` yang sudah ter-apply jangan di-edit mundur jika DB cloud sudah jalan — cukup dokumentasikan/standarkan urutannya). | Kecil | Sedang |
| **AUD-08** | Error Handling | **P1** | `super-admin-dashboard.tsx:72-91`, `admin-dashboard.tsx:223-250`, `audit-trail-page.tsx:75-85`, `master-readonly-page.tsx:63-83`, `budget-page.tsx:78-96` | Lima halaman memakai pola `try { ... } finally { setLoading(false); }` tanpa blok `catch`, sehingga kegagalan jaringan/izin menjadi *unhandled promise rejection* tanpa feedback UI/toast kepada pengguna. | Tambahkan `catch (err) { toast.error(...); }` yang konsisten pada seluruh `load()` / `init()`. | Kecil | Sangat Rendah |
| **AUD-09** | Performa | **P1** | `src/App.tsx:1-34`, `src/lib/pdf-generator.ts`, `src/lib/word-generator.ts`, `src/lib/excel-exporter.ts` | Seluruh 28+ halaman dan pustaka berat (`pdf-lib`, `docx`, `write-excel-file`) diimpor secara sinkron, menghasilkan 1 bundle JS utama **2.554,04 kB** (`734,32 kB` gzip) yang melampaui ambang 500 kB Vite (termasuk saat pengunjung hanya membuka `/login` atau `/portal-pembeli`). | Terapkan `React.lazy` + `Suspense` per portal/rute serta *dynamic import* pada generator PDF/Word/Excel saat tombol ekspor diklik. | Sedang | Rendah |
| **AUD-10** | Alur / Bug Data | **P2** | `admin-approvals-page.tsx:105,115,758`, `po-page.tsx:101,131,138`, `profit-sharing-page.tsx:93`, `journals-page.tsx:167,199,249`, `reports-page.tsx:111-112`, `projects-page.tsx:121-159`, `invoicing-page.tsx:108-131` | (a) Tanggal default `2026-11-07` / `2026-11-01` / `2027-01-31` ter-hardcode di 37 tempat termasuk saat menolak persetujuan pembayaran (`admin-approvals-page.tsx:758`). (b) `po-page.tsx:131` menginisialisasi `vendorId` dari `vnds[0]` (bisa vendor nonaktif), sedangkan `<Select>` hanya menampilkan vendor aktif; `reload` juga bergantung `[vendorId, projectId]` (`:138`) sehingga mengganti pilihan form memicu fetch ulang semua data. | Gunakan `todayIso()` (`new Date().toISOString().slice(0, 10)`) atau seed-relative date, filter `vnds.filter(v => v.is_active)` sebelum mengambil index `[0]`, dan hapus dependensi `[vendorId, projectId]` dari `reload`. | Kecil | Rendah |
| **AUD-11** | Keamanan / Edge | **P2** | `supabase/functions/buyer-submit-po/index.ts:66-90`, `supabase/migrations/0007:1383-1463`, `supabase/migrations/0005:336` | (a) Verifikasi Cloudflare Turnstile dilewati bila `TURNSTILE_SECRET_KEY` kosong. (b) `rpc_buyer_submit_po` tidak memvalidasi kesesuaian `sum(qty * price)` terhadap `p_po_value`. (c) Query notifikasi admin di trigger/RPC `0005:336` & `0007:1462` memakai `p.role = 'admin'` alih-alih `'admin' = ANY(p.roles)`. (d) Ketiga Edge Function menggunakan `Access-Control-Allow-Origin: "*"`. | Wajibkan secret Turnstile di environment produksi, validasi konsistensi total item PO di RPC, ubah filter penerima notifikasi ke `'admin' = ANY(p.roles)`, dan batasi CORS ke origin domain aplikasi. | Sedang | Rendah |
| **AUD-12** | Kode Mati | **P2** | `change-password-dialog.tsx`, `lattice-loader.tsx`, `accounting-hub-page.tsx`, `buyer-placeholder-page.tsx`, `system-config-page.tsx`, `package.json:30` | 4 file sumber (1.038 baris) dan `driver.js` tidak pernah direferensikan di mana pun; rute `/super-admin/konfigurasi` (`SystemConfigPage`, 734 baris) tumpang tindih dan tidak punya link di navigasi sidebar (`portal-shell.tsx`). Terdapat juga 11 fungsi ekspor tak terpakai & 3 `console.error` tersisa. | Hapus 4 file yatim + ekspor tak terpakai setelah konfirmasi (lihat Bagian 4). | Kecil | Sangat Rendah |
| **AUD-13** | Duplikasi / Monolit | **P2** | `project-detail-page.tsx` (4.667 brs), `operations-service.ts` (3.443 brs), `user-dashboard.tsx:65-93` vs `admin-dashboard.tsx:89-117`, `journals-page.tsx:110-126`, `reports-page.tsx:282-315` | `SHORT_MONTHS_ID` & `formatCompactRupiah` diduplikasi identik di 2 dashboard; helper tanggal & format mata uang diduplikasi di `journals-page` & `reports-page`; `project-detail-page.tsx` dan `operations-service.ts` terlalu monolitik untuk dirawat aman. | Ekstrak `formatCompactRupiah` & `SHORT_MONTHS_ID` ke `formatters.ts`; pecah tab `project-detail-page.tsx` menjadi komponen per tab dan modularisasi `operations-service.ts` lewat re-export barrel. | Besar | Sedang |
| **AUD-14** | UI/UX & `AGENTS.md` | **P2** | `accounting-page.tsx:387,406`, `button.tsx:11`, `project-detail-page.tsx:261-301`, `journals-page.tsx:907,1592`, `user-payments-page.tsx:438`, `google-drive-picker-dialog.tsx:176-186` | (a) `accounting-page.tsx` memakai `<select>` HTML mentah. (b) `button.tsx` hardcode `bg-[#0B43C8]`. (c) `project-detail-page.tsx:272-298` memakai `<button>` mentah untuk tombol aksi baris. (d) Pada viewport `390×844` (terlihat di screenshot `07_mobile_user_pembayaran_dark.png` & `07_mobile_admin_akuntansi_light.png`), empty state tabel (`<td colSpan>`) ikut melebar mengikuti `min-w` tabel horizontal sehingga ikon/teks terpotong di luar layar mobile; `Tabs` 3 item akuntansi juga terpotong tepinya di mobile (`Neraca Sa...`); `DialogHeader` pada `google-drive-picker-dialog.tsx` masih menyertakan ikon di samping judul + `DialogDescription`. (e) `Toaster` (`App.tsx:169`) `top-right` menutupi tombol header kanan (terlihat di `02_sa_dashboard_dark.png`). | Ganti `<select>` mentah dengan shadcn `<Select>`; gunakan `bg-primary` di `Button`; samakan `RowEditActionButtons` dengan `<Button size="icon" className="size-8 rounded-lg">`; render empty state tabel di wrapper `sticky left-0` atau di luar `<table>` di dalam `CardContent`; beri `overflow-x-auto` / `flex-wrap` yang rapi pada `TabsList` mobile; bersihkan `DialogHeader` picker Drive; pindahkan `Toaster` ke `bottom-right`. | Sedang | Rendah |
| **AUD-15** | Test Coverage | **P3** | `tests/` (7 berkas DB/lib) | Seluruh test yang ada menguji skema/RPC PGlite (`phase1`–`phase5`) dan helper format, tetapi belum ada 1 pun test UI komponen React (`@testing-library/react` sudah terpasang) maupun E2E browser flow untuk role switching, persetujuan, dan PKP invoicing. | Tambah minimal smoke/integration test untuk `AuthProvider` multi-role routing, form validasi modal pembayaran, dan perhitungan jurnal PKP. | Sedang | Sangat Rendah |

---

## 4. Daftar Kode Tidak Diperlukan

### 4.1 Pasti Aman Dihapus (0 Referensi Aktif di Seluruh Codebase)

| Lokasi (`file:baris`) | Jenis | Bukti Ketidakpakai / Alasan | Dampak |
| --- | --- | --- | --- |
| `src/components/shared/change-password-dialog.tsx` (396 baris) | Komponen Dialog | 0 import di `src/`. Fungsi ubah kata sandi sudah terintegrasi langsung di `src/features/profile/profile-settings-page.tsx`. File ini juga memakai pola lama (`DialogDescription`, badge `uppercase`). | -396 baris |
| `src/components/shared/lattice-loader.tsx` (325 baris) | Komponen Animasi | 0 import di `src/`. Animasi login sudah digantikan oleh `src/components/shared/oauth-loading-card.tsx`. | -325 baris |
| `src/features/accounting/accounting-hub-page.tsx` (264 baris) | Halaman Lama | 0 import (termasuk di `App.tsx`). Sudah digantikan oleh `AccountingPage` (`accounting-page.tsx`) yang menjadi hub tab akuntansi SAK. Mengandung `console.error` tersisa (`:43`). | -264 baris |
| `src/features/buyer-portal/buyer-placeholder-page.tsx` (53 baris) | Halaman Placeholder Fase 1 | 0 import di `src/`. Sudah digantikan penuh oleh `BuyerPortalPage` (`buyer-portal-page.tsx`). | -53 baris |
| `src/lib/asset-utils.ts:191` (`formatSocialFooterItems`) | Export Fungsi | 0 pemanggil di seluruh repo (`grep` hanya menemukan definisinya). | Pembersihan API internal |
| `src/lib/google-drive.ts:59,95,103,112,125,173` (`getGoogleDriveThumbnailUrl`, `isGoogleDriveAuthenticated`, `getGoogleDriveUserSession`, `setGoogleDriveUserSession`, `disconnectGoogleDriveUser`, `fetchGoogleDriveImageAsFile`) | 6 Export Fungsi Drive | 0 pemanggil eksternal; alur Google Drive aktif memakai `google-drive-picker.ts` dan `getGoogleDrivePreviewUrl` / `toDirectGoogleDriveUrl`. | -~70 baris kode mati |
| `src/components/layout/portal-shell.tsx:529`, `src/features/auth/auth-context.tsx:172` | `console.error` produksi | Logging console mentah di komponen UI/auth (atau ganti dengan handler terstruktur jika perlu). | Kebersihan log |

### 4.2 Perlu Konfirmasi Sebelum Dihapus

| Item & Lokasi | Status Saat Ini | Cara Memastikan / Alasan Konfirmasi |
| --- | --- | --- |
| `src/features/system-config/system-config-page.tsx` (734 baris) & rute `App.tsx:84-87` (`/super-admin/konfigurasi`) + `portal-shell.tsx:120` | Tidak punya tautan menu di `NAV_STRUCTURE_BY_ROLE.super_admin`. Isinya tumpang tindih dengan `/super-admin/profil-perusahaan` dan `/super-admin/administrasi`. | Konfirmasi dengan pemilik produk apakah `/super-admin/konfigurasi` memang halaman terpadu lama yang sudah dipecah ke 2 halaman baru; jika ya, aman dihapus seluruhnya (`-734` baris). |
| `driver.js` (`package.json:30`) | Terpasang di `dependencies`, 0 import di `src/`. | Konfirmasi apakah fitur tur interaktif onboarding (`driver-js` skill) masih direncanakan untuk fase berikutnya; jika belum dalam roadmap dekat, hapus dari `package.json`. |
| `src/lib/data-service.ts:603` (`updateInternalUserRole`) & `:1404` (`closePeriod`) | Export publik di `data-service.ts` dengan 0 pemanggil di `src/`. | `updateInternalUserRole` digantikan oleh `updateUserRoles` (multi-role), dan tutup buku ditangani di `operations-service.ts` / `periods-page.tsx`. Pastikan tidak ada skrip eksternal atau rencana migrasi sebelum menghapusnya. |
| `supabase/.temp/full_altcycles_cloud_setup.sql` | File hasil `supabase:bundle-sql` / dump lokal (diabaikan `.gitignore`). | Aman dibersihkan lokal kalau tidak sedang dipakai untuk sinkronisasi cloud SQL. |
| Default tanggal `"2026-11-07"` / `"2027-01-31"` pada filter/form (`po-page.tsx:101`, `admin-approvals-page.tsx:105,115,758`, `profit-sharing-page.tsx:93`, dll.) | Tanggal demo November 2026 hardcoded di banyak halaman. | Konfirmasi apakah di Demo Mode tanggal sengaja dikunci ke November 2026 agar selaras dengan data seed (`demo-seed.ts`), sedangkan di mode produksi (Cloud) wajib memakai tanggal hari ini. |

---

## 5. Rekomendasi Struktur Folder (Sebelum vs Sesudah)

Pembenahan dilakukan bertahap tanpa memutus import lama (gunakan barrel re-export sementara saat memecah `operations-service.ts` / `project-detail-page.tsx`).

```text
SEBELUM (Bermasalah / Tumpang Tindih)                  SESUDAH (Terstruktur & Terukur)
─────────────────────────────────────                  ───────────────────────────────────
src/                                                   src/
├─ components/                                         ├─ app/
│  ├─ layout/portal-shell.tsx (1.337 brs)              │  ├─ providers/          # ThemeProvider, AuthProvider (dipindah dari features/auth)
│  └─ shared/                                          │  └─ role-guard.tsx
│     ├─ change-password-dialog.tsx  [ORPHAN]          ├─ components/
│     ├─ lattice-loader.tsx          [ORPHAN]          │  ├─ layout/
│     └─ ... (15 aktif)                                │  │  ├─ portal-shell.tsx
├─ features/                                           │  │  ├─ nav-config.ts      # pisah NAV_STRUCTURE_BY_ROLE & BREADCRUMBS
│  ├─ accounting/                                      │  │  └─ notifications-dialog.tsx
│  │  ├─ accounting-hub-page.tsx     [ORPHAN]          │  ├─ shared/               # hanya komponen dipakai aktif (15 file)
│  │  ├─ accounting-page.tsx                           │  └─ ui/
│  │  ├─ journals-page.tsx (1.708 brs)                 ├─ features/
│  │  └─ reports-page.tsx  (2.229 brs)                 │  ├─ accounting/
│  ├─ auth/                                            │  │  ├─ components/        # pecah modal & tabel dari reports/journals
│  │  └─ auth-context.tsx            [KONTEKS GLOBAL]  │  │  ├─ accounting-page.tsx
│  ├─ buyer-portal/                                    │  │  ├─ journals-page.tsx
│  │  └─ buyer-placeholder-page.tsx  [ORPHAN]          │  │  └─ reports-page.tsx
│  ├─ client-projects/                                 │  ├─ auth/                 # login-page, password-reset-pages
│  │  └─ project-detail-page.tsx     (4.667 brs!)      │  ├─ client-projects/
│  ├─ dashboard/                                       │  │  ├─ tabs/              # TerminTab, ClientPoTab, ContractsTab, AcceptanceDocsTab
│  │  └─ user-dashboard.tsx                            │  │  └─ project-detail-page.tsx
│  ├─ master-data/                                     │  ├─ dashboard/
│  │  ├─ admin-dashboard.tsx         [SALAH FOLDER]    │  │  ├─ admin-dashboard.tsx       (relokasi + re-export shim sementara)
│  │  └─ ...                                           │  │  ├─ super-admin-dashboard.tsx
│  └─ system-config/                                   │  │  └─ user-dashboard.tsx
│     ├─ super-admin-dashboard.tsx   [DASHBOARD]       │  ├─ master-data/ ... (khusus COA, Parties, Periods, Projects)
│     └─ system-config-page.tsx      [DUPLIKAT ROUTE]  │  └─ system-config/ ... (tanpa duplikat konfg)
└─ lib/                                                └─ lib/
   ├─ data-service.ts       (1.901 brs)                   ├─ services/               # pecah data-service & operations-service per domain
   └─ operations-service.ts (3.443 brs)                   │  ├─ index.ts            # re-export agar import lama tetap jalan 100%
                                                          │  ├─ accounting.service.ts
                                                          │  ├─ projects.service.ts
                                                          │  └─ approvals.service.ts
                                                          └─ ... (formatters, accounting-engine, exporters)
```

---

## 6. Rekomendasi Design System (`DESIGN.md` Ringkas)

Mengacu pada `AGENTS.md` (konvensi Altcycles) serta pola struktur dokumen desain pada `.agents/repos/awesome-design-md` (`stripe/DESIGN.md`):

### 6.1 Token Warna & Atmosfer Visual (`src/index.css`)
- **Primary Brand Blue:** `--primary: #0B43C8` (Light & Dark), `--primary-foreground: #FFFFFF`, `--ring: #1FB1F2`.
  - **Aturan Wajib:** seluruh tombol utama dan aksen sekunder memakai token Tailwind `bg-primary` / `text-primary dark:text-sky-400` / `bg-primary/10 border-primary/25` — **hapus** kode hex hardcoded seperti `bg-[#0B43C8]` pada `src/components/ui/button.tsx:11` dan warna custom non-token di `RowEditActionButtons`.
- **Surface Hierarchy:**
  - Light: Canvas `#F0F1F3` (`--background`), Kartu `#FFFFFF` (`--card`), Field `#F4F6F9` (`--field-bg`), Border `#D8DCE3`.
  - Dark: Deep Navy Canvas `#090E19`, Kartu `#121A2B`, Field `#0D1526`, Border `rgba(255,255,255,0.09)`.
- **Semantic Financial Status:** Wajib selalu berpasangan warna + label teks Indonesia (`--status-success-*`, `--status-warning-*`, `--status-info-*`, `--status-danger-*`).

### 6.2 Tipografi, Spasi, & Komponen Standar
- **Layout Halaman:** `flex flex-col gap-6`; header `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between` tanpa `border-b`; `<h1>` `text-2xl sm:text-3xl font-bold tracking-tight`, subjudul 1 kalimat `text-xs sm:text-sm text-muted-foreground mt-1`.
- **Card & KPI:** `rounded-2xl border-border/80 bg-card shadow-2xs`. Jarak `CardTitle` dan `CardDescription` tetap **4px** (`gap-1` / `space-y-1`). Kartu KPI memakai `p-5 flex items-center justify-between gap-4` + `tabular-nums` + ikon kotak `size-10 rounded-xl border` kanan.
- **Tabel Edge-to-Edge & Mobile Empty State:**
  - Card pembungkus tabel memakai `CardContent className="p-0"`, `<TableHead>` `text-center text-xs sm:text-sm font-semibold` dalam **Proper Case** (kecuali modul `reports-page` / `accounting` untuk istilah SAK resmi), `<TableCell>` `align-top text-xs sm:text-sm leading-5`.
  - Seluruh nilai moneter wajib memakai `<MonetaryCell />`; kolom Aksi memakai `<Button size="icon" className="size-8 rounded-lg ...">` (kecuali tombol `Bandingkan` di Audit Trail).
  - **Perbaikan Mobile Empty State:** jangan mengandalkan centering teks di dalam `<td colSpan>` selebar tabel overflow horizontal; render empty state pada wrapper luar `<Table>` atau gunakan `sticky left-0 max-w-[calc(100vw-2rem)]` agar ikon/judul empty state selalu tepat di tengah viewport mobile.
- **Input, Checkbox & Select:**
  - Semua field numerik memakai `<NumberInput />` (format `id-ID`: titik ribuan, koma desimal), kecuali tahun/konfigurasi digit (`periods-page.tsx:840`, `admin-settings-page.tsx:424` tetap diizinkan sesuai `AGENTS.md`).
  - Semua dropdown wajib `<Select>` shadcn (hapus `<select>` mentah di `accounting-page.tsx:387,406`); semua checkbox memakai `@/components/ui/checkbox`.
- **Modal Dialog & Toast:**
  - `DialogHeader`: **hanya `DialogTitle` + tombol tutup `X` sejajar 1 baris** (`flex items-center justify-between`). Hapus ikon dekoratif & `DialogDescription` di `google-drive-picker-dialog.tsx` dan `change-password-dialog.tsx` (jika dipertahankan).
  - Konfirmasi hapus/aksi destruktif wajib lewat `<ConfirmActionDialog />`.
  - Pindahkan `<Toaster />` (`App.tsx:169`) ke `bottom-right` agar tidak menutupi tombol aksi header top-right (`02_sa_dashboard_dark.png`).

---

## 7. Masalah Alur Sistem & Langkah Reproduksi

### 7.1 Desinkronisasi Peran Saat Pindah Halaman Multi-Role via URL / Bookmark (`P0`)
- **Lokasi:** `src/features/auth/auth-context.tsx:492-511`, `src/lib/operations-service.ts:1021-1025`, `src/features/master-data/admin-dashboard.tsx:222-250`
- **Langkah Reproduksi (Terverifikasi Live di Headless Chrome `task-5574`):**
  1. Login sebagai pengguna multi-role (`Muhammad Izzul Islam`, memiliki `["super_admin", "admin", "user"]`) sehingga masuk ke `/super-admin/dashboard`.
  2. Akses `/admin/dashboard` atau `/admin/akuntansi` langsung lewat URL bar (atau reload/bookmark rute role lain).
  3. **Hasil Aktual:** UI berubah menjadi portal Bendahara/Admin (`Mode Aktif: Bendahara`), tetapi `AuthProvider` hanya mengubah `tabRole` di memori/sessionStorage tanpa memanggil `switchActiveRole("admin")`. Akibatnya `listJournalsWithLines()` melempar exception `"Hanya Admin yang dapat mengakses daftar jurnal akuntansi."`, memunculkan toast error merah (`07_mobile_admin_akuntansi_light.png`), **6 promise tidak tertangani**, dan KPI dashboard menampilkan `Rp0` (`04_admin_dashboard_light.png` / `07_mobile_admin_dash_dark.png`). Di Supabase Cloud, RPC/RLS yang memeriksa `public.current_user_role() = 'admin'` akan gagal ketika `profiles.role` di DB masih `'super_admin'`.
- **Rekomendasi:** Ketika `routeRole` valid dan ada dalam `availableRoles` namun berbeda dari `activeRole`, jalankan sinkronisasi penuh ke store/backend (`switchActiveRole(routeRole)`), dan tambahkan `catch` pada seluruh halaman dashboard.

### 7.2 Penghitungan PPN Faktur PKP Tidak Memisahkan Akun PPN Keluaran (`P1`)
- **Lokasi:** `supabase/migrations/0007_phase4...sql:672-691`, `src/lib/operations-service.ts:2239-2267`
- **Langkah Reproduksi:**
  1. Aktifkan status PKP (`pkp_enabled = true`) di Profil Perusahaan.
  2. Buat dan terbitkan faktur penjualan atas proyek/termin (mis. DPP Rp10.000.000 + PPN Rp1.100.000 = Total Rp11.100.000).
  3. **Hasil Aktual:** Piutang (Debit) dicatat Rp11.100.000 dan Kredit seluruhnya masuk ke `contract_billings` / `service_revenue` / `unearned_revenue` sebesar Rp11.100.000. Kewajiban pajak PPN Keluaran bernilai Rp0, sehingga Laba Rugi / Nilai Tagihan Kontrak melebihi DPP dan Laporan PPN Keluaran tidak terbentuk.
- **Rekomendasi:** Kreditkan akun pendapatan/termin sebesar `subtotal` dan kreditkan akun liabilitas `PPN Keluaran` sebesar `ppnAmount`.

### 7.3 Status PO Klien Terverifikasi Dapat Ditimpa Ulang Tanpa Jejak Audit Penolakan (`P1`)
- **Lokasi:** `supabase/migrations/0007_phase4...sql:1607-1653` (`verify_client_po`)
- **Langkah Reproduksi:**
  1. Panggil RPC `verify_client_po` untuk PO klien yang statusnya sudah `'verified'` dan telah terhubung ke proyek/invoice, dengan parameter `p_approve = false`.
  2. **Hasil Aktual:** Fungsi tidak menolak transisi dari `'verified' -> 'rejected'`, langsung memperbarui status PO menjadi `'rejected'`, dan cabang penolakan (`ELSE`) tidak menyisipkan baris ke `public.audit_logs`.
- **Rekomendasi:** Wajibkan status awal `= 'pending_verification'` dengan `RAISE EXCEPTION` jika status lain, serta catat `audit_logs` pada cabang approve maupun reject.

### 7.4 Eskalasi Peran Melalui Metadata Signup & Audit Trail `update_user_roles` (`P0`/`P1`)
- **Lokasi:** `supabase/migrations/0009...sql:42-50`, `supabase/migrations/0010_user_deletion_and_multi_role_management.sql:199-225`
- **Langkah Reproduksi:**
  1. Pada proyek Supabase di mana public sign-up tidak dinonaktifkan secara ketat, pemanggilan `supabase.auth.signUp({ email, password, options: { data: { role: 'super_admin', roles: ['super_admin'] } } })` menyebabkan trigger `SECURITY DEFINER` `handle_new_auth_user()` menyalin `'super_admin'` dari metadata klien ke `public.profiles`.
  2. Saat Super Admin mengubah role user lewat `update_user_roles`, variabel `v_target_profile` di-timpa `RETURNING *` oleh perintah `UPDATE` sebelum dibaca pada blok `INSERT INTO audit_logs`.
- **Rekomendasi:** Abaikan metadata peran dari klien pada `handle_new_auth_user()` (paksa `'user'`), hapus email pribadi hardcoded dari `auth-context.tsx`, dan simpan nilai `v_old_role` sebelum mengeksekusi `UPDATE` di `update_user_roles`.

### 7.5 Ketidakkonsistenan Input & Pencatatan Tanggal Persetujuan / PO (`P2`)
- **Lokasi:** `src/features/payment-approvals/admin-approvals-page.tsx:758`, `src/features/purchase-orders/po-page.tsx:101,131,138`
- **Langkah Reproduksi:**
  1. Buka `/admin/persetujuan`, klik tolak pada pengajuan pembayaran. UI memanggil keputusan penolakan dengan tanggal hardcoded `"2026-11-07"` (`:758`), bukan tanggal aktual hari itu.
  2. Buka `/user/po` ketika vendor pertama di array mentah berstatus nonaktif (`is_active = false`): state `vendorId` terisi ID vendor nonaktif yang tidak ada di opsi `<Select>` (hanya memfilter `v.is_active`), sementara mengganti dropdown proyek/vendor memicu `reload()` penuh.
- **Rekomendasi:** Pakai tanggal aktual dinamis untuk keputusan transaksi, pilih default dari `activeVendors[0]`, dan stabilkan dependensi `useCallback` pada `reload()`.

---

## 8. Rencana Perbaikan Bertahap (Checklist Eksekusi)

> **Status:** Menunggu persetujuan Anda sebelum perubahan kode dimulai. Tiap fase dijalankan bertahap dan diverifikasi dengan `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build`.

### Tahap 1 — Kebersihan CI, Test Stability & Penghapusan Kode Mati *(Risiko: Sangat Rendah, Dampak: Tinggi)*
- [x] Perbaiki konfigurasi paralel Vitest (`vite.config.ts`) agar `npm test` (7 berkas / 33 test PGlite) berjalan andal tanpa OOM WASM.
- [x] Selesaikan seluruh 15 error + 1 warning ESLint (`date-picker.tsx`, `data-service.ts`, `google-drive-picker.ts`, `theme-context.tsx`, `phase5-multi-role.test.ts`).
- [x] Hapus 4 file yatim (`change-password-dialog.tsx`, `lattice-loader.tsx`, `accounting-hub-page.tsx`, `buyer-placeholder-page.tsx`) serta 7 fungsi export tak terpakai + `console.error` sisa.
- [ ] *(Dikecualikan / Dipertahankan)* Folder `.agents/repos/`, dependency `driver.js`, serta `/super-admin/konfigurasi` (`system-config-page.tsx`) dipertahankan sesuai arahan Anda.

### Tahap 2 — Keamanan Auth & Perbaikan Alur Lintas-Peran *(Risiko: Rendah-Sedang, Dampak: Kritis)*
- [x] Perbaiki sinkronisasi `tabRole` -> `switchActiveRole(routeRole)` di `auth-context.tsx` sehingga navigasi URL multi-role tidak memicu error role & crash promise.
- [x] Tambahkan `catch` + pesan error ramah pengguna di 5 halaman yang menelan error async (`admin-dashboard`, `super-admin-dashboard`, `audit-trail`, `master-readonly`, `budget-page`).
- [x] Buat migrasi baru (`0017_*`) untuk mengamankan `handle_new_auth_user()`, memperbaiki `old_data` pada `update_user_roles`, membatasi `set_journal_lock_status` ke `super_admin` + `REVOKE EXECUTE`, dan memperbaiki query notifikasi `'admin' = ANY(p.roles)`.
- [x] Hilangkan email personal hardcoded dari bundle klien (`auth-context.tsx`), samakan aturan password minimal 8 karakter, batasi CORS Edge Function ke domain resmi, dan wajibkan secret Turnstile di produksi.

### Tahap 3 — Akurasi Akuntansi SAK & Transaksi Operasional *(Risiko: Sedang, Dampak: Tinggi)*
- [x] Pisahkan pencatatan akun liabilitas **PPN Keluaran** saat `pkp_enabled = true` pada RPC SQL (`0007`) & `createAndIssueSalesInvoice` (`operations-service.ts`).
- [x] Kunci guard status `pending_verification` + catat `audit_logs` pada cabang reject `verify_client_po`.
- [x] Perbaiki bug pengecekan `.approver_id` pada `deleteInternalUser` Demo Mode (`data-service.ts:541,550`).
- [x] Ganti tanggal hardcoded transaksi (`admin-approvals-page.tsx:758`, `po-page.tsx:101`, dll.) dengan tanggal dinamis serta perbaiki inisialisasi vendor aktif + dependensi `reload()` di `po-page.tsx`.

### Tahap 4 — Konsistensi Design System & UI/UX Mobile *(Risiko: Rendah, Dampak: Tinggi)*
- [x] Ganti `<select>` HTML mentah (`accounting-page.tsx`), `bg-[#0B43C8]` (`button.tsx`), `<button>` kustom baris tabel (`project-detail-page.tsx:261-301`), serta bersihkan `DialogHeader` (`google-drive-picker-dialog.tsx`).
- [x] Perbaiki tampilan empty state tabel di viewport mobile `390px` (tidak ikut bergeser jauh di dalam scroll horizontal) dan responsivitas tab bar akuntansi di layar sempit.
- [x] Pindahkan posisi `<Toaster />` ke `bottom-right` agar tidak menutupi controls header top-right.
- [x] Ekstrak `formatCompactRupiah`, `SHORT_MONTHS_ID`, dan helper format mata uang/tanggal yang duplikat ke `src/lib/formatters.ts`.

### Tahap 5 — Optimasi Bundle, Modularisasi & Penambahan Test *(Risiko: Sedang, Dampak: Jangka Panjang)*
- [x] Terapkan `React.lazy` per rute/portal di `src/App.tsx` dan *dynamic import* pada `pdf-lib`, `docx`, serta `write-excel-file` agar chunk awal turun drastis di bawah 500 kB.
- [x] Pecah `project-detail-page.tsx` (4.667 baris) per tab fitur dan `operations-service.ts` (3.443 baris) per domain lewat barrel re-export.
- [x] Tambah test integrasi React untuk alur switch role multi-peran dan skenario jurnal faktur PKP.

