# Audit Sistem Dual Language & Rencana Migrasi i18n Altcycles

Dokumen ini merupakan hasil audit menyeluruh terhadap arsitektur multi-bahasa (dual language ID/EN) pada proyek **Altcycles** (Sistem Administrasi Keuangan dan Akuntansi / ERP Keuangan internal Altvira).

Audit ini disusun sebagai pemenuhan **Langkah 1** tanpa melakukan perubahan kode aplikasi.

---

## 1. Mekanisme Dual Language yang Ada Sekarang

### 1.1. Arsitektur Saat Ini
- **Implementasi:** Custom React Context tunggal yang terletak di `src/lib/i18n.tsx` (`LanguageProvider`, `useLanguage()`, `t(key, fallback)`).
- **Library Standar:** Proyek saat ini **belum menggunakan** library standar industri seperti `i18next` atau `react-i18next`. Seluruh dependencies pada `package.json` hanya berisi pustaka UI Radix, Lucide, Tailwind, React 19, Vite, dan Supabase.
- **Penyimpanan Status:** Bahasa aktif disimpan di `localStorage` dengan kunci `altcycles_language` (nilai `"id"` atau `"en"`), dan disinkronkan ke atribut `<html lang="...">`.
- **Kamus Data:** Menggunakan satu objek monolitik `DICTIONARY: Record<Language, Record<string, string>>` di dalam `src/lib/i18n.tsx` dengan ~470 baris kunci datar (flat keys).

### 1.2. Kelemahan & Akar Masalah (Mengapa Masih Banyak Teks Campur & Belum Diterjemahkan)
1. **Tidak Ada Modularitas / Namespace:** Semua terjemahan ditumpuk ke dalam satu file tunggal `src/lib/i18n.tsx` tanpa pemisahan modul (`common`, `proyek`, `penagihan`, `akuntansi`, `po`, dll.).
2. **Ketiadaan Fitur Standar i18n:**
   - **Interpolasi Variabel:** Tidak ada mekanisme penempatan variabel dinamis `{{variable}}`, sehingga pengembang terpaksa menggunakan template literal JavaScript manual (`${count} dokumen`).
   - **Pluralisasi Otomatis:** Tidak ada dukungan bentuk jamak (`_one`, `_other`), memicu penulisan percabangan string manual.
   - **Teks Bertanda Format:** Tidak ada tag komponen (`<Trans>` atau rich text formatting), sehingga teks dengan `<strong>` atau tautan sering dibiarkan dalam bahasa Indonesia.
3. **Pola Ternary Manual yang Masif (`isEn ? ... : ...`):**
   - Karena kamus monolitik sulit dirawat, pengembang dan agen sebelumnya menuliskan ternary lokal `isEn ? "English Text" : "Teks Indonesia"` langsung di dalam JSX atau fungsi komponen.
   - Audit mendeteksi **1.276 titik ternary `isEn`** di seluruh kode UI.
4. **Sub-komponen dan Modal Dialog yang Terisolasi:**
   - Banyak sub-komponen (seperti seluruh tab sub-halaman di `src/features/client-projects/tabs/`, dialog pembuatan dokumen, KPI summary di `invoicing`, serta portal pembeli dan profil) **sama sekali tidak mengimpor `useLanguage()`**, sehingga 100% tampil dalam bahasa Indonesia.
5. **Ketiadaan Linter Penjaga (Lint Gate):**
   - Proyek belum memiliki `eslint-plugin-i18next` dengan aturan `no-literal-string`. Akibatnya, setiap penambahan fitur atau komponen baru selalu memasukkan teks literal mentah tanpa terdeteksi oleh CI.

---

## 2. Daftar Pola Hardcode yang Wajib Dihapus

Seluruh pola berikut akan dibersihkan total pada migrasi ke `i18next` dan digantikan dengan satu mekanisme standar `t("namespace:kunci", { ...params })`:

1. **Percabangan Ternary Bahasa di JSX / Kode:**
   - Pola: `const isEn = language === "en";` diikuti `{isEn ? "English" : "Indonesia"}`.
   - Ditemukan di **1.276 tempat** pada 122 berkas komponen UI.
2. **Pola Ternary pada Format Tanggal & Angka Dinamis:**
   - Pola: `${startDisplay}–${endDisplay} ${isEn ? "of" : "dari"} ${totalItems.toLocaleString(isEn ? "en-US" : "id-ID")}`.
   - Digantikan dengan helper Intl terpusat.
3. **Kamus Metadata Status Lokal di Komponen:**
   - Objek peta status lokal seperti `MILESTONE_STATUS_META` di `project-detail-shared.tsx`, status PO di `po-page.tsx`, status pengajuan di `admin-approvals-page.tsx`.
   - Digantikan dengan kunci terjemahan status terpusat (contoh: `t("status.milestone." + status)`).
4. **Pola String Concat Manual untuk Plural / Satuan:**
   - Pola: `{count} ${isEn ? (count === 1 ? "document" : "documents") : "dokumen"}`.
   - Digantikan dengan pluralisasi resmi `i18next`.
5. **Kamus Ganda / Objek Terjemahan Parsial:**
   - Objek kamus inline lokal di file tertentu (misal daftar label breadcrumb, nama bulan lokal di grafik).
   - Digantikan dengan berkas JSON locale resmi per namespace.

---

## 3. Inventaris Teks Belum Diterjemahkan per Halaman & Komponen

Berikut adalah inventaris lengkap hasil penelusuran statis terhadap 122 berkas antarmuka pengguna (`src/features/`, `src/components/`, `src/App.tsx`).

### 3.1. Client Projects & Milestones (`src/features/client-projects/`)
*Total File: 17 | Hardcode isEn: 193 | Estimasi Teks/Klausa ID Belum Bersih: ~464*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/client-projects/project-specs-builder.ts` | 130 | 90 | `? qt.status === "accepted"`, `Status Dokumen` |
| `src/features/client-projects/project-detail-page.tsx` | 22 | 68 | `Pengujian alur masuk dan otorisasi peran pengguna`, `Validasi perhitungan` |
| `src/features/client-projects/tabs/milestones-tab.tsx` | 0 | 66 | `label="Unduh / Ekspor"`, `Jadwal termin tidak dapat disusun ulang...`, `Atur Ulang Termin`, `Susun Termin 100%`, `Kriteria Pencapaian` |
| `src/features/client-projects/components/project-milestones-export.ts` | 41 | 20 | `{ header: isEn ? "Milestone Description" : "Keterangan Termin" }`, `Status Penagihan` |
| `src/features/client-projects/dialogs/edit-record-dialog.tsx` | 0 | 48 | `Edit Termin Penagihan`, `Edit Catatan Progres Penyelesaian`, `Simpan Perubahan` |
| `src/features/client-projects/tabs/acceptance-docs-tab.tsx` | 0 | 42 | `Pilih semua BAKP`, `Berita Acara Kemajuan Pekerjaan / BAKP (Lampiran A.4)`, `Checklist Pengujian UAT (Lampiran A.7)` |
| `src/features/client-projects/tabs/quotation-po-tab.tsx` | 0 | 42 | `Pilih semua quotation`, `Quotation Penawaran Harga (Lampiran A.1)`, `Verifikasi Purchase Order (PO) Masuk dari Klien` |
| `src/features/client-projects/components/project-detail-shared.tsx` | 0 | 23 | `bakp_approved: { label: "BAKP Disetujui" }`, `paid: { label: "Lunas" }`, `planned: { label: "Direncanakan" }` |
| `src/features/client-projects/dialogs/record-progress-dialog.tsx` | 0 | 13 | `<DialogTitle>Catat Persentase Penyelesaian Proyek</DialogTitle>`, `Tanggal Pengakuan`, `Progres Kumulatif` |
| `src/features/client-projects/dialogs/milestone-schedule-dialog.tsx` | 0 | 11 | `Total nilai kontrak proyek:`, `Atur Ulang Jadwal Termin Penagihan`, `Contoh: BAKP Disetujui` |
| `src/features/client-projects/tabs/sow-spk-tab.tsx` | 0 | 11 | `Pilih semua dokumen`, `Statement of Work (SoW) & Surat Perintah Kerja (SPK)`, `Status Tanda Tangan` |
| `src/features/client-projects/dialogs/create-bakp-dialog.tsx` | 0 | 9 | `Tanggal BAKP`, `Pilih termin`, `Nomor BAKP Otomatis`, `Simpan BAKP` |
| `src/features/client-projects/dialogs/create-quotation-dialog.tsx` | 0 | 6 | `Tanggal Quotation`, `Rincian Fitur & Biaya (Rp Bulat)`, `Masa Berlaku` |
| `src/features/client-projects/dialogs/create-uat-dialog.tsx` | 0 | 6 | `Tanggal Pengujian`, `Nama Penguji Klien`, `Hasil Pengujian / Kesimpulan` |
| `src/features/client-projects/dialogs/view-detail-dialog.tsx` | 0 | 4 | `Rincian Data`, `Unduh / Ekspor`, `Tutup` |
| `src/features/client-projects/dialogs/create-bast-dialog.tsx` | 0 | 3 | `Tanggal BAST`, `Pilih UAT`, `Simpan BAST` |
| `src/features/client-projects/dialogs/create-project-doc-dialog.tsx` | 0 | 2 | `Tambah Dokumen Proyek`, `Unggah Berkas` |

---

### 3.2. Invoicing & Penagihan (`src/features/invoicing/`)
*Total File: 7 | Hardcode isEn: 151 | Estimasi Teks/Klausa ID Belum Bersih: ~228*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/invoicing/invoicing-page.tsx` | 105 | 157 | `Gagal memuat data penagihan dan piutang.`, `Invoice penagihan berhasil diterbitkan`, filter status |
| `src/features/invoicing/components/invoice-create-dialog.tsx` | 35 | 35 | `Termin Progres (Wajib BAKP)`, `Terbitkan Invoice Penagihan Klien`, `Akun Kas / Bank Tujuan` |
| `src/features/invoicing/components/invoice-payment-dialog.tsx` | 11 | 12 | `Total Invoiced / Total Tagihan`, `Remaining Balance / Sisa Belum Terbayar` |
| `src/features/invoicing/components/invoice-edit-dialog.tsx` | 0 | 10 | `Edit Kuitansi`, `Tanggal Invoice`, `Nomor Rekening Tujuan` |
| `src/features/invoicing/components/invoice-kpi-summary.tsx` | 0 | 7 | `Total Nilai Invoice Diterbitkan`, `dokumen invoice terbit`, `Total Penerimaan Pembayaran`, `kuitansi pembayaran resmi`, `Saldo Piutang Usaha Belum Tertagih` |
| `src/features/invoicing/components/invoice-view-detail-dialog.tsx` | 0 | 4 | `Rincian Invoice`, `Unduh / Ekspor` |
| `src/features/invoicing/components/invoice-spec-builder.ts` | 0 | 3 | `Penagihan Proyek`, `Kuitansi Resmi Pembayaran` |

---

### 3.3. Purchase Orders / PO (`src/features/purchase-orders/`)
*Total File: 1 | Hardcode isEn: 117 | Estimasi Teks/Klausa ID Belum Bersih: ~112*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/purchase-orders/po-page.tsx` | 117 | 112 | `issued: { label: "Diterbitkan" }`, `getPoStatusMeta`, `Batalkan dokumen`, `PO Cancellation Reason` |

---

### 3.4. Payment Approvals (`src/features/payment-approvals/`)
*Total File: 2 | Hardcode isEn: 112 | Estimasi Teks/Klausa ID Belum Bersih: ~203*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/payment-approvals/admin-approvals-page.tsx` | 87 | 109 | `submitted: { label: "Menunggu Persetujuan" }`, `approved: { label: "Disetujui (Siap Cair)" }`, `paid: { label: "Dibayar Lunas" }` |
| `src/features/payment-approvals/user-payments-page.tsx` | 25 | 94 | `submitted: { label: "Diajukan (Menunggu Admin)" }`, `approved: { label: "Disetujui (Menunggu Transfer)" }`, dialog ajukan dana |

---

### 3.5. Budgeting Proyek (`src/features/budgeting/`)
*Total File: 1 | Hardcode isEn: 53 | Estimasi Teks/Klausa ID Belum Bersih: ~121*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/budgeting/budget-page.tsx` | 53 | 121 | `Gagal memuat daftar proyek anggaran.`, `Set Alokasi Pagu Anggaran`, modal atur pagu, absorption status |

---

### 3.6. Profit Sharing (`src/features/profit-sharing/`)
*Total File: 1 | Hardcode isEn: 17 | Estimasi Teks/Klausa ID Belum Bersih: ~59*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/profit-sharing/profit-sharing-page.tsx` | 17 | 59 | `Kas Ditahan Perusahaan Altvira`, `Finalisasi Pembagian Hasil`, `Distribusi Tim Internal` |

---

### 3.7. Master Data (Vendors, Clients, Products, CoA, Periods) (`src/features/master-data/`)
*Total File: 14 | Hardcode isEn: 237 | Estimasi Teks/Klausa ID Belum Bersih: ~776*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/master-data/admin-dashboard.tsx` | 94 | 160 | `if (j.status !== "posted") continue;`, `buildMonthlySeries`, label grafik donat, AR distribution |
| `src/features/master-data/projects-page.tsx` | 61 | 113 | `Tambah Proyek Baru`, `Edit Data Proyek`, status filter, placeholder pencarian |
| `src/features/master-data/coa-accounts-page.tsx` | 0 | 132 | `Akun dinonaktifkan.`, `Struktur Bagan Akun Standar`, modal tambah akun CoA |
| `src/features/master-data/parties/customer-tab-content.tsx` | 27 | 79 | `Data pelanggan berhasil disimpan.`, `Gagal menyimpan pelanggan.`, modal tambah pelanggan |
| `src/features/master-data/periods-page.tsx` | 0 | 85 | `Kunci jurnal sedang aktif. Buka kunci terlebih dahulu`, `Buka Periode Buku Baru` |
| `src/features/master-data/parties/product-service-tab-content.tsx` | 28 | 38 | `Tambah Layanan / Produk`, `Tarif / Harga Dasar (IDR)`, `Satuan`, `Status Layanan Aktif` |
| `src/features/master-data/parties/vendor-tab-content.tsx` | 27 | 35 | `Daftar Vendor`, modal tambah vendor, bank name, nomor rekening vendor |
| `src/features/master-data/components/period-manual-closing-dialog.tsx` | 0 | 34 | `Jurnal Penutup Manual Akhir Periode`, `Simpan & Posting Jurnal Penutup` |
| `src/features/master-data/components/period-list-table.tsx` | 0 | 28 | `Daftar Periode Bulanan`, `Memuat daftar periode...`, status periode buku |
| `src/features/master-data/components/period-closing-table.tsx` | 0 | 27 | `Jurnal Penutup`, `Catat Jurnal Penutup Manual` |
| `src/features/master-data/parties-master-page.tsx` | 0 | 17 | `Pelanggan berhasil dihapus`, tab navigasi vendor/pelanggan/layanan |
| `src/features/master-data/components/period-reversing-dialog.tsx` | 0 | 15 | `jurnal pembalik awal periode berhasil diterbitkan.`, `Generate Jurnal Pembalik (AJP)` |
| `src/features/master-data/components/period-create-dialog.tsx` | 0 | 7 | `Periode akuntansi baru berhasil dibuka.`, `Bulan & Tahun Periode` |
| `src/features/master-data/components/period-closing-detail-dialog.tsx` | 0 | 6 | `Detail Transaksi Jurnal Penutup`, `Nomor Jurnal`, `Akun Penutup Ikhtisar L/R` |

---

### 3.8. Akuntansi & Laporan Keuangan (`src/features/accounting/`)
*Total File: 17 | Hardcode isEn: 175 | Estimasi Teks/Klausa ID Belum Bersih: ~634*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/accounting/reports/reports-export-handlers.ts` | 131 | 111 | `Buku Besar berhasil diunduh dalam format PDF`, `Neraca Saldo Lajur`, `Laporan Laba Rugi Komprehensif` |
| `src/features/accounting/journals-page.tsx` | 0 | 114 | `Jurnal Umum`, `Jurnal Penyesuaian`, `Urutan: Terbaru`, header tabel debit/kredit |
| `src/features/accounting/accounting-page.tsx` | 23 | 65 | `Riwayat Jurnal Umum`, tab akuntansi, filter rentang tanggal modal |
| `src/features/accounting/reports/reports-print-content.tsx` | 0 | 85 | `BUKU BESAR (GENERAL LEDGER)`, `LAPORAN PERUBAHAN EKUITAS`, layout cetak |
| `src/features/accounting/components/journals-export-handlers.ts` | 21 | 21 | `Akun Debit`, `Akun Kredit`, header export Excel jurnal |
| `src/features/accounting/reports-page.tsx` | 0 | 38 | `Semua Periode`, sub-tab laporan keuangan |
| `src/features/accounting/components/journal-entry-dialog.tsx` | 0 | 35 | `Edit Transaksi Jurnal`, `Buat & Posting Jurnal Penyesuaian (AJP)`, validasi debit = kredit |
| `src/features/accounting/reports/income-statement-view.tsx` | 0 | 33 | `Laporan Laba Rugi`, `Tidak ada pendapatan operasional`, `Total Pendapatan Bersih` |
| `src/features/accounting/reports/balance-sheet-view.tsx` | 0 | 31 | `Neraca (Balance Sheet)`, `Aset Lancar (Kas & Piutang)`, `Liabilitas & Ekuitas` |
| `src/features/accounting/reports/general-ledger-view.tsx` | 0 | 31 | `Unduh / Ekspor`, `Pilih Akun Buku Besar`, `Saldo Awal`, `Mutasi Debit/Kredit` |
| `src/features/accounting/reports/equity-statement-view.tsx` | 0 | 21 | `Mutasi laba ditahan dan modal`, `Saldo Laba Ditahan Awal`, `Laba Bersih Berjalan` |
| `src/features/accounting/components/journal-detail-dialog.tsx` | 0 | 12 | `Detail Transaksi Jurnal`, `Nomor Jurnal`, `Daftar Baris Entri Jurnal` |
| `src/features/accounting/reports/trial-balance-view.tsx` | 0 | 12 | `Unduh / Ekspor`, `Neraca Saldo (Trial Balance)`, `Total Saldo Seimbang` |
| `src/features/accounting/reports/cash-flow-view.tsx` | 0 | 11 | `Laporan Arus Kas`, `Arus Kas dari Aktivitas Operasional`, `Kenaikan/Penurunan Kas Bersih` |
| `src/features/accounting/components/journal-correction-dialog.tsx` | 0 | 9 | `Buat Jurnal Koreksi atas`, `Tanggal Jurnal Koreksi`, `Alasan Koreksi` |
| `src/features/accounting/components/accounting-print-layout.tsx` | 0 | 5 | `Seluruh Akun & Transaksi Terverifikasi`, `Tanggal Terbit:` |

---

### 3.9. System Config & Super Admin (`src/features/system-config/`)
*Total File: 9 | Hardcode isEn: 209 | Estimasi Teks/Klausa ID Belum Bersih: ~452*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/system-config/master-readonly-page.tsx` | 61 | 76 | `Kelola kontrol kunci jurnal serta tinjau struktur bagan akun`, `Taksiran PPh 23` |
| `src/features/system-config/users-management-page.tsx` | 43 | 73 | `Pengelola Sistem & Akun`, `Gagal memuat pengguna`, `Tambah Akun Internal` |
| `src/features/system-config/super-admin-dashboard.tsx` | 47 | 50 | `Revenue / Pendapatan`, `Expense / Beban`, statistik mutasi data |
| `src/features/system-config/login-media-page.tsx` | 0 | 74 | `Gagal memuat daftar media halaman login`, `Unggah Banner Baru`, tab media login |
| `src/features/system-config/system-config-page.tsx` | 0 | 72 | `Identitas dan rekening perusahaan berhasil disimpan`, tab administrasi |
| `src/features/system-config/audit-trail-page.tsx` | 37 | 19 | `Telusuri catatan historis perubahan data`, dialog perbandingan rekaman |
| `src/features/system-config/company-profile-page.tsx` | 0 | 50 | `Profil Perusahaan (Altvira)`, `Identitas & Kop Dokumen Resmi`, `Telp./Fax`, `Website` |
| `src/features/system-config/admin-settings-page.tsx` | 9 | 31 | `Penomoran Dokumen Otomatis`, `Pola Format Penomoran`, `Reset Nomor per Tahun` |
| `src/features/system-config/currency-settings-card.tsx` | 12 | 7 | `Mata Uang Fungsional`, `Pilih Mata Uang Utama:`, `Kurs Valuta Asing ke Rupiah` |

---

### 3.10. Autentikasi, Profil Pengguna, Portal Pembeli, & Dashboard Pengguna
*Total File: 7 | Hardcode isEn: 0 | Estimasi Teks/Klausa ID Belum Bersih: ~252*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/features/buyer-portal/buyer-portal-page.tsx` | 0 | 87 | `Portal Pembeli & Verifikasi PO`, `Nomor PO tidak ditemukan`, form pengajuan PO |
| `src/features/dashboard/user-dashboard.tsx` | 0 | 52 | `Dashboard Anggota Tim`, `Pengajuan Pembayaran Saya`, `Hak Bagi Hasil Saya` |
| `src/features/profile/profile-settings-page.tsx` | 0 | 48 | `Pengaturan Profil`, `Kata sandi akun Anda berhasil diperbarui`, tab keamanan |
| `src/features/auth/login-page.tsx` | 0 | 30 | `Pendaftaran akun baru dinonaktifkan di Supabase`, `Otorisasi Google dibatalkan` |
| `src/features/profile/profile-overview-page.tsx` | 0 | 24 | `Profil Pengguna`, `Nomor belum diatur`, `Belum ada catatan ringkasan pribadi` |
| `src/features/auth/auth-context.tsx` | 0 | 7 | `Pengguna Altvira`, `Akun tidak ditemukan atau telah dinonaktifkan` |
| `src/features/auth/password-reset-pages.tsx` | 0 | 4 | `Atur Ulang Kata Sandi`, `Kirim Tautan Pemulihan` |

---

### 3.11. Komponen Layout & Shared UI (`src/components/`)
*Total File: 46 | Hardcode isEn: 12 | Estimasi Teks/Klausa ID Belum Bersih: ~190*

| File | Hardcode isEn / Ternary | Est. Teks Belum Diterjemahkan | Contoh Teks Hardcode / Belum Bersih |
|---|:---:|:---:|---|
| `src/components/shared/spk-charter-fields.tsx` | 0 | 39 | `Pasal 4–5 (Tim & Biaya)`, `Tanggal Penandatanganan`, `Ruang Lingkup Pekerjaan` |
| `src/components/shared/avatar-upload-dialog.tsx` | 0 | 17 | `Pilih Foto Profil`, `Silakan pilih berkas foto terlebih dahulu` |
| `src/components/shared/dashboard-charts.tsx` | 6 | 13 | `centerLabel = "Total"`, `Jenis Grafik`, `Kolom`, `Batang`, `Garis`, `Area` |
| `src/components/shared/export-download-menu.tsx` | 6 | 4 | `Unduh / Ekspor`, `Download / Export`, `Dokumen PDF`, `Format CSV` |
| `src/components/shared/google-drive-picker-dialog.tsx` | 0 | 10 | `Pilih Foto dari Google Drive`, `Buka My Drive`, `Pilih Berkas` |
| `src/components/layout/nav-structure.ts` | 0 | 15 | Label grup menu navigasi sidebar |
| `src/components/layout/breadcrumb-map.ts` | 0 | 11 | Pemetaan label jalur breadcrumb di header sistem |
| `src/components/layout/portal-shell.tsx` | 0 | 10 | Dialog notifikasi sistem, toast perpindahan peran |
| `src/components/ui/date-picker.tsx` | 0 | 7 | `Buka kalender`, `Pilih Bulan`, `Pilih Tahun` |
| `src/components/layout/shell-sidebar.tsx` | 0 | 6 | Tooltip buka/tutup sidebar, profil ringkas |

---

## 4. Teks yang Sengaja Tidak Diterjemahkan (Pengecualian yang Dilindungi)

Sesuai aturan ketat proyek, kategori teks berikut **dikecualikan dari proses terjemahan** dan wajib dipertahankan apa adanya:

1. **Data Dinamis Pengguna & Transaksi:**
   - Nama proyek klien (contoh: *"Development cost of Enhancement & Optimization Website TIMTravel RMM"*).
   - Nama perusahaan, vendor, klien, dan orang (contoh: *"PT TIMTravel RMM"*, *"visionquest"*, *"Anni Nuraini, M.T."*).
   - Deskripsi transaksi kustom yang dimasukkan pengguna (contoh: *"Penerimaan termin 1 dari PT RMM berupa uang muka development 40%"*).
   - Nomor dokumen resmi yang tersimpan di basis data (contoh: `PRJ/ALT/2026/001`, `INV/ALT/2026/11/002`, `PO-202611-8YQKXM`, `JRN/ALT/2026/11/010`).
2. **Dokumen Fisik PDF Generator (`src/lib/pdf/` dan `src/lib/pdf-generator.ts`):**
   - Aturan proyek menyatakan: *"Jangan mengubah PDF dokumen."*
   - Logika generator PDF, layout kanvas A4, fixture pengujian render dokumen, dan pemetaan judul dokumen PDF (`DOCUMENT_TITLE_MAPPINGS`) **tidak boleh diubah**.
3. **Kode Akun Akuntansi & Referensi Teknis:**
   - Kode CoA (contoh: `1-1101 Kas Kecil`, `1-1102 Kas di Bank`, `2-1402 Pendapatan Diterima di Muka`, `4-1101 Pendapatan Jasa Pengembangan`). Angka kode akun tidak berubah.
   - Nilai Enum basis data (contoh: `submitted`, `approved`, `posted`, `paid`, `rejected`).
4. **Mata Uang & Format Angka Baku:**
   - Format mata uang tetap diawali simbol `Rp` (sesuai arahan: *"Pertahankan format Rp dan format angka yang sekarang"*).

---

## 5. Daftar "Perlu Keputusanku: Ya"

Berikut adalah daftar pertanyaan desain, konvensi format, dan istilah ambigu yang memerlukan konfirmasi/keputusan pengguna sebelum dieksekusi pada Langkah 2 & 3:

### 5.1. Format Pemisah Angka & Desimal (Intl)
- **Kondisi:** Saat ini seluruh sistem menggunakan standar lokal Indonesia (`id-ID`): titik (`.`) untuk pemisah ribuan dan koma (`,`) untuk desimal (contoh: `Rp2.000.600,00`).
- **Pertanyaan:** Apakah saat bahasa sistem diubah ke **English (EN)**, format angka/ribuan tetap mengikuti format Indonesia (`Rp2.000.600,00`) atau ikut beralih ke format internasional Inggris (`Rp2,000,600.00` / `IDR 2,000,600.00`)?
- **Pilihan:**
  - **Opsi A (Rekomendasi):** Tetap menggunakan format lokal Indonesia (`Rp2.000.600`) di kedua bahasa agar seluruh tim dan laporan keuangan Altcycles tetap konsisten tanpa membingungkan nominal moneter.
  - **Opsi B:** Beralih ke format koma untuk ribuan saat mode EN (`Rp2,000,600`).
- **Status:** **`Perlu keputusanku: Ya`**

### 5.2. Format Tampilan Tanggal
- **Kondisi:** Format tanggal saat ini menghasilkan pola Indonesia (contoh: `12/Nov/2026` atau `12 November 2026`).
- **Pertanyaan:** Apakah saat mode EN aktif, tampilan tanggal beralih ke format bahasa Inggris (contoh: `Nov 12, 2026` atau `12 Nov 2026`)?
- **Pilihan:**
  - **Opsi A (Rekomendasi):** Menggunakan helper tanggal berbasis Intl yang otomatis menyajikan nama bulan bahasa Inggris (contoh: `12 Nov 2026` / `Nov 12, 2026`) saat EN aktif.
  - **Opsi B:** Mempertahankan urutan `DD/MMM/YYYY` identik di kedua bahasa.
- **Status:** **`Perlu keputusanku: Ya`**

### 5.3. Glosarium Istilah Akuntansi & Modul Proyek (Penyelarasan Istilah)
Untuk menjamin konsistensi 100% tanpa campur aduk istilah, berikut draf glosarium standar yang dirancang:

| Istilah Bahasa Indonesia | Istilah Bahasa Inggris Resmi (Usulan) | Opsi Alternatif | Status Ambigu |
|---|---|---|:---:|
| **Termin** (Jadwal Termin Penagihan) | **Milestone Payment** | Installment | **`Perlu keputusanku: Ya`** (Rekomendasi: *Milestone Payment*) |
| **Penagihan** (Menu & Modul) | **Invoicing** | Billing | **`Perlu keputusanku: Ya`** (Rekomendasi: *Invoicing* untuk menu, *Billing* untuk nilai tagih) |
| **BAKP** (Berita Acara Kemajuan Pekerjaan) | **Work Progress Certificate (BAKP)** | Progress Handover Report | **`Perlu keputusanku: Ya`** (Rekomendasi: menyertakan singkatan dokumen resmi) |
| **UAT** (Pengujian Penerimaan Pengguna) | **User Acceptance Testing (UAT)** | Acceptance Checklist | Jelas / Standar IT |
| **BAST** (Berita Acara Serah Terima) | **Official Handover Certificate (BAST)** | Final Acceptance Certificate | **`Perlu keputusanku: Ya`** (Rekomendasi: menyertakan singkatan dokumen resmi) |
| **SPK** (Surat Perintah Kerja) | **Work Order (SPK)** | Engagement Letter / Work Agreement | **`Perlu keputusanku: Ya`** (Rekomendasi: *Work Order (SPK)*) |
| **Pagu Anggaran** | **Budget Ceiling** | Budget Allocation | **`Perlu keputusanku: Ya`** (Rekomendasi: *Budget Ceiling*) |
| **Realisasi Belanja** | **Budget Realization** | Actual Expenses | Standar Akuntansi |
| **Bagi Hasil Proyek** | **Project Profit Sharing** | Revenue Sharing | Jelas / Standar Keuangan |
| **Buku Besar** | **General Ledger** | Ledger | Standar IFRS / PSAK |
| **Bagan Akun (CoA)** | **Chart of Accounts (CoA)** | Account Structure | Standar IFRS / PSAK |
| **Neraca Saldo** | **Trial Balance** | Balance Sheet Summary | Standar IFRS / PSAK |
| **Jurnal Penyesuaian (AJP)** | **Adjusting Journal Entries (AJP)** | Adjustments | Standar IFRS / PSAK |
| **Jurnal Pembalik** | **Reversing Entries** | Rollback Entries | Standar IFRS / PSAK |
| **Pendapatan Diterima di Muka** | **Unearned Revenue** | Deferred Revenue | Standar PSAK 72 |
| **Piutang Usaha** | **Accounts Receivable (A/R)** | Client Receivables | Standar IFRS / PSAK |
| **Hutang Usaha / Beban Akrual** | **Accounts Payable (A/P)** | Accrued Expenses | Standar IFRS / PSAK |

---

## 6. Rencana Arsitektur & Tooling untuk Langkah 2

Pada Langkah 2, infrastruktur dual language standar akan dibangun tanpa menyentuh seluruh halaman sekaligus:

1. **Instalasi Paket:**
   - `i18next`: Mesin inti i18n dengan performa tinggi.
   - `react-i18next`: Binding React resmi (`useTranslation`, `<Trans>`).
   - `eslint-plugin-i18next`: Linter untuk mendeteksi string mentah non-terjemahan di JSX.
   - `i18next-parser`: Ekstraktor kunci otomatis dari kode ke file JSON locale.
2. **Struktur Berkas Locale Modular:**
   ```
   src/locales/
   ├── id/
   │   ├── common.json
   │   ├── projects.json
   │   ├── invoicing.json
   │   ├── accounting.json
   │   ├── po.json
   │   ├── approvals.json
   │   ├── budget.json
   │   ├── master.json
   │   └── system.json
   └── en/
       ├── common.json
       ├── projects.json
       ├── invoicing.json
       ├── accounting.json
       ├── po.json
       ├── approvals.json
       ├── budget.json
       ├── master.json
       └── system.json
   ```
3. **Migrasi Halaman Percontohan Pertama:**
   - Menjadikan **Halaman Penagihan (`invoicing-page.tsx`)** dan **Milestone Dokumen Proyek (`project-detail-page.tsx` & sub-tabs)** sebagai model migrasi percontohan pertama sampai 100% bersih tanpa ada teks hardcode maupun teks campur aduk.
4. **Verifikasi Tes:**
   - Memastikan build, typecheck, dan 14 test suites lama tetap 100% lulus.

---

> [!NOTE]
> Audit Langkah 1 telah selesai disusun tanpa melakukan modifikasi kode apapun. Menunggu peninjauan dan arahan pengguna sebelum melanjutkan ke Langkah 2.
