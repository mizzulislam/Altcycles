# Audit Menyeluruh & Inventarisasi Otomatis i18n Altcycles (Langkah 1)

Dokumen ini mencatat inventarisasi lengkap dual-bahasa (ID/EN) di seluruh rute, portal, tab, modal/dialog, toast, dan status pada aplikasi **Altcycles**.

Hasil pemindaian otomatis statis dan analisis komponen mendeteksi **436 titik teks/klausa belum bersih** yang tersebar di 4 portal utama.

---

## 1. Ringkasan per Portal

| Portal | Role Akses | Rute Utama | File Terdampak | Total Isu | Status |
|---|---|---|---|:---:|---|
| **Portal User** | `user` (Team Member) | `/user/dashboard`, `/user/po`, `/user/pembayaran`, `/user/anggaran` | 4 file | 76 | Belum Bersih (Target Migrasi Tahap 1) |
| **Portal Super Admin** | `super_admin` | `/super-admin/*` (8 rute: dashboard, profil, administrasi, pengguna, konfigurasi, master-tinjau, audit-trail, media-login) | 8 file | 132 | Belum Bersih (Target Migrasi Tahap 2) |
| **Portal Admin** | `admin` (Bendahara) | `/admin/*` (10 rute: dashboard, persetujuan, po, proyek, detail, penagihan, anggaran, akuntansi, bagi-hasil, master) | 10 file | 173 | Sebagian Bersih (Target Migrasi Tahap 3) |
| **Auth, Profil & Shared** | `public` / `shared` | `/login`, `/lupa-kata-sandi`, `/reset-kata-sandi`, `/portal-pembeli`, `/profil`, `/pengaturan/profil` | 8 file | 55 | Belum Bersih (Target Migrasi Tahap 4) |
| **Total Sistem** | | **28 Rute Utama + 18 Sub-Tab/Dialog** | **30 File** | **436** | **Menuju 0 Isu** |

---

## 2. Inventaris Rinci per Rute, Komponen, dan Dialog

### 2.1. Portal User / Team Member (`role="user"`)

| Rute | Tab / Dialog / Sub-Komponen | File Sumber | Isu | Contoh Teks Belum Bersih | Status |
|---|---|---|:---:|---|---|
| `/user/dashboard` | Kartu KPI, Grafik Komposisi, Donut Claim/Bagi-Hasil, Proyek Aktif | `src/features/dashboard/user-dashboard.tsx` | 19 | "Aktivitas PO & Pengajuan Pembayaran", "Status Klaim & Bagi Hasil", "Total Nilai PO", "Sudah Dicairkan", "Proyek Aktif Saya", Tooltip histogram | Belum Bersih |
| `/user/pembayaran` | Formulir Pengajuan Dana, Modal Detail, Pratinjau PA | `src/features/payment-approvals/user-payments-page.tsx` | 5 | Ternary manual nama pemohon ("Requester" : "Pengaju"), "Project Operations", "General Operations", "Financial Admin" | Belum Bersih |
| `/user/po` | Formulir Buat PO, Modal Pembatalan, Pratinjau PO | `src/features/purchase-orders/po-page.tsx` | 52 | Builder spesifikasi cetak PO masih menggunakan ternary `isEn ? ... : ...`, label status PO manual | Belum Bersih |
| `/user/anggaran` | Tabel Alokasi Anggaran Pengguna | `src/features/budgeting/budget-page.tsx` | 0 | Sudah dimigrasikan ke namespace `budgeting` pada langkah sebelumnya | Bersih |

### 2.2. Portal Super Admin (`role="super_admin"`)

| Rute | Tab / Dialog / Sub-Komponen | File Sumber | Isu | Contoh Teks Belum Bersih | Status |
|---|---|---|:---:|---|---|
| `/super-admin/profil-perusahaan` | 4 Tab (Identitas, Rekening & TTD, Sosial Media Footer, Perpajakan PKP), Form Inputs | `src/features/system-config/company-profile-page.tsx` | 32 | Label form ("Nama Resmi Perusahaan", "Nama Merek / Dagang", "Alamat Kantor Operasional", "Nama Direktur"), teks bantuan PKP, tombol simpan | Belum Bersih |
| `/super-admin/media-login` | Tab Media Latar, Pratinjau Halaman Login, Dialog Tambah Media | `src/features/system-config/login-media-page.tsx` | 26 | "Media & Tampilan Latar Login", "Tambah Media Login", "Pratinjau Halaman Masuk", status badge tampil, form upload | Belum Bersih |
| `/super-admin/konfigurasi` | Tab Pengaturan Umum, Keamanan, Integrasi | `src/features/system-config/system-config-page.tsx` | 40 | Parameter batas waktu sesi, konfigurasi enkripsi, label input konfigurasi sistem | Belum Bersih |
| `/super-admin/administrasi` | Form Tambah/Ubah Sequence & Template Dokumen | `src/features/system-config/admin-settings-page.tsx` | 19 | Modal ubah format penomoran, modal template dokumen resmi & catatan kaki | Belum Bersih |
| `/super-admin/audit-trail` | Dialog Diff Rekaman Audit, Format Angka Pagination | `src/features/system-config/audit-trail-page.tsx` | 7 | String pagination format manual, modal diff before/after state | Belum Bersih |
| `/super-admin/master-tinjau` | Helper toast dan kontrol | `src/features/system-config/master-readonly-page.tsx` | 4 | Teks fallback toast | Belum Bersih |
| `/super-admin/pengguna` | Dropdown multi-peran baris tabel | `src/features/system-config/users-management-page.tsx` | 3 | Tooltip aksi baris | Belum Bersih |
| `/super-admin/dashboard` | Grafik audit & metrik | `src/features/system-config/super-admin-dashboard.tsx` | 1 | Fallback satuan pengguna | Belum Bersih |

### 2.3. Portal Admin (`role="admin"`)

| Rute | Tab / Dialog / Sub-Komponen | File Sumber | Isu | Contoh Teks Belum Bersih | Status |
|---|---|---|:---:|---|---|
| `/admin/proyek` | Form Tambah Proyek, Modal Edit Proyek, Filter Kategori | `src/features/master-data/projects-page.tsx` | 71 | "Tambah Proyek Baru", "Edit Data Proyek", "Metode Pengakuan Pendapatan", "Pilih Klien", placeholder pencarian | Belum Bersih |
| `/admin/po-internal` | Modal Catat PO Internal, Modal Batalkan PO | `src/features/purchase-orders/po-page.tsx` | 52 | Builder cetak PO vendor, modal pembatalan PO | Belum Bersih |
| `/admin/penagihan` | Modal Buat Invoice, Modal Catat Pembayaran, Form Edit | `src/features/invoicing/invoicing-page.tsx` | 31 | Dialog pelunasan invoice termin, pilihan akun penerima pembayaran | Belum Bersih |
| `/admin/dashboard` | Label Donut Charts AR, Seri Grafik Bulanan | `src/features/master-data/admin-dashboard.tsx` | 8 | Label grafik donat komposisi piutang usaha | Belum Bersih |
| `/admin/persetujuan` | Modal Konfirmasi Tolak Pengajuan Pembayaran | `src/features/payment-approvals/admin-approvals-page.tsx` | 6 | Dialog penolakan pengajuan dana | Belum Bersih |
| `/admin/akuntansi` | Dialog Tutup Buku Manual, Dialog Pembukaan Periode | `src/features/accounting/accounting-page.tsx` | 3 | Modal pembukaan periode buku baru | Belum Bersih |
| `/admin/proyek/:projectId` | Dialog Buat Quotation / BAKP / BAST | `src/features/client-projects/project-detail-page.tsx` | 2 | Judul dialog pembuatan dokumen lampiran | Belum Bersih |
| `/admin/anggaran` | Manajemen Pagu Anggaran Proyek | `src/features/budgeting/budget-page.tsx` | 0 | Sudah dimigrasikan ke `budgeting` | Bersih |
| `/admin/bagi-hasil` | Distribusi Dividen & Rekonsiliasi Kas | `src/features/profit-sharing/profit-sharing-page.tsx` | 0 | Sudah dimigrasikan ke `profit_sharing` | Bersih |
| `/admin/master` | Master Vendor, Pelanggan, Produk & Layanan | `src/features/master-data/parties-master-page.tsx` | 0 | Sudah dimigrasikan ke `parties` | Bersih |

### 2.4. Auth, Profil, Buyer Portal, & Layout Bersama

| Rute | Tab / Dialog / Sub-Komponen | File Sumber | Isu | Contoh Teks Belum Bersih | Status |
|---|---|---|:---:|---|---|
| `/portal-pembeli` | Tracking Dokumen, Tracking Termin, Pengajuan PO | `src/features/buyer-portal/buyer-portal-page.tsx` | 24 | "Lacak Progres & Unduh Dokumen PO", "Ajukan Purchase Order (PO) Baru", "Cek Status Proyek", placeholder | Belum Bersih |
| `/pengaturan/profil` | Tab Pribadi, Akun & Password, Notifikasi | `src/features/profile/profile-settings-page.tsx` | 20 | "Profil Pengguna", "Data Pribadi", "Akun & Kata Sandi", tombol ganti foto, placeholder bio | Belum Bersih |
| `/login` | Carousel Banner Tampilan Latar | `src/features/auth/login-page.tsx` | 4 | "Banner sebelumnya", "Banner berikutnya" | Belum Bersih |
| `/lupa-kata-sandi` & `/reset-kata-sandi` | Form Permintaan Reset & Buat Sandi Baru | `src/features/auth/password-reset-pages.tsx` | 5 | "Pemulihan Kata Sandi", "Email Kerja", "Tetapkan Kata Sandi Baru" | Belum Bersih |
| Layout Shell | Breadcrumb Bar & Header Notifikasi | `src/components/layout/portal-shell.tsx` | 2 | `aria-label="Breadcrumb"`, `aria-label="Buka notifikasi"` | Belum Bersih |

---

## 3. Daftar "Perlu Keputusanku: Ya"

Seluruh temuan berikut membutuhkan konfirmasi pengguna:
1. **Format Tampilan Angka Moneter Antara ID dan EN:**
   - Standar saat ini: Seluruh nilai moneter diformat dengan format lokal Indonesia (`Rp 2.000.600` atau tanda koma `,` desimal).
   - Keputusan pengguna sebelumnya: "Pertahankan format Rp dan format angka yang sekarang; apakah format angka/tanggal ikut berubah ke gaya Inggris (2,000,600) kucatat sebagai 'perlu keputusanku: ya'". Status: Dipertahankan format Rp seragam agar angka pembukuan akuntansi tidak membingungkan pengguna.
2. **Pola Nama Dokumen Resmi Cetak:**
   - Judul dokumen resmi cetak (Invoice, Kuitansi, PO, SPK, BAST) di mode EN diterjemahkan secara resmi (misal: "OFFICIAL RECEIPT", "CLIENT PURCHASE ORDER", "STATEMENT OF WORK").
   - Nomor dokumen tetap menggunakan nomor urut asli sistem (misal: `INV/ALT/2026/11/001`) tanpa perubahan.
3. **Penyimpanan Teks Bebas Masukan Pengguna:**
   - Sesuai keputusan sebelumnya: Teks input pengguna yang terdeteksi bahasa Indonesia akan diterjemahkan secara dinamis saat mode bahasa Inggris aktif tanpa mengubah nilai asli tersimpan di basis data.

---

## 4. Rencana Kerja Eksekusi (Langkah 2)

Eksekusi migrasi menyeluruh dilakukan portal demi portal dengan 1 commit per portal:
- **Batch 1:** Portal User / Team Member (`user-dashboard.tsx`, `user-payments-page.tsx`, `po-page.tsx` mode user)
- **Batch 2:** Portal Super Admin (`company-profile-page.tsx`, `login-media-page.tsx`, `system-config-page.tsx`, sisa `admin-settings-page.tsx`)
- **Batch 3:** Portal Admin (`projects-page.tsx`, `invoicing-page.tsx`, `admin-approvals-page.tsx`, `admin-dashboard.tsx`)
- **Batch 4:** Auth, Profil Pengguna, Buyer Portal, & Layout Shell (`login-page.tsx`, `password-reset-pages.tsx`, `buyer-portal-page.tsx`, `profile-settings-page.tsx`, `portal-shell.tsx`)
