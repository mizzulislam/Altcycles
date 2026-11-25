# Standar Internasionalisasi (i18n) Altcycles (`docs/standards/i18n-standards.md`)

Dokumen ini adalah sumber kebenaran resmi (*single source of truth*) untuk seluruh konvensi penerjemahan, tata bahasa, dan pencegahan teks literal tanpa terjemahan di seluruh sistem ERP Keuangan Altcycles.

---

## 1. Prinsip Utama i18n
1. **Dua Bahasa Resmi:** Seluruh UI wajib mendukung **Bahasa Indonesia (`id`)** sebagai bahasa default dan **English (`en`)** sebagai bahasa pendukung.
2. **Tanpa Hardcoded/Literal Strings:** Seluruh label, judul, subjudul, placeholder, deskripsi, pesan validasi, dan feedback toast wajib dipanggil melalui `t('namespace:key')` atau hook `useLanguage()`.
3. **Penyelarasan Key Paripurna:** Setiap key yang dideklarasikan di `src/locales/id/` wajib ada di `src/locales/en/` dan lolos proteksi CI `tests/unit/i18n-check.test.ts`.
4. **Pencegahan Kebocoran Kata (Parity Rule):** Pada mode bahasa Inggris, dilarang menampilkan istilah Bahasa Indonesia (misal: "Lunas", "Jurnal", "Kuitansi") pada UI maupun dokumen PDF yang digenerate.

---

## 2. Struktur Namespace Lokalisasi
- `common.json`: Aksi umum (`save`, `cancel`, `edit`, `delete`, `order`, `download`, `export`), navigasi, status global, label umum.
- `accounting.json`: Bagan akun (COA), jurnal umum, neraca lajur, laba rugi, penutupan periode akuntansi, dan buku besar.
- `invoicing.json`: Invoice klien, kuitansi bukti pembayaran resmi, AR aging schedule, dan termin proyek.
- `po.json`: Purchase Order internal dan vendor, approval, kalkulasi biaya.
- `projects.json`: Manajemen proyek klien, milestone, dokumen SOW, BAKP, UAT, dan BAST.
- `parties.json`: Master data pelanggan, vendor, rekanan bisnis.
- `profile.json`: Pengaturan akun pengguna, keamanan, simulasi PTKP, data rekening bank pencairan.
- `company.json`: Profil perusahaan PT Altvira, data PKP, akun sosial media, kunci buku.
- `dashboard.json`: Kartu KPI, ringkasan kas & piutang, grafik keuangan.

---

## 3. Kamus Istilah Baku (ID vs EN)

| Istilah Bahasa Indonesia | Official English Term | Konteks Penggunaan |
| :--- | :--- | :--- |
| **Bagan Akun (COA)** | Chart of Accounts | Setup akuntansi |
| **Jurnal Umum** | General Journal | Pencatatan transaksi buku |
| **Buku Besar** | General Ledger | Rekapitulasi per akun |
| **Neraca Saldo** | Trial Balance | Verifikasi debit/kredit |
| **Laba Rugi** | Income Statement / P&L | Laporan profitabilitas |
| **Neraca Keuangan** | Balance Sheet | Laporan posisi keuangan |
| **Arus Kas** | Cash Flow Statement | Laporan kas masuk/keluar |
| **Invoice Penagihan** | Sales Invoice | Tagihan ke klien |
| **Kuitansi Pembayaran** | Official Receipt | Bukti penerimaan dana |
| **Umur Piutang** | Accounts Receivable (AR) Aging | Distribusi jatuh tempo |
| **Pesanan Pembelian** | Purchase Order (PO) | Komitmen pengadaan |
| **Berita Acara** | Formal Minutes / Record (BAKP/BAST) | Dokumen pengesahan termin |
| **Pajak Pertambahan Nilai** | Value Added Tax (VAT / PPN) | Perpajakan faktur |
| **Lunas** | Paid | Status pembayaran penuh |
| **Sebagian Terbayar** | Partially Paid | Pembayaran bertahap |
| **Belum Lunas** | Unpaid / Outstanding | Belum ada pembayaran |

---

## 4. Mekanisme Proteksi Otomatis (CI Gate)
File pengujian `tests/unit/i18n-check.test.ts` memindai seluruh kode di `src/` menggunakan Regex & AST parser. Build akan **gagal otomatis** apabila:
1. Ada pemanggilan `t('namespace:key')` yang kuncinya belum terdaftar di salah satu file bahasa.
2. Ditemukan kebocoran kata Bahasa Indonesia pada mode dokumen bahasa Inggris.
3. Fallback translation mengembalikan stripped snake_case alih-alih nilai default yang aman.
