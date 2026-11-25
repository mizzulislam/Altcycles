# Audit Kesiapan Publish Altcycles: Bidang D - File, Dokumen, dan Aset Tidak Terpakai (ID: CL-xx)

Dokumen ini memuat temuan analisis kebersihan codebase: kandidat file tak terpakai, aset gambar/media yang tidak dirujuk, dependensi yang tidak digunakan, serta penilaian tingkat keyakinan (tinggi/sedang/rendah) dan risiko penghapusan.

---

## 1. Prinsip Utama Penghapusan (Hard Rule)
> [!WARNING]
> **DILARANG MENGHAPUS FILE PADA TAHAP AUDIT.**
> File hanya akan dihapus setelah rencana implementasi disetujui, dalam commit terpisah per kategori, dan HANYA untuk kandidat dengan **Tingkat Keyakinan TINGGI**. File yang ragu-ragu dimasukkan ke dalam daftar "Perlu Keputusan User".
> Berkas patokan uji visual (`docs/render-check/` yang menjadi baseline) dan skrip migrasi database TIDAK BOLEH dihapus.

---

## 2. Tabel Temuan Kandidat Bersih-Bersih (Bidang D)

| ID | Path File / Aset | Jenis | Alasan & Bukti Analisis | Tingkat Keyakinan | Risiko Penghapusan | Perlu Perubahan Skema | Perlu Keputusan User |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **CL-01** | `docs/archive/staffinc-notes-payment-detail.png` (100.5 KB) | Aset Gambar | Tangkapan layar referensi lama dari 15 Nov 2026 di folder arsip. Tidak diimpor oleh modul mana pun di `src/`, tidak dirujuk oleh dokumen aktif. | **Tinggi** | Sangat Rendah | Tidak | **Ya** (Konfirmasi pembersihan arsip) |
| **CL-02** | `docs/archive/bootstrap-super-admin.sql` (0.74 KB) | Skrip SQL | Skrip inisialisasi awal manual yang sudah digantikan sepenuhnya oleh migrasi Supabase resmi di `supabase/migrations/`. | **Tinggi** | Sangat Rendah | Tidak | **Ya** (Konfirmasi pembersihan arsip) |
| **CL-03** | `docs/audit-inventory.json` (5.94 KB) | File Data Audit | Hasil inventarisasi audit lama bertanggal 18 Nov 2026. Merupakan output sementara, bukan konfigurasi sistem. | **Tinggi** | Sangat Rendah | Tidak | **Ya** (Bisa dipindahkan/diarsipkan) |
| **CL-04** | Import tak terpakai `act` dan `waitFor` di `tests/unit/group-d-performance-optimizations.test.tsx:3` | Kode Sumber Test | Mengakibatkan error ESLint `Allowed unused vars must match /^_/u` saat `npm run lint`. | **Tinggi** | Nol | Tidak | Tidak |
| **CL-05** | Variabel tak terpakai `Button` dan `ROLE_LABELS` di `src/features/profile/profile-overview-page.tsx:13, 27` | Kode Sumber Fitur | Mengakibatkan error ESLint `@typescript-eslint/no-unused-vars` dan kegagalan `npm run build`. | **Tinggi** | Nol | Tidak | Tidak |
| **CL-06** | File duplikat catatan audit di root `docs/` (`audit-dokumen.md`, `audit-i18n.md`, `audit-i18n-full.md`, `audit-kode.md`, `audit-layout.md`, `audit-loader.md`, `audit-pintasan-keyboard.md`, `temuan-*.md`) | Dokumentasi | Terdapat 8+ file audit terpisah yang dibuat pada rentang tanggal berbeda (14-25 Nov 2026) dengan konten saling tumpang tindih. | **Sedang** | Rendah (bila digabung terstruktur) | Tidak | **Ya** (Dikelola di Bidang F) |
| **CL-07** | Dependensi tak terpakai potensial di `package.json` (Perlu audit mendalam bersama depcheck) | Dependensi Node | Paket dev seperti `@types/node` vs browser target, serta plugin eslint ganda yang mungkin overlap. | **Rendah** | Sedang (dilarang ubah lockfile tanpa izin) | Tidak | **Ya** (Hanya dicatat, tidak diubah) |

---

## 3. Estimasi Pengurangan Ukuran Repositori
- Pembersihan file gambar arsip dan artefak audit usang diperkirakan menghemat sekitar **~120 KB - 500 KB** pada repositori git.
- Yang lebih signifikan adalah eliminasi error linting dan build yang memblokir proses CI/CD.
