# Catatan Temuan & Konflik Layout Dokumen Altcycles

Dokumen ini mencatat seluruh temuan konflik antara `docs/standar-dokumen.md`, spesifikasi layout target (gaya Figma/Arental), aturan sistem yang berjalan di kode, serta kejanggalan data pada PDF sampel. Dokumen ini diperbarui pada setiap langkah dan tidak ada temuan lama yang dihapus.

---

## Daftar Temuan

### ID: K-01
- **Status:** Selesai (Diterapkan pada Langkah 1)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Kuitansi (`buildReceiptPdfSpec` di `src/lib/pdf-generator.ts`) & Invoice (`buildInvoicePdfSpec` di `src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - `docs/standar-dokumen.md` (Tabel Zona C baris 210 & Tabel Invoice baris 83, 89) mencantumkan elemen **Zona C: Ringkasan jumlah (Kotak Balance Due atau total)** sekaligus **Chip Status (Draft, Terbit, Lunas, Batal)** di Zona A.
  - Pada kode sebelumnya, ketika Invoice/Kuitansi berstatus Lunas, sistem menampilkan status **LUNAS tiga kali**: (1) chip `STATUS: LUNAS` di header, (2) judul kotak Zona C `STATUS PEMBAYARAN: LUNAS` / `amountText: LUNAS`, dan (3) subteks `Lunas Sepenuhnya`.
  - Spesifikasi layout menetapkan: *"Satu indikator status per dokumen (chip di header). Hapus kotak status dan kata besar yang mengulang informasi yang sama. Untuk kuitansi, pilih satu penanda LUNAS dan tampilkan sekali."*
- **Yang kulakukan:** Pada Langkah 1, indikator status disatukan menjadi **satu chip status di kanan header (Zona A)**, dan kotak status besar di Zona C yang mengulang informasi status dihapus dari mesin render bersama.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Hanya tampilkan 1 chip status di Header Kanan (Zona A). (Risiko: nol, tampilan jauh lebih bersih).
  - **Opsi B:** Pertahankan kotak besar Zona C di semua invoice/kuitansi selain chip header. (Risiko: duplikasi visual dan memakan ruang vertikal ~48 pt).
  - **Opsi C:** Tampilkan status hanya di kotak besar Zona C dan hilangkan chip di header untuk kuitansi. (Risiko: header tidak seragam antar jenis dokumen).
- **Rekomendasi:** **Opsi A** — satu chip status di kanan header (Zona A) untuk semua dokumen secara konsisten.
- **Perlu keputusanku?** tidak

---

### ID: K-02
- **Status:** Selesai (Keputusan Pengguna Diterapkan pada Langkah 1)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** Semua dokumen yang memiliki nilai `terbilangAmount` (Invoice, Kuitansi, Quotation, PO Klien, PO Internal, Payment Approval) di `src/lib/pdf-generator.ts`
- **Apa yang bertentangan:**
  - Di kode sebelumnya, kalimat terbilang pada semua dokumen dibungkus tanda pagar: `` `Terbilang: # ${terbilangRupiah(spec.terbilangAmount)} #` ``.
  - `docs/standar-dokumen.md` (baris 84, 97, 306) hanya mewajibkan *"Terbilang berbahasa Indonesia"* tanpa tanda `# ... #`.
  - Spesifikasi layout meminta: *"Terbilang ditulis biasa di bawahnya, tanpa tanda '# ... #' bila itu hanya hiasan teknis (jika itu aturan yang disengaja, catat sebagai temuan dan tanya)."*
- **Yang kulakukan:** Sesuai keputusan pengguna: menghapus tanda `"# ... #"` pada terbilang di Invoice, Quotation, dan PO (`Terbilang: Dua juta enam ratus rupiah`), serta mempertahankan `"# ... #"` khusus pada Kuitansi (`Terbilang: # Dua juta enam ratus rupiah #`) sebagai kebiasaan pengaman penerimaan uang.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Hapus tanda `# ... #` di Invoice, Quotation, dan PO; pertahankan di Kuitansi. (Diterapkan).
  - **Opsi B:** Pertahankan tanda `# ... #` di semua dokumen.
- **Rekomendasi:** **Opsi A** (Sesuai keputusan pengguna).
- **Perlu keputusanku?** tidak (Sudah diputuskan & selesai)

---

### ID: K-03
- **Status:** Selesai (Keputusan Pengguna Opsi A Diterapkan pada Langkah 1)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Invoice (`buildInvoicePdfSpec` di `src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - `buildInvoicePdfSpec` menyetel `closingNote: "Thank You for Your Business"`.
  - Di kode sebelumnya, `closingNote` digambar pada koordinat `y: sigTopY - 82`, tepat di area vertikal yang sama dengan jabatan penandatangan (`Finance & Accounting`), menyebabkan Gejala (a): teks `"Thank You for Your Business"` menimpa `"Finance & Accounting"`.
  - Selain itu, `docs/standar-dokumen.md` butir aturan visual (baris 225) menetapkan label berbahasa Indonesia dan tidak mewajibkan slogan bahasa Inggris `"Thank You for Your Business"`.
- **Yang kulakukan:** Sesuai keputusan pengguna (Opsi A), menghapus `"Thank You for Your Business"` sepenuhnya dari `buildInvoicePdfSpec`, serta memperbaiki blok pengesahan di mesin render agar sepenuhnya mengalir (*flow-based*).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Hapus `"Thank You for Your Business"` sepenuhnya dari Invoice. (Diterapkan).
  - **Opsi B:** Pertahankan tetapi pindahkan ke dalam *document flow* normal di bawah blok tanda tangan.
- **Rekomendasi:** **Opsi A** (Sesuai keputusan pengguna).
- **Perlu keputusanku?** tidak (Sudah diputuskan & selesai)

---

### ID: K-04
- **Status:** Selesai (Diterapkan pada Langkah 1)
- **Jenis:** `data-janggal`
- **Dokumen terdampak:** Invoice & Kuitansi (`src/features/invoicing/invoicing-page.tsx:443, 501` & `src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Di `invoicing-page.tsx:443` dan `497`, kode mengirim `servicePeriod: ms ? \`Termin: ${ms.name}\` : undefined`.
  - Karena nama milestone di database (`ms.name`) sudah diawali kata `"Termin 1"`, hasil cetak di PDF menjadi berulang: **`Periode Layanan : Termin: Termin 1`**.
- **Yang kulakukan:** Memperbaiki `invoicing-page.tsx` dan menambahkan normalisasi di `pdf-generator.ts` (`replace(/^Termin:\s*(Termin\b)/i, "$1")`) sehingga tertulis bersih **`Periode Layanan : Termin 1`** tanpa mengubah data tersimpan di database.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Normalisasi di lapisan presentasi builder PDF & halaman pemanggil. (Diterapkan).
  - **Opsi B:** Ubah data `ms.name` di database. (Melanggar batasan tidak mengubah data tersimpan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-05
- **Status:** Selesai (Diterapkan pada Langkah 1)
- **Jenis:** `data-janggal`
- **Dokumen terdampak:** Invoice (`src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Di `buildInvoicePdfSpec`, catatan instruksi pembayaran sebelumnya ditulis: `` `Instruksi Pembayaran: Bank ${params.company.bank_name} | No. Rek: ...` ``.
  - Karena `company.bank_name` di database/seed berisi `"Bank Jago"`, hasil cetaknya menjadi berulang: **`Bank Bank Jago`**.
- **Yang kulakukan:** Menormalisasi nama bank di `buildInvoicePdfSpec` (`/^bank\b/i.test(rawBankName) ? rawBankName : \`Bank ${rawBankName}\``) sehingga tercetak bersih **`Bank Jago`**.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Normalisasi di tampilan spec PDF. (Diterapkan).
  - **Opsi B:** Hapus kata "Bank" di data profil perusahaan.
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-06
- **Status:** Selesai (Keputusan Pengguna Diterapkan pada Langkah 1)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** Semua dokumen dengan nilai moneter (`src/lib/formatters.ts`, `src/lib/pdf-generator.ts`, dan `docs/standar-dokumen.md`)
- **Apa yang bertentangan:**
  - `docs/standar-dokumen.md` baris 20 & 223 sebelumnya menulis semua contoh angka memakai `,00`, sedangkan aturan bisnis sistem Altcycles (**BR-11**) menampilkan angka bulat tanpa `,00` (`Rp2.000.000`) seperti referensi Arental.
- **Yang kulakukan:** Sesuai keputusan pengguna:
  1. Mempertahankan perilaku `formatDocRupiah` untuk dokumen yang seluruh angkanya bulat (`Rp2.000.000`).
  2. Menambahkan aturan konsistensi per dokumen (`hasAnyDecimalCurrency` di `src/lib/formatters.ts` dan `normalizeSpecCurrencyDecimals` di `src/lib/pdf-generator.ts`): **bila ada SATU saja angka uang berdesimal di sebuah dokumen, maka seluruh angka uang di dokumen tersebut ditampilkan dua desimal (`,00`) agar kolom angka rata kanan sejajar sempurna.**
  3. Memperbarui `docs/standar-dokumen.md` baris 20 dan 223 agar mendokumentasikan aturan ini secara eksplisit.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Format bulat `Rp2.000.000` secara default, dan otomatis seragam dua desimal (`,00`) di seluruh dokumen apabila terdapat minimal satu angka berdesimal pada dokumen tersebut. (Diterapkan).
- **Rekomendasi:** **Opsi A** (Sesuai keputusan pengguna).
- **Perlu keputusanku?** tidak (Sudah diputuskan & selesai)

---

### ID: K-07
- **Status:** Selesai (Diterapkan pada Langkah 1)
- **Jenis:** `sistem-menghalangi`
- **Dokumen terdampak:** Semua dokumen PDF (`src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Fungsi `sanitizePdfText()` sebelumnya mengganti karakter bullet `\u2022` (`•`) dan en-dash `\u2013` (`–`) menjadi strip `-`, padahal `StandardFonts.Helvetica` (WinAnsiEncoding) mendukung keduanya secara native.
- **Yang kulakukan:** Memperbarui `sanitizePdfText()` agar mempertahankan `\u2022` (`•`) dan `\u2013` (`–`), serta menerapkan komponen daftar bullet 2 kolom (`marker 12 pt` | `teks` dengan *hanging indent* sejajar huruf pertama).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Pertahankan `\u2022` dan `\u2013` di `sanitizePdfText`. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-08
- **Status:** Selesai (Diterapkan pada Langkah 1)
- **Jenis:** `standar-vs-standar`
- **Dokumen terdampak:** Header Semua Dokumen (`Zona A` di `docs/standar-dokumen.md:208, 221` vs Spesifikasi Layout)
- **Apa yang bertentangan:**
  - `docs/standar-dokumen.md` baris 221 menulis judul dokumen `18–20 pt`, sedangkan Spesifikasi Layout menetapkan `22–24 pt`. Untuk judul dokumen yang sangat panjang (seperti `BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)`), ukuran 22–24 pt satu baris akan menabrak kolom kiri.
- **Yang kulakukan:** Menerapkan ukuran `22 pt` untuk judul dokumen 1 baris (seperti `INVOICE`, `KUITANSI`, `QUOTATION`), dan ukuran adaptif di kolom kanan (maksimal 2 baris di dalam lebar kolom kanan `209 pt`) apabila judul dokumen panjang, sehingga header selalu proporsional dan bebas tabrakan.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Ukuran `22 pt` untuk judul 1 baris dan adaptif maks 2 baris untuk judul panjang. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-09
- **Status:** Aktif (Dipatuhi Sesuai Batasan Keras)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** Semua dokumen (`docs/standar-dokumen.md:260` vs `supabase/migrations/0002_core_identity_and_audit.sql` & `src/lib/demo-seed.ts:129-142`)
- **Apa yang bertentangan:**
  - `docs/standar-dokumen.md` merekomendasikan pola nomor `ALT/{JENIS}/{YYYY}/{MM}/{URUT4}`, sedangkan sistem dan data tersimpan saat ini menggunakan `{JENIS}/ALT/{YYYY}/{MM}/{URUT3}` (`INV/ALT/2026/11/001`, `KW/ALT/2026/11/001`, `PO-202611-8YQKXM`).
- **Yang kulakukan:** Mematuhi Batasan Keras: tidak mengubah penomoran, sequence database, ataupun data tersimpan; hanya merender nomor dokumen apa adanya.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Biarkan nomor dokumen sesuai data yang tersimpan/dibangkitkan sistem saat ini.
- **Rekomendasi:** **Opsi A** (sesuai Batasan Keras).
- **Perlu keputusanku?** tidak

---

### ID: K-10
- **Status:** Aktif (Dicatat Sesuai Instruksi Tanpa Mengubah Data Tersimpan)
- **Jenis:** `data-janggal`
- **Dokumen terdampak:** PDF Contoh Keluaran Sistem Saat Ini (Quotation, SoW, PO Klien, Invoice, UAT, BAST pada data uji proyek `TIMTravel RMM`)
- **Apa yang bertentangan:**
  - Pada data uji PDF yang dihasilkan dari proyek `PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM`, ditemukan inkonsistensi data masukan pengujian:
    1. **Quotation vs PO/Invoice:** Nilai Quotation tercatat `Rp120.000.000` dengan ringkasan kebutuhan `"testing"`, sedangkan PO Klien (`PO-202611-8YQKXM`) bernilai `Rp7.000.000` dan Invoice Termin 1 bernilai `Rp2.000.600`.
    2. **Tanggal Mundur di SoW:** Dokumen SoW bertanggal terbit `15 November 2026`, tetapi `Target Penyelesaian` proyek tercatat `18 Agustus 2026` (3 bulan sebelum dokumen terbit).
    3. **Nama Penguji & Pendamping UAT Sama:** Pada dokumen `UAT/ALT/2027/01/004`, kolom `Penguji Pihak Klien` dan `Pendamping Altvira` sama-sama diisi `"visionquest"`, sehingga blok tanda tangan kiri dan kanan menampilkan nama `(visionquest)` yang kembar.
    4. **Alamat Klien Sama dengan Alamat Penerbit:** Pada BAST & UAT `TIMTravel RMM`, alamat klien tertulis sama persis dengan alamat Altvira Technology di Bogor.
    5. **NPWP Penerbit 16 Digit Tanpa Pemisah:** Pada UAT tertulis `NPWP: 5308202712030001`.
- **Yang kulakukan:** Mencatat seluruh kejanggalan data uji tersebut tanpa mengubah data tersimpan di database.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Biarkan data tersimpan di DB (sesuai Batasan Keras).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-11
- **Status:** Aktif (Diterapkan pada Komponen Bersama Langkah 1, Diverifikasi di Langkah 2)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Kuitansi (`docs/standar-dokumen.md:237` vs Spesifikasi Layout)
- **Apa yang bertentangan:**
  - `docs/standar-dokumen.md` baris 237 menyebutkan Kuitansi *"Setengah halaman A4; tanpa tabel; slot e-Meterai di dekat tanda tangan"*, sedangkan Spesifikasi Layout menetapkan ukuran halaman A4 portrait seragam dengan ruang bawah dibiarkan lega tanpa menggelembungkan jarak.
- **Yang kulakukan:** Merender Kuitansi pada kertas A4 portrait standar menggunakan komponen bersama sehingga konten kuitansi secara alami menempati paruh atas halaman A4 dengan ruang bawah tetap lega.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Kertas tetap A4 portrait dengan komponen bersama; isi kuitansi ringkas di paruh atas halaman.
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-12
- **Status:** Aktif (Dicatat Sesuai Instruksi Tanpa Mengubah Data Tersimpan)
- **Jenis:** `data-janggal`
- **Dokumen terdampak:** Invoice & Kuitansi (`INV/ALT/2026/11/001` & `KW/ALT/2026/11/001` pada proyek `TIMTravel RMM`)
- **Apa yang bertentangan:**
  - Deskripsi item dan termin pada `INV/ALT/2026/11/001` menyebutkan **Termin 1 (DP 40%)** dari Total Nilai Kontrak Proyek `Rp5.000.000`, namun nominal tagihan Termin 1 yang tercatat di data adalah **`Rp2.000.600`** (tidak sama dengan `40% × Rp5.000.000 = Rp2.000.000`, terdapat selisih `+Rp600`), sehingga Sisa Nilai Kontrak menjadi `Rp2.999.400`.
- **Yang kulakukan:** Sesuai Batasan Keras dan instruksi pengguna, tidak mengubah angka, rumus, ataupun data tersimpan; dicatat sebagai temuan `data-janggal`.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Biarkan nilai data tersimpan apa adanya sesuai Batasan Keras.
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-13
- **Status:** Selesai (Diterapkan pada Langkah 1)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** `docs/standar-dokumen.md` (baris 20 & 223)
- **Apa yang bertentangan:**
  - Pembaruan dokumentasi standar di `docs/standar-dokumen.md` agar selaras dengan keputusan K-06 mengenai format Rupiah bulat (`Rp2.000.000`) dan aturan konsistensi dua desimal (`,00`) per dokumen bila terdapat minimal satu angka berdesimal pada dokumen yang sama.
- **Yang kulakukan:** Memperbarui `docs/standar-dokumen.md` pada bagian *Temuan Utama* (baris 20) dan *Aturan Visual & Tipografi* (baris 223) sesuai keputusan pengguna.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Dokumentasikan aturan konsistensi desimal per dokumen di `docs/standar-dokumen.md`. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

## Ringkasan Jumlah Temuan per Jenis (Akhir Langkah 1)

| Jenis Temuan | Total | Selesai | Aktif (Tanpa Ubah Data/Sistem) | Perlu Keputusan Pengguna |
| :--- | :---: | :---: | :---: | :---: |
| `standar-vs-standar` | 1 | 1 (K-08) | 0 | 0 |
| `standar-vs-layout` | 3 | 2 (K-01, K-03) | 1 (K-11) | 0 |
| `standar-vs-sistem` | 4 | 3 (K-02, K-06, K-13) | 1 (K-09) | 0 |
| `sistem-menghalangi` | 1 | 1 (K-07) | 0 | 0 |
| `data-janggal` | 4 | 2 (K-04, K-05) | 2 (K-10, K-12) | 0 |
| `keputusan-sendiri` | 0 | 0 | 0 | 0 |
| **Total Temuan** | **13** | **9** | **4** | **0** |
