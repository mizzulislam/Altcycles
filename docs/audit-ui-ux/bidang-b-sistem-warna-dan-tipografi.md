# Bidang B: Sistem Warna dan Tipografi

Dokumen ini mencakup inventarisasi warna (token semantik vs hardcode), analisis kontras WCAG AA, inventarisasi tipografi yang benar-benar digunakan di kode sumber, serta spesifikasi baku **Skala 6 Peran Tipografi**.

---

## 1. Inventarisasi Warna: Token Semantik vs Nilai Hardcode

### 1.1. Status Token Semantik Sistem (`src/index.css`)
- Token Latar: `--background` (`#F0F1F3` di light mode, `#090E19` di dark mode)
- Token Permukaan: `--card` (`#FFFFFF` di light mode, `#121A2B` di dark mode)
- Token Pemisah: `--border` (`#D8DCE3` di light mode, `rgba(255, 255, 255, 0.09)` di dark mode)
- Token Teks Utama: `--foreground` (`#2A2A2A` di light mode, `#F8FAFC` di dark mode)
- Token Teks Muted: `--muted-foreground` (`#616C82` di light mode, `#A0ABBD` di dark mode)
- Token Aksen Brand: `--primary` (`#0B43C8`), `--ring` (`#1FB1F2`)

### 1.2. Inventarisasi 48 Warna Hex Hardcode (Temuan Audit)
Ditemukan 48 warna hex hardcode di luar file PDF engine:
1. `#0F172A` (30 kemunculan, misal `src/components/ui/date-picker.tsx:468`): Mengabaikan dark mode semantik, wajib diganti ke `bg-card` / `text-foreground`.
2. `#0B43C8` (28 kemunculan, misal `src/components/layout/shell-sidebar.tsx:73`): Hardcode warna primer korporat, wajib diganti ke `text-primary` / `bg-primary`.
3. `#FFFFFF` (23 kemunculan, misal `src/components/shared/language-toggle.tsx:26`): Wajib diganti ke `bg-card` atau `text-primary-foreground`.
4. `#64748B` & `#94A3B8` (31 kemunculan pada cetak & preview akuntansi): Wajib dipetakan ke `text-muted-foreground`.
5. `#10B981` & `#F59E0B` & `#F43F5E` (30 kemunculan pada grafik/dashboard KPI): Hardcode warna status, wajib dipetakan ke token CSS `--status-success-fg`, `--status-warning-fg`, `--status-danger-fg`.

---

## 2. Tabel Temuan Bidang B (ID: TK-xx)

| ID | Deskripsi Temuan | Bukti Kode | Dampak | Keparahan | Rekomendasi Konkret | Usaha | Risiko | Berdampak ke Desktop? | Perlu Keputusan? |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **TK-01** | Penggunaan 48 warna hex hardcode di komponen interaktif | `src/components/ui/date-picker.tsx:468`, `src/components/shared/dashboard-kpi-card.tsx:31` | Mengabaikan tema gelap dan token sistem | Sedang | Refaktor nilai hex menjadi token CSS semantik (`bg-card`, `text-muted-foreground`, dll.) | 2 Hari | Rendah | **Tidak (Visual Identik)** | Tidak |
| **TK-02** | Font Montserrat Google Fonts dimuat tanpa optimasi preload & fallback SF Pro | `index.html:12`, `src/index.css:76` | Potensi FOUT, delay render first paint di perangkat mobile | Rendah | Konfigurasi font stack: `system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif` dengan `font-display: swap` | 1 Hari | Rendah | **Tidak** | Tidak |
| **TK-03** | Angka saldo besar belum memakai clamp responsif selebar layar mobile | `src/components/shared/dashboard-kpi-card.tsx:155` | Di mobile layar 393px angka terlihat biasa, tidak bergaya fintech premium Polestar | Sedang | Terapkan kelas utility `clamp-kpi`: `clamp(1.75rem, 8vw, 3rem)` dengan `tabular-nums tracking-tight` | 1 Hari | Rendah | **Tidak (Mobile aditif)** | Tidak |
| **TK-04** | Kontras teks muted di dark mode pada border sangat halus | `src/index.css:67` (`rgba(255, 255, 255, 0.09)`) | Rasio kontras garis border di layar non-OLED bisa kurang dari rasio keterlihatan 3:1 | Rendah | Sesuaikan opacity border dark mode menjadi `rgba(255, 255, 255, 0.12)` | 0.5 Hari | Rendah | **Tidak** | Tidak |

---

## 3. Matriks Baku Skala 6 Peran Tipografi (Usulan Skala Final)

| Peran Tipografi | Ukuran Desktop (px / rem) | Ukuran Mobile (px / rem) | Bobot (Weight) | Line Height | Letter Spacing | Token Warna | Tabular Numeral |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1. Angka Saldo Besar** | `36px - 48px` (`2.25 - 3rem`) | `clamp(28px, 8.5vw, 38px)` | `700` (Bold) | `1.1` (`leading-none`) | `-0.03em` (`tracking-tight`) | `text-foreground` | **Wajib (`tabular-nums`)** |
| **2. Angka Transaksi / Input** | `14px - 16px` (`0.875 - 1rem`) | `16px` (`1rem`) | `600` (SemiBold) | `1.25` (`leading-tight`) | `-0.01em` | `text-foreground` | **Wajib (`tabular-nums`)** |
| **3. Judul Layar (H1)** | `28px - 30px` (`1.75 - 1.875rem`)| `22px - 24px` (`1.375 - 1.5rem`)| `700` (Bold) | `1.2` (`leading-tight`) | `-0.025em` (`tracking-tight`) | `text-foreground` | Tidak |
| **4. Judul Bagian (Section Header / H2)**| `18px - 20px` (`1.125 - 1.25rem`)| `16px - 18px` (`1 - 1.125rem`) | `600` (SemiBold)| `1.3` (`leading-snug`) | `-0.02em` | `text-foreground` | Tidak |
| **5. Label Isi (Body Label / Table)** | `13px - 14px` (`0.8125 - 0.875rem`)| `13px - 14px` | `500` (Medium) / `600` | `1.4` (`leading-normal`) | `0em` (`tracking-normal`) | `text-foreground` | Opsional (data tabel) |
| **6. Teks Sekunder / Keterangan** | `11px - 12px` (`0.6875 - 0.75rem`)| `11px - 12px` | `400` / `500` | `1.4` (`leading-normal`) | `0em` | `text-muted-foreground` | Tidak |

*Catatan Input Mobile: Ukuran input pada perangkat layar sentuh wajib minimal 16px (1rem) untuk mencegah Safari iOS melakukan zoom otomatis saat field difokuskan.*
