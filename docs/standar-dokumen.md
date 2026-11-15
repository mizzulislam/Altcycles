# Standar Dokumen dan Template Altvira

Nov 14, 2026 · @Muhammad Izzul Islam

## Ringkasan

Dokumen yang paling mudah diverifikasi finance dalam 14 file sampel selalu memuat lima hal: identitas lengkap kedua pihak, nomor-tanggal-periode, hitungan yang terlihat, instruksi bayar, dan rujukan ke dokumen induk (PO, kontrak, BAST). Kelemahan di sampel hampir semuanya berasal dari salah satu dari lima hal itu yang hilang.

Keputusan desain untuk Altvira:

1. Satu kerangka dokumen bersama (header, blok metadata, tabel, total, tanda tangan, footer); hanya badan yang berganti per jenis dokumen.
2. Altvira belum PKP, jadi invoice tanpa PPN dan tanpa faktur pajak; baris DPP dan PPN disiapkan tetapi nonaktif sampai berstatus PKP.
3. Judul memakai "Invoice", bukan "Faktur", agar tidak tertukar dengan Faktur Pajak.
4. Setiap dokumen turunan membawa nomor dokumen induknya: PO klien, invoice termin, kuitansi, BAST.
5. Rincian hitung ditulis penuh: jumlah × harga × durasi. Invoice Lark, misalnya, tidak menampilkan pengali 3 bulan sehingga totalnya tidak bisa dicek sekilas.
6. Periode layanan wajib tertulis di invoice. Invoice Javarent hanya menyebutnya di kuitansi.
7. Kuitansi di atas Rp5.000.000 disiapkan dengan ruang e-Meterai Rp10.000.
8. Penomoran seragam `ALT/JENIS/TAHUN/BULAN/URUT`; pasangan invoice dan kuitansi memakai nomor urut yang sama.
9. Setiap dokumen punya status (Draft, Terbit, Lunas, Batal) dan versi yang dikendalikan dari Altcycles, bukan diketik manual.
10. Angka dan tanggal memakai format Indonesia: `Rp2.000.000` untuk angka bulat (atau dua desimal `Rp1.234.567,50` bila terdapat nilai sen; jika ada satu angka berdesimal di dalam satu dokumen, seluruh angka uang di dokumen tersebut ditampilkan dua desimal agar kolom sejajar) dan `14 Oktober 2026`.

## Inventaris dokumen sampel

Lampiran berisi 14 file dengan tujuh jenis dokumen; file 9 dan 14 identik, dan beberapa file adalah bundel beberapa dokumen.

| File | Isi | Penerbit → penerima | Nilai | Pola yang bisa ditiru |
| --- | --- | --- | --- | --- |
| 1 | Invoice top-up SIP trunk | Solusi Teknologi Unggul → Klik Dua Bersama | Rp300.000 | Kotak Balance Due di kanan atas; denda 1‰ per hari setelah 45 hari |
| 2 | Bundel SaaS: Atlassian, Zoom, Figma, GitHub | Vendor → entitas Satu Dental | USD 135,75; Rp1.065.987,39; USD 15,00; USD 48,01 | Ringkasan bayar di atas, status lunas, 4 digit terakhir kartu |
| 3 | Invoice iForte Oktober + rincian site + faktur pajak | iForte → Klik Dua Bersama | Rp69.375.000 | Ringkasan satu halaman + rincian landscape; faktur pajak merujuk nomor invoice |
| 4 | Bundel pengadaan marketplace: PO, email permintaan, approval Slack, 3 pesanan Shopee, instruksi bayar | Klik Dua Bersama → marketplace | Rp1.412.753 | Rantai bukti permintaan → approval → PO → bukti belanja |
| 5 | Invoice + kuitansi sewa laptop (Javarent) | Javarent → Satu Dental Indonesia | Rp5.033.255 | Nomor invoice dan kuitansi berpasangan; terbilang |
| 6 | Invoice Lark | Lark → Klik Bersama Teknologi | USD 7.048,80 | Kolom contract dan billing order ID per baris |
| 7 | Form Pengajuan IT (laptop sewa) | Internal SDI | Rp12.100.000 | Form otomatis dengan tag payment dan footer sistem |
| 8 | Invoice + 4 BAST sewa laptop (Tulus Tekno) | Tulus Tekno → Satu Dental Indonesia | Rp2.400.000 | BAST per unit dengan nomor seri, dirujuk dari invoice |
| 9 | Invoice sewa Lenovo X1 (Arental) | Arental → Satu Dental (HO-High) | Rp2.000.000 | Rujukan nomor BAST dan “perpanjangan dari” invoice bulan lalu |
| 10 | Invoice Google Workspace (Eikon) | Eikon → Klik Bersama Teknologi | Rp8.411.580 | Syarat komersial rinci: komitmen, kurs, prorata |
| 11 | Form Pengajuan IT (internet ISP) | Internal KDB | Rp69.375.000 | Cocok dengan invoice iForte November |
| 12 | Invoice iForte November + rincian + faktur pajak | iForte → Klik Dua Bersama | Rp69.375.000 | Pola sama dengan file 3 |
| 13 | Bundel Staffinc: invoice, faktur pajak, PO, BAST | Staffinc → Klik Dua Bersama | Rp5.354.080 neto | Satu-satunya yang menampilkan PPh 23 dan jumlah neto |
| 14 | Salinan identik file 9 | – | – | Duplikat |

## Temuan di dokumen sampel

Angka di semua dokumen yang saya hitung ulang (PPN, DPP, PPh 23, total, terbilang) cocok, kecuali harga satuan Eikon yang dibulatkan (USD 6,90 × 18.300 = 126.270, tertulis 126.300, tanpa aturan pembulatan); masalah utamanya ada di kelengkapan, konsistensi, dan keterbacaan, bukan di aritmetika.

| Temuan | File | Risiko | Aturan untuk template Altvira |
| --- | --- | --- | --- |
| Periode sewa tidak ada di invoice, hanya di kuitansi (1 September–1 Oktober 2026) | 5 | Invoice tidak bisa dicocokkan ke periode biaya tanpa kuitansi | Periode wajib di invoice dan kuitansi |
| Kuitansi Rp5.033.255 tanpa meterai yang terlihat, terbit di tanggal yang sama dengan invoice (14 Oktober 2026) | 5 | Dokumen penerimaan uang di atas Rp5.000.000 adalah objek bea meterai; kuitansi seharusnya terbit setelah uang diterima | Kuitansi hanya bisa dibuat dari status Lunas; slot e-Meterai muncul otomatis di atas Rp5.000.000 |
| Total baris = USD 8,80 × seat × 3 bulan, tetapi kolom durasi tidak ada | 6 | Total tidak bisa dicek dari kolom yang tampil | Tabel punya kolom durasi; total = jumlah × harga × durasi |
| PO tanpa harga, subtotal, PPN, dan grand total; vendor “Marketplace” tanpa alamat; sel kosong diisi “0”; nomor berawalan PR | 4 | PO tidak bisa mengontrol anggaran; permintaan internal (PR) dan pesanan ke vendor (PO) tercampur | Nomor PR dan PO dipisah; kolom harga wajib; sel kosong ditulis “–” |
| Bukti persetujuan tersebar di tiga tempat dengan tiga nama (email, Slack, kolom PO); email memakai tautan Tokopedia, belanja dilakukan di Shopee | 4 | Auditor harus merunut manual | Satu blok persetujuan di dokumen; bukti tertaut ke nomor PO |
| PO bertanggal 29 April 2026, tetapi kolom disiapkan dan disetujui 8 Juni 2026; spesifikasi i7 “512GB” di PO vs “SSD 256GB” di invoice dan faktur; “1 Years” dengan subtotal satu bulan; sel #UNKNOWN! terbaca | 13 | Selisih spesifikasi bisa jadi sengketa tagihan; error rumus bocor ke dokumen resmi | Tanggal PO tidak boleh setelah tanggal persetujuan; spesifikasi dari satu master; validasi sebelum terbit |
| BAST TTR/617/BAST/0226 bertanggal 9 Maret 2026 padahal kode bulan 0226 berarti Februari; nomor seri PFSJ1HF8 di BAST vs PF5J1HF8 di invoice (cek dokumen asli); BAST tanpa kondisi barang, masa sewa, atau nilai | 8 | Nomor dan tanggal tidak sinkron; nomor seri beda satu karakter | Kode bulan di nomor dibangkitkan dari tanggal; BAST memuat kondisi dan periode |
| Kolom “Price” ternyata total baris (Rp4,2 jt + Rp5,5 jt + Rp2,4 jt = Rp12,1 jt untuk 16 unit); kolom Deskripsi dan Detail identik; nama “Teknorent” vs badan hukum PT Tulus Teknologi Terpadu; hanya baris ketiga yang langsung cocok dengan invoice terlampir | 7 | Harga satuan tidak terbaca; vendor sulit dicocokkan ke invoice | Harga satuan dan jumlah dipisah; kolom vendor berisi nama legal |
| Tanggal terbit sama dengan jatuh tempo (14 Oktober 2026) | 9 | Tidak ada tenggang bayar | Default jatuh tempo = terbit + 14 hari, seperti file 1 dan 10 |
| Label PPN beragam: “PPn 12%” bersama baris DPP (Javarent), “PPN 11%” (Eikon, Zoom), DPP nilai lain × 12% (faktur iForte, Staffinc); semuanya setara 11% dari harga jual | 3, 5, 10, 13 | Pembaca bingung tarif mana yang berlaku | Bila kelak PKP: tulis DPP nilai lain, tarif 12%, dan hasil PPN |
| iForte menyebut layanan sebagai objek PPh tanpa menampilkan jumlah potongan atau jumlah neto; Staffinc menampilkan PPh 23 dan Amount to be Paid | 3, 12 vs 13 | Finance klien menghitung sendiri | Baris opsional “PPh dipotong klien” dan “Jumlah dibayar” |
| Tanggal gaya Amerika (10/1/2026–10/31/2026) di dokumen berbahasa Indonesia; terbilang berbahasa Inggris di invoice Indonesia | 8, 1 | Salah baca (1 Oktober atau 10 Januari) | Bulan ditulis dengan nama: 1 Oktober 2026 |
| Nama penerima berbeda-beda: PT Klik Dua Bersama, KLIK DUA BERSAMA (tanpa PT di faktur), PT Klik Bersama Teknologi, PT Satu Dental Indonesia | beberapa | Rekonsiliasi per entitas sulit | Master pelanggan: nama legal, NPWP, alamat dari satu sumber |

Yang layak ditiru: nomor invoice dicantumkan di faktur pajak (iForte, Staffinc); kuitansi berpasangan dengan invoice (Javarent); rujukan “perpanjangan dari” (Arental); jumlah tagihan di bagian atas (Solusipbx, Zoom, Atlassian); rincian pajak per baris (Zoom).

## Standar isi per jenis dokumen

Setiap tabel memisahkan elemen Wajib (tanpa itu dokumen sulit diverifikasi atau tidak sah), Disarankan, dan Opsional. Kolom catatan menunjuk contoh di file sampel.

### Invoice (versi Altvira, non-PKP)

| Elemen | Status | Catatan |
| --- | --- | --- |
| Judul “INVOICE”, bukan “Faktur” | Wajib | Menghindari tertukar dengan Faktur Pajak |
| Nomor invoice unik dan berurut | Wajib | Format ada di bagian Penomoran |
| Tanggal terbit, jatuh tempo, termin pembayaran | Wajib | Default 14 hari, seperti Solusipbx dan Eikon (Net 14) |
| Penerbit: nama usaha atau badan hukum, alamat, kontak, NPWP bila ada | Wajib | Nama penerbit di kop, pemilik rekening, dan pihak yang menanggung pajak harus konsisten |
| Penerima: nama legal, alamat, PIC, email, NPWP | Wajib | Klien badan umumnya meminta NPWP tercantum; iForte dan Staffinc mencantumkannya di faktur |
| Rujukan: nomor PO klien, SPK atau kontrak, termin ke-n, nomor BAST atau BAKP | Wajib | Pola Staffinc (Ref: PO) dan Arental (perpanjangan dari) |
| Periode layanan atau tanggal serah | Wajib | Hilang di invoice Javarent |
| Rincian: no, deskripsi, jumlah, satuan, harga satuan, durasi, jumlah baris | Wajib | Kolom durasi hilang di Lark |
| Subtotal, diskon, total | Wajib | Baris DPP dan PPN disiapkan tetapi nonaktif sampai PKP |
| Uang muka atau termin sebelumnya, sisa tagihan | Disarankan | Perlu untuk penagihan per termin |
| Jumlah tagihan menonjol (Balance Due) | Disarankan | Solusipbx, Zoom, Atlassian |
| Terbilang berbahasa Indonesia | Disarankan | Javarent, Tulus, Arental |
| Instruksi bayar: bank, nomor rekening, atas nama, berita referensi | Wajib | iForte meminta 5 digit terakhir nomor invoice di berita transfer |
| Syarat keterlambatan: penangguhan layanan, denda | Disarankan | Solusipbx: layanan ditahan setelah 30 hari, bunga 1‰ per hari setelah 45 hari |
| PPh dipotong klien dan jumlah neto | Opsional | Contoh Staffinc; tersembunyi secara default, sesuai keputusan tidak mencatat bukti potong di tahap awal |
| Nama dan jabatan penandatangan; pernyataan sah tanpa tanda tangan bila dibuat sistem | Disarankan | Eikon menulis pernyataan itu di syarat dan ketentuan |
| Status (Draft, Terbit, Lunas, Batal), versi, halaman x dari y | Disarankan | Atlassian menandai halaman pertama sebagai RECEIPT saat lunas |

### Kuitansi dan bukti bayar

| Elemen | Status | Catatan |
| --- | --- | --- |
| Judul “Kuitansi”, nomor berpasangan dengan invoice | Wajib | 0493/INV-JMG ↔ 0493/KUI-JMG di file 5 |
| Sudah diterima dari: nama legal pembayar | Wajib |  |
| Jumlah uang dalam angka dan terbilang | Wajib | Terbilang harus sama persis dengan angka |
| Untuk pembayaran: uraian, nomor invoice, periode | Wajib | Periode hanya ada di kuitansi Javarent |
| Tempat, tanggal, nama jelas dan jabatan penerima, tanda tangan | Wajib |  |
| Meterai Rp10.000 (tempel atau e-Meterai) bila jumlah di atas Rp5.000.000 | Wajib bersyarat | Tarif tunggal sejak 1 Januari 2021, satu meterai per dokumen; tanda terima untuk keperluan internal organisasi bukan objek meterai |
| Terbit setelah uang diterima | Prinsip | Kuitansi adalah bukti terima, bukan tagihan |
| Metode dan rekening penerima | Disarankan |  |

Untuk pembayaran lewat transfer atau kartu, receipt otomatis ala Atlassian, Zoom, dan GitHub cukup memuat: nomor invoice, tanggal bayar, jumlah, metode (4 digit terakhir saja), dan status Payment due 0.

### Purchase order (PO klien dan PO pembelian internal)

PR (permintaan internal) belum mengikat vendor, sedangkan PO adalah pesanan resmi yang mengikat; nomor dan formulirnya sebaiknya dipisah.

| Elemen | Status | Catatan |
| --- | --- | --- |
| Nomor PO unik dan tanggal | Wajib | Awalan PR di file 4 menandakan permintaan, bukan pesanan |
| Pembeli: nama legal, alamat, kontak, NPWP | Wajib |  |
| Vendor atau penjual: nama legal, alamat, telepon, PIC | Wajib | Untuk marketplace isi nama toko dan nomor pesanan |
| Item: deskripsi, spesifikasi, jumlah, satuan, harga satuan, jumlah baris | Wajib | PO file 4 tidak memuat harga |
| Pajak, diskon, total, mata uang | Wajib | PO file 13 kosong di baris PPN |
| Syarat pembayaran | Wajib | Nilai “0” bukan syarat |
| Pengiriman: alamat, tanggal diharapkan, metode, kontak penerima | Wajib |  |
| Referensi: nomor PR, proyek, penawaran atau kontrak | Disarankan |  |
| Persetujuan: pembuat, penyetuju, jabatan, tanggal | Wajib | Selisih tanggal PO dan persetujuan harus wajar (file 13: PO 29 April, persetujuan 8 Juni) |
| Syarat dan ketentuan (garansi, retur), lampiran | Disarankan |  |
| Konfirmasi penerimaan dari vendor atau klien | Disarankan | Menutup siklus PO |

### BAST, BAKP, dan UAT

BAST (Berita Acara Serah Terima) adalah bukti penyerahan; untuk Altvira ada dua dokumen tetangga yang berbagi kerangka sama: BAKP (kemajuan pekerjaan per termin) dan UAT (hasil uji penerimaan).

| Elemen | Status | Catatan |
| --- | --- | --- |
| Judul, nomor, tempat dan tanggal | Wajib | Kode bulan di nomor harus sama dengan bulan tanggal (BAST Tulus 617 tidak) |
| Para pihak: nama, jabatan, perusahaan, alamat | Wajib | Pola Pihak Pertama dan Pihak Kedua di BAST Staffinc |
| Dasar: nomor kontrak, SPK atau PO dan tanggalnya | Wajib |  |
| Objek: uraian, spesifikasi atau versi, jumlah, nomor seri | Wajib | Tulus mencatat nomor seri per unit |
| Kondisi saat diserahkan dan kelengkapan | Wajib | BAST Tulus hanya menyebut aksesori |
| Nilai atau termin yang menjadi dasar tagihan | Disarankan | BAST Staffinc menyebut total nominal sebagai dasar invoice |
| Periode berlaku: sewa, garansi, hosting | Disarankan | Tulis tanggal mulai layanan secara eksplisit |
| Pernyataan serah terima dan penerimaan oleh pihak kedua | Wajib |  |
| Tanda tangan dan nama jelas kedua pihak; saksi bila perlu | Wajib |  |
| BAKP: persentase kemajuan, deliverable yang selesai, termin yang ditagih | Khusus proyek | Dasar invoice termin |
| UAT: skenario uji, hasil, temuan dan statusnya | Khusus proyek | Lampiran BAST akhir |
| Meterai | Bersyarat | Bukti penerimaan barang bukan objek meterai; BAST pekerjaan berisi pernyataan bisa dianggap surat keterangan. Tentukan di SPK dan konfirmasi ke konsultan pajak |

### Form pengajuan dan payment approval (internal)

| Elemen | Status | Catatan |
| --- | --- | --- |
| Nomor form, tanggal, entitas, PIC | Wajib | Pola IT/20/10/26/326/SDI |
| Kategori item, vendor (nama legal), deskripsi | Wajib | Deskripsi cukup satu kali |
| Jumlah, harga satuan, jumlah baris, total | Wajib | File 7 menaruh total baris di kolom Price |
| Nomor payment atau tag, reimbursement ya atau tidak, pemilik anggaran | Wajib | Contoh tag KDB/HO/VEN/202611/002 |
| Dokumen pendukung: invoice, PO, BAST, bukti persetujuan (tautan) | Wajib |  |
| Persetujuan: nama, jabatan, status, tanggal dan jam | Wajib | Satu level persetujuan Admin, sesuai desain Altcycles |
| Cap waktu dan penanda dibuat sistem | Disarankan | Footer “Dokumen dibuat otomatis… 04 Nov 2026 09:54” |

## Pajak dan bea meterai untuk Altvira

Selama Altvira belum PKP, invoice tidak memuat PPN dan tidak menyebut Faktur Pajak; kewajiban memungut PPN dan membuat faktur pajak melekat pada PKP. Pengusaha wajib melapor untuk dikukuhkan sebagai PKP bila omzet dalam suatu bulan pada tahun buku telah melebihi Rp4,8 miliar, paling lambat akhir bulan berikutnya (PMK 164/2023 dan PMK 197/2013).

### Yang berlaku sekarang

- Invoice tanpa baris PPN dan tanpa label “Faktur Pajak”.
- Tiga identitas harus sejalan: penerbit di kop, pemilik rekening di instruksi bayar, dan pihak yang melaporkan penghasilannya. Bila ketiganya berbeda (misalnya kop memakai nama unit usaha dan rekening atas nama pribadi), tambahkan keterangan hubungan hukumnya dan konsultasikan ke konsultan pajak.
- Baris PPh dipotong klien disediakan sebagai opsi tersembunyi. PPh 23 atas sewa harta dan jasa tertentu adalah 2% dari jumlah bruto tanpa PPN, dan pemotong wajib memberi bukti potong.

### Bila kelak PKP: komponen yang diaktifkan

Sejak PMK 131/2024, PPN atas barang dan jasa nonmewah dihitung 12% × DPP nilai lain (11/12 dari harga jual), sehingga tarif efektifnya 11%. Tiga contoh dari sampel membuktikan rumusnya konsisten:

| Contoh | Harga jual (Rp) | DPP nilai lain 11/12 (Rp) | PPN 12% × DPP (Rp) | Total tagihan (Rp) | PPh 23 2% (Rp) | Dibayar (Rp) |
| --- | --- | --- | --- | --- | --- | --- |
| iForte (file 3, 12) | 62.500.000 | 57.291.667 | 6.875.000 | 69.375.000 | – | – |
| Staffinc (file 13) | 4.912.000 | 4.502.667 | 540.320 | 5.452.320 | 98.240 | 5.354.080 |
| Javarent (file 5) | 4.534.464 | 4.156.592 | 498.791 | 5.033.255 | – | – |

Faktur pajak dibuat PKP lewat Coretax atau aplikasi yang terhubung ke sistem DJP, bukan dari template Altvira; invoice cukup merujuk nomornya. Isi minimal faktur pajak menurut Pasal 13 ayat (5) UU PPN:

1. Nama, alamat, dan NPWP penjual.
2. Identitas pembeli: nama, alamat, dan NPWP (atau NIK/paspor untuk orang pribadi tertentu).
3. Jenis barang atau jasa, harga jual atau penggantian, dan potongan harga.
4. PPN dan PPnBM yang dipungut.
5. Kode, nomor seri, dan tanggal pembuatan faktur pajak.
6. Nama dan tanda tangan yang berhak menandatangani.

Faktur pajak yang tidak lengkap membuat PKP penjual terkena denda 1% dari DPP (Pasal 14 ayat (4) UU KUP) dan PPN di dalamnya tidak dapat dikreditkan oleh pembeli.

### Bea meterai

Tarif tetap Rp10.000 sejak 1 Januari 2021, satu kali per dokumen; meterai yang tidak atau kurang dibayar dikenai sanksi administratif 100% dari bea terutang. Biaya meterai adalah pajak atas dokumen, bukan langganan layanan, jadi tidak melanggar syarat tech stack gratis Altcycles.

| Dokumen Altvira | Meterai? | Dasar |
| --- | --- | --- |
| SPK, kontrak, perjanjian | Ya | Surat perjanjian adalah objek meterai |
| Kuitansi di atas Rp5.000.000 | Ya | Dokumen yang menyatakan jumlah uang di atas Rp5 juta dan menyebutkan penerimaan uang |
| Kuitansi sampai Rp5.000.000 | Tidak | Di bawah batas nominal |
| Invoice | Umumnya tidak | Berfungsi sebagai tagihan; bila memuat pengakuan pelunasan, perlakuannya seperti kuitansi |
| BAST barang | Tidak | Bukti penerimaan barang dikecualikan |
| BAST pekerjaan, BAKP, UAT | Tentukan di SPK | Bisa dianggap surat keterangan atau pernyataan |
| Form pengajuan internal | Tidak | Tanda terima untuk keperluan intern organisasi dikecualikan |

Perlakuan pajak di atas adalah ringkasan dari sumber publik, bukan nasihat pajak; konfirmasikan kasus yang meragukan ke konsultan pajak atau KPP.

## Komponen template global

Semua jenis dokumen memakai satu kerangka sembilan zona; hanya zona B sampai G yang berganti isi per jenis, sehingga perubahan logo, alamat, atau rekening cukup dilakukan sekali.

| Zona | Isi | Sifat | Sumber di Altcycles |
| --- | --- | --- | --- |
| A. Header (tiap halaman) | Kiri: logo, nama usaha, alamat, kontak, NPWP bila ada. Kanan: judul dokumen, nomor, chip status | Tetap, kecuali judul, nomor, status | Pengaturan usaha |
| B. Pihak dan metadata | Kiri: kepada atau para pihak (nama legal, alamat, PIC). Kanan: tanggal, jatuh tempo, rujukan PO, SPK, termin | Variabel | Master pelanggan, proyek |
| C. Ringkasan jumlah | Kotak Balance Due atau total | Variabel | Hitungan dokumen |
| D. Tabel rincian | Kolom ditentukan jenis dokumen | Variabel | Item dokumen |
| E. Blok total | Subtotal, diskon, pajak (nonaktif), uang muka, total, terbilang | Variabel | Hitungan dokumen |
| F. Syarat dan instruksi | Instruksi bayar, syarat keterlambatan, catatan | Template per jenis; rekening dari pengaturan | Pengaturan |
| G. Pengesahan | Nama, jabatan, tanda tangan, slot e-Meterai | Variabel; slot meterai mengikuti aturan nominal | Pengguna, aturan meterai |
| H. Lampiran | Rincian site atau item, bukti pendukung | Opsional | Berkas terkait |
| I. Footer (tiap halaman) | Kontak dan legal, nomor dokumen, halaman x dari y, “dibuat otomatis oleh Altcycles” dengan cap waktu, QR verifikasi | Tetap dan otomatis | Sistem |

### Aturan visual dan format

- Kertas A4 portrait dengan margin 15–20 mm; lampiran rincian boleh landscape seperti lampiran iForte.
- Satu keluarga font sans gratis (Inter, Noto Sans, atau Roboto dari Google Fonts); isi 9–10 pt, judul dokumen 18–20 pt; angka rata kanan dengan lebar tabular.
- Satu warna aksen dari logo Altvira; header tabel memakai satu gaya saja (gelap atau terang).
- Angka berformat Indonesia dengan `Rp` di depan: `Rp2.000.000` untuk angka bulat, namun apabila terdapat satu angka berdesimal pada dokumen, semua angka uang pada dokumen tersebut ditampilkan dua desimal (`Rp1.234.567,00` dan `Rp1.234.567,50`) agar kolom sejajar; mata uang asing memakai kode (`USD`).
- Tanggal selalu dengan nama bulan: 14 Oktober 2026.
- Label berbahasa Indonesia; untuk klien asing, label dwibahasa Indonesia / English.
- Sel kosong ditulis “–”, bukan “0”, kecuali nilainya memang nol.
- Tahan pemisah halaman: header tabel berulang, dan blok total, terbilang, serta pengesahan tidak boleh terpisah antar halaman.
- Data pembayaran sensitif ditampilkan terbatas (kartu hanya 4 digit terakhir, seperti Atlassian dan Zoom).

## Layout per dokumen

Urutan di bawah memakai zona A sampai I dari bagian sebelumnya, dari atas ke bawah.

| Dokumen | Urutan zona | Aturan khusus |
| --- | --- | --- |
| Invoice | A, B, C, D, E, F (instruksi bayar), G, I | Satu halaman bila baris tidak lebih dari 15; rincian panjang pindah ke lampiran H. Status Lunas menampilkan tanda LUNAS dan tanggal bayar |
| Kuitansi | A, judul dan nomor, pernyataan (diterima dari, jumlah, terbilang, untuk pembayaran), kotak nominal, G, I | Setengah halaman A4; tanpa tabel; slot e-Meterai di dekat tanda tangan |
| Purchase order | A, B (pembeli, vendor, tujuan kirim), syarat bayar dan kirim, D, E, catatan, G tiga kolom (Dibuat, Disetujui, Diterima), I | Kolom harga wajib terisi; pola tiga kolom dari PO KDB dipertahankan |
| BAST | A, judul dan nomor, tempat dan tanggal, para pihak, dasar, objek (tabel), kondisi dan lampiran, pernyataan, G dua kolom, I | Narasi pendek; tanda tangan dua kolom sejajar, saksi opsional di bawahnya |
| BAKP dan UAT | A, B, tabel kemajuan atau skenario, ringkasan hasil, G, I | Status memakai teks (Lulus, Gagal, Selesai), bukan hanya warna |
| Form pengajuan dan payment approval | A ringkas, identitas form, D, dokumen pendukung (tautan), jalur persetujuan, I | Satu halaman; footer otomatis wajib |
| Receipt otomatis | A, status, ringkasan bayar, rincian di halaman 2 | Gaya Atlassian: ringkasan di halaman pertama, rincian setelahnya |

Urutan zona B sampai E sama persis di invoice dan PO, dan kuitansi memakai versi ringkasnya. Kesamaan ini membuat finance klien bisa membaca dokumen Altvira tanpa belajar format baru.

## Penomoran dan metadata

Tujuh vendor di sampel memakai tujuh pola nomor berbeda, dan satu BAST menyimpang dari aturannya sendiri; Altvira cukup satu pola yang bisa dibangkitkan sistem.

| Contoh di sampel | Pola | Catatan |
| --- | --- | --- |
| STU-Inv-2026-09301077 | prefix-jenis-tahun-urut | Urut memuat tanggal 0930 |
| 0493/INV-JMG/10/2026 dan 0493/KUI-JMG/10/2026 | urut/jenis-entitas/bulan/tahun | Invoice dan kuitansi berbagi nomor urut |
| TTR/103/INV/1026, TTR/113/BAST/1123 | entitas/urut/jenis/MMYY | BAST 617 bertanggal Maret tetapi berkode 0226 |
| 1/SMI/COM/INV/SATU-005/VII/2026 | urut/entitas/unit/jenis/klien/bulan romawi/tahun | Panjang, tetapi bisa ditelusuri ke klien |
| PO/IT/202605/002 | jenis/unit/YYYYMM/urut | Bulan di nomor tidak sama dengan tanggal PO |
| IT/20/10/26/326/SDI | jenis/DD/MM/YY/urut/entitas | Form internal |
| 1085/INV/X/2026 | urut/jenis/bulan romawi/tahun | Ringkas |

Rekomendasi pola: `ALT/{JENIS}/{YYYY}/{MM}/{URUT4}`, contoh `ALT/INV/2026/11/0001`. Kode jenis: QUO, SOW, SPK, PR, PO, BAKP, INV, KUI, UAT, BAST, PAY (payment approval). Dokumen per termin menambah sufiks `-T1`, `-T2`.

1. Nomor urut reset tiap tahun dan tidak boleh berlubang; dokumen yang dibatalkan tetap memegang nomornya dengan status Batal.
2. Bulan di nomor dibangkitkan dari tanggal terbit, tidak diketik.
3. Invoice dan kuitansi untuk termin yang sama berbagi nomor urut.
4. PR dan PO adalah jenis berbeda dengan urutan masing-masing.
5. Dokumen yang sudah terbit tidak diedit; koreksi menerbitkan versi baru (v2) dengan nomor sama, dan versi lama ditandai Diganti.

Metadata minimum yang disimpan di Altcycles untuk setiap dokumen:

- Nomor, versi, jenis, status.
- Tanggal terbit, jatuh tempo atau masa berlaku.
- Pembuat, penyetuju, tanggal persetujuan.
- Dokumen induk (nomor PO, SPK, atau invoice).
- Proyek dan termin.
- Penerima atau vendor (rujukan ke master data, bukan teks bebas).

## Alur dokumen dan pemetaan ke Altcycles

Alur proyek Altvira menghasilkan sembilan jenis dokumen yang saling merujuk, ditambah satu jalur pembelian internal; semuanya bisa dirender dari data yang sama di Altcycles.

&#91;embedded content: alur dokumen · 9 jenis, 1 loop per termin, 1 jalur internal\]

Penagihan berulang per termin sampai lunas, baru kemudian UAT, BAST, dan invoice akhir; pembelian internal berjalan di jalur terpisah.

| Data induk di Altcycles | Dokumen yang dirender | Aturan |
| --- | --- | --- |
| Master pelanggan: nama legal, NPWP, alamat, PIC | Quotation, SPK, PO klien, invoice, kuitansi, BAST | Diubah di satu tempat; dokumen yang sudah terbit menyimpan salinan data saat terbit, jadi perubahan master tidak mengubah dokumen lama |
| Proyek dan termin: persentase, nilai, tanggal | Quotation, SPK, BAKP, invoice termin | Jumlah semua termin sama dengan nilai kontrak; total di atas nilai kontrak ditolak |
| PO klien (portal Pembeli) | Rujukan di invoice dan BAST | Nomor PO tetap menjadi kunci akses portal Pembeli |
| Pembayaran masuk | Kuitansi, status invoice Lunas | Kuitansi hanya bisa dibuat setelah pembayaran tercatat |
| Master vendor, PR dan PO internal | PO internal, form payment approval | Nama vendor legal dari master, bukan diketik |
| Persetujuan | PO internal, payment approval | Satu level Admin |
| Konfigurasi pajak dan meterai | Semua dokumen | Slot meterai muncul otomatis di atas Rp5.000.000; baris pajak nonaktif sampai PKP |

Untuk implementasi gratis, satu komponen HTML dan CSS untuk zona A dan I dipakai semua jenis dokumen, dan PDF dihasilkan dari komponen yang sama dengan tampilan layar. Dengan begitu dokumen di layar dan di PDF tidak pernah berbeda.

## Checklist sebelum dokumen terbit dan sumber

Checklist ini bisa dijadikan validasi otomatis di Altcycles; dokumen tidak berstatus Terbit sebelum semua butir terpenuhi.

- [ ] Nomor mengikuti pola ALT/JENIS/TAHUN/BULAN/URUT dan bulan sesuai tanggal terbit.
- [ ] Penerbit, pemilik rekening, dan penerima diambil dari master data.
- [ ] Dokumen induk tercantum (PO, SPK, termin, BAST atau BAKP).
- [ ] Periode layanan atau tanggal serah tertulis.
- [ ] Tabel punya jumlah, harga satuan, dan durasi; total baris dan total dokumen terhitung ulang oleh sistem.
- [ ] Terbilang sama dengan angka total.
- [ ] Jatuh tempo tidak sebelum tanggal terbit; default 14 hari.
- [ ] Instruksi bayar lengkap dengan berita referensi nomor dokumen.
- [ ] Tidak ada sel berisi 0, kosong, atau error rumus.
- [ ] Kuitansi hanya dari invoice berstatus Lunas; slot e-Meterai aktif bila di atas Rp5.000.000.
- [ ] Tanggal PO tidak setelah tanggal persetujuan; spesifikasi item sama di PO, BAST, dan invoice.
- [ ] Tanggal tertulis dengan nama bulan; angka berformat Indonesia.
- [ ] Footer memuat nomor, halaman x dari y, dan cap waktu pembuatan.

Sumber yang saya buka untuk menyusun bagian pajak dan PO (diakses 14 November 2026):

- [Bea Meterai, DJP](https://pajak.go.id/bea-meterai) untuk tarif, objek, dan pengecualian meterai.
- [PMK 131/2024: Tarif PPN Sebelas-Dua Belas, DJP](https://www.pajak.go.id/id/node/113453) untuk DPP nilai lain 11/12.
- [Faktur Pajak Harus Penuhi Syarat Formal dan Material, DDTCNews](https://news.ddtc.co.id/berita/nasional/1804950/faktur-pajak-harus-penuhi-syarat-formal-dan-material-seperti-apa) untuk isi faktur pajak dan sanksi.
- [Konsekuensi Tak Ajukan PKP Jika Omzet Melebihi Rp4,8 Miliar, DDTCNews](https://news.ddtc.co.id/berita/nasional/1802620/perhatikan-konsekuensi-tak-ajukan-pkp-jika-omzet-melebihi-rp48-miliar) untuk batas PKP.
- [Purchase Order: Fungsi, Isi, Cara Membuat, Accurate](https://accurate.id/akuntansi/pengertian-purchase-order/) untuk komponen PO dan beda PR dengan PO.

Tarif PPh 23 (2%), standar isi kuitansi dan BAST, serta perlakuan meterai atas invoice dan BAST bersumber dari ringkasan pencarian dan praktik umum, bukan dari halaman yang saya buka penuh; anggap sebagai titik awal dan konfirmasikan ke konsultan pajak.

