# BIDANG B: ARSITEKTUR KOMPONEN USULAN (ID: AR-xx)
**Dokumen:** `docs/audit-komponen/bidang-b-arsitektur-komponen.md`  
**Prinsip Utama:** Satu Komponen Satu File, Satu Sumber Kebenaran (Single Source of Truth), Varian Dikendalikan via Props

---

## 1. Struktur Folder Arsitektur Komponen

Struktur folder komponen dirancang dengan pembagian tanggung jawab yang tegas (*separation of concerns*) tanpa membuat versi paralel dari komponen yang sudah ada, melainkan menata dan memperluas struktur yang ada:

```
src/components/
├── ui/                         # Komponen Primitif (Berdasarkan shadcn + Radix)
│   ├── button.tsx              # Primitif tombol (default, outline, ghost, icon, destructive, link)
│   ├── input.tsx               # Primitif input teks
│   ├── number-input.tsx        # Primitif input angka moneter (standar id-ID)
│   ├── select.tsx              # Primitif dropdown select
│   ├── textarea.tsx            # Primitif area teks multi-baris
│   ├── checkbox.tsx            # Primitif kotak centang
│   ├── switch.tsx              # Primitif toggle switch
│   ├── badge.tsx               # Primitif lencana teks
│   ├── table.tsx               # Primitif tabel data (Table, TableHeader, TableRow, TableCell)
│   ├── tabs.tsx                # Primitif navigasi tab (Tabs, TabsList, TabsTrigger, TabsContent)
│   ├── dialog.tsx              # Primitif modal dialog
│   ├── alert-dialog.tsx        # Primitif modal konfirmasi
│   ├── action-tooltip.tsx      # Primitif tooltip interaktif
│   ├── card.tsx                # Primitif kontainer kartu
│   ├── separator.tsx           # Primitif garis pemisah
│   ├── empty.tsx               # Primitif tampilan kosong & loader spinner
│   └── page-loader.tsx         # Primitif indikator loading halaman penuh
│
├── patterns/                   # Komponen Pola Desain (Pattern & Composite Components)
│   ├── page-header.tsx         # Header halaman terstandar (Judul, Subjudul, Aksi Kanan)
│   ├── card-header-with-info.tsx # Header kartu dengan dialog info (i) GameDialog
│   ├── modal-footer-action.tsx # Footer form modal (Tombol Batal, Simpan, Loading State)
│   ├── search-input.tsx        # Bilah pencarian tabel (Ikon Search, Input, Tombol Clear)
│   ├── monetary-cell.tsx       # Sel tabel moneter (Simbol kiri, Angka tabular kanan)
│   ├── status-badge.tsx        # Lencana status semantik (Pending, Approved, Rejected, Completed)
│   ├── confirm-action-dialog.tsx # Dialog konfirmasi aksi berbahaya/hapus terpusat
│   ├── export-download-menu.tsx # Menu unduh laporan Portal (Excel, PDF, CSV)
│   ├── document-download-menu.tsx # Menu unduh dokumen bisnis klien (PDF, Word)
│   ├── dashboard-kpi-card.tsx  # Kartu metrik KPI (Label, Angka, Ikon Kanan, Subteks)
│   ├── dashboard-chart-card.tsx # Kartu pembungkus grafik dengan toggle bar/area/pie
│   ├── dashboard-period-filter.tsx # Kontrol pemilih periode tanggal/bulan/tahun
│   └── table-sort-menu.tsx     # Menu dropdown pengurutan kolom tabel
│
└── layout/                     # Komponen Kerangka Tata Letak Aplikasi
    ├── portal-shell.tsx        # Pembungkus layout utama (Sidebar + Header + Main Area)
    ├── header.tsx              # Bilah navigasi atas (Breadcrumb, Role Switcher, Profil)
    ├── sidebar.tsx             # Bilah navigasi samping dengan grup menu per peran
    ├── shell-notifications-dialog.tsx # Dialog notifikasi sistem
    └── command-palette-dialog.tsx     # Dialog pencarian cepat (Cmd/Ctrl + K)
```

---

## 2. Tabel Temuan Arsitektur Komponen (ID: AR-xx)

| ID | Aspek Arsitektur | Kondisi Saat Ini (Bukti) | Usulan Standar Arsitektur | Dampak | Keparahan | Rekomendasi Konkret | Usaha | Risiko | Berdampak ke Tampilan | Perlu Keputusan User |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **AR-01** | Penataan Komponen Pola (`src/components/shared/`) | Komponen pola tersebar campur di `src/components/shared/` bersama upload dialog, helper logo, dialog Google Drive, dan checklist | Rapikan menjadi `src/components/patterns/` untuk pola antarmuka berulang, dan `src/components/shared/` untuk widget fitur khusus (mis. avatar uploader) | Arsitektur lebih jelas, mudah ditemukan, mencegah duplikasi baru | Sedang | Buat indeks ekspor re-export terpadu agar migrasi tidak memutus import lama | Sedang | Rendah | Tidak | Tidak |
| **AR-02** | Penggabungan Pola Tombol Toolbar | Terdapat `TOOLBAR_BUTTON_CLASS` string terpisah di `toolbar-button.tsx` yang dipanggil manual dengan `cn(TOOLBAR_BUTTON_CLASS, ...)` | Integrasikan varian toolbar ke dalam `Button` cva variants (`variant="toolbar"` atau `size="toolbar"`) | Menghilangkan kebutuhan import string kelas CSS terpisah | Rendah | Tambahkan varian resmi pada `button.tsx` | Rendah | Rendah | Tidak | Tidak |
| **AR-03** | Ekstraksi Pola Footer Modal (`ModalFooterAction`) | 135 modal mendefinisikan layout footer secara ad-hoc dengan kombinasi `<DialogFooter className="flex...">` | Standarisasi komponen `ModalFooterAction` dengan props: `onCancel`, `onSubmit`, `saving`, `submitLabel`, `cancelLabel` | Menghemat ~30 baris kode per modal x 135 modal = ~4.000 baris kode duplikasi hilang | Tinggi | Buat `src/components/patterns/modal-footer-action.tsx` | Sedang | Rendah | Tidak | Tidak |
| **AR-04** | Ekstraksi Pola Search Bar Tabel (`SearchInput`) | 10 halaman tabel menulis markup input search dengan positioning ikon absolut berulang | Sediakan komponen `SearchInput` dengan prop `value`, `onChange`, `placeholder`, `debounceMs` | Standarisasi UX pencarian dengan debounce otomatis dan pembersihan instan | Sedang | Buat `src/components/patterns/search-input.tsx` | Rendah | Rendah | Tidak | Tidak |
| **AR-05** | Standarisasi Komponen Status Badge | Ada dua tempat: `src/components/ui/badge.tsx` dan `src/components/shared/status-badge.tsx` | Padukan agar `StatusBadge` merupakan spesialisasi semantik tingkat tinggi di atas `Badge` primitif | Status pembayaran, PO, invoice, dan proyek memiliki warna token yang 100% konsisten | Sedang | Hubungkan `StatusBadge` langsung ke token `status-badge-variants` | Rendah | Rendah | Tidak | Tidak |
| **AR-06** | Folder `src/lib/design-system/` Terbengkalai | Berkas `button-standards.ts`, `modal-standards.ts`, `table-standards.ts` tidak diimpor siapa pun | Satukan konstanta token ini ke dalam file komponen aslinya masing-masing (`button.tsx`, `dialog.tsx`, `table.tsx`) | Menghilangkan modul mati yang membingungkan pengembang | Sedang | Integrasikan konstanta ke komponen UI bersangkutan dan bersihkan folder | Rendah | Rendah | Tidak | Tidak |

---

## 3. Spesifikasi Props & Kontrak Komponen Inti

### A. Primitif: `Button` (`src/components/ui/button.tsx`)
- **Props:** `variant` (`default` | `outline` | `ghost` | `destructive` | `link` | `toolbar`), `size` (`default`: h-9 px-4, `sm`: h-8 px-3, `lg`: h-10 px-6, `icon`: size-9, `table-action`: size-8 rounded-lg), `loading?: boolean`, `iconLeft?: ReactNode`, `iconRight?: ReactNode`.
- **States:** `hover` (elevasi & background tint), `focus-visible` (ring-2 ring-primary), `disabled` (opacity-50 pointer-events-none), `loading` (spinner berputar otomatis menggantikan iconLeft).
- **Token:** Radius `rounded-xl` terstandar, warna dari semantik `bg-primary`, `bg-destructive`, `border-border`.

### B. Primitif: `Input` & `NumberInput` (`src/components/ui/input.tsx`)
- **Props:** `size` (`default`: h-9, `sm`: h-8), `error?: boolean`, `leftAddon?: ReactNode`, `rightAddon?: ReactNode`.
- **States:** `focus-visible` (ring-2 ring-primary/30 border-primary), `error` (border-destructive focus-visible:ring-destructive/30), `disabled` (bg-muted/40 cursor-not-allowed).
- **Format NumberInput:** Lokalisasi `id-ID`, titik pemisah ribuan, koma desimal, tabular-nums.

### C. Pola: `ModalFooterAction` (`src/components/patterns/modal-footer-action.tsx`)
- **Props:**
  - `onCancel: () => void`
  - `onSubmit?: () => void` (atau submit via `<form>`)
  - `saving?: boolean`
  - `cancelLabel?: string` (default: i18n "Batal")
  - `submitLabel?: string` (default: i18n "Simpan Perubahan")
  - `destructive?: boolean` (default: false, jika true tombol submit menjadi `variant="destructive"`)
  - `extraActions?: ReactNode` (slot tambahan seperti "Hapus Akun" di sisi kiri footer)
- **Responsif:** Mobile: tombol submit di atas / lebar penuh; Desktop: tombol sejajar baris kanan (`sm:flex-row sm:justify-end gap-2.5`).
