# Altcycles Design System (DESIGN.md)

Dokumen spesifikasi sistem desain dan panduan antarmuka resmi untuk **Altcycles** (Sistem Administrasi Keuangan & Akuntansi Terpadu milik PT Altvira Solusindo Teknologi). Dokumen ini berfungsi sebagai acuan baku komponen visual, token desain, tipografi, dan perilaku responsif untuk implementasi kode serta integrasi alat otomasi desain (seperti Google Stitch).

---

## 1. Filosofi & Karakter Desain

- **Tujuan Utama:** Menghadirkan antarmuka sistem enterprise keuangan dan akuntansi (B2B SaaS / ERP Internal) yang memiliki densitas data optimal, presisi matematis, kejelasan hierarki visual, dan nuansa modern yang tenang serta profesional.
- **Karakter Visual:**
  - **Fintech Precision:** Angka moneter dan kode transaksi selalu terstruktur dengan font monospace tabular (`tabular-nums`) agar perbandingan saldo dan debit/kredit sejajar vertikal.
  - **Calm & Deep Surfaces:** Memadukan latar belakang netral yang sejuk (`#F0F1F3` di light mode dan midnight navy `#090E19` di dark mode) dengan aksen warna korporat biru Altvira (`#0B43C8`) dan sian elektrik (`#1FB1F2`).
  - **Defensive Layout:** Menjamin keutuhan visual di perangkat desktop ($\ge 1024$px) agar terkunci secara mutlak (*Desktop Freeze Rule*), sembari menyediakan pengalaman mobile yang adaptif dan ringkas melalui micro-dialog dan floating action controls.
- **Fondasi Teknologi:** `shadcn/ui` (gaya New York) yang diperluas dengan token Tailwind CSS v4, Motion (Framer Motion), dan ikonografi semantik Lucide React.

---

## 2. Palet Warna & Token Semantik

Sistem warna Altcycles didefinisikan menggunakan variabel CSS semantik yang mendukung pergantian mode terang (*Light Mode*) dan mode gelap (*Dark Mode*) secara instan tanpa flicker (*Zero CLS*).

### 2.1. Warna Inti Antarmuka (Core Tokens)

| Token Semantik | Light Mode (HEX) | Dark Mode (HEX / RGBA) | Peran Penggunaan |
| :--- | :---: | :---: | :--- |
| `--background` | `#F0F1F3` | `#090E19` | Latar kanvas utama aplikasi |
| `--foreground` | `#2A2A2A` | `#F8FAFC` | Warna teks utama dan judul |
| `--card` | `#FFFFFF` | `#121A2B` | Permukaan kartu kontainer dan seksi |
| `--card-foreground` | `#2A2A2A` | `#F8FAFC` | Teks di atas permukaan kartu |
| `--popover` | `#FFFFFF` | `#121A2B` | Permukaan dropdown, select, dan dialog |
| `--popover-foreground` | `#2A2A2A` | `#F8FAFC` | Teks di atas dropdown dan dialog |
| `--primary` | `#0B43C8` | `#0B43C8` | Aksi utama, status aktif, tombol CTA |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Teks di atas tombol warna primer |
| `--secondary` | `#E0F2FE` | `#1E293B` | Aksi sekunder, badge netral, latar tombol ringan |
| `--secondary-foreground`| `#0369A1` | `#F8FAFC` | Teks di atas elemen sekunder |
| `--muted` | `#E4E7EC` | `#1A253C` | Latar belakang dinonaktifkan, baris tabel zebra |
| `--muted-foreground` | `#616C82` | `#A0ABBD` | Teks subjudul, label sekunder, keterangan |
| `--accent` | `#EBF1FD` | `#172554` | Sorotan hover, item terpilih |
| `--accent-foreground` | `#0B43C8` | `#60A5FA` | Teks di atas sorotan hover |
| `--destructive` | `#DC2626` | `#EF4444` | Aksi berbahaya, tanda bintang wajib `*`, error |
| `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` | Teks di atas tombol bahaya |
| `--border` | `#D8DCE3` | `rgba(255, 255, 255, 0.09)` | Garis pembatas kartu, tabel, dan pemisah |
| `--input` | `#D8DCE3` | `rgba(255, 255, 255, 0.12)` | Border elemen input form |
| `--ring` | `#1FB1F2` | `#1FB1F2` | Ring fokus aksesibilitas keyboard |
| `--field-bg` | `#F4F6F9` | `#0D1526` | Latar belakang input form kontras |
| `--field-border` | `#D1D8E3` | `rgba(255, 255, 255, 0.08)` | Border input form kontras |

### 2.2. Warna Brand Altvira (Brand Accents)

- **Altvira Blue:** `#0B43C8` (Warna identitas korporat resmi)
- **Altvira Cyan:** `#1FB1F2` (Aksen sekunder, fokus ring, indikator tren kas)
- **Altvira Dark:** `#2A2A2A` (Warna teks standar kontras tinggi)
- **Altvira Midnight:** `#090E19` (Latar belakang kanvas dark mode)
- **Altvira Soft:** `#F0F1F3` (Latar belakang kanvas light mode)
- **Altvira Muted:** `#616C82` (Warna teks pendukung dan placeholder)

### 2.3. Token Status Keuangan Semantik (Financial Status Tokens)

Seluruh status keuangan (Lunas, Menunggu Persetujuan, Draf, Jatuh Tempo, Ditolak) wajib menggunakan kombinasi warna latar, teks, dan garis pembatas semantik berikut:

| Kategori Status | Background | Foreground (Teks) | Border | Contoh Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `bg-emerald-500/15` (`#DCFCE7`) | `text-emerald-700` (`#15803D`) / dark: `#4ADE80` | `border-emerald-500/30` | Lunas, Disetujui, Terealisasi, Aktif |
| **Warning** | `bg-amber-500/15` (`#FEF3C7`) | `text-amber-800` (`#B45309`) / dark: `#FBBF24` | `border-amber-500/30` | Sebagian Terbayar, Menunggu Approval |
| **Info** | `bg-sky-500/15` (`#E0F2FE`) | `text-sky-800` (`#0369A1`) / dark: `#38BDF8` | `border-sky-500/30` | Diterbitkan, Piutang Belum Tertagih |
| **Danger** | `bg-rose-500/15` (`#FEE2E2`) | `text-rose-800` (`#B91C1C`) / dark: `#F87171` | `border-rose-500/30` | Jatuh Tempo, Ditolak, Dibatalkan |

---

## 3. Tipografi & Skala Teks

Tipografi Altcycles dirancang menggunakan satu keluarga font utama yang berkarakter geometris, modern, dan sangat mudah dibaca pada berbagai tingkat resolusi layar.

### 3.1. Keluarga Font

- **Font Utama (Primary Body & Display):** `Montserrat`, `system-ui`, `-apple-system`, `sans-serif`
  - Konfigurasi: Dimuat via Google Fonts dengan rentang bobot lengkap `300..900` (Light, Regular, Medium, SemiBold, Bold, ExtraBold).
- **Font Angka & Moneter (Numeric & Monospace):** Default sans dengan penegasan angka tabular `tabular-nums` atau `font-mono` khusus untuk nomor jurnal/dokumen (`PRJ/ALT/...`, `JRM/ALT/...`).

### 3.2. Hierarki Tipografi

| Tingkat Hierarki | Kelas Tailwind | Ukuran (px) | Bobot (Weight) | Leading (Line Height) | Penggunaan |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Display / H1** | `text-2xl sm:text-3xl` | 24px / 30px | 700 (Bold) | `tracking-tight leading-tight` | Judul utama halaman portal |
| **Section / H2** | `text-xl sm:text-2xl` | 20px / 24px | 700 (Bold) | `tracking-tight` | Judul modal dialog, tab header |
| **Card Title / H3**| `text-base sm:text-lg` | 16px / 18px | 600 (SemiBold) | `leading-6` | Judul kartu konten, div header |
| **Body Regular** | `text-xs sm:text-sm` | 12px / 14px | 400 (Regular) | `leading-5 / leading-relaxed` | Teks paragraf, sel tabel data |
| **Body Semibold** | `text-xs sm:text-sm` | 12px / 14px | 600 (SemiBold) | `leading-5` | Label tombol, header tabel |
| **Caption / Muted**| `text-[11px] sm:text-xs`| 11px / 12px | 500 (Medium) | `leading-normal` | Keterangan KPI, subteks formulir |
| **Micro Badge** | `text-[10px]` | 10px | 700 (Bold) | `leading-none` | Pill badge penghitung tab |

### 3.3. Aturan Proper Case

- **Wajib Proper Case:** Seluruh label kolom tabel (`<TableHead>`), label kartu KPI, judul seksi formulir, dan lencana status wajib menggunakan **Proper Case** (huruf kapital hanya pada awal setiap kata, misalnya: *Nomor Jurnal*, *Tanggal Transaksi*, *Total Realisasi*).
- **Larangan UPPERCASE:** Dilarang menggunakan huruf kapital semua (`UPPERCASE`), kecuali pada singkatan resmi akuntansi (CoA, PPN, PPh, PO, BAKP, BAST) dan laporan keuangan resmi pada modul akuntansi.

---

## 4. Spasi, Elevasi, Radius, & Tata Letak

### 4.1. Skala Sudut Lengkung (Border Radius)

- **Radius Kartu Utama (`Card`):** `rounded-2xl` (16px) — memberikan kesan modern, ramah, dan solid.
- **Radius Tombol Standar (`Button`):** `rounded-xl` (12px) — seimbang dengan tinggi `h-9`.
- **Radius Elemen Form (`Input`, `Select`):** `rounded-xl` (12px) — seragam dengan tombol.
- **Radius Ikon Baris Tabel (`Icon Button`):** `rounded-lg` (8px) — proporsional untuk ukuran `size-8`.
- **Radius Floating Action Button (`FAB Mobile`):** `rounded-2xl` (16px) — untuk tombol melayang `size-12`.

### 4.2. Skala Elevasi (Shadows)

- **Kartu Konten Standar:** `shadow-2xs` (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`)
- **Navigasi Tab & Tombol:** `shadow-xs` (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.07)`)
- **Modal Dialog & Popover:** `shadow-xl` (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.15)`)
- **Floating Button Mobile:** `drop-shadow-[0_10px_15px_rgba(0,0,0,0.15)]`

### 4.3. Struktur Tata Letak Halaman (Page Structure)

- **Spasi Vertikal Antar Seksi:** Wajib menggunakan `flex flex-col gap-6` (24px).
- **Header Halaman:**
  - Wrapper: `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between` tanpa garis pemisah bawah `border-b`.
  - Judul: Teks maksimal 2 baris pada mobile, dengan ikon micro-dialog info `(i)` tersemat langsung di akhir kalimat judul.
  - Sisi Kanan: Kelompok aksi sejajar di baris bawah (`sm:items-end`).

### 4.4. Empat Zona Breakpoint Responsif & Desktop Freeze

| Zona Viewport | Rentang Lebar | Perilaku Desain |
| :--- | :---: | :--- |
| **Mobile Kecil** | `< 375px` | Tombol aksi full-width, kartu KPI bertumpuk, area sentuh $\ge 44$px |
| **Mobile Standar** | `375px – 639px` | Header mobile dengan ikon info `(i)` inline, tombol melayang (FAB) di kanan bawah |
| **Tablet** | `640px – 1023px` | Header melebar horizontal, kontrol form 2 kolom, tabel responsif |
| **Desktop Terkunci** | **$\ge 1024$px** | **Layout patokan resmi terkunci mutlak (1920, 1440, 1280, 1024). Dilarang bergeser 1 piksel pun.** |

---

## 5. Spesifikasi Komponen Inti

### 5.1. Header Halaman (`PageHeader`)

- Komponen terpusat yang membungkus judul halaman, subjudul ringkas, micro-dialog info, dan kelompok tombol aksi.
- **Perilaku Mobile:**
  - Teks deskripsi disembunyikan dari layar dan dibungkus ke dalam tombol ikon info `(i)` (`InfoIcon size-3.5`) yang membuka `GameDialog`.
  - Seluruh tombol aksi header di mobile otomatis dikonversi menjadi tombol ikon melayang (*Floating Action Button / FAB*) di pojok kanan bawah (`fixed bottom-6 right-5 z-50 flex flex-row items-center gap-2.5`).
- **Perilaku Desktop:** Tombol aksi tertata rapi di sebelah kanan sejajar baris bawah judul (`hidden sm:flex sm:items-end sm:gap-2`).

### 5.2. Tombol Aksi (`Button`)

- **Tinggi Standar:** `h-9 px-4 text-xs sm:text-sm font-semibold rounded-xl`.
- **Icon Button Tabel:** `size="icon"`, `size-8 rounded-lg` dengan target sentuh mobile $\ge 44$px via pseudo-elemen `after:absolute after:-inset-1.5`.
- **Floating Button Mobile:** `size-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary dark:bg-primary dark:text-white`.
- **Aksesibilitas:** Dilarang keras menggunakan atribut `title` bawaan peramban (browser tooltip). Selalu gunakan `ActionTooltip` atau atribut `aria-label` dan `<span className="sr-only">`.

### 5.3. Kartu Konten (`Card`) & Ringkasan KPI

- **Pola Kartu Utama:** `rounded-2xl border-border/80 bg-card shadow-2xs`.
- **Spasi Judul & Deskripsi:** Jarak wajib rapat konsisten **4px** (`gap-1` langsung pada `CardHeader` tanpa `mt` ganda).
- **Kartu Ringkasan KPI:**
  - Tata letak: `p-5 flex items-center justify-between gap-4`.
  - Nilai utama: `text-xl sm:text-2xl font-bold tracking-tight tabular-nums`.
  - Ikon seksi: Kotak kanan `size-10 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-center text-primary`.

### 5.4. Tabel Transaksi Data (`Table`)

- **Pola Edge-to-Edge:** Kartu pembungkus tabel wajib memakai `overflow-hidden` dan `CardContent className="p-0"`.
- **Header Kolom (`TableHead`):**
  - Wajib rata tengah (`text-center`) dan menggunakan teks **Proper Case**.
  - Ukuran: `text-xs sm:text-sm font-semibold`.
- **Sel Baris Data (`TableCell`):**
  - Alignment vertikal wajib rata atas (`align-top`).
  - Nominal moneter wajib menggunakan `<MonetaryCell amount={...} />` (simbol Rp di ujung kiri, angka nominal di ujung kanan dengan `tabular-nums`).
  - Lencana status dilengkapi penyeimbang `-my-px` dan icon button dilengkapi `-my-1.5` agar baseline teks baris pertama sejajar presisi.

### 5.5. Menu Unduh & Ekspor (`ExportDownloadMenu`)

- Seluruh ekspor transaksi dan laporan wajib memakai tombol berlabel teks **`Unduh / Ekspor`** yang menyediakan lengkap 3 pilihan format:
  1. **Excel Spreadsheet (`.xlsx`)**
  2. **Dokumen Resmi PDF (`.pdf`)**
  3. **Data Tabular CSV (`.csv`)**
- **Aturan Anti-Clipping (React Portal Rule):**
  - Dropdown menu unduh **wajib dirender melalui React Portal (`createPortal(..., document.body)`)** dengan `fixed z-[99999]`.
  - Dilarang keras merender popover secara inline `absolute` di dalam kontainer kartu atau tabel karena akan terpotong batas `overflow-hidden`.

### 5.6. Input Angka & Pemisah Desimal (`NumberInput`)

- Seluruh field angka (nominal uang, persentase, kuantitas) wajib menggunakan komponen `NumberInput`.
- Format angka mengikuti standar lokal Indonesia (`id-ID`): tanda titik (`.`) sebagai pemisah ribuan dan tanda koma (`,`) sebagai pemisah desimal.
- Tanda bintang merah wajib: Label field yang wajib diisi wajib menyertakan `<span className="text-destructive ml-1">*</span>` via `<FieldLabel required>`.

### 5.7. Modal Dialog & Konfirmasi (`Dialog`)

- **Header Dialog:** Bersih dan minimalis; hanya menampilkan `DialogTitle` tanpa ikon dekoratif besar.
- **Tombol Tutup (Close):** Terintegrasi langsung sejajar vertikal dengan judul modal (`flex items-center justify-between`) sehingga posisi tetap proporsional saat modal discroll (`sticky header`).
- **Dialog Hapus / Konfirmasi:** Seluruh aksi destruktif wajib menggunakan komponen terstandar `ConfirmActionDialog`.

---

## 6. Aksesibilitas (a11y) & Perilaku Sistem

1. **Rasio Kontras WCAG AA:** Seluruh teks utama memiliki rasio kontras $\ge 7:1$, dan teks sekunder/muted memiliki rasio kontras $\ge 4.5:1$ terhadap latar belakang kartu pada mode terang maupun gelap.
2. **Pencegahan Kursor Kedip (Caret) pada Field Read-Only:** Seluruh elemen read-only wajib menyertakan `caret-transparent select-none cursor-not-allowed` serta handler pembatal klik `onMouseDown={(e) => e.preventDefault()}`.
3. **Larangan Karakter Bullet Point (`•`):** Dilarang menggunakan simbol bullet point sebagai pemisah teks metadata; selalu gunakan tanda hubung strip bersih (`-`) atau garis miring (`/`).
4. **Target Sentuh Mobile:** Elemen interaktif di layar sentuh memiliki area sentuh minimal 44×44px.
5. **Dukungan Multibahasa (i18n):** Seluruh antarmuka mendukung pergantian instan antara Bahasa Indonesia (`id`) dan Bahasa Inggris (`en`).
