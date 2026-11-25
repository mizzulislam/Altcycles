# Standar Komponen & Tata Letak Antarmuka Altcycles (`docs/design-system/layout-and-components.md`)

Dokumen ini mendokumentasikan spesifikasi implementasi komponen UI, aturan layout responsif, serta token desain yang berlaku di seluruh portal internal Altcycles.

---

## 1. Standar Header Halaman & Jarak Bagian
- **Spasi Vertikal Antar Bagian:** Wajib menggunakan `flex flex-col gap-6`.
- **Struktur Header Halaman:** Wajib menggunakan `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between` tanpa garis pemisah bawah `border-b`.
- **Tipografi Header:**
  - Judul `<h1>`: `text-2xl sm:text-3xl font-bold tracking-tight text-foreground`.
  - Subjudul `<p>`: `text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed` (ringkas 1 kalimat).
  - Wrapper teks: Menggunakan `TruncatedTooltipText` dari `@/components/shared/page-header`.
  - Aksi header: Tombol aksi sejajar di kanan bawah (`sm:items-end`).

---

## 2. Standar Kartu Konten & Ringkasan KPI
- **Pola Kartu Utama (`Card`):** `rounded-2xl border-border/80 bg-card shadow-2xs`.
- **Spasi Judul & Deskripsi:** Wajib rapat konsisten 4px (`gap-1` pada `CardHeader` atau wrapper `<div className="space-y-1 min-w-0">` tanpa `mt-0.5`/`mt-1` ganda).
- **Format Kartu KPI:**
  - Container: `p-5 flex items-center justify-between gap-4`.
  - Label: **Proper Case** `text-xs font-medium text-muted-foreground`.
  - Nilai: `text-xl sm:text-2xl font-bold tracking-tight tabular-nums`.
  - Subjudul: Polos `text-[11px] text-muted-foreground mt-1`.
  - Ikon: Kotak kanan `size-10 rounded-xl border` (tanpa badge tag).

---

## 3. Standar Tabel Data (`Table`)
- **Pola Edge-to-Edge:** Kartu tabel wajib menggunakan `overflow-hidden` dengan `CardContent className="p-0"`.
- **Header Tabel (`<TableHead>`):**
  - Wajib rata tengah (`text-center`).
  - Ukuran font: `text-xs sm:text-sm font-semibold`.
  - Teks wajib **Proper Case** (dilarang UPPERCASE kecuali halaman Laporan Akuntansi resmi).
- **Sel Tabel (`<TableCell>`):**
  - Alignment vertikal: `align-top`.
  - Nilai moneter: Wajib menggunakan `<MonetaryCell amount={...} />` (simbol Rp di kiri rata, angka di kanan rata).
  - Kolom Aksi: Seluruh aksi tabel wajib menggunakan **icon button** ringkas (`size="icon"`, `size-8 rounded-lg`) dengan atribut `title` dan `<span className="sr-only">`.

---

## 4. Standar Modal Dialog & Dropdown Anti-Clipping
- **Header Dialog:** Bersih dan minimalis; hanya menampilkan `DialogTitle` tanpa ikon dekoratif besar di samping judul.
- **Tombol Close Dialog:** Terintegrasi langsung di dalam `DialogHeader` sejajar vertikal dengan judul modal (`flex items-center justify-between`) sehingga tetap proporsional saat modal discroll.
- **Anti-Clipping Rule (React Portal):**
  - Seluruh menu unduh (`ExportDownloadMenu` dan `DocumentDownloadMenu`) **wajib menggunakan React Portal (`createPortal(..., document.body)`)** dengan `fixed z-[99999]`.
  - Dilarang keras merender dropdown dengan `position: absolute` di dalam kontainer ber-`overflow-hidden` atau `overflow-x-auto`.

---

## 5. Standar Input & Form
- **Input Angka:** Wajib menggunakan komponen terstandar `NumberInput` dengan format pemisah ribuan titik (`.`) dan desimal koma (`,`) standar Indonesia (`id-ID`).
- **Penanda Field Wajib:** Menampilkan tanda bintang merah `*` (`text-destructive ml-1`) di samping label.
- **Field Read-Only:** Menggunakan atribut `disabled`, `disabled:opacity-100`, kelas `caret-transparent select-none cursor-not-allowed`, serta handler blur saat fokus untuk mencegah kursor kedip.
