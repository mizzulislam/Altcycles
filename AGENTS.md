# Konvensi Proyek Altcycles

Dokumen ini mencatat konvensi arsitektur komponen dan penggunaan skill untuk **Altcycles** (sistem administrasi keuangan dan akuntansi internal / ERP keuangan milik Altvira).

## 1. Fondasi Komponen & Token Desain UI

- **Fondasi Utama:** `shadcn` adalah fondasi utama seluruh komponen UI aplikasi.
- **Komponen Tambahan di Atas Fondasi:** Komponen dan blok dari `21st.dev`, `reactbits`, dan `tailark` ditambahkan **di atas `shadcn`** menggunakan **token desain yang sama** (variabel warna, tipografi, radius, spacing, dan tema yang seragam), bukan membawa sistem token terpisah yang saling bertabrakan.
- **Koordinasi Skill Desain:** Workspace ini memiliki beberapa skill desain dan UX (`frontend-design`, `ui-ux-pro-max`, `design-taste-frontend`, `awesome-design-md`, `web-design-guidelines`, `motion`, `driver-js`). Skill desain tidak boleh saling menimpa konfigurasi proyek atau menetapkan keputusan desain/stack secara sepihak sebelum dokumen kebutuhan dan arahan desain disetujui.
- **Standar Tata Letak Header Halaman & Jarak Bagian (Design System Rule):**
  - Seluruh halaman portal internal menggunakan `flex flex-col gap-6` untuk spasi vertikal antar bagian, serta header halaman `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between` tanpa garis pemisah bawah `border-b`.
  - Judul halaman (`<h1>`) menggunakan `text-2xl sm:text-3xl font-bold tracking-tight text-foreground`, subjudul ringkas 1 kalimat `text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed`, dengan kelompok tombol aksi di kanan sejajar baris bawah (`sm:items-end`).
- **Standar Kartu Konten, KPI, & Spasi Judul-Deskripsi (`Card`) (Design System Rule):**
  - Komponen `Card` terstandar memakai `rounded-2xl border-border/80 bg-card shadow-2xs`.
  - Jarak antara judul div/kartu (`CardTitle`) dan teks deskripsi di bawahnya (`CardDescription`) wajib rapat dan konsisten **4px** (`gap-1` langsung di `CardHeader` atau wrapper `<div className="space-y-1 min-w-0">` tanpa `mt-0.5`/`mt-1` ganda pada `CardDescription`).
  - Seluruh kartu ringkasan KPI memakai pola modern: `p-5 flex items-center justify-between gap-4`, label **Proper Case** `text-xs font-medium text-muted-foreground`, nilai `text-xl sm:text-2xl font-bold tracking-tight tabular-nums`, subjudul polos `text-[11px] text-muted-foreground mt-1`, serta ikon kotak `size-10 rounded-xl border` di sisi kanan (tanpa tag badge).
- **Standar Tombol & Warna Aksen (`Button`) (Design System Rule):**
  - Komponen `Button` terstandar memakai radius `rounded-xl` (`default`: `h-9 px-4 text-xs sm:text-sm font-semibold`; `sm`: `h-8 rounded-xl px-3 text-xs`; `icon`: `size-9 rounded-xl`; icon button baris tabel `size-8 rounded-lg`), sejajar tinggi dengan `ExportDownloadMenu`.
  - Warna utama menggunakan token semantik `primary`; warna aksen interaktif sekunder (tombol Edit biru lembut, kotak Google Drive, ikon aksen profil) diseragamkan memakai `text-primary dark:text-sky-400` / `bg-primary/10 border-primary/25` tanpa kode hex acak.
- **Standar Header Tabel (Design System Rule):**
  - Seluruh judul kolom pada header tabel (`<TableHead>` / `<th>`) wajib menggunakan alignment rata tengah (`text-center`) dan ukuran `text-xs sm:text-sm font-semibold`.
  - Seluruh data pada sel tabel (`<TableCell>` / `<td>`) menggunakan alignment vertikal rata atas (`align-top`), ukuran font utama baris yang seragam antar kolom (`text-xs sm:text-sm leading-5`), serta offset vertikal yang sejajar untuk lencana status (`-my-px`) maupun icon button aksi (`-my-1.5` pada wrapper icon button `size-8`) agar baris pertama setiap kolom sejajar sempurna.
  - Style teks pada judul kolom tabel wajib menggunakan **Proper Case** (huruf kapital hanya di awal kata, dilarang UPPERCASE/huruf kapital semua).
  - Penerapan **Proper Case** juga berlaku untuk label KPI, judul seksi profil, dan badge di seluruh portal, **kecuali** pada halaman **Laporan Keuangan (`reports-page`)** dan modul **Akuntansi (`accounting-page`, `journals-page`, `accounting-hub-page`)** sesuai kaidah pelaporan akuntansi resmi.
- **Standar Nominal Moneter Tabel (Design System Rule):**
  - Seluruh nilai moneter di dalam sel tabel (misalnya `Rp`, `USD`, dll.) wajib memposisikan simbol mata uang di ujung kiri kolom dan angka nominal rata kanan di ujung kanan kolom (`flex items-center justify-between gap-3 w-full tabular-nums`) menggunakan komponen terstandar `MonetaryCell`, mencontoh pola pada halaman Akuntansi & Laporan.
- **Standar Input Angka & Pemisah Desimal (`NumberInput`) (Design System Rule):**
  - Seluruh field input yang menerima nilai angka (nominal moneter, persentase, durasi, kuantitas, biaya, dsb. kecuali input tahun kalender atau kode/konfigurasi digit seperti jumlah digit penomoran & bulan/tahun periode) wajib menggunakan komponen terstandar `NumberInput` (bukan `<Input type="number" />` mentah).
  - Format pemisah angka wajib mengikuti standar lokal Indonesia (`id-ID`): tanda titik (`.`) sebagai pemisah ribuan dan tanda koma (`,`) sebagai pemisah desimal.
- **Standar Upload Gambar (Upload Lokal & Google Drive) (Design System Rule):**
  - Seluruh field upload gambar (foto profil, logo perusahaan, logo klien, gambar tanda tangan/TTD, gambar paraf, dan aset visual lainnya) wajib memunculkan modal dialog dua tab (**Berkas Komputer / Upload Lokal** & **Google Drive**) menggunakan pola `AvatarUploadDialog` / `ImageAssetUploadBox`.
  - Fitur integrasi Google Drive (Google Picker maupun tautan file Google Drive) harus dapat digunakan di seluruh field upload gambar tersebut.
- **Standar Tata Letak & Margin Kartu Tabel (Design System Rule):**
  - Kartu yang membungkus tabel data wajib menggunakan pola **edge-to-edge** (`Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden"`), `CardHeader` berpemisah (`px-6 py-4 border-b border-border/70`) dengan kontrol filter/pencarian sejajar atau dalam bilah toolbar ringkas (`px-6 py-3.5 border-b border-border/60`) tanpa jarak kosong berlebih, dan `CardContent className="p-0"`.
  - Ketika data kosong, `<TableHeader>` tetap ditampilkan dan empty state dirender menyatu di dalam `<TableBody>` (`border-t border-dashed border-border/70 bg-muted/10`), **dilarang** membungkus `<Table>` atau `<EmptyState>` di dalam container ber-border ganda (`rounded-xl border`) di dalam `CardContent` ber-padding besar.
  - Lebar kolom (`min-w` / padding sel `pl-6` di kolom pertama dan `pr-6` di kolom terakhir) harus proporsional agar seluruh kolom hingga kolom `Aksi` muat utuh di viewport desktop standar tanpa scrollbar horizontal yang memotong konten.
- **Standar Tombol Kolom Aksi (Design System Rule):**
  - Seluruh tombol tindakan di dalam kolom `Aksi` tabel transaksi dan master wajib berbentuk **icon button** yang ringkas (`size="icon"`, `className="size-8 rounded-lg ..."`), dengan atribut `title` dan `<span className="sr-only">` untuk aksesibilitas.
  - **Pengecualian Audit Trail:** tombol aksi perbandingan rekaman pada halaman *Audit Trail* (`audit-trail-page`) tetap menggunakan tombol teks **Bandingkan**.
- **Standar Modal Dialog & Konfirmasi (Design System Rule):**
  - Header modal dialog wajib bersih dan minimalis: hanya menampilkan `DialogTitle` (judul modal) tanpa icon dekoratif di sebelah kiri judul dan tanpa subteks/deskripsi di bawahnya, mencontoh pola modal "Catat Transaksi".
  - **Keselarasan Vertikal Header & Tombol Close (Sejajar):** Judul modal dialog (`DialogTitle`) dan tombol tutup dialog (`DialogClose` / `X`) wajib berada pada satu baris dan sejajar sempurna secara vertikal (`flex items-center justify-between`). Tombol tutup harus terintegrasi langsung di dalam `DialogHeader` (bukan elemen terpisah yang mengambang dengan koordinat manual) sehingga saat modal discroll dan header di-freeze (`sticky`), posisi judul dan tombol close tetap sejajar rapi, simetris, dan proporsional terhadap padding header (`px-5 py-4 sm:px-6 sm:py-4`).
  - Tier lebar modal terstandar: konfirmasi (`ConfirmActionDialog`, wajib dipakai untuk semua dialog hapus/konfirmasi alih-alih `AlertDialog` inline), form sederhana (`sm:max-w-lg`), form menengah (`sm:max-w-2xl`), dan form kompleks 2+ kolom / tabel (`sm:max-w-3xl`).
  - Judul seksi atau grup field di dalam modal dialog wajib menggunakan **Proper Case** (bukan UPPERCASE).
  - Spasi, margin, dan padding antar field harus lega dan proporsional sehingga tidak ada elemen yang berhimpitan, terpotong, atau saling bertabrakan.
- **Standar Tombol Ekspor (`Unduh / Ekspor`) (Design System Rule):**
  - Seluruh tombol ekspor laporan atau daftar data transaksi/anggaran wajib menggunakan komponen terstandar `ExportDownloadMenu` dengan label teks **`Unduh / Ekspor`** (dilarang menggunakan label terpisah seperti `Ekspor Excel` atau `Download`). Halaman *Manajemen Akun* dan *Audit Trail* Super Admin tidak memerlukan tombol ekspor.
  - Setiap tombol ekspor wajib menyediakan lengkap **3 pilihan format unduhan**: **Excel (`.xlsx`)**, **PDF Dokumen (`.pdf`)**, dan **Format CSV (`.csv`)**.
- **Standar Penanda Field Wajib (`*`) (Design System Rule):**
  - Seluruh judul field formulir yang wajib diisi (*required*) — baik di modal dialog, tab profil, maupun halaman input — wajib menampilkan tanda bintang merah `*` (`text-destructive`) tepat di sebelah label menggunakan prop `<FieldLabel required>` (atau `<span className="text-destructive ml-1" aria-hidden="true">*</span>` jika memakai label khusus).
- **Standar Checkbox (`Checkbox`) (Design System Rule):**
  - Seluruh checkbox pilihan tabel maupun persetujuan/konfirmasi form wajib menggunakan komponen terstandar `Checkbox` dari `@/components/ui/checkbox` (dilarang menggunakan `<input type="checkbox" />` mentah agar tampilan konsisten mengikuti token desain shadcn Altcycles serta mendukung status `indeterminate`).
- **Standar Navigasi Tab (`Tabs`) (Design System Rule):**
  - Seluruh bar navigasi tab halaman wajib memakai komponen `@/components/ui/tabs` (container `bg-card rounded-2xl p-2 border border-border/80 shadow-2xs`, item `rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold` dengan `bg-primary text-primary-foreground shadow-xs` saat aktif, ikon di sebelah kiri label, serta badge pill `tabular-nums` jika menampilkan jumlah item).
  - **Pengecualian Tab Profil 4-Kolom:** halaman *Profil Perusahaan* dan *Pengaturan Pengguna* tetap menggunakan tata letak grid 4 kolom penuh (`grid-cols-2 md:grid-cols-4 gap-2 p-2`), namun menyamakan tinggi, padding, ukuran teks (`text-xs sm:text-sm font-semibold`), dan radius item (`rounded-xl py-2.5 px-3.5`) dengan standar tab halaman lainnya.

## 2. Keamanan & Kerahasiaan Data Keuangan

- Jangan pernah menyimpan API key, token, kredensial, atau secret di dalam file skill, konfigurasi repo, maupun kode sumber.
- Jangan mempublikasikan komponen, tema, atau kode internal Altcycles ke registri publik eksternal (seperti fitur publish `21st-registry` atau `21st-design-sync`).

