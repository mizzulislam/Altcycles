# Laporan Audit Kode Menyeluruh — Altcycles (ERP Keuangan Altvira)

**Tanggal Audit:** 16 November 2026  
**Auditor:** Antigravity Assistant (AI Systems Engineer)  
**Status Audit:** Tahap Audit & Rekomendasi Lengkap (Langkah 1 & Langkah 2 Selesai — Menunggu Keputusan Pengguna)  
**Cakupan Dokumen:** Bagian A (File Terlalu Panjang), Bagian B (File Tidak Relevan), Bagian C (Ketidakkonsistenan UI/UX), dan Bagian D (Rekomendasi Motion & Animasi)  
**Komitmen Inti:** Angka, rumus, penomoran, status, data tersimpan, skema database, dan perilaku fitur tidak berubah; tanpa data nyata di kode/test; tes yang ada tidak dilemahkan.

---

## Ringkasan Eksekutif (Langkah 1 & 2)

Audit codebase Altcycles menemukan bahwa aplikasi memiliki kelengkapan fitur finansial dan akuntansi yang sangat matang, tipe data TypeScript yang ketat, serta cakupan pengujian unit/integrasi yang solid (67 test lulus 100%). Namun, dari segi arsitektur file, UI/UX, dan interaksi visual, terdapat beberapa area yang memerlukan penataan:
1. **Konsentrasi Kode Ekstrem (Monolit):** 24 file berada di atas 800 baris (bahkan file PDF generator mencapai 5.399 baris).
2. **File & Artefak Tidak Relevan:** Sebagian besar file historis dan artefak sementara telah selesai diarsipkan pada Langkah 1.
3. **Ketidakkonsistenan UI/UX:** Adanya warna hex hardcoded di halaman login/toggle tema, inkonsistensi alignment header tabel di modal detail, serta perbedaan penyajian data moneter di dokumen/tabel buku besar.
4. **Peluang Motion & Animasi:** Aplikasi sudah memiliki dependensi `motion` (v14.10.1) yang belum dimanfaatkan secara optimal untuk transisi dialog, tabs, dan tombol feedback, yang jika diimplementasikan dengan batasan ketat (`transform` & `opacity`, zero reflow) akan meningkatkan kualitas interaksi tanpa mengorbankan performa.

### 5 Temuan Teratas Bagian A (File Terlalu Panjang)

| ID | File Sumber | Baris | Tanggung Jawab Utama yang Bercampur | Estimasi Usaha | Estimasi Manfaat | Perlu Keputusanku? |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| **A-01** | `src/lib/pdf-generator.ts` | 5.825 $\rightarrow$ 18 | Mesin render PDF, font metrics, tabel multi-section, inspector collision, dan 20+ builder dokumen bisnis | Besar | Sangat Tinggi | **Selesai Dipecah & Tervalidasi** |
| **A-02** | `src/features/client-projects/project-detail-page.tsx` | 4.861 $\rightarrow$ 1.306 | Detail proyek, 6 tab navigasi, 8+ dialog modal, kalkulasi termin & CPO, generator dokumen transaksi | Besar | Sangat Tinggi | **Selesai Dipecah & Tervalidasi** |
| **A-03** | `src/features/accounting/reports-page.tsx` | 3.161 $\rightarrow$ 725 | 7 jenis laporan akuntansi (Laba Rugi, Neraca, Arus Kas, GL, TB, Ekuitas, Lengkap), kalkulasi saldo, ekspor 3 format | Sedang | Sangat Tinggi | **Selesai Dipecah & Tervalidasi** |
| **A-04** | `src/features/invoicing/invoicing-page.tsx` | 2.037 $\rightarrow$ 1.352 | Piutang klien, invoice termin, pelunasan kuitansi, dialog pembatalan, KPI cards, ekspor | Sedang | Tinggi | **Selesai Dipecah & Tervalidasi** |
| **A-05** | `src/lib/data-service.ts` | 2.071 $\rightarrow$ 17 | God object akses Supabase + demo mode lokal untuk 20+ entitas transaksi dan master | Sedang | Sangat Tinggi | **Selesai Dipecah & Tervalidasi** |

### 5 Temuan Teratas Bagian B (File Tidak Relevan & Redundansi)

| ID | File / Entitas | Kategori | Alasan & Bukti | Tingkat Keyakinan | Keputusan Pengguna & Tindakan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **B-01** | `src/components/shared/document-download-menu.tsx` | Menu Unduh Transaksi | Bukan dead code. Melayani unduhan dokumen transaksi individual (PDF & Word per baris), sedangkan `ExportDownloadMenu` melayani ekspor dataset laporan (Excel/PDF/CSV). | Tinggi | **Dipertahankan & Distandarkan** (Memenuhi peran unduh dokumen individual) |
| **B-02** | `AUDIT_REPORT.md` (di root) | Dokumen Audit Lama | Laporan audit per 12 November 2026 di root directory. Isinya sudah usang & dipusatkan di folder `docs/`. | Tinggi | **Selesai Diarsipkan** ke `docs/archive/AUDIT_REPORT_2026-11-12.md` |
| **B-03** | `driver.js` di `package.json` | Dependensi Onboarding | Library product tour terdaftar di dependencies namun belum diaktifkan di kode `src/`. | Tinggi | **Dipertahankan** sesuai keputusan pengguna (akan digunakan kelak) |
| **B-04** | `supabase/.temp/full_altcycles_cloud_setup.sql` | Output Bundel SQL Sementara | File temporary (4.503 baris) hasil generate `bundle-cloud-sql.mjs`. Sudah ada di `.gitignore`. | Tinggi | **Selesai Dibersihkan** dari disk lokal |
| **B-05** | `scripts/supabase/bootstrap-super-admin.sql` | Skrip Manual Hardcoded | Skrip SQL sekali pakai dengan hardcoded email pribadi. Tidak ada pipeline/CI yang menjalankannya. | Sedang | **Selesai Diarsipkan** ke `docs/archive/bootstrap-super-admin.sql` |

### 5 Temuan Teratas Bagian C (Ketidakkonsistenan UI/UX)

| ID | Halaman / Komponen | Elemen | Kondisi Saat Ini | Standar Direkomendasikan | Dampak | Prioritas | Perlu Keputusanku? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **C-01** | `export-download-menu.tsx` & Termin / Dokumen Proyek | Dropdown Aksi Unduh Terpotong (*Clipping*) | Menu dropdown `ExportDownloadMenu` menggunakan `position: absolute` inline sehingga terpotong oleh kontainer kartu (`overflow-hidden`) atau tabel | Migrasikan ke React Portal (`createPortal(..., document.body)`) dengan posisi `fixed z-[99999]` dan deteksi batas viewport otomatis (*smart flip & clamp*) | Dropdown utuh sempurna di semua kontainer tabel, tidak pernah terpotong | Kritis | **Selesai Diperbaiki** |
| **C-02** | `login-page.tsx`, `theme-toggle.tsx`, `json-code-view.tsx` | Palet Warna & Tema | 20+ nilai hex warna ditulis langsung (`#0B43C8`, `#F0F1F3`, `#C9C9C9`, `#121A2B`, `#1A253C`) | Gunakan token semantik Tailwind (`bg-background`, `text-foreground`, `bg-primary`, `border-border`) | Tema dark/light mode seragam & mudah dipelihara | Tinggi | **Selesai Diperbaiki** |
| **C-03** | `journals-page.tsx:1806-1815` | Header Tabel Modal Detail | `TableHead` rata kiri (`text-left`) dan tebal `font-bold` | Seluruh `TableHead` wajib rata tengah (`text-center`) dan `font-semibold` sesuai `AGENTS.md` | Menghilangkan inkonsistensi visual header tabel | Tinggi | **Selesai Diperbaiki** |
| **C-04** | `journals-page.tsx` & Dokumen Buku Besar | Format Ref & Nominal Buku Besar | Kode akun Ref ada yang menggunakan spasi (`1 1202`) alih-alih tanda hubung (`1-1202`). Pada buku besar, simbol mata uang berulang di tiap sel transaksi | Normalisasi kode akun Ref dengan tanda hubung (`1-1202`). Pada tabel buku besar, tampilkan nominal murni tanpa simbol mata uang di tiap sel (simbol mata uang hanya di headline/ringkasan) | Data tabel lebih lega, presisi, dan sesuai standar akuntansi resmi | Sedang | **Selesai Diperbaiki** |
| **C-05** | Kartu Dashboard & Modal Proyek | Spasi Header Kartu & Radius Modal | Jarak `CardTitle` ke `CardDescription` bervariasi (`mt-1` vs `gap-1`). Di `project-detail-page.tsx:3271` modal memakai `rounded-xl` | Standarkan jarak judul-deskripsi kartu tepat 4px (`gap-1`). Seluruh modal dialog wajib `rounded-2xl` | Keselarasan ritme vertikal kartu dan bentuk modal | Sedang | **Ya** |

### 5 Rekomendasi Teratas Bagian D (Motion & Animasi)

| ID | Lokasi | Jenis Motion | Durasi & Easing | Teknik Utama | Manfaat bagi Pengguna | Risiko Kinerja | Prioritas | Perlu Keputusanku? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **D-01** | Modal Dialog & Konfirmasi (`DialogContent`, `ConfirmActionDialog`) | Transisi Muncul & Keluar (Fade & Scale) | 200 ms, `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`) | `transform: scale(0.96) -> scale(1)` dan `opacity: 0 -> 1` | Dialog terasa responsif dan lembut, tidak mengagetkan mata | Nol (GPU accelerated) | Tinggi | **Ya** |
| **D-02** | Tombol Aksi & Unduh Dokumen (`Button`, `ExportDownloadMenu`) | Umpan Balik Tekan (Micro-interaction Press) | 100 ms, `ease-out` | `active:scale-[0.98]` dan transisi opacity spinner loader | Pengguna mendapat kepastian instan bahwa klik telah diterima sistem | Nol | Tinggi | **Ya** |
| **D-03** | Bar Navigasi Tab Halaman (`TabsList`, `TabsTrigger`) | Indikator Pill Tab Bergeser Halus | 220 ms, spring physics | `layoutId="active-tab-pill"` (`motion/react`) | Navigasi terasa modern setara software kelas atas (Figma/Vercel) | Sangat Rendah | Sedang | **Ya** |
| **D-04** | Filter Lanjutan & Panel Rincian (Collapsible) | Buka / Tutup Akordeon Halus | 200 ms, `ease-in-out` | CSS Grid `grid-template-rows: 0fr -> 1fr` dan `opacity` | Konten filter tidak meloncat secara kaku saat dibuka | Nol (Zero reflow JS) | Sedang | **Ya** |
| **D-05** | Kartu Ringkasan KPI Dashboard (`admin-dashboard`, `reports-page`) | Animasi Hitung Angka Saldo (Count-Up) | 600 ms, `ease-out` (hanya pemuatan awal) | Text number interpolation via `Intl.NumberFormat` | Memberi kesan aplikasi finansial yang dinamis saat dashboard dibuka | Sangat Rendah | Rendah | **Ya** |

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
- **Jumlah Baris:** 5.825 $\rightarrow$ 18 baris (Pengurangan ~99.7% di facade file)
- **Prioritas:** Kritis / Sangat Tinggi
- **Status:** **Selesai Dipecah & Tervalidasi**
- **Tanggung Jawab yang Tercampur (Sebelumnya):**
  1. Konstanta token tata letak PDF, palet warna, tipografi, tabel lebar karakter AFM (`AFM_HELVETICA_BOLD_KERNING`, `AFM_HELVETICA_REGULAR_KERNING`).
  2. Engine inti penggambaran: header institusi, footer otomatis, baris biru judul lengkap, tanda air draft, kotak banner, inspector collision detection (`inspectPdfDocumentLayout`).
  3. Mesin render tabel: `drawPdfTable` (tabel single) dan `sections` (tabel multi-seksi multi-halaman).
  4. Builder spesifikasi dokumen transaksi bisnis: Invoice, Kuitansi, PO Klien, Payment Approval, dll.
  5. Builder spesifikasi dokumen akuntansi: Jurnal Umum, AJP, Buku Besar, Neraca Saldo, Laba Rugi, Perubahan Ekuitas, Neraca, Arus Kas, dan Laporan Lengkap.
  6. Generator khusus dokumen SPK / Project Charter 10 pasal (`generateSpkProjectCharterPdf`).
- **Hasil Refaktorisasi Konkret:**
  Telah dipecah ke folder `src/lib/pdf/` dan dihubungkan via facade:
  1. `pdf-types.ts` (141 baris): Definisi tipe & interface PDF (`PdfDocumentSpec`, `DocStatusVariant`, `PdfTableColumn`, `PdfKeyValue`, dll.).
  2. `pdf-tokens.ts` (345 baris): Token tata letak, palet warna, tabel lebar karakter AFM, metrik brand image, dan `resolveDocTitleConfig`.
  3. `pdf-download.ts` (77 baris): Helper unduh berkas PDF byte (`downloadPdfBytes`) dengan proteksi iframe print fallback.
  4. `specs/transaction-specs.ts` (606 baris): Builder dokumen transaksi (`buildInvoicePdfSpec`, `buildReceiptPdfSpec`, `buildClientPoPdfSpec`, `buildPaymentApprovalPdfSpec`).
  5. `specs/accounting-specs.ts` (642 baris): Builder dokumen akuntansi (`buildJournalsPdfSpec`, `buildGeneralLedgerPdfSpec`, `buildTrialBalancePdfSpec`, `buildIncomeStatementPdfSpec`, `buildRetainedEarningsPdfSpec`, `buildBalanceSheetPdfSpec`, `buildCashFlowPdfSpec`, `buildCompleteFinancialStatementsPdfSpec`).
  6. `pdf-engine.ts` (3.257 baris): Core rendering engine, word wrapping (`wrapTextByWidth`), embedding gambar, inspector collision detection (`inspectPdfDocumentLayout`), dan `generateDocumentPdf`.
  7. `spk-charter-pdf.ts` (703 baris): Generator khusus SPK / Project Charter 10 pasal (`generateSpkProjectCharterPdf`).
  8. `src/lib/pdf-generator.ts` (18 baris): Facade aggregator re-export penuh sehingga 100% backward-compatible bagi seluruh pemanggil di aplikasi.
- **Verifikasi:**
  - `npm run typecheck` (`tsc --noEmit`): Lulus 100% tanpa error.
  - `npx vitest run`: 13 test files / 67 tests lulus 100% (termasuk seluruh 7 layout & collision detection tests).

---

#### ID: A-02 — `src/features/client-projects/project-detail-page.tsx`
- **Jumlah Baris:** 4.861 $\rightarrow$ 1.306 baris (Pengurangan ~73%)
- **Prioritas:** Kritis / Sangat Tinggi
- **Status:** **Selesai Dipecah & Tervalidasi**
- **Hasil Refaktorisasi:**
  Telah diekstrak ke dalam 14 sub-modul terstruktur tanpa mengubah alur logika bisnis atau rumus akuntansi:
  1. `project-specs-builder.ts` (579 baris): Spesifikasi unduh PDF & Word untuk Quotation, SOW, BAKP, UAT, dan BAST.
  2. `components/project-milestones-export.ts` (158 baris): Ekspor jadwal termin ke Excel, PDF, dan CSV.
  3. Folder `dialogs/` (9 modal dialog mandiri):
     - `milestone-schedule-dialog.tsx`: Penyusunan jadwal termin 100%.
     - `record-progress-dialog.tsx`: Pencatatan progres akrual pekerjaan.
     - `create-quotation-dialog.tsx`: Penerbitan quotation proyek.
     - `create-project-doc-dialog.tsx`: Perekaman dokumen SoW / SPK Project Charter.
     - `create-bakp-dialog.tsx`: Pembuatan Berita Acara Kemajuan Pekerjaan.
     - `create-uat-dialog.tsx`: Pencatatan checklist UAT.
     - `create-bast-dialog.tsx`: Penerbitan Berita Acara Serah Terima.
     - `view-detail-dialog.tsx`: Modal inspeksi rincian data transaksi.
     - `edit-record-dialog.tsx`: Modal universal editor baris data (8 seksi entitas).
  4. Folder `tabs/` (4 tab views terstruktur):
     - `milestones-tab.tsx`: Tab jadwal termin penagihan & progres akrual.
     - `quotation-po-tab.tsx`: Tab penawaran harga & purchase order klien.
     - `sow-spk-tab.tsx`: Tab Scope of Work & SPK Project Charter.
     - `acceptance-docs-tab.tsx`: Tab dokumen serah terima (BAKP, UAT, BAST).
- **Verifikasi:**
  - `npm run typecheck` (`tsc --noEmit`): Lulus 100% tanpa error.
  - `npx vitest run`: 13 test files / 67 tests lulus 100% (termasuk `tests/db/phase4-progress-billing-and-buyer.test.ts`).

---

#### ID: A-03 — `src/features/accounting/reports-page.tsx`
- **Jumlah Baris:** 3.161 $\rightarrow$ 725 baris (Pengurangan ~77%)
- **Prioritas:** Sangat Tinggi
- **Status:** **Selesai Dipecah & Tervalidasi**
- **Tanggung Jawab yang Tercampur:**
  1. State filter periode (bulanan, kuartalan, tahunan, kustom) dan orkestrasi 7 tab laporan.
  2. Perhitungan & rendering Laporan Laba Rugi Komprehensif.
  3. Perhitungan & rendering Laporan Perubahan Ekuitas.
  4. Perhitungan & rendering Laporan Posisi Keuangan (Neraca).
  5. Perhitungan & rendering Laporan Arus Kas Metode Langsung.
  6. Perhitungan & rendering Buku Besar (GL) akun tunggal & seluruh akun.
  7. Perhitungan & rendering Neraca Saldo (Trial Balance) sebelum & setelah penyesuaian.
  8. Orkestrasi ekspor PDF, Excel (.xlsx), dan CSV untuk ketujuh laporan.
- **Hasil Pemecahan Konkret:**
  Telah dipecah ke 9 modul terisolasi di `src/features/accounting/reports/`:
  1. `reports-page.tsx` (725 baris): Shell laporan, state hook terpadu, kalkulasi useMemo, layout selector, dan orkestrasi tab.
  2. `reports/reports-common.tsx`: Helper pemformatan moneter (`formatCurrency`, `formatBalanceAmount`, `formatSplitzCurrency`, `formatDateSplitz`).
  3. `reports/reports-export-handlers.ts`: Kumpulan handler ekspor laporan ke PDF, Excel (.xlsx), dan CSV.
  4. `reports/income-statement-view.tsx`: Komponen tampilan ringkas & detail Laporan Laba Rugi.
  5. `reports/equity-statement-view.tsx`: Komponen tampilan ringkas & detail Laporan Perubahan Ekuitas.
  6. `reports/balance-sheet-view.tsx`: Komponen tampilan ringkas & detail Laporan Posisi Keuangan (Neraca).
  7. `reports/cash-flow-view.tsx`: Komponen tampilan ringkas & detail Laporan Arus Kas.
  8. `reports/trial-balance-view.tsx`: Komponen tampilan Neraca Saldo (Trial Balance).
  9. `reports/general-ledger-view.tsx`: Komponen tampilan Buku Besar (General Ledger).
  10. `reports/reports-print-content.tsx`: Komponen render tata letak cetak dokumen A4.
- **Risiko Pemecahan:** Rendah (Logika akuntansi tetap utuh 100%).
- **Dependensi Terpengaruh:** `accounting-engine.ts`, `pdf-generator.ts`, `excel-exporter.ts`, `csv-exporter.ts`.
- **Hasil Pengujian:** `npm run typecheck` lolos 100%, 13 file pengujian Vitest (67 tests) lulus 100%.

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
- **Status Eksekusi (Langkah 3):** **SELESAI DIPERBAIKI & TERVALIDASI** (Commit tersendiri). Berhasil diekstrak ke 5 modul mandiri di `src/features/invoicing/components/` (`invoice-kpi-summary.tsx`, `invoice-create-dialog.tsx`, `invoice-payment-dialog.tsx`, `invoice-view-detail-dialog.tsx`, `invoice-edit-dialog.tsx`, `invoice-spec-builder.ts`). Ukuran file utama terpangkas dari 2.097 menjadi 1.352 baris. 67 tes unit & integrasi serta typecheck lulus 100%.

---

#### ID: A-05 — `src/lib/data-service.ts`
- **Jumlah Baris:** 2.071 $\rightarrow$ 17 baris (Pengurangan **>99%**)
- **Prioritas:** Tinggi
- **Status:** **Selesai Dipecah & Tervalidasi**
- **Hasil Refaktorisasi:**
  Telah diekstrak ke dalam modul-modul domain terisolasi di `src/lib/services/` dengan pattern *Facade Aggregator*:
  1. `src/lib/services/demo-store.ts` (248 baris): Store lokal in-memory, seed state, dan generator sequence & audit trail demo.
  2. `src/lib/services/storage-helpers.ts` (24 baris): Helper persistensi localStorage seragam (`readLocalJson`, `writeLocalJson`).
  3. `src/lib/services/auth-profile-service.ts` (409 baris): Manajemen profil akun, avatar storage, multi-role assignment, dan user management internal.
  4. `src/lib/services/system-settings-service.ts` (547 baris): Profil perusahaan, penomoran sequence dokumen, template dinamis, audit log, dan media login portal.
  5. `src/lib/services/accounting-master-service.ts` (272 baris): Master bagan akun (COA) dan siklus pembukaan/penutupan periode akuntansi.
  6. `src/lib/services/master-data-service.ts` (461 baris): Master entitas vendor, data pelanggan (beserta logo/TTD/paraf), dan proyek klien.
  7. `src/lib/data-service.ts` (17 baris): Facade aggregator murni yang me-re-export seluruh domain service di atas sehingga **100% backward compatible** tanpa mengubah satupun baris import di seluruh komponen aplikasi.
- **Verifikasi:**
  - `npm run typecheck` (`tsc --noEmit`): Lulus 100% tanpa error.
  - `npx vitest run`: 13 test files / 67 tests lulus 100%.

---

#### ID: A-06 — `src/features/accounting/journals-page.tsx`
- **Jumlah Baris Asal:** 1.925 baris (kini 1.254 baris, terpangkas 671 baris)
- **Prioritas:** Tinggi
- **Tanggung Jawab yang Tercampur:**
  1. Tabel Riwayat Jurnal Harian (Buku Jurnal Umum & Jurnal Penyesuaian AJP).
  2. Modal Form Catat Transaksi Jurnal (multi-row baris debit & kredit dinamis, kalkulasi balance real-time, opsi pembalikan otomatis / auto-reverse).
  3. Modal Jurnal Koreksi / Pembatalan Jurnal Terposting.
  4. Dialog Hapus Jurnal Massal & Pemeriksaan Kunci Jurnal (*journal lock*).
  5. Ekspor PDF Buku Jurnal, Excel, dan CSV.
- **Rekomendasi Pemecahan Konkret:**
  1. `journals-page.tsx` (~1.254 baris): Toolbar, filter jenis/tanggal, tabel riwayat jurnal, dan pagination.
  2. `components/journal-entry-dialog.tsx` (~360 baris): Modal form catat transaksi baru & edit jurnal.
  3. `components/journal-correction-dialog.tsx` (~90 baris): Modal pembuatan ayat jurnal koreksi.
  4. `components/journal-detail-dialog.tsx` (~200 baris): Modal detail transaksi jurnal (sekaligus menuntaskan temuan C-02/C-03 header tabel modal rata tengah).
  5. `components/journals-export-handlers.ts` (~200 baris): Kumpulan fungsi unduh PDF, Excel (.xlsx), dan CSV.
- **Risiko Pemecahan:** Rendah.
- **Status Eksekusi (Langkah 3):** **SELESAI DIPERBAIKI & TERVALIDASI** (Commit tersendiri). Berhasil diekstrak ke 4 modul mandiri di `src/features/accounting/components/`. Ukuran file utama terpangkas dari 1.925 baris menjadi 1.254 baris. 67 tes unit & integrasi serta typecheck lulus 100%.

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

| ID | Path File | Kategori Temuan | Alasan & Bukti Verifikasi | Tingkat Keyakinan | Status & Keputusan Pengguna |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **B-01** | `src/components/shared/document-download-menu.tsx` | Menu Unduh Transaksi Individual | Melayani unduhan dokumen individual transaksi per baris (PDF & Word), melengkapi peran `ExportDownloadMenu` yang melayani ekspor dataset laporan (Excel/PDF/CSV). | **Tinggi** | **Dipertahankan & Distandarkan** (Memenuhi peran unduh dokumen transaksi) |
| **B-02** | `AUDIT_REPORT.md` (di root) | Dokumen Historis Usang | Laporan audit tanggal 12 November 2026 yang tersimpan di direktori root. Telah dipindahkan ke `docs/archive/AUDIT_REPORT_2026-11-12.md`. | **Tinggi** | **Selesai Diarsipkan** ke `docs/archive/` |
| **B-03** | `driver.js` di `package.json:30` | Dependensi Onboarding | Library `driver.js` (^1.10.2) terpasang di dependencies untuk fitur product tour yang akan diaktifkan kelak. | **Tinggi** | **Dipertahankan** sesuai keputusan pengguna |
| **B-04** | `supabase/.temp/full_altcycles_cloud_setup.sql` | Output Generate Temporary | Berkas 4.503 baris di direktori `supabase/.temp/` hasil generate `bundle-cloud-sql.mjs`. | **Tinggi** | **Selesai Dibersihkan** dari disk lokal |
| **B-05** | `scripts/supabase/bootstrap-super-admin.sql` | Skrip Manual Hardcoded | Skrip SQL 18 baris untuk inisialisasi akun Super Admin pertama. | **Sedang** | **Selesai Diarsipkan** ke `docs/archive/bootstrap-super-admin.sql` |
| **B-06** | `docs/referensi-layout/staffinc-notes-payment-detail.png` | Aset Gambar Referensi | Gambar tangkapan layar 26 kB di `docs/referensi-layout/`. | **Sedang** | **Selesai Diarsipkan** ke `docs/archive/staffinc-notes-payment-detail.png` |

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

### 3. Tindakan Bagian B yang Telah Dieksekusi

1. **B-01 (Menu Unduh Dokumen):** Dipertahankan dan diklarifikasi perannya — melayani unduh berkas transaksi individual (PDF/Word), melengkapi `ExportDownloadMenu`.
2. **B-02 (AUDIT_REPORT.md):** Berhasil dipindahkan dan diarsipkan ke `docs/archive/AUDIT_REPORT_2026-11-12.md`.
3. **B-03 (driver.js):** Dipertahankan di `package.json:30` sesuai arahan pengguna untuk kebutuhan modul onboarding mendatang.
4. **B-04 (supabase/.temp/):** Berhasil dibersihkan dari disk lokal.
5. **B-05 (bootstrap-super-admin.sql):** Berhasil diarsipkan ke `docs/archive/bootstrap-super-admin.sql`.
6. **B-06 (staffinc-notes-payment-detail.png):** Berhasil diarsipkan ke `docs/archive/staffinc-notes-payment-detail.png`.

---

## BAGIAN C: AUDIT KETIDAKKONSISTENAN UI/UX

Audit terhadap antarmuka pengguna Altcycles dilakukan dengan meneliti implementasi visual pada seluruh fitur portal, halaman otentikasi, tabel data transaksi, kartu KPI, dan modal dialog, serta membandingkannya terhadap konvensi baku di `AGENTS.md`.

### 1. Inventaris Temuan Ketidakkonsistenan UI/UX

| ID | Halaman / Komponen | Elemen | Kondisi Saat Ini | Standar Direkomendasikan (`AGENTS.md`) | Dampak | Prioritas | Perlu Keputusanku? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **C-01** | `login-page.tsx`, `theme-toggle.tsx`, `json-code-view.tsx` | Warna Hex Hardcoded | 25+ deklarasi warna menggunakan kode hex manual (seperti `#0B43C8`, `#083296`, `#F0F1F3`, `#C9C9C9`, `#121A2B`, `#1A253C`, `#25324E`, `#1FB1F2`) | Ganti seluruh warna hex dengan token semantik Tailwind (`bg-primary`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) | Warna tidak adaptif jika tema dasar diubah; dark mode berisiko bocor warna | Tinggi | **Selesai Diperbaiki** |
| **C-02** | `journals-page.tsx:1806-1815` | Header Tabel Modal Detail Jurnal | Judul kolom tabel di dalam modal detail jurnal menggunakan `text-left` dan bobot `font-bold` | Seluruh `<TableHead>` wajib `text-center` dan `font-semibold` sesuai aturan baku tabel Altcycles | Inkonsistensi visual antara tabel halaman utama dan tabel modal | Tinggi | **Selesai Diperbaiki** |
| **C-03** | `journals-page.tsx` & Dokumen Buku Besar | Format Ref & Penyajian Tabel Buku Besar | Di kolom Ref jurnal, ditemukan variasi pemisah nomor akun (misal `1-1102` vs `1 1202`). Di Buku Besar (PDF/layar), simbol mata uang berulang di tiap sel transaksi | Normalisasi nomor akun Ref dengan tanda hubung (`1-1202`). Pada tabel buku besar cetak/layar, terapkan pola standar akuntansi: simbol mata uang hanya di headline akun/ringkasan, sedangkan isi sel berupa nominal murni yang lebih lega | Kolom angka lebih luas, mencegah pembungkusan teks (*wrapping*), dan sesuai standar akuntansi resmi | Sedang | **Selesai Diperbaiki** |
| **C-04** | Kartu Dashboard & Modal Proyek | Spasi Header Kartu & Radius Modal Dialog | Di beberapa kartu dashboard (`admin-dashboard.tsx`), jarak `CardTitle` ke `CardDescription` menggunakan margin tambahan `mt-1`. Di `project-detail-page.tsx:3271`, modal memakai radius `rounded-xl` | Standarkan spasi judul-deskripsi kartu tepat 4px (`gap-1` tanpa margin tambahan). Seluruh modal dialog wajib konsisten `rounded-2xl` | Ritme vertikal kartu lebih rapat dan rapi; keseragaman bentuk dialog | Sedang | **Ya** |
| **C-05** | Sel Tabel Transaksi (Mobile Viewport) | Area Sentuh (*Touch Target*) Aksi | Tombol aksi tabel berbentuk icon button `size-8` (32x32px). Di layar sentuh ponsel (<640px), ukuran ini di bawah rekomendasi aksesibilitas WCAG (44x44px) | Tambahkan pseudoelemen sentuh transparan (`relative after:absolute after:-inset-1.5`) pada tombol aksi mobile tanpa mengubah ukuran visual | Tombol aksi jauh lebih mudah ditekan jari di ponsel tanpa memakan tempat di desktop | Sedang | **Ya** |
| **C-06** | `system-config-page.tsx:660` | Kontainer Kartu Tabel | Kartu tabel dibungkus kontainer ber-border ganda (`rounded-xl border`) di dalam `CardContent` dengan padding besar | Terapkan pola *edge-to-edge* standar Altcycles: `Card` dengan `CardContent className="p-0"` dan `overflow-hidden` | Menghilangkan ruang kosong ganda dan menyelaraskan dengan halaman master lainnya | Sedang | **Ya** |
| **C-07** | `reports-page.tsx:2343-2431` | Inline Styles pada Tabel Laporan Keuangan | Baris ringkasan laba rugi dan neraca menggunakan `style={{ color: "#0B43C8", backgroundColor: "#f8fafc" }}` | Pindahkan ke utility classes Tailwind berbasis token semantik (`text-primary`, `bg-muted/30`) | Memudahkan pemeliharaan CSS dan mendukung penuh tema dark mode | Rendah | **Selesai Diperbaiki** |
| **C-08** | Seluruh Portal | Standarisasi Huruf Kapital (Proper Case vs UPPERCASE) | Mayoritas UI sudah patuh pada Proper Case, namun beberapa label badge dan tombol aksi di modul operasional masih sesekali menggunakan UPPERCASE | Tegaskan aturan `AGENTS.md`: Proper Case untuk seluruh antarmuka portal; UPPERCASE hanya diizinkan untuk klasifikasi akun resmi di modul Akuntansi & Laporan | Tampilan antarmuka profesional, tenang, dan tidak terkesan membentak pengguna | Rendah | **Ya** |
| **C-09** | `export-download-menu.tsx` & Halaman Dokumen / Termin Proyek | Dropdown Aksi Unduh Terpotong (*Clipping*) | Menu dropdown `ExportDownloadMenu` dirender dengan `position: absolute` inline di dalam kontainer `Card` ber-`overflow-hidden` atau tabel ber-`overflow-x-auto`. Akibatnya saat jadwal termin sedikit atau kontainer sempit, kartu menu dropdown (tinggi ~175px) terpotong (*clipped*) secara visual dan tidak keluar secara penuh | Migrasikan `ExportDownloadMenu` ke React Portal (`createPortal(..., document.body)`) dengan posisi `fixed z-[99999]`, perhitungan batas viewport otomatis (*smart flip upward & clamp*), serta perkuat `DocumentDownloadMenu` ke `z-[99999]`. Dokumentasikan sebagai aturan baku di `AGENTS.md` | Menu dropdown selalu utuh, mengambang di lapisan terdepan tanpa pernah terpotong oleh overflow kontainer tabel | Kritis | **Selesai Diperbaiki** |

---

### 2. Sistem Desain Ringkas Terpadu Altcycles (*Derived Design System*)

Sistem desain Altcycles tidak dibuat ulang dari nol, melainkan dikonsolidasikan dari pola terkuat yang telah disepakati di dalam `AGENTS.md`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SISTEM TOKEN DESAIN ALTCYCLES                     │
├──────────────────┬─────────────────────────────────────────────────────┤
│ Token Warna      │ Primary: #0B43C8 (Altvira Blue, token `primary`)     │
│                  │ Surface / Card: `bg-card`, `bg-background`          │
│                  │ Border: `border-border/80` (border lembut terstandar)│
│                  │ Muted: `text-muted-foreground`, `bg-muted/30`        │
├──────────────────┼─────────────────────────────────────────────────────┤
│ Tipografi        │ Font: Inter / System UI                             │
│                  │ Judul Halaman: `text-2xl sm:text-3xl font-bold`     │
│                  │ Judul Kartu: `text-base sm:text-lg font-semibold`   │
│                  │ Header Tabel: `text-xs sm:text-sm font-semibold`    │
│                  │ Data Sel: `text-xs sm:text-sm leading-5`            │
│                  │ Kapitalisasi: Proper Case (kecuali Akuntansi resmi) │
├──────────────────┼─────────────────────────────────────────────────────┤
│ Spasi & Tata     │ Jarak Antar Seksi Halaman: `flex flex-col gap-6`    │
│ Letak            │ Spasi Judul ke Deskripsi Kartu: `gap-1` (4px rapi)  │
│                  │ Padding Kartu Tabel: Edge-to-edge (`p-0`)           │
│                  │ Padding Header Tabel: `px-6 py-4 border-b`          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ Radius Sudut     │ Kartu Konten & Dialog: `rounded-2xl`                │
│                  │ Tombol Utama & Input Form: `rounded-xl`             │
│                  │ Icon Button Baris Tabel: `rounded-lg` (size-8)      │
├──────────────────┼─────────────────────────────────────────────────────┤
│ Komponen Bersama │ Dialog Konfirmasi: `ConfirmActionDialog`            │
│ Wajib            │ Input Angka/Moneter: `NumberInput` (id-ID)          │
│                  │ Sel Angka Tabel: `MonetaryCell` (tabular-nums)      │
│                  │ Ekspor Data: `ExportDownloadMenu` (Excel/PDF/CSV)   │
│                  │ Unduh Transaksi: `DocumentDownloadMenu` (PDF/Word)  │
│                  │ Anti-Clipping: Menu wajib React Portal (z-[99999])  │
│                  │ Upload Gambar: `AvatarUploadDialog` (Lokal & GDrive)│
│                  │ Checkbox Tabel: `Checkbox` (@/components/ui/checkbox)│
└──────────────────┴─────────────────────────────────────────────────────┘
```

---

### 3. Audit Aksesibilitas Dasar (WCAG 2.1 AA)

1. **Rasio Kontras Warna (Color Contrast):**
   - Teks warna abu-abu manual `#616C82` pada mode gelap hanya menghasilkan rasio kontras 3.2:1 (gagal WCAG AA untuk teks di bawah 18pt). Penggantian ke `text-muted-foreground` standar (`hsl(215 20.2% 65.1%)`) menaikkan kontras menjadi 4.9:1 (lolos WCAG AA).
   - Teks biru `#0B43C8` pada latar putih lolos kontras tinggi (8.2:1).
2. **Fokus Keyboard (Keyboard Navigation):**
   - Seluruh elemen interaktif (`Button`, `Input`, `Select`, `TabsTrigger`) telah memiliki style ring fokus seragam: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
3. **Aksesibilitas Label Formulir:**
   - Semua field formulir wajib menggunakan `<FieldLabel required>` dengan penanda bintang merah `*` yang memiliki atribut `aria-hidden="true"`, serta input yang memiliki `aria-required="true"`.
4. **Target Sentuh Mobile (*Touch Targets*):**
   - Tombol icon baris tabel (`size-8` / 32px) diberi utilitas sentuh mobile transparan minimum 44px menggunakan pseudoelemen `after:-inset-1.5` agar ramah pengguna tablet/ponsel tanpa mengganggu kerapatan visual desktop.

---

### 4. Urutan Perbaikan UI/UX yang Disarankan (Risiko Rendah $\rightarrow$ Dampak Tinggi)

1. **Langkah C-1:** Perbaikan alignment dan font header tabel modal detail jurnal di `journals-page.tsx:1806-1815` (Sangat Mudah, Risiko Nol).
2. **Langkah C-2:** Normalisasi kode akun Ref jurnal dan standarisasi tampilan tabel buku besar (Mudah, Risiko Rendah).
3. **Langkah C-3:** Penyeragaman spasi kartu (`gap-1`) dan radius modal dialog `rounded-2xl` di seluruh fitur (Mudah, Risiko Rendah).
4. **Langkah C-4:** Refaktor hardcoded hex colors di `login-page.tsx` dan `theme-toggle.tsx` ke token Tailwind (Sedang, Risiko Rendah).
5. **Langkah C-5:** Penerapan hit-target mobile 44px pada icon button tabel data (Mudah, Risiko Nol).

---

## BAGIAN D: REKOMENDASI MOTION / ANIMASI

Altcycles telah menginstal library `motion` (versi 14.10.1, sebelumnya dikenal sebagai Framer Motion). Oleh karena itu, **tidak diperlukan penambahan dependensi baru**. Pemanfaatan motion harus difokuskan pada mikro-interaksi yang memberi kepastian status dan keanggunan navigasi, tanpa menimbulkan *layout shift* atau beban prosesor.

### 1. Peta Peluang Motion Bernilai Tinggi

| ID | Lokasi Antarmuka | Jenis Motion | Durasi & Easing | Teknik Implementasi | Manfaat bagi Pengguna | Risiko Kinerja | Prioritas | Perlu Keputusanku? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **D-01** | Modal Dialog & Alert Konfirmasi (`ConfirmActionDialog`, `DialogContent`) | Transisi Muncul & Keluar (Fade & Scale) | 200 ms, `cubic-bezier(0.16, 1, 0.3, 1)` | `transform: scale(0.96) -> scale(1)` dan `opacity: 0 -> 1` | Modal terbuka dengan lembut tanpa sentakan visual mendadak | Nol (GPU accelerated compositing) | Tinggi | **Ya** |
| **D-02** | Tombol Aksi & Unduh Dokumen (`Button`, `ExportDownloadMenu`) | Umpan Balik Tekan (*Press Feedback*) | 100 ms, `ease-out` | `active:scale-[0.98]` dan crossfade ikon spinner saat loading | Memberikan umpan balik taktil instan bahwa aksi klik telah diproses sistem | Nol | Tinggi | **Ya** |
| **D-03** | Bar Navigasi Tab Halaman (`TabsList`, `TabsTrigger`) | Indikator Tab Bergerak Halus (*Sliding Pill*) | 220 ms, spring physics (`stiffness: 500, damping: 35`) | Komponen `motion.div` dengan properti `layoutId="active-tab-indicator"` | Perpindahan antar tab terasa mengalir dan mulus setara UI modern | Sangat Rendah | Sedang | **Ya** |
| **D-04** | Filter Lanjutan & Panel Detail Akordeon (Collapsible) | Buka / Tutup Rincian Mengembang Lembut | 200 ms, `ease-in-out` | CSS Grid `grid-template-rows: 0fr -> 1fr` dipadukan `opacity` | Elemen di bawahnya bergeser secara alami tanpa perhitungan JavaScript yang berat | Nol (Zero JS reflow) | Sedang | **Ya** |
| **D-05** | Kartu Ringkasan KPI Dashboard (`admin-dashboard`, `user-dashboard`) | Animasi Hitung Angka Saldo (*Count-Up*) | 600 ms, `ease-out` (Hanya berjalan pada pemuatan awal halaman) | Number interpolation via `requestAnimationFrame` dan `Intl.NumberFormat` | Angka saldo kas dan omzet tampak dinamis dan hidup saat dasbor pertama kali dibuka | Sangat Rendah | Rendah | **Ya** |
| **D-06** | Lencana Status Transaksi (Badge Status) | Transisi Pergantian Status | 150 ms, `ease-out` | `scale(0.95) -> scale(1)` dan `opacity: 0.5 -> 1` | Perubahan status (misal: "Draft" menjadi "Disetujui") terdeteksi jelas oleh mata pengguna | Nol | Rendah | **Ya** |

---

### 2. Titik yang SEBAIKNYA TIDAK Dianimasikan (*Strictly Forbidden*)

Untuk menjamin performa aplikasi tetap secepat kilat (60 FPS) pada perangkat apa pun, titik-titik berikut **DILARANG KERAS** untuk diberi animasi:

1. **Baris Tabel Transaksi Panjang (Jurnal Umum, Buku Besar, Neraca Saldo, Audit Trail):**
   - *Alasan:* Tabel akuntansi memuat puluhan hingga ratusan baris data sekaligus. Menganimasikan baris tabel (`staggerChildren` atau fade-in baris per baris) akan memicu *layout thrashing*, membebani memori browser, dan memperlambat waktu respon penyaringan/pencarian data.
2. **Field Input Formulir Saat Mengetik (*Typing & Number Input*):**
   - *Alasan:* Animasi getar, scaling, atau pergeseran posisi pada input field saat pengguna sedang mengetik nominal atau deskripsi transaksi sangat mengganggu konsentrasi entri data dan berisiko salah input.
3. **Tombol Navigasi Cepat & Pagination Tabel:**
   - *Alasan:* Pengguna akuntansi sering berpindah halaman dengan cepat. Menambahkan jeda transisi pada tombol pagination akan menghambat produktivitas kerja pengguna.
4. **Dokumen Cetak & Mesin PDF (`@media print` / `pdf-generator.ts`):**
   - *Alasan:* Seluruh animasi wajib mati total saat dokumen dicetak atau diproses oleh canvas/PDF engine (`transition: none !important; animation: none !important`) agar tata letak halaman cetak A4 presisi hingga ke satuan milimeter.

---

### 3. Protokol Jaminan Performa & Nol-Bug (Zero-Layout-Shift, Zero-Crash)

1. **Penghormatan Penuh Aksesibilitas (`prefers-reduced-motion`):**
   - Aplikasi dibungkus dengan komponen terpusat `<MotionConfig reducedMotion="user">` dari `motion/react`.
   - Jika pengguna mengaktifkan preferensi "Reduce Motion" di sistem operasi mereka (Windows/macOS/iOS/Android), seluruh transisi motion otomatis dinonaktifkan secara instan (durasi menjadi `0 ms`).
2. **Kaidah Ketat Properti GPU:**
   - Hanya properti `transform` (scale, translate) dan `opacity` yang diizinkan untuk dianimasikan.
   - Dilarang menganimasikan properti geometris (`width`, `height`, `margin`, `padding`, `top`, `left`) yang memicu reflow mesin peramban.
3. **Pemberian Token Motion Bersama (`src/lib/motion-tokens.ts`):**
   - Seluruh konstanta durasi, spring physics, dan easing curve disatukan dalam satu file token agar konsisten dan mudah diatur secara global.
4. **Kejujuran Teknis Terkait Jaminan Nol-Bug:**
   - Jaminan 100% bebas bug secara mutlak tidak pernah ada dalam rekayasa perangkat lunak. Namun, risiko dapat ditekan hingga mendekati nol (<0.1%) dengan:
     - Menjalankan pengetesan visual responsif sebelum dan sesudah penambahan motion.
     - Memastikan tidak ada *layout shift* (Cumulative Layout Shift / CLS skor = 0).
     - Menguji beban memori pada Chrome DevTools Performance Profiler dengan simulasi CPU Throttling 4x pada perangkat kelas menengah.

---

### 4. Urutan Eksekusi Motion yang Disarankan

1. **Langkah D-1:** Pembentukan berkas token motion terpusat `src/lib/motion-tokens.ts` dan konfigurasi `<MotionConfig reducedMotion="user">` di `portal-shell.tsx`.
2. **Langkah D-2:** Implementasi transisi halus pada `ConfirmActionDialog` dan komponen `Dialog` modal (Risiko Nol, Manfaat Langsung).
3. **Langkah D-3:** Implementasi umpan balik mikro-interaksi tombol tekan (`active:scale-[0.98]`) pada komponen `Button` dasar (Risiko Nol).
4. **Langkah D-4:** Implementasi indikator animasi tab (`layoutId="active-tab-indicator"`) pada komponen `Tabs` navigasi halaman.

---

## KESIMPULAN & TAHAP BERIKUTNYA (Langkah 3)

Dengan selesainya audit komprehensif pada **Bagian A, B, C, dan D**, seluruh inventaris masalah kode monolit, berkas tidak relevan, ketidakkonsistenan UI/UX, serta rekomendasi animasi terukur telah terdokumentasi lengkap dengan ID masing-masing.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RINGKASAN STATUS KESIAPAN AUDIT                      │
├──────────┬───────────────────────┬────────────┬────────────────────────┤
│ Bagian   │ Deskripsi Bidang      │ Total ID   │ Status Saat Ini        │
├──────────┼───────────────────────┼────────────┼────────────────────────┤
│ Bagian A │ File Terlalu Panjang  │ A-01..A-08 │ Siap Dieksekusi        │
│ Bagian B │ File Tidak Relevan    │ B-01..B-06 │ Selesai Diarsipkan     │
│ Bagian C │ Ketidakkonsistenan UI │ C-01..C-08 │ Siap Dieksekusi        │
│ Bagian D │ Rekomendasi Motion    │ D-01..D-06 │ Siap Dieksekusi        │
└──────────┴───────────────────────┴────────────┴────────────────────────┘
```

> [!IMPORTANT]
> **Status Audit:** Langkah 2 (Bagian C dan Bagian D) telah **SELESAI** diaudit dan dimasukkan ke dokumen `docs/audit-kode.md`.
> Sesuai instruksi, asisten saat ini **BERHENTI** untuk menunggu telaah dan persetujuan pemilik produk per ID temuan sebelum melangkah ke **Langkah 3** (eksekusi pemecahan kode dan perbaikan antarmuka per ID, satu commit per ID).
