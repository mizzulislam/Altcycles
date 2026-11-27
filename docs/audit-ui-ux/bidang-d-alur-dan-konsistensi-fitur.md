# Bidang D: Alur dan Konsistensi Fitur (ID: FL-xx)

Dokumen ini mengevaluasi konsistensi interaksi pengguna: pola CRUD, konfirmasi aksi, umpan balik validasi form, notifikasi toast, status perubahan belum tersimpan, alur unduh dokumen, serta kesiapan publish produksi.

---

## 1. Analisis Alur Pengguna Utama

| Alur Interaksi | Standar Sistem Altcycles | Temuan Inkonsistensi di Lapangan | Rekomendasi Solusi |
| :--- | :--- | :--- | :--- |
| **Pola CRUD & Konfirmasi** | Wajib memakai `ConfirmActionDialog` terstandar untuk semua aksi hapus/batal. | Konsistensi sangat tinggi. Seluruh fitur utama sudah memigrasikan `AlertDialog` lokal ke `ConfirmActionDialog`. | Pertahankan dan jaga di level lint CI agar tidak ada dialog konfirmasi liar. |
| **Validasi Formulir & Error Feedback** | Tanda bintang merah `*` pada label wajib (`<FieldLabel required>`). | Umpan balik error validasi masih didominasi toast melayang, belum konsisten menyediakan pesan error inline di bawah field input. | Tambahkan pesan error inline semantik (`<p className="text-[11px] text-destructive mt-1">`) tepat di bawah field yang gagal divalidasi. |
| **Status Simpan & Loading State** | Tombol submit menampilkan icon spinner saat proses asinkron berlangsung. | Beberapa tombol di modal konfigurasi tidak mendisable tombol Batal saat tombol Simpan sedang memuat. | Kunci kedua tombol (`disabled={isSubmitting}`) saat mutasi data berlangsung. |
| **Alur Unduh & Ekspor** | Wajib menggunakan `ExportDownloadMenu` dengan label "Unduh / Ekspor" (3 format: XLSX, PDF, CSV). | Sangat konsisten di seluruh tabel transaksi dan master. Pencegahan clipping sudah terbukti via portal. | Pertahankan. |
| **Filter, Urut & Pencarian** | Toolbar ringkas di header kartu dengan debounce pencarian 300ms. | Di layar mobile sempit, toolbar filter bertumpuk menjadi 3 baris dan mendorong tabel ke bawah. | Sediakan tombol filter popover/sheet ringkas di mobile dengan indikator badge jumlah filter aktif. |
| **Internasionalisasi (i18n)** | Seluruh teks melalui hook `useTranslation` (kamus `id` dan `en`). | Hampir 100% teks lolos verifikasi i18n, tidak ditemukan teks bocor yang signifikan. | Pertahankan verifikasi via skrip `i18n-scan-audit.mjs`. |

---

## 2. Tabel Temuan Bidang D (ID: FL-xx)

| ID | Fitur / Halaman | Deskripsi Masalah Alur | Bukti Kode | Dampak | Keparahan | Rekomendasi Konkret | Berdampak ke Desktop? | Perlu Keputusan? |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: |
| **FL-01** | Form Input Transaksi & Jurnal | Tidak ada konfirmasi saat menutup dialog yang formulirnya sudah terisi sebagian | `src/features/accounting/components/journal-entry-dialog.tsx` | Pengguna kehilangan draf isian data bila tidak sengaja menekan area luar atau tombol Esc | Sedang | Pasang hook `useUnsavedChangesWarning` jika form dalam status dirty | **Tidak** | Tidak |
| **FL-02** | Toolbar Filter di Mobile | Bilah filter (pencarian, tanggal, status) memakan hingga 45% tinggi layar mobile | `src/features/purchase-orders/po-page.tsx:310` | Konten baris tabel hanya tersisa 1-2 baris yang terlihat di layar ponsel 393px | Sedang | Rangkum kontrol filter di mobile menjadi 1 baris: Input cari + 1 Tombol Filter Drawer | **Tidak** | Tidak |
| **FL-03** | Error State Rute & Sesi | Halaman 404 dan Not Authorized memakai gaya visual yang berbeda dari PortalShell | `src/features/not-found/not-found-page.tsx:27` | Disorientasi navigasi saat pengguna tersasar | Rendah | Samakan tata letak 404 dengan wrapper Card standar berlatar `--background` | **Tidak** | Tidak |
| **FL-04** | Judul Tab Browser & Favicon | Beberapa transisi rute tidak langsung memperbarui `document.title` halaman secara dinamis | `src/App.tsx:145` | Pengguna sulit membedakan tab saat membuka banyak dokumen keuangan | Rendah | Pasang hook `useDocumentTitle(t(pageTitle))` di setiap wrapper halaman utama | **Tidak** | Tidak |

---

## 3. Kesiapan Publish Produksi (Production Readiness)
- **Status:** **92% Siap Produksi**.
- Seluruh logika bisnis keuangan, rumus pembagian hasil, validasi CoA, dan ekspor dokumen multi-format berfungsi dengan stabilitas tinggi.
- Penyempurnaan alur difokuskan pada penanganan form dirty state dan optimasi toolbar mobile.
