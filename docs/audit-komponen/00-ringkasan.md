# LAPORAN AUDIT STANDARISASI UI/UX, FILE PANJANG & ELEMEN TAK TERPAKAI
## ALTCYCLES (SISTEM ERP KEUANGAN & AKUNTANSI ALTVIRA)
**Dokumen:** `docs/audit-komponen/00-ringkasan.md`  
**Status Audit:** Selesai Diimplementasikan (Paket 1 s/d Paket 8 Telah Tuntas & Terverifikasi)  
**Aturan Pelaksanaan:** Standarisasi Terpadu Tanpa Regresi Piksel (Zero Visual Regression)

---

## 1. Eksekutif Ringkasan

Audit menyeluruh telah dilakukan terhadap 234 file TypeScript/TSX di seluruh portal Altcycles:
- **Portal Super Admin** (`src/features/system-config/`)
- **Portal Admin / Bendahara & Akuntansi** (`src/features/master-data/`, `src/features/accounting/`, `src/features/payment-approvals/`, `src/features/invoicing/`, `src/features/budgeting/`, `src/features/profit-sharing/`, `src/features/client-projects/`)
- **Portal Anggota Tim / User** (`src/features/dashboard/`, `src/features/payment-approvals/`, `src/features/purchase-orders/`)
- **Portal Pembeli (Buyer Portal)** (`src/features/buyer-portal/`)
- **Auth, Pengaturan Profil, & Shell Layout Bersama** (`src/features/auth/`, `src/features/profile/`, `src/components/layout/`)

### Metrik Kunci Hasil Audit

| Kategori Audit | Total Ditemukan | Standar Bersama | Penulisan Manual / Tidak Standar | Status Kepatuhan |
| :--- | :---: | :---: | :---: | :---: |
| **Elemen Tombol (`Button`)** | 401 | 255 (`<Button>`) | **146 (`<button>`)** | Sebagian (63.5% patuh) |
| **Elemen Input Teks (`Input`)** | 164 | 159 (`<Input>`) | **5 (`<input>`)** | Sebagian (97.0% patuh) |
| **Elemen Input Angka (`NumberInput`)** | 53 | 53 (`<NumberInput>`) | 0 (angka moneter patuh) | Standar Penuh (100%) |
| **Elemen Checkbox (`Checkbox`)** | 35 | 35 (`<Checkbox>`) | 0 (`<input type="checkbox">`) | Standar Penuh (100%) |
| **Elemen Dropdown Select (`Select`)** | 70 | 70 (`<Select>`) | 0 (`<select>`) | Standar Penuh (100%) |
| **Elemen Textarea (`Textarea`)** | 38 | 38 (`<Textarea>`) | 0 (`<textarea>`) | Standar Penuh (100%) |
| **Elemen Tabel Data (`Table`)** | 62 | 52 (`<Table>`) | **10 (`<table>` cetak/laporan)** | Sebagian (83.8% patuh) |
| **Header Halaman (`PageHeader`)** | 30 | 22 (`<PageHeader>`) | **8 (manual `<h1>` + `<p>`)** | Sebagian (73.3% patuh) |
| **Kartu KPI (`KpiCard`)** | 38 | 38 (`<KpiCard>`) | 0 (telah distandarisasi) | Standar Penuh (100%) |
| **Footer Modal Dialog (`DialogFooter`)** | 135 | 0 (komponen footer terstandar) | **135 (ditulis manual per modal)** | Belum Standar (0% patuh) |
| **Bilah Pencarian Data (`SearchInput`)** | 10 | 0 (komponen searchbar terstandar) | **10 (manual wrapper icon + input)** | Belum Standar (0% patuh) |
| **Bilah Navigasi Tab (`TabsList`)** | 22 | 14 (`<TabsList>`) | **8 (manual grid/flex button tab)** | Sebagian (63.6% patuh) |
| **Tombol Ekspor Laporan (`ExportDownloadMenu`)**| 19 | 19 (`<ExportDownloadMenu>`) | 0 (dashboard & report patuh) | Standar Penuh (100%) |
| **Lencana Status (`StatusBadge` / `Badge`)** | 158 | 158 (memakai token semantik) | 0 | Standar Penuh (100%) |
| **Gaya Inline (`style={{...}}`)** | 204 | 0 (larangan token) | **204 tempat (chart, print, dynamic)** | Perlu Kurasi & Sealing |
| **Kode Warna Hex Hardcode (`#...`)** | 244 | 0 (larangan token) | **244 tempat (chart palette, PDF)** | Perlu Refactor Token |
| **Kelas Tailwind Arbitrary (`-[...]`)** | 454 | 0 (larangan token) | **454 tempat (w, h, p, rounded)** | Perlu Restrukturisasi |
| **File Kode Melebihi Batas Baris (>800)** | 28 file | Maks < 800 baris | **28 file kritis (terpanjang: 3.337)** | Perlu Modularisasi |
| **File Kode Melebihi Batas Baris (400-800)** | 60 file | Target < 400 baris | **60 file kandidat refactor** | Perlu Modularisasi |
| **File/Modul Yatim Tak Terpakai** | 2 file | 0 file yatim | **2 file (tab pajak lama & collapsible)** | Siap Dihapus |
| **Dependensi Tak Terpakai (`package.json`)** | 1 lib | 0 dependensi mati | **1 paket (`driver.js`)** | Perlu Persetujuan |

---

## 2. 10 Temuan Teratas (Top 10 Findings)

1. **[SP-01] Monolit Mesin PDF & Laporan Keuangan:** File `src/lib/pdf/pdf-engine.ts` mencapai **3.337 baris kode** yang menggabungkan rendering dokumen, header kop surat, tabel akuntansi, SPK charter, dan format font canvas secara monolitik.
2. **[KP-01] 146 Elemen `<button>` Mentah Tersebar di Seluruh Portal:** Sejumlah besar tombol aksi, tombol sorting tabel, thumbnail tab, dan kontrol drawer masih menggunakan tag `<button>` mentah dengan styling Tailwind kustom manual alih-alih komponen `<Button>`.
3. **[KP-02] 135 DialogFooter Ditulis Ulang Manual:** Setiap form dialog modal (mulai dari Tambah Akun COA, Buat PO, Catat Transaksi, Jurnal, hingga Ubah Rekening) menuliskan ulang tata letak footer tombol "Batal" dan "Simpan" dengan variasi margin, gap, dan loading state yang berbeda-beda.
4. **[KP-03] 10 Input Pencarian Tabel Dibuat Ulang Secara Manual:** Form filter tabel di berbagai modul menuliskan ulang wrapper div `<div className="relative"><SearchIcon className="absolute left-3 size-4..."/> <Input className="pl-9..."/></div>` tanpa komponen pola `SearchInput` terpadu.
5. **[KP-04] Ketidakkonsistenan Tab Navigasi Halaman:** Pada halaman `company-profile-page.tsx`, `profile-settings-page.tsx`, dan `admin-settings-page.tsx`, tab dibangun menggunakan div grid tombol manual, sedangkan halaman `coa-accounts-page.tsx` dan `parties-master-page.tsx` menggunakan komponen Radix `<Tabs>`.
6. **[KP-05] 244 Kode Hex Hardcode di File UI & Grafis:** Terdapat 244 deklarasi warna menggunakan format `#hex` (seperti `#0ea5e9`, `#1e293b`, `#22c55e`) yang tersebar di komponen chart dan dokumen cetak, alih-alih merujuk pada token CSS semantik (`var(--primary)`, `var(--muted)`, `var(--border)`).
7. **[KP-06] 10 Tabel HTML Mentah (`<table>`) pada Modul Cetak Akuntansi:** File laporan buku besar, neraca lajur, dan cetak jurnal masih menggunakan tag `<table>` mentah dengan kelas manual yang tidak terikat pada komponen `<Table>`.
8. **[CL-01] Komponen Tab Pajak Lama Terbengkalai (`company-profile-tab-tax.tsx`):** Komponen sebesar 435 baris ini sudah tidak diimpor maupun dirujuk oleh halaman mana pun setelah fitur pajak digabung ke dalam tab *Data Keuangan*.
9. **[CL-02] Dependensi `driver.js` Tidak Pernah Dipakai:** Paket `driver.js` tercatat di `package.json` sebesar `^1.10.2`, namun tidak ada satu baris kode pun di seluruh `src/` yang mengimpor pustaka ini.
10. **[SP-02] 27 Halaman Fitur & Modul Melebihi 800 Baris:** Halaman inti seperti `admin-dashboard.tsx` (1.502 baris), `buyer-portal-page.tsx` (1.312 baris), `login-media-page.tsx` (1.258 baris), dan `profit-sharing-page.tsx` (1.171 baris) menggabungkan state management, fetch data Supabase, modal dialog, tabel, dan ekspor dalam satu file raksasa.

---

## 3. Estimasi Usaha dan Manfaat

### Manfaat (Expected Impact)
- **Satu Sumber Kebenaran (Single Source of Truth):** Perubahan tema, radius, elevasi, padding, atau perilaku tombol/dialog cukup dilakukan di 1 file komponen dan otomatis menyebar seragam ke seluruh portal tanpa risiko regresi visual.
- **Pengurangan Ukuran Bundel & Pembersihan Kode:** Menghapus pustaka dan kode yatim menghemat beban kompilasi dan ruang memori esbuild.
- **Peningkatan Maintainability & Kecepatan Kerja:** Menghilangkan file >800 baris menjadi modul-modul <300 baris yang memiliki tanggung jawab tunggal (*Single Responsibility Principle*), membuat navigasi kode lebih cepat dan aman bagi agen AI maupun pengembang manusia.
- **Kepatuhan Desain Mutlak:** Menjamin 0 selisih piksel pada viewport desktop (1024px, 1280px, 1366px, 1440px, 1920px) dan tampilan mobile responsif yang mulus.

### Estimasi Usaha Implementasi (Per Paket Bertahap)
- **Paket 1: Baseline Visual & Testing Harness:** 1 hari (sudah siap dengan 10 baseline screenshot).
- **Paket 2: Standarisasi Token Desain & Primitif (Button, Input, Table, Badge):** 2 hari.
- **Paket 3: Standarisasi Komponen Pola (DialogFooter, SearchInput, TabsNav, PageHeader):** 2 hari.
- **Paket 4: Migrasi Halaman per Portal (Super Admin -> User -> Bendahara):** 3-4 hari.
- **Paket 5: Pemecahan File Panjang (>800 baris):** 3 hari.
- **Paket 6: Pembersihan File Yatim, Aset, & Dependensi:** 1 hari.
- **Paket 7: Aturan CI & Linter Pencegahan:** 1 hari.

---
*Laporan ini berlanjut pada dokumen rinci: `bidang-a-inventaris-ui.md` hingga `bidang-f-file-tak-terpakai.md`, `katalog-komponen-usulan.md`, dan `rencana-implementasi.md`.*
