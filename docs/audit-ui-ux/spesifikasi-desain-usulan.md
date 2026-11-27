# Spesifikasi Desain Usulan: Arah "Fintech Premium Bersih" (Gaya Polestar)

Dokumen ini merupakan panduan spesifikasi baku antarmuka Altcycles yang memadukan keanggunan gaya monolitik arsitektural Polestar dengan kebutuhan ketat sistem administrasi keuangan perusahaan.

---

## 1. Filosofi & Karakter Visual Polestar
- **Ekstrem Bersih & Lapang (*Spacious*):** Setiap modul memiliki ruang bernapas yang cukup; pemisah informasi tidak mengandalkan warna latar bertumpuk melainkan garis rambut 1px yang tenang.
- **Monolitik Presisi:** Elemen kontrol (input, button, select, card) memiliki sudut presisi hampir tanpa lengkungan (*sharp micro-radius*), menciptakan kesan mesin finansial presisi tinggi.
- **Keluasan Kanvas Mobile:** Kanvas acuan 393 x 852 px diimplementasikan secara fleksibel menggunakan satuan relatif (`vw`, `clamp()`, `dvh`), dengan konten inti dibatasi padding lateral tepat 25px pada lebar 393px.

---

## 2. Palet Token Semantik Resmi Altcycles

Aplikasi **HANYA** menggunakan palet token semantik yang ada pada `src/index.css` tanpa penambahan warna baru:

| Peran Antarmuka | Token Semantik Light Mode | Token Semantik Dark Mode | Catatan Penggunaan |
| :--- | :---: | :---: | :--- |
| **Latar Kanvas Utama** | `--background` (`#F0F1F3`) | `--background` (`#090E19`) | Selalu mengikuti tema sistem aktif |
| **Permukaan Kartu / Sheet**| `--card` (`#FFFFFF`) | `--card` (`#121A2B`) | Permukaan modul data dan modal |
| **Garis Pemisah (1px)** | `--border` (`#D8DCE3`) | `--border` (`rgba(255,255,255,0.09)`)| Garis batas tipis 1px rendah kontras |
| **Teks Utama & Judul** | `--foreground` (`#2A2A2A`) | `--foreground` (`#F8FAFC`) | Teks kontras tinggi tajam |
| **Teks Sekunder & Keterangan**| `--muted-foreground` (`#616C82`) | `--muted-foreground` (`#A0ABBD`)| Subjudul, label form, keterangan KPI |
| **Ikon Minimalis Muted** | `--muted-foreground` | `--muted-foreground` | Seluruh ikon struktural dan tabel |
| **Aksi Utama (CTA)** | `--primary` (`#0B43C8`) | `--primary` (`#0B43C8`) | Tombol aksi primer, fokus cincin |
| **Status Sukses (Lunas)** | `--status-success-fg` (`#15803D`) | `--status-success-fg` (`#4ADE80`) | Badge lunas, realisasi anggaran |
| **Status Bahaya (Jatuh Tempo)**| `--status-danger-fg` (`#B91C1C`) | `--status-danger-fg` (`#F87171`) | Transaksi ditolak, jatuh tempo, error |

---

## 3. Matriks Baku Skala 6 Peran Tipografi

| No | Peran Tipografi | Ukuran Desktop | Ukuran Mobile | Bobot | Line Height | Letter Spacing | Tabular Numeral |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **Angka Saldo Besar** | `2.25rem - 3rem` (`36-48px`) | `clamp(1.75rem, 8.5vw, 2.5rem)` | `700` (Bold) | `leading-none` | `tracking-tight` | **Wajib** |
| **2** | **Angka Transaksi / Input** | `0.875rem - 1rem` (`14-16px`)| `1rem` (`16px`) | `600` (SemiBold)| `leading-tight`| `tracking-tight` | **Wajib** |
| **3** | **Judul Layar (H1)** | `1.75rem - 1.875rem` (`28-30px`)| `1.375rem - 1.5rem` (`22-24px`)| `700` (Bold) | `leading-tight`| `tracking-tight` | Tidak |
| **4** | **Judul Bagian (H2 / Section)**| `1.125rem - 1.25rem` (`18-20px`)| `1rem - 1.125rem` (`16-18px`)| `600` (SemiBold)| `leading-snug` | `tracking-normal`| Tidak |
| **5** | **Label Isi (Body Label)** | `0.8125rem - 0.875rem` (`13-14px`)| `0.8125rem - 0.875rem` | `500` / `600` | `leading-normal`| `tracking-normal`| Opsional |
| **6** | **Teks Sekunder / Muted** | `0.6875rem - 0.75rem` (`11-12px`)| `0.6875rem - 0.75rem` | `400` / `500` | `leading-normal`| `tracking-normal`| Tidak |

---

## 4. Skala Radius dan Spasi (Spacing System)

### 4.1. Radius Kontrol
- **Desktop Terkunci (Eksisting):** Card `rounded-2xl` (16px), Button/Input `rounded-xl` (12px), Pill `rounded-full`.
- **Usulan Polestar Baru (Berdampak Desktop, Perlu Keputusan):**
  - Card & Container: `rounded-[4px]` atau `rounded-xs` (2px)
  - Button & Control: `rounded-[3px]`
  - Badge & Tag: `rounded-none` atau `rounded-[2px]`

### 4.2. Spasi Vertikal & Horizontal
- **Spasi Antar-Seksi Halaman:** `gap-6` (24px)
- **Spasi Antar-Field Formulir:** `gap-4` (16px) hingga `gap-5` (20px)
- **Padding Kartu:** `p-5` atau `p-6` (20px - 24px) di desktop; `p-4` di mobile

---

## 5. Tata Letak Mobile Kanvas Acuan (393 x 852 px Fleksibel)

```text
+-------------------------------------------------------------+  y = 0
| [Safe Area Top: max(44px, env(safe-area-inset-top))]       |
+-------------------------------------------------------------+  y = 44px
| [Mobile App Bar / Header: Logo + Menu Hamburger]            |  h = 48px
+-------------------------------------------------------------+
|                                                             |
| <-- 25px --> [ Konten Kartu Saldo / KPI ] <-- 25px -->      |
|              Lebar Konten: 343px pada layar 393px           |
|              (calc(100vw - 50px))                           |
|                                                             |
| <-- 25px --> [ Tabel Transaksi / Stacked Cards ] <-- 25px -->|
|                                                             |
+-------------------------------------------------------------+
| [FAB / Aksi Cepat Mengambang dalam Jangkauan Jempol]        |  y = 760px
+-------------------------------------------------------------+
| [Safe Area Bottom: max(16px, env(safe-area-inset-bottom))] |  y = 852px
+-------------------------------------------------------------+
```

### Penjelasan Karakter Fleksibel:
1. **Bukan Lebar Tetap:** Tidak menggunakan `width: 343px` kaku. Kontainer menggunakan `w-full max-w-full px-[clamp(16px,6.36vw,25px)]` sehingga pada lebar 320px padding menyesuaikan ke 16px, dan pada 393px padding tepat 25px.
2. **Ketinggian Dinamis:** Menggunakan `min-h-dvh` (Dynamic Viewport Height) untuk mengantisipasi bilah alamat browser ponsel yang muncul dan hilang saat digulir.
3. **Safe Area:** Memastikan tombol aksi tidak terpotong oleh garis gesture home bar iPhone atau tombol navigasi sistem Android.
