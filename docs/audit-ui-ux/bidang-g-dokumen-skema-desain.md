# Bidang G: Dokumen Skema Desain (ID: DOC-xx)

Dokumen ini membandingkan pedoman desain tertulis yang ada (`DESIGN.md` dan konvensi `AGENTS.md`) dengan kode implementasi aktual, serta merumuskan aturan pencegahan regresi visual dan token yang wajib diintegrasikan ke pipeline CI/CD.

---

## 1. Perbandingan Dokumen Desain vs Realitas Kode

| Aspek Desain | Aturan di Dokumen Tertulis (`DESIGN.md` / `AGENTS.md`) | Realitas Implementasi di Kode Sumber | Status Kepatuhan |
| :--- | :--- | :--- | :---: |
| **Radius Kartu & Kontrol** | `AGENTS.md` mewajibkan `rounded-2xl` untuk Card dan `rounded-xl` untuk Button. | Mayoritas patuh (153 `rounded-2xl`, 326 `rounded-xl`), tetapi arah baru Polestar menghendaki sudut hampir flat. | **Kontradiksi Desain Baru (Perlu Keputusan)** |
| **Penggunaan Warna Hex** | Wajib menggunakan token semantik CSS, dilarang hex acak. | Masih ditemukan 48 warna hex hardcode di komponen interaktif (date picker, KPI card, sidebar). | **Perlu Pembersihan (TK-01)** |
| **Pemisah Tabel & Edge-to-Edge** | Tabel wajib edge-to-edge di dalam Card tanpa border ganda di dalam CardContent. | 100% tabel transaksi dan master sudah mematuhi kaidah edge-to-edge. | **Sangat Patuh (100%)** |
| **Standar Moneter (MonetaryCell)** | Simbol mata uang di kiri, angka di kanan (`tabular-nums`). | 100% nilai moneter di tabel menggunakan komponen `MonetaryCell`. | **Sangat Patuh (100%)** |
| **Pencegahan Dropdown Terpotong** | Wajib menggunakan React Portal `createPortal(..., document.body)`. | Diterapkan penuh pada `ExportDownloadMenu` dan `DocumentDownloadMenu`. | **Sangat Patuh (100%)** |
| **Proper Case Header Tabel & KPI** | Wajib huruf kapital di awal kata (dilarang UPPERCASE). | Dipatuhi di seluruh portal, kecuali modul akuntansi resmi yang memang membutuhkan singkatan kapital. | **Sangat Patuh (100%)** |

---

## 2. Tabel Temuan Bidang G (ID: DOC-xx)

| ID | Dokumen Terkait | Deskripsi Kesenjangan | Dampak | Keparahan | Rekomendasi Solusi | Berdampak ke Desktop? | Perlu Keputusan? |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: |
| **DOC-01** | `DESIGN.md` & `AGENTS.md` | Dokumen belum mendefinisikan matriks **6 Peran Tipografi** (angka saldo besar, angka transaksi, judul layar, judul bagian, body, sekunder) | Pengembang dan agen AI menentukan ukuran font secara intuitif | Sedang | Perbarui `DESIGN.md` dengan tabel 6 peran tipografi dan rumus clamp responsif | **Tidak** | Tidak |
| **DOC-02** | `DESIGN.md` Mobile Spec | Standar mobile acuan kanvas 393x852 dengan padding 25px belum tercatat di DESIGN.md | Panduan desain mobile di dokumen masih bersifat generik | Sedang | Tambahkan bab khusus "Standar Mobile Fintech Polestar (Kanvas Acuan 393x852 Fleksibel)" | **Tidak** | Tidak |
| **DOC-03** | Automated CI Lint Guard | Belum ada script linter otomatis di CI yang mencegah masuknya warna hex liar atau class shadow tebal | Kode baru bisa memasukkan kembali warna hardcode | Sedang | Buat skrip linter `tests/unit/design-token-enforcement.test.ts` yang mengecek AST file `.tsx` | **Tidak** | Tidak |

---

## 3. Rencana Aturan Pencegahan Regresi di Pipeline CI (Zero-Regression Rules)

Skrip pengujian otomatis `tests/unit/design-token-enforcement.test.ts` akan memvalidasi aturan berikut pada setiap commit:
1. **Larang Warna Hex Mentah:** Gagal jika ada `#...` di dalam file `src/features/` atau `src/components/` (kecuali file token `src/index.css` dan engine PDF).
2. **Larang Radius di Luar Token:** Gagal jika ada class selain yang terdaftar di token resmi.
3. **Larang Bayangan Berat:** Gagal jika ditemukan class `shadow-lg`, `shadow-xl`, `shadow-2xl` di komponen aplikasi internal.
4. **Validasi Input Mobile:** Gagal jika elemen `<input>` memiliki kelas `text-xs` tanpa pelindung ukuran sentuh minimum 16px di layar sentuh.
5. **Validasi i18n:** Gagal jika ada teks literal hardcode di JSX tanpa fungsi `t(...)`.
