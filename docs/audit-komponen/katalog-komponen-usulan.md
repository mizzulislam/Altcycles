# KATALOG KOMPONEN USULAN ALTCYCLES (SINGLE SOURCE OF TRUTH)
**Dokumen:** `docs/audit-komponen/katalog-komponen-usulan.md`  
**Tujuan:** Panduan Resmi Seluruh Komponen Primitif & Pola Antarmuka Altcycles

---

## 1. Aturan Penggunaan Komponen bagi Halaman

1. **Halaman Hanya Menyusun Komponen (Import Only):** Seluruh file halaman fitur (`src/features/*`) hanya bertugas mengorkestrasi logika data, state, dan menyusun komponen bersama. Dilarang menulis tag HTML interaktif mentah (`<button>`, `<input>`, `<select>`, `<table>`) dengan kelas CSS manual di dalam file halaman.
2. **Ekstensi via Props, Bukan Salinan Komponen:** Apabila sebuah halaman membutuhkan variasi baru (misalnya tombol dengan warna aksen khusus atau badge dengan ikon khusus), varian tersebut harus ditambahkan ke dalam file komponen bersangkutan melalui varian `cva` atau prop resmi, bukan membuat salinan komponen lokal di halaman.
3. **Pengecualian Sah Terdaftar:** Input file tersembunyi (`<input type="file" className="hidden" />`) yang digunakan untuk memicu pemilihan berkas foto/dokumen diperbolehkan dengan membungkusnya dalam komponen uploader resmi (`AvatarUploadDialog` atau `ImageAssetUploadBox`).

---

## 2. Katalog Spesifikasi Komponen

### A. Primitif Tombol: `Button` (`src/components/ui/button.tsx`)
- **Fungsi:** Komponen tombol interaktif terstandar di seluruh portal.
- **Props:**
  - `variant`: `"default"` (biru primary), `"outline"` (border border-border/80), `"ghost"` (transparan hover muted), `"destructive"` (merah bahaya), `"link"` (teks bertaut), `"toolbar"` (tombol aksi bilah toolbar).
  - `size`: `"default"` (`h-9 px-4 text-xs sm:text-sm font-semibold rounded-xl`), `"sm"` (`h-8 px-3 text-xs rounded-xl`), `"lg"` (`h-10 px-6 rounded-xl`), `"icon"` (`size-9 rounded-xl`), `"table-action"` (`size-8 rounded-lg`).
  - `loading?: boolean`: Bila true, otomatis menampilkan spinner animasi dan menonaktifkan klik.
  - `iconLeft?: ReactNode` & `iconRight?: ReactNode`: Ikon pelengkap.
- **Contoh Penggunaan Benar:**
  ```tsx
  // Tombol aksi di tabel
  <Button variant="ghost" size="table-action" onClick={handleEdit} title="Ubah Data">
    <PencilIcon className="size-4" />
    <span className="sr-only">Ubah Data</span>
  </Button>

  // Tombol simpan dengan status loading
  <Button type="submit" loading={saving}>
    Simpan Perubahan
  </Button>
  ```
- **Contoh Salah:**
  ```tsx
  // DILARANG: Menulis tag <button> mentah dengan styling manual
  <button className="h-8 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={...}>
    Simpan
  </button>
  ```

---

### B. Primitif Input: `Input` & `NumberInput` (`src/components/ui/input.tsx`)
- **Fungsi:** Field penampung teks dan angka moneter terstandar.
- **Spesifikasi Token:** Tinggi seragam `h-9`, radius `rounded-xl`, border `border-border/80`, font teks `text-xs sm:text-sm`.
- **NumberInput Khusus:** Memformat input angka otomatis mengikuti konvensi Indonesia (`id-ID`) dengan titik pemisah ribuan dan koma desimal, serta font sans `tabular-nums`.
- **Contoh Penggunaan Benar:**
  ```tsx
  <Field>
    <FieldLabel required>Nominal Pembayaran</FieldLabel>
    <NumberInput
      value={nominal}
      onValueChange={(val) => setNominal(val)}
      placeholder="0"
    />
  </Field>
  ```

---

### C. Pola Header Halaman: `PageHeader` (`src/components/patterns/page-header.tsx`)
- **Fungsi:** Header resmi di bagian teratas setiap halaman portal.
- **Props:**
  - `title: string` (teks judul h1, Proper Case)
  - `description?: string` (subjudul ringkas 1 kalimat)
  - `badge?: ReactNode` (opsional: lencana status portal)
  - `actions?: ReactNode` (opsional: grup tombol filter periode, ekspor, atau aksi tambah)
- **Desain Standar:** `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`, judul `text-2xl sm:text-3xl font-bold tracking-tight text-foreground`, subjudul `text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed`, tanpa garis pemisah bawah (`border-b`).
- **Contoh Penggunaan Benar:**
  ```tsx
  <PageHeader
    title="Persetujuan Pembayaran"
    description="Tinjau dan proses antrean pengajuan dana operasional serta reimbursement tim."
    actions={
      <div className="flex items-center gap-2.5">
        <PeriodFilter value={period} onChange={setPeriod} />
        <ExportDownloadMenu onExportExcel={...} onExportPdf={...} onExportCsv={...} />
      </div>
    }
  />
  ```

---

### D. Pola Kartu KPI: `KpiCard` (`src/components/patterns/dashboard-kpi-card.tsx`)
- **Fungsi:** Kartu ringkasan metrik statistik utama pada dashboard.
- **Struktur Standar:** Kontainer `p-5 flex items-center justify-between gap-4 rounded-2xl border-border/80 bg-card shadow-2xs`.
- **Konten Kiri:** Label `text-xs font-medium text-muted-foreground`, nilai metrik `text-xl sm:text-2xl font-bold tracking-tight tabular-nums`, keterangan subteks `text-[11px] text-muted-foreground mt-1`.
- **Konten Kanan:** Ikon kotak `size-10 rounded-xl border border-border/70 flex items-center justify-center`.
- **Contoh Penggunaan Benar:**
  ```tsx
  <KpiCard
    title="Kas & Bank Terkini"
    value={formatRupiah(totalCash)}
    subtitle="Saldo likuiditas aktif"
    icon={WalletIcon}
    accentColor="blue"
  />
  ```

---

### E. Pola Footer Modal: `ModalFooterAction` (`src/components/patterns/modal-footer-action.tsx`)
- **Fungsi:** Footer aksi tombol pada setiap form dialog modal (Tambah, Ubah, Hapus).
- **Props:** `onCancel: () => void`, `onSubmit?: () => void`, `saving?: boolean`, `submitLabel?: string`, `cancelLabel?: string`, `destructive?: boolean`, `extraActions?: ReactNode`.
- **Responsif:** Mobile: tombol submit di atas / lebar penuh; Desktop: tombol sejajar baris kanan (`sm:flex-row sm:justify-end gap-2.5`).
- **Contoh Penggunaan Benar:**
  ```tsx
  <DialogFooter>
    <ModalFooterAction
      onCancel={() => setOpen(false)}
      saving={isSubmitting}
      submitLabel="Simpan Data Rekening"
    />
  </DialogFooter>
  ```

---

### F. Pola Sel Tabel Moneter: `MonetaryCell` (`src/components/patterns/monetary-cell.tsx`)
- **Fungsi:** Menampilkan nilai mata uang di dalam sel tabel secara simetris dan rapi.
- **Struktur:** `flex items-center justify-between gap-3 w-full tabular-nums text-xs sm:text-sm`. Simbol mata uang (`Rp`, `USD`) rata kiri, angka nominal rata kanan.
- **Contoh Penggunaan Benar:**
  ```tsx
  <TableCell className="text-right">
    <MonetaryCell amount={item.total_amount} currency="IDR" />
  </TableCell>
  ```

---

### G. Pola Bilah Pencarian: `SearchInput` (`src/components/patterns/search-input.tsx`)
- **Fungsi:** Field pencarian data pada toolbar tabel dengan ikon search terpadu dan tombol pembersih (x).
- **Props:** `value: string`, `onChange: (val: string) => void`, `placeholder?: string`, `className?: string`.
- **Contoh Penggunaan Benar:**
  ```tsx
  <SearchInput
    value={searchTerm}
    onChange={setSearchTerm}
    placeholder="Cari nomor invoice atau nama klien..."
    className="w-full sm:w-72"
  />
  ```
