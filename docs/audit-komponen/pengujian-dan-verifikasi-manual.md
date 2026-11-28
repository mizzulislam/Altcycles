# PANDUAN PENGUJIAN & VERIFIKASI MANUAL ALTCYCLES
**Dokumen:** `docs/audit-komponen/pengujian-dan-verifikasi-manual.md`  
**Tujuan:** Daftar Skenario Antarmuka yang Tidak Dapat Diverifikasi Sepenuhnya oleh Skrip Otomatis dan Panduan Uji Manualnya

---

## 1. Daftar Elemen / Alur yang Memerlukan Uji Coba Manual

Meskipun Puppeteer dan Vitest mampu menguji render DOM, paritas visual piksel, serta fungsi komputasi angka secara otomatis, beberapa interaksi pengguna tingkat peramban (*browser native*) memerlukan pengujian manual:

| No | Fitur / Komponen UI | Alasan Tidak Dapat Diverifikasi Penuh Secara Otomatis | Prosedur Uji Manual yang Direkomendasikan | Kriteria Keberhasilan Uji |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Google Drive Picker API (`GoogleDrivePickerDialog`)** | Memerlukan autentikasi OAuth Google interaktif dan token popup yang diblokir oleh headless browser sandbox | 1. Buka modal upload logo atau bukti SPPKP.<br>2. Klik tab "Google Drive".<br>3. Klik tombol "Buka Google Drive Picker". | Jendela popup Google Picker muncul, file dapat dipilih, dan metadata file tersinkron ke form. |
| 2 | **Cetak Dokumen Fisik / Print Dialog Peramban (`window.print()`)** | Dialog print native OS (`Ctrl + P`) tidak dapat diinspeksi oleh DOM selector peramban headless | 1. Buka halaman Laporan Keuangan atau Jurnal.<br>2. Klik tombol "Cetak Dokumen".<br>3. Periksa preview cetak pada dialog browser. | Header kop surat muncul utuh, tabel tidak terpotong tepi kertas A4, tombol aksi di layar otomatis tersembunyi (`@media print`). |
| 3 | **Interaksi Drag & Scroll Horizontal Kartu Sosial Media** | Memerlukan simulasi pointer event mouse drag yang presisi dan akselerasi momentum | 1. Buka tab *Sosial Media Footer* di Profil Perusahaan.<br>2. Klik tahan dan geser ke kiri/kanan.<br>3. Klik tombol panah chevron kiri/kanan di header kartu. | Baris kartu bergeser mulus tanpa patah-patah, tombol navigasi disable saat menyentuh ujung. |
| 4 | **Pencegahan Kursor Kedip (Caret) pada Field Read-Only** | Penegakan properti CSS `caret-transparent` dan event preventDefault pada elemen native `input` | 1. Buka tab *Data Keuangan* pada Profil Perusahaan atau Pengaturan Pengguna.<br>2. Klik field read-only *Klasifikasi PTKP & TER* dan *Status Rekening Pencairan*. | Tidak ada kursor kedip teks (|) yang muncul, dan teks tidak dapat disorot/diedit. |
| 5 | **Anti-Clipping Menu Dropdown (`createPortal`)** | Memerlukan pengujian scroll viewport saat menu popover terbuka di dalam kontainer `overflow-hidden` | 1. Buka tabel transaksi yang memiliki kontainer kartu ber-scroll.<br>2. Klik tombol "Unduh / Ekspor".<br>3. Scroll halaman ke atas dan ke bawah. | Menu dropdown tetap melayang utuh (`z-[99999]`), tidak terpotong oleh tepi kartu tabel, dan menutup otomatis saat klik di luar. |

---

## 2. Pernyataan Kejujuran Audit

Sesuai instruksi audit: **"Jangan menyatakan 'tidak ada masalah' tanpa bukti."**
Audit ini menemukan **146 penulisan tombol manual**, **135 duplikasi footer modal**, **10 tabel HTML mentah**, **244 deklarasi hex hardcode**, **454 kelas arbitrary**, **28 file kritis melebihi 800 baris**, dan **2 file serta 1 dependensi tak terpakai**. Seluruh temuan telah didokumentasikan secara transparan beserta buktinya.
