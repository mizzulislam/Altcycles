# Audit & Temuan i18n Halaman Akuntansi, Laporan Keuangan (PDF & UI), dan Katalog Produk/Layanan

Dokumen ini mencatat hasil audit perbandingan dokumen PDF `id` vs `en` (Item 1 & Item 2), inventarisasi Bagan Akun (`COA_NAME_MAP` & `COA_DESCRIPTION_MAP`) beserta Tag Sistem (Item 4), lokalisasi Katalog Produk & Layanan (Item 5), daftar item **"perlu keputusanku: ya"**, serta temuan observasi selama penelusuran.

---

## 1. Tabel Audit Perbandingan PDF Akuntansi & Laporan Keuangan (`id` vs `en`) — ITEM 1 & ITEM 2

| Dokumen | Elemen | Mode `id` (Patokan) | Mode `en` (Sebelum Perbaikan) | Perbaikan yang Diterapkan |
| :--- | :--- | :--- | :--- | :--- |
| **Jurnal Umum (`GENERAL JOURNAL`)** | Pengelompokan Transaksi & Warna Memo Jurnal `(...)` | Baris akun Debit/Kredit dan memo `(...)` tergabung dalam 1 blok transaksi dengan memo berwarna biru (`BRAND_BLUE`) tanpa garis pemisah internal. | `isJournal` di `pdf-engine.ts` hanya memeriksa `docUpper.includes("JURNAL")`, sehingga di mode `en` (`GENERAL JOURNAL`) bernilai `false`; memo menjadi hitam dan setiap baris dipisah garis border sendiri-sendiri. | `isJournal` diperluas mencakup `JURNAL`, `GENERAL JOURNAL`, `ADJUSTING`, dan `CLOSING` sehingga blok transaksi, warna biru memo, ketebalan font, dan border identik 100% antara `id` dan `en`. |
| **Jurnal Penyesuaian (`ADJUSTING & CORRECTION ENTRIES`)** | Pengelompokan Transaksi, Warna Memo, & Keterangan Otomatis | Memo berwarna biru dalam satu blok transaksi; deskripsi otomatis berbahasa Indonesia. | `isJournal` bernilai `false` di mode `en`; nama akun (`Beban Dibayar di Muka - Server`, `Pendapatan Diterima di Muka - Hosting`) dan deskripsi jurnal otomatis (`Pengakuan pendapatan hosting...`, `Pembebanan biaya server tahunan...`) bocor bahasa Indonesia. | `isJournal` diperbaiki; `buildJournalsPdfSpec` dan `exportJournalsToPdf` menerjemahkan nama akun tramite `getLocalizedAccountName` serta deskripsi otomatis tramite `getLocalizedTransactionDescription`. |
| **Buku Besar (`GENERAL LEDGER`)** | Deteksi Baris Transaksi, Badge Saldo Akhir, Empty State, & Keterangan | Baris transaksi normal, badge kanan atas `"Saldo Akhir"`, pesan kosong `"Tidak ada transaksi pada akun ini dalam periode yang dipilih"`. | `isLedgerDoc` hanya memeriksa `"BUKU BESAR"`, badge `"Saldo Akhir"` dan pesan kosong `"Tidak ada transaksi..."` hardcoded Indonesia, serta `simplifyLedgerDescription` mengembalikan pola Indonesia (`"Penerimaan termin..."`, `"Dana masuk"`). | `isLedgerDoc` diperluas ke `/BUKU BESAR\|GENERAL LEDGER/i`; badge dilokalisasi ke `"Ending Balance"`; pesan kosong ke `"No transactions for this account in the selected period"`; `simplifyLedgerDescription` mendukung parameter `lang`. |
| **Neraca Saldo (`TRIAL BALANCE`)** | Lebar Kolom Header & Nama Akun | Header `No. Akun` (`0.11`) dan `Nama Akun` (`0.43`) rapi tanpa tabrakan. | Label bahasa Inggris `Account No.` pada lebar `0.11` bersinggungan tipis (`overlapX: 1.69pt`) dengan `Account Name`, dan beberapa akun tambahan (`1-1402`, `2-1403`, `4-1102`) bocor Indonesia. | Rasio kolom disesuaikan proporsional menjadi `0.14` (`Account No.`) dan `0.40` (`Account Name`) untuk kedua bahasa tanpa mengecilkan font (`collisions: 0`); `COA_NAME_MAP` dilengkapi. |
| **Laporan Laba Rugi (`STATEMENT OF PROFIT OR LOSS`)** | Label Periode & Pos Akun Pendapatan/Beban | Periode `"Semua Periode"` / `"Agustus 2026"`, pos akun berbahasa Indonesia. | `"Semua Periode"` dan nama akun tambahan (`4-1102 — Pendapatan Jasa Pengembangan Website`, `7-1101`, `7-2101`, `7-2201`) bocor Indonesia. | `getLocalizedPeriodName` menerjemahkan `"Semua Periode"` -> `"All Periods"` dan rentang tanggal `s.d.` -> `to`; seluruh baris akun dilokalisasi lewat `localizeReportRowLabel`. |
| **Perubahan Ekuitas (`STATEMENT OF CHANGES IN EQUITY`)** | Komponen Ekuitas & Ekspor CSV | Baris komponen modal & laba ditahan berbahasa Indonesia. | Ekspor CSV belum memiliki cabang khusus untuk tab `ekuitas`; label periode `"Semua Periode"` bocor di PDF `en`. | `buildRetainedEarningsPdfSpec` melokalisasi seluruh baris & periode; `exportReportToCsv` dilengkapi cabang `activeTab === "ekuitas"` terlokalisasi. |
| **Neraca (`STATEMENT OF FINANCIAL POSITION`)** | Label Periode `"Per ..."` & Sub-akun Akrual/Klien | Label `"Per 30 November 2026"`, nama akun & sub-akun berbahasa Indonesia. | `"Per ..."` dan sub-akun berakhiran (`Kas di Bank - Bank Jago`, `Piutang Usaha - TIM Travel RMM`, `Pendapatan Diterima di Muka - Development`) bocor Indonesia. | `getLocalizedPeriodName` mengubah `"Per ..."` -> `"As of ..."`; `getLocalizedAccountName` menerjemahkan prefix akun induk sambil mempertahankan suffix nama bank/proyek/klien. |
| **Arus Kas (`STATEMENT OF CASH FLOWS`)** | Aktivitas Arus Kas & Periode | Label aktivitas kas masuk/keluar dan saldo awal/akhir kas berbahasa Indonesia. | `"Semua Periode"` dan label baris aktivitas operasi pada laporan lengkap bocor Indonesia. | Seluruh baris aktivitas kas masuk/keluar dan saldo kas awal/akhir dilokalisasi penuh di `buildCashFlowPdfSpec` dan `reports-export-handlers.ts`. |
| **Laporan Keuangan Lengkap (`COMPLETE FINANCIAL STATEMENTS`)** | Gabungan 4 Seksi Laporan | 4 seksi laporan lengkap dengan page break konsisten. | Sebagian baris matriks yang dikirim dari UI masih berbahasa Indonesia di mode `en`. | `localizeMatrix` di `buildCompleteFinancialStatementsPdfSpec` melokalisasi setiap baris pada ke-4 seksi laporan sambil menjaga jumlah halaman dan struktur tabel identik. |
| **Katalog Produk & Layanan (`OFFICIAL PRODUCT & SERVICE CATALOG`)** | Baris Produk Bawaan & Satuan | Nama layanan, kategori, deskripsi, dan satuan (`Proyek`, `Paket / Modul`, `Paket`, `Bulan`) berbahasa Indonesia. | Header tabel sudah Inggris, tetapi isi baris `SRV-001` s/d `SRV-005` dan kolom `Unit` (`Proyek`, `Paket / Modul`, `Paket`, `Bulan`) masih bahasa Indonesia. | `getLocalizedCatalogProduct` dan `getLocalizedServiceUnit` diterapkan pada tabel UI, PDF, Excel, dan CSV katalog produk/layanan. |

---

## 2. Tabel Inventarisasi Akun CoA (`COA_NAME_MAP` & `COA_DESCRIPTION_MAP`) — ITEM 4

Seluruh akun standar di `DEMO_ACCOUNTS` maupun akun tambahan/sub-akun operasional kini telah terdaftar lengkap di `COA_NAME_MAP` dan `COA_DESCRIPTION_MAP` (`src/lib/glossary.ts`) dengan dukungan normalisasi kode (`normalizeCoaCodeKey`) serta pelestarian suffix sub-akun (`" - Bank Jago"`, `" - TIM Travel RMM"`, `" - Development"`, `" - Hosting"`, `" - Server"`):

| Kode | Nama Tersimpan (Seed / DB) | Bahasa Terdeteksi | Ada di `COA_NAME_MAP`? | Deskripsi Ada di `COA_DESCRIPTION_MAP`? |
| :--- | :--- | :---: | :---: | :---: |
| `1-0000` | `ASET` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-1101` | `Kas Kecil` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-1102` | `Kas di Bank` (termasuk sub-akun `Kas di Bank - Bank Jago`) | `id` | Ya (`id` & `en` + suffix) | Ya (`id` & `en`) |
| `1-1201` | `Piutang Usaha` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-1202` | `Piutang Belum Ditagih (Unbilled Receivable)` (termasuk `Piutang Usaha - TIM Travel RMM`) | `id` | Ya (`id` & `en` + suffix) | Ya (`id` & `en`) |
| `1-1301` | `Pekerjaan Dalam Proses - Jasa (WIP)` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-1302` | `Penagihan atas Kontrak (Contract Billings)` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-1401` | `Biaya Dibayar di Muka` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-1402` | `Beban Dibayar di Muka - Server` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-2101` | `Peralatan & Perangkat Keras Komputer` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-2102` | `Akumulasi Penyusutan Peralatan Komputer` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-2201` | `Aset Takberwujud - Lisensi & Perangkat Lunak` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `1-2202` | `Akumulasi Amortisasi Aset Takberwujud` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-0000` | `LIABILITAS` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-1101` | `Utang Usaha Vendor` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-1201` | `Pendapatan Diterima di Muka (Unearned Revenue)` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-1301` | `Utang Bagi Hasil Proyek` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-1401` | `Utang Pajak & Beban Masih Harus Dibayar` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-1402` | `Pendapatan Diterima di Muka - Development` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `2-1403` | `Pendapatan Diterima di Muka - Hosting` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `3-0000` | `EKUITAS` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `3-1101` | `Modal Disetor Pemilik` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `3-1201` | `Laba Ditahan` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `3-1301` | `Ikhtisar Laba Rugi` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `3-1401` | `Prive / Dividen Pemilik` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `4-0000` | `PENDAPATAN USAHA` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `4-1101` | `Pendapatan Jasa Pengembangan Software` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `4-1102` | `Pendapatan Jasa Pengembangan Website` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `4-1103` | `Pendapatan Jasa Hosting & Domain` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `4-1201` | `Pendapatan Pemeliharaan & Dukungan Teknis (SLA)` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-0000` | `BEBAN LANGSUNG PROYEK` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-1101` | `Beban Cloud, Hosting, & Domain Proyek` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-1201` | `Beban Lisensi & API Pihak Ketiga Proyek` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-1301` | `Beban Subkontraktor & Tenaga Ahli Proyek` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-1401` | `Beban Bagi Hasil Tim & Manajemen Proyek` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `6-0000` | `BEBAN OPERASIONAL BERSAMA` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-2101` / `6-1101` | `Beban Sewa & Utilitas Kantor Bersama` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-2201` / `6-1201` | `Beban Langganan SaaS & Perangkat Kerja Internal` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-2301` / `6-1301` | `Beban Penyusutan & Amortisasi Operasional` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `5-2401` / `6-1401` | `Beban Administrasi, Bank, & Umum Lainnya` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `7-0000` | `PENDAPATAN & BEBAN LAIN-LAIN` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `7-1101` | `Pendapatan Bunga Bank` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `7-2101` | `Beban Pajak Final atas Bunga` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |
| `7-2201` | `Beban Administrasi Bank` | `id` | Ya (`id` & `en`) | Ya (`id` & `en`) |

### Pemetaan Tag Sistem (`SYSTEM_TAG_MAP` — `getLocalizedSystemTag`)
Tidak ada lagi nilai enum mentah `snake_case` yang ditampilkan di UI tabel CoA maupun di dropdown form akun pada kedua bahasa:
- `cash_bank` -> `id`: **Kas & Bank** | `en`: **Cash & Bank**
- `accounts_receivable` -> `id`: **Piutang Usaha** | `en`: **Accounts Receivable**
- `unbilled_receivable` -> `id`: **Piutang Belum Ditagih** | `en`: **Unbilled Receivable**
- `work_in_progress` -> `id`: **Jasa dalam Proses (WIP)** | `en`: **Work in Progress (WIP)**
- `contract_billings` -> `id`: **Penagihan atas Kontrak** | `en`: **Contract Billings**
- `accounts_payable` -> `id`: **Utang Usaha Vendor** | `en`: **Accounts Payable**
- `unearned_revenue` -> `id`: **Pendapatan Diterima di Muka** | `en`: **Unearned Revenue**
- `profit_sharing_payable` -> `id`: **Utang Bagi Hasil** | `en`: **Profit Sharing Payable**
- `retained_earnings` -> `id`: **Laba Ditahan** | `en`: **Retained Earnings**
- `income_summary` -> `id`: **Ikhtisar Laba Rugi** | `en`: **Income Summary**
- `service_revenue` -> `id`: **Pendapatan Jasa Utama** | `en`: **Primary Service Revenue**
- `profit_sharing_expense` -> `id`: **Beban Bagi Hasil** | `en`: **Profit Sharing Expense**
- `shared_expense` -> `id`: **Beban Operasional Bersama** | `en`: **Shared Operating Expense**

---

## 3. Daftar Item `"perlu keputusanku: ya"` (Data Input Pengguna / Keputusan Kebijakan)

Sesuai aturan bahwa **sistem tidak boleh melakukan terjemahan otomatis saat runtime atas teks bebas yang diketik pengguna**, berikut item yang tidak diterjemahkan paksa dan ditandai sebagai **`perlu keputusanku: ya`** bila pengguna ingin menyediakan kolom bilingual di database:

1. **Nama & Deskripsi Akun CoA Kustom Baru di Luar Bagan Standar (`perlu keputusanku: ya`):**
   - Seluruh 44 akun standar & akun operasional yang ada saat ini sudah dipetakan di `COA_NAME_MAP` & `COA_DESCRIPTION_MAP` ditambah fallback pola terstruktur. Namun bila ke depan bendahara menambahkan akun baru dengan kode dan kalimat bebas yang tidak mengikuti pola standar, teks tersebut ditampilkan sesuai input pengguna kecuali ditambahkan kolom `name_en` / `description_en` pada tabel `accounts`.
2. **Keterangan Jurnal Manual Bebas yang Diketik Pengguna (`perlu keputusanku: ya`):**
   - Seluruh keterangan jurnal otomatis/semi-otomatis sistem (`Penerimaan termin...`, `Pengakuan pendapatan hosting...`, `Pembebanan biaya server tahunan...`, `Dana masuk...`, `Penagihan Invoice...`, `Jurnal Penutup...`, `Jurnal Pembalik...`, `Jurnal Koreksi...`) sudah diterjemahkan lewat pola deterministik di `getLocalizedTransactionDescription`. Namun untuk memo jurnal manual yang diketik bebas oleh pengguna di luar pola tersebut, teks ditampilkan apa adanya sesuai rekaman audit.
3. **Item Katalog Produk/Layanan Baru atau yang Diubah Manual oleh Pengguna (`perlu keputusanku: ya`):**
   - Kelima layanan bawaan (`SRV-001` s/d `SRV-005`) dan seluruh satuan standar (`Proyek` -> `Project`, `Paket / Modul` -> `Package / Module`, `Paket` -> `Package`, `Bulan` -> `Month`, `Tahun` -> `Year`, `Jam` -> `Hour`, `Hari` -> `Day`, `Lisensi` -> `License`, `Unit` -> `Unit`) sudah diterjemahkan otomatis lewat `CATALOG_DEFAULT_ITEMS_MAP` dan `SERVICE_UNIT_MAP`. Apabila pengguna mengubah nama/deskripsi produk atau menambah `SRV-006` dengan teks bebas bahasa Indonesia, nama & deskripsi kustom tersebut tidak ditimpa otomatis agar tidak merusak data input pengguna.
