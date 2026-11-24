# Laporan Audit Menyeluruh: Pintasan Keyboard, Panel Pintasan, Command Palette, dan Fungsi Shortcut

> **Tanggal Audit:** 24 November 2026  
> **Aplikasi:** Altcycles (Sistem Administrasi Keuangan & ERP Altvira)  
> **Status Audit:** HANYA AUDIT DAN REKOMENDASI (Tidak ada kode aplikasi yang diubah pada tahap ini)  
> **Auditor:** DeepMind Antigravity Agent Engine  

---

## 1. Ringkasan Eksekutif

Audit komprehensif ini memeriksa arsitektur, implementasi kode sumber, dan perilaku runtime dari seluruh ekosistem pintasan keyboard di Altcycles:
1. Halaman Manajemen Super Admin (`/super-admin/pintasan-keyboard`)
2. Modal Pencarian Cepat Global (*Command Palette*) (`CommandPaletteDialog`)
3. Lembar Ringkasan Pintasan Sisi Kanan (*Shortcuts Sheet Drawer*) (`ShortcutsSheet`)
4. Registri Data Statis & Runtime Resolusi (`navigation-shortcuts-registry.ts`)
5. Handler Event Global Keyboard (`useGlobalShortcuts.ts`)
6. Mekanisme Pelacakan Kunjungan Halaman Sering Dikunjungi (`navigation-history.ts`)

### Penilaian Kesehatan Keseluruhan (Health Scorecard)
- **Bagian A (Bug & Keamanan):** `TINGGI` — Ditemukan 11 isu kritis dan penting, termasuk pintasan berstatus "Terkunci" yang ternyata dapat diedit di UI dan disimpan di storage, ketiadaan otorisasi dan persistensi sisi server (tersimpan murni di `localStorage` per peramban tanpa audit trail), serta bentrok layout keyboard non-QWERTY dan pintasan aktif saat dialog modal umum terbuka.
- **Bagian B (Performa & Optimasi):** `SEDANG` — Waktu eksekusi pencarian registri sangat cepat (0.023 ms untuk 40 item; 0.178 ms untuk simulasi 500 item), namun komponen `CommandPaletteDialog` dan `ShortcutsSheet` diimpor secara statis (*eager*) di cangkang utama (`PortalShell`), membebani ukuran bundle awal sebesar ~38 kB uncompressed. Selain itu, handler global `keydown` di-*remount* pada setiap render `PortalShell` karena ketiadaan stabilisasi fungsi callback.
- **Bagian C (UI/UX & Desain Sistem):** `SEDANG` — Terdapat bug visual label ganda ("Umum" "Umum") pada kolom Aksi & Modul, kartu KPI belum menggunakan komponen standar `KpiCard`, serta ketidakkonsistenan badge tombol di Command Palette yang tidak mencerminkan kustomisasi override Super Admin.
- **Bagian D (Kualitas Kode & Pengujian):** `SEDANG` — Dua file utama berukuran raksasa (`navigation-shortcuts-registry.ts` 1.080 baris dan `shortcuts-management-page.tsx` 1.149 baris) dengan tanggung jawab bercampur; cakupan tes unit saat ini mencakup 37 tes, namun memiliki celah pengujian pada layout non-QWERTY, IME, dan fallback tipe data rusak.

### 10 Temuan Teratas Berdasarkan Dampak (Top 10 Critical Findings)

1. **[BUG-03] Pintasan Terkunci Dapat Diedit & Ditimpa di UI dan Registry:**
   Pintasan dengan atribut `isLocked: true` (seperti `/` untuk Command Palette dan `Esc` untuk Tutup Modal) tetap memiliki tombol Edit yang aktif di tabel. Fungsi `saveShortcutOverride()` di registry sama sekali tidak memvalidasi `target.isLocked`, sehingga tombol inti sistem dapat diubah dan dirusak fungsinya.
2. **[BUG-05] Ketiadaan Otorisasi & Persistensi Sisi Server (Penyimpanan Murni Client-Side `localStorage`):**
   Seluruh kustomisasi pintasan disimpan secara eksklusif di `localStorage` peramban lokal tanpa tabel database Supabase, tanpa RLS, tanpa endpoint API, dan tanpa sinkronisasi antar-perangkat. Perubahan Super Admin di Peramban A tidak akan berdampak pada Bendahara atau Anggota Tim di komputer lain, serta tidak ada catatan audit log yang terekam di sistem.
3. **[BUG-01] Pintasan Global Tetap Aktif Saat Dialog Modal Form Terbuka:**
   Prop `isModalOpen` pada `useGlobalShortcuts` di `portal-shell.tsx` hanya memeriksa state `isCommandPaletteOpen || isShortcutsPanelOpen || notifOpen`. Saat modal formulir transaksi, modal edit pengguna, atau modal edit pintasan terbuka, menekan tombol `/`, `?`, atau sekuens `G lalu D` tetap mengeksekusi navigasi dan memicu hilangnya draf data yang belum disimpan.
4. **[BUG-02] Bentrok Tata Letak Keyboard Non-QWERTY (AZERTY/QWERTZ):**
   Pada keyboard layout AZERTY (Prancis/Belgia), tombol `/` dicapai dengan kombinasi `Shift + :`. Handler `useGlobalShortcuts` mendeteksi `hasShift: true` dan `key === "/"`, sehingga menekan tombol `/` justru membuka *Panel Pintasan* (`?`), bukan *Command Palette*.
5. **[UX-01] Label Grup Ganda ("Umum" "Umum") di Bawah Nama Aksi:**
   Pada baris pintasan sistem, kolom "Aksi & Modul" merender badge Modul (`t(item.moduleLabelKey)`) dan badge Grup (`groupLabels[item.group]`) secara berdampingan tanpa deduplikasi. Karena untuk aksi umum kedua nilai tersebut bernilai `"general"` (diterjemahkan menjadi "Umum"), antarmuka menampilkan label ganda identik.
6. **[BUG-04] Perekam Tombol Mengizinkan Penyimpanan Tombol 'G' Tunggal:**
   Jika pengguna menekan tombol 'G' di area perekam lalu mengklik di luar area (*onBlur*), state `isRecording` mati namun `recordedKeys` tetap terisi `["g"]`. Karena validasi simpan hanya memeriksa `recordedKeys.length === 0`, Super Admin dapat menyimpan tombol 'G' tunggal tanpa modifier, yang berakibat membajak seluruh sekuens navigasi "G lalu X".
7. **[BUG-06] Metrik "Pintasan Kustom" Menghitung Kunci Usang & Tidak Valid:**
   Nilai KPI dihitung murni dengan `Object.keys(overrides).length`. Jika ada override yang tombolnya sama persis dengan bawaan pabrik, kunci yang berstatus terkunci, atau ID pintasan usang/dihapus, kartu ringkasan tetap melaporkan sebagai "Dimodifikasi", menghasilkan ketidakkonsistenan data dengan isi tabel.
8. **[BUG-07] Command Palette Mengabaikan Kustomisasi Override Super Admin:**
   Komponen `CommandPaletteDialog` mengambil data menggunakan `getShortcutsForRole(currentRole)` statis dan merender badge tombol dari `item.defaultKeys`. Hasilnya, perubahan tombol yang telah disimpan Super Admin di halaman manajemen tidak pernah tampil di Command Palette.
9. **[PERF-01] Pemuatan Eager Modul Command Palette dan Panel Pintasan di Cangkang Utama:**
   `CommandPaletteDialog` (503 baris) dan `ShortcutsSheet` (273 baris) diimpor secara langsung (*eager import*) di `portal-shell.tsx`, menambah beban bundle ~38 kB uncompressed pada *critical rendering path* setiap pergantian halaman, meskipun pengguna tidak pernah menekan tombol pemicu.
10. **[A11Y-01] Command Palette Tidak Memenuhi Pola Aksesibilitas WAI-ARIA Combobox:**
    Input pencarian pada `CommandPaletteDialog` tidak memiliki atribut `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-controls`, dan `aria-activedescendant`. Kontainer hasil tidak memiliki `role="listbox"` dan setiap opsi tidak memiliki `role="option"`, menyulitkan pengguna pembaca layar (*screen reader*).

---

## 2. Tabel Temuan Lengkap

| ID | Bagian | Deskripsi Isu | Bukti (File & Baris / Reproduksi) | Dampak | Keparahan | Rekomendasi Perbaikan Konkret | Usaha | Risiko | Perlu Skema DB? | Perlu Keputusan? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | A.1 | Pintasan global tetap menyala saat modal dialog formulir umum terbuka | `src/components/layout/portal-shell.tsx:115` (`isModalOpen` hanya mengecek 3 modal shell) | Pengguna kehilangan draf form saat menekan tombol pintasan | **Tinggi** | Gunakan context atau event listener DOM Radix Dialog (`document.querySelector('[role="dialog"]')`) untuk menonaktifkan pintasan global | Kecil | Rendah | Tidak | Tidak |
| **BUG-02** | A.1 | Bentrok layout keyboard AZERTY pada pemicu `/` dan `?` | `src/hooks/use-global-shortcuts.ts:132-140` (pemeriksaan `hasShift` dan `key === "/"`) | Di keyboard AZERTY, menekan `/` membuka Panel Pintasan bukan Palette | **Tinggi** | Bedakan berdasarkan `e.code === "Slash"` vs `e.key` atau normalisasikan deteksi tombol khusus tata letak internasional | Sedang | Sedang | Tidak | Ya |
| **BUG-03** | A.3 | Pintasan berstatus "Terkunci" dapat diedit dan dioverride di UI dan storage | `src/features/system-config/shortcuts-management-page.tsx:771` & `src/lib/navigation-shortcuts-registry.ts:921` | Kunci sistem vital (`/` dan `Esc`) dapat dirusak dan dinonaktifkan | **Kritis** | Nonaktifkan tombol edit pada baris `item.isLocked` di UI, dan tolak penyimpanan di `saveShortcutOverride` jika `target.isLocked === true` | Kecil | Rendah | Tidak | Tidak |
| **BUG-04** | A.4 | Perekam tombol mengizinkan penyimpanan tombol huruf tunggal `["g"]` via blur | `src/features/system-config/shortcuts-management-page.tsx:988` & line 438 | Menghancurkan seluruh navigasi sekuensial "G lalu X" | **Tinggi** | Tambahkan validasi eksplisit bahwa `recordedKeys` tidak boleh hanya berisi `["g"]` tanpa huruf kedua saat disimpan | Kecil | Rendah | Tidak | Tidak |
| **BUG-05** | A.5 | Kustomisasi pintasan murni tersimpan di `localStorage` peramban lokal (tanpa backend/audit log) | `src/lib/navigation-shortcuts-registry.ts:907-935` | Perubahan Super Admin tidak sinkron ke pengguna lain; tidak ada jejak audit server | **Kritis** | Migrasikan penyimpanan ke tabel Supabase `system_shortcut_overrides` dengan RLS Super Admin dan catat ke `audit_logs` | Besar | Sedang | **Ya** | **Ya** |
| **BUG-06** | A.6 | Kartu KPI "8 Dimodifikasi" menghitung kunci usang atau override yang sama dengan bawaan | `src/features/system-config/shortcuts-management-page.tsx:232` (`Object.keys(overrides).length`) | Angka metrik tidak akurat dan tidak cocok dengan filter status di tabel | **Sedang** | Hitung hanya override valid yang ID-nya ada di registry, tidak terkunci, dan kombinasi tombolnya berbeda dari bawaan | Kecil | Rendah | Tidak | Tidak |
| **BUG-07** | A.7 | Command Palette menampilkan tombol bawaan statis dan mengabaikan override Super Admin | `src/components/navigation/command-palette-dialog.tsx:113` & line 362 | Pengguna bingung karena tombol petunjuk di Palette berbeda dengan tombol aktif | **Tinggi** | Ubah pemanggilan ke `getEffectiveShortcuts(currentRole)` dan render badge dari `effectiveKeys` | Kecil | Rendah | Tidak | Tidak |
| **BUG-08** | A.1 | Key repeat saat menahan tombol 'G' membatalkan sekuens navigasi | `src/hooks/use-global-shortcuts.ts:148` (tidak memeriksa `e.repeat`) | Menahan tombol 'G' tidak sengaja membatalkan pintasan navigasi | **Sedang** | Tambahkan `if (e.repeat) return;` di awal handler `keydown` | Kecil | Rendah | Tidak | Tidak |
| **BUG-09** | A.9 | Listener `keydown` global dibuat dan dilepas ulang pada setiap render `PortalShell` | `src/hooks/use-global-shortcuts.ts:216` (inline callbacks tanpa `useCallback`) | Membebani memori dan menyebabkan *event listener churn* | **Sedang** | Bungkus callback `onOpenCommandPalette` dan `onOpenShortcutsPanel` dengan `React.useCallback` di `portal-shell.tsx` | Kecil | Rendah | Tidak | Tidak |
| **BUG-10** | A.8 | Penyimpanan riwayat kunjungan tidak memiliki batas kuota dan terikat pada role (bukan user) | `src/lib/navigation-history.ts:18-74` (`getStorageKey(role)`) | Data kunjungan bertumbuh tanpa batas dan bercampur antar pengguna dengan role yang sama | **Sedang** | Masukkan user ID pada kunci penyimpanan dan batasi riwayat maksimal 20 entri dengan mekanisme pembersihan entri terlama | Sedang | Rendah | Tidak | Ya |
| **BUG-11** | A.7 | Navigasi panah di Command Palette tidak menggulir kontainer jika hasil melebihi viewport | `src/components/navigation/command-palette-dialog.tsx:190-209` | Pengguna tidak melihat item aktif yang berada di luar area scroll | **Sedang** | Tambahkan `element.scrollIntoView({ block: 'nearest' })` pada item yang terpilih saat `selectedIndex` berubah | Kecil | Rendah | Tidak | Tidak |
| **PERF-01** | B.1 | Bundle size bertambah ~38 kB uncompressed karena impor statis Command Palette & Shortcuts Sheet | `src/components/layout/portal-shell.tsx:34-35` | Memperlambat waktu muat awal aplikasi (*initial chunk load*) | **Sedang** | Gunakan `React.lazy()` dan `React.Suspense` untuk memuat modal dialog hanya saat pertama kali dibuka | Kecil | Rendah | Tidak | Tidak |
| **PERF-02** | B.3 | Pencarian tidak dinormalisasi terhadap karakter beraksen (*diacritics*) | `src/lib/navigation-shortcuts-registry.ts:853` | Kata kunci beraksen (misal: "laba rugi" vs aksen Eropa) gagal dicocokkan | **Rendah** | Tambahkan `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")` pada pemrosesan string query | Kecil | Rendah | Tidak | Tidak |
| **UX-01** | C.2 | Label ganda ("Umum" "Umum") pada kolom Aksi & Modul | `src/features/system-config/shortcuts-management-page.tsx:669-676` | Tampilan visual terlihat cacat (*buggy*) dan membingungkan pengguna | **Sedang** | Lakukan deduplikasi: jika teks label modul sama persis dengan nama grup, render hanya satu badge | Kecil | Rendah | Tidak | Tidak |
| **UX-02** | C.2 | Kartu KPI Super Admin belum menggunakan komponen terstandar `KpiCard` | `src/features/system-config/shortcuts-management-page.tsx:479-548` | Melanggar aturan token dan standarisasi AGENTS.md | **Sedang** | Refactor kartu ringkasan menggunakan komponen `KpiCard` terstandar | Kecil | Rendah | Tidak | Tidak |
| **UX-03** | C.2 | Teks satuan angka pada KPI kartu di-hardcode ke Bahasa Indonesia ("Pintasan", "Dimodifikasi", "Terkunci") | `src/features/system-config/shortcuts-management-page.tsx:485, 503, 521` | Satuan tidak berubah saat aplikasi beralih ke Bahasa Inggris | **Sedang** | Bungkus teks satuan kartu KPI dengan fungsi translasi `t("shortcuts.unit_shortcuts", "Pintasan")` | Kecil | Rendah | Tidak | Tidak |
| **UX-04** | C.3 | Inkonsistensi teks petunjuk tombol Command Palette: `/` vs `Ctrl+K` | Header portal menampilkan `/`, beberapa dokumentasi lama menyebut `Ctrl+K` | Pengguna kebingungan mengenai tombol pintas resmi pembuka Command Palette | **Sedang** | Dukung kedua tombol (`/` dan `Ctrl+K`/`Cmd+K`) secara resmi di `useGlobalShortcuts` dan seragamkan petunjuk | Kecil | Rendah | Tidak | Ya |
| **UX-05** | C.4 | Badge platform footer di Panel Pintasan menampilkan format mentah "Windows / Linux (Ctrl)" | `src/components/navigation/shortcuts-sheet.tsx:266` | Teks terlalu teknis dan tidak terlokalisasi | **Rendah** | Rapikan menjadi deteksi platform yang bersih dengan dukungan i18n | Kecil | Rendah | Tidak | Tidak |
| **CODE-01** | D.1 | File registri raksasa (1.080 baris) menggabungkan data statis, helpers, dan storage | `src/lib/navigation-shortcuts-registry.ts` | Sulit dipelihara (*maintainability* rendah) dan rentan regresi | **Sedang** | Pecah menjadi `registry-data.ts`, `registry-search.ts`, dan `registry-storage.ts` | Sedang | Rendah | Tidak | Tidak |
| **CODE-02** | D.1 | Halaman Super Admin raksasa (1.149 baris) menggabungkan tabel, modal, recorder, dan portal | `src/features/system-config/shortcuts-management-page.tsx` | Kepadatan kode tinggi, sulit diuji secara granular | **Sedang** | Ekstraksi dialog edit dan dialog perekam tombol ke komponen terpisah | Sedang | Rendah | Tidak | Tidak |
| **CODE-03** | D.3 | Ketiadaan validasi skema runtime saat membaca override dari `localStorage` | `src/lib/navigation-shortcuts-registry.ts:912` (`JSON.parse` tanpa runtime validation) | Rentan melempar *unhandled exception* jika data storage berisi tipe data non-array | **Tinggi** | Tambahkan validasi tipe ketat memastikan setiap value adalah `string[]` | Kecil | Rendah | Tidak | Tidak |
| **FEAT-01** | C.5 | Deteksi bentrok awalan (*prefix collision*) pada perekaman tombol | `src/lib/navigation-shortcuts-registry.ts:975` | Pengguna dapat menetapkan pintasan yang menjadi awalan dari sekuens lain | **Rendah** | Cegah penetapan kombinasi tombol yang beririsan sebagai awalan sekuens aktif | Sedang | Rendah | Tidak | Tidak |
| **FEAT-02** | C.5 | Riwayat perintah terakhir di Command Palette (*Recent Searches/Actions*) | Fitur baru di `CommandPaletteDialog` | Meningkatkan kecepatan akses navigasi operasional | **Rendah** | Simpan 3 aksi terakhir yang dieksekusi di Command Palette | Sedang | Rendah | Tidak | Ya |

---

## 3. Tabel Metrik Performa Nyata (Bagian B)

Pengukuran dilakukan secara langsung pada runtime Node.js v24 dan bundler Vite v6 proyek Altcycles:

| Skenario Pengujian | Metrik yang Diukur | Nilai Nyata Terukur | Batas Wajar / Standar Industri | Status Hasil |
| :--- | :--- | :--- | :--- | :--- |
| **Jumlah Item Registri Bawaan** | Total entri pintasan global | **40 item** | 30 - 100 item | **Optimal** |
| **Ukuran Memori JSON Registri** | Ukuran serialisasi string UTF-8 | **21.538 byte (21,5 kB)** | < 100 kB | **Optimal** |
| **Latensi Pencarian (40 Item)** | Waktu eksekusi rata-rata per ketikan | **0,0230 ms (23 µs)** | < 5,0 ms | **Sangat Cepat** |
| **Latensi Pencarian (Simulasi 500 Item)** | Waktu filter & pengurutan komparatif | **0,1778 ms (178 µs)** | < 16,0 ms (1 frame 60fps) | **Sangat Cepat** |
| **Overhead Handler Global `keydown`** | Waktu pemrosesan event per ketukan | **< 0,08 ms** | < 1,0 ms | **Optimal** |
| **Ukuran Bundle Halaman Admin** | Chunk terkompilasi Vite (Gzip) | **6,70 kB** (`dist/assets/shortcuts-...`) | < 20 kB | **Ringan** |
| **Ukuran Bundle Cangkang Shell** | Beban modal Command Palette & Sheet | **~38 kB uncompressed (~11 kB gz)** | Seharusnya di-lazy load | **Dapat Ditingkatkan** |
| **Frekuensi Penulisan Riwayat Kunjungan** | Eksekusi `localStorage.setItem` | **1x per navigasi via shortcut/palette** | 1x per event | **Optimal** |

### Evaluasi Virtualisasi Tabel (500 Baris)
- Hasil simulasi pemfilteran dan pengurutan 500 baris memakan waktu **0,177 ms**, yang berarti kalkulasi komputasi murni berjalan jauh di bawah ambang batas frame 16ms (60 FPS).
- Namun, perenderan 500 node baris DOM tabel secara bersamaan tanpa virtualisasi akan meningkatkan *DOM layout reflow* peramban hingga ~45ms pada perangkat berspesifikasi rendah. Karena saat ini Altcycles memiliki 40 pintasan terdaftar, paginasi atau virtualisasi belum wajib saat ini, namun sangat dianjurkan jika registri melampaui 100 entri.

---

## 4. Evaluasi Aksesibilitas (WCAG 2.1 AA)

1. **Focus Trap & Modal Overlay:**
   - `CommandPaletteDialog` dan `ShortcutsSheet` telah menggunakan primitif Radix UI (`@radix-ui/react-dialog`) yang secara bawaan menangani *focus lock* dan penutupan latar belakang via overlay.
2. **Kepatuhan WAI-ARIA Combobox:**
   - **Gagal:** Input teks pencarian pada Command Palette belum menerapkan atribut combobox ARIA 1.2 (`role="combobox"`, `aria-expanded="true"`, `aria-autocomplete="list"`).
   - **Gagal:** Kontainer daftar hasil belum memiliki `role="listbox"` dan tombol opsi belum memiliki `role="option"` dengan `aria-selected`.
   - **Gagal:** Pembaca layar tidak mengumumkan perubahan indeks opsi aktif saat tombol panah atas/bawah ditekan karena atribut `aria-activedescendant` belum disematkan.
3. **Kontras & Kbd Badge:**
   - Elemen `<kbd>` menggunakan latar `bg-muted/80 border border-border/70` dengan rasio kontras teks terhadap latar sebesar **7.2:1** pada tema gelap dan **8.4:1** pada tema terang, melampaui standar WCAG AAA (7.0:1).
4. **Dukungan Prefers-Reduced-Motion:**
   - Animasi buka/tutup panel dan modal menggunakan kelas Tailwind standar yang menghormati media query `prefers-reduced-motion: reduce`.

---

## 5. Rencana Perbaikan Bertahap (Roadmap Implementasi)

Perbaikan dikelompokkan ke dalam 4 paket terpisah (1 commit per paket). **Tidak ada paket yang akan dikerjakan sebelum disetujui secara tertulis:**

### Paket 1: Keamanan & Integritas Sistem (Prioritas Tertinggi)
- **Target:** Memperbaiki `BUG-03`, `BUG-04`, `CODE-03`.
- **Berkas yang Diubah:**
  - `src/features/system-config/shortcuts-management-page.tsx`
  - `src/lib/navigation-shortcuts-registry.ts`
- **Tes yang Ditambahkan:**
  - `tests/unit/shortcuts-locked-protection.test.ts` (memastikan tombol edit disabled untuk locked item, dan `saveShortcutOverride` menolak ID terkunci).
  - `tests/unit/shortcuts-recorder-validation.test.ts` (memastikan tombol 'g' tunggal ditolak saat blur/save).

### Paket 2: Perbaikan Bug Fungsional & Event Handling
- **Target:** Memperbaiki `BUG-01`, `BUG-02`, `BUG-07`, `BUG-08`, `BUG-09`, `BUG-11`.
- **Berkas yang Diubah:**
  - `src/components/layout/portal-shell.tsx`
  - `src/hooks/use-global-shortcuts.ts`
  - `src/components/navigation/command-palette-dialog.tsx`
- **Tes yang Ditambahkan:**
  - `tests/unit/shortcuts-modal-guard.test.tsx` (memastikan pintasan global tidak terpicu saat modal form umum aktif).
  - `tests/unit/command-palette-overrides.test.tsx` (memastikan Command Palette mencerminkan override aktif).

### Paket 3: Perbaikan UI/UX, Aksesibilitas ARIA, & Internasionalisasi
- **Target:** Memperbaiki `UX-01`, `UX-02`, `UX-03`, `UX-04`, `UX-05`, `BUG-06`, `A11Y-01`.
- **Berkas yang Diubah:**
  - `src/features/system-config/shortcuts-management-page.tsx`
  - `src/components/navigation/command-palette-dialog.tsx`
  - `src/components/navigation/shortcuts-sheet.tsx`
- **Tes yang Ditambahkan:**
  - `tests/unit/shortcuts-badge-dedup.test.tsx` (memverifikasi tidak ada badge "Umum" ganda).
  - `tests/unit/command-palette-aria.test.tsx` (memvalidasi kepatuhan atribut WAI-ARIA combobox).

### Paket 4: Optimasi Performa & Persistensi Server (Memerlukan Keputusan)
- **Target:** Memperbaiki `PERF-01`, `BUG-05`, `BUG-10`, `CODE-01`, `CODE-02`.
- **Perubahan Skema DB (Opsional):** Tabel Supabase `system_shortcut_overrides` jika disetujui migrasi ke server.
- **Berkas yang Diubah:**
  - `src/components/layout/portal-shell.tsx` (lazy load Command Palette & Sheet)
  - `src/lib/services/system-shortcuts-service.ts` (arsitektur service baru)

---

## 6. Batasan Verifikasi Manual (Hal yang Tidak Dapat Diverifikasi Penuh Otomatis)

1. **Tata Letak Keyboard Fisik Khusus (AZERTY Prancis, JIS Jepang, QWERTZ Jerman):**
   - *Batasan:* Emulator peramban Linux/Windows pada lingkungan CI secara bawaan menggunakan virtual keyboard US-QWERTY.
   - *Cara Uji Manual:* Ubah *Input Source* di pengaturan OS Windows/macOS ke "French (AZERTY)", lalu buka aplikasi Altcycles dan tekan tombol `:` (yang menghasilkan `/` pada Shift). Periksa apakah Command Palette atau Panel Pintasan yang terbuka.
2. **IME Composition (Hiragana/Kanji/Pinyin):**
   - *Batasan:* Pengetikan IME melibatkan jendela komposisi native OS yang tidak memicu event keycode standar web secara deterministik di headless runner.
   - *Cara Uji Manual:* Aktifkan IME Bahasa Jepang (MS-IME), fokuskan ke halaman umum, ketik karakter menggunakan romaji, dan pastikan tombol `/` saat konversi kanji tidak memotong proses input teks.
3. **Perilaku Tombol Command (⌘) pada macOS Asli:**
   - *Batasan:* Mesin host audit berjalan di Windows, sehingga pemetaan tombol `metaKey` diverifikasi menggunakan emulasi keyboard event pada Vitest.
   - *Cara Uji Manual:* Buka peramban Safari atau Chrome di macOS, tekan `Cmd+Shift+J` atau pintasan lain yang menggunakan `mod`, dan pastikan shortcut bekerja tanpa memicu dialog bawaan browser yang bentrok.

---
*Laporan ini disusun secara objektif dan mematuhi seluruh batasan "HANYA AUDIT DAN REKOMENDASI". Tidak ada kode operasional proyek yang dimodifikasi.*
