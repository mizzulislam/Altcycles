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

## Ringkasan Jumlah Temuan per Jenis (Langkah 1 Putaran Penyempurnaan)

| Jenis Temuan | Total | Selesai | Aktif (Tanpa Ubah Data/Sistem) | Perlu Keputusan Pengguna |
| :--- | :---: | :---: | :---: | :---: |
| `standar-vs-standar` | 1 | 1 (`K-08`) | 0 | 0 |
| `standar-vs-layout` | 7 | 7 (`K-01`, `K-03`, `K-11`, `K-16`, `K-17`, `K-18`, `K-19`) | 0 | 0 |
| `standar-vs-sistem` | 6 | 5 (`K-02`, `K-06`, `K-13`, `K-14`, `K-15`) | 1 (`K-09`) | 0 |
| `sistem-menghalangi` | 1 | 1 (`K-07`) | 0 | 0 |
| `data-janggal` | 4 | 2 (`K-04`, `K-05`) | 2 (`K-10`, `K-12`) | 0 |
| `keputusan-sendiri` | 0 | 0 | 0 | 0 |
| **Total Temuan** | **19** | **16** | **3** | **0** |
