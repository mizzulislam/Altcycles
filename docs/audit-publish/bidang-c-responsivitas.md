# Audit Kesiapan Publish Altcycles: Bidang C - Responsivitas & Tampilan Lintas Layar (ID: RS-xx)

Dokumen ini memuat temuan audit responsivitas, perilaku layout adaptif pada berbagai breakpoint perangkat (1920, 1440, 1280, 1024, 768, 412, 390, 360, 320 px), analisis overflow horizontal, drawer sidebar mobile, dialog sheet, dan strategi pengaman visual desktop.

---

## 1. Prinsip Utama Pengaman Desktop (Hard Rule)
> [!IMPORTANT]
> **TAMPILAN DESKTOP (PC) YANG SUDAH DIBANGUN TIDAK BOLEH RUSAK ATAU BERGESER.**
> Perbaikan responsif bersifat murni **aditif** untuk lebar kecil (tablet dan mobile). Setiap aturan responsif baru diterapkan secara bertahap pada breakpoint bawah (`<md` atau `<sm`), dengan verifikasi tangkapan layar sebelum dan sesudah di lebar desktop (1920 dan 1440) untuk memastikan piksel identik.

---

## 2. Matriks Pengujian Responsivitas Rute Utama

| Rute / Fitur | 1920px (Desktop Lebar) | 1440px (Desktop Standar) | 1280px (Laptop) | 1024px (Tablet Landsc.) | 768px (Tablet Portr.) | 412px (Mobile Sedang) | 360px (Mobile Standar) | 320px (Mobile Kecil) | Status Kesiapan |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Login Page** (`/login`) | Lulus | Lulus | Lulus | Lulus | Lulus | Lulus | Lulus | Peringatan (kartu form padat) | **Siap dengan Catatan** |
| **Dashboard Admin** (`/admin/dashboard`) | Lulus | Lulus | Lulus | Lulus | Peringatan (KPI wrap) | Peringatan (scroll tabel) | Perlu Penyesuaian | Perlu Penyesuaian | **Butuh Adaptasi Mobile** |
| **Persetujuan Pembayaran** (`/admin/persetujuan`) | Lulus | Lulus | Lulus | Lulus | Peringatan | Overflow tabel tanpa kartu | Overflow tabel | Overflow tabel | **Butuh Scroll Terkontrol** |
| **PO Internal & Detail** (`/admin/po-internal`) | Lulus | Lulus | Lulus | Peringatan | Peringatan | Overflow tabel | Overflow tabel | Overflow tabel | **Butuh Scroll Terkontrol** |
| **Proyek & Detail Termin** (`/admin/proyek/:id`) | Lulus | Lulus | Lulus | Lulus | Peringatan (header termin) | Peringatan | Perlu Penyesuaian | Perlu Penyesuaian | **Butuh Adaptasi Mobile** |
| **Penagihan / Invoicing** (`/admin/penagihan`) | Lulus | Lulus | Lulus | Peringatan | Peringatan | Overflow tabel | Overflow tabel | Overflow tabel | **Butuh Scroll Terkontrol** |
| **Anggaran / Budgeting** (`/admin/anggaran`) | Lulus | Lulus | Lulus | Lulus | Peringatan | Overflow tabel | Overflow tabel | Overflow tabel | **Butuh Scroll Terkontrol** |
| **Akuntansi & Jurnal Umum** (`/admin/akuntansi`) | Lulus | Lulus | Lulus | Peringatan (tab lebar) | Peringatan (tab wrap) | Tab bertumpuk | Tab terpotong | Tab terpotong | **Butuh Navigasi Tab Geser** |
| **Laporan Akuntansi** (`/admin/akuntansi?tab=laporan`) | Lulus | Lulus | Lulus | Lulus | Lulus | Lulus (Export PDF) | Lulus | Lulus | **Siap (Ekspor Responsif)** |
| **Profil Perusahaan & Bank** (`/super-admin/profil-perusahaan`) | Lulus | Lulus | Lulus | Lulus | Grid 2-kolom bertumpuk rapi | Form vertikal rapi | Form vertikal rapi | Padding ketat | **Siap (Responsif Stabil)** |
| **Pengaturan Pengguna** (`/super-admin/pengguna`) | Lulus | Lulus | Lulus | Lulus | Peringatan | Overflow tabel | Overflow tabel | Overflow tabel | **Butuh Scroll Terkontrol** |
| **Audit Trail** (`/super-admin/audit-trail`) | Lulus | Lulus | Lulus | Lulus | Peringatan | Overflow kolom JSON | Overflow kolom JSON | Overflow kolom JSON | **Butuh Drawer Detail** |

---

## 3. Tabel Temuan Mendalam Bidang C

| ID | Deskripsi Temuan | Bukti Kode / Lokasi | Dampak | Keparahan | Rekomendasi Konkret | Usaha | Risiko Perbaikan | Risiko Merusak Desktop | Perlu Perubahan Skema | Perlu Keputusan User |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RS-01** | **Scroll Horizontal Tidak Terkontrol pada Tabel Transaksi Lebar di Mobile**<br>Tabel dengan 7-10 kolom (mis. Invoicing, PO, Persetujuan) pada viewport < 768px menyebabkan kontainer kartu tabel melebar melampaui lebar viewport jika pembungkus sel tidak memiliki `overflow-x-auto` yang terkontrol rapi. | `src/features/invoicing/invoicing-page.tsx:490`, `src/features/purchase-orders/po-page.tsx:400` | Pengguna ponsel harus menggeser seluruh layar secara horizontal, mengganggu navigasi halaman dan menu header. | **Kritis** | Bungkus `<Table>` dalam kontainer `div` khusus berscroll horizontal lokal (`overflow-x-auto overflow-y-hidden max-w-full touch-pan-x`) dengan indikator gradien bayangan di tepi kanan. | Sedang | Rendah | Tidak (tetap rata di desktop) | Tidak | Tidak |
| **RS-02** | **Navigasi Tab Halaman Meluap pada Layar Ponsel Kecil (320-390px)**<br>Di modul Akuntansi (`accounting-page.tsx`) dan Master Data, deretan tab menggunakan kontainer flex tanpa scrollbar geser halus di mobile. | `src/features/accounting/accounting-page.tsx:85`, `src/components/ui/tabs.tsx:15` | Tab paling kanan (mis. Tutup Buku, Ringkasan) terpotong atau terdorong keluar layar di mobile. | **Tinggi** | Tambahkan kelas responsif `overflow-x-auto no-scrollbar scroll-smooth flex-nowrap` pada `TabsList` untuk perangkat `<md`. | Kecil | Rendah | Tidak (desktop tetap flexbox penuh) | Tidak | Tidak |
| **RS-03** | **Header Halaman: Kelompok Tombol Aksi Bertabrakan dengan Judul di Lebar 768-1024px**<br>Di breakpoint tablet portrait (768px), judul halaman (`h1`) yang panjang dan baris tombol aksi (mis. Tambah Data, Filter, Unduh / Ekspor) berada pada baris yang sama tanpa pembagian flex yang cukup. | `src/features/master-data/projects-page.tsx:120`, `src/features/payment-approvals/admin-approvals-page.tsx:95` | Tombol aksi terhimpit ke judul atau terpotong tepi layar. | **Tinggi** | Pastikan header halaman selalu menggunakan pola terstandar `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between` dengan `flex-wrap` aman di breakpoint tablet. | Kecil | Rendah | Tidak (desktop `sm:flex-row` tetap identik) | Tidak | Tidak |
| **RS-04** | **Modal Dialog Bertingkat Melebihi Tinggi Viewport Ponsel (320-640px)**<br>Modal kompleks seperti `edit-record-dialog.tsx` dan `spk-charter-fields.tsx` memiliki tinggi konten melebihi layar ponsel tanpa batas tinggi dinamis pada container dialog. | `src/features/client-projects/dialogs/edit-record-dialog.tsx:120` | Tombol simpan dan batal di footer modal berada di luar layar dan tidak bisa diakses jika keyboard virtual muncul. | **Kritis** | Terapkan batas tinggi maksimal responsif `max-h-[85vh] sm:max-h-[90vh] flex flex-col` dengan `overflow-y-auto` di area konten form dan footer yang terkunci di dasar (`shrink-0 sticky bottom-0`). | Sedang | Rendah | Tidak (desktop tetap proporsional) | Tidak | Tidak |
| **RS-05** | **Field Pencarian Cepat di Header Mobile Menyusut Kurang Optimal**<br>Header mobile (`portal-shell.tsx`) menyembunyikan breadcrumb dan input pencarian, tetapi tombol pemicu Command Palette belum memiliki ikon sentuh ringkas di header mobile. | `src/components/layout/portal-shell.tsx:185-210` | Pengguna ponsel tidak dapat memicu navigasi cepat pencarian halaman lewat header atas (harus membuka drawer menu dulu). | **Sedang** | Tambahkan ikon kaca pembesar ringkas (`size-9 rounded-xl`) di header mobile yang langsung membuka `CommandPaletteDialog`. | Kecil | Rendah | Tidak (desktop header tidak berubah) | Tidak | Tidak |
| **RS-06** | **Kartu Ringkasan KPI Bertumpuk Terlalu Tinggi pada Lebar 320-360px**<br>Grid KPI (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`) pada ponsel sangat kecil membuat pengguna harus scroll sangat panjang sebelum mencapai tabel transaksi utama. | `src/features/dashboard/user-dashboard.tsx:140`, `src/features/master-data/admin-dashboard.tsx:190` | Efisiensi peninjauan ringkasan di mobile menurun. | **Sedang** | Optimalkan padding kartu KPI di mobile menjadi `p-3.5 sm:p-5` dengan ukuran angka `text-lg sm:text-2xl` agar lebih padat dan proporsional. | Kecil | Rendah | Tidak (desktop tetap `p-5 text-2xl`) | Tidak | Tidak |
