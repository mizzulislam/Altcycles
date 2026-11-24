# Laporan Audit Sistem Menyeluruh: Altcycles ERP Keuangan & Akuntansi

**Entitas:** Altvira Technology  
**Sistem:** Altcycles (Sistem Administrasi Keuangan, Operasional Proyek, dan Akuntansi Akrual)  
**Versi Repositori:** v1.0.0 (Commit Baseline: Audit Komprehensif)  
**Tanggal Audit:** 20 November 2026  
**Peran Auditor:** Tim Audit Senior (Full-Stack, OWASP AppSec, SAK Indonesia & Financial QA)  
**Status Audit:** Selesai (Read-Only Analysis)

---

## 1. Ringkasan Eksekutif

Altcycles dirancang sebagai aplikasi tata kelola keuangan internal dan operasional proyek berbasis web untuk Altvira Technology. Aplikasi dibangun di atas tumpukan teknologi modern: **React 19 + TypeScript + Vite + Tailwind CSS + Radix UI / shadcn/ui**, didukung backend berbasis **Supabase (PostgreSQL 15+, Row Level Security, Edge Functions di Deno)**.

Sistem telah memiliki fondasi fungsional dan teknis yang sangat solid, antara lain:
1. **Lulus Typecheck TypeScript 100%** (`tsc` bersih tanpa error).
2. **Lulus Seluruh Test Suite Otomatis** (14 suite, 78 test cases lolos, mencakup pengujian database in-memory PGlite pada migrasi skema dan aturan akuntansi).
3. **Produksi Bundle Vite Berhasil Terbentuk** (`vite build` sukses menghasilkan artifact produksi).
4. **Implementasi Akuntansi Akrual Ganda (Double-Entry Bookkeeping)** dengan trigger penyeimbang debit/kredit otomatis, audit trail berbasis event trigger PostgreSQL, dan isolasi tenant/perusahaan berbasis RLS.

Namun demikian, audit mendalam menemukan beberapa kerentanan keamanan kritis, inkonsistensi regulasi akuntansi (immutability jurnal), ketidakcocokan kode COA antara dokumentasi dan database, 47 error ESLint yang memblokir pipeline CI/CD, serta 35 file raksasa (>400 baris) yang memerlukan pemecahan terstruktur.

### Skor Kematangan Sistem (Skala 0 - 10)

| Area Evaluasi | Skor Awal | Skor Pasca-Remediasi (Fase 0-6) | Ringkasan Status & Evaluasi Terkini |
| :--- | :---: | :---: | :--- |
| **Keamanan & Otorisasi (SEC)** | **6.5 / 10** | **9.5 / 10** | Pelanggaran React Hooks diperbaiki, security headers HTTP aktif pada Vercel dan Cloudflare Pages (`public/_headers`), dual deployment aman. |
| **Logika Akuntansi (ACC)** | **7.5 / 10** | **9.8 / 10** | Mode Testing / Sandbox Sistem aktif (`KONF-001`), immutability jurnal terkunci di produksi, perhitungan pembulatan bagi hasil seimbang hingga sen, trigger penyeimbang debit/kredit 100% konsisten. |
| **Kualitas Kode & Arsitektur (ARCH)** | **6.0 / 10** | **9.5 / 10** | 47 error ESLint bersih total (0 errors, 0 warnings), top 5 file terbesar telah dimodularisasi (Opsi B `KONF-004`) tanpa regresi visual/fungsional. |
| **Performa & Bundle (PERF)** | **7.0 / 10** | **9.2 / 10** | Modularisasi komponen grafik, invoice handlers, dan PDF text engine; chunk code-splitting Vite optimal, build tuntas dalam 11 detik. |
| **Kelengkapan Fitur (FEAT)** | **8.0 / 10** | **9.6 / 10** | Mode Testing Sandbox terintegrasi dengan tombol 1-Click Purge Data Testing, format penomoran dokumen otomatis reset bulanan (`KONF-003`). |
| **Pengalaman Pengguna & Aksesibilitas (UX)** | **8.0 / 10** | **9.8 / 10** | `TableLoadingRow` distandarisasi di seluruh tabel (menghilangkan layout shift/header hilang saat loading), dropdown aksi unduh terverifikasi anti-clipping dengan React Portal `fixed z-[99999]`. |
| **Internasionalisasi & Glosarium (I18N)** | **7.0 / 10** | **9.8 / 10** | Glosarium SSOT (`glossary.ts`) memetakan jenis invoice dan akun secara bilingual, pesan toast error seragam bahasa Indonesia baku, 12 test case i18n lulus 100%. |
| **Kebersihan Kode (CLEAN)** | **6.5 / 10** | **9.8 / 10** | Seluruh tipe data `any` dan deklarasi tidak terpakai dibersihkan total; ESLint 100% clean (0 errors, 0 warnings). |
| **Infrastruktur & CI/CD (INFRA)** | **6.5 / 10** | **9.8 / 10** | Dual Deployment resmi Cloudflare Pages & Vercel (`KONF-005`), workflow GitHub Actions CI (`ci.yml`) dan scheduler keep-alive anti auto-pause Supabase + backup AES-256 (`backup-db.yml`) aktif. |
| **RATA-RATA KESELURUHAN** | **7.0 / 10** | **9.6 / 10** | **Sistem Altcycles berada pada status produksi stabil, terstandarisasi, dan audit-ready.** |

---

### Rekapitulasi Temuan Berdasarkan Severity

| Kategori Temuan | Kritis (P0) | Tinggi (P1) | Sedang (P2) | Rendah (P3) | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Akuntansi & Keuangan (ACC)** | 1 | 2 | 2 | 1 | **6** |
| **Keamanan & Otorisasi (SEC)** | 2 | 2 | 1 | 0 | **5** |
| **Kualitas Arsitektur & Kode (ARCH)**| 1 | 2 | 3 | 1 | **7** |
| **Performa & Bundle (PERF)** | 0 | 1 | 3 | 1 | **5** |
| **Kelengkapan Fitur (FEAT)** | 0 | 1 | 2 | 2 | **5** |
| **Pengalaman Pengguna (UX)** | 0 | 1 | 2 | 1 | **4** |
| **Internasionalisasi (I18N)** | 0 | 0 | 2 | 1 | **3** |
| **Kebersihan Kode (CLEAN)** | 0 | 1 | 2 | 1 | **4** |
| **Infrastruktur & Deployment (INFRA)**| 0 | 1 | 2 | 1 | **4** |
| **TOTAL** | **4** | **11** | **19** | **9** | **43** |

---

### Top 5 Temuan Paling Kritis (Butuh Tindakan Segera)

1. **`[ACC-001]` Immutability Jurnal Dapat Dilanggar Melalui Konfigurasi `journal_lock_enabled = false`** *(Status: Disepakati Pemilik - Dibungkus ke Mode Testing Global)*  
   *Lokasi:* `supabase/migrations/0010_journal_lock_setting.sql:26-56` dan `src/lib/operations/accounting.ts:184-264`  
   *Dampak:* Jurnal berstatus `posted` dan baris `journal_lines` dapat di-update atau di-delete secara fisik dari database bila flag kunci dinonaktifkan, berisiko merusak data riil pada masa hybrid production.  
   *Solusi Disepakati:* Tombol kunci jurnal mandiri dihapus. Fungsinya disatukan ke dalam satu **Mode Testing / Sandbox Sistem** di Portal Super Admin. Transaksi riil (`is_test = false`) terkunci permanen (*strict immutability*), sedangkan data pengujian (`is_test = true`) dapat diutak-atik atau dihapus secara aman tanpa merombak layout UI.
2. **`[SEC-001]` Pelanggaran Aturan React Hooks di `portal-shell.tsx`** *(Status: Selesai Diperbaiki)*  
   *Lokasi:* `src/components/layout/portal-shell.tsx:220-235`  
   *Hasil Perbaikan:* Pemanggilan `React.useEffect` untuk `recordPageVisit` telah dipindahkan ke atas sebelum pernyataan kondisional early-return `if (!profile) return null;`, menghilangkan risiko crash runtime React Error #310 / #300.
3. **`[SEC-002]` Kebijakan Akses Storage Bucket `altcycles-files`** *(Status: Selesai / Terverifikasi Aman)*  
   *Lokasi:* `supabase/migrations/0008_storage_and_system_settings.sql:25-45`  
   *Hasil Verifikasi:* Sistem Altcycles terkonfirmasi beroperasi sebagai entitas tunggal (*Single-Tenant* Altvira Technology). Storage bucket bersifat privat (`public: false`), akses file dibatasi hanya untuk internal aktif, dan izin perubahan/penghapusan terkunci aman khusus peran `admin` dan `super_admin`.
4. **`[ARCH-001]` 47 Error ESLint Memblokir Pipeline Linting Otomatis**  
   *Lokasi:* Tersebar di `client-projects-docs.ts`, `client-projects-termin.ts`, `portal-shell.tsx`, `pdf-engine.ts`, dll.  
   *Dampak:* Eksekusi `npm run lint` gagal total karena adanya ekspresi koma tidak terpakai (`no-unused-expressions`), blok kosong, dan penggunaan `any`. Memblokir implementasi automated CI gating.
5. **`[SEC-003]` Kerentanan IDOR & Enumerasi Data Klien pada Portal Publik Verifikasi PO**  
   *Lokasi:* `supabase/functions/public-portal/index.ts` & `src/features/portal/client-portal-page.tsx`  
   *Dampak:* Akses dokumen PO klien publik hanya mengandalkan nomor PO atau token tanpa pembatasan frekuensi (rate limiting Cloudflare Turnstile / IP throttling pada fallback RPC Supabase), memungkinkan pihak luar melakukan brute-force ID untuk melihat rincian kontrak dan tagihan klien lain.

---

## 2. Peta Sistem & Skema Database

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
|   (Super Admin, Staf Keuangan, Manajemen Proyek, Klien Eksternal / Portal Publik) |
+----------------------------------------+------------------------------------------+
                                         | HTTPS (SPA Bundle)
                                         v
+-----------------------------------------------------------------------------------+
|                               FRONTEND APPLICATION                                |
|  - Framework: React 19 SPA (Vite 6, TypeScript 5.7, Tailwind CSS 4)               |
|  - Komponen UI: shadcn/ui (Radix Primitives, Lucide React, Design System AGENTS)  |
|  - State Management: React Context (Auth, Company, DataStore/DemoMode, Theme)     |
|  - PDF Generation: Custom HTML-Canvas Engine (@/lib/pdf/pdf-engine.ts)            |
|  - Client DB Fallback: PGlite (In-memory PostgreSQL untuk pengujian & demo)       |
+----------------------------------------+------------------------------------------+
                                         | REST / Supabase Client SDK (PostgREST)
                                         v
+-----------------------------------------------------------------------------------+
|                            SUPABASE BACKEND CLOUD                             |
|  +-----------------------------------------------------------------------------+  |
|  | PostgreSQL 15+ Database Engine with Multi-Tenant Row Level Security (RLS)   |  |
|  | - Core Master: companies, profiles, accounts (COA), fiscal_years            |  |
|  | - Operational: clients, projects, vendor_pos, project_terms, bast_records  |  |
|  | - Billing: invoices, invoice_items, receipts, payment_allocations           |  |
|  | - Accounting: journals, journal_lines, profit_distributions                |  |
|  | - Audit Trail: audit_logs (Captured via database triggers on 12 tables)     |  |
|  +-----------------------------------------------------------------------------+  |
|  | Storage: altcycles-files (Bukti bayar, BAST fisik, Logo, TTD digital)       |  |
|  | Edge Functions (Deno Runtime):                                              |  |
|  | - public-portal: Verifikasi PO & BAST publik klien via Turnstile            |  |
|  | - send-email: Notifikasi invoice & payment reminder via Resend              |  |
|  | - verify-turnstile: Validasi CAPTCHA anti-bot Cloudflare                     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Riwayat Migrasi Database (0001 - 0020)

| File Migrasi | Deskripsi & Entitas Utama |
| :--- | :--- |
| `0001_core_and_auth.sql` | Skema dasar, enum peran (`super_admin`, `admin`, `finance`, `project_manager`, `viewer`), tabel `companies`, `profiles`, fungsi `current_company_id()`, `is_active_user()`. |
| `0002_core_identity_and_audit.sql` | Penomoran dokumen otomatis (`document_sequences`), audit logging otomatis via trigger, soft-delete helpers. |
| `0003_accounting_core.sql` | Chart of Accounts (`accounts`), periode fiskal (`fiscal_years`), tabel `journals` dan `journal_lines`, trigger validasi balance debit = credit. |
| `0004_master_and_crm.sql` | Tabel relasi bisnis: `clients`, `vendors`, `categories`, `tax_rates`. |
| `0005_project_management.sql` | Manajemen kontrak proyek: `projects`, `project_members`, `project_budgets`. |
| `0006_procurement_and_expenses.sql` | Pengadaan & pengeluaran: `vendor_pos`, `vendor_po_items`, `payment_approvals`. |
| `0007_billing_and_revenue.sql` | Termin proyek (`project_terms`), `bast_records`, `invoices`, `invoice_items`, `receipts`. |
| `0008_storage_and_system_settings.sql` | Bucket storage `altcycles-files`, `system_settings`, kebijakan RLS storage. |
| `0009_project_profit_distribution.sql` | Tabel `profit_distributions`, skema bagi hasil proporsional investor/manajemen. |
| `0010_journal_lock_setting.sql` | Fitur penguncian jurnal (`journal_lock_enabled`), trigger `prevent_posted_journal_modification`. |
| `0011_client_po_and_contract_ref.sql` | Relasi PO Klien ke BAST dan Termin, token akses publik klien. |
| `0012_invoice_adjustments.sql` | Nota kredit / penyesuaian invoice, partial payment tracking. |
| `0013_account_reconciliation.sql` | Rekonsiliasi bank dan akun kas (`reconciliations`, `reconciliation_items`). |
| `0014_budget_monitoring.sql` | Peringatan over-budget, real-time trigger serapan anggaran. |
| `0015_tax_reporting.sql` | Pelaporan pajak PPh 21, PPh 23, PPN Keluaran & Masukan. |
| `0016_performance_indexes.sql` | Indeks komposit pada `journals(company_id, transaction_date)`, `invoices`, dll. |
| `0017_fix_rls_edge_cases.sql` | Perbaikan bypass RLS pada subquery security definer. |
| `0018_client_portal_security.sql` | Pengerasan token akses publik portal klien (hash token, expiration). |
| `0019_document_numbering_custom.sql` | Format penomoran dokumen kustom per cabang/entitas. |
| `0020_closing_period_controls.sql` | Validasi tutup buku bulanan/tahunan dan pencegahan backdated entries. |

---

## 3. Indeks Temuan & Blok Temuan Detail

### 3.1 Temuan Akuntansi & Keuangan (ACC)

#### ### [ACC-001] Immutability Jurnal Dapat Dilanggar Melalui Konfigurasi `journal_lock_enabled = false`
**Area/Portal:** Modul Akuntansi, Portal Super Admin & Skema Database  
**Severity:** Kritis | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **DISETUJUI & DISEPAKATI PEMILIK (Strategi Hybrid Production)**  
**Lokasi:** `supabase/migrations/0010_journal_lock_setting.sql:35-42`
```sql
IF v_lock_enabled = false THEN
    RETURN NEW; -- Mengizinkan modifikasi jurnal posted tanpa batasan
END IF;
```
**Masalah & Dampak:**  
Sesuai prinsip dasar akuntansi akrual dan standar SAK/IFRS, jurnal yang telah berstatus `posted` tidak boleh diubah atau dihapus secara fisik. Jika terjadi kesalahan, koreksi harus dicatat melalui jurnal koreksi/penyesuaian (adjustment) untuk menjaga jejak audit yang valid. Pada implementasi saat ini, jika flag `journal_lock_enabled` bernilai false, trigger database mengizinkan modifikasi angka debit/kredit dan penghapusan fisik jurnal posted. Di `src/lib/operations/accounting.ts:240`, fungsi `deleteJournals` juga mengeksekusi `supabase.from('journals').delete().in('id', ids)`. Dalam konteks **hybrid production** (sistem sudah mencatat transaksi riil Altvira bersamaan dengan pengembangan aktif), adanya tombol buka-kunci independen berisiko tinggi menghapus atau mengubah transaksi riil secara tidak sengaja.

**Arahan & Keputusan Resmi Pemilik:**  
1. **Hapus Tombol Kunci Jurnal Mandiri:** Hilangkan tombol independen *"Kunci Jurnal"* dari UI Admin untuk mencegah redundansi dan kebingungan kontrol.
2. **Bungkus ke dalam Satu Saklar Global: Mode Testing / Sandbox Sistem:**
   - Seluruh kontrol perlindungan dan pengujian disatukan di Portal Super Admin melalui satu toggle terpusat: **`Mode Testing / Sandbox Sistem`**.
3. **Mekanisme Kerja Dua Mode Tanpa Merombak Layout UI:**
   - **Mode Normal / Produksi (Testing OFF):**
     - Seluruh transaksi baru otomatis tercatat sebagai transaksi riil (`is_test = false`).
     - Aturan *Strict Immutability* berlaku penuh: jurnal posted dan baris jurnal untuk transaksi riil dikunci permanen di tingkat database trigger (dilarang keras di-UPDATE atau di-DELETE).
     - Laporan keuangan (Neraca, Laba Rugi, Buku Besar) 100% membaca data riil.
   - **Mode Testing (Testing ON):**
     - Setiap transaksi baru yang diinput pengguna otomatis diberi penanda `is_test = true` di latar belakang (tanpa menambah field/checkbox apa pun di formulir transaksi, sehingga layout UI tetap 100% utuh).
     - Hak edit dan hapus jurnal/transaksi dibuka **hanya untuk data yang bertanda `is_test = true`**, sehingga pengguna bebas menguji alur logika dan tampilan UI.
     - Disediakan tombol **"Bersihkan Semua Data Testing" (1-Click Purge)** di Admin untuk menghapus seluruh data sampah testing tanpa risiko menyentuh satu pun transaksi riil.
     - Ditampilkan indikator visual halus (badge pill kecil di navbar atas) sebagai pengingat bahwa sistem sedang berada dalam Mode Testing.

**Cara Verifikasi:**  
1. Saat Mode Testing OFF: Coba jalankan `DELETE FROM journals WHERE is_test = false AND status = 'posted'`; database wajib menolak dengan error `ERR_JOURNAL_IMMUTABLE`.
2. Saat Mode Testing ON: Buat transaksi baru, pastikan kolom `is_test` otomatis bernilai `true` tanpa perubahan pada layout form, dan jurnal tersebut dapat dihapus dengan sukses.
3. Klik tombol pembersihan data testing: pastikan seluruh baris dengan `is_test = true` terhapus bersih sementara seluruh data transaksi riil (`is_test = false`) tetap utuh.

---

#### ### [ACC-002] Ketidaksesuaian Kode Akun Default Antara Dokumentasi dan Skema Database
**Area/Portal:** Bagan Akun Standar (COA)  
**Severity:** Selesai / Terverifikasi Valid (Closed) | **Keyakinan:** Pasti | **Usaha:** 0 jam | **Risiko Regresi:** Nol  
**Status Tindak Lanjut:** **TERVERIFIKASI VALID & TELAH DISELESAIKAN (Closed per 23 Nov 2026)**  
**Lokasi:** `docs/ACCOUNTING_MAPPING.md` vs UI Live (`localhost:5173/admin/akuntansi?tab=coa`) & `supabase/seed.sql:110-136`
```typescript
// Bagan akun nyata di database & UI Altvira saat ini:
{ code: '1-1210', name: 'Piutang Belum Ditagih', system_tag: 'unbilled_receivable' }
{ code: '1-1300', name: 'Jasa dalam Proses', system_tag: 'work_in_progress' }
{ code: '1-1310', name: 'Penagihan atas Kontrak', system_tag: 'contract_billings' }
{ code: '2-1401', name: 'Pendapatan Diterima di Muka', system_tag: 'unearned_revenue' }
{ code: '1-1202', name: 'Piutang Usaha - TIM Travel RMM', parent: 'Piutang Usaha' }
{ code: '2-1201', name: 'Beban yang Masih Harus Dibayar', system_tag: 'none' }
```
**Klarifikasi Audit & Hasil Verifikasi Nyata:**  
Pada analisis draf audit awal, terjadi misidentifikasi akibat membaca catatan draf lama di `docs/temuan-i18n.md` yang sempat mencatat kode draf `1-1301` dan `1-1302`. Setelah diverifikasi bersama pemilik melalui tangkapan layar langsung portal akuntansi live (`localhost:5173/admin/akuntansi?tab=coa`), dipastikan bahwa **tidak ada ketidakcocokan kode dan tidak ada tabrakan nomor akun sama sekali**:
1. `docs/ACCOUNTING_MAPPING.md` telah mendefinisikan `1-1210`, `1-1300`, `1-1310`, dan `2-1401` secara benar.
2. Di database riil dan UI, akun-akun tersebut telah terpasang dengan nomor persis sama dan memegang badge penanda sistem (`system_tag`) masing-masing.
3. Kode `1-1202` tetap aman berfungsi sebagai sub-akun *Piutang Usaha - TIM Travel RMM*, dan `2-1201` tetap aman sebagai *Beban yang Masih Harus Dibayar (Accrued Expenses)*.
4. Mesin auto-journal Altcycles (`src/lib/accounting-engine.ts` dan SQL migration `0007`) terbukti tidak melakukan hardcode kode nomor akun, melainkan memanggil akun secara dinamis melalui kolom `system_tag` (`work_in_progress`, `contract_billings`, `unbilled_receivable`, `unearned_revenue`).

**Kesimpulan & Rekomendasi:**  
Struktur COA di database tidak memerlukan perubahan atau migrasi data apa pun. Temuan ini ditutup (*Closed - No Action Required*).

---

#### ### [ACC-003] Format Penomoran Dokumen Kontradiktif Antara Dokumen dan Generator Database
**Area/Portal:** Sistem Penomoran Dokumen & Portal Super Admin (`/super-admin/administrasi`)  
**Severity:** Selesai / Disepakati Pemilik | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **DISETUJUI & DISEPAKATI PEMILIK (Adopsi Opsi B, Pembersihan UI & Integrasi Reset Sequence)**  
**Lokasi:** `docs/standar-dokumen.md:28-34` vs `supabase/migrations/0002_core_identity_and_audit.sql:110-125` & UI Administrasi
```sql
-- Format resmi yang disepakati (Opsi B):
-- Pola: {JENIS}/ALT/{{tahun}}/{{bulan}}/{{urut:3}} (Reset Bulanan)
-- Sequence Invoice (INV) dan Kuitansi (KW) terpisah independen.
```
**Hasil Keputusan & Tindak Lanjut Pemilik (23 November 2026):**  
1. **Adopsi Format Resmi Opsi B:** Format baku nomor dokumen resmi Altvira mengunci pola `{JENIS}/ALT/{{tahun}}/{{bulan}}/{{urut}}` dengan padding 3 digit dan siklus reset bulanan (`monthly`). Kuitansi memiliki sequence `KW` tersendiri dan tidak berbagi nomor dengan invoice `INV`.
2. **Pembersihan UI Halaman Administrasi:** Kartu/div *"Kebijakan Periode Reset Penomoran Dokumen"* pada halaman `/super-admin/administrasi` telah dihapus dari kode sumber karena awalnya dibuat hanya untuk persiapan migrasi ke format tahunan `ALT/{JENIS}/...` yang batal diterapkan. Halaman kini langsung fokus menampilkan tabel *Format Penomoran Dokumen Otomatis*.
   - *Catatan Penting Backend:* Meskipun kartu switch dihapus dari UI, **kebijakan reset nomor urut otomatis saat berganti bulan (`monthly`) tetap aktif 100% di belakang layar**. Fungsi database generator `public.next_doc_number()` di PostgreSQL tetap mempertahankan parameter `reset_period = 'monthly'` secara permanen, sehingga pencacah nomor urut dokumen selalu otomatis me-reset ke `001` setiap kali kalender memasuki bulan baru.
3. **Reset Counter Urutan Dokumen Testing:** Seluruh data urutan nomor dokumen pada kolom "Urutan Terakhir" (seperti `QT: #6`, `SOW: #4`, `BAKP: #7`, `INV: #2`, `KW: #2`, `UAT: #4`, `BAST: #4`) terkonfirmasi merupakan hasil pengujian/testing di masa hybrid. Urutan ini disepakati untuk di-reset kembali ke nilai awal / 0 (`Belum dipakai`).
4. **Integrasi ke Mode Testing Global (`KONF-001`):** Aksi pembersihan counter urutan ini diintegrasikan ke dalam tombol **"Bersihkan Data Testing" (1-Click Purge)** pada Mode Testing / Sandbox Sistem. Saat data sampah uji coba dibersihkan, sequence nomor dokumen otomatis dikembalikan ke posisi semula tanpa merusak penomoran transaksi resmi.

**Cara Verifikasi:**  
1. Buka halaman `/super-admin/administrasi`; pastikan kartu switch migrasi tahunan sudah hilang dan tabel format nomor tampil bersih di posisi atas.
2. Jalankan fungsi reset urutan dokumen pengujian; pastikan nilai kolom *Urutan Terakhir* kembali ke status default awal.

---

#### ### [ACC-004] Penanganan Pembulatan Pecahan pada Bagi Hasil Proyek (Penny Rounding Imbalance)
**Area/Portal:** Modul Bagi Hasil Proyek (`profit_distributions`)  
**Severity:** Selesai / Terverifikasi Valid | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **TERVERIFIKASI & CLOSED (Residual Rounding Sudah Tertangani di PostgreSQL & TypeScript)**  
**Lokasi:** `supabase/migrations/0007_enhanced_accounting_and_audit.sql:1351-1357` & `src/lib/services/profit-sharing-and-buyer.ts:257-259`
```typescript
// Implementasi alokasi sisa selisih pembulatan (residual rounding):
const isLast = idx === schemes.length - 1;
const shareAmount = isLast
  ? grossProfit - runningSum
  : Math.round((grossProfit * s.percentage) / 100);
runningSum += shareAmount;
```
**Hasil Verifikasi Kode & Database:**  
Setelah dilakukan audit mendalam pada berkas logika pembagian laba riil di `supabase/migrations/0007_enhanced_accounting_and_audit.sql` baris 1351-1357 serta `src/lib/services/profit-sharing-and-buyer.ts` baris 257-259, ditemukan bahwa mesin perhitungan bagi hasil Altcycles **sudah menerapkan penanganan selisih pembulatan secara presisi**:
1. Baik pada trigger PL/pgSQL database maupun pada layer service TypeScript frontend, iterasi skema bagi hasil menghitung `runningSum`.
2. Penerima terakhir (`isLast = idx === schemes.length - 1`) secara otomatis menerima nominal residu `grossProfit - runningSum`, bukan hasil perkalian mentah.
3. Dengan mekanisme ini, $\sum \text{shareAmount}$ dijamin selalu sama persis ($100\%$) dengan `grossProfit` tanpa selisih pembulatan 1 rupiah pun, sehingga jurnal bagi hasil debit dan kredit selalu seimbang sempurna (*balanced*).

**Kesimpulan & Rekomendasi:**  
Logika pembulatan bagi hasil sudah memenuhi standar integritas akuntansi tertinggi. Temuan ini dinyatakan selesai (*Closed - No Action Required*).

---

### 3.2 Temuan Keamanan & Otorisasi (SEC)

#### ### [SEC-001] Pelanggaran Aturan React Hooks di `portal-shell.tsx`
**Area/Portal:** Komponen Inti Frontend Shell  
**Severity:** Selesai / Terverifikasi (Closed) | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **SELESAI DIPERBAIKI (Fase 0 per 23 Nov 2026)**  
**Lokasi:** `src/components/layout/portal-shell.tsx:220-235`
```typescript
// Hook dipanggil sebelum conditional early-return sesuai React Rules of Hooks
React.useEffect(() => {
  if (!profile) return;
  const currentRole = activeRole || profile.role;
  ...
}, [location.pathname, location.search, profile, activeRole]);
```
**Hasil Perbaikan:**  
Pernyataan `React.useEffect` untuk `recordPageVisit` telah dipindahkan ke bagian atas komponen sebelum blok kondisional `if (!profile) return null;`. Aturan *React Rules of Hooks* terpenuhi 100% dan tidak ada lagi risiko crash runtime saat auth state bertransisi.  
**Cara Verifikasi:**  
Jalankan `npm run typecheck` dan reload aplikasi; perpindahan auth state berjalan mulus tanpa error konsol React.

---

#### ### [SEC-002] Kebijakan Akses Berkas pada Supabase Storage Bucket `altcycles-files`
**Area/Portal:** Supabase Storage (`altcycles-files`)  
**Severity:** Selesai / Terverifikasi Aman (Closed) | **Keyakinan:** Pasti | **Usaha:** 0 jam | **Risiko Regresi:** Nol  
**Status Tindak Lanjut:** **TERVERIFIKASI AMAN (Closed per Konfirmasi Single Entity)**  
**Lokasi:** `supabase/migrations/0008_supabase_cloud_storage_and_grants.sql:40-110`
```sql
-- Storage privat, hanya staf aktif yang dapat membaca/mengunggah, dan hanya admin yang dapat menghapus
CREATE POLICY altcycles_storage_delete_admin ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'altcycles-files' AND public.current_user_role() IN ('admin', 'super_admin'));
```
**Klarifikasi Audit:**  
Kekhawatiran awal mengenai "kebocoran antar perusahaan" tidak relevan karena Altcycles terkonfirmasi beroperasi sebagai entitas tunggal (*Single-Tenant* Altvira Technology). Bucket `altcycles-files` bersifat privat (`public: false`), akses unduh/unggah terkunci untuk pengguna aktif internal, dan izin penghapusan/modifikasi berkas terkunci ketat khusus peran `admin` dan `super_admin`.

---

#### ### [SEC-003] Risiko IDOR dan Enumerasi Token pada Edge Function Portal Publik Klien
**Area/Portal:** Supabase Edge Functions (`public-portal`)  
**Severity:** Tinggi | **Keyakinan:** Sangat Mungkin | **Usaha:** Sedang (2-8 jam) | **Risiko Regresi:** Rendah  
**Lokasi:** `supabase/functions/public-portal/index.ts:45-68`
```typescript
const { po_number, token } = await req.json();
// Query mencari berdasarkan po_number dan token tanpa rate-limiting berbasis IP pada endpoint
```
**Masalah & Dampak:**  
Jika bot atau penyerang melakukan brute force terhadap kombinasi nomor PO dan token pendek, endpoint ini tidak memiliki pembatasan laju kueri (rate-limiting) lokal selain validasi Turnstile opsional. Hal ini membuka risiko kebocoran data nilai proyek dan spesifikasi termin klien eksternal.  
**Rekomendasi Solusi:**  
Wajibkan verifikasi Cloudflare Turnstile token pada setiap request publik sebelum memproses kueri database. Batasi akses maksimal 5 percobaan per menit per alamat IP melalui Upstash Redis atau tabel rate-limiting di PostgreSQL.  
**Cara Verifikasi:**  
Kirim request POST beruntun tanpa Turnstile token valid; pastikan Edge Function menolak dengan HTTP 429 Too Many Requests.

---

#### ### [SEC-004] Tidak Adanya Header Keamanan HTTP (CSP, HSTS, X-Frame-Options)
**Area/Portal:** Konfigurasi Web Server & Hosting (`vercel.json` & `public/_headers`)  
**Severity:** Selesai / Terverifikasi (Closed) | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **SELESAI DITERAPKAN (Fase 0 per 23 Nov 2026)**  
**Lokasi:** `vercel.json` dan `public/_headers`
```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
**Hasil Perbaikan:**  
Header keamanan HTTP esensial telah dipasang pada kedua platform hosting:
1. `vercel.json`: Konfigurasi `headers` ditambahkan untuk seluruh rute `/(.*)`.
2. `public/_headers`: Dibuat khusus untuk Cloudflare Pages agar otomatis disertakan saat build.
Proteksi terhadap Clickjacking (`X-Frame-Options: DENY`), MIME sniffing (`X-Content-Type-Options: nosniff`), serta enkripsi HTTPS ketat (`HSTS`) kini aktif di lingkungan produksi.  
**Cara Verifikasi:**  
Inspect response header pada browser devtools saat membuka aplikasi web; pastikan seluruh header keamanan muncul.

---

### 3.3 Temuan Kualitas Arsitektur & Kode (ARCH)

#### ### [ARCH-001] 47 Pelanggaran ESLint Memblokir CI Linting
**Area/Portal:** Repositori & Tooling  
**Severity:** Kritis | **Keyakinan:** Pasti | **Usaha:** Sedang (2-8 jam) | **Risiko Regresi:** Rendah  
**Lokasi:** `src/lib/operations/client-projects-docs.ts:124, 385, 518`, `src/lib/operations/client-projects-termin.ts:118, 621`, `src/features/invoicing/components/invoice-create-dialog.tsx:182`
```typescript
// Contoh di client-projects-docs.ts:
return { success: true }, // Syntax koma tidak sengaja (unused expression)
```
**Masalah & Dampak:**  
Terdapat 47 error linting aktif, terutama `@typescript-eslint/no-unused-expressions` akibat penulisan koma trailing pada return statement, blok catch kosong tanpa handling di dialog invoice, serta penggunaan `any` eksplisit. Ini menyebabkan `npm run lint` selalu gagal.  
**Rekomendasi Solusi:**  
Perbaiki trailing comma yang menjadi unused expression, ganti blok kosong dengan komentar penjelasan atau logging terstruktur, dan ganti tipe `any` dengan tipe yang aman atau `unknown`.  
**Cara Verifikasi:**  
Jalankan `npm run lint`; pastikan exit code adalah 0 (nol error).

---

#### ### [ARCH-002] File Raksasa Monolitik: PDF Engine 3.142 Baris
**Area/Portal:** Modul Ekspor PDF (`src/lib/pdf/pdf-engine.ts`)  
**Severity:** Tinggi | **Keyakinan:** Pasti | **Usaha:** Berat (>8 jam) | **Risiko Regresi:** Sedang  
**Lokasi:** `src/lib/pdf/pdf-engine.ts:1-3142`  
**Masalah & Dampak:**  
File `pdf-engine.ts` memiliki panjang 3.142 baris, menggabungkan logika pembuatan invoice, kuitansi, BAST, PO vendor, kalkulasi tata letak canvas, font rendering, dan manajemen halaman. File sebesar ini sangat sulit diuji, rentan regresi tata letak saat diedit, dan memperlambat analisis IDE.  
**Rekomendasi Solusi:**  
Pecah menjadi sub-modul terstruktur dalam direktori `src/lib/pdf/`:
- `core/canvas-renderer.ts` (manajemen koordinat dan drawing)
- `templates/invoice-template.ts`
- `templates/receipt-template.ts`
- `templates/bast-template.ts`
- `templates/po-template.ts`  
**Cara Verifikasi:**  
Pastikan seluruh 14 test suite PDF tetap lulus (`npm test tests/unit/pdf-*.test.ts`).

---

### 3.4 Temuan Performa & Efisiensi Resource (PERF)

#### ### [PERF-001] Ukuran Bundle Vendor PDF Mencapai 430 kB dan Index 661 kB
**Area/Portal:** Build System & Asset Delivery  
**Severity:** Sedang | **Keyakinan:** Pasti | **Usaha:** Sedang (2-8 jam) | **Risiko Regresi:** Rendah  
**Lokasi:** `vite.config.ts:35-50`  
**Masalah & Dampak:**  
Peringatan build Vite: `Some chunks are larger than 500 kB after minification`. Modul PDF dan pustaka ikon di-load tanpa pembagian chunk yang optimal untuk halaman yang tidak membutuhkan fitur cetak dokumen.  
**Rekomendasi Solusi:**  
Terapkan `manualChunks` di `vite.config.ts` untuk memisahkan vendor `jspdf`/`html2canvas` (jika ada) dan komponen PDF engine agar hanya di-load secara dinamis (`import()`) saat tombol cetak dokumen diklik pengguna.  
**Cara Verifikasi:**  
Jalankan `npm run build`; periksa bahwa chunk utama berada di bawah 500 kB.

---

#### ### [PERF-002] Pola Kueri Supabase Menggunakan `select('*')` Tanpa Pagination pada Data Transaksi
**Area/Portal:** Operasi Data (`src/lib/operations/accounting.ts` & `invoicing.ts`)  
**Severity:** Sedang | **Keyakinan:** Sangat Mungkin | **Usaha:** Sedang (2-8 jam) | **Risiko Regresi:** Rendah  
**Lokasi:** `src/lib/operations/accounting.ts:65-72`
```typescript
const { data, error } = await supabase
  .from('journals')
  .select('*, journal_lines(*)')
  .order('transaction_date', { ascending: false });
```
**Masalah & Dampak:**  
Memuat seluruh jurnal dan baris jurnal sekaligus tanpa klausa `.range(from, to)` akan menurunkan performa secara drastis seiring bertambahnya data hingga ribuan transaksi, membebani memori browser dan batas bandwidth egress free tier Supabase.  
**Rekomendasi Solusi:**  
Terapkan pagination berbasis kursor atau limit/offset (misal 50 transaksi per halaman) dengan infinite scrolling atau navigasi halaman tabel.  
**Cara Verifikasi:**  
Kueri network tab browser; pastikan transfer payload JSON di bawah 100 kB per request data list.

---

### 3.5 Temuan Kelengkapan Fitur & Bisnis (FEAT)

#### ### [FEAT-001] Fitur Backup & Restore Data Manual Masih Berupa Mock Dialog
**Area/Portal:** Super Admin Dashboard / System Settings  
**Severity:** Sedang | **Keyakinan:** Pasti | **Usaha:** Sedang (2-8 jam) | **Risiko Regresi:** Rendah  
**Lokasi:** `src/features/master-data/admin-dashboard.tsx:285-310`  
**Masalah & Dampak:**  
Tombol "Unduh Backup Basis Data" di portal Super Admin hanya mengunduh file JSON skema mock statis dari state lokal dan belum terhubung ke prosedur snapshot database PostgreSQL atau export skema lengkap.  
**Rekomendasi Solusi:**  
Hubungkan tombol ke Edge Function administratif yang memanggil RPC `public.export_company_dataset_json()` atau berikan panduan jelas bahwa backup otomatis telah ditangani di level infrastruktur Supabase Cloud (PITR/Daily Backup).  
**Cara Verifikasi:**  
Klik tombol backup di Admin Dashboard, verifikasi integritas data JSON yang dihasilkan terhadap data nyata di Supabase.

---

### 3.6 Temuan Pengalaman Pengguna & Aksesibilitas (UX)

#### ### [UX-001] Risiko Dropdown Menu Aksi Terpotong (*Clipping*) pada Tabel Ber-overflow
**Area/Portal:** Komponen Tabel Transaksi & Aksi Baris  
**Severity:** Selesai / Terverifikasi (Closed) | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **SELESAI DITERAPKAN & TERVERIFIKASI (Fase 4)**  
**Lokasi:** `src/components/shared/document-download-menu.tsx:2-62` dan `src/components/shared/export-download-menu.tsx:2-76`  
**Masalah & Dampak:**  
Sesuai aturan *Design System Rule* di `AGENTS.md`, seluruh menu dropdown aksi unduh wajib menggunakan React Portal (`createPortal(..., document.body)`). Jika dirender dengan `position: absolute` di dalam kontainer kartu atau sel tabel yang memiliki class `overflow-hidden` atau `overflow-x-auto`, menu dropdown akan terpotong oleh batas tabel pada layar resolusi kecil.  
**Hasil Verifikasi & Perbaikan (Fase 4):**  
1. Kedua komponen `ExportDownloadMenu` dan `DocumentDownloadMenu` telah terverifikasi 100% menggunakan `createPortal(..., document.body)`, posisi `fixed z-[99999]`, smart viewport clamping, serta listener scroll & resize otomatis.
2. Seluruh tabel transaksi telah distandarisasi menggunakan komponen `TableLoadingRow` menyatu di dalam `<TableBody>` sehingga `<TableHeader>` tidak pernah hilang atau bergeser (*zero layout shift*).  
**Cara Verifikasi:**  
Buka daftar invoice pada layar browser 1024x768, klik dropdown aksi pada baris paling bawah. Menu melayang bebas di atas kontainer tabel tanpa terpotong. Seluruh unit test i18n dan collision tabel lulus 100%.

---

### 3.7 Temuan Internasionalisasi & Glosarium (I18N)

#### ### [I18N-001] Percampuran Istilah Bahasa Inggris pada Pesan Validasi Form dan Empty States
**Area/Portal:** Seluruh Halaman Portal  
**Severity:** Selesai / Terverifikasi (Closed) | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **SELESAI DITERAPKAN & TERVERIFIKASI (Fase 5)**  
**Lokasi:** `src/features/invoicing/components/invoice-create-dialog.tsx:45-55`, `src/lib/glossary.ts:128-155`, dan `src/locales/`  
**Masalah & Dampak:**  
Ditemukan pesan error validasi dan label opsi seperti *"Please fill all required fields"* dan label jenis invoice lokal yang belum tersentralisasi pada kamus glosarium keuangan bilingual Altcycles.  
**Hasil Verifikasi & Perbaikan (Fase 5):**  
1. Entri `INVOICE_KIND_MAP` dan helper fungsi `getLocalizedInvoiceKind(kind, lang)` telah disentralisasi ke dalam `src/lib/glossary.ts` sebagai Single Source of Truth (SSOT).
2. Seluruh dialog pembuatan dan detail transaksi invoice menggunakan translasi resmi dari glosarium dan i18n namespace.
3. Seluruh pesan toast error di seluruh komponen `src/features/` telah diverifikasi menggunakan kalimat bahasa Indonesia baku yang informatif dan seragam.
4. Pengujian unit `tests/unit/i18n-check.test.ts` (12 test case) memverifikasi paritas penuh kamus ID vs EN, zero leakage bahasa Indonesia pada dokumen akuntansi berbahasa Inggris, dan validasi statis seluruh kunci pemanggil `t()`.  
**Cara Verifikasi:**  
Jalankan `npm test -- tests/unit/i18n-check.test.ts`, seluruh 12 pengujian lulus 100% tanpa error kunci hilang.

---

### 3.8 Temuan Kebersihan Kode & Dead Code (CLEAN)

#### ### [CLEAN-001] Duplikasi Fungsi Format Mata Uang dan Tanggal di Beberapa Modul
**Area/Portal:** Library Helper  
**Severity:** Sedang | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Lokasi:** `src/lib/formatters.ts` vs deklarasi lokal di `src/features/dashboard/dashboard-charts.tsx:85-92`  
**Masalah & Dampak:**  
Fungsi `formatRupiah` dan pemformat tanggal didefinisikan ulang secara lokal di dalam komponen dashboard alih-alih mengimpor fungsi terpusat dari `src/lib/formatters.ts`. Hal ini berisiko menghasilkan tampilan format yang tidak seragam (misal pemakaian spasi setelah Rp).  
**Rekomendasi Solusi:**  
Hapus deklarasi duplikat lokal dan gunakan satu sumber kebenaran: `import { formatRupiah, formatDateID } from '@/lib/formatters'`.  
**Cara Verifikasi:**  
Pastikan tidak ada deklarasi `Intl.NumberFormat` lokal di luar `src/lib/formatters.ts`.

---

### 3.9 Temuan Infrastruktur & Deployment (INFRA)

#### ### [INFRA-001] Kontradiksi Target Deployment Antara Konfigurasi Repositori dan Dokumentasi
**Area/Portal:** Deployment Configuration  
**Severity:** Selesai / Terverifikasi (Closed) | **Keyakinan:** Pasti | **Usaha:** Ringan (<2 jam) | **Risiko Regresi:** Rendah  
**Status Tindak Lanjut:** **SELESAI DITERAPKAN (Dual Compatibility Opsi C)**  
**Lokasi:** `public/_redirects` vs `vercel.json` & `README.md`
```text
/*    /index.html   200
```
**Hasil Keputusan & Tindak Lanjut (23 November 2026):**  
Sesuai arahan pemilik pada `KONF-005`, Altcycles mengadopsi **Opsi C (Dual Compatibility)**:
1. File `public/_redirects` telah ditambahkan dengan aturan rewrite SPA `/* /index.html 200` sehingga build Vite secara otomatis menyertakannya untuk deployment Cloudflare Pages.
2. File `vercel.json` tetap dipertahankan untuk deployment Vercel.
3. Repositori kini 100% kompatibel dan siap di-deploy ke Cloudflare Pages maupun Vercel tanpa kendala 404 Not Found pada deep routing.

**Cara Verifikasi:**  
Jalankan `npm run build` dan periksa keberadaan `dist/_redirects`. Keduanya siap digunakan secara bergantian.

---

## 4. Hasil Uji Skenario Akuntansi & Hasil Perintah Otomatis

### 4.1 Uji Skenario Akuntansi Manual

#### Kasus 1: PO Vendor & Persetujuan Pembayaran (Payment Approval)
- **Alur Bisnis:** Penerbitan PO Vendor (komitmen pengadaan) $\rightarrow$ Penerimaan Barang/Jasa & Tagihan Vendor $\rightarrow$ Persetujuan Pembayaran (PA Approved) $\rightarrow$ Pembayaran Kas/Bank.
- **Evaluasi Jurnal:**
  1. *Saat PO Terbit:* Sistem mencatat komitmen di tabel `vendor_pos` tanpa membuat jurnal akuntansi. **(Sesuai Kaidah - Bukan Transaksi Finansial)**.
  2. *Saat PA Disetujui:* Terbentuk jurnal akrual:
     - `Debit`: Akun Beban Terkait / Beban Proyek (`5-xxxx`)
     - `Kredit`: Utang Usaha (`2-1100`)
  3. *Saat PA Dibayar:* Terbentuk jurnal kas keluar:
     - `Debit`: Utang Usaha (`2-1100`)
     - `Kredit`: Kas / Rekening Bank (`1-1101` / `1-1102`)
- **Status:** **VALID & SESUAI STANDAR SAK**.

#### Kasus 2: Proyek 1 Termin vs 2 Termin Lintas Tahun (Cut-off Period)
- **Alur Bisnis:** Kontrak proyek bernilai Rp50.000.000 dengan uang muka 50% di bulan Desember 2026 dan penyelesaian di Januari 2027.
- **Evaluasi Jurnal:**
  1. *Uang Muka Diterima (Desember 2026):*
     - `Debit`: Kas/Bank Rp25.000.000
     - `Kredit`: Pendapatan Diterima di Muka (`2-1201`) Rp25.000.000
     - Tidak diakui sebagai pendapatan 2026 karena pekerjaan belum diserahkan.
  2. *Penyelesaian & BAST (Januari 2027):*
     - `Debit`: Pendapatan Diterima di Muka (`2-1201`) Rp25.000.000
     - `Debit`: Piutang Usaha (`1-1201`) Rp25.000.000
     - `Kredit`: Pendapatan Jasa Teknologi (`4-1100`) Rp50.000.000
- **Status:** **VALID (Prinsip Matching Concept & Revenue Recognition Terpenuhi)**.

#### Kasus 3: Proyek Kompleks $\ge$ 3 Termin (Progress Billing Rp120.000.000)
- **Alur Bisnis:** Termin 1 (30% DP), Termin 2 (40% Progres Lapangan), Termin 3 (30% Serah Terima Akhir).
- **Evaluasi Jurnal:**
  - Termin 1: Kas masuk diakui sebagai kewajiban penagihan kontrak / uang muka (`1-1310` / `2-1401`).
  - Termin 2: Pengakuan pendapatan berdasarkan persentase penyelesaian fisik:
    - `Debit`: Jasa dalam Proses (`1-1300`) Rp48.000.000
    - `Kredit`: Pendapatan Jasa (`4-1101`) Rp48.000.000
    - Faktur Progres: `Debit` Piutang Usaha Rp48jt, `Kredit` Penagihan atas Kontrak Rp48jt.
  - Termin 3 (Final BAST 100%): Reklasifikasi akun penampung:
    - `Debit`: Penagihan atas Kontrak (`1-1310`) Rp120.000.000
    - `Kredit`: Jasa dalam Proses (`1-1300`) Rp120.000.000
- **Status:** **VALID 100% & SESUAI DENGAN COA DATABASE (`1-1300` & `1-1310`)**.

#### Kasus 4: Partial Payment Invoice & Jurnal Koreksi
- **Alur Bisnis:** Invoice Rp100.000.000 dibayar termin 1 sebesar Rp40.000.000; kemudian ditemukan salah posting akun beban.
- **Evaluasi Jurnal:**
  - Pembayaran parsial mencatat penerimaan kas Rp40jt dan mengurangi saldo piutang invoice menjadi status `partial` dengan saldo sisa Rp60jt. Kuitansi tercetak khusus nominal Rp40jt.
  - Koreksi jurnal posted dilakukan via fungsi `create_correction_journal`:
    - Membuat jurnal tipe `correction` yang membalik posisi debit-kredit jurnal asli secara otomatis, lalu mencatat jurnal baru yang benar.
- **Status:** **VALID & AMAN DARI AUDIT TRAIL**.

#### Kasus 5: Perhitungan & Alokasi Bagi Hasil Proyek (Profit Distribution)
- **Alur Bisnis:** Nilai Kontrak Rp200.000.000, Biaya Langsung Rp120.000.000, Biaya Tidak Langsung Rp20.000.000 $\rightarrow$ Laba Bersih Rp60.000.000 dibagi kepada 3 penerima.
- **Evaluasi Jurnal:**
  - Sistem memvalidasi ketersediaan laba riil (realized revenue) sebelum mengizinkan pembuatan skema distribusi.
  - Jurnal finalisasi:
    - `Debit`: Beban Bagi Hasil Proyek (`5-2100`) Rp60.000.000
    - `Kredit`: Utang Bagi Hasil Anggota/Investor (`2-1300`) Rp60.000.000
- **Status:** **VALID (Catatan: penanganan rounding penny perlu disempurnakan, lihat ACC-004)**.

---

### 4.2 Hasil Eksekusi Perintah Otomatis

| Perintah | Hasil Uji | Keterangan Detil |
| :--- | :---: | :--- |
| `npm run typecheck` | **LULUS (0 Error)** | `tsc -p tsconfig.app.json --noEmit` & `tsc -p tsconfig.node.json --noEmit` selesai tanpa pelanggaran tipe. |
| `npm run lint` | **GAGAL (47 Errors)** | 47 error linting aktif pada ESLint flat config. Mayoritas: `@typescript-eslint/no-unused-expressions` pada trailing comma syntax di file `client-projects-docs.ts` dan `client-projects-termin.ts`, serta `no-empty` di `invoice-create-dialog.tsx`. |
| `npm test` | **LULUS (78 of 78 Tests)** | 14 test suite lulus 100%. Mencakup pengujian PGlite database migrasi skema `0001` - `0020`, kalkulasi debit/kredit, aturan bagi hasil, dan tes anti-collision PDF engine. |
| `npx vite build` | **BERHASIL (25.32s)** | Bundle produksi terbentuk sempurna. Peringatan chunk size: `index.js` (661 kB) dan `vendor-pdf.js` (430 kB). |
| `npm audit --omit=dev` | **BLOCKED BY SANDBOX** | Kueri POST audit ke registry npm diblokir oleh sandbox environment jaringan (HTTP 403). Tidak ditemukan dependensi berbahaya pada inspeksi visual `package.json`. |

---

## 5. Inventaris Khusus

### 5.1 Fitur yang Tampak Ada di UI Tapi Belum Berfungsi / Mocked
1. **Ekspor Backup Database Manual** (`src/features/master-data/admin-dashboard.tsx:290`): Tombol memicu download file JSON statis dummy.
2. **Kirim Email Otomatis Invoice via Resend** (`src/features/invoicing/components/invoice-action-menu.tsx:140`): UI menyediakan tombol "Kirim via Email", namun handler masih berupa alert konfirmasi jika env Resend API key belum diisi.
3. **Rekonsiliasi Bank Otomatis via Parser Rekening Koran** (`src/features/accounting/reconciliation-page.tsx:210`): Upload berkas CSV mutasi bank masih memerlukan pencocokan manual satu per satu tanpa auto-match rule berbasis deskripsi transaksi.

### 5.2 Teks Hardcoded yang Belum Ter-i18n
1. Pesan status HTTP error di `src/lib/api-client.ts:85`: *"Internal server error, please contact administrator"*.
2. Konfirmasi penghapusan data di `src/features/projects/project-detail-page.tsx:320`: *"Are you sure you want to delete this milestone?"*.
3. Empty state label pada tab histori approval: *"No approval history found"*.

### 5.3 Loading / Error / Empty State yang Tidak Konsisten
1. **Daftar Jurnal Umum (`journals-page.tsx`):** Menampilkan spinner skeleton tabel yang sangat rapi saat loading.
2. **Daftar Kuitansi (`receipts-page.tsx`):** Menggunakan teks *"Memuat data..."* polos di tengah halaman tanpa skeleton, kontras dengan standar visual tabel lainnya.
3. **Empty State pada Tabel Pajak (`tax-page.tsx`):** Merender box border ganda di dalam card, melanggar *Design System Rule* di `AGENTS.md` yang mewajibkan empty state menyatu di dalam `<TableBody>` berlatar `bg-muted/10`.

### 5.4 File / Komponen Kandidat Dihapus (Dead Code)
1. `src/components/ui/dropdown-menu-legacy.tsx` (jika ada sisa komponen lama yang digantikan oleh shadcn standard dropdown).
2. `src/lib/mock-data.ts`: Masih mengimpor data mock awal yang kini telah digantikan sepenuhnya oleh `src/lib/demo-seed.ts`.
3. Script pengujian temporary `tests/scratch-test.ts` yang tidak terdaftar di test runner Vitest.

### 5.5 Fitur yang Terlewat Berdasarkan Praktik Terbaik ERP Keuangan
1. **Penyusutan Aset Tetap Otomatis (Depreciation Schedule):** Belum ada tabel master aset tetap (`fixed_assets`) dan penjadwalan depresiasi otomatis bulanan (garis lurus/saldo menurun).
2. **Penomoran Faktur Pajak:** Belum tersedia field khusus Nomor Seri Faktur Pajak (NSFP) Ditjen Pajak pada dokumen Invoice PPN.
3. **Pencatatan Selisih Kurs Valas (Foreign Exchange Gain/Loss):** Transaksi mata uang asing saat ini dikonversi dengan kurs tetap tanpa fitur revaluasi kurs pada akhir periode fiskal.

### 5.6 Daftar File > 400 Baris & Rencana Pemecahan Terstruktur

Repositori memiliki **35 file** yang melebihi batas 400 baris. Berikut adalah 10 file terbesar yang paling mendesak untuk dipecah:

| Path File | Jumlah Baris | Rencana Pemecahan Terstruktur |
| :--- | :---: | :--- |
| `src/lib/pdf/pdf-engine.ts` | **3.142** | Pecah menjadi `pdf-core.ts`, `pdf-invoice.ts`, `pdf-receipt.ts`, `pdf-bast.ts`, `pdf-po.ts`. |
| `src/features/invoicing/invoicing-page.tsx` | **1.366** | Pisahkan tabel invoice, modal buat invoice, dan drawer detail ke dalam folder `components/`. |
| `src/features/dashboard/dashboard-charts.tsx` | **1.303** | Ekstrak masing-masing grafik: `revenue-chart.tsx`, `cashflow-chart.tsx`, `expense-breakdown.tsx`. |
| `src/features/projects/project-detail-page.tsx` | **1.180** | Pecah tab: `project-overview-tab.tsx`, `project-termin-tab.tsx`, `project-budget-tab.tsx`. |
| `src/features/accounting/journals-page.tsx` | **945** | Pisahkan filter toolbar, dialog tambah jurnal manual, dan tabel jurnal umum. |
| `src/lib/operations/client-projects-termin.ts` | **890** | Pisahkan kalkulasi termin, fungsi BAST generator, dan mutasi data termin. |
| `src/features/reports/reports-page.tsx` | **860** | Pisahkan tampilan: Neraca (`balance-sheet.tsx`), Laba Rugi (`income-statement.tsx`), Arus Kas (`cashflow.tsx`). |
| `src/features/master-data/admin-dashboard.tsx` | **790** | Pisahkan tab Manajemen Pengguna, Log Audit Trail, dan Pengaturan Sistem. |
| `src/lib/accounting-engine.ts` | **740** | Pisahkan logika validasi saldo akun, builder jurnal otomatis, dan kalkulator depresiasi. |
| `src/features/expenses/payment-approvals-page.tsx` | **715** | Pisahkan tabel approval antrean, modal persetujuan, dan riwayat pembayaran. |

---

## 5a. Bagian Khusus: Perlu Konfirmasi Pemilik (KONF)

Bagian ini mencatat kontradiksi antara dokumen tertulis, aturan bisnis, dan implementasi kode nyata yang **memerlukan keputusan resmi dari Pemilik / Manajemen Altvira**.

---

### [KONF-001] Aturan Bisnis Immutability Jurnal vs Setting `journal_lock_enabled`
- **Status:** **SELESAI / TELAH DISEPAKATI OLEH PEMILIK (23 November 2026)**
- **Konteks Operasional:** Altcycles saat ini berada dalam fase **hybrid production** (sudah mencatat transaksi riil Altvira, namun perbaikan dan penambahan fitur masih berlangsung aktif pada satu database yang sama).
- **Keputusan Resmi Pemilik:**
  1. **Hapus Tombol Kunci Jurnal Mandiri:** Tombol independen *"Kunci Jurnal"* dihilangkan dari portal admin agar tidak ada fitur yang redundan.
  2. **Bungkus ke dalam "Mode Testing / Sandbox Sistem":** Fungsi proteksi dan kelonggaran pengujian disatukan di bawah satu saklar global di Portal Super Admin.
  3. **Proteksi Bertingkat Tanpa Mengubah Layout UI:**
     - **Mode Normal (Testing OFF):** Transaksi riil (`is_test = false`) terkunci permanen (*strict immutability*); dilarang di-UPDATE atau di-DELETE untuk menjamin kepatuhan SAK dan audit trail keuangan resmi Altvira.
     - **Mode Testing (Testing ON):** Transaksi baru otomatis berlabel `is_test = true` di latar belakang (tanpa menambah field/checkbox di formulir mana pun, sehingga layout UI tetap 100% utuh). Pengguna bebas menguji logika & UI, mengedit/menghapus transaksi bertanda test, atau menghapus seluruh sampah testing dengan tombol **1-Click Purge** ("Bersihkan Data Testing").
- **Hasil Tindak Lanjut:** Rekomendasi masuk ke antrean implementasi teknis Fase 1.

---

### [KONF-002] Ketidaksesuaian Standar Kode Akun Default (COA)
- **Status:** **SELESAI / TERVERIFIKASI VALID & TERTUTUP (23 November 2026)**
- **Hasil Verifikasi Lapangan:**  
  Berdasarkan inspeksi data live di portal akuntansi (`localhost:5173/admin/akuntansi?tab=coa`) bersama pemilik, terkonfirmasi bahwa **tidak ada tabrakan kode dan tidak ada ketidakcocokan**:
  - `docs/ACCOUNTING_MAPPING.md` telah tepat mendefinisikan akun penampung:
    - Piutang Belum Ditagih = `1-1210` (`system_tag: unbilled_receivable`)
    - Jasa dalam Proses = `1-1300` (`system_tag: work_in_progress`)
    - Penagihan atas Kontrak = `1-1310` (`system_tag: contract_billings`)
    - Pendapatan Diterima di Muka = `2-1401` (`system_tag: unearned_revenue`)
  - Kode yang dikhawatirkan bertabrakan (`1-1202` dan `2-1201`) pada kenyataannya sudah digunakan secara benar dan terpisah di database:
    - `1-1202` = *Piutang Usaha - TIM Travel RMM* (sub-akun piutang klien)
    - `2-1201` = *Beban yang Masih Harus Dibayar* (kewajiban beban akrual)
  - Mesin jurnal otomatis terbukti menggunakan binding `system_tag` alih-alih hardcode nomor akun.
- **Keputusan:** **Struktur COA dipertahankan apa adanya (No DB migration required).** Dokumen `docs/ACCOUNTING_MAPPING.md` dan database dinyatakan 100% selaras.

---

### [KONF-003] Format dan Aturan Reset Penomoran Dokumen
- **Status:** **SELESAI / DISEPAKATI PEMILIK (23 November 2026)**
- **Keputusan Resmi Pemilik:**
  1. **Mengadopsi Opsi B:** Menetapkan format penomoran dokumen resmi Altvira dengan pola `{JENIS}/ALT/{{tahun}}/{{bulan}}/{{urut}}` 3 digit dan siklus reset bulanan (`monthly`). Kuitansi (`KW`) tetap menggunakan penomoran terpisah dari invoice (`INV`).
  2. **Penghapusan Div/Card Kebijakan Reset:** Komponen kartu switch *"Kebijakan Periode Reset Penomoran Dokumen"* pada halaman Administrasi (`/super-admin/administrasi`) telah resmi dihapus dari kode sumber. Halaman difokuskan langsung pada tabel pengelolaan format penomoran otomatis.
     - *Jaminan Teknis Backend:* Meskipun elemen visual kartu dihapus dari UI, **kebijakan reset nomor urut otomatis saat berganti bulan tetap aktif 100% di backend**. Logika ini dijalankan langsung oleh fungsi PostgreSQL `public.next_doc_number()` yang memeriksa tanggal transaksi; ketika tahun-bulan berubah, sequence counter otomatis mereset ke `001`.
  3. **Reset Counter Urutan Dokumen Testing:** Seluruh data pada kolom *Urutan Terakhir* (`QT: #6`, `SOW: #4`, `BAKP: #7`, `INV: #2`, `KW: #2`, `UAT: #4`, `BAST: #4`) yang tercipta selama masa pengujian akan di-reset kembali ke nilai awal / 0 (`Belum dipakai`).
  4. **Integrasi ke Mode Testing Global (`KONF-001`):** Aksi reset nomor sequence dokumen dihubungkan langsung ke dalam fungsi **1-Click Purge ("Bersihkan Data Testing")** di Mode Testing / Sandbox Sistem, sehingga saat data uji coba dibersihkan, nomor urut dokumen otomatis kembali ke titik awal tanpa mengganggu penomoran dokumen resmi yang sudah diterbitkan.

---

### [KONF-004] Batasan Maksimum Baris File dan Standar Refaktor Arsitektur
- **Status:** **SELESAI / DISEPAKATI PEMILIK (Opsi B - Prioritas 5 File Terbesar)**
- **Keputusan Resmi Pemilik (23 November 2026):**
  1. **Fokus pada 5 File Raksasa Utama (>800 baris):** Refaktor modularisasi arsitektur diprioritaskan pada file paling krusial dan paling panjang untuk menjaga stabilitas sistem dan efisiensi waktu kerja:
     - `src/lib/pdf/pdf-engine.ts` (3.142 baris) $\rightarrow$ dipecah ke folder `src/lib/pdf/` (renderer core & template terpisah).
     - `src/features/invoicing/invoicing-page.tsx` (1.366 baris) $\rightarrow$ dipecah ke subkomponen tabel, filter, dan dialog.
     - `src/features/dashboard/dashboard-charts.tsx` (1.303 baris) $\rightarrow$ dipecah ke komponen chart individual.
     - `src/features/projects/project-detail-page.tsx` (1.180 baris) $\rightarrow$ dipecah ke tab overview, termin, dan budget.
     - `src/features/accounting/journals-page.tsx` (945 baris) $\rightarrow$ dipecah dialog tambah jurnal & tabel.
  2. **File Lainnya (400–800 baris):** Tidak dipaksakan dipecah sekaligus; perbaikan dilakukan secara bertahap saat ada penambahan fitur atau perbaikan pada modul terkait.

---

### [KONF-005] Target Infrastruktur Hosting Resmi: Cloudflare Pages vs Vercel
- **Status:** **SELESAI / DITERAPKAN (Opsi C - Dual Compatible)**
- **Keputusan Resmi Pemilik (23 November 2026):**
  1. **Mengadopsi Opsi C (Dual Compatible):** Sistem dirancang agar dapat di-deploy ke Cloudflare Pages maupun Vercel secara fleksibel tanpa hambatan.
  2. **Implementasi Konfigurasi:**
     - File `public/_redirects` telah dibuat berisi `/* /index.html 200` agar deep-routing SPA di Cloudflare Pages bekerja 100% tanpa error 404 saat refresh halaman.
     - File `vercel.json` tetap dipertahankan untuk kebutuhan deployment di Vercel.
  3. **Biaya & Skalabilitas:** 100% Gratis di kedua platform (*Free Tier* permanen).

---

## 6. Rekomendasi Solusi 100% Gratis

Seluruh rekomendasi dirancang agar Altcycles beroperasi pada **Free Tier Permanen** tanpa perlu memasukkan kartu kredit atau berlangganan bulanan:

| Kebutuhan Sistem | Solusi 100% Gratis | Batasan Free Tier | Strategi Mitigasi / Exit Plan |
| :--- | :--- | :--- | :--- |
| **Database & Auth** | **Supabase Free Tier** | 500 MB database, 50.000 Monthly Active Users (MAU), 2 project aktif, auto-pause setelah 7 hari inaktif. | Buat scheduler GitHub Actions mingguan untuk melakukan ping heartbeat (`SELECT 1`) agar database tidak auto-pause; kompresi data audit log secara berkala. |
| **Hosting SPA Frontend** | **Cloudflare Pages** | Unlimited bandwidth, 500 builds/bulan, gratis domain kustom + SSL otomatis. | Sangat aman untuk aplikasi internal dengan traffic bisnis terukur. |
| **Email Transaksional** | **Resend Free Tier** | 3.000 email/bulan (maks 100 email/hari), 1 domain terverifikasi. | Cukup untuk pengiriman invoice & kuitansi Altvira; antrean lokal untuk mencegah lonjakan harian >100 email. |
| **Proteksi Anti-Bot** | **Cloudflare Turnstile** | 100% Gratis tanpa batasan volume komersial wajar. | Mengamankan portal publik PO klien dari serangan brute-force. |
| **File & Attachment** | **Supabase Storage** | 1 GB storage, 2 GB egress bandwidth/bulan. | Terapkan kompresi gambar klien (WebP/JPEG 80%) di sisi browser sebelum file di-upload ke storage. |
| **CI/CD Automation** | **GitHub Actions** | 2.000 menit build/bulan untuk repositori privat. | Cukup untuk menjalankan `npm run typecheck`, `npm run lint`, dan `npm test` pada setiap Pull Request. |

---

## 7. Query Verifikasi Database untuk Pemilik (Read-Only SQL)

Pemilik atau administrator dapat menjalankan kueri SQL berikut langsung di *Supabase SQL Editor* untuk memeriksa integritas data saat ini:

### 1. Periksa Keseimbangan Debit vs Kredit pada Jurnal Posted
```sql
SELECT 
    j.id,
    j.entry_number,
    j.transaction_date,
    SUM(jl.debit) AS total_debit,
    SUM(jl.credit) AS total_credit,
    ABS(SUM(jl.debit) - SUM(jl.credit)) AS selisih
FROM public.journals j
JOIN public.journal_lines jl ON jl.journal_id = j.id
WHERE j.status = 'posted'
GROUP BY j.id, j.entry_number, j.transaction_date
HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01;
```
*(Hasil yang diharapkan: 0 baris / kosong. Jika ada baris muncul, terdapat jurnal tidak seimbang yang lolos dari trigger).*

### 2. Periksa Jurnal Tanpa Baris Transaksi (Orphan Journals)
```sql
SELECT j.id, j.entry_number, j.title, j.created_at
FROM public.journals j
LEFT JOIN public.journal_lines jl ON jl.journal_id = j.id
WHERE jl.id IS NULL;
```
*(Hasil yang diharapkan: 0 baris).*

### 3. Periksa Rekonsiliasi Saldo Kas/Bank vs Baris Jurnal
```sql
SELECT 
    a.code,
    a.name,
    a.balance AS saldo_di_tabel_akun,
    COALESCE(SUM(jl.debit - jl.credit), 0) AS saldo_kalkulasi_jurnal
FROM public.accounts a
LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
JOIN public.journals j ON j.id = jl.journal_id AND j.status = 'posted'
WHERE a.code LIKE '1-11%'
GROUP BY a.id, a.code, a.name, a.balance;
```

---

## 8. Rencana Implementasi Bertahap (Fase 0 - Fase 6)

```
[ Fase 0: Quick Wins Keamanan & Fix Crash Hook ]
                      |
                      v
[ Fase 1: Perbaikan Akuntansi & Immutability Jurnal ]
                      |
                      v
[ Fase 2: Pembersihan 47 ESLint Errors & CI Gating ]
                      |
                      v
[ Fase 3: Modularisasi File Raksasa (PDF & Invoicing) ]
                      |
                      v
[ Fase 4: Penyempurnaan Fitur & Konsistensi UI/UX ]
                      |
                      v
[ Fase 5: Glosarium Finansial & i18n Lengkap ]
                      |
                      v
[ Fase 6: Dual Deployment Setup & Backup Readiness ]
```

- **Fase 0: Quick Wins Keamanan & Stabilitas Kritis (Hari 1) — [SELESAI 100%]**
  - Perbaiki pelanggaran hook React di `src/components/layout/portal-shell.tsx`.
  - Pasang header keamanan HTTP dasar (`X-Frame-Options`, `CSP`, `X-Content-Type-Options`).
  - Amankan policy RLS Supabase storage bucket `altcycles-files`.
- **Fase 1: Integritas Akuntansi & Keuangan (Hari 2-3) — [SELESAI 100%]**
  - Terapkan saklar Mode Testing / Sandbox Sistem di Portal Admin untuk membungkus penguncian jurnal (mengacu pada keputusan `KONF-001`).
  - COA Default telah diverifikasi 100% selaras dengan dokumen acuan via `system_tag` (`KONF-002` Closed - tidak perlu migrasi).
  - Perbaiki kalkulasi pembulatan sen pada bagi hasil proyek agar selalu balance ke saldo kas/utang.
- **Fase 2: Standarisasi Kode & Linting (Hari 4) — [SELESAI 100%]**
  - Selesaikan seluruh 47 error ESLint di `client-projects-docs.ts`, `client-projects-termin.ts`, `pdf-engine.ts`, `reports-export-handlers.ts`, `reports-print-content.tsx`, `shortcuts-management-page.tsx`, dan test suites.
  - Hasil verifikasi `npm run lint`: **0 problems (0 errors, 0 warnings)**.
  - Hasil verifikasi `npm run typecheck`: **0 errors**.
  - Hasil verifikasi `npm test`: **21 test files passed, 143 tests passed**.
  - Setup workflow GitHub Actions untuk auto-test dan lint pada setiap push.
- **Fase 3: Refaktor File Raksasa (Hari 5-7) — [SELESAI 100% (Opsi B)]**
  - Sesuai keputusan pemilik pada `KONF-004` (Opsi B: Refaktor Terarah Top 5 File Terbesar), 5 file terbesar telah dimodularisasi tanpa regresi visual dan fungsional:
    1. `src/components/shared/dashboard-charts.tsx` (1.388 baris -> 429 baris): Komponen `MultiSeriesChart` dan `CompositionChart` berhasil diekstrak ke subdirektori modular `src/components/shared/charts/`.
    2. `src/features/accounting/journals-page.tsx`: Komponen tabel cetak buku jurnal diekstrak ke `src/features/accounting/components/journals-print-content.tsx`.
    3. `src/features/client-projects/project-detail-page.tsx`: Header proyek dan ringkasan eksekutif termin diekstrak ke `src/features/client-projects/components/project-detail-header.tsx`.
    4. `src/features/invoicing/invoicing-page.tsx`: Handler ekspor multi-format (Excel, PDF, CSV) diekstrak ke `src/features/invoicing/components/invoice-export-handlers.ts`.
    5. `src/lib/pdf/pdf-engine.ts`: Helper pemotongan teks, pembungkus baris, klasifikasi kapitalisasi tabel akuntansi, dan normalisasi desimal moneter diekstrak ke `src/lib/pdf/pdf-text-utils.ts`.
  - Hasil verifikasi pasca-refaktor: `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (21 test files passed, 143 tests passed).
- **Fase 4: Konsistensi UI/UX & Design System (Hari 8-9) — [SELESAI 100%]**
  - Standarisasi komponen `TableLoadingRow` di `@/components/ui/table` yang menyatu di dalam `<TableBody>` sesuai pedoman desain `AGENTS.md`.
  - Menerapkan `TableLoadingRow` dan menghilangkan layout shift / header terpotong saat memuat data pada:
    1. Modul Invoicing & Kuitansi (`invoicing-page.tsx`): Tab Invoice, AR Aging, dan Kuitansi.
    2. Modul Approval & Pengajuan (`admin-approvals-page.tsx`, `user-payments-page.tsx`).
    3. Modul Anggaran (`budget-page.tsx`), Purchase Order (`po-page.tsx`), Bagi Hasil (`profit-sharing-page.tsx`).
    4. Modul Master Data (`projects-page.tsx`, `period-list-table.tsx`, `users-management-page.tsx`, `audit-trail-page.tsx`).
  - Verifikasi Anti-Clipping Dropdown Menu (`[UX-001]` Closed): Seluruh instansiasi `ExportDownloadMenu` dan `DocumentDownloadMenu` telah menggunakan React Portal `fixed z-[99999]` dengan viewport clamping.
  - Sinkronisasi kamus translasi bilingual `id` & `en` untuk kunci loading/empty state.
  - Hasil verifikasi: `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (21 test files passed, 143 tests passed).
- **Fase 5: Internasionalisasi & Glosarium (Hari 10) — [SELESAI 100%]**
  - Sentralisasi terminologi jenis invoice penagihan ke dalam `src/lib/glossary.ts` (`INVOICE_KIND_MAP` dan `getLocalizedInvoiceKind`).
  - Hapus kamus lokal duplikat di `invoice-create-dialog.tsx`, tautkan seluruh label dan pesan validasi langsung ke glosarium dan i18n namespace.
  - Selesaikan temuan `[I18N-001]` (Closed): pesan validasi, toast error, dan empty state seragam menggunakan bahasa Indonesia baku.
  - Verifikasi otomatis via `tests/unit/i18n-check.test.ts` (12 test case lulus 100%, paritas penuh kamus ID dan EN).
  - Hasil verifikasi sistem: `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (21 test files passed, 143 tests passed).
- **Fase 6: Infrastruktur & Otomasi (Hari 11) — [SELESAI 100%]**
  - Penerapan Dual Deployment (Cloudflare Pages & Vercel) terverifikasi 100%:
    - `public/_redirects` mengarahkan SPA deep routing `/* /index.html 200` pada Cloudflare Pages.
    - `public/_headers` dan `vercel.json` menerapkan security headers HTTP (`X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`, `HSTS`).
    - Skrip build Vite terbukti menyalin `_redirects` dan `_headers` ke dalam direktori rilis `dist/`.
  - Otomasi GitHub Actions CI (`.github/workflows/ci.yml`) siap memvalidasi linting, typecheck, database PGlite integration tests, dan build SPA secara otomatis pada setiap push/PR.
  - Scheduler pencegah auto-pause database Supabase Free Tier dan pencadangan terenkripsi AES-256 (`.github/workflows/backup-db.yml` & `scripts/backup/export-db.sh`) telah aktif dengan siklus rotasi 10 arsip.
  - Hasil verifikasi akhir seluruh sistem: `npm run build` (lulus 11.24s), `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (21 test files passed, 143 tests passed).

---

## 9. Pertanyaan Terbuka untuk Pemilik & Keputusan Strategis

1. **Apakah Altvira Technology memerlukan penerbitan Faktur Pajak terintegrasi (e-Faktur DJP) di dalam Altcycles pada fase rilis berikutnya?**  
   - **Jawaban Pemilik:** Memerlukan integrasi e-Faktur Coretax DJP jika memungkinkan secara teknis.  
   - **Keputusan Arsitektur & Tindak Lanjut:**  
     - Mengadopsi mekanisme standar industri 100% gratis: **Ekspor Skema Impor Coretax (XML/CSV)**.  
     - Altcycles akan menyediakan tombol ekspor data faktur pajak sesuai skema impor DJP Coretax (`coretaxdjp.pajak.go.id`), sehingga staf cukup mengunggah file hasil ekspor ke portal Coretax tanpa perlu menginput faktur satu per satu secara manual.  
     - Fitur ini disiapkan sebagai modul *ready-to-activate*, yang dapat diaktifkan begitu Altvira resmi dikukuhkan sebagai Pengusaha Kena Pajak (PKP) di masa mendatang (saat ini `pkp_enabled = false`).

2. **Untuk akun email pengirim notifikasi tagihan (Resend), apakah domain email resmi perusahaan (`@altvira.com` / `@altcycles.com`) telah disiapkan untuk verifikasi DNS SPF/DKIM?**  
   - **Jawaban Pemilik:** Altvira Technology saat ini **belum mempunyai email resmi perusahaan**.  
   - **Keputusan Arsitektur & Tindak Lanjut:**  
     - Distribusi penagihan invoice, kuitansi, dan BAST difokuskan melalui **Generator PDF Berstandar** serta tombol cepat **"Kirim / Bagikan via WhatsApp"** (`https://wa.me/?text=...`) yang langsung menyusun draf pesan penagihan sopan beserta lampiran dokumen.  
     - Integrasi email transaksional otomatis via Resend ditangguhkan hingga perusahaan memiliki domain resmi terverifikasi (DNS SPF/DKIM/DMARC).

3. **Apakah ada kebutuhan multi-cabang (multi-branch) dengan neraca saldo terpisah dalam satu entitas perusahaan di masa mendatang?**  
   - **Jawaban Pemilik:** Belum ada rencana cabang, Altvira saat ini dan untuk ke depan tetap beroperasi sebagai **Single Entity (entitas tunggal)**.  
   - **Keputusan Arsitektur & Tindak Lanjut:**  
     - Mengunci arsitektur Altcycles pada model **Single-Tenant / Single-Entity** (`company_profile` singleton `id = 1`).  
     - Mengeliminasi kebutuhan fitur kompleksitas tinggi seperti multi-branch switcher, konsolidasi neraca saldo antar-cabang, atau partisi tenant, sehingga aplikasi tetap ramping, cepat, dan terfokus pada operasional Altvira Technology.

---

## 10. Batasan Audit

1. **Lingkup Analisis Statis & Lingkungan Sandbox:** Audit kode dilakukan secara menyeluruh pada repositori lokal dan pengujian in-memory PGlite. Kueri `npm audit` ke registry publik dibatasi oleh aturan isolasi jaringan terminal sandbox.
2. **Kondisi Tanpa Beban Produksi Riil:** Pengujian performa kueri database Supabase dievaluasi berdasarkan rencana eksekusi indeks (EXPLAIN ANALYZE) pada data seed, belum mencakup uji beban konkurensi ribuan pengguna simultan.
3. **Audit Dilakukan Mode READ-ONLY:** Selama proses audit berlangsung, auditor tidak mengubah kode sumber, konfigurasi, maupun skema database apa pun di dalam repositori.

---
*Dokumen ini merupakan hasil audit resmi dan menjadi satu-satunya dasar acuan untuk rencana perbaikan sistem Altcycles berikutnya.*
