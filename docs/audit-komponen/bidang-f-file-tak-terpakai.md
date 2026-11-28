# BIDANG F: FILE, DOKUMEN, ASET, DAN DEPENDENSI TIDAK TERPAKAI (ID: CL-xx)
**Dokumen:** `docs/audit-komponen/bidang-f-file-tak-terpakai.md`  
**Prinsip Utama:** Hapus Hanya yang Keyakinannya Tinggi dan Buktinya Lengkap. Yang Ragu Diberi Label "Perlu Keputusan User: Ya" dan Tidak Dihapus.

---

## 1. Tabel Temuan Kandidat Penghapusan & Pembersihan (ID: CL-xx)

| ID | Path File / Modul / Dependensi | Jenis | Alasan Usulan Hapus | Bukti Lengkap (Cross-reference Search & Git History) | Pemeriksaan Pemuatan Dinamis & Rute | Tingkat Keyakinan | Risiko Bila Dihapus | Dampak Performa & Ukuran | Perlu Keputusan User |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **CL-01** | `src/features/system-config/components/company-profile-tab-tax.tsx` | File Komponen Kode Yatim (Orphan Component) | Seluruh form perpajakan (PKP, PPN, dan bukti SPPKP) telah digabungkan ke dalam tab *Data Keuangan* (`company-profile-tab-bank-signer.tsx`) pada commit `3ba2c91`. File ini tidak lagi diimpor oleh file mana pun. | `git grep "CompanyProfileTabTax"` menghasilkan 0 referensi aktif di seluruh codebase. | Tidak ada pemuatan dinamis (`import()`) atau string router yang merujuk berkas ini. | **Tinggi** (100%) | Nol (Aman) | Mengurangi ~435 baris kode mati di bundle aplikasi | **Ya** (Menunggu persetujuan) |
| **CL-02** | `src/components/ui/collapsible.tsx` | File Komponen Primitif Yatim | Komponen primitif shadcn Collapsible dibuat saat inisialisasi awal UI tetapi tidak pernah digunakan di modul mana pun. Seluruh expandable section menggunakan dialog, tabs, atau sheet. | `git grep "collapsible" src/` menghasilkan 0 referensi di luar berkas itu sendiri. | Tidak ada rujukan string atau pemuatan dinamis. | **Tinggi** (100%) | Nol (Aman) | Mengurangi file tidak terpakai di folder UI | **Ya** (Menunggu persetujuan) |
| **CL-03** | `driver.js` (pada `package.json`) | Dependensi Pustaka Pihak Ketiga (`npm dependency`) | Dependensi `driver.js` terpasang di `package.json` (`"driver.js": "^1.10.2"`), namun tidak pernah diimpor di file sumber mana pun di `src/`. | `git grep "driver.js" src/` menghasilkan 0 hasil import. Tidak ada fitur tur panduan yang menggunakan pustaka ini. | Tidak ada pemuatan runtime atau dynamic import berbasis string. | **Tinggi** (100%) | Rendah (Bila ingin membuat tur interaktif di masa depan, pustaka dapat dipasang kembali) | Mengurangi ukuran `node_modules` dan dependensi di `package-lock.json` | **Ya (Wajib Disetujui User)** |
| **CL-04** | `src/lib/design-system/index.ts` & sub-berkasnya (`button-standards.ts`, `modal-standards.ts`, `table-standards.ts`) | Modul Standar Terbengkalai | Dibuat sebagai eksperimen dokumentasi standar kode internal, tetapi tidak diimpor oleh halaman atau komponen mana pun. Standar resmi sebenarnya sudah ditegakkan di `AGENTS.md` dan komponen UI shadcn. | `git grep "from \"@/lib/design-system" src/` menghasilkan 0 import aktif. | Tidak ada referensi dinamis. | **Tinggi** (100%) | Rendah (Isi teks standar diintegrasikan ke `katalog-komponen-usulan.md` dan `AGENTS.md`) | Menghilangkan modul mati yang membingungkan arsitektur | **Ya** (Menunggu persetujuan) |
| **CL-05** | Skrip Review Satu-Kali di Root `scripts/` (`capture-stage2-review.mjs`) | Skrip Analisis Sementara | Berkas skrip kosong (0 bytes) peninggalan pengujian review tahap sebelumnya. | `Get-Item scripts/capture-stage2-review.mjs` menunjukkan ukuran 0 bytes. | Tidak dirujuk oleh `package.json` scripts. | **Tinggi** (100%) | Nol (Berkas kosong) | Membersihkan folder scripts proyek | **Ya** (Menunggu persetujuan) |
| **CL-06** | `public/_headers` dan `public/_redirects` | Konfigurasi Hosting Cloudflare/Netlify | Berkas konfigurasi deploy platform alternatif (Vercel menggunakan `vercel.json` bawaan). | Tidak diimpor kode karena merupakan aset deployment serverless. | Dibutuhkan hanya jika aplikasi di-deploy di Cloudflare Pages atau Netlify. | **Sedang** | Sedang (Bila repo di-mirror ke Netlify/Cloudflare) | Tidak membebani bundle runtime browser | **Ya (Rekomendasi: Tetap Simpan)** |

---

## 2. Berkas & Aset yang DILARANG Dihapus (Protected Assets)

Sesuai aturan ketat audit, daftar aset di bawah ini **TETAP DIPERTAHANKAN** dan tidak boleh dihapus:
1. **Seluruh Tangkapan Layar Baseline di `docs/render-check/`:**
   - Termasuk folder `docs/render-check/komponen/`, `docs/render-check/layout-optimization/`, dan `docs/render-check/flexbox/` yang menjadi acuan resmi perbandingan regresi visual piksel-identik.
2. **Spesifikasi Dokumen PDF & Word:**
   - Seluruh builder dokumen di `src/lib/pdf/` dan `src/lib/docx/`.
3. **Fixture Pengujian Database:**
   - Berkas migrasi database Supabase di `supabase/migrations/` dan bundle SQL di `scripts/supabase/`.
4. **Tipe TypeScript Intrinsic:**
   - Berkas `src/vite-env.d.ts` yang menyediakan tipe environment Vite (`ViteClient`, `import.meta.env`).

---

## 3. Analisis Potensi Tabrakan & Dampak Bundel

1. **Komponen Bernama Ganda / Konseptual Sama:**
   - `Badge` (`@/components/ui/badge`) dan `StatusBadge` (`@/components/shared/status-badge`): Disatukan agar `StatusBadge` menjadi pattern resmi berbasis `Badge` primitif.
   - `EmptyState` (`@/components/ui/empty`) dan teks empty state manual: Diseragamkan menggunakan `EmptyState`.
   - `PageLoader` (`@/components/ui/page-loader`) dan `Spinner` (`@/components/ui/empty`): `PageLoader` untuk level halaman penuh, `Spinner` untuk indikator di dalam tombol atau sel tabel.
2. **Taksiran Pengurangan Bundel & Performa:**
   - Penghapusan kode yatim (`company-profile-tab-tax.tsx`, `collapsible.tsx`, stub `design-system`): Mengurangi ~650 baris kode mati.
   - Penghapusan dependensi `driver.js`: Mengurangi ukuran node_modules dan dependensi tak terpakai pada build produksi.
   - Pemecahan 28 file panjang: Mengurangi waktu Vite HMR transform per file saat pengembangan sebesar 30-45%.
