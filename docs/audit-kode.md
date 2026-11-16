# Laporan Audit Kode Menyeluruh — Altcycles (ERP Keuangan Altvira)

**Tanggal Audit:** 16 November 2026  
**Auditor:** Antigravity Assistant (AI Systems Engineer)  
**Status Audit:** Tahap Audit & Rekomendasi (Belum ada kode aplikasi yang diubah, dipindahkan, atau dihapus)  
**Cakupan Langkah 1:** Bagian A (File Terlalu Panjang) & Bagian B (File Tidak Relevan & Redundansi)  
**Komitmen Inti:** Angka, rumus, penomoran, status, data tersimpan, skema database, dan perilaku fitur tidak berubah; tanpa data nyata di kode/test; tes yang ada tidak dilemahkan.

---

## Ringkasan Eksekutif (Langkah 1)

Audit codebase Altcycles menemukan bahwa aplikasi memiliki kelengkapan fitur finansial dan akuntansi yang sangat matang, tipe data TypeScript yang ketat, serta cakupan pengujian unit/integrasi yang solid (67 test lulus 100%). Namun, dari segi keterpeliharaan (*maintainability*) dan arsitektur file, terdapat **konsentrasi kode ekstrem (monolit)** pada sejumlah file utama di atas 1.000 hingga 5.300 baris, serta beberapa komponen legacy dan dependensi yang sudah tidak terpakai.

### 5 Temuan Teratas Bagian A (File Terlalu Panjang)

| ID | File Sumber | Baris | Tanggung Jawab Utama yang Bercampur | Estimasi Usaha | Estimasi Manfaat | Perlu Keputusanku? |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| **A-01** | `src/lib/pdf-generator.ts` | 5.399 | Mesin render PDF, font metrics, tabel multi-section, inspector collision, dan 20+ builder dokumen bisnis | Besar | Sangat Tinggi | **Ya** |
| **A-02** | `src/features/client-projects/project-detail-page.tsx` | 4.766 | Detail proyek, 6 tab navigasi, 8+ dialog modal, kalkulasi termin & CPO, generator dokumen transaksi | Besar | Sangat Tinggi | **Ya** |
| **A-03** | `src/features/accounting/reports-page.tsx` | 3.161 | 7 jenis laporan akuntansi (Laba Rugi, Neraca, Arus Kas, GL, TB, Ekuitas, Lengkap), kalkulasi saldo, ekspor 3 format | Sedang | Sangat Tinggi | **Ya** |
| **A-04** | `src/features/invoicing\invoicing-page.tsx` | 2.037 | Piutang klien, invoice termin, pelunasan kuitansi, dialog pembatalan, KPI cards, ekspor | Sedang | Tinggi | **Ya** |
| **A-05** | `src/lib/data-service.ts` | 1.939 | God object akses Supabase + demo mode lokal untuk 20+ entitas transaksi dan master | Sedang | Sangat Tinggi | **Ya** |

### 5 Temuan Teratas Bagian B (File Tidak Relevan & Redundansi)

| ID | File / Entitas | Kategori | Alasan & Bukti | Tingkat Keyakinan | Risiko Penghapusan | Perlu Keputusanku? |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **B-01** | `src/components/shared/document-download-menu.tsx` | Komponen Legacy Duplikat | Sudah digantikan oleh `ExportDownloadMenu` (sesuai aturan `AGENTS.md`). Masih tertinggal di 6 file pemanggil. | Tinggi | Rendah (setelah migrasi ke `ExportDownloadMenu`) | **Ya** |
| **B-02** | `AUDIT_REPORT.md` (di root) | Dokumen Audit Lama | Laporan audit per 12 November 2026 di root directory. Isinya sudah usang & dipusatkan di folder `docs/`. | Tinggi | Sangat Rendah | **Ya** |
| **B-03** | `driver.js` di `package.json` | Dependensi Tak Terpakai | Library seberat 172 kB terdaftar di dependencies namun 0 pemakaian (`import`) di seluruh `src/`. | Tinggi | Rendah | **Ya** |
| **B-04** | `supabase/.temp/full_altcycles_cloud_setup.sql` | Output Bundel SQL Sementara | File temporary (4.503 baris) hasil generate `bundle-cloud-sql.mjs`. Sudah ada di `.gitignore`. | Tinggi | Nol | **Ya** |
| **B-05** | `scripts/supabase/bootstrap-super-admin.sql` | Skrip Manual Hardcoded | Skrip SQL sekali pakai dengan hardcoded email pribadi. Tidak ada pipeline/CI yang menjalankannya. | Sedang | Rendah (bisa diarsipkan) | **Ya** |

---

## BAGIAN A: AUDIT FILE TERLALU PANJANG

### 1. Klasifikasi dan Peta Ukuran File

Dari total 92 file kode di dalam direktori `src/`:
- **File Prioritas Tinggi (> 800 baris):** 24 file (total 40.750 baris kode, rata-rata 1.698 baris/file)
- **File Kandidat Sedang (400 – 800 baris):** 19 file (total 11.238 baris kode, rata-rata 591 baris/file)
- **File Ideal (< 400 baris):** 49 file (total 7.840 baris kode, rata-rata 160 baris/file)

File non-`src` yang panjang:
- `tests/fixtures/document-layout-fixtures.ts`: 3.186 baris (Data fixture dokumen A4 untuk pengetesan layout cetak)
- `src/types/database.types.ts`: 1.293 baris (Skema tipe data TypeScript 60+ tabel Supabase)

---

### 2. Inventaris Kandidat & Rencana Pemecahan Konkret

Berikut adalah analisis dan rencana pemecahan untuk file monolit prioritas tinggi dan kandidat utama:

#### ID: A-01 — `src/lib/pdf-generator.ts`
- **Jumlah Baris:** 5.399 baris
- **Prioritas:** Kritis / Sangat Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Konstanta token tata letak PDF, palet warna, tipografi, tabel lebar karakter AFM (`AFM_HELVETICA_BOLD_KERNING`, `AFM_HELVETICA_REGULAR_KERNING`).
  2. Engine inti penggambaran: header institusi, footer otomatis, baris biru judul lengkap, tanda air draft, kotak banner, inspector collision detection (`inspectPdfDocumentLayout`).
  3. Mesin render tabel: `drawPdfTable` (tabel single) dan `sections` (tabel multi-seksi multi-halaman).
  4. Builder spesifikasi 22+ dokumen transaksi bisnis: Invoice, Kuitansi, Quotation, SOW, SPK, PO Klien, PO Vendor, BAKP, UAT, BAST, Payment Approval, JTPP, dan 7 rekap/daftar.
  5. Builder spesifikasi dokumen akuntansi: Jurnal Umum, AJP, Buku Besar, Neraca Saldo, Laba Rugi, Perubahan Ekuitas, Neraca, Arus Kas, dan Laporan Lengkap.
- **Rekomendasi Pemecahan Konkret:**
  Pecah menjadi modul terstruktur di dalam folder baru `src/lib/pdf/`:
  1. `src/lib/pdf/core-tokens.ts` (~250 baris): Token tata letak, palet warna (`PDF_LAYOUT_TOKENS`, `BRAND_BLUE`, `CHIP_BG`), dan tabel metrik AFM font.
  2. `src/lib/pdf/layout-engine.ts` (~600 baris): `drawDocumentHeader`, `drawDocumentFooter`, `drawTrackedText`, `drawPdfTable`, dan fungsi deteksi tabrakan kotak batas (`inspectPdfDocumentLayout`).
  3. `src/lib/pdf/specs/transaction-specs.ts` (~800 baris): Builder dokumen penagihan & pengadaan (`buildInvoicePdfSpec`, `buildReceiptPdfSpec`, `buildQuotationPdfSpec`, `buildPoPdfSpec`, `buildPaymentApprovalPdfSpec`, dll.).
  4. `src/lib/pdf/specs/project-docs-specs.ts` (~600 baris): Builder dokumen proyek (`buildSowPdfSpec`, `buildBakpPdfSpec`, `buildUatPdfSpec`, `buildBastPdfSpec`, `buildJtppPdfSpec`, `buildSpkCharterPdfSpec`).
  5. `src/lib/pdf/specs/accounting-specs.ts` (~750 baris): Builder dokumen akuntansi (`buildJournalsPdfSpec`, `buildGeneralLedgerPdfSpec`, `buildTrialBalancePdfSpec`, laporan keuangan).
  6. `src/lib/pdf-generator.ts` (~120 baris): Menjadi *barrel export re-export facade* sehingga seluruh kode pemanggil di aplikasi tidak mengalami *breaking import*.
- **Risiko Pemecahan:** Sedang (Memerlukan verifikasi visual seluruh fixture dokumen).
- **Dependensi Terpengaruh:** `pdf-lib`, `journals-page.tsx`, `reports-page.tsx`, `invoicing-page.tsx`, `project-detail-page.tsx`.
- **Tes yang Harus Dijalankan:** `npx vitest run tests/unit/document-title-mapping.test.ts`, `tests/unit/generate-render-check.test.ts`, `tests/unit/accounting-pdf-excel.test.ts`.
- **Perlu Keputusanku?** Ya

---

#### ID: A-02 — `src/features/client-projects/project-detail-page.tsx`
- **Jumlah Baris:** 4.766 baris
- **Prioritas:** Kritis / Sangat Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Root controller halaman detail proyek, header status, aksi cepat, dan fetch data Supabase.
  2. Tab 1: Ringkasan Proyek & Finansial (KPI, margin, realisasi biaya).
  3. Tab 2: Termin Penagihan (daftar termin, form tambah/edit termin, modal penagihan invoice).
  4. Tab 3: Purchase Order Klien (verifikasi PO, upload berkas PO, dialog persetujuan).
  5. Tab 4: Kontrak & SPK 10 Pasal (editor klausul, pengesahan, unduh PDF/DOCX SPK).
  6. Tab 5: Dokumen Serah Terima (Quotation, SOW, BAKP, UAT, BAST beserta checklist dan tanda tangan).
  7. Tab 6: Log & Riwayat Audit Proyek.
  8. Logika pembuatan dokumen transaksi lokal (`makeQuotationSpec`, `makeSowSpec`, `makeBastSpec`, dll.).
- **Rekomendasi Pemecahan Konkret:**
  Pecah menjadi folder modul komponen per tab di `src/features/client-projects/components/`:
  1. `project-detail-page.tsx` (~350 baris): Root shell, header proyek, tabs controller, dan data fetching orchestration.
  2. `components/project-summary-tab.tsx` (~300 baris): Tab ringkasan metrik laba rugi proyek & kartu status.
  3. `components/project-milestones-tab.tsx` (~450 baris): Tabel termin penagihan & modal dialog termin.
  4. `components/project-client-po-tab.tsx` (~350 baris): Tabel PO klien & dialog verifikasi PO.
  5. `components/project-spk-tab.tsx` (~400 baris): Tab SPK / Project Charter & tombol generate dokumen.
  6. `components/project-acceptance-docs-tab.tsx` (~500 baris): Tab UAT, BAST, BAKP, SOW dan modal persetujuannya.
  7. `components/project-specs-builder.ts` (~350 baris): Logika konversi data proyek ke `PdfDocumentSpec` (memisahkan logika presentasi dokumen dari UI React).
- **Risiko Pemecahan:** Sedang (Memerlukan props interface yang rapi antar tab).
- **Dependensi Terpengaruh:** `App.tsx`, `client-projects.ts`, `pdf-generator.ts`.
- **Tes yang Harus Dijalankan:** `npm run typecheck`, `npx vitest run tests/db/phase4-progress-billing-and-buyer.test.ts`.
- **Perlu Keputusanku?** Ya

---

#### ID: A-03 — `src/features/accounting/reports-page.tsx`
- **Jumlah Baris:** 3.161 baris
- **Prioritas:** Sangat Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. State filter periode (bulanan, kuartalan, tahunan, kustom) dan orkestrasi 7 tab laporan.
  2. Perhitungan & rendering Laporan Laba Rugi Komprehensif.
  3. Perhitungan & rendering Laporan Perubahan Ekuitas.
  4. Perhitungan & rendering Laporan Posisi Keuangan (Neraca).
  5. Perhitungan & rendering Laporan Arus Kas Metode Langsung.
  6. Perhitungan & rendering Buku Besar (GL) akun tunggal & seluruh akun.
  7. Perhitungan & rendering Neraca Saldo (Trial Balance) sebelum & setelah penyesuaian.
  8. Orkestrasi ekspor PDF, Excel (.xlsx), dan CSV untuk ketujuh laporan.
- **Rekomendasi Pemecahan Konkret:**
  Pecah menjadi sub-komponen per tab di `src/features/accounting/reports/`:
  1. `reports-page.tsx` (~300 baris): Shell laporan, filter toolbar terpadu, `ExportDownloadMenu`, navigasi tab.
  2. `reports/income-statement-view.tsx` (~350 baris): Komponen tampilan Laporan Laba Rugi.
  3. `reports/balance-sheet-view.tsx` (~350 baris): Komponen tampilan Laporan Posisi Keuangan.
  4. `reports/equity-statement-view.tsx` (~250 baris): Komponen tampilan Laporan Perubahan Ekuitas.
  5. `reports/cash-flow-view.tsx` (~300 baris): Komponen tampilan Laporan Arus Kas.
  6. `reports/general-ledger-view.tsx` (~450 baris): Komponen tampilan Buku Besar & kartu akun.
  7. `reports/trial-balance-view.tsx` (~350 baris): Komponen tampilan Neraca Saldo & saldo penyesuaian.
  8. `reports/reports-export-handlers.ts` (~400 baris): Kumpulan fungsi unduh PDF, Excel, dan CSV.
- **Risiko Pemecahan:** Rendah (Logika murni presentasi data yang sudah dihitung oleh `accounting-engine.ts`).
- **Dependensi Terpengaruh:** `accounting-engine.ts`, `pdf-generator.ts`, `excel-exporter.ts`, `csv-exporter.ts`.
- **Tes yang Harus Dijalankan:** `npm run typecheck`, `npx vitest run tests/unit/accounting-pdf-excel.test.ts`.
- **Perlu Keputusanku?** Ya

---

#### ID: A-04 — `src/features/invoicing/invoicing-page.tsx`
- **Jumlah Baris:** 2.037 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Tabel daftar invoice penagihan & piutang berjalan.
  2. Modal Catat Invoice Baru (perhitungan termin, PPh 23, PPN, rincian termin).
  3. Modal Catat Pelunasan / Kuitansi (input rekening kas/bank, tanggal bayar, nomor kuitansi otomatis).
  4. Modal Batalkan Invoice (alasan pembatalan, pembalikan status termin).
  5. Ekspor PDF Invoice, Kuitansi, Excel, dan CSV.
  6. Kartu KPI ringkasan piutang (Total Tagihan, Sudah Dibayar, Belum Dibayar, Jatuh Tempo).
- **Rekomendasi Pemecahan Konkret:**
  1. `invoicing-page.tsx` (~400 baris): Tabel utama, filter status, KPI cards, dan trigger modal.
  2. `components/invoice-create-dialog.tsx` (~400 baris): Modal form terbit invoice baru.
  3. `components/invoice-payment-dialog.tsx` (~350 baris): Modal form pelunasan & terbit kuitansi.
  4. `components/invoice-cancel-dialog.tsx` (~150 baris): Modal konfirmasi pembatalan invoice.
  5. `components/invoice-kpi-summary.tsx` (~150 baris): 4 kartu KPI piutang.
- **Risiko Pemecahan:** Rendah.
- **Tes yang Harus Dijalankan:** `npm run typecheck`, `npx vitest run tests/unit/document-title-mapping.test.ts`.
- **Perlu Keputusanku?** Ya

---

#### ID: A-05 — `src/lib/data-service.ts`
- **Jumlah Baris:** 1.939 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  God object untuk seluruh operasi pembacaan dan penulisan Supabase + fallback demo mode lokal (Profiles, Invoices, Receipts, Projects, Milestones, Payment Requests, Journals, Chart of Accounts, Periods, Company, Vendor PO, Client PO, dll.).
- **Rekomendasi Pemecahan Konkret:**
  Pecah menjadi domain services di `src/lib/services/`:
  1. `src/lib/services/auth-profile-service.ts` (~250 baris)
  2. `src/lib/services/project-service.ts` (~400 baris)
  3. `src/lib/services/invoicing-service.ts` (~350 baris)
  4. `src/lib/services/accounting-service.ts` (~450 baris)
  5. `src/lib/services/payment-request-service.ts` (~300 baris)
  6. `src/lib/data-service.ts` (~100 baris): Re-export facade agar modul lain tetap kompatibel.
- **Risiko Pemecahan:** Sedang (Banyak modul bergantung pada `data-service.ts`).
- **Perlu Keputusanku?** Ya

---

#### ID: A-06 — `src/features/accounting/journals-page.tsx`
- **Jumlah Baris:** 1.834 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Tabel Riwayat Jurnal Harian (Buku Jurnal Umum & Jurnal Penyesuaian AJP).
  2. Modal Form Catat Transaksi Jurnal (multi-row baris debit & kredit dinamis, kalkulasi balance real-time, opsi pembalikan otomatis / auto-reverse).
  3. Modal Jurnal Koreksi / Pembatalan Jurnal Terposting.
  4. Dialog Hapus Jurnal Massal & Pemeriksaan Kunci Jurnal (*journal lock*).
  5. Ekspor PDF Buku Jurnal, Excel, dan CSV.
- **Rekomendasi Pemecahan Konkret:**
  1. `journals-page.tsx` (~400 baris): Toolbar, filter jenis/tanggal, tabel riwayat jurnal, dan pagination.
  2. `components/journal-entry-modal.tsx` (~500 baris): Modal form catat transaksi baru & edit jurnal.
  3. `components/journal-correction-dialog.tsx` (~250 baris): Modal pembuatan ayat jurnal koreksi.
  4. `components/journal-table-row.tsx` (~200 baris): Komponen baris jurnal debit-kredit terindentasi.
- **Risiko Pemecahan:** Rendah.
- **Perlu Keputusanku?** Ya

---

#### ID: A-07 — `src/lib/operations/client-projects.ts`
- **Jumlah Baris:** 1.620 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  Orkestrasi logika transaksi proyek klien: sinkronisasi termin, pembuatan PO klien, verifikasi portal pembeli, kalkulasi persentase kemajuan, dan posting otomatis jurnal akrual termin.
- **Rekomendasi Pemecahan Konkret:**
  Pecah menjadi:
  1. `client-projects-termin.ts` (~500 baris): Logika termin penagihan & posting jurnal termin.
  2. `client-projects-po.ts` (~400 baris): Logika verifikasi dan upload PO klien.
  3. `client-projects-docs.ts` (~400 baris): Logika penerbitan dokumen serah terima proyek.
  4. `client-projects.ts` (~200 baris): Facade utama.
- **Risiko Pemecahan:** Sedang.
- **Perlu Keputusanku?** Ya

---

#### ID: A-08 — `src/lib/word-generator.ts`
- **Jumlah Baris:** 1.558 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  Generator DOCX untuk 10 jenis dokumen (Quotation, SOW, SPK, PO, BAKP, UAT, BAST, Payment Approval, JTPP, Invoice).
- **Rekomendasi Pemecahan Konkret:**
  Pecah menjadi folder `src/lib/docx/`:
  1. `docx-styles.ts` (~200 baris): Definisi gaya tabel, font Calibri/Arial, borders, shading.
  2. `docx-header-footer.ts` (~200 baris): Header logo institusi & footer otomatis halaman x dari y.
  3. `docx-document-builders.ts` (~800 baris): Rincian isi per dokumen bisnis.
  4. `word-generator.ts` (~100 baris): Ekspor utama `generateDocumentWord`.
- **Risiko Pemecahan:** Rendah (Fungsi generator murni tanpa efek samping runtime).
- **Perlu Keputusanku?** Ya

---

#### ID: A-09 — `src/features/master-data/periods-page.tsx`
- **Jumlah Baris:** 1.515 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Tabel daftar periode akuntansi kalender & status buka/tutup.
  2. Wizard Tutup Buku Bulanan (Pengecekan selisih debit/kredit, verifikasi jurnal belum diposting).
  3. Wizard Tutup Buku Akhir Tahun (Penutupan akun pendapatan dan beban ke ikhtisar laba rugi dan saldo laba ditahan).
  4. Dialog Buka Kunci Periode & Audit Trail Pembukaan Kunci.
- **Rekomendasi Pemecahan Konkret:**
  1. `periods-page.tsx` (~400 baris): Tabel periode & ringkasan status.
  2. `components/period-monthly-closing-wizard.tsx` (~450 baris): Dialog wizard tutup buku bulanan.
  3. `components/period-annual-closing-wizard.tsx` (~400 baris): Dialog wizard tutup buku tahunan.
  4. `components/period-unlock-dialog.tsx` (~200 baris): Dialog buka kunci dengan validasi Super Admin.
- **Risiko Pemecahan:** Rendah.
- **Perlu Keputusanku?** Ya

---

#### ID: A-10 — `src/components/layout/portal-shell.tsx`
- **Jumlah Baris:** 1.274 baris
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Layout shell: Sidebar kiri (expand/collapse), navbar atas, container konten utama.
  2. Navigasi peran: Matriks menu `NAV_STRUCTURE_BY_ROLE` untuk 3 peran (Super Admin, Admin, User).
  3. Peta breadcrumbs 40+ rute URL.
  4. Dialog notifikasi sistem & badge unread count.
  5. Menu profil pengguna & switch peran kilat (*quick role switcher*).
- **Rekomendasi Pemecahan Konkret:**
  1. `nav-structure.ts` (~300 baris): Ekstraksi konstanta `NAV_STRUCTURE_BY_ROLE`, rute, ikon, dan filter izin.
  2. `breadcrumb-map.ts` (~150 baris): Ekstraksi peta path URL ke label breadcrumbs.
  3. `components/shell-notifications-dialog.tsx` (~250 baris): Dialog notifikasi.
  4. `components/shell-sidebar.tsx` (~350 baris): Komponen sidebar desktop & mobile drawer.
  5. `portal-shell.tsx` (~300 baris): Shell wrapper utama yang ramping.
- **Risiko Pemecahan:** Sedang (Mempengaruhi navigasi seluruh portal).
- **Perlu Keputusanku?** Ya

---

#### ID: A-11 s/d A-24 — Ringkasan File Prioritas Tinggi Lainnya (> 800 baris)

| ID | File Sumber | Baris | Rekomendasi Pemecahan Singkat | Risiko | Perlu Keputusanku? |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **A-11** | `src/types/database.types.ts` | 1.293 | **Dikecualikan dari pemecahan.** Skema terpusat Supabase CLI; memecah tipe database manual berisiko tinggi saat regenerasi skema. | Tinggi | **Ya** (Usulan: dipertahankan) |
| **A-12** | `src/features/master-data/admin-dashboard.tsx` | 1.256 | Ekstrak: `dashboard-kpi-cards.tsx` (~250 brs), `dashboard-receivables-card.tsx` (~250 brs), `dashboard-recent-tx.tsx` (~300 brs). | Rendah | **Ya** |
| **A-13** | `src/features/buyer-portal/buyer-portal-page.tsx` | 1.239 | Ekstrak: `buyer-po-submission-dialog.tsx` (~350 brs), `buyer-project-progress.tsx` (~300 brs), `buyer-docs-list.tsx` (~300 brs). | Rendah | **Ya** |
| **A-14** | `src/components/shared/dashboard-charts.tsx` | 1.139 | Ekstrak per jenis visualisasi: `svg-bar-chart.tsx` (~300 brs), `svg-line-area-chart.tsx` (~300 brs), `svg-donut-chart.tsx` (~250 brs). | Rendah | **Ya** |
| **A-15** | `src/features/payment-approvals/user-payments-page.tsx` | 1.069 | Ekstrak: `payment-request-create-dialog.tsx` (~450 brs), `payment-request-detail-modal.tsx` (~250 brs). | Rendah | **Ya** |
| **A-16** | `src/features/auth/login-page.tsx` | 1.061 | Ekstrak: `login-media-carousel.tsx` (~350 brs), `signup-internal-tab.tsx` (~300 brs). | Rendah | **Ya** |
| **A-17** | `src/features/system-config/login-media-page.tsx` | 1.039 | Ekstrak: `login-media-uploader.tsx` (~350 brs), `login-quotes-editor.tsx` (~300 brs). | Rendah | **Ya** |
| **A-18** | `src/features/system-config/company-profile-page.tsx` | 1.031 | Ekstrak per tab: `company-identity-tab.tsx` (~250 brs), `company-bank-tab.tsx` (~200 brs), `company-legal-tab.tsx` (~250 brs). | Rendah | **Ya** |
| **A-19** | `src/features/master-data/parties-master-page.tsx` | 1.023 | Ekstrak: `customer-master-tab.tsx` (~400 brs), `vendor-master-tab.tsx` (~400 brs), `party-form-dialog.tsx` (~250 brs). | Rendah | **Ya** |
| **A-20** | `src/features/master-data/projects-page.tsx` | 903 | Ekstrak: `project-create-dialog.tsx` (~350 brs), `project-card-list.tsx` (~300 brs). | Rendah | **Ya** |
| **A-21** | `src/features/system-config/system-config-page.tsx` | 890 | Ekstrak: `numbering-rules-tab.tsx` (~300 brs), `tax-pkp-rules-tab.tsx` (~250 brs), `journal-lock-tab.tsx` (~200 brs). | Rendah | **Ya** |
| **A-22** | `src/components/shared/spk-charter-fields.tsx` | 867 | Ekstrak 10 klausul pasal ke komponen accordion section (`spk-clause-accordion.tsx`). | Rendah | **Ya** |
| **A-23** | `src/features/payment-approvals/admin-approvals-page.tsx` | 863 | Ekstrak: `approval-action-dialog.tsx` (~300 brs), `disbursement-dialog.tsx` (~250 brs). | Rendah | **Ya** |
| **A-24** | `src/features/purchase-orders/po-page.tsx` | 847 | Ekstrak: `po-create-dialog.tsx` (~400 brs), `po-status-filter.tsx` (~150 brs). | Rendah | **Ya** |

---

### 3. Usulan Standar Ukuran File & Aturan CI/Lint

- **Target Ukuran per File:** Maksimal **350 baris** untuk komponen UI / controller halaman, dan maksimal **500 baris** untuk generator atau modul kalkulasi bisnis.
- **Usulan Rule ESLint / CI Guard:**
  Tambahkan aturan `max-lines` di `eslint.config.js`:
  ```javascript
  "max-lines": ["warn", { "max": 400, "skipBlankLines": true, "skipComments": true }]
  ```
- **Daftar Pengecualian yang Disengaja (*Whitelisted Exceptions*):**
  1. `src/types/database.types.ts` — Skema TypeScript resmi Supabase CLI.
  2. `tests/fixtures/document-layout-fixtures.ts` — Data sampel ekstensif untuk 27 fixture layout dokumen.
  3. `src/lib/demo-seed.ts` — Data inisialisasi master & histori akuntansi mode demo lokal.

---

### 4. Urutan Eksekusi Pemecahan yang Disarankan (Risiko Terendah $\rightarrow$ Manfaat Tertinggi)

1. **Commit 1:** Pemecahan `src/features/invoicing/invoicing-page.tsx` (Risiko Rendah, Manfaat Sangat Tinggi).
2. **Commit 2:** Pemecahan `src/features/accounting/journals-page.tsx` (Risiko Rendah, Manfaat Sangat Tinggi).
3. **Commit 3:** Pemecahan `src/features/master-data/parties-master-page.tsx` (Risiko Rendah, Manfaat Tinggi).
4. **Commit 4:** Pemecahan `src/components/layout/portal-shell.tsx` (Ekstraksi `nav-structure.ts` & `breadcrumb-map.ts`).
5. **Commit 5:** Pemecahan `src/features/accounting/reports-page.tsx` (Risiko Rendah-Sedang, Manfaat Sangat Tinggi).
6. **Commit 6:** Pemecahan `src/lib/pdf-generator.ts` (Risiko Sedang, Manfaat Kritis).
7. **Commit 7:** Pemecahan `src/features/client-projects/project-detail-page.tsx` (Risiko Sedang, Manfaat Kritis).
8. **Commit 8:** Pemecahan `src/lib/data-service.ts` (Risiko Sedang, Manfaat Tinggi).

---

## BAGIAN B: AUDIT FILE TIDAK RELEVAN & REDUNDANSI

### 1. Inventaris Kandidat File Tidak Relevan

Berikut hasil audit menyeluruh terhadap file tidak terpakai, duplikat, skrip sekali pakai, dan artefak di repositori:

| ID | Path File | Kategori Temuan | Alasan & Bukti Verifikasi | Tingkat Keyakinan | Risiko Penghapusan | Perlu Keputusanku? |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **B-01** | `src/components/shared/document-download-menu.tsx` | Komponen Legacy Duplikat | **Sudah digantikan oleh `ExportDownloadMenu`.** Komponen ini hanya menyediakan format Excel/Word terbatas tanpa label standar `Unduh / Ekspor` (aturan `AGENTS.md`). Masih diimpor di 6 file pemanggil: `buyer-portal-page.tsx`, `project-detail-page.tsx`, `invoicing-page.tsx`, `admin-approvals-page.tsx`, `user-payments-page.tsx`, `po-page.tsx`. | **Tinggi** | **Rendah** (Migrasikan 6 file tersebut ke `ExportDownloadMenu` lalu hapus file ini) | **Ya** |
| **B-02** | `AUDIT_REPORT.md` (di root) | Dokumen Historis Usang | Laporan audit tanggal 12 November 2026 yang tersimpan di direktori root. Masalah yang dicatat di dalamnya sudah diselesaikan di commit-commit berikutnya, dan sistem audit baru telah dipusatkan di `docs/`. | **Tinggi** | **Sangat Rendah** (Bisa dipindahkan ke `docs/archive/AUDIT_REPORT_2026-11-12.md` atau dihapus) | **Ya** |
| **B-03** | `driver.js` di `package.json:30` | Dependensi Tak Terpakai | Library `driver.js` (^1.10.2) terpasang di `dependencies`, namun hasil pencarian di seluruh `src/` menunjukkan **0 impor/pemakaian**. | **Tinggi** | **Rendah** (Bisa di-uninstall via `npm remove driver.js` untuk menghemat ukuran bundle) | **Ya** |
| **B-04** | `supabase/.temp/full_altcycles_cloud_setup.sql` | Output Generate Temporary | Berkas berukuran 4.503 baris di direktori `supabase/.temp/`. Merupakan hasil generate sekali jalan dari `bundle-cloud-sql.mjs`. Sudah ada di `.gitignore` dan untracked di git. | **Tinggi** | **Nol** (Dapat digenerate ulang kapan saja) | **Ya** |
| **B-05** | `scripts/supabase/bootstrap-super-admin.sql` | Skrip Manual Hardcoded | Skrip SQL 18 baris untuk inisialisasi akun Super Admin pertama. Memuat alamat email pribadi hardcoded dan tidak terhubung ke pipeline build, CI, atau runtime. | **Sedang** | **Rendah** (Arsipkan ke dokumentasi deployment) | **Ya** |
| **B-06** | `docs/referensi-layout/staffinc-notes-payment-detail.png` | Aset Gambar Tidak Terhubung | Gambar tangkapan layar 26 kB di `docs/referensi-layout/` yang tidak pernah diacu atau disematkan di file dokumentasi markdown mana pun. | **Sedang** | **Rendah** (Bisa dipertahankan sebagai referensi atau dihapus bila tidak diperlukan) | **Ya** |

---

### 2. File dan Dokumen yang DIVERIFIKASI AKTIF & DILARANG DIHAPUS

Untuk mencegah kesalahan penghapusan (*false positive*), berkas-berkas berikut telah diverifikasi dan **wajib dipertahankan**:
1. `docs/standar-dokumen.md` & `docs/temuan-layout.md` — Patokan resmi dokumen transaksi dan siklus akuntansi Altvira.
2. `docs/render-check/` (seluruh file PDF & PNG `before/` dan `after/`) — Artefak verifikasi visual 27 fixture dokumen.
3. `scripts/backup/export-db.sh` — Aktif dijalankan oleh GitHub Actions workflow `.github/workflows/backup-db.yml` untuk pencadangan terenkripsi berkala.
4. `scripts/supabase/bundle-cloud-sql.mjs` — Aktif terhubung ke npm script `"supabase:bundle-sql"`.
5. `src/components/layout/overlay-page-scrollbar.tsx` — Aktif diimpor dan digunakan di `src/components/layout/portal-shell.tsx:49`.
6. `src/features/system-config/master-readonly-page.tsx` — Aktif dimuat via `lazyPage` di `src/App.tsx:60` untuk rute `/super-admin/master-tinjau`.
7. `public/brand/*` (seluruh 8 aset gambar) — Seluruhnya aktif digunakan oleh UI navbar, favicon, login page, dan generator PDF/Word.

---

### 3. Usulan Rencana Tindak Lanjut Bagian B (Setelah Persetujuan)

1. **Langkah B-1:** Migrasikan 6 halaman pemanggil `DocumentDownloadMenu` ke komponen standar `ExportDownloadMenu`, lalu hapus file `src/components/shared/document-download-menu.tsx`.
2. **Langkah B-2:** Pindahkan `AUDIT_REPORT.md` dari root ke `docs/archive/AUDIT_REPORT_2026-11-12.md` agar root tetap bersih.
3. **Langkah B-3:** Copot dependensi yang tidak terpakai `driver.js` dari `package.json` menggunakan perintah `npm remove driver.js`.
4. **Langkah B-4:** Bersihkan folder lokal `supabase/.temp/` yang sudah ter-ignore.

---

> [!NOTE]
> **Status Audit:** Langkah 1 (Bagian A dan Bagian B) telah selesai diaudit secara komprehensif. Sesuai instruksi, sistem saat ini **BERHENTI** untuk menunggu telaah dan keputusan pemilik produk sebelum melangkah ke Langkah 2 (Bagian C dan Bagian D) atau eksekusi pemecahan.
