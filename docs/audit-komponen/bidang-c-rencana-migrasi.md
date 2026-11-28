# BIDANG C: RENCANA MIGRASI KOMPONEN (ID: MG-xx)
**Dokumen:** `docs/audit-komponen/bidang-c-rencana-migrasi.md`  
**Prinsip Utama:** Risiko Terendah ke Dampak Terbesar, 1 Commit per Komponen/Paket Kecil, Verifikasi Paritas Visual Piksel-Identik (Desktop 1920, 1440, 1280, 1024, dan Mobile 393)

---

## 1. Urutan Tahapan Migrasi Berdasarkan Tingkat Risiko & Dampak

Migrasi dirancang dalam 8 tahapan berurutan (*wave migration*). Setiap tahapan wajib divalidasi dengan `npx tsc -b`, unit test, dan tangkapan layar paritas visual sebelum melangkah ke tahapan berikutnya:

```
[Tahap 1: Primitif Non-Intrusif]
  ├── Wave 1: Button & Action Icon Buttons (KP-01)
  ├── Wave 2: Badge & StatusBadge (AR-05)
  └── Wave 3: Input, NumberInput & SearchInput (KP-03)

[Tahap 2: Pola Struktur & Kontainer]
  ├── Wave 4: PageHeader & Headings (KP-04)
  ├── Wave 5: Tab Navigasi Halaman (KP-04)
  └── Wave 6: Card, CardHeaderWithInfo & KpiCard (KP-10)

[Tahap 3: Pola Tabel & Modal Kompleks]
  ├── Wave 7: Table & Sel Moneter (KP-06)
  └── Wave 8: Modal Dialog & ModalFooterAction (KP-02)
```

---

## 2. Tabel Rencana Migrasi Komponen (ID: MG-xx)

| ID | Elemen / Komponen yang Dimigrasi | Prioritas | Daftar File Halaman yang Diubah | Ketidakkonsistenan Visual yang Dibereskan | Risiko | Strategi Pengujian | Rencana Rollback |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **MG-01** | `Button` & `ActionIconButton` | 1 (Risiko Rendah) | `shell-sidebar.tsx`, `table-sort-menu.tsx`, `projects-page.tsx`, `profile-settings-page.tsx`, `invoicing-page.tsx` (146 lokasi) | Menyeragamkan radius `rounded-lg` pada tombol baris tabel, padding `size-8`, dan state hover/focus | Sangat Rendah | Vitest click handler + visual comparison 1440px & 393px | `git checkout HEAD~1 -- src/` per commit |
| **MG-02** | `Badge` & `StatusBadge` | 2 (Risiko Rendah) | `admin-approvals-page.tsx`, `po-page.tsx`, `invoicing-page.tsx`, `project-detail-page.tsx` (38 lokasi) | Menghilangkan warna hex acak pada badge status persetujuan, menyatukan ke token semantik | Sangat Rendah | Snapshot test varian badge | Revert commit MG-02 |
| **MG-03** | `SearchInput` (Pola Baru) | 3 (Risiko Rendah) | `parties-master-page.tsx`, `po-table.tsx`, `invoicing-table.tsx`, `coa-table.tsx`, `users-management-page.tsx` (10 lokasi) | Menyeragamkan tinggi input pencarian (`h-9`), padding ikon kiri, dan menyediakan tombol pembersih (x) | Rendah | Uji debounce filtering tabel di 5 halaman master | Revert commit MG-03 |
| **MG-04** | `PageHeader` | 4 (Risiko Sedang) | `buyer-portal-page.tsx`, `profile-overview-page.tsx`, `system-config-page.tsx`, `login-page.tsx` (8 lokasi) | Menyeragamkan margin bawah `gap-3 sm:flex-row sm:items-end`, tipografi `text-2xl sm:text-3xl`, tanpa border bawah | Rendah | Visual diff header di viewport 1024, 1280, 1440, 1920 | Revert commit MG-04 |
| **MG-05** | Tab Navigasi Profil & Pengaturan | 5 (Risiko Sedang) | `company-profile-page.tsx`, `profile-settings-page.tsx`, `admin-settings-page.tsx` (8 lokasi) | Menghilangkan div grid kustom manual, menyatukan ke varian `@/components/ui/tabs` dengan ukuran padding `py-2.5 px-3.5` | Sedang | Uji navigasi tab via URL query parameter (`?tab=...`) | Revert commit MG-05 |
| **MG-06** | `EmptyState` & `PageLoader` | 6 (Risiko Rendah) | Seluruh tabel modul transaksi dan master data (68 lokasi) | Menghilangkan spinner berukuran acak, menyeragamkan tampilan data kosong di dalam baris tabel | Rendah | Mock data kosong dan bandingkan render visual | Revert commit MG-06 |
| **MG-07** | `Table` & Sel Moneter | 7 (Risiko Sedang) | Modul Akuntansi (`general-ledger-view.tsx`, `trial-balance-view.tsx`, `reports-print-content.tsx`) (10 lokasi) | Mengonversi tabel cetak ke komponen `Table` standar tanpa merusak styling cetak media print | Sedang | Verifikasi preview cetak PDF dan tampilan layar desktop | Revert commit MG-07 |
| **MG-08** | `ModalFooterAction` (Pola Baru) | 8 (Risiko Sedang) | Seluruh file dialog di `src/features/*/dialogs/` (135 lokasi) | Menyeragamkan urutan tombol Batal di kiri dan Simpan di kanan, teks tombol, dan status loading | Sedang | Uji form submission dan tombol cancel di tiap dialog | Revert per modul dialog |

---

## 3. Protokol Pembuktian Paritas Visual (0 Piksel Berubah)

Sebelum dan sesudah setiap commit migrasi komponen:
1. Jalankan skrip Puppeteer otomatis pada 5 viewport resmi:
   - **Desktop Ultra-wide:** 1920 x 1080
   - **Desktop Standar:** 1440 x 900
   - **Laptop Sedang:** 1280 x 800
   - **Desktop Minimal:** 1024 x 768
   - **Mobile Smartphone:** 393 x 852
2. Bandingkan tangkapan layar `baseline` vs `post-refactor` menggunakan kalkulator selisih byte pada `scripts/verify-desktop-parity-multivp.mjs`.
3. Selisih byte harus **0% (100% Identik)**, kecuali perubahan yang secara eksplisit disetujui dalam ID temuan (misalnya perbaikan alignment tombol yang sebelumnya miring atau asimetris).
4. Bila terjadi pergeseran layout tidak diinginkan, commit dibatalkan seketika (`git checkout`) dan diperbaiki sebelum diajukan kembali.
