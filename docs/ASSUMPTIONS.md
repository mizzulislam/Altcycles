# Asumsi, Nilai Default, dan Rekonsiliasi Spesifikasi Altcycles

Dokumen ini mencatat seluruh nilai default PRD, keputusan teknis minor, serta rekonsiliasi antara instruksi prompt pengembangan dan **PRD Altcycles Draf 1.2 (06 November 2026)** sebagai sumber kebenaran utama.

---

## 1. Rekonsiliasi Pertentangan Prompt vs PRD

### 1.1 Koreksi Jurnal Terposting & Jurnal Pembalik (`BR-2`, `FR-AK6`, `FR-AK12` vs Prompt)
- **Teks PRD:**
  - `FR-AK6` & `BR-2`: *"Jurnal yang sudah diposting tidak dapat diedit atau dihapus; koreksi dilakukan dengan jurnal pembalik dan jurnal baru."*
  - `FR-AK12`: *"Jurnal pembalik otomatis di awal periode untuk proyek dua termin yang melewati akhir tahun; tidak dibuat untuk proyek satu termin atau tiga termin atau lebih."*
- **Teks Prompt:**
  - *"Jurnal yang sudah diposting tidak dapat diubah atau dihapus. Koreksi kesalahan dilakukan dengan jurnal penyesuaian (jurnal koreksi), bukan jurnal pembalik."*
  - *"Jurnal pembalik bersifat opsional dan hanya untuk penyesuaian accrual (accrued revenue dan accrued expense)... Sediakan sebagai opsi yang dapat diaktifkan Admin, bukan kewajiban otomatis."*
- **Keputusan Implementasi (Selaras Kedua Dokumen):**
  1. **Immutability penuh di PostgreSQL:** Trigger database menolak segala aksi `UPDATE` isi ayat maupun `DELETE` atas jurnal berstatus `posted`.
  2. **Koreksi kesalahan catat:** Sistem menyediakan tipe jurnal **`correction` (Jurnal Koreksi/Penyesuaian)** yang menautkan `reference_journal_id` ke jurnal yang dikoreksi, dilengkapi tombol bantu untuk membalik efek salah catat atau mengisi selisih koreksi sehingga memenuhi kontrol internal `BR-2` sekaligus ketepatan istilah akuntansi SAK.
  3. **Jurnal pembalik awal periode (`reversing`):** Disediakan flag `auto_reverse_next_period` yang **aktif secara default (`true`) khusus pada penyesuaian akrual akhir tahun proyek 2 termin lintas tahun** (sehingga memenuhi `FR-AK12`), namun **dapat dinonaktifkan/dikendalikan Admin** pada formulir penyesuaian/tutup periode, serta **dikunci `false`** untuk proyek 1 termin dan proyek ≥ 3 termin (*progress billing*).

### 1.2 Titik Jurnal Otomatis PO Pembelian Internal (`FR-AK1`, `UC-38` vs Basis Akrual `BR-12`)
- **Konteks:** `FR-AK1` menyebut jurnal dibuat otomatis dari PO, pembayaran, dan faktur, sedangkan `BR-12` menetapkan basis akrual (*beban diakui saat terjadi*).
- **Keputusan Implementasi:** Dalam standar akuntansi keuangan (SAK), penerbitan Purchase Order ke vendor adalah **komitmen pesanan** (belum timbul kewajiban/beban akuntansi). Oleh sebab itu:
  - Penerbitan PO Pembelian (`issued`) memicu pemeriksaan komitmen anggaran (`FR-PO6`) tanpa memposting jurnal buku besar.
  - Saat Payment Approval **Disetujui (`approved`)**, sistem otomatis memposting jurnal beban akrual: `D Akun Beban — K Utang Usaha / Beban YMH Dibayar`.
  - Saat Payment Approval **Dicatat Dibayar (`paid`)**, sistem otomatis memposting jurnal pelunasan: `D Utang Usaha / Beban YMH Dibayar — K Kas/Bank`.

---

## 2. Kerangka Akuntansi yang Ditandai untuk Tinjauan Akuntan

Sesuai PRD Bagian 7.1 dan Bagian 15, rincian skenario 1 termin, 2 termin, serta penyajian selisih *progress billing* di Neraca dicatat sebagai berikut untuk ditinjau akuntan/bendahara Altvira:

### 2.1 Proyek Satu Termin (Deferral — `[PERLU TINJAUAN AKUNTAN]`)
1. **Saat Invoice DP/Penuh diterbitkan:** `D Piutang Usaha — K Pendapatan Diterima di Muka` (atau langsung `D Kas/Bank` bila tunai bersamaan).
2. **Saat dana masuk & Kuitansi terbit:** `D Kas/Bank — K Piutang Usaha`.
3. **Penyesuaian akhir periode / penyelesaian proyek:** `D Pendapatan Diterima di Muka — K Pendapatan Jasa` sebesar persentase penyelesaian periode berjalan hingga 100% saat BAST.
4. **Jurnal pembalik:** Tidak ada (`auto_reverse_next_period = false`).

### 2.2 Proyek Dua Termin Lintas Tahun (Accrual — `[PERLU TINJAUAN AKUNTAN]`)
1. **Saat Termin 1 (DP) ditagih/dibayar:** Dicatat ke `Pendapatan Diterima di Muka` (`2-1400`).
2. **Penyesuaian 31 Desember (jika progres riil melampaui nilai DP):**
   - Mengamortisasi saldo `Pendapatan Diterima di Muka` ke `Pendapatan Jasa`.
   - Selisih lebih progres di atas DP diakui sebagai piutang akrual: `D Piutang Belum Ditagih (1-1210) — K Pendapatan Jasa (4-1100)`.
3. **Awal periode berikutnya (1 Januari — opsional disarankan, default aktif):**
   - Membalik porsi akrual piutang belum ditagih: `D Pendapatan Jasa (4-1100) — K Piutang Belum Ditagih (1-1210)` agar saat Invoice Termin 2 (Pelunasan) diterbitkan dapat langsung dijurnal penuh `D Piutang Usaha — K Pendapatan Jasa` tanpa hitung ulang selisih.

### 2.3 Penyajian Neraca untuk Akun Progress Billing (`[PERLU TINJAUAN AKUNTAN]`)
- Pada Buku Besar dan Neraca Saldo, saldo `1-1300 Jasa dalam Proses` (debit) dan `1-1310 Penagihan atas Kontrak` (kontra-aset, kredit) ditampilkan terpisah apa adanya.
- Pada laporan **Neraca**, selisih bersih dihitung **per proyek aktif**:
  - Jika `Jasa dalam Proses > Penagihan atas Kontrak`: selisih disajikan di Aset Lancar sebagai **Aset Kontrak (Tagihan Bruto kepada Pemberi Kerja)**.
  - Jika `Penagihan atas Kontrak > Jasa dalam Proses`: selisih disajikan di Liabilitas Jangka Pendek sebagai **Liabilitas Kontrak (Kewajiban Kontrak kepada Pemberi Kerja)**.

---

## 3. Nilai Default Sistem & Konvensi Operasional

| Parameter | Nilai Default | Dasar / Catatan |
| --- | --- | --- |
| Status PKP & Pajak | `pkp_enabled = false`, PPN Rp0 | PRD Bagian 3, `FR-M4`, `BR-22` (Altvira belum PKP; dapat diaktifkan Super Admin kelak) |
| Mata uang & pembulatan | IDR (`BIGINT`), tanpa desimal sen, `ROUND()` | PRD `BR-11` |
| Format tanggal antarmuka | `dd/mm/yyyy` (contoh `07/11/2026`) | PRD Bagian 8 |
| Prefix dokumen proyek klien | `QT`, `SOW`, `SPK`, `BAKP`, `INV`, `KW`, `UAT`, `BAST` + `/ALT/{{tahun}}/{{bulan}}/{{urut}}` | PRD Lampiran A.0 |
| Format nomor PO Klien | `PO-{{tahun}}{{bulan}}-{{6 karakter acak A-HJ-NP-Z2-9}}` | PRD Lampiran A.0 & `BR-18` (tanpa huruf ambigu `I`, `O`, `0`, `1`) |
| Prefix dokumen internal | `POP/ALT/{{tahun}}/{{bulan}}/{{urut}}` (PO Vendor), `PA/ALT/...` (Payment Approval), `JRN/ALT/...` (Jurnal), `PRJ/ALT/{{tahun}}/{{urut}}` (Proyek) | Melengkapi `BR-6` dengan pola seragam Lampiran A.0 |
| Default placeholder Lampiran A | Masa berlaku Quotation `14 hari`, Jatuh tempo Invoice `7 hari`, Batas revisi `2 kali per tahap`, Umpan balik klien `5 hari kerja`, Garansi `30 hari`, Denda keterlambatan `0,1% per hari, maks 5%` | PRD Lampiran A.1–A.8; dapat diubah Super Admin |
| Timeout sesi tidak aktif | `30 menit` | PRD `FR-A4` |
| Batas unggah lampiran | Maks `5 MB` per berkas (`PDF`, `PNG`, `JPG`, `JPEG`, `XLSX`, `DOCX`) | PRD `FR-LA4` & penghematan kuota 1 GB Supabase Storage Free Tier |
| Ambang peringatan anggaran | Default `80%` penyerapan per anggaran proyek | PRD `FR-BU4` (dapat diatur Admin per anggaran) |

