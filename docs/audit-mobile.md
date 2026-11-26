# Audit & Rencana Implementasi Polesan UI/UX Mobile & Tablet Altcycles (`docs/audit-mobile.md`)

Dokumen ini memetakan seluruh hasil audit kondisi antarmuka pada dimensi **Mobile Device (Android, iPhone)** dan **Tablet**, serta **Rencana Implementasi Bertahap** yang dirancang dengan **prinsip aditif mutlak**: tampilan desktop (PC lebar 1024px ke atas) **terkunci 100% dan tidak berubah satu piksel pun**.

---

## 1. Prinsip Utama & Jaminan Perlindungan Desktop (PC Freeze Guard)

1. **Tampilan PC (>= 1024px) Terkunci Mutlak:** Seluruh gaya desktop yang ada dipertahankan nilai aslinya. Tidak ada pengubahan kelas desktop tanpa penutup breakpoint `sm:`, `md:`, atau `lg:`.
2. **Pendekatan Aditif (Mobile-Only Override):** Penyesuaian mobile hanya diterapkan pada breakpoint kecil menggunakan prefix layar kecil (`max-sm:`, `max-md:`) atau kelas dasar mobile-first di mana nilai desktop-nya dipertahankan persis pada `sm:` dan `lg:`.
3. **Pembuktian Regresi Otomatis:** Tes pengaman regresi `tests/unit/desktop-freeze-guard.test.ts` dijalankan sebelum dan sesudah setiap paket kerja. Jika terjadi selisih kelas atau layout pada desktop, perubahan otomatis dibatalkan.
4. **Unit Viewport Dinamis (dvh):** Menggunakan `dvh` (bukan `vh` statis) untuk kontainer modal dialog dan drawer agar tidak terpotong oleh toolbar peramban ponsel atau keyboard virtual.
5. **Aman Notch & Gesture Bar:** Mendukung `viewport-fit=cover` dan fungsi `env(safe-area-inset-*)`.
6. **Bebas Auto-Zoom:** Memastikan seluruh field input di mobile memiliki ukuran font efektif minimum 16px (`text-base sm:text-sm`).

---

## 2. Inventaris Pola Layout & Breakpoint Sistem Saat Ini

| Zona Perangkat | Rentang Viewport | Tailwind Prefix | Penanganan Saat Ini | Rekomendasi Polesan |
| :--- | :---: | :---: | :--- | :--- |
| **Mobile Kecil** | 320px – 374px | Default (`< sm`) | Teks/tombol rawan berdesakan, padding p-5/p-6 terlalu lebar | Padding p-4, tombol full-width, tap target 44px |
| **Mobile Standar** | 375px – 639px | Default (`< sm`) | Input auto-zoom di iOS, 5 ikon header berdesakan | Font input 16px di mobile, utilitas dipindah ke drawer |
| **Tablet Portrait** | 640px – 767px | `sm:` | Sidebar tersembunyi, top bar mulai lega, tabel scroll | Scroll hint fade halus di sisi tabel & tab bar |
| **Tablet Landscape** | 768px – 1023px | `md:` | Sidebar terbuka/drawer, layout grid 2 kolom | Navigasi sentuh halus, dialog responsive |
| **Desktop Terkunci** | **>= 1024px** | `lg:`, `xl:` | **Layout patokan resmi (1920, 1440, 1280, 1024)** | **DILARANG DIUBAH (PIKSEL-IDENTIK)** |

---

## 3. Matriks Temuan Audit UI/UX Mobile & Tablet (ID: MB-xx)

| ID | Rute / Komponen | Perangkat / Lebar | Gejala & Kendala | Penyebab (File : Baris) | Rekomendasi Polesan (Mobile-Only) | Risiko Desktop | Prioritas | Perlu Keputusan User |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **MB-01** | Seluruh Form Input | iPhone & Android (320px–480px) | Browser HP auto-zoom liar saat input di-fokuskan karena font < 16px. | `src/components/ui/input.tsx:13`<br>`textarea.tsx:12`<br>`select.tsx:18` | Terapkan `text-base sm:text-sm` pada input terstandar. Di desktop tetap 14px (`sm:text-sm`). | **Tidak** | **P0** (Kritis) | Tidak |
| **MB-02** | Top Bar Shell Mobile | Layar HP (< 640px) | 5 ikon di kanan header (Search, Notif, Lang, Theme, Menu) berdesakan dan memakan ~220px. | `src/components/layout/portal-shell.tsx:318-359` | Sederhanakan header atas: Logo + Search + Notif + Menu. Pindahkan Lang & Theme ke dasar drawer mobile (zona jempol). | **Tidak** | **P1** (Tinggi) | **Ya** (Penempatan tombol utilitas) |
| **MB-03** | Header Halaman Transaksi | Layar HP (< 640px) | Tombol aksi (Unduh/Ekspor + Tambah) berjejer kaku tanpa wrap, terpotong di HP sempit. | `src/features/invoicing/invoicing-page.tsx:604`<br>`po-page.tsx:600` | Tambahkan `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto`, tombol `w-full sm:w-auto` min 44px tinggi. | **Tidak** | **P1** (Tinggi) | Tidak |
| **MB-04** | Tabel Transaksi | Layar HP & Tablet (< 1024px) | Tidak ada indikator visual bahwa tabel memiliki kolom tambahan di kanan (Status & Aksi). | `src/components/ui/table.tsx:9-15` | Tambahkan scroll shadow hint / edge fade halus di sisi kanan container tabel yang otomatis hilang saat digeser ke ujung. | **Tidak** | **P1** (Tinggi) | Tidak |
| **MB-05** | Kolom Aksi Tabel | Touchscreen Mobile | Icon button aksi 32x32px (`size-8`) terlalu kecil untuk ditekan jari secara nyaman (rawan salah sentuh). | `src/components/ui/table.tsx`<br>Komponen tabel | Tambahkan tap target tak terlihat `after:absolute after:-inset-1.5` dan `touch-manipulation` agar target sentuh 44x44px. | **Tidak** | **P1** (Tinggi) | Tidak |
| **MB-06** | Modal Dialog & Form | iPhone Safari & Android Keyboard | `max-h-[90vh]` tertutup oleh toolbar peramban ponsel atau keyboard virtual HP saat form diisi. | `src/components/ui/dialog.tsx:60`<br>`confirm-dialog.tsx` | Gunakan `max-h-[90dvh] sm:max-h-[90vh]`, sesuaikan padding `p-4 sm:p-6`, tombol footer `w-full sm:w-auto`. | **Tidak** | **P0** (Kritis) | Tidak |
| **MB-07** | Viewport & Notch | iPhone X–16 & Android Gesture | Tepi atas/bawah rawan terpotong notch atau gesture bar karena belum mendukung `viewport-fit=cover`. | `index.html:5` | Tambahkan `viewport-fit=cover` pada meta viewport dan helper safe-area padding. | **Tidak** | **P1** (Tinggi) | Tidak |
| **MB-08** | Tab Bar Horizontal | Layar HP (< 640px) | Tab aktif di posisi ke-3 atau ke-4 berada di luar layar kanan tanpa auto-scroll ke tengah. | `src/components/ui/tabs.tsx:14`<br>Custom tab bars | Tambahkan auto-scroll ringan (`scrollIntoView({ inline: 'center' })`) saat tab aktif di layar sentuh. | **Tidak** | **P2** (Sedang) | Tidak |
| **MB-09** | Kartu KPI Ringkasan | Layar HP (< 375px) | Padding `p-5` dan icon kotak 52px memakan tempat, membuat angka nominal panjang terpotong. | `src/components/shared/dashboard-kpi-card.tsx:135` | Gunakan `p-4 sm:p-5`, icon `size-10 sm:size-[52px]` agar nilai moneter leluasa. | **Tidak** | **P2** (Sedang) | Tidak |
| **MB-10** | Command Palette Modal | Layar HP Portrait | Modal melayang di tengah tertutup keyboard virtual HP, hasil pencarian hanya terlihat 1 item. | `src/components/navigation/command-palette-dialog.tsx:276` | Di mobile (`< sm`), posisikan modal mendekati atas (`top-4 -translate-y-0 sm:top-1/2 sm:-translate-y-1/2`) dengan `max-h-[80dvh]`. | **Tidak** | **P1** (Tinggi) | Tidak |
| **MB-11** | Halaman Login & Auth | Layar HP (< 375px) | Padding kolom form `p-6` terlalu boros untuk layar 360px, form terasa sempit. | `src/features/auth/login-page.tsx:613` | Gunakan `px-4 py-8 sm:p-10 lg:p-12`. Kolom banner kiri tetap `hidden lg:block`. | **Tidak** | **P2** (Sedang) | Tidak |
| **MB-12** | Standar Breakpoint Token | Global Design System | Belum ada dokumentasi resmi 4 zona breakpoint sistem di folder design-system. | `src/index.css`<br>`docs/design-system/` | Dokumentasikan standar 4 zona breakpoint di `docs/design-system/responsive-guidelines.md`. | **Tidak** | **P1** (Tinggi) | Tidak |

---

## 4. Rencana Implementasi Bertahap (Tahap 2 - Per Paket Kecil)

> [!IMPORTANT]
> **Aturan Eksekusi:**
> 1. Pengerjaan dilakukan satu paket per commit.
> 2. Sebelum commit: jalankan `git status` dan `git diff --stat`.
> 3. Jalankan `npm run typecheck`, `npm run lint`, dan `npx vitest run tests/unit/desktop-freeze-guard.test.ts`.
> 4. Verifikasi bahwa tidak ada satu piksel pun tampilan desktop (PC >=1024px) yang berubah.

### Paket M1: Fondasi Viewport, Anti-Auto Zoom Input, & Breakpoint Token (MB-01, MB-07, MB-12)
- **Tujuan:** Menghentikan auto-zoom liar pada Safari/Android, mengaktifkan `viewport-fit=cover`, dan mendokumentasikan 4 zona breakpoint.
- **File Terdampak:**
  - `index.html` (tambahkan `viewport-fit=cover`)
  - `src/components/ui/input.tsx` (tambahkan `text-base sm:text-sm`)
  - `src/components/ui/textarea.tsx` (tambahkan `text-base sm:text-sm`)
  - `src/components/ui/select.tsx` (tambahkan `text-base sm:text-sm`)
  - `docs/design-system/responsive-guidelines.md` (dokumentasi standar breakpoint)
- **Pengujian:** `desktop-freeze-guard.test.ts`, typecheck, lint.

### Paket M2: Modal Dialog Adaptif & Keyboard Safe (MB-06, MB-10)
- **Tujuan:** Memastikan modal dialog dan Command Palette nyaman digunakan di HP dengan keyboard virtual aktif.
- **File Terdampak:**
  - `src/components/ui/dialog.tsx` (gunakan `max-h-[90dvh] sm:max-h-[90vh]`, `p-4 sm:p-6`)
  - `src/components/shared/confirm-dialog.tsx` (tombol footer full-width di mobile)
  - `src/components/navigation/command-palette-dialog.tsx` (posisi top di mobile, `text-base sm:text-[14.5px]`)
- **Pengujian:** Tes dialog dan command palette di simulasi viewport 360x640 dan desktop 1920x1080.

### Paket M3: Header Mobile & Drawer Navigasi Zona Jempol (MB-02)
- **Tujuan:** Merapikan header atas HP agar bersih dan lega, serta menempatkan tombol tema & bahasa di drawer samping bawah.
- **File Terdampak:**
  - `src/components/layout/portal-shell.tsx` (penataan header mobile)
  - `src/components/layout/shell-sidebar.tsx` (penambahan utilitas tema/bahasa di dasar drawer mobile)
- **Pengujian:** Uji buka/tutup drawer di layar 360px dan pastikan header desktop (`hidden md:flex h-16`) 100% identik.

### Paket M4: Tombol Aksi Halaman & Sentuhan Ramah Jempol (MB-03, MB-05)
- **Tujuan:** Membuat tombol aksi transaksi (`Unduh/Ekspor` & `+ Tambah`) menjadi tombol sentuh penuh di HP dengan target sentuh min 44px.
- **File Terdampak:**
  - `src/components/ui/button.tsx` / `table.tsx` (tap target helper `after:absolute after:-inset-1.5`)
  - `src/components/shared/export-download-menu.tsx` (w-full di mobile bila dipanggil di header transaksi)
- **Pengujian:** Uji klik di mobile dan pastikan tata letak tombol desktop di ujung kanan bawah tetap presisi.

### Paket M5: Scroll Hint Indikator pada Tabel & Auto-Scroll Tab Bar (MB-04, MB-08)
- **Tujuan:** Memberikan petunjuk visual bahwa tabel/tab dapat digeser ke samping di HP tanpa mengganggu tampilan desktop.
- **File Terdampak:**
  - `src/components/ui/table.tsx` (scroll edge fade hint di mobile)
  - `src/components/ui/tabs.tsx` (auto-scroll tab aktif ke tengah di mobile)
- **Pengujian:** Uji geser tabel pada emulasi 360px dan verifikasi desktop bebas scroll shadow.

### Paket M6: Kartu KPI Ringkasan & Form Login Ponsel Sempit (MB-09, MB-11)
- **Tujuan:** Optimalisasi padding kartu KPI dan form login di layar 320px–360px agar nominal panjang tidak terpotong.
- **File Terdampak:**
  - `src/components/shared/dashboard-kpi-card.tsx` (`p-4 sm:p-5`, icon responsive)
  - `src/features/auth/login-page.tsx` (`px-4 py-8 sm:p-10 lg:p-12`)
- **Pengujian:** Uji render kartu KPI nominal triliunan di layar 360px dan desktop 1920px.

---

## 5. Hal yang Perlu Keputusan User Sebelum Eksekusi

1. **MB-02 (Penempatan Toggle Tema & Bahasa di Mobile):**
   - *Opsi A (Direkomendasikan):* Pindahkan `LanguageToggle` dan `ThemeToggle` ke bagian bawah drawer navigasi mobile (zona jempol). Header mobile atas hanya menampilkan: Logo, tombol Cari, tombol Notifikasi, dan tombol Menu (hamburger).
   - *Opsi B:* Pertahankan di header mobile atas, namun dengan ukuran tombol lebih ramping (`size-8` dengan `gap-1`) agar tidak menekan logo.
2. **MB-03 (Tata Letak Tombol Aksi Header Halaman di Mobile):**
   - *Opsi A (Direkomendasikan):* Di layar mobile, tombol `Unduh / Ekspor` dan tombol utama `+ Tambah / Terbitkan` ditumpuk vertikal dengan lebar penuh (`w-full`), sehingga sangat mudah disentuh ibu jari tanpa salah tekan. Di desktop tetap kembali sejajar horizontal di kanan bawah (`sm:w-auto sm:flex-row`).
   - *Opsi B:* Tetap berdampingan horizontal di mobile dengan ukuran 50% - 50%.
