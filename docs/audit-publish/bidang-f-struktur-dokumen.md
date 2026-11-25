# Audit Kesiapan Publish Altcycles: Bidang F - Struktur Dokumen & Rencana Penggabungan (ID: DOC-xx)

Dokumen ini memetakan seluruh file dokumentasi yang ada di folder `docs/`, menganalisis tingkat tumpang tindih (*overlap*), serta merancang struktur folder baru yang bersih, mudah dinavigasi, dan mempertahankan seluruh informasi yang masih relevan.

---

## 1. Inventaris Dokumen Saat Ini di `docs/`

| Path Dokumen | Ukuran | Tanggal Terakhir | Kategori & Tujuan | Tingkat Overlap | Status Validitas |
| :--- | :---: | :---: | :--- | :---: | :--- |
| `docs/ACCOUNTING_MAPPING.md` | 2.96 KB | 2026-11-07 | Pemetaan akun akuntansi & COA | 20% (terkait standar dokumen) | **Masih Akurat** |
| `docs/ASSUMPTIONS.md` | 6.69 KB | 2026-11-07 | Asumsi bisnis, penomoran, termin | 30% | **Masih Akurat** |
| `docs/audit-dokumen.md` | 44.73 KB | 2026-11-14 | Audit mesin dokumen PDF A4 | 60% (tumpang tindih dgn standar-dokumen) | **Perlu Digabung** |
| `docs/audit-i18n.md` | 43.05 KB | 2026-11-18 | Audit i18n & terminologi bahasa | 70% (tumpang tindih dgn audit-i18n-full) | **Perlu Digabung** |
| `docs/audit-i18n-full.md` | 9.48 KB | 2026-11-18 | Audit pelengkap i18n | 80% (duplikat audit-i18n) | **Perlu Digabung** |
| `docs/audit-kode.md` | 55.46 KB | 2026-11-16 | Audit arsitektur & dependensi kode | 40% | **Perlu Diperbarui** |
| `docs/audit-layout.md` | 16.07 KB | 2026-11-15 | Audit layout desktop awal | 70% (tumpang tindih dgn temuan-layout) | **Perlu Digabung** |
| `docs/audit-loader.md` | 29.38 KB | 2026-11-24 | Audit konsistensi loader & transition | 30% | **Masih Akurat** |
| `docs/audit-pintasan-keyboard.md`| 22.30 KB | 2026-11-24 | Registrasi pintasan keyboard | 20% | **Masih Akurat** |
| `docs/standar-dokumen.md` | 33.08 KB | 2026-11-16 | Standar PDF & Lampiran Keuangan | 50% | **Sumber Kebenaran PDF** |
| `docs/temuan-13-item.md` | 66.54 KB | 2026-11-25 | Log temuan audit 13 item perbaikan | 40% | **Historis Aktif** |
| `docs/temuan-dashboard.md` | 61.62 KB | 2026-11-23 | Log perbaikan dashboard | 30% | **Historis Aktif** |
| `docs/temuan-i18n.md` | 13.92 KB | 2026-11-19 | Log temuan i18n per rute | 70% (tumpang tindih audit-i18n) | **Perlu Digabung** |
| `docs/temuan-layout.md` | 83.01 KB | 2026-11-19 | Log temuan layout tabel & dialog | 60% | **Perlu Digabung** |

---

## 2. Rencana Penggabungan Menjadi File Tematik Tunggal

Untuk mencegah fragmentasi informasi, diusulkan penggabungan dokumen berikut setelah rencana disetujui:

1. **Penggabungan Dokumen i18n (`docs/standards/i18n-standards.md`):**
   - Menggabungkan: `docs/audit-i18n.md`, `docs/audit-i18n-full.md`, dan `docs/temuan-i18n.md`.
   - Isi: Konvensi namespace i18n, kamus istilah baku (ID vs EN), aturan pencegahan teks literal, dan daftar kunci terstandar.

2. **Penggabungan Dokumen Layout & UI (`docs/design-system/layout-and-components.md`):**
   - Menggabungkan: `docs/audit-layout.md`, `docs/temuan-layout.md`, dan `docs/audit-loader.md`.
   - Isi: Spesifikasi kontainer halaman, standar tabel, modal dialog, kartu KPI, aturan anti-clipping dropdown, dan loader konsisten.

3. **Penggabungan Dokumen Standar Dokumen & PDF (`docs/standards/document-pdf-specs.md`):**
   - Menggabungkan: `docs/standar-dokumen.md`, `docs/audit-dokumen.md`, dan `docs/ACCOUNTING_MAPPING.md`.
   - Isi: Dimensi kertas A4, grid tata letak, margin, font header seragam 9.5pt, bebas tabrakan kotak batas, dan spesifikasi 9 laporan keuangan akuntansi.

---

## 3. Usulan Struktur Folder `docs/` Baru (Setelah Persetujuan)

```text
docs/
├── 00-index.md                     # Peta navigasi utama seluruh dokumentasi sistem
├── design-system/                  # Sumber kebenaran token, layout, dan aturan UI
│   ├── layout-and-components.md    # Standar header, kartu, tabel, dialog, dan tombol
│   ├── responsive-guidelines.md    # Aturan breakpoint, mobile drawer, scroll tabel
│   └── tokens-reference.md         # Token warna, spasi, radius, dan tipografi
├── standards/                      # Standar teknis modul
│   ├── document-pdf-specs.md       # Standar cetak PDF & ekspor Excel/CSV
│   ├── i18n-standards.md           # Kamus istilah resmi Bahasa Indonesia & English
│   └── keyboard-shortcuts.md       # Registrasi pintasan keyboard global & per rute
├── architecture/                   # Struktur kode, data, dan keamanan
│   ├── system-architecture.md      # Pembagian portal, RLS Supabase, dan data flows
│   └── database-assumptions.md     # Asumsi bisnis dan skema entitas
├── audits/                         # Catatan audit historis berlabel tanggal
│   ├── 2026-11-publish-audit/      # Folder audit kesiapan publish saat ini
│   └── audit-history.md            # Ringkasan riwayat audit sebelumnya
└── render-check/                   # Baseline visual dan output verifikasi render
    ├── baseline-1920/              # Tangkapan layar desktop 1920px
    ├── baseline-1440/              # Tangkapan layar desktop 1440px
    └── publish/                    # Hasil verifikasi regresi publish
```

> [!NOTE]
> Pemindahan dan penggabungan dokumen baru akan dilakukan pada paket khusus di Tahap 2 setelah diverifikasi tidak ada informasi hilang dan seluruh referensi tautan internal diperbarui.
