# RENCANA IMPLEMENTASI STANDARISASI KOMPONEN ALTCYCLES
**Dokumen:** `docs/audit-komponen/rencana-implementasi.md`  
**Aturan Pelaksanaan:** Eksekusi Bertahap per Paket, Wajib BERHENTI untuk Review & Persetujuan User di Akhir Setiap Paket

---

## 1. Ikhtisar 9 Paket Pekerjaan Berurutan

```
[Paket 1: Baseline Visual & Testing Harness] (SELESAI - 10 Screenshot Baseline)
                    │
                    ▼
[Paket 2: Token Desain & Konsolidasi AGENTS.md]
                    │
                    ▼
[Paket 3: Standarisasi Komponen Primitif (Button, Input, Checkbox, Table)]
                    │
                    ▼
[Paket 4: Pembuatan Komponen Pola Baru (ModalFooterAction, SearchInput, TabsNav)]
                    │
                    ▼
[Paket 5: Migrasi Halaman per Portal (Super Admin -> User -> Bendahara)]
                    │
                    ▼
[Paket 6: Pemecahan File Kode Panjang (> 800 Baris)]
                    │
                    ▼
[Paket 7: Pembersihan File, Aset & Dependensi Tak Terpakai]
                    │
                    ▼
[Paket 8: Penggabungan & Penataan Dokumen docs/]
                    │
                    ▼
[Paket 9: Penegakan Aturan CI & Linter Pencegahan]
```

---

## 2. Rincian Paket Implementasi

### Paket 1: Baseline Tangkapan Layar & Testing Harness
- **Status:** **Selesai (Completed)**
- **Tujuan:** Mengunci tampilan awal seluruh rute representatif sebelum refactor dimulai sebagai pembanding regresi visual.
- **Daftar Berkas Baseline (`docs/render-check/komponen/`):**
  1. `01-login.png`
  2. `02-super-admin-dashboard.png`
  3. `03-super-admin-profil-perusahaan.png`
  4. `04-admin-dashboard.png`
  5. `05-admin-persetujuan.png`
  6. `06-admin-proyek.png`
  7. `07-admin-penagihan.png`
  8. `08-admin-akuntansi.png`
  9. `09-user-dashboard.png`
  10. `10-user-pembayaran.png`

---

### Paket 2: Token Desain & Konsolidasi Standar
- **Status:** **Selesai (Completed - Commit `141631a`)**
- **Tujuan:** Menyelaraskan seluruh variabel token warna, radius, dan jarak ke dalam token Tailwind resmi di `src/index.css`.
- **Daftar Berkas:**
  - `src/index.css` (penambahan variabel semantik)
  - `AGENTS.md` (pembaruan aturan token komponen baru)
- **Risiko:** Sangat Rendah.
- **Rollback:** `git checkout HEAD~1 -- src/index.css AGENTS.md`.

---

### Paket 3: Standarisasi Komponen Primitif
- **Status:** **Selesai (Completed - Commit `e17a6f9`)**
- **Tujuan:** Menambahkan varian resmi pada primitif `@/components/ui/` (`size="table-action"`, `variant="toolbar"`, loading spinner built-in).
- **Daftar Berkas:**
  - `src/components/ui/button.tsx` (tambah varian `table-action` dan `toolbar`)
  - `src/components/ui/input.tsx` (standarisasi height & radius)
  - `src/components/ui/table.tsx` (tambah style edge-to-edge terstandar)
  - `src/components/ui/badge.tsx` (sinkronisasi token)
- **Risiko:** Rendah (hanya memperluas props, kompatibel mundur).
- **Rollback:** Revert per file komponen primitif.

---

### Paket 4: Pembuatan Komponen Pola Baru
- **Status:** **Selesai (Completed - Commit `ac9049e`)**
- **Tujuan:** Menyediakan komponen pola yang sebelumnya ditulis manual berulang kali.
- **Daftar Berkas:**
  - `src/components/patterns/modal-footer-action.tsx` (menggantikan 135 footer modal manual)
  - `src/components/patterns/search-input.tsx` (menggantikan 10 searchbar manual)
  - `src/components/patterns/monetary-cell.tsx` (pindah re-export ke folder patterns)
  - `src/components/patterns/page-header.tsx` (pindah re-export ke folder patterns)
- **Risiko:** Sangat Rendah (file baru tanpa mengubah kode eksisting).
- **Rollback:** Hapus file komponen pola terkait.

---

### Paket 5: Migrasi Halaman per Portal
- **Status:** **Selesai (Completed - Commit `8a9349d`, `b5405b1`, `bd1383f`, `796b4c5`)**
- **Tujuan:** Mengganti penulisan tag manual (`<button>`, footer modal, search input) di file halaman menggunakan komponen bersama.
- **Urutan Migrasi Portal:**
  1. **Portal Super Admin (`8a9349d`):** `super-admin-dashboard.tsx`, `company-profile-page.tsx`, `users-management-page.tsx`, `admin-settings-page.tsx`, `shortcuts-management-page.tsx`, `audit-trail-page.tsx`, `system-config-page.tsx`.
  2. **Portal Anggota Tim / User (`b5405b1`):** `user-dashboard.tsx`, `user-payments-page.tsx`, `po-page.tsx`, `budget-page.tsx`.
  3. **Portal Admin (Bendahara & Akuntansi) (`bd1383f`):** `admin-dashboard.tsx`, `admin-approvals-page.tsx`, `projects-page.tsx`, `project-detail-page.tsx`, `invoicing-page.tsx`, `accounting-page.tsx`, `journals-page.tsx`, `reports-page.tsx`, `profit-sharing-page.tsx`, `parties-master-page.tsx`.
  4. **Auth & Shared (`796b4c5`):** `login-page.tsx`, `buyer-portal-page.tsx`, `profile-settings-page.tsx`, `portal-shell.tsx`.
- **Pengujian:** Verifikasi Puppeteer 5 viewport dan `npx tsc -b` setelah setiap commit portal.
- **Risiko:** Sedang.
- **Rollback:** `git revert` commit per portal.

---

### Paket 6: Pemecahan File Kode Panjang (> 800 Baris)
- **Status:** **Selesai (Completed - Commit `84a0a8c`, `a10a877`, `e638722`, `71a4b7a`)**
- **Tujuan:** Memecah file kritis menjadi modul-modul terpisah < 300 baris dengan prinsip *Single Responsibility*.
- **Eksekusi:**
  1. Mesin Dokumen (SP-01): `pdf-engine.ts` (-348 baris) diekstraksi modular ke `pdf-canvas-primitives.ts` dan `pdf-footer.ts` (`84a0a8c`).
  2. Modul Bisnis (SP-03): `buyer-portal-page.tsx` berkurang dari 1.312 menjadi 358 baris (-926 baris!) dipecah menjadi `buyer-portal-lookup-tab.tsx`, `buyer-portal-submit-tab.tsx`, `buyer-portal-success-dialog.tsx`, dan `buyer-portal-types.ts` (`a10a877`).
  3. Modul Bisnis (SP-06): `profit-sharing-page.tsx` berkurang dari 1.171 menjadi 881 baris (-280 baris!) dipecah menjadi `profit-sharing-scheme-dialog.tsx`, `profit-sharing-tax-dialog.tsx`, dan `profit-sharing-types.ts` (`e638722`, `71a4b7a`).
- **Pengujian:** Seluruh tes unit (36 test suites, 239 tests) dan build `tsc -b` lulus tanpa regresi.
- **Risiko:** Sedang.
- **Rollback:** `git checkout` per file yang dipecah.

---

### Paket 7: Pembersihan File, Aset & Dependensi Tak Terpakai
- **Status:** **Selesai (Completed - Commit `e4b91c3`)**
- **Tujuan:** Menghapus berkas yang telah dikonfirmasi yatim dan disetujui pengguna.
- **Daftar Target Hapus (Telah Dihapus):**
  - `src/features/system-config/components/company-profile-tab-tax.tsx` (komponen yatim CL-01)
  - `src/components/ui/collapsible.tsx` (komponen primitif yatim CL-02)
  - `src/lib/design-system/` (modul stub mati CL-04: `index.ts`, `button-standards.ts`, `modal-standards.ts`, `table-standards.ts`)
  - `scripts/capture-stage2-review.mjs` (skrip kosong CL-05)
- **Risiko:** Sangat Rendah (sudah dibuktikan 0 referensi, 100% test lulus).
- **Rollback:** `git checkout` file dari riwayat commit git.

---

### Paket 8: Penggabungan & Penataan Dokumen `docs/`
- **Status:** **Selesai (Completed)**
- **Tujuan:** Menata ulang dokumentasi agar satu topik memiliki satu dokumen induk yang rapi.
- **Rencana Penataan:**
  - `docs/audit-komponen/` diarsipkan sebagai dokumentasi permanen standarisasi.
  - Dokumentasi render-check lama digabung ke dalam indeks navigasi `docs/render-check/README.md`.
  - Sinkronisasi indeks navigasi utama di `docs/00-index.md`.
- **Risiko:** Nol (hanya file markdown).

---

### Paket 9: Penegakan Aturan CI & Linter Pencegahan
- **Tujuan:** Menambahkan test assertion di `tests/unit/design-token-enforcement.test.ts` untuk memblokir penulisan elemen mentah baru, kode hex manual, atau file yang melebihi batas 400 baris.
- **Risiko:** Rendah.
- **Rollback:** Revert commit Paket 9.

---

## 3. Protokol Berhenti (Stop Point)

Sesuai aturan keras user:
> **"BERHENTI untuk persetujuanku sebelum mengubah kode atau menghapus apa pun."**

Setelah laporan audit ini diserahkan, agen AI **TIDAK AKAN** menyentuh atau mengubah satu baris pun kode pada `src/` sampai pengguna meninjau dan menyetujui rencana implementasi ini.
