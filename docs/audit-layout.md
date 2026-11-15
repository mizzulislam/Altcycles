# Audit Layout Dokumen PDF Altcycles (Tahap 0)

Tanggal Audit: 15 November 2026  
Cakupan: Seluruh dokumen PDF yang dihasilkan Altcycles (Quotation, SoW, SPK, PO Klien, PO Internal, Invoice, Kuitansi, BAKP, UAT, BAST, Payment Approval, dan Rekap Tabel).

---

## 1. Mesin Render PDF & Peta Lokasi File

### 1.1 Mesin Render yang Dipakai
- **Library Utama:** **`pdf-lib`** (`PDFDocument`, `StandardFonts.Helvetica` & `StandardFonts.HelveticaBold`), menggambar teks, garis, persegi panjang, dan gambar secara imperatif per koordinat `(x, y)` dengan titik asal `(0, 0)` di **kiri-bawah** halaman A4 (`595.28 × 841.89 pt`).
- **Pusat Mesin Render:** `src/lib/pdf-generator.ts`
  1. `generateDocumentPdf(spec: PdfDocumentSpec)` (`baris 294–1164`): Mesin render utama yang dipakai bersama oleh **11 jenis dokumen** (Invoice, Kuitansi, Quotation, SoW, PO Klien, PO Internal, BAKP, UAT, BAST, Payment Approval, dan Rekap Tabel).
  2. `generateSpkProjectCharterPdf(params)` (`baris 1171–1807`): Mesin render khusus dokumen kontrak SPK (10 Pasal + tabel jadwal/tim/biaya).
- **Generator Pendamping Word (`.docx`):** `src/lib/word-generator.ts` menerima objek `PdfDocumentSpec` yang sama.
- **Cetak Laporan Akuntansi:** Halaman `src/features/accounting/reports-page.tsx` dan `journals-page.tsx` menggunakan cetak HTML/CSS (`window.print()`).

### 1.2 Peta Lokasi Pembuat Spesifikasi (`PdfDocumentSpec`) per Dokumen

| No | Jenis Dokumen | Fungsi Pembuat Spec | Lokasi File & Baris | Pemanggil Unduh PDF |
| :- | :--- | :--- | :--- | :--- |
| 1 | **Invoice (Termin & Pelunasan)** | `buildInvoicePdfSpec` / `makeInvoiceSpec` | `src/lib/pdf-generator.ts:1829–2079`<br>`src/features/invoicing/invoicing-page.tsx:392–460` | `invoicing-page.tsx:462` |
| 2 | **Kuitansi Pembayaran** | `buildReceiptPdfSpec` / `makeReceiptSpec` | `src/lib/pdf-generator.ts:2084–2150`<br>`src/features/invoicing/invoicing-page.tsx:478–502` | `invoicing-page.tsx:504` |
| 3 | **Quotation (Penawaran)** | `makeQuotationSpec` | `src/features/client-projects/project-detail-page.tsx:593–669` | `project-detail-page.tsx:671` |
| 4 | **SoW (Statement of Work)** | `makeSowDocSpec` | `src/features/client-projects/project-detail-page.tsx:687–742` | `project-detail-page.tsx:744` |
| 5 | **SPK (Project Charter)** | `extractSpkCharterContent` + `generateSpkProjectCharterPdf` | `src/lib/spk-defaults.ts:1–310`<br>`src/lib/pdf-generator.ts:1171–1807` | `project-detail-page.tsx:746` |
| 6 | **PO Klien (Portal Pembeli)** | `buildClientPoPdfSpec` | `src/lib/pdf-generator.ts:2155–2229` | `buyer-portal-page.tsx:250`<br>`project-detail-page.tsx:2294` |
| 7 | **PO Internal (Vendor)** | `makePoDocSpec` | `src/features/purchase-orders/po-page.tsx:236–310` | `po-page.tsx:314` |
| 8 | **BAKP (Kemajuan Kerja)** | `makeBakpSpec` | `src/features/client-projects/project-detail-page.tsx:790–857` | `project-detail-page.tsx:859` |
| 9 | **UAT (Checklist Uji)** | `makeUatSpec` | `src/features/client-projects/project-detail-page.tsx:873–955` | `project-detail-page.tsx:957` |
| 10 | **BAST (Serah Terima)** | `makeBastSpec` | `src/features/client-projects/project-detail-page.tsx:971–1043` | `project-detail-page.tsx:1045` |
| 11 | **Payment Approval (PA)** | `buildPaymentApprovalPdfSpec` | `src/lib/pdf-generator.ts:2235–2343` | `admin-approvals-page.tsx:343`<br>`user-payments-page.tsx:347` |

---

## 2. Diagnosis Akar Masalah Gejala (a) sampai (h)

| Gejala | Lokasi Kode Penyebab | Akar Masalah Teknis |
| :--- | :--- | :--- |
| **a.** Invoice: `"Thank You for Your Business"` menimpa `"Finance & Accounting"` di blok tanda tangan | `src/lib/pdf-generator.ts:909–910, 1123–1147, 2077` | `closingNote` digambar pada koordinat Y tetap `sigTopY - 82` (bukan mengikuti cursor `y` setelah blok tanda tangan selesai). Sementara nama penandatangan digambar di `nameY = sigTopY - 68` dan jabatan (`Finance & Accounting`) di `nameY - 11 = sigTopY - 79` (atau pada versi sebelumnya satu baris panjang `(Muhammad Izzul Islam - Finance & Accounting)` yang melebar ke tengah). Selisih vertikal hanya `3 pt` pada baseline yang sama sehingga teks saling menimpa. |
| **b.** BAST: label `"Referensi Dokumen UAT"` menabrak nilainya; `"Masa Garansi Bug-Fix:30 Hari"` tanpa jarak setelah titik dua | `src/lib/pdf-generator.ts:568–579, 635–653` | Lebar kolom label dipatok konstan terlalu sempit (`metaLabelW = 86 pt` di layout 2 kolom, atau `135 pt` di layout 1 kolom lama), dan titik dua ditempel langsung ke string label (`${meta.label}:`). Lebar teks `"Referensi Dokumen UAT:"` pada Helvetica Bold 8–8.5 pt adalah `~104 pt` (`> 86 pt`), dan `"Masa Garansi Bug-Fix:"` adalah `~95 pt`, sehingga ujung label melewati batas `metaLabelW` dan menabrak/menempel ke karakter pertama nilai. |
| **c.** UAT: `"Lingkungan Uji (Staging):"` menabrak URL `https://staging.altvira.id` | `src/lib/pdf-generator.ts:112–142, 568, 636` | (1) Lebar `"Lingkungan Uji (Staging):"` adalah `~102 pt` (`> metaLabelW = 86 pt`), sehingga menabrak awal URL. (2) Fungsi `wrapTextByWidth` (`baris 124`) hanya memecah berdasarkan spasi (`para.split(/\s+/)`); string panjang tanpa spasi seperti URL tidak pernah dipotong (*no character-level break*), sehingga meluap keluar kolom. |
| **d.** Invoice: `"Tanggal Jatuh Tempo:15 November 2026"` menempel; SoW: label `"Kode & Nama Proyek:"` mepet | `src/lib/pdf-generator.ts:568, 636` | Lebar `"Tanggal Jatuh Tempo:"` (`~88 pt`) dan `"Kode & Nama Proyek:"` (`~87 pt`) melampaui `metaLabelW = 86 pt`. Karena tidak ada kolom titik dua terpisah dan tidak ada perhitungan lebar label adaptif, titik dua menempel tepat pada huruf pertama nilai (`0 pt` gap). |
| **e.** Header: alamat, email, dan telepon dalam satu paragraf dengan `"\|"` yang terpotong tak rapi | `src/lib/pdf-generator.ts:378–398` | Alamat, email, telepon, dan NPWP digabung ke satu string tunggal `` `${address} \| Email: ${email} \| Telp: ${phone}` `` lalu di-wrap selebar halaman. Karakter `"\|"` jatuh di ujung/awal baris secara acak. Selain itu, judul dokumen, nomor, dan chip status diletakkan di bawah garis kop, bukan di kolom kanan header seperti referensi Arental/Figma. |
| **f.** Status Lunas ditampilkan tiga kali di invoice dan kuitansi | `src/lib/pdf-generator.ts:1886–1894, 2021–2032, 2107–2115` | Builder mengirim status sekaligus ke: (1) `statusBadge` (`STATUS: LUNAS`), (2) `balanceDueBox.label` (`STATUS PEMBAYARAN: LUNAS`) / `amountText` (`LUNAS`), dan (3) `balanceDueBox.dueDateText` (`Lunas Sepenuhnya`). |
| **g.** Teks daftar (bullet) yang wrap ke baris kedua tidak sejajar rapi | `src/lib/pdf-generator.ts:106, 878–900` | (1) Pada fungsi `sanitizePdfText` (`baris 106`), `.replace(/\u2022/g, "-")` memaksa semua bullet `•` berubah menjadi `-`. (2) Pada PDF contoh, prefix `"- "` digabung ke string sebelum di-wrap sehingga baris ke-2 mulai di `x = marginX` (di bawah tanda `-`, bukan *hanging indent* di bawah huruf pertama teks). |
| **h.** Slot e-Meterai di BAST kecil dengan teks nyaris tak terbaca | `src/lib/pdf-generator.ts:1043–1090` | Kotak meterai berukuran `76 × 44 pt` (`~26,8 × 15,5 mm`, terlalu gepeng dibanding standar `25 × 35 mm` / `71 × 99 pt`), diletakkan di tengah antara dua kolom tanda tangan, dengan ukuran font judul `6.2 pt` dan subteks `5.2 pt` (di bawah batas minimum `7.5 pt`). |

---

## 3. Arsitektur Komponen Bersama & Spesifikasi Layout Baru

Seluruh perbaikan akan dibangun sebagai kumpulan **komponen layout mengalir (flow-based layout primitives)** di dalam `src/lib/pdf-generator.ts` (dan diselaraskan ke `src/lib/word-generator.ts`), disertai **perekam kotak batas (*bounding-box collision & margin detector*)** otomatis:

1. **Design Tokens & Grid Halaman A4:**
   - Ukuran kertas: A4 Portrait (`595.28 × 841.89 pt`).
   - Margin: Samping `18 mm` (`51.02 pt`), Atas `16 mm` (`45.35 pt`), Bawah `20 mm` (`56.69 pt`, ruang khusus footer; batas aman konten `bottomSafeY = 68 pt`). Lebar area isi `contentWidth = 493.24 pt`.
   - Tipografi: Satu keluarga font sans (`Helvetica` / `HelveticaBold`), isi `9.5–10 pt` (line-height `1.45` = `~14 pt`), label & kontak `8.5 pt` (min `8 pt`), catatan & e-Meterai min `7.5 pt`, judul dokumen di header kanan `22–24 pt` (dengan adaptasi 2 baris bila judul panjang).
   - Skala spasi kelipatan 4 pt: `4, 8, 12, 16, 20, 24, 32 pt`.
   - Palet warna:
     - Aksen Biru Logo (`BRAND_BLUE`): `#0B43C8` (`rgb(0.043, 0.263, 0.784)`)
     - Teks Utama (`TEXT_PRIMARY`): `#1F2937` (`rgb(0.122, 0.161, 0.216)`)
     - Label & Sekunder (`TEXT_MUTED`): `#6B7280` (`rgb(0.420, 0.447, 0.502)`)
     - Garis Pemisah (`BORDER_LINE`): `#E5E7EB` (`rgb(0.898, 0.906, 0.922)`)
     - Latar Chip & Header Tabel (`BG_CHIP`): `#F3F4F6` (`rgb(0.953, 0.957, 0.965)`)

2. **Komponen 1 — `drawDocumentHeader` (Zona A, Gaya Arental/Figma):**
   - Dua kolom sejajar di bagian atas:
     - **Kolom Kiri (lebar maks 55% = ~270 pt):** Logo (`tinggi ~14 mm / 40 pt`) di kiri + Nama Usaha (`15.5 pt` tebal warna aksen `#0B43C8`) + Nama Badan Hukum (`9 pt` `#6B7280`). Di bawahnya, blok kontak **3 baris terpisah tanpa `"|"`**: (1) Alamat (wrap maks 2 baris, `8.5 pt` `#6B7280`), (2) Email (`8.5 pt`), (3) Telepon (& NPWP bila ada, `8.5 pt`).
     - **Kolom Kanan (rata kanan, lebar ~42% = ~207 pt):** Judul Dokumen (`22 pt` tebal `#1F2937`, rata kanan), Nomor Dokumen (`10 pt` tebal `#1F2937`, rata kanan), lalu **SATU chip status** (`latar #F3F4F6`, border `#E5E7EB`, teks `8 pt` tebal `#1F2937`).
   - Garis pemisah horizontal `0.75 pt` `#E5E7EB` di bawah titik terendah kolom kiri/kanan dengan jarak atas `12 pt` dan jarak bawah `16 pt`.

3. **Komponen 2 — `drawKeyValueGrid` & `drawRecipientAndMetaGrid` (Zona B, Pasangan `Label : Nilai`):**
   - Mendukung tata letak 2 kolom (Penerima/Para Pihak di kiri, Metadata di kanan) maupun blok metadata penuh.
   - Setiap daftar pasangan `label : nilai` dirender dengan **Grid 3 Kolom**:
     - **Kolom 1 (Label):** Lebar default `36 mm` (`102 pt`), atau dihitung otomatis dari label terpanjang di blok tersebut (dibatasi maks `42 mm / 119 pt`; bila ada label lebih panjang lagi, label otomatis wrap ke 2 baris). Rata kiri, `8.5 pt` `#6B7280`.
     - **Kolom 2 (Titik Dua `:`):** Lebar tetap `3.5 mm` (`10 pt`), titik dua lurus vertikal sempurna.
     - **Kolom 3 (Nilai):** Sisa lebar kolom, rata kiri, `9.5 pt` `#1F2937`, boleh wrap multi-baris. Untuk teks tanpa spasi seperti URL panjang (`https://...`), fungsi `wrapTextSmart` memotong per karakter/segmen (`overflow-wrap: anywhere`) sehingga **tidak pernah keluar kolom atau menabrak label**.
   - Jarak antar baris `label : nilai` adalah `5 pt`.

4. **Komponen 3 — `drawBulletList` (Daftar Bullet / Strip dengan Hanging Indent):**
   - Grid 2 kolom:
     - **Kolom Marker:** Lebar tetap `12 pt`, menampilkan `•` (atau `-`/nomor).
     - **Kolom Teks:** Mulai di `x + 12 pt`, lebar `maxWidth - 12 pt`. Baris ke-2 dan seterusnya otomatis mulai di `x + 12 pt` (*hanging indent* sejajar huruf pertama teks, bukan di bawah marker).
   - Jarak antar item `4 pt`, line-height `1.45`.

5. **Komponen 4 — `drawDetailTable` (Zona D, Tabel Rincian):**
   - Header tabel setinggi `28 pt`, latar `#F3F4F6`, garis atas & bawah `0.75 pt` `#E5E7EB`, teks `8.5–9 pt` tebal `#1F2937`.
   - Sel isi memiliki padding vertikal `8 pt` atas & `8 pt` bawah, hanya garis horizontal tipis `0.5 pt` `#E5E7EB` antar baris.
   - Kolom angka rata kanan; deskripsi rata kiri dengan `wrapTextSmart`.
   - **Anti-potong baris & Header berulang:** Sebelum menggambar baris, periksa apakah tinggi baris muat di halaman saat ini (`y - rowHeight >= bottomSafeY`). Jika tidak muat, buat halaman baru dan gambar ulang `drawTableHeader()` secara otomatis.

6. **Komponen 5 — `drawTotalsBlock` (Zona E, Blok Total & Terbilang):**
   - Blok ringkasan angka di sisi kanan selebar **45% lebar konten (`~222 pt`)**: label di kiri blok, nilai moneter rata kanan di ujung kanan, garis pemisah `0.75 pt` di atas baris Grand Total/Total, baris Total dicetak tebal `10.5 pt`.
   - Kalimat `Terbilang` dirender mengalir di bawahnya (`8.5 pt` miring/biasa `#6B7280`).
   - Satu blok ini tidak terpotong antar halaman (`ensureSpace`).

7. **Komponen 6 — `drawSignatureBlock` (Zona G, Blok Pengesahan & Slot e-Meterai):**
   - Seluruh blok dicek dengan `ensureSpace(totalSignatureBlockHeight)` agar **tidak pernah terbelah antar halaman**.
   - Dua kolom sejajar dengan lebar sama (atau 3 kolom untuk PO Internal).
   - Urutan vertikal mengalir murni (*flow*):
     1. Label jabatan/pengantar (`"Penerima Hasil Pekerjaan (Klien),"` / `"Hormat kami, Altvira Technology"`, `8.5 pt` `#6B7280`).
     2. Ruang tanda tangan minimal **`64 pt`** (atau bila ada **Slot e-Meterai**, kotak berukuran **`25 × 35 mm` (`71 × 99 pt`)** ditempatkan di atas nama penandatangan yang relevan dengan teks `"METERAI ELEKTRONIK"`, `"Rp10.000"`, dan `"Tempat e-Meterai Rp10.000"` berukuran `7.5–8 pt` yang terbaca jelas).
     3. Garis tipis tanda tangan (`0.5 pt` `#E5E7EB`), diikuti Nama Penandatangan (`9.5 pt` tebal `#1F2937`) dan Jabatan di baris bawahnya (`8.5 pt` `#6B7280`) pada koordinat Y yang sejajar horizontal antar kolom.
   - Tidak ada teks absolut di area tanda tangan. Bila ada `closingNote`, digambar di bawah seluruh blok tanda tangan selesai dengan jarak `24 pt`.

8. **Komponen 7 — `drawPageFooters` (Zona I, Footer di Margin Bawah):**
   - Menempati margin bawah (`y = 36 pt` garis tipis `0.5 pt` `#E5E7EB`, teks di `y = 24 pt`, jauh di bawah `bottomSafeY = 68 pt` sehingga tidak pernah menimpa isi).
   - Kiri: `"Altvira Technology · {nomor dokumen}"`, Tengah (opsional): `"Dokumen ini dibuat otomatis oleh Altcycles"`, Kanan: `"Hal. x / y"` (`8 pt` `#6B7280`).

9. **Pemeriksa Tabrakan & Batas Margin Otomatis (`PdfLayoutInspector`):**
   - Setiap panggilan gambar teks di `generateDocumentPdf` mencatat `TextBoundingBox { pageIndex, x, y, width, height, text }`.
   - Fungsi `verifyPdfLayout(boxes, pageConfig)` memeriksa secara matematis:
     1. Tidak ada dua kotak teks pada halaman yang sama yang beririsan (`overlapArea > 0`).
     2. Tidak ada kotak teks yang melewati margin kiri (`x < marginX - 1`), margin kanan (`x + width > pageWidth - marginX + 1`), margin atas, atau batas aman footer bawah (`y < footerLineY`).

---

## 4. Rencana Perubahan Terurut (Langkah 1 – 3)

### Langkah 1: Komponen Bersama, Design Token, Fixture Uji, & Penerapan pada Invoice
1. Bangun komponen bersama di `src/lib/pdf-generator.ts`: token ukuran/warna, `wrapTextSmart` (mendukung pemotongan URL panjang), `drawDocumentHeader`, `drawRecipientAndMetaGrid` (grid 3 kolom `label | : | nilai` dengan lebar label adaptif), `drawBulletList` (2 kolom *hanging indent*), `drawDetailTable` (header berulang & anti-potong), `drawTotalsBlock` (45% kanan), `drawSignatureBlock` (flow murni + slot e-Meterai `25×35 mm`), `drawPageFooters`, serta `PdfLayoutInspector`.
2. Buat fixture pengujian lengkap (data normal, ekstrem: proyek 3 baris, alamat 3 baris, label panjang, URL panjang, bullet 3 baris, tabel 25 baris multi-halaman, nilai `Rp1.234.567.890,00`, dan data minimum).
3. Terapkan pada **Invoice**, render PDF & PNG sebelum dan sesudah di `docs/render-check/`, jalankan pemeriksa tabrakan otomatis dan seluruh unit test, lalu **berhenti untuk review**.

### Langkah 2: Kuitansi, Quotation, SoW, dan PO (PO Klien & PO Internal)
1. Terapkan komponen bersama dan perbaiki pembuat spec untuk **Kuitansi**, **Quotation**, **SoW**, **PO Klien**, dan **PO Internal** (hilangkan status ganda, rapikan label:nilai, perbaiki duplikasi `"Termin: Termin 1"`).
2. Render PDF & PNG sebelum dan sesudah di `docs/render-check/` untuk seluruh fixture, jalankan pemeriksa tabrakan dan unit test, perbarui `docs/temuan-layout.md`, dan buat 1 commit.

### Langkah 3: BAKP, UAT, dan BAST (termasuk Slot e-Meterai & Dokumen Pendukung)
1. Terapkan komponen bersama dan perbaiki pembuat spec untuk **BAKP**, **UAT**, dan **BAST** (termasuk slot e-Meterai `25×35 mm` yang terbaca jelas, URL staging UAT wrap rapi, serta keselarasan SPK/Payment Approval).
2. Render PDF & PNG sebelum dan sesudah di `docs/render-check/`, jalankan pemeriksa tabrakan otomatis dan seluruh test suite, perbarui `docs/temuan-layout.md`, dan buat 1 commit.

---

## 5. Daftar Temuan Awal
Seluruh 11 temuan awal (`K-01` s/d `K-11`) telah dicatat secara lengkap di [`docs/temuan-layout.md`](./temuan-layout.md). Tiga di antaranya (`K-02`, `K-03`, `K-06`) ditandai memerlukan konfirmasi Anda.
