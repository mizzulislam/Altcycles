# Audit Kesiapan Publish Altcycles: Bidang G - Aturan Desain, Token, dan Pencegahan CI (ID: DS-xx)

Dokumen ini memetakan kondisi dokumen aturan desain terhadap implementasi kode sebenarnya, menetapkan sumber kebenaran tunggal (*Single Source of Truth*), serta merancang aturan pengaman CI otomatis (*linters / test assertions*) agar masalah tidak berulang di masa mendatang.

---

## 1. Perbandingan Dokumen Desain (`AGENTS.md`) vs Kode Nyata

| Area Desain | Aturan Baku di `AGENTS.md` | Kondisi di Kode Nyata | Status Keselarasan | Rekomendasi Sinkronisasi |
| :--- | :--- | :--- | :---: | :--- |
| **Header Halaman** | `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`, judul `text-2xl sm:text-3xl font-bold tracking-tight text-foreground`, tanpa garis bawah `border-b`. | Dipatuhi di 90% halaman, beberapa halaman master minor masih menyertakan padding berlebih atau tombol aksi di atas judul. | **Mayoritas Selaras** | Audit konsistensi per halaman di Bidang B. |
| **Kartu Konten & KPI** | `rounded-2xl border-border/80 bg-card shadow-2xs`, jarak judul-deskripsi rapat 4px (`gap-1`), pola KPI `p-5 flex items-center justify-between gap-4`, label Proper Case. | Kartu transaksi sudah selaras, beberapa kartu profil memiliki jarak vertikal 6-8px karena pembungkus ganda. | **Mayoritas Selaras** | Rapikan jarak `CardHeader` di modul pengaturan. |
| **Header Tabel** | Wajib rata tengah (`text-center`), `text-xs sm:text-sm font-semibold`, dan **Proper Case** (dilarang UPPERCASE kecuali halaman akuntansi resmi). | Masih ada 3 tabel minor dengan `text-left` atau UPPERCASE di label kolom. | **Perlu Penyesuaian** | Terapkan assertion tes otomatis untuk mendeteksi `UPPERCASE` pada header tabel umum. |
| **Nominal Moneter** | Simbol di kiri, nominal di kanan (`MonetaryCell`), `tabular-nums`. | Halaman akuntansi dan laporan 100% selaras; beberapa tabel detail PO masih teks biasa. | **Perlu Standardisasi** | Wajibkan pemakaian `<MonetaryCell />` pada seluruh sel bertipe nominal moneter. |
| **Input Angka** | Seluruh field angka wajib `NumberInput` dengan format `id-ID` (titik ribuan, koma desimal). | Dipatuhi di form transaksi baru; form profil lama sebagian memakai `<Input type="number" />`. | **Perlu Standardisasi** | Ganti input mentah dengan `NumberInput`. |
| **Tombol Ekspor** | Wajib `ExportDownloadMenu` dengan label `Unduh / Ekspor`, menyediakan format Excel (.xlsx), PDF, dan CSV, serta menggunakan React Portal anti-clipping. | Halaman utama sudah selaras; beberapa tombol unduh sub-tabel masih tombol tunggal. | **Mayoritas Selaras** | Pastikan seluruh fitur ekspor menggunakan `ExportDownloadMenu`. |

---

## 2. Aturan Pencegahan Otomatis (CI / Automated Guardrails)

Untuk menjamin agar kode baru di masa mendatang tidak melanggar aturan desain, dirancang tes CI otomatis:

1. **Tes Deteksi Warna & Spasi Hardcoded (`tests/unit/design-token-enforcement.test.ts`):**
   - Memeriksa file TSX di `src/features/` dan `src/components/` untuk mendeteksi penggunaan kode hex acak seperti `#...` atau `rgb(...)` inline di kelas Tailwind yang seharusnya menggunakan token semantik (`bg-card`, `text-primary`, `border-border`).
2. **Tes Deteksi Header Tabel UPPERCASE (`tests/unit/table-header-case.test.ts`):**
   - Memindai komponen tabel non-akuntansi untuk memastikan teks `<TableHead>` tidak mengandung kata huruf kapital penuh (UPPERCASE) dan selalu memiliki kelas `text-center`.
3. **Tes Anti-Clipping Popover / Dropdown Menu:**
   - Memastikan seluruh menu dropdown unduh dan filter menggunakan `createPortal` ke `document.body` dan tidak memiliki deklarasi `absolute` yang terperangkap di dalam kontainer `overflow-hidden`.
4. **Daftar Periksa Pull Request (PR Checklist):**
   - Tabel: Header rata tengah? Proper case? Nominal memakai `MonetaryCell`?
   - Responsif: Apakah tampilan desktop (1920 & 1440px) identik secara visual?
   - i18n: Apakah seluruh teks baru sudah terdaftar di `src/locales/id/` dan `src/locales/en/`?
