# Standar Dokumen Cetak PDF & Lampiran Keuangan Altcycles (`docs/standards/document-pdf-specs.md`)

Dokumen ini mendokumentasikan spesifikasi tata letak, geometri, penomoran, dan aturan bebas tabrakan kotak batas (*zero-collision guarantee*) untuk seluruh generator dokumen resmi di mesin PDF Altcycles (`src/lib/pdf/pdf-engine.ts`).

---

## 1. Geometri & Dimensi Kertas
- **Format Kertas:** Standar internasional **ISO A4**.
  - **Portrait:** `595.28 pt x 841.89 pt` (210 mm x 297 mm).
  - **Landscape:** `841.89 pt x 595.28 pt` (297 mm x 210 mm).
- **Margin Standar:**
  - Margin Kiri/Kanan: 36.0 pt (0.5 inci).
  - Margin Atas/Bawah: 36.0 pt (0.5 inci).
  - Lebar Konten Aktif Portrait: `523.28 pt`.
  - Lebar Konten Aktif Landscape: `769.89 pt`.

---

## 2. Tipografi & Tata Letak Header Tabel PDF
1. **Ukuran Font Header Tabel Terstandar:** Wajib menggunakan font seragam **9.5 pt** (dengan leading 12 pt) di seluruh kolom header dokumen daftar dan laporan keuangan.
2. **Tanpa Shrink-to-Fit Parsial:** Dilarang mengecilkan ukuran font header per kolom secara acak (misal 7pt pada kolom tertentu sementara kolom lain 9.5pt). Lebar kolom yang dialokasikan wajib menampung teks header pada 9.5 pt tanpa tabrakan.
3. **Penyelarasan Sel:**
   - Kolom No / Urut / Tanggal: Rata tengah (`center`).
   - Kolom Uraian / Deskripsi / Akun: Rata kiri (`left`).
   - Kolom Nominal Moneter / Persentase: Rata kanan (`right`).

---

## 3. Matriks 11 Dokumen Transaksi & 9 Laporan Keuangan

### A. Dokumen Transaksi Proyek & Pengadaan
1. **Sales Invoice (Tagihan Klien):** Termin progres, PPN 11%, instruksi transfer bank, dan QR/tanda tangan digital.
2. **Official Receipt (Kuitansi Resmi):** Bukti penerimaan dana klien dan pengesahan pelunasan tagihan.
3. **Quotation / Penawaran Biaya:** Estimasi biaya pekerjaan klien.
4. **Statement of Work (SOW):** Ruang lingkup teknis dan deliverables.
5. **PO Klien:** Pesanan resmi dari pelanggan.
6. **PO Vendor:** Pesanan pengadaan barang/jasa ke rekanan.
7. **BAKP (Berita Acara Kemajuan Pekerjaan):** Pengesahan progres termin sebelum penerbitan invoice.
8. **UAT (User Acceptance Testing):** Berita acara pengujian sistem oleh klien.
9. **BAST (Berita Acara Serah Terima):** Pengesahan akhir penyelesaian proyek untuk pelunasan tagihan.
10. **Payment Approval:** Pengesahan pencairan dana internal.
11. **Jadwal Termin:** Rincian jadwal pembayaran bertahap proyek.

### B. 9 Laporan Keuangan Akuntansi
1. **Laporan Neraca Saldo (Trial Balance):** Verifikasi keseimbangan debit/kredit sebelum penutupan.
2. **Laporan Laba Rugi (Income Statement):** Pendapatan usaha, beban pokok, beban operasional, dan laba bersih.
3. **Laporan Neraca Keuangan (Balance Sheet):** Aset lancar, aset tetap, liabilitas, dan ekuitas modal.
4. **Laporan Arus Kas (Cash Flow Statement):** Arus kas operasi, investasi, dan pendanaan.
5. **Laporan Jurnal Umum (General Journal):** Rekapitulasi kronologis seluruh transaksi buku.
6. **Laporan Buku Besar (General Ledger):** Mutasi dan saldo akhir per akun COA.
7. **Laporan Umur Piutang Usaha (AR Aging Schedule):** Distribusi piutang jatuh tempo.
8. **Laporan Penyusutan Aset Tetap:** Nilai perolehan, masa manfaat, akumulasi beban penyusutan, dan nilai buku.
9. **Laporan Rekapitulasi Proyek & Profit Sharing:** Rekapitulasi margin laba kotor dan pembagian hasil proyek.

---

## 4. Jaminan Bebas Tabrakan & Pengujian Regresi Otomatis
Mesin PDF di Altcycles dilengkapi dengan proteksi otomatis pada unit test:
- `tests/unit/document-table-collision.test.ts`: Memeriksa bahwa kotak batas (*bounding box*) setiap sel teks tidak saling bertabrakan atau menembus margin luar tabel pada data ekstrem (nominal triliunan, teks multibaris panjang, dan label ID/EN).
- `tests/unit/document-title-mapping.test.ts`: Menjamin judul dokumen terdaftar dalam pemetaan resmi dan tidak meluap dari header dokumen.
