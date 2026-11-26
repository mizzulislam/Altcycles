# Panduan Responsif & Breakpoint Token Altcycles (`docs/design-system/responsive-guidelines.md`)

Dokumen ini mendokumentasikan standar aturan tata letak responsif, breakpoint token, serta arsitektur **aditif mutlak** yang menjamin tampilan desktop (PC >=1024px) **tidak bergeser satu piksel pun**.

---

## 1. Empat Zona Breakpoint Terstandar

Altcycles menggunakan token breakpoint bawaan Tailwind CSS v4 dengan pemetaan zona fungsional:

| Zona Perangkat | Rentang Viewport | Prefix Tailwind | Perilaku Antarmuka |
| :--- | :---: | :---: | :--- |
| **Mobile Kecil** | `< 375px` | Default (`< sm`) | Tombol full-width bertumpuk, padding `p-4`, icon KPI `size-10`, font input `16px` (anti-zoom). |
| **Mobile Standar** | `375px – 639px` | Default (`< sm`) | Drawer sidebar mobile, header top bar ringkas, tabel dengan scroll hint fade kanan. |
| **Tablet Portrait** | `640px – 767px` | `sm:` | Tata letak mulai melebar, tombol aksi sejajar di kanan, padding `sm:p-6`, font input `14px`. |
| **Tablet Landscape** | `768px – 1023px` | `md:` | Sidebar desktop mulai aktif (`md:w-64`), top bar desktop mulai terlihat. |
| **Desktop Terkunci** | **>= 1024px** | `lg:`, `xl:`, `2xl:` | **Layout patokan resmi terkunci mutlak (1920, 1440, 1280, 1024). Dilarang diubah!** |

---

## 2. Aturan Aditif Mutlak (Desktop Freeze Rule)

1. **Dilarang Menghapus Kelas Desktop:** Setiap kelas desktop yang sudah ada (seperti `sm:p-6`, `lg:grid-cols-2`, `sm:flex-row`, `sm:justify-end`) wajib dipertahankan nilainya.
2. **Polesan Mobile Bersifat Override:** Perubahan hanya diterapkan pada kelas dasar (untuk mobile `< sm`) atau media query turun (`max-sm:`, `max-md:`).
3. **Anti Auto-Zoom Input:** Seluruh field input, select, dan textarea wajib memiliki kelas `text-base sm:text-sm` agar di peramban iPhone Safari dan Android Chrome tidak memicu zoom-in otomatis.
4. **Viewport Fit Cover:** Tag meta viewport wajib menyertakan `viewport-fit=cover` untuk mendukung area aman (*safe area insets*) pada perangkat berponi/notch dan bilah navigasi gestur.
5. **Ukuran Target Sentuh:** Tombol dan elemen interaktif di layar sentuh wajib memiliki area sentuh minimum 44×44px (menggunakan padding sentuh tak terlihat `after:absolute after:-inset-1.5` atau `touch-manipulation`).
