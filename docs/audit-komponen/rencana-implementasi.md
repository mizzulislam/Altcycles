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
- **Tujuan:** Menyelaraskan seluruh variabel token warna, radius, dan jarak ke dalam token Tailwind resmi di `src/index.css`.
- **Daftar Berkas:**
  - `src/index.css` (penambahan variabel semantik)
  - `AGENTS.md` (pembaruan aturan token komponen baru)
- **Risiko:** Sangat Rendah.
- **Rollback:** `git checkout HEAD~1 -- src/index.css AGENTS.md`.

---

### Paket 3: Standarisasi Komponen Primitif
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
- **Tujuan:** Mengganti penulisan tag manual (`<button>`, footer modal, search input) di file halaman menggunakan komponen bersama.
- **Urutan Migrasi Portal:**
  1. **Portal Super Admin:** `super-admin-dashboard.tsx`, `company-profile-page.tsx`, `users-management-page.tsx`, `admin-settings-page.tsx`, `shortcuts-management-page.tsx`, `audit-trail-page.tsx`, `system-config-page.tsx`.
  2. **Portal Anggota Tim (User):** `user-dashboard.tsx`, `user-payments-page.tsx`, `po-page.tsx`, `budget-page.tsx`.
  3. **Portal Admin (Bendahara & Akuntansi):** `admin-dashboard.tsx`, `admin-approvals-page.tsx`, `projects-page.tsx`, `project-detail-page.tsx`, `invoicing-page.tsx`, `accounting-page.tsx`, `journals-page.tsx`, `reports-page.tsx`, `profit-sharing-page.tsx`, `parties-master-page.tsx`.
  4. **Auth & Shared:** `login-page.tsx`, `buyer-portal-page.tsx`, `profile-settings-page.tsx`, `portal-shell.tsx`.
- **Pengujian:** Verifikasi Puppeteer 5 viewport dan `npx tsc -b` setelah setiap commit portal.
- **Risiko:** Sedang.
- **Rollback:** `git revert` commit per portal.

---

### Paket 6: Pemecahan File Kode Panjang (> 800 Baris)
- **Tujuan:** Memecah 28 file kritis menjadi modul-modul terpisah < 300 baris dengan prinsip *Single Responsibility*.
- **Urutan Eksekusi:**
  1. Mesin Dokumen: `pdf-engine.ts` (3.337 baris) -> pecah menjadi 5 file helper modular.
  2. Dashboard & Beranda: `admin-dashboard.tsx`, `user-dashboard.tsx`, `super-admin-dashboard.tsx`.
  3. Modul Bisnis: `profit-sharing-page.tsx`, `user-payments-page.tsx`, `admin-approvals-page.tsx`, `invoicing-page.tsx`, `projects-page.tsx`.
  4. Modul Akuntansi: `journals-page.tsx`, `reports-export-handlers.ts`, `reports-print-content.tsx`.
- **Pengujian:** Seluruh tes unit dan build `tsc -b` harus lulus tanpa regresi fungsional.
- **Risiko:** Sedang.
- **Rollback:** `git checkout` per file yang dipecah.

---

### Paket 7: Pembersihan File, Aset & Dependensi Tak Terpakai
- **Tujuan:** Menghapus berkas yang telah dikonfirmasi yatim dan disetujui pengguna.
- **Daftar Target Hapus (Setelah Persetujuan):**
  - `src/features/system-config/components/company-profile-tab-tax.tsx` (komponen yatim)
  - `src/components/ui/collapsible.tsx` (komponen primitif yatim)
  - `src/lib/design-system/` (modul stub mati)
  - `scripts/capture-stage2-review.mjs` (skrip kosong)
  - Penghapusan dependensi `driver.js` di `package.json` (bila disetujui)
- **Risiko:** Sangat Rendah (sudah dibuktikan 0 referensi).
- **Rollback:** `git checkout` file dari riwayat commit git.

---

### Paket 8: Penggabungan & Penataan Dokumen `docs/`
- **Tujuan:** Menata ulang dokumentasi agar satu topik memiliki satu dokumen induk yang rapi.
- **Rencana Penataan:**
  - `docs/audit-komponen/` diarsipkan sebagai dokumentasi permanen standarisasi.
  - Dokumentasi render-check lama digabung ke dalam indeks navigasi `docs/render-check/README.md`.
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
