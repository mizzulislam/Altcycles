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
- **Status:** Selesai (Diverifikasi pada Langkah 2)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Kuitansi (`docs/standar-dokumen.md:237` vs Spesifikasi Layout)
- **Apa yang bertentangan:**
  - `docs/standar-dokumen.md` baris 237 menyebutkan Kuitansi *"Setengah halaman A4; tanpa tabel; slot e-Meterai di dekat tanda tangan"*, sedangkan Spesifikasi Layout menetapkan ukuran halaman A4 portrait seragam dengan ruang bawah dibiarkan lega tanpa menggelembungkan jarak.
- **Yang kulakukan:** Merender Kuitansi pada kertas A4 portrait standar menggunakan komponen bersama (Header 2 kolom, Grid `Label : Nilai` 3 kolom dengan `Tanggal Terima` di atas, baris `Jumlah Diterima` di kanan atas `Terbilang: # ... #`, Catatan bullet *hanging indent*, dan Blok Pengesahan + Slot e-Meterai `25 × 35 mm` di atas nama penandatangan), sehingga konten kuitansi secara alami menempati paruh atas halaman A4 dengan ruang bawah tetap lega.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Kertas tetap A4 portrait dengan komponen bersama; isi kuitansi ringkas di paruh atas halaman. (Diterapkan).
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

### ID: K-14
- **Status:** Selesai (Diterapkan pada Langkah 2)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** Quotation (`makeQuotationSpec` di `src/features/client-projects/project-detail-page.tsx:593-678`), PO Klien (`buildClientPoPdfSpec` di `src/lib/pdf-generator.ts:3099-3195`), dan PO Internal (`makePoDocSpec` di `src/features/purchase-orders/po-page.tsx:236-311`)
- **Apa yang bertentangan:**
  1. **Quotation:** `docs/standar-dokumen.md` (baris 29 & 36) mewajibkan **masa berlaku** di blok metadata dan **kolom persetujuan klien** di Zona G berdampingan dengan pengesahan Altvira. Sebelumnya di `makeQuotationSpec`, tanggal berlaku hanya ditaruh di `docSubtitle` / `balanceDueBox.dueDateText` dan hanya ada 1 kolom tanda tangan Altvira di kanan.
  2. **PO Klien:** Sebelumnya `buildClientPoPdfSpec` belum menyertakan `statusBadge` di kanan header, belum menyertakan `footerDocNumber`, belum menampilkan kolom tanda tangan pengaju klien di kiri, dan masih memakai `formatRupiah` alih-alih `formatDocRupiah`.
  3. **PO Internal (Vendor):** Baris kontak vendor di `makePoDocSpec` sebelumnya memakai karakter pemisah pipa `"|"` (`Kontak: ... | Telp: ...`).
- **Yang kulakukan:**
  1. Menambahkan `Tanggal Terbit` dan `Masa Berlaku s.d.` ke `metaRows` Quotation serta menambahkan kolom pengesahan kiri `Disetujui Oleh (Klien),`.
  2. Menambahkan `statusBadge`, `Tanggal PO`, `formatDocRupiah` (dengan konsistensi dua desimal bila ada desimal), kolom tanda tangan kiri `Diajukan Oleh (Klien),`, dan `footerDocNumber` pada `buildClientPoPdfSpec`.
  3. Mengganti pemisah `"|"` pada kontak vendor PO Internal menjadi titik tengah `"·"` serta menyeragamkan label total ke Proper Case (`Total Penawaran Harga`, `Total Nilai Purchase Order`, `Total Nilai PO`).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Lengkapi elemen wajib standar di fungsi builder Quotation, PO Klien, dan PO Internal. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-15
- **Status:** Selesai (Diterapkan pada Langkah 3)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** SoW (`makeSowDocSpec`), SPK Project Charter (`generateSpkProjectCharterPdf`), BAKP (`makeBakpSpec`), UAT (`makeUatSpec`), BAST (`makeBastSpec`), Payment Approval (`buildPaymentApprovalPdfSpec`), dan Jadwal Termin (`handleExportMilestonesPdf`)
- **Apa yang bertentangan:**
  1. **SoW:** Pada `makeSowDocSpec` (`src/features/client-projects/project-detail-page.tsx:742`), `notesTitle` disetel `"Ketentuan Pelaksanaan Pekerjaan:"` namun properti `notes` belum diisi sehingga seksi ketentuan kosong saat diunduh dari halaman detail proyek; selain itu `Tanggal Terbit` belum masuk ke baris pertama `metaRows`.
  2. **SPK Project Charter 10 Pasal:** Pada `generateSpkProjectCharterPdf` (`src/lib/pdf-generator.ts:2643-2672`), kotak e-Meterai sebelumnya masih berukuran `84 × 48 pt` dengan teks `5.5 pt` (melanggar batas minimum `7.5 pt` dan ukuran `25 × 35 mm`), serta `docNumber` belum diteruskan ke footer halaman.
  3. **UAT:** Pada `makeUatSpec` (`src/features/client-projects/project-detail-page.tsx:960`), `rightSignatureName` hanya berisi `uat.altvira_companion_name` tanpa jabatan sehingga di blok tanda tangan kanan muncul fallback `Finance & Accounting` alih-alih `Pendamping Teknis Altvira`.
  4. **Payment Approval (PA):** Pada `buildPaymentApprovalPdfSpec` (`src/lib/pdf-generator.ts:3274-3345`), judul dokumen sepanjang 46 karakter (`FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL)`) sebelumnya terbungkus menjadi 3 baris di header kanan, dan `requesterName` berformat `"Nama (Jabatan)"` belum terpecah menjadi baris nama dan baris jabatan di Zona G.
  5. **Jadwal Termin:** Pada `handleExportMilestonesPdf` (`src/features/client-projects/project-detail-page.tsx:1106-1146`), belum terdapat `statusBadge`, `metaRows` terstruktur, maupun `footerDocNumber`, serta masih menggunakan `formatRupiah` dan label kapital `TOTAL NILAI TERMIN`.
- **Yang kulakukan:**
  1. Menambahkan `Tanggal Terbit`/`Tanggal Pemeriksaan`/`Tanggal Pengujian`/`Tanggal Serah Terima`/`Tanggal Pengajuan`/`Tanggal Cetak` di baris pertama `metaRows` seluruh dokumen Langkah 3, serta melengkapi `notes` default pada `makeSowDocSpec`.
  2. Memperbarui slot e-Meterai pada `generateSpkProjectCharterPdf` menjadi ukuran standar `25 × 35 mm` (`71 × 99 pt`) dengan teks `7.5–9.5 pt` dan meneruskan `docNumber` ke footer setiap halaman.
  3. Menambahkan jabatan `- Penguji Pihak Klien` dan `- Pendamping Teknis Altvira` pada `makeUatSpec`, serta mendukung pemisahan `"Nama (Jabatan)"` pada `splitSigner` untuk Payment Approval.
  4. Menambahkan kandidat ukuran font `12.5` dan `11.5` pt pada `drawDocumentHeader` agar judul panjang Payment Approval tampil rapi dalam 2 baris.
  5. Melengkapi `statusBadge`, `metaRows`, `formatDocRupiah`, Proper Case `Total Nilai Termin`, dan `footerDocNumber` pada `handleExportMilestonesPdf`.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Lengkapi seluruh builder dokumen Langkah 3 dan penyeragaman slot e-Meterai SPK. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

---

### ID: K-16
- **Status:** Selesai (Diterapkan pada Langkah 1 Putaran Penyempurnaan)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** JTPP, Quotation, UAT, BAST, BAKP, SoW, Payment Approval (`src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Standar sebelumnya menempatkan judul lengkap panjang di header kanan, yang sering kali harus diperkecil hingga 11–12 pt atau dibungkus 2–3 baris.
  - Perintah baru pemilik produk mewajibkan: Judul jenis dokumen yang panjang ditulis **SINGKATANNYA** di header kanan (ukuran seragam 22 pt); judul lengkap ditulis di baris abu-abu tepat setelah garis pembatas header. Judul pendek (INVOICE, KUITANSI, PURCHASE ORDER (PO)) tidak disingkat dan tidak mendapat baris abu.
- **Yang kulakukan:** Mengimplementasikan fungsi `resolveDocTitleConfig` di `src/lib/pdf-generator.ts` untuk memetakan singkatan (`JTPP`, `QUOTATION`, `UAT`, `BAST`, `BAKP`, `SOW`, `PAYMENT APPROVAL`) dan merender baris abu judul lengkap selebar halaman tepat di bawah garis pemisah header.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan singkatan di header kanan + baris abu judul lengkap untuk semua jenis dokumen ber-judul panjang. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-17
- **Status:** Selesai (Diterapkan pada Langkah 1 Putaran Penyempurnaan)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen sistem yang berstatus Draft atau Batal/Cancelled (`src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Sebelumnya status dokumen ditampilkan dalam bentuk badge/chip lonjong di kanan atas header (Zona A).
  - Perintah baru pemilik produk: Chip status di header dihapus sepenuhnya; status Draft atau Batal ditampilkan sebagai watermark besar diagonal di tengah halaman (teks DRAFT / BATAL, ukuran 68 pt bold, rotasi 32 derajat, opasitas 11%, warna abu-abu lembut transparan).
- **Yang kulakukan:** Menghapus rendering chip status di header kanan, dan menambahkan `drawWatermarkOnPage` yang otomatis menggambar watermark diagonal berukuran 68 pt pada dokumen berstatus `draft`, `batal`, atau `cancelled`.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Watermark diagonal 68 pt semi-transparan di tengah halaman untuk status Draft/Batal, tanpa chip status header. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-18
- **Status:** Selesai (Diterapkan pada Langkah 1 Putaran Penyempurnaan)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen sistem (`src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Sebelumnya bagian bawah dokumen hanya memiliki satu garis tipis abu-abu di `y = 40 pt` dengan teks nama perusahaan di kiri dan nomor halaman di kanan (`y = 27 pt`).
  - Perintah baru pemilik produk: Tambahkan pita/band media sosial selebar halaman penuh (`0` s.d. `31.18 pt`) di bagian paling bawah berwarna navy gelap (`#090E19`, token sistem) dengan teks akun Instagram, LinkedIn, TikTok putih 8 pt dari data `company.social_links_json`; naikkan garis footer sistem ke atas pita (`lineY = 54 pt`, `textY = 42 pt`).
- **Yang kulakukan:** Mengimplementasikan pita navy gelap selebar halaman dengan teks media sosial putih di `y = 0` s.d. `31.18 pt` serta menaikkan footer sistem lama ke `lineY = 54 pt` dan `textY = 42 pt`, dengan batas aman konten `bottomSafeY = 60 pt`.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Pita navy gelap penuh di dasar halaman + footer sistem di atas pita. (Diterapkan sesuai keputusan pengguna "navy gelap saja").
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-19
- **Status:** Selesai (Diterapkan pada Langkah 1 Putaran Penyempurnaan)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen sistem dengan blok tanda tangan (`src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Sebelumnya teks pembuka pihak Altvira di kanan digabung satu baris dengan nama perusahaan: `Hormat kami, PT Representasi Mitra Mandiri`.
  - Perintah baru pemilik produk: Teks pembuka dipecah menjadi dua baris: Baris 1 kata pembuka ("Hormat kami,", "Pelaksana,", "Penerima,", "Dikeluarkan Oleh,", atau "Diterima Oleh,"), Baris 2 teks `"Altvira Technology"` (tebal, ukuran sama dengan nama penandatangan yaitu 9.5 pt). Posisi garis tanda tangan dan nama penandatangan di kolom kiri dan kanan wajib tetap sejajar horizontal sempurna.
- **Yang kulakukan:** Memecah label kanan menjadi Baris 1 (kata pembuka) dan Baris 2 ("Altvira Technology" tebal), serta menghitung `lineY` dari tinggi blok tertinggi sehingga garis tanda tangan, nama penandatangan, dan jabatan antara kolom kiri dan kanan tetap sejajar presisi.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Dua baris pembuka kanan + penyelarasan baseline garis TTD dan nama penandatangan. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

---

### ID: K-20
- **Status:** Aktif (Dicatat sesuai Perintah Prompt)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Invoice (`buildInvoicePdfSpec` di `src/lib/pdf-generator.ts`)
- **Apa yang bertentangan:**
  - Header dokumen kini sudah menampilkan nomor dokumen induk secara ringkas dan konsisten pada baris kedua kanan (`Ref : {refDocNumber}`), misalnya `Ref : BAKP/ALT/2026/11/001`.
  - Namun di blok metadata invoice (Zona B), sistem saat ini masih menampilkan beberapa baris referensi sekaligus: `Referensi PO Klien`, `Referensi SPK / Kontrak`, `Referensi BAKP Acuan`, dan `Referensi BAST Acuan`. Hal ini berpotensi menimbulkan duplikasi informasi antara header dan metadata.
- **Yang kulakukan:** Mencatat potensi duplikasi ini tanpa mengubah kode sesuai arahan.
- **Opsi penyelesaian permanen:**
  - **Opsi A (Rekomendasi):** Pertahankan `Ref : ...` di header untuk dokumen acuan langsung (misal BAKP/SPK), dan di metadata pertahankan nomor kontrak/PO klien jika diperlukan secara legalitas kontrak formal.
  - **Opsi B:** Hapus baris referensi yang nilainya identik dengan nilai `Ref` di header dari blok metadata Zona B.
  - **Opsi C:** Hapus `Ref : ...` dari header khusus untuk invoice dan pusatkan seluruh referensi di metadata.
- **Rekomendasi:** **Opsi A** (atau Opsi B bila ingin menghemat ruang vertikal).
- **Perlu keputusanku?** ya

---

### ID: K-21
- **Status:** Aktif (Dicatat sesuai Perintah Prompt)
- **Jenis:** `data-janggal`
- **Dokumen terdampak:** Invoice (`tests/fixtures/document-layout-fixtures.ts` dan data klien sistem)
- **Apa yang bertentangan:**
  - Nilai nama klien pada Invoice contoh/fixture tertulis: `"PT Satu Dental Indonesia (TIMTravel RMM)"`.
  - Sementara pada dokumen proyek lainnya (misalnya BAST, Quotation, PO), nama klien tertulis: `"TIMTravel RMM"`. Terdapat inkonsistensi penamaan identitas klien antar dokumen untuk proyek yang sama.
- **Yang kulakukan:** Mencatat inkonsistensi ini sebagai data janggal tanpa mengubah data tersimpan.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Pertahankan data tersimpan saat ini sesuai batasan keras tidak mengubah data/database. (Diterapkan).
  - **Opsi B:** Sinkronisasi nama entitas pelanggan di data master klien saat pembersihan data master dilakukan oleh pengguna.
- **Rekomendasi:** **Opsi A** untuk lapisan dokumen, lakukan **Opsi B** pada master data di portal jika disetujui pengguna.
- **Perlu keputusanku?** tidak

---

### ID: K-22
- **Status:** Aktif (Dicatat sesuai Perintah Prompt)
- **Jenis:** `data-janggal`
- **Dokumen terdampak:** Invoice vs Dokumen Lain (`tests/fixtures/document-layout-fixtures.ts` dan data klien sistem)
- **Apa yang bertentangan:**
  - Alamat klien pada invoice tertulis: `"Komplek City Resort, Ruko Hawai Blok B No. 61 Timur, Cengkareng, Jakarta Barat, DKI Jakarta 11730"`.
  - Sementara pada dokumen BAST/Quotation, alamat pihak kedua/klien tertulis: `"Area Pandu Raya, Villa Citra, Bantarjati Jl. Flamboyan F2 No. 12 Kota Bogor, Jawa Barat."` (sama dengan alamat Altvira).
- **Yang kulakukan:** Mencatat perbedaan alamat ini sebagai data janggal tanpa mengubah data tersimpan.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Pertahankan data masing-masing dokumen tanpa manipulasi kode renderer. (Diterapkan).
  - **Opsi B:** Perbaiki alamat pihak kedua di master data klien melalui portal admin.
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-23
- **Status:** Selesai (Diterapkan sesuai Instruksi Langsung Pengguna)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh Dokumen (Header Bersama)
- **Apa yang bertentangan:**
  - Sebelumnya Butir 1 meminta tinggi tinta ikon sama dengan tinggi tinta wordmark (21 pt).
  - Pengguna secara eksplisit menginstruksikan agar ukuran logo ikon diperbesar lagi, wordmark sedikit diperkecil, serta diberi spasi lebih lega antara logo/judul dan teks header di bawahnya.
- **Yang kulakukan:**
  - Memperbesar tinggi ikon logo menjadi 28 pt (lebar ~39.22 pt).
  - Mengecilkan tinggi wordmark menjadi 17 pt (lebar ~85.75 pt).
  - Memperlebar spasi vertikal ke teks kontak kiri dan No/Ref kanan (`brandToContactGap = 16 pt`).
  - Menyesuaikan penegasan uji verifikasi otomatis pada `tests/unit/generate-render-check.test.ts`.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan rasio kontras ukuran ikon 28 pt dan wordmark 17 pt serta spasi lega 16 pt di komponen header bersama. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-24
- **Status:** Selesai (Diterapkan sesuai Perintah Langkah B Butir 5)
- **Jenis:** `sistem-menghalangi`
- **Dokumen terdampak:** Invoice (`buildInvoicePdfSpec`)
- **Apa yang bertentangan:**
  - Butir 5 meminta kotak "Keterangan" di sebelah kiri blok total diisi dari field catatan dokumen bila sudah ada di data.
  - Saat ini skema database tabel invoice belum memiliki field eksplisit catatan/keterangan dokumen publik (hanya ada deskripsi termin).
- **Yang kulakukan:**
  - Menampilkan kotak "Keterangan" berbingkai sudut membulat yang sejajar dengan blok total. Bila data `documentNotes` dioper, teks akan di-wrap rapi; bila belum ada, kotak tetap tampil rapi dengan judul "Keterangan" tanpa mengubah skema database tersimpan.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Tambahkan kolom migrasi `notes` atau `invoice_notes` pada tabel invoice di masa depan saat ada perubahan skema database. (Rekomendasi).
  - **Opsi B:** Menggunakan field deskripsi sebagai isi keterangan.
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-25
- **Status:** Selesai (Diterapkan sesuai Perintah Langkah B Butir 6)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Invoice (`buildInvoicePdfSpec`)
- **Apa yang bertentangan:**
  - Standar dokumen lama menyertakan 2 bullet: status non-PKP dan keabsahan dokumen komputerisasi tanpa tanda tangan basah.
  - Perintah Langkah B Butir 6 meminta kedua bullet ini dihapus total dari invoice.
- **Yang kulakukan:** Menghapus kedua bullet tersebut dari daftar catatan invoice.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Hapus permanen dari dokumen invoice sesuai arahan pemilik produk. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-26
- **Status:** Selesai (Diterapkan sesuai Perintah Langkah B Butir 7 & 8)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Invoice (`renderDocumentPdfInternal`, `buildInvoicePdfSpec`)
- **Apa yang bertentangan:**
  - Standar dokumen lama menampilkan instruksi bank dalam bentuk bullet teks dan kalimat Terbilang di luar blok terpisah.
  - Butir 7 meminta kotak "Detail Pembayaran" berbingkai sudut membulat dengan Terbilang di kiri dan info bank (grid label : nilai sejajar) di kanan, serta kontak konfirmasi finance pada bullet.
- **Yang kulakukan:** Mengimplementasikan kotak Detail Pembayaran dan memindahkan Terbilang ke dalam kotak tersebut, menghapus baris Terbilang luar yang duplikat, serta memperbarui kontak finance.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan kotak Detail Pembayaran modern sesuai spesifikasi. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-27
- **Status:** Aktif (Dicatat sesuai Perintah Prompt)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Invoice (`metaRows` vs Header `Ref :`)
- **Apa yang bertentangan:**
  - Blok metadata invoice menampilkan "Referensi SPK / Kontrak" dan "Referensi BAKP Acuan" selain "Referensi PO Klien", sementara header dokumen sudah menampilkan "Ref :" yang merujuk pada dokumen induk.
- **Yang kulakukan:** Mencatat potensi duplikasi informasi tanpa mengubah susunan metadata tersimpan.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Pertahankan seluruh referensi di metadata demi kelengkapan audit penagihan proyek. (Rekomendasi).
  - **Opsi B:** Hapus baris metadata yang nomornya sudah identik dengan `Ref :` header.
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-28
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen PDF (`addDocumentFooters`, `renderDocumentPdfInternal`, `company-profile-page.tsx`)
- **Apa yang bertentangan:**
  1. Pada tabel Detail Pembayaran invoice, label (*Nama Bank*, *Nomor Rekening*, *Atas Nama*, *Berita Transfer*) sebelumnya berbobot reguler. Pengguna meminta label ditebalkan (`fontBold`, `TEXT_DARK`) dan nilainya reguler (`fontRegular`, `TEXT_LABEL`) seragam dengan isi Terbilang.
  2. Footer sebelumnya memiliki pita/band biru navy gelap di dasar halaman. Pengguna meminta band navy tersebut dihapus total dan teks footer kiri digantikan dengan 3 icon media sosial interaktif (Instagram, LinkedIn, TikTok) yang memiliki anotasi tautan langsung ke URL profil, diikuti teks *Altvira Technology*. Di portal Super Admin tab Sosial Media Footer ditambahkan input *Tautan / URL Profil*.
  3. Garis batas tanda tangan di blok pengesahan kanan sebelumnya memiliki lebar tetap yang menyisakan celah ke margin kanan. Pengguna meminta garis ditarik memanjang hingga menyentuh tepi batas margin kanan halaman.
- **Yang kulakukan:**
  1. Mengubah perataan dan bobot label Detail Pembayaran menjadi bold serta nilainya reguler dengan spasi baris 12.5 pt.
  2. Menghapus pita navy gelap, menyematkan ikon vektor SVG medsos beranotasi `Link` (`URI`), dan menambahkan input link URL profil pada portal Super Admin.
  3. Menggeser dan menyelaraskan garis tanda tangan kanan dari `pageWidth - marginX - sigLineWidth` hingga tepat menyentuh margin kanan `pageWidth - marginX`.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan pembaruan detail pembayaran, footer sosmed interaktif, dan penjajaran garis tanda tangan ke margin kanan. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-29
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen PDF (`drawDocumentHeader`, `renderDocumentPdfInternal`, `PDF_LAYOUT_TOKENS`)
- **Apa yang bertentangan:**
  1. Teks kontak di sisi kiri header (alamat s.d. NPWP) sebelumnya memakai warna abu-abu `TEXT_LABEL`, sedangkan teks nomor dan referensi di kanan memakai warna hitam `TEXT_DARK`. Pengguna meminta seluruh teks kontak sisi kiri diseragamkan warnanya menjadi `TEXT_DARK`.
  2. Blok metadata kanan (tanggal, ref, proyek) sebelumnya mulai di tengah (`~247 pt`) dengan label berbobot reguler. Pengguna meminta blok kanan digeser/dipersempit ke sisi kanan serta labelnya dibuat tebal (`fontBold`) dengan warna yang sama dengan teks *Ditagihkan Kepada* (`TEXT_LABEL`).
  3. Standar lama dan fungsi format moneter menampilkan simbol mata uang (`Rp`). Pengguna meminta simbol mata uang dihapus pada semua angka nominal yang tertulis di dalam tabel dan blok subtotal.
  4. Kolom informasi bank pada tabel Detail Pembayaran sebelumnya berada di posisi relatif lebar kotak. Pengguna meminta kolom info bank digeser ke kanan sejajar persis dengan posisi awal teks blok subtotal (`totalBlockX`) tanpa menabrak batas margin kanan tabel.
  5. Pengguna meminta footer digeser sedikit lebih ke bawah namun tetap aman di atas batas margin bawah halaman dokumen.
- **Yang kulakukan:**
  1. Menyeragamkan warna teks kontak kiri header (alamat, email, telepon, NPWP) menjadi `TEXT_DARK`.
  2. Menggeser blok kanan metadata ke x `~300.6 pt` (`rightColW = 245 pt`), mengubah font label menjadi `fontBold` dengan warna `TEXT_LABEL` selaras *Ditagihkan Kepada*, serta melebarkan kolom kiri penerima.
  3. Mengimplementasikan fungsi `stripCurrencySymbol` pada render sel tabel dan baris blok subtotal sehingga angka nominal tampil murni dan bersih tanpa simbol `Rp`.
  4. Menyelaraskan posisi awal kolom info bank Detail Pembayaran ke `totalBlockX` sejajar vertikal dengan teks blok subtotal di atasnya, dengan sisa padding aman ~54 pt ke tepi kanan tabel.
  5. Menyesuaikan token layout footer (`footerLineY: 44`, `footerTextY: 32`, `bottomSafeY: 50`) sehingga footer bergeser turun 10 pt ke bawah secara proporsional.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan pembaruan warna header, pergeseran metadata, pembersihan simbol mata uang tabel/subtotal, penjajaran grid bank, dan penurunan posisi footer. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-30
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen PDF (`renderDocumentPdfInternal`, `drawDocumentHeader`)
- **Apa yang bertentangan:**
  1. Teks alamat dan kontak klien di blok kiri body sebelumnya berwarna abu-abu `TEXT_LABEL`, sementara nama klien dan nilai metadata blok kanan (e.g. tanggal) berwarna hitam `TEXT_DARK`. Pengguna meminta warna teks seluruh isi blok kiri dan kanan diseragamkan dengan warna nama/alamat klien (`TEXT_DARK`).
  2. Jarak antara garis pemisah header dan teks awal body dokumen (*Ditagihkan Kepada*, *Tanggal Terbit*, dst.) sebelumnya hanya 10 pt sehingga tampak rapat. Pengguna meminta penambahan spasi agar lebih lega.
  3. Kotak Keterangan dan kotak Detail Pembayaran sebelumnya memiliki sudut membulat (*border radius* 4 pt). Pengguna meminta seluruh tabel dan kotak/kolom pada dokumen memiliki sudut tajam/kaku (*rounded* 0).
  4. Pengguna menginstruksikan agar pembaruan ketebalan (`fontBold`) dan warna (`TEXT_LABEL`) pada label metadata body diterapkan ke seluruh dokumen administrasi yang ada (termasuk Kuitansi).
- **Yang kulakukan:**
  1. Mengubah warna seluruh baris penerima di blok kiri (nama klien, PIC, alamat) menjadi `TEXT_DARK` sehingga seragam sempurna dengan isi/nilai blok kanan (`TEXT_DARK`).
  2. Menambah spasi vertikal awal body dokumen menjadi 15 pt di bawah garis pemisah header (`y = separatorLineY - 15`) dan menyeimbangkan padding antar seksi agar dokumen tetap pas pada 1 halaman.
  3. Mengubah *border radius* kotak Keterangan dan Detail Pembayaran menjadi `0` (sudut tajam/kaku 90°) melalui `drawRoundedRect` (radius <= 0 merender `page.drawRectangle`).
  4. Menerapkan label tebal `fontBold` dengan warna `TEXT_LABEL` pada seluruh dokumen administrasi lain (termasuk cabang `hasMeta` Kuitansi).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan penyeragaman warna isi blok penerima/metadata, penambahan jeda header-body, sudut kaku kotak, dan penyeragaman label tebal seluruh dokumen. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-31
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Invoice & Dokumen Administrasi (`renderDocumentPdfInternal`, `buildInvoicePdfSpec`)
- **Apa yang bertentangan:**
  1. Teks nilai pada blok Detail Pembayaran (*Nama Bank*, *Nomor Rekening*, *Atas Nama*, *Berita Transfer*, dan *Terbilang*) serta teks bullet pada *Ketentuan Pembayaran* sebelumnya berwarna abu-abu `TEXT_LABEL`, sementara teks isi/nilai di tabel dan metadata atas berwarna hitam `TEXT_DARK`. Pengguna meminta seluruh teks nilai/isi yang masih berbeda diseragamkan ketebalan dan warnanya menjadi hitam `TEXT_DARK`.
  2. Judul dan baris pertama blok *Ketentuan Pembayaran* sebelumnya menempel dan menabrak garis batas bawah kotak *Detail Pembayaran* akibat jarak vertikal yang terlalu sempit (`y = pdBoxBottomY - 7`).
  3. Nilai/isi teks label *Terbilang* pada tabel Detail Pembayaran sebelumnya ditulis dalam Title Case / Proper Case ("Dua juta enam ratus rupiah"). Pengguna menginstruksikan secara khusus agar teks isi Terbilang wajib UPPERCASE / KAPITAL semua ("DUA JUTA ENAM RATUS RUPIAH").
- **Yang kulakukan:**
  1. Menyeragamkan seluruh label grid (label metadata, label subtotal, dan label detail pembayaran) menjadi `fontBold` dengan warna `TEXT_LABEL`, serta seluruh nilai/isi (nilai bank, nilai terbilang, teks bullet ketentuan pembayaran, teks isi keterangan) menjadi `fontRegular` dengan warna hitam `TEXT_DARK`.
  2. Memperbaiki jarak vertikal antara garis bawah kotak Detail Pembayaran dan judul Ketentuan Pembayaran menjadi lega dan proporsional (`y = pdBoxBottomY - 18`) serta menyesuaikan `bottomSafeY = 46` sehingga tidak saling menabrak dan dokumen tetap pas 1 halaman.
  3. Mengonversi string nilai/isi Terbilang pada Detail Pembayaran menjadi huruf kapital semua (`pd.terbilangText.toUpperCase()`).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan penyeragaman warna/tebal font, jeda aman ketentuan pembayaran, dan teks terbilang uppercase. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-32
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Kuitansi & Seluruh Dokumen Administrasi PDF (`renderDocumentPdfInternal`, `buildReceiptPdfSpec`, `buildClientPoPdfSpec`, `buildPaymentApprovalPdfSpec`)
- **Apa yang bertentangan:**
  1. Pada dokumen Kuitansi, setelah header belum terdapat baris apresiasi. Pengguna meminta baris abu (*chip background*) rata tengah berisi: `"Terima kasih telah memilih Altvira, {nama klien}"`.
  2. Nilai *Jumlah Diterima* sebelumnya memiliki garis hitam di atasnya dan terpisah dari *Terbilang*. Pengguna meminta garis hitam dihapus, nominal tetap tebal, serta *Jumlah Diterima* dan *Terbilang* dipindahkan ke tengah (rata tengah) dibungkus dalam satu kotak abu selebar konten. Tanda `# ... #` pada terbilang kuitansi dihapus.
  3. Nilai/isi teks label *Terbilang* diinstruksikan ditulis UPPERCASE / KAPITAL semua secara global di seluruh jenis dokumen.
  4. Ukuran kotak e-meterai sebelumnya 25x35 mm (71x99 pt). Pengguna meminta diubah menjadi ukuran standar **20x20 mm** (56.7 x 56.7 pt).
  5. Kalimat *"Dokumen ini diterbitkan secara resmi melalui sistem komputerisasi Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah"* sebelumnya tercetak pada catatan kuitansi/dokumen. Pengguna meminta kalimat ini dihapus secara global dari seluruh dokumen.
- **Yang kulakukan:**
  1. Menambahkan baris abu apresiasi kuitansi (`spec.appreciationBarText`) di bawah garis header dengan pembungkusan teks (*text wrap*) dan posisi rata tengah.
  2. Menghapus garis pemisah di atas Jumlah Diterima, membungkus Jumlah Diterima dan Terbilang (tanpa `# ... #`) dalam satu kotak abu `CHIP_BG` dengan teks rata tengah dan *auto-wrap*.
  3. Menerapkan konversi `.toUpperCase()` pada seluruh nilai terbilang secara global di generator dokumen.
  4. Mengubah ukuran kotak e-meterai menjadi 20x20 mm (`56.7 x 56.7 pt`) dengan label meterai proporsional di seluruh dokumen (termasuk SPK Project Charter).
  5. Menghapus kalimat klausul komputerisasi tanpa tanda tangan basah secara global dari `rawNotes` dan seluruh pembuat spesifikasi dokumen.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan baris apresiasi kuitansi, kotak gabungan abu jumlah & terbilang, terbilang uppercase global, kotak meterai 20x20 mm, dan penghapusan teks komputerisasi. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-33
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh Dokumen PDF (`renderDocumentPdfInternal`, `drawDocumentHeader`, `PDF_LAYOUT_TOKENS`)
- **Apa yang bertentangan:**
  1. Judul lengkap dokumen (misal *STATEMENT OF WORK (SOW)*, *SURAT PENAWARAN HARGA (QUOTATION)*, *JADWAL TERMIN PENAGIHAN PROYEK*, dsb.) pada baris abu di bawah header sebelumnya rata kiri (`x: marginX + 10`). Pengguna meminta judul lengkap ditulis rata tengah (*middle/center*).
  2. Total nilai dokumen pada Quotation (*Total Penawaran Harga* / *Total Nilai Termin*), Purchase Order Klien (*Total Nilai Purchase Order*), Purchase Order Vendor (*Total Nilai PO*), Payment Approval (*Total Biaya Diajukan*), dan JTPP (*Total Nilai Termin*) sebelumnya dirender sebagai blok subtotal terpisah di bawah tabel. Pengguna meminta total tersebut menjadi baris terakhir tabel, dengan label di kolom paling kiri dan nilai di kolom nominal terkait (*Biaya (IDR)*, *Subtotal (IDR)*, atau *Nominal (IDR)*).
  3. Ukuran font antar elemen body/isi dokumen sebelumnya beragam (8 pt, 8.5 pt, 9.5 pt, 10.5 pt). Pengguna menginstruksikan agar seluruh teks body/isi dokumen diseragamkan ukurannya menjadi sama menggunakan patokan ukuran isi label kanan invoice (`1 November 2026` = **9.5 pt**), kecuali teks nama instansi/perusahaan klien (tetap 10 pt) dan blok pengesahan/tanda tangan (tetap ukuran aslinya). Teks header dan footer tidak diganggu gugat.
- **Yang kulakukan:**
  1. Mengubah perataan teks judul lengkap dokumen pada baris abu di bawah header menjadi rata tengah sempurna (*middle/center*) dengan pembungkusan teks (*auto-wrap*) adaptif.
  2. Mengintegrasikan baris total pada dokumen Quotation, PO Klien, PO Vendor, Payment Approval, dan JTPP langsung ke dalam baris terakhir tabel berlatar abu `CHIP_BG` dengan teks tebal `fontBold`, label di kolom paling kiri, nilai rata kanan di kolom nominal terkait tanpa simbol `Rp`, serta menghapus blok subtotal terpisah di Zona E agar tidak terjadi duplikasi.
  3. Menyeragamkan ukuran font seluruh elemen body/isi dokumen (label metadata, alamat klien, teks tabel, header tabel, isi keterangan, detail pembayaran bank dan terbilang, catatan dan ketentuan) menjadi **9.5 pt**, mempertahankan ukuran nama klien (10 pt), blok tanda tangan (8.5/9.5 pt), serta header dan footer.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan judul lengkap baris abu rata tengah, baris total tabel terpadu pada Quotation/PO/PA/JTPP, dan penyeragaman ukuran font body 9.5 pt. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-34
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh Dokumen PDF (`renderDocumentPdfInternal`, `drawDocumentHeader`, `resolveDocTitleConfig`, `PDF_LAYOUT_TOKENS`)
- **Apa yang bertentangan:**
  1. Pada dokumen Kuitansi, jarak spasi before baris apresiasi kuitansi (*"Terima kasih telah memilih Altvira, {nama klien}"*) sebelumnya berbeda dengan spasi judul lengkap dokumen setelah header. Pengguna meminta spasi before disamakan persis dengan spasi Judul Lengkap Dokumen (`barTopMargin = 6 pt` dari garis pemisah header).
  2. Teks di dalam baris/highlight abu (*fullTitleBar*, baris apresiasi kuitansi, kotak Jumlah Diterima & Terbilang kuitansi) diminta memiliki perataan rata tengah (*align center*) horizontal dan vertikal terhadap kotak/barisnya.
  3. Nilai/besar spasi before tabel diminta disamakan dengan spasi after tabel, dengan rujukan nilai dari spasi after tabel (`tableSpacing = 10 pt`).
  4. Baris total perhitungan (*Total Penawaran Harga*, *Total Nilai Purchase Order*, *Total Nilai PO*, *Total Biaya Diajukan*, *Total Nilai Termin*) sebelumnya memiliki celah/gap putih pemisah dari baris tabel di atasnya. Pengguna meminta baris total digabungkan menyatu utuh dengan tabel tanpa terpisah spasi.
  5. Judul dokumen Purchase Order di header kanan sebelumnya memuat akronim *"PURCHASE ORDER (PO)"*. Pengguna meminta kata `(PO)` dihapus menjadi `"PURCHASE ORDER"`, serta ditambahkan Judul Lengkap Dokumen pada baris abu tepat setelah header berupa `"PURCHASE ORDER (PO) KLIEN"` untuk PO Klien dan `"PURCHASE ORDER (PO) VENDOR"` untuk PO Vendor.
  6. Kotak placeholder e-meterai sebelumnya berada di atas kolom nama penandatangan. Pengguna meminta kotak placeholder e-meterai digeser ke kiri hingga ujung kanannya sejajar dengan ujung kiri garis tipis tanda tangan (`colRightX`), serta digeser sedikit ke atas sehingga *align center* terhadap area kosong tanda tangan.
  7. Pada placeholder e-meterai: teks `"20 x 20 mm"` dihapus, nominal `"Rp10.000"` diganti menjadi `"10000"` dengan ukuran font lebih besar dari teks `"MATERAI ELEKTRONIK"`, serta seluruh teks diposisikan rata kanan bawah (*bottom right*) terhadap isi kotak placeholder.
  8. Warna highlight abu teks dan header tabel sebelumnya adalah abu-abu netral `#f3f4f6`. Pengguna meminta warnanya diganti dengan warna biru yang sama dengan icon medsos Altvira di footer (`BRAND_BLUE`), dengan opacity/tint yang diturunkan lembut (`rgb(238/255, 243/255, 253/255)`) sehingga teks hitam tetap terbaca dengan jelas dan kontras tinggi.
- **Yang kulakukan:**
  1. Menyamakan spasi before baris apresiasi kuitansi menjadi `barTopMargin = 6 pt` dari garis pemisah header.
  2. Menerapkan perataan *align center* (horizontal dan vertikal) pada seluruh baris/highlight teks (`fullTitleBar`, apresiasi kuitansi, kotak Jumlah Diterima & Terbilang).
  3. Menyeragamkan spasi before tabel dan spasi after tabel menjadi persis `tableSpacing = 10 pt`.
  4. Menyatukan baris total tabel ke garis bawah baris data terakhir (`rectTopY = lastRowBottomLineY; const rectBottomY = rectTopY - summaryRowH;`) tanpa celah/gap pemisah sehingga menjadi tabel yang utuh.
  5. Mengubah konfigurasi judul PO di header kanan menjadi `"PURCHASE ORDER"` dan menambahkan `fullTitleBar` `"PURCHASE ORDER (PO) KLIEN"` dan `"PURCHASE ORDER (PO) VENDOR"`.
  6. Menggeser placeholder e-meterai ke kiri (`mBoxX = colRightX - meteraiW`) sehingga tepi kanannya sejajar tepat dengan awal garis tipis tanda tangan, serta vertikal di tengah area kosong (`lineY + 6`).
  7. Menghapus teks `"20 x 20 mm"`, mengganti menjadi `"10000"` (font 9.5 pt bold), dan meratakan teks `"MATERAI"`, `"ELEKTRONIK"`, `"10000"` ke *bottom right* kotak placeholder. Format yang sama diselaraskan pada SPK Project Charter.
  8. Memperbarui warna `CHIP_BG` menjadi warna biru brand lembut `rgb(238 / 255, 243 / 255, 253 / 255)` yang harmonis dengan icon medsos di footer dan menjamin keterbacaan teks hitam dengan standar kontras WCAG AAA.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan pembaruan spasi kuitansi, align center highlight, spasi before/after tabel 10 pt, tabel total menyatu, judul PO & baris abu PO Klien/Vendor, posisi e-meterai bottom right, dan warna biru brand lembut `CHIP_BG`. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-35
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh Dokumen PDF (`renderDocumentPdfInternal`, `generateSpkProjectCharterPdf`, `PDF_LAYOUT_TOKENS`)
- **Apa yang bertentangan:**
  1. Pada kotak placeholder e-meterai: teks `"10000"` sebelumnya berukuran lebih pendek dibanding teks `"ELEKTRONIK"` di atasnya. Pengguna meminta teks `"10000"` diperbesar hingga lebarnya sama persis sepanjang teks `"ELEKTRONIK"`. Selain itu, posisi kotak placeholder sebelumnya sedikit terlalu rendah (`lineY + 6 pt`) dan diminta digeser sedikit ke atas hingga tepat *align center* terhadap area kosong tanda tangan.
  2. Pada dokumen Quotation, PO Klien, BAKP, UAT, dan BAST, spasi *before* dan *after* tabel sebelumnya berbeda dengan yang ada di invoice sehingga teks *Terbilang* (pada Quotation & PO Klien) maupun judul catatan (pada BAKP, UAT, BAST) menempel mepet ke garis penutup bawah tabel.
  3. Pada dokumen PO Vendor, Payment Approval, dan JTPP, spasi *before* dan *after* tabel sebelumnya juga berbeda dengan invoice sehingga teks *Terbilang* mepet dengan baris total tabel.
- **Yang kulakukan:**
  1. Menyesuaikan ukuran font nominal `"10000"` secara presisi (`valFontSize = elW / valUnitW`) sehingga panjang teks `"10000"` tepat sama sepanjang teks `"ELEKTRONIK"` di atasnya dan sejajar tegak lurus sempurna di sisi kiri dan kanan. Menggeser posisi vertikal kotak ke `lineY + 9.5 pt` sehingga simetris sempurna di tengah area tanda tangan (jarak ke garis bawah 9.5 pt, jarak ke teks atas 8.5 pt). Format yang sama diselaraskan pada SPK Project Charter.
  2. Menstandarkan spasi *before* tabel menjadi 12 pt (visual dari paragraf narasi maupun garis pemisah Zona B) dan spasi *after* tabel menjadi 12 pt (seperti kotak pada invoice).
  3. Menurunkan baseline teks *Terbilang* dan judul catatan pertama setelah tabel sebesar 8 pt (`y = tableBottomY - 20 pt`), sehingga jarak visual dari garis penutup bawah tabel ke bagian atas huruf teks adalah tepat 12.5 pt (lega, seimbang, dan tidak lagi mepet dengan tabel).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan teks 10000 sepanjang ELEKTRONIK, posisi kotak meterai align center vertikal, serta penyeragaman spasi before & after tabel invoice pada seluruh dokumen. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-36
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Terbaru)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh Dokumen PDF (`renderDocumentPdfInternal`, `buildClientPoPdfSpec`)
- **Apa yang bertentangan:**
  1. Pada dokumen Quotation, PO Klien, BAKP, UAT, dan BAST, spasi *before* tabel terlihat lebih besar dibanding spasi *after* tabel karena spasi *after* paragraf narasi di atasnya bercampur dengan spasi *before* tabel. Pengguna meminta spasi *after* paragraf untuk tiap teks yang di bawahnya terdapat tabel dibuat menjadi 0.
  2. Seluruh nilai/isi dari label *Status Pengesahan*, *Status Verifikasi*, *Hasil Pengujian*, dan *Disetujui Pada* sebelumnya ditulis reguler `fontRegular`. Pengguna meminta nilai/isi ke-4 label ini ditulis dengan font tebal (`fontBold`).
  3. Pada dokumen PO Klien, posisi label *Status Verifikasi* sebelumnya berada di tengah kolom kanan (di atas *Referensi Quotation* dan *Proyek Terkait*). Pengguna meminta label *Status Verifikasi* dipindahkan ke bawah *Proyek Terkait* (menjadi urutan terakhir pada label sebelah kanan).
- **Yang kulakukan:**
  1. Menghilangkan spasi *after* paragraf (`space-after = 0`) untuk paragraf yang tepat di bawahnya memiliki tabel (`hasTableBelow`), sehingga jarak visual dari teks paragraf ke garis atas header tabel (~11.3 pt) kini simetris dan seimbang sempurna dengan jarak visual spasi *after* tabel (~12.5 pt).
  2. Menambahkan logika deteksi `isBoldMetaValue` untuk label *Status Pengesahan*, *Status Verifikasi*, *Hasil Pengujian*, dan *Disetujui Pada* di seluruh cabang metadata Zona B (baik 2-kolom maupun 1-kolom) sehingga nilai/isinya di-wrap dan di-render menggunakan `fontBold` dengan warna `TEXT_DARK`.
  3. Memindahkan posisi *Status Verifikasi* pada `buildClientPoPdfSpec` menjadi urutan terakhir setelah *Proyek Terkait*.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan spasi after paragraf 0 sebelum tabel, font tebal nilai 4 label status, dan pemindahan Status Verifikasi PO Klien ke posisi paling bawah. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak

---

### ID: K-37
- **Status:** Selesai (Diterapkan pada Langkah 2)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh Dokumen PDF yang memuat gambar tanda tangan digital (`renderDocumentPdfInternal` di `src/lib/pdf-generator.ts:2867`)
- **Apa yang bertentangan:**
  - Pada blok tanda tangan sebelah kanan, teks label penandatangan ("Hormat kami, Altvira Technology" / "Diterima oleh, Altvira Technology") digambar di atas area tanda tangan.
  - Saat gambar tanda tangan digital (`rightSigImg` / `company.signer_signature_path`) dimuat dengan dimensi tinggi ~40–48 pt, gambar tersebut ditempatkan pada koordinat `y: lineY + 6` (tepat di atas garis nama penandatangan). Jika jarak vertikal antara teks "Altvira Technology" dan garis nama (`lineY`) hanya ~42 pt, bagian atas gambar tanda tangan menimpa (*overlap*) teks "Altvira Technology".
- **Yang kulakukan:**
  - Menyesuaikan alokasi ruang tanda tangan vertikal secara cerdas: bila terdapat gambar tanda tangan digital (`hasSigImg = Boolean(rightSigImg || leftSigImg || thirdSigImg)`), alokasi ruang diperluas dari 42/46 pt menjadi **58 pt** (`defaultSigSpace = hasSigImg ? 58 : 46`).
  - Penambahan ruang ini memberikan jarak bersih vertikal 10–12 pt antara bagian bawah teks "Altvira Technology" dan batas atas gambar tanda tangan, sehingga tanda tangan tampil proporsional tanpa pernah menimpa teks.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Tingkatkan tinggi ruang bebas blok tanda tangan menjadi 58 pt khusus saat gambar tanda tangan terdeteksi. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-38
- **Status:** Selesai (Diterapkan pada Langkah 2)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Ekspor PDF Daftar Invoice Penagihan & Piutang (`src/features/invoicing/invoicing-page.tsx:699-707`)
- **Apa yang bertentangan:**
  - Pada header tabel dokumen PDF ekspor daftar invoice, teks judul kolom "Jatuh Tempo" terpotong menjadi "Jatuh T..." pada pembaca PDF tertentu karena rasio kolom `widthRatio: 0.12` (~59.18 pt) terlalu sempit untuk menampung teks "Jatuh Tempo" (lebar aktual 60.12 pt + padding sel = ~68.12 pt).
- **Yang kulakukan:**
  - Menyesuaikan proporsi kolom di `src/features/invoicing/invoicing-page.tsx:699-707` dan fixture terkait:
    - No. Invoice: `0.15` (dari 0.16)
    - Tanggal: `0.11` (dari 0.12)
    - Jatuh Tempo: `0.14` (dari 0.12 -> lebar 69.05 pt, muat utuh)
    - Proyek / Klien: `0.23` (dari 0.24)
    - Total: `0.14` (dari 0.13)
    - Sisa: `0.13` (tetap)
    - Status: `0.10` (tetap)
  - Hasil cetak di PDF dan PNG kini menampilkan teks "Jatuh Tempo" secara utuh dan proporsional tanpa terpotong maupun menempel.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Seimbangkan rasio kolom tabel invoice agar teks "Jatuh Tempo" muat utuh dalam 1 baris. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-39
- **Status:** Selesai (Diterapkan pada Langkah 2)
- **Jenis:** `standar-vs-sistem`
- **Dokumen terdampak:** Seluruh pemanggil pembuat PDF di sistem (`src/`)
- **Apa yang bertentangan:**
  - Sesuai Aturan 5, seluruh judul dokumen di sistem telah ditelusuri. Ditemukan 4 judul dokumen panjang di sistem yang sebelumnya belum terdaftar di tabel pemetaan tunggal dan memiliki lebar melebihi batas "PURCHASE ORDER (PO)" (261.56 pt).
- **Yang kulakukan:**
  - Mendaftarkan ke-4 judul dokumen tersebut ke dalam `DOCUMENT_TITLE_MAPPINGS` dan helper `findDocumentTitleMapping` dengan judul header pendek resmi (maksimal 2 kata, <= 16 karakter, bebas tabrakan):
    1. `DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL` -> `headerTitle: "PENGAJUAN PA"`, `fullTitle: "DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL"`
    2. `DAFTAR PURCHASE ORDER PEMBELIAN VENDOR` -> `headerTitle: "REKAP PO"`, `fullTitle: "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR"`
    3. `PERHITUNGAN BAGI HASIL PROYEK` -> `headerTitle: "BAGI HASIL"`, `fullTitle: "PERHITUNGAN BAGI HASIL PROYEK"`
    4. `DOKUMEN PROYEK` -> `headerTitle: "DOKUMEN PROYEK"`, `fullTitle: "DOKUMEN PROYEK"`
- **Tabel Audit Judul Dokumen Seluruh Sistem:**

| No | Judul Sumber Dokumen | Lokasi Pemanggil | Lebar 22 pt (pt) | Relatif thd Batas (261.56 pt) | Status Pemetaan | Judul Header Terdaftar |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- |
| 1 | `DAFTAR MASTER PROYEK DAN PENUGASAN TIM` | `projects-page.tsx` | 506.18 | 193.5% | Terdaftar | `PROYEK TIM` |
| 2 | `DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA` | `admin-approvals-page.tsx` | 557.74 | 213.2% | Terdaftar | `PAYMENT APPROVAL` |
| 3 | `CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES` | `admin-dashboard.tsx` | 499.71 | 191.1% | Terdaftar | `BACKUP JURNAL` |
| 4 | `LAPORAN ANGGARAN VS REALISASI PROYEK` | `budget-page.tsx` | 468.27 | 179.0% | Terdaftar | `BUDGETING` |
| 5 | `DAFTAR INVOICE PENAGIHAN & PIUTANG` | `invoicing-page.tsx` | 436.41 | 166.8% | Terdaftar | `DAFTAR INVOICE` |
| 6 | `DAFTAR MASTER PELANGGAN/KLIEN` | `parties-master-page.tsx` | 363.92 | 139.1% | Terdaftar | `DAFTAR KLIEN` |
| 7 | `DAFTAR MASTER VENDOR PEMASOK` | `parties-master-page.tsx` | 362.58 | 138.6% | Terdaftar | `DAFTAR VENDOR` |
| 8 | `DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL` | `user-payments-page.tsx:430` | 556.42 | 212.7% | Terdaftar | `PENGAJUAN PA` |
| 9 | `DAFTAR PURCHASE ORDER PEMBELIAN VENDOR` | `po-page.tsx:362` | 536.82 | 205.2% | Terdaftar | `REKAP PO` |
| 10 | `PERHITUNGAN BAGI HASIL PROYEK {KODE}` | `profit-sharing-page.tsx:271` | ~450–580 | > 170% | Terdaftar | `BAGI HASIL` |
| 11 | `DOKUMEN PROYEK — {KATEGORI}` | `buyer-portal-page.tsx:309` | ~390–420 | > 150% | Terdaftar | `DOKUMEN PROYEK` |
| 12 | `SURAT PENAWARAN HARGA (QUOTATION)` | `project-detail-page.tsx` | 126.94 | 48.5% | Transaksi | `QUOTATION` |
| 13 | `USER ACCEPTANCE TEST (UAT) CHECKLIST` | `project-detail-page.tsx` | 42.13 | 16.1% | Transaksi | `UAT` |
| 14 | `BERITA ACARA SERAH TERIMA (BAST)` | `project-detail-page.tsx` | 59.22 | 22.6% | Transaksi | `BAST` |
| 15 | `BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)` | `project-detail-page.tsx` | 61.67 | 23.6% | Transaksi | `BAKP` |
| 16 | `STATEMENT OF WORK (SOW)` | `project-detail-page.tsx` | 51.46 | 19.7% | Transaksi | `SOW` |
| 17 | `JADWAL TERMIN PENAGIHAN PROYEK` | `project-detail-page.tsx` | 55.02 | 21.0% | Transaksi | `JTPP` |
| 18 | `FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL)` | `pdf-generator.ts:4500` | 227.99 | 87.2% | Transaksi | `PAYMENT APPROVAL` |
| 19 | `PURCHASE ORDER (PO) KLIEN` | `pdf-generator.ts:4406` | 209.00 | 79.9% | Transaksi | `PURCHASE ORDER` |
| 20 | `PURCHASE ORDER (PO PEMBELIAN VENDOR)` | `po-page.tsx:252` | 209.00 | 79.9% | Transaksi | `PURCHASE ORDER` |
| 21 | `INVOICE` | `pdf-generator.ts:4184` | 89.36 | 34.2% | Transaksi | `INVOICE` |
| 22 | `KUITANSI` | `pdf-generator.ts:4295` | 101.90 | 39.0% | Transaksi | `KUITANSI` |

- **Opsi penyelesaian permanen:**
  - **Opsi A:** Daftarkan 4 pemetaan judul resmi ke `DOCUMENT_TITLE_MAPPINGS`. (Diterapkan).
- **Rekomendasi:** **Opsi A**.
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-40
- **Status:** Selesai (Diverifikasi Bebas Tabrakan pada Langkah 1)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Dokumen dengan Judul Header `PAYMENT APPROVAL` (`DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA` & `FORM PERSETUJUAN PEMBAYARAN`)
- **Apa yang diperiksa:**
  - Sesuai Aturan 7: Pemeriksaan khusus teks `"PAYMENT APPROVAL"` (judul terpanjang pada 7 entri pemetaan, 16 karakter).
  - Lebar teks `"PAYMENT APPROVAL"` pada font Helvetica-Bold ukuran 22 pt dihitung:
    - Dengan kerning AFM aktif: **227.99 pt** (87.2% dari batas maksimal 261.56 pt).
    - Tanpa kerning: **235.91 pt** (90.2% dari batas maksimal 261.56 pt).
  - Koordinat posisi judul rata kanan pada halaman:
    - `titleX` = `pageWidth - marginX - titleW` = `595.28 - 51.02 - 227.99` = **316.27 pt**.
  - Batas ujung kanan tinta wordmark logo Altvira:
    - `wmRightX` = `marginX + iconW + gap + wmW` = `51.02 + 50.53 + 8 + 110.87` = **220.42 pt**.
  - Ruang bebas (*clearance gap*) antara wordmark dan judul:
    - Jarak bersih = `316.27 - 220.42` = **95.85 pt** (~3.38 cm ruang kosong).
  - **Kesimpulan:** Judul `"PAYMENT APPROVAL"` **TIDAK MENABRAK** ikon maupun wordmark Altvira. Tersedia jarak bebas 95.85 pt yang aman dan estetis, sehingga teks tidak perlu diubah dan ukuran font 22 pt tidak perlu diperkecil.
- **Rekomendasi:** Pertahankan teks `"PAYMENT APPROVAL"` dan ukuran font 22 pt saat ini.
- **Perlu keputusanku?** tidak (Telah diverifikasi lulus & aman)

---

### ID: K-41
- **Status:** Selesai (Diterapkan pada Langkah 2)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh 9 dokumen Siklus Akuntansi & Laporan (`Jurnal Umum`, `Jurnal Penyesuaian & Koreksi`, `Buku Besar`, `Neraca Saldo`, `Laporan Laba Rugi`, `Laporan Perubahan Ekuitas`, `Laporan Posisi Keuangan / Neraca`, `Laporan Arus Kas`, `Laporan Keuangan Lengkap`) di `src/lib/pdf-generator.ts` & `src/features/accounting/`
- **Apa yang bertentangan:**
  - Sebelumnya, dokumen di halaman Siklus Akuntansi & Laporan memakai komponen header dan footer mandiri yang terpisah dari dokumen administrasi (Invoice, JTPP, Kuitansi, UAT, PO).
  - Footer menempel mengambang di bawah isi tabel dan tidak berada di dasar halaman; halaman 2 dan seterusnya tidak memiliki header; footer hanya muncul di halaman terakhir.
  - Antar-blok akun di Buku Besar tidak berjarak dan tabel akun sebelumnya menempel ke kartu akun berikutnya; kartu akun terpisah dari tabelnya di batas halaman.
  - Subjudul dan periode diulang-ulang di beberapa tempat (misalnya Laba Rugi menampilkan judul yang sama dua kali).
  - Terdapat perbedaan warna, ukuran font, padding, dan perataan nominal Debit/Kredit antara dokumen akuntansi dan dokumen administrasi.
- **Yang kulakukan:**
  - Mengharmonisasikan seluruh 9 dokumen akuntansi ke mesin generator dokumen administrasi (`generateDocumentPdf` dan `buildDocumentPdfSpec`).
  - Mengintegrasikan penentuan judul dokumen melalui tabel pemetaan tunggal `DOCUMENT_TITLE_MAPPINGS`.
  - Memindahkan subjudul dan periode ke blok metadata info (Zona B) bergaya UAT dan baris biru Judul Lengkap, menghilangkan duplikasi judul kedua.
  - Menempatkan footer administrasi resmi di dasar setiap halaman pada dokumen multi-halaman (`Hal. x / y`, ikon sosial, legal, dan cap waktu otomatis).
  - Memperbaiki layout Buku Besar dengan pemisah antar akun yang proporsional, pencegahan pemotongan kartu dari tabelnya di batas halaman, serta perataan vertikal sel yang rapi.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Satukan semua dokumen akuntansi ke mesin kerangka dokumen administrasi resmi Altcycles. (Diterapkan).
  - **Opsi B:** Pertahankan generator terpisah dan perbaiki bug satu per satu. (Rentan regresi & duplikasi kode).
- **Rekomendasi:** **Opsi A** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-42
- **Status:** Selesai (Diterapkan pada Langkah 2 Polish)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** `Jurnal Umum`, `Jurnal Penyesuaian`, `Buku Besar`, `Neraca Saldo`, dan seluruh Laporan Keuangan di `src/lib/pdf-generator.ts` & `src/features/accounting/journals-page.tsx`
- **Apa yang bertentangan:**
  - Kolom PDF Jurnal Umum & Penyesuaian sebelumnya mencantumkan `No. Jurnal`, tidak sesuai dengan format tabel jurnal umum standar akuntansi di aplikasi (Tanggal, Deskripsi, Ref, Debit, Kredit) dan memo/keterangan transaksi tidak muncul di tiap baris.
  - Kolom Debit, Kredit, dan Saldo Berjalan di Buku Besar terpotong/terbungkus ke dua baris pada nominal bernilai puluhan/ratusan juta rupiah.
  - Headline nama akun dan saldo akhir di atas tabel Buku Besar memiliki spasi vertikal tidak seimbang terhadap baris highlight biru.
  - Kolom No. Akun dan Nama Akun pada Neraca Saldo terlalu lebar sehingga kolom Debit dan Kredit terasa sempit.
  - Judul klasifikasi akun dan ringkasan berhuruf kapital (UPPERCASE) pada Laporan Laba Rugi, Perubahan Ekuitas, Neraca, dan Arus Kas dicetak dengan font reguler, bukan font tebal (bold).
- **Yang kulakukan:**
  - Menghapus kolom `No. Jurnal` pada PDF Jurnal Umum & Penyesuaian; menyusun kolom menjadi: `Tanggal` (0.13), `Deskripsi` (0.47, memuat akun debit, akun kredit indent, dan keterangan memo), `Ref` (0.08), `Debit` (0.16), dan `Kredit` (0.16); menghilangkan garis horizontal intra-transaksi sehingga tampilan bersih seperti buku harian jurnal standar.
  - Memperlebar kolom moneter Buku Besar (`Debit` 0.17, `Kredit` 0.17, `Saldo Berjalan` 0.18) sehingga nominal panjang muat utuh satu baris tanpa terpotong.
  - Menyeimbangkan spasi before dan after vertikal headline kartu akun/baris biru di atas tabel secara global (`align center` vertikal).
  - Menyempitkan kolom `No. Akun` (0.11) dan `Nama Akun` (0.43) pada Neraca Saldo, melenggangkan kolom `Debit` (0.23) dan `Kredit` (0.23).
  - Mengimplementasikan `isRowUppercase` pada mesin render tabel agar seluruh baris teks dan nilai moneter ber-style UPPERCASE dicetak tebal (`fontBold`).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan susunan kolom jurnal akuntansi standar, pelebaran kolom moneter, vertikal alignment seimbang, dan font tebal baris UPPERCASE. (Diterapkan).
- **Rekomendasi:** **Opsi A** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-43
- **Status:** Selesai (Diterapkan pada Tahap 1 Bagian A)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen bertabel di PDF Altcycles (Daftar Pengajuan Pembayaran, Laporan Anggaran Proyek, Master Vendor, Master Klien, Katalog Produk & Layanan, Daftar Invoice, Daftar PO Vendor, Master Proyek & Termin, Bagi Hasil, serta Dokumen Proyek SOW/BAKP/UAT/BAST) di `src/lib/pdf/` dan fitur terkait
- **Apa yang bertentangan:**
  - Header kolom pada tabel PDF saling menimpa, teks keluar dari batas area konten/tabel, alokasi rasio kolom tidak menjumlahkan 1.00 (100%), dan kolom moneter/persentase rata kanan menyebabkan teks bergeser mundur menimpa kolom sebelumnya pada mode EN karena label bahasa Inggris lebih panjang.
  - Terdapat pilihan kata ganda yang ditandai karakter slash (`/`) pada judul header kolom (misal: "Tanggal Transfer / Pembayaran", "Deskripsi Barang / Jasa", "Perusahaan / PIC", "Module / Scope of Work").
  - Pesan tabel kosong (*empty state*) pada mode EN masih berbahasa Indonesia dan tidak rata tengah di seluruh lebar konten.
  - Jarak tabel ke blok pengesahan ("Hormat kami" & TTD) terlalu mepet.
- **Tabel Hasil Audit Kolom Bermasalah:**

| Dokumen | Bahasa | Kolom Bermasalah | Gejala | Perbaikan | Status |
| :--- | :---: | :--- | :--- | :--- | :---: |
| Daftar Pengajuan Pembayaran | ID | Tanggal Transfer / Pembayaran, No & Tanggal, Pemohon | Lebar 8% (39.5pt) terpotong di tepi kanan; No & Tanggal dan Pemohon menempel; ada karakter slash `/` | Konfigurasi kolom terpusat 100%: 0.18, 0.15, 0.26, 0.16, 0.11, 0.14; label tunggal "Tanggal Transfer" | Selesai |
| Payment Approvals Report | EN | Transfer / Payment Date, Requester, No. & Date | Header Transfer Date terpotong kanan; label menimpa kolom status; ada karakter slash `/` | Konfigurasi kolom EN 100%: 0.18, 0.15, 0.26, 0.16, 0.11, 0.14; label tunggal "Transfer Date" | Selesai |
| Laporan Anggaran Proyek | ID | Serapan (%), Sisa Anggaran, Realisasi | Lebar 8% rata kanan menyebabkan teks mundur menimpa Sisa Anggaran | Rasio baru 100%: 0.27, 0.17, 0.16, 0.16, 0.12, 0.12; perataan Serapan (%) center dengan bounding aman | Selesai |
| Project Budgeting Report | EN | Budget Ceiling, Posted Realization, Remaining Budget, Absorption (%) | Label EN panjang ("Absorption (%)" 14 char) menimpa kolom sebelumnya hingga -25.5pt | Rasio baru 100%: 0.27, 0.17, 0.16, 0.16, 0.12, 0.12; bounding `drawX >= colX + 4`; auto-scaling font header bila perlu | Selesai |
| Master Vendor | ID | PIC / Kontak, Bank & Rekening | Rasio integer (12 total); terdapat karakter slash `/` di header | Rasio dinormalisasi 100%: 0.12, 0.28, 0.26, 0.22, 0.12; label "Kontak PIC" tanpa slash | Selesai |
| Suppliers & Vendors List | EN | PIC Contact, Bank Account | Header bertabrakan saat kontak panjang | Rasio 100%; token panjang dipecah aman via `wrapTextByWidth` | Selesai |
| Master Pelanggan / Klien | ID | Perusahaan / PIC | Rasio 12.5; terdapat karakter slash `/` | Rasio dinormalisasi 100%: 0.12, 0.28, 0.26, 0.22, 0.12; label "Perusahaan PIC" tanpa slash | Selesai |
| Clients & Customers List | EN | Client Name, PIC Contact, Tax ID | Alokasi tidak proporsional | Rasio terstandar 100%: 0.12, 0.30, 0.26, 0.20, 0.12 | Selesai |
| Katalog Produk & Layanan | ID | Nama Layanan / Produk | Terdapat karakter slash `/`; rasio integer 12 | Rasio 100%: 0.12, 0.32, 0.18, 0.10, 0.16, 0.12; label "Nama Layanan" tanpa slash | Selesai |
| Official Catalog | EN | Service Name, Base Rate (IDR) | Alokasi tarif dasar mepet | Rasio terstandar 100%: 0.12, 0.32, 0.18, 0.10, 0.16, 0.12 | Selesai |
| PO Pembelian Vendor | ID & EN | Deskripsi Barang / Jasa, Item / Service Description | Terdapat karakter slash `/` | Diseragamkan menjadi "Deskripsi Barang" (ID) dan "Item Description" (EN) tanpa slash | Selesai |
| SOW / BAKP / UAT / BAST | ID & EN | Module / Scope of Work, Deliverable / Work Component, Fitur / Modul, Objek / Komponen Serah Terima, Format / Media | Terdapat karakter slash `/` pada seluruh header tabel dokumen proyek klien | Diseragamkan menjadi 1 kata/frasa pasti tanpa slash: "Lingkup Pekerjaan", "Komponen Pekerjaan", "Modul", "Komponen Serah Terima", "Format Media" | Selesai |
| Empty State Seluruh Tabel | EN | Baris kosong | Teks masih berbahasa Indonesia ("Tidak ada transaksi pada periode ini") | Dilokalisasi dinamis mengikuti `spec.language` ("No transactions in this period" pada EN) dan rata tengah penuh | Selesai |
| Blok Pengesahan Seluruh Dokumen | ID & EN | Jarak tabel ke pengesahan | Jarak terlalu mepet (hanya 4pt) | Diberikan jarak proporsional 14pt (`y -= 14`) sebelum blok pengesahan | Selesai |

- **Yang kulakukan:**
  1. Membuat berkas konfigurasi tunggal kolom tabel PDF `src/lib/pdf/pdf-table-columns.ts` dengan total rasio tepat 1.00 (100%), judul header 1 baris, dan eliminasi seluruh slash (`/`).
  2. Mengintegrasikan mesin render `pdf-engine.ts` dengan penyesuaian font header otomatis (auto-scaling hingga 7.2pt), pembungkusan token panjang (`wrapTextByWidth`), bounding `drawX` batas kiri (`Math.max(colX + 4, ...)`), lokalisasi pesan kosong, dan jarak blok pengesahan 14pt.
  3. Menambahkan tes otomatis `tests/unit/document-table-collision.test.ts` yang menguji bounding box sel, non-intersection sel sebaris, rasio 100%, serta skenario fixture ekstrem terburuk di ID dan EN.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Standardisasi melalui konfigurasi kolom terpusat dan perbaikan mesin tabel bersama. (Diterapkan).
- **Rekomendasi:** **Opsi A** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-44
- **Status:** Selesai (Diterapkan pada Item 1: Font Header Seragam & Landscape)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** `Daftar Pengajuan Pembayaran`, `Laporan Anggaran vs Realisasi Proyek`, `Daftar Invoice Penagihan & Piutang`
- **Apa yang bertentangan:**
  - Font header kolom pada dokumen dengan kolom banyak/lebar sebelumnya menyusut (*shrink-to-fit* turun ke 8.4–8.8pt atau 7.2pt) pada mode Portrait agar muat, sehingga tidak seragam dengan header kolom lain yang berukuran token 9.5pt.
- **Yang kulakukan:**
  - Menghapus pengecilan font (*shrink-to-fit*) otomatis di seluruh mesin PDF `src/lib/pdf/pdf-engine.ts`; seluruh header kolom wajib memakai font ukuran tetap 9.5pt bold seragam di semua dokumen.
  - Menambahkan dukungan orientasi `landscape` (`isLandscape`, `pageWidth = 841.89`, `pageHeight = 595.28`, `contentWidth = 769.89`) pada `PdfDocumentSpec` dan generator PDF.
  - Menetapkan orientasi `landscape` secara deterministik pada dokumen: `DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL & TIM`, `LAPORAN ANGGARAN VS REALISASI PROYEK`, dan `DAFTAR INVOICE PENAGIHAN & PIUTANG`.
  - Memastikan pratinjau browser dan dialog cetak mengikuti orientasi landscape melalui geometri MediaBox PDF `[841.89, 595.28]` tanpa mengandalkan setelan manual pengguna.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan landscape pada dokumen multi-kolom padat dan kunci seluruh font header di 9.5pt seragam. (Diterapkan).
- **Rekomendasi:** **Opsi A** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-45
- **Status:** Selesai (Diterapkan pada Item 2: Hapus Kolom Status Master Data di PDF)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Dokumen Master Data (`Daftar Vendor`, `Daftar Klien / Pelanggan`, `Katalog Produk & Layanan`) di `src/lib/pdf/pdf-table-columns.ts`, `vendor-tab-content.tsx`, `customer-tab-content.tsx`, `product-service-tab-content.tsx`
- **Apa yang bertentangan:**
  - Kolom "Status" (Aktif/Nonaktif) pada PDF master data memakan ruang horizontal yang berharga sehingga data teks panjang seperti email PIC terpotong/terpecah baris (`mizzulislam.id@gmail.c / om`).
  - Di sisi lain, pada blok metadata atas (Zona B) dokumen master data, masih tercantum baris ringkasan: `"Status Vendor: 1 Aktif, 0 Nonaktif"` dan `"Status Klien: 4 Aktif, 0 Nonaktif"`.
- **Yang kulakukan:**
  - Menghapus kolom "Status" dari konfigurasi kolom PDF master data dan dari data row yang dikirimkan ke generator PDF (bukan sekadar disembunyikan via CSS).
  - Mendistribusikan ulang lebar kolom yang tersisa menjadi 100% sehingga kontak email PIC muat utuh tanpa terputus.
  - Mempertahankan seluruh baris data (baik status aktif maupun nonaktif tetap tercetak lengkap).
  - Mempertahankan kolom Status pada tabel UI aplikasi serta ekspor Excel dan CSV.
  - Menjaga baris ringkasan info status atas tetap utuh pada tahap ini sesuai aturan, dan mencatatnya sebagai opsi keputusan pengguna.
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Pertahankan baris ringkasan status di info atas sebagai statistik rekapitulasi entitas aktif/nonaktif meskipun kolom status pada tabel ditiadakan.
  - **Opsi B:** Hapus baris ringkasan status di info atas agar selaras dengan tabel tanpa kolom status.
- **Rekomendasi:** **Opsi A** (atau Opsi B bila pengguna ingin menyembunyikannya juga).
- **Perlu keputusanku?** ya (Untuk baris ringkasan status di blok info atas Zona B)

---

### ID: K-46
- **Status:** Selesai (Diterapkan pada Tahap 2 Bagian B Item 2)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** `Daftar Vendor`, `Daftar Klien / Pelanggan`, `Katalog Produk & Layanan`
- **Apa yang bertentangan:**
  - Judul PDF bahasa Inggris sebelumnya bervariasi dan belum terstandar batas 2 kata / 16 karakter: Vendor (`SUPPLIERS & VENDORS DIRECTORY`), Klien (`OFFICIAL CLIENTS & CUSTOMERS DIRECTORY`), dan Katalog (`OFFICIAL ALTVIRA PRODUCTS & SERVICES CATALOG`).
  - PDF Klien versi Indonesia sebelumnya menggunakan kata `"DAFTAR MASTER PELANGGAN RESMI"` yang belum sesuai pemetaan final (`DAFTAR KLIEN` | `DAFTAR PELANGGAN/KLIEN`).
- **Yang kulakukan:**
  - Menetapkan pemetaan judul EN resmi: Vendor (`headerTitle: "VENDOR LIST"`, `fullTitle: "SUPPLIER VENDOR LIST"`), Klien (`headerTitle: "CLIENT LIST"`, `fullTitle: "CUSTOMER / CLIENT LIST"`), dan Katalog (`headerTitle: "OFFICIAL CATALOG"`, `fullTitle: "ALTVIRA OFFICIAL PRODUCT & SERVICE CATALOG"`).
  - Menyelaraskan PDF Klien versi Indonesia ke `DAFTAR KLIEN` (header) dan `DAFTAR PELANGGAN/KLIEN` (baris biru).
  - Melokalisasi label "Tanggal Dokumen" otomatis pada Zona B menjadi "Document Date" jika bahasa aktif adalah Inggris (`spec.language === "en"`).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan pemetaan judul EN & ID terstandar. (Diterapkan).
- **Rekomendasi:** **Opsi A** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-47
- **Status:** Selesai (Diterapkan pada Tahap 2 Bagian B Item 1, 3, 4)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh menu `ExportDownloadMenu` dan `DocumentDownloadMenu`, tabel Rekening Bank Vendor, dan sel data tabel
- **Apa yang bertentangan:**
  - Deskripsi pilihan format unduh sebelumnya bertele-tele dan melebihi 3 kata ("Buku kerja spreadsheet lengkap", "Tata letak siap cetak & arsip resmi A4", dll).
  - Rekening bank vendor di tabel sebelumnya digabung 1 baris dengan pemisah " - " tanpa pembedaan warna nomor rekening vs nama bank.
  - Sebagian sel tabel pada halaman konfigurasi admin masih menggunakan font tebal (`font-bold` / `font-semibold`) untuk data kode/nomor biasa.
- **Yang kulakukan:**
  - Menstandarisasi deskripsi format unduh maksimal 3 kata di id dan en: Excel (id: "Data & rumus" | en: "Spreadsheet"), PDF (id: "Siap cetak" | en: "Print-ready"), CSV (id: "Data mentah" | en: "Raw data"), Word (id: "Dapat disunting" | en: "Editable").
  - Mengatur kolom Rekening Bank menjadi 2 baris (Baris 1 nomor rekening teks utama, Baris 2 nama bank teks sekunder abu `text-muted-foreground`), menghapus tanda pemisah " - " di PDF, serta menerapkan warna sekunder `TEXT_MUTED` pada baris kedua di PDF.
  - Merapikan tebal font isi sel tabel menjadi `font-medium` / `font-normal` (bold hanya untuk header kolom, baris total/summary, dan judul).
- **Opsi penyelesaian permanen:**
  - **Opsi A:** Terapkan deskripsi ringkas format unduh <= 3 kata, rekening bank 2 baris terpisah dengan warna sekunder, dan isi tabel reguler/medium. (Diterapkan).
- **Rekomendasi:** **Opsi A** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

### ID: K-48
- **Status:** Selesai (Diterapkan sesuai Arahan Pengguna Opsi B: Direct Download)
- **Jenis:** `standar-vs-layout`
- **Dokumen terdampak:** Seluruh dokumen PDF (`drawSocialMediaFooters`, `downloadPdfBytes`, `pdf-download.ts`, `pdf-engine.ts`)
- **Apa yang bertentangan:**
  - Ikon sosial media di footer dokumen sebelumnya melorot turun (titik tengah 1.37 pt di bawah teks, dasar ikon 3.5 pt di bawah baseline teks) sehingga tampak tidak sejajar dengan teks *"Altvira Technology"* dan nomor halaman.
  - Dialog cetak bawaan peramban (`window.print()`) menonaktifkan hyperlink interaktif dan saat pengguna menyimpan PDF dari print preview, peramban meratakan (*flatten*) PDF serta menghapus objek `/Annots /Link`.
  - Anotasi tautan (*Link Annotation*) pada ikon medsos memiliki hit-box sempit (10x10 pt) tanpa flag standar PDF `/F 4` (*Print flag*) dan `/H /I` (*Invert highlight mode*).
  - Teks tengah disclaimer (*"Dokumen ini dibuat otomatis oleh Altcycles"*) dipertahankan pada ukuran `7.5 pt` agar terhindar dari tabrakan kotak batas tanda tangan di dokumen satu halaman yang padat.
- **Yang kulakukan:**
  - Menyelaraskan titik tengah vertikal ikon SVG tepat pada titik tengah optik huruf kapital teks (`textY + 2.87 pt`, `iconSize = 8.5 pt`, `iconTopY = textY + 7.12 pt`).
  - Memperluas area hit box tautan (`/Rect`) dengan padding 3 pt, menambahkan flag PDF `/F 4` dan `/H /I`, serta memastikan normalisasi protokol URL mutlak (`https://`).
  - Mengubah mode pengunduhan PDF global (`downloadPdfBytes`) dari print preview iframe peramban menjadi **Direct Download (Opsi B)** melalui elemen `<a download>`, menjamin integritas 100% objek biner PDF asli beserta tautan interaktifnya ke profil medsos.
- **Opsi penyelesaian permanen:**
  - **Opsi B:** Penyelarasan optik sumbu tengah teks, normalisasi URL `https://`, perluasan padding anotasi interaktif PDF, dan Direct Download berkas biner `.pdf` asli. (Diterapkan).
- **Rekomendasi:** **Opsi B** (Selesai diterapkan).
- **Perlu keputusanku?** tidak (Selesai diterapkan)

---

## Ringkasan Jumlah Temuan per Jenis (Langkah Selesai)

| Jenis Temuan | Total | Selesai | Aktif (Tanpa Ubah Data/Sistem) | Perlu Keputusan Pengguna |
| :--- | :---: | :---: | :---: | :---: |
| `standar-vs-standar` | 1 | 1 (`K-08`) | 0 | 0 |
| `standar-vs-layout` | 32 | 30 (`K-01`, `K-03`, `K-11`, `K-16`, `K-17`, `K-18`, `K-19`, `K-23`, `K-25`, `K-26`, `K-28`, `K-29`, `K-30`, `K-31`, `K-32`, `K-33`, `K-34`, `K-35`, `K-36`, `K-37`, `K-38`, `K-40`, `K-41`, `K-42`, `K-43`, `K-44`, `K-45`, `K-46`, `K-47`, `K-48`) | 2 (`K-20`, `K-27`) | 2 (`K-20`, `K-45`) |
| `standar-vs-sistem` | 7 | 6 (`K-02`, `K-06`, `K-13`, `K-14`, `K-15`, `K-39`) | 1 (`K-09`) | 0 |
| `sistem-menghalangi` | 2 | 2 (`K-07`, `K-24`) | 0 | 0 |
| `data-janggal` | 6 | 2 (`K-04`, `K-05`) | 4 (`K-10`, `K-12`, `K-21`, `K-22`) | 0 |
| `keputusan-sendiri` | 0 | 0 | 0 | 0 |
| **Total Temuan** | **48** | **41** | **7** | **2** |
