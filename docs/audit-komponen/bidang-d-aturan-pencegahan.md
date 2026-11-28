# BIDANG D: ATURAN PENCEGAHAN LINT & CI (ID: PC-xx)
**Dokumen:** `docs/audit-komponen/bidang-d-aturan-pencegahan.md`  
**Tujuan:** Mencegah Munculnya Kembali Komponen Mentah, Gaya Hardcode, Duplikasi Kode, dan Pelanggaran Token Desain

---

## 1. Aturan Validasi CI & Penegakan Statis

Untuk menjamin agar arsitektur komponen tetap bersih dan tidak mengalami degradasi kualitas di masa mendatang, serangkaian aturan validasi statis ditambahkan pada pipeline pengujian (`npm test` / Vitest / ESLint):

```
                                  PIPELINE VALIDASI CI
                                           │
  ┌────────────────────────────────────────┼────────────────────────────────────────┐
  ▼                                        ▼                                        ▼
[ESLint / Token Linter]          [Vitest Token Enforcement]               [CI Build Gate]
- Larang <button> mentah         - Cek batas baris file (<400)            - tsc -b lolos 0 error
- Larang <input> mentah          - Cek larangan hex di page               - 0 file yatim tak terpakai
- Larang inline style statis     - Cek impor hanya dari @/components      - Paritas visual 0 piksel selisih
```

---

## 2. Tabel Aturan Pencegahan (ID: PC-xx)

| ID | Jenis Aturan Pencegahan | Mekanisme Penegakan | Target Pemeriksaan | Deskripsi Aturan & Sanksi Gagal CI | Pengecualian Terdaftar (Whitelist Sah) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **PC-01** | Larangan Elemen HTML Mentah di Halaman | ESLint (`react/forbid-elements`) & Vitest scan | Seluruh file di luar `src/components/ui/` | Melarang penggunaan tag `<button>`, `<input>`, `<select>`, `<textarea>`, dan `<table>` mentah di dalam file halaman fitur. Harus menggunakan komponen dari `@/components/ui/*`. | Elemen input type="file" tersembunyi untuk trigger upload foto/dokumen; elemen media cetak PDF khusus. |
| **PC-02** | Larangan Kode Warna Hex Hardcode | Test Vitest (`tests/unit/design-token-enforcement.test.ts`) | Seluruh file `.tsx` di `src/features/` | Melarang penulisan kode warna hex `#...` langsung di dalam komponen UI halaman. Wajib menggunakan kelas token Tailwind semantik (`text-primary`, `bg-muted`, `border-border`). | Berkas token generator PDF kanvas (`pdf-tokens.ts`) dan palet library SVG grafis khusus. |
| **PC-03** | Pembatasan Panjang Baris Maksimal File | Test Vitest (`tests/unit/design-token-enforcement.test.ts`) | Seluruh file sumber `.ts` dan `.tsx` | File baru dilarang melebihi **400 baris kode**. File eksisting berstatus legacy dibatasi maksimal 800 baris dan wajib dipecah dalam refactor. | Tipe database Supabase yang di-generate (`database.types.ts`) dan kamus terjemahan (`i18n.tsx`). |
| **PC-04** | Larangan Gaya Inline Statis (`style={{...}}`) | ESLint rule & regex scanner | Seluruh file di `src/features/` | Melarang properti `style={{ width: "...", color: "..." }}` yang bersifat statis. Wajib menggunakan utility class Tailwind. | Nilai komputasi dinamis murni runtime (mis. koordinat tooltip dinamis floating UI, persentase progress bar dinamis). |
| **PC-05** | Larangan Import Antar Halaman Fitur | ESLint (`no-restricted-imports`) | `src/features/*` | Halaman di satu modul fitur dilarang mengimpor file privat dari modul fitur lain (mis. `invoicing-page` dilarang mengimpor sub-komponen lokal dari `admin-approvals-page`). Shared UI wajib diletakkan di `src/components/`. | Modul utilitas murni di `src/lib/`. |
| **PC-06** | Larangan Komponen Duplikat (Naming Collision) | Skrip Audit Pra-Commit (`pre-commit hook`) | `src/components/` | Mendeteksi duplikasi nama komponen fungsi React yang diekspor untuk mencegah terciptanya dua komponen dengan fungsi sama. | Tidak ada pengecualian. |

---

## 3. Daftar Periksa Pull Request (PR Checklist)

Setiap pengembang maupun agen AI yang mengajukan perubahan UI wajib mematuhi checklist berikut sebelum PR di-merge:
- [ ] Tidak ada penulisan tag HTML mentah (`<button>`, `<input>`, `<select>`) di halaman fitur baru.
- [ ] Seluruh tombol aksi tabel menggunakan `<Button size="icon" className="size-8 rounded-lg">`.
- [ ] Seluruh input nominal angka menggunakan `<NumberInput>` berstandar Indonesia (`id-ID`).
- [ ] Seluruh dialog konfirmasi hapus menggunakan `<ConfirmActionDialog>`.
- [ ] Seluruh header halaman menggunakan `<PageHeader>`.
- [ ] Seluruh tabel data dibungkus dalam kartu edge-to-edge dengan sel moneter memakai `<MonetaryCell>`.
- [ ] Tidak ada kode warna hex `#` yang ditulis manual di file komponen baru.
- [ ] Panjang baris file baru berada di bawah **400 baris kode**.
- [ ] Perintah `npm run typecheck` dan `npm test` lolos dengan 0 error.
