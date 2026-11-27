# Bidang C: Komponen dan Pola (ID: UX-xx)

Dokumen ini membandingkan implementasi komponen antarmuka antarkomponen di seluruh portal Altcycles, mendeteksi duplikasi, inkonsistensi pola, serta merumuskan satu spesifikasi terpadu per komponen.

---

## 1. Inventarisasi Komponen Inti & Status Konsistensi

| Komponen | Status Saat Ini | Masalah / Inkonsistensi Ditemukan | Standar Usulan Polestar |
| :--- | :--- | :--- | :--- |
| **Tombol (`Button`)** | Menggunakan CVA dengan radius `rounded-xl`, padding `h-9 px-4`, icon size `size-4`. | Di tabel ada icon button `size-8` yang target tap-nya di bawah 44px di mobile. Radius melengkung tidak selaras Polestar. | Tinggi `h-9` (desktop) / `h-10` (mobile), radius terstandar via token, pseudo tap target `44px` di mobile. |
| **Input & Select (`NumberInput`, `Select`)** | Menggunakan wrapper khusus, `h-9 rounded-xl`, font `tabular-nums`. | Teks placeholder terkadang memakai warna abu-abu berbeda di beberapa modal lama. | Tinggi konsisten `h-9` desktop / `h-11` (44px) mobile, radius tegas `rounded-[3px]`, font 16px di mobile. |
| **Kartu (`Card`)** | Pola edge-to-edge dengan border tipis `border-border/80`, `CardContent p-0` pada tabel. | Beberapa kartu KPI di dashboard memiliki `p-5`, sementara kartu formulir memiliki `p-6`. | Padding konten modular konsisten: `p-4 sm:p-6`, border 1px `border-border/50`, bayangan flat `shadow-none` atau `shadow-2xs`. |
| **Tabel (`Table`)** | Rata tengah header, Proper Case, monetary alignment kiri-kanan (`MonetaryCell`). | Di mobile layar sempit (<393px), tabel 7 kolom terpotong dan membutuhkan scroll horizontal tanpa visual cue yang jelas. | Mobile: kartu bertumpuk ringkas (*stacked cards*) atau horizontal scroll dengan indikator fade gradien dan cue sentuh. |
| **Modal Dialog (`Dialog`)** | Header bersih tanpa ikon dekoratif, judul rata vertikal dengan tombol Close. | Di layar mobile pendek (height < 700px), modal form 2 kolom meluap melebihi tinggi layar sehingga tombol aksi tersembunyi. | Mobile: otomatis berubah menjadi Bottom Drawer / Sheet yang menempel di bawah dengan area sticky footer. |
| **Dropdown & Popover (`ExportDownloadMenu`)** | Menggunakan React Portal `createPortal(..., document.body)` dengan z-index `99999`. | Sudah sangat konsisten dan bebas dari terpotong (*anti-clipping rule*). | Pertahankan pola portal, pastikan tap area item dropdown minimal 44px di mobile. |
| **Empty State & Loader** | Menggunakan `EmptyState` menyatu di dalam baris `<TableBody>` dan `FullScreenLoader`. | Beberapa halaman non-tabel memiliki empty state inline dengan ilustrasi berbeda. | Standarisasi satu komponen `EmptyState` dengan ikon muted tunggal dan teks ringkas 2 baris. |

---

## 2. Tabel Temuan Bidang C (ID: UX-xx)

| ID | Komponen Terkena | Deskripsi Temuan | Bukti File / Baris | Dampak UX | Keparahan | Rekomendasi Konkret | Berdampak ke Desktop? | Perlu Keputusan? |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: |
| **UX-01** | `Button` (Icon di Tabel) | Area sentuh icon button `size-8` (32px) di baris tabel di bawah 44px pada layar sentuh | `src/components/ui/button.tsx:26` | Pengguna mobile sering salah sentuh baris saat ingin menekan aksi | Tinggi | Tambahkan kelas pseudo-touch `after:absolute after:-inset-1.5` yang aktif pada touch viewport (`max-sm:after:content-['']`) | **Tidak** | Tidak |
| **UX-02** | `Dialog` Form Kompleks | Dialog modal di mobile meluap vertikal dan menyulitkan pengisian di keyboard virtual | `src/features/accounting/components/journal-entry-dialog.tsx:120` | Input tertutup keyboard, tombol simpan berada di luar layar | Tinggi | Ubah modal kompleks menjadi Bottom Sheet responsif (`Sheet` / Drawer) pada breakpoint mobile `<sm` | **Tidak** | Tidak |
| **UX-03** | `Tabs` Navigasi | Navigasi tab dengan banyak item di mobile terpotong tanpa scroll horizontal halus | `src/features/master-data/master-data-page.tsx:85` | Tab sebelah kanan tidak terlihat di layar 360px - 390px | Sedang | Tambahkan kelas `max-sm:overflow-x-auto max-sm:scrollbar-none max-sm:flex-nowrap` pada container TabsList | **Tidak** | Tidak |
| **UX-04** | `Toggle` (Switch) | Ukuran switch toggle di halaman konfigurasi sedikit terlalu kecil untuk sentuhan jempol | `src/components/ui/switch.tsx:18` | Sulit diaktifkan secara akurat di perangkat mobile | Rendah | Perluas tap target wrapper switch dengan padding transparan `p-1` | **Tidak** | Tidak |
| **UX-05** | `CommandPalette` Dialog | Tinggi maksimal command palette di mobile mengambil 90vh tanpa gesture swipe to dismiss | `src/components/navigation/command-palette-dialog.tsx:276` | Pengguna mobile harus menekan tombol close kecil di pojok | Sedang | Pasang handler swipe down untuk menutup command palette di mobile | **Tidak** | Tidak |

---

## 3. Spesifikasi Terpadu Komponen (Fintech Polestar Standard)

- **Radius Kontrol (Usulan Desktop/Mobile):**
  - Opsi Desktop Terkunci: Tetap mengikuti aturan AGENTS.md (`rounded-xl` / `rounded-2xl`).
  - Opsi Polestar Baru (Perlu Keputusan: Ya): Kontrol formulir & tombol `rounded-[3px]`, kartu kontainer `rounded-[4px]`, badge `rounded-none` atau `rounded-xs`.
- **Ketebalan Garis:** Mutlak 1px (`border`), warna `border-border/60` (light) dan `border-white/10` (dark).
- **Elevasi:** Flat, tanpa bayangan mengambang (`shadow-none` atau `shadow-2xs`).
