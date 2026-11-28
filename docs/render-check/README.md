# Panduan Indeks & Navigasi Hasil Verifikasi Render Antarmuka (`docs/render-check/README.md`)

Direktori ini berisi seluruh rekaman tangkapan layar visual (*screenshot*), baseline referensi, dan artefak verifikasi regresi piksel untuk aplikasi **Altcycles** (Sistem ERP Keuangan & Akuntansi PT Altvira).

---

## 1. Tujuan Direktori

Visual testing harness di `docs/render-check/` menjamin:
1. **Zero Visual Regression:** Perubahan refactor, standarisasi komponen UI shadcn, maupun modularisasi file kode panjang tidak mengubah tata letak antarmuka sebesar 1 piksel pun (*pixel-identical*).
2. **Kesesuaian Desain Multiviewport:** Antarmuka diverifikasi secara otomatis pada 5 viewport desktop standar (1024×768, 1280×800, 1366×768, 1440×900, 1920×1080) serta perangkat mobile (320px, 375px, 425px) dan tablet (768px).
3. **Dokumentasi Audit Sebelum & Sesudah (*Before & After*):** Menyediakan bukti visual objektif untuk setiap gelombang migrasi komponen.

---

## 2. Struktur Subdirektori & Kategori Tangkapan Layar

| Subdirektori | Jumlah File | Deskripsi & Kegunaan |
| :--- | :---: | :--- |
| **`komponen/`** | 10 file | **Baseline Resmi Standarisasi UI (Paket 1):** 10 tangkapan layar halaman representatif sebelum dimulainya standarisasi komponen (`01-login.png` s/d `10-user-pembayaran.png`). |
| **`before/`** | 28 file | Tangkapan layar seluruh halaman portal sebelum refactor besar UI/UX, mobile drawer, dan perbaikan flexbox. |
| **`after/`** | 181 file | Tangkapan layar resolusi penuh hasil verifikasi pasca-implementasi lintas portal, viewport desktop, tablet, dan modal dialog. |
| **`dashboard/`** | 3 file | Verifikasi render visual kartu KPI, grafik keuangan, dan widget dashboard admin & user. |
| **`journals/`** | 3 file | Verifikasi render tabel jurnal umum, baris debit/kredit, filter akun, dan pagination akuntansi. |
| **`loader/`** | 4 file | Tangkapan layar pengujian transisi state loading, spinner tombol, dan layout skeleton halaman. |
| **`mobile-drawer/`** | 1 file | Verifikasi drawer navigasi mobile responsif dan tombol buka/tutup menu. |
| **`mobile-header-check/`** | 3 file | Pengujian alignment header navigasi mobile dan profil user pada layar kecil. |
| **`ui-ux/`** | 5 file | Verifikasi tampilan formulir pengaturan profil, modal konfirmasi, dan status badge. |
| **Root Image Artifacts** | 3 file | `admin-persetujuan-check.png`, `sidebar_crop.png`, `updated_sidebar_crop.png` (analisis audit celah sidebar). |

---

## 3. Skrip Verifikasi & Cara Menjalankan

Seluruh tangkapan layar dihasilkan secara otomatis menggunakan Puppeteer headless browser melalui skrip Node.js di folder `scripts/`:

### A. Verifikasi Baseline Paritas Piksel (`verify-pixel-parity.mjs`)
Membandingkan tangkapan layar halaman terkini dengan baseline di `docs/render-check/komponen/` menggunakan perbandingan buffer piksel:
```bash
node scripts/verify-pixel-parity.mjs
```

### B. Verifikasi Paritas Desktop Multiviewport (`verify-desktop-parity-multivp.mjs`)
Menjalankan pengujian render otomatis pada 5 resolusi layar desktop:
```bash
node scripts/verify-desktop-parity-multivp.mjs
```
Resolusi yang diuji:
- **1920 × 1080** (Full HD Desktop)
- **1440 × 900** (MacBook Pro / Widescreen Laptop)
- **1366 × 768** (Laptop Standar Umum Indonesia)
- **1280 × 800** (Laptop Ringkas / Tablet Landscape)
- **1024 × 768** (Desktop Minimum / iPad Pro Portrait)

### C. Verifikasi Tampilan Mobile & Drawer (`capture-dashboard-mobile-check.mjs`)
Mengambil screenshot khusus tampilan mobile (375×667 dan 414×896) untuk memeriksa keterpotongan teks, kartu KPI bertumpuk rapi, dan tombol aksi tabel responsif.

---

## 4. Kebijakan Retensi Berkas

Sesuai **Bidang F Aturan Audit (Protected Assets)**:
- Berkas di dalam `docs/render-check/` **TIDAK BOLEH DIHAPUS SEMBARANGAN** karena merupakan artefak visual historis untuk audit kualitas dan bukti non-regresi sistem.
- Folder kosong sementara (`login/`, `mobile/`, `publish/`, `redesign/`, `layout-optimization/`, `flexbox/`) disiapkan untuk alur kerja verifikasi audit bertahap berikutnya dan tidak membebani ukuran repositori git.
