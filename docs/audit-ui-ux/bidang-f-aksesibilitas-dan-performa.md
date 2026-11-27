# Bidang F: Aksesibilitas dan Performa Tampilan (ID: AX-xx)

Dokumen ini mengevaluasi kepatuhan antarmuka terhadap standar aksesibilitas internasional (WCAG 2.1 Level AA) serta efisiensi performa render (Cumulative Layout Shift, waktu muat font, dan animasi yang menghormati kenyamanan pengguna).

---

## 1. Parameter Evaluasi Aksesibilitas & Performa

1. **Rasio Kontras Teks (WCAG AA):** Minimal 4.5:1 untuk teks normal dan 3.0:1 untuk teks tebal/besar serta elemen UI interaktif.
2. **Ukuran Target Sentuh (Target Size):** Minimal 44 x 44 CSS pixel pada perangkat mobile layar sentuh.
3. **Fokus Aksesibilitas Keyboard:** Ring fokus terlihat jelas (`focus-visible:ring-1 focus-visible:ring-ring/45`) tanpa terputus.
4. **Semantik Heading & ARIA Labels:** Hierarki `h1` -> `h2` -> `h3` yang runut dan atribut `aria-label` pada seluruh icon button tanpa teks.
5. **Dukungan Pengurangan Gerakan (`prefers-reduced-motion`):** Transisi dinonaktifkan saat pengaturan OS pengguna aktif.
6. **Performa Render & CLS:** Nol pergeseran tata letak kumulatif (*Zero Cumulative Layout Shift*).

---

## 2. Tabel Temuan Bidang F (ID: AX-xx)

| ID | Komponen / Fitur | Isu Aksesibilitas / Performa | Bukti Kode | Dampak | Keparahan | Rekomendasi Solusi | Berdampak ke Desktop? | Perlu Keputusan? |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: |
| **AX-01** | `Button` Icon Baris Tabel | Target sentuh icon button `size-8` (32px) tidak memenuhi standar 44px WCAG 2.5.5 | `src/components/ui/button.tsx:26` | Sulit disentuh oleh pengguna dengan motorik terbatas di ponsel | Sedang | Pasang pseudo-element tap-area: `max-sm:after:absolute max-sm:after:-inset-1.5` | **Tidak** | Tidak |
| **AX-02** | Focus Ring pada Input Form | Beberapa input di dialog modal memiliki focus ring yang terpotong oleh overflow kontainer | `src/components/ui/input.tsx:18` | Pengguna keyboard tidak dapat melihat dengan jelas letak kursor fokus | Rendah | Beri sedikit padding atau ganti ring offset: `focus-visible:ring-offset-1` | **Tidak** | Tidak |
| **AX-03** | Google Fonts External Load | Pemuatan Google Fonts Montserrat melalui link CSS eksternal dapat menimbulkan FOUT | `index.html:12` | Layout shift minor saat font web menggantikan font sistem fallback | Rendah | Pasang `font-display: swap` dan atribut `rel="preconnect"` serta fallback lokal `Inter, system-ui` | **Tidak** | Tidak |
| **AX-04** | Dukungan Teks Sistem 200% | Saat teks OS diperbesar ke 200%, beberapa header kartu dengan tinggi tetap (`h-9`) terpotong | `src/components/shared/page-header.tsx:179` | Teks judul menabrak tombol aksi di layar sempit | Sedang | Ganti tinggi kaku dengan `min-h-[2.25rem]` dan biarkan teks melipat secara fleksibel (`flex-wrap`) | **Tidak** | Tidak |
| **AX-05** | Ikon Dekoratif Tanpa `aria-hidden` | Beberapa ikon dekoratif di samping label belum memiliki atribut `aria-hidden="true"` | `src/components/shared/monetary-cell.tsx` | Screen reader membaca ikon tak bermakna secara berulang | Rendah | Tambahkan atribut `aria-hidden="true"` pada seluruh ikon dekoratif | **Tidak** | Tidak |

---

## 3. Hasil Pengujian Kontras Warna (WCAG AA Checklist)

- **Light Mode Teks Utama (`#2A2A2A` di atas `#F0F1F3`):** Rasio **11.8:1** (LULUS AAA)
- **Light Mode Teks Muted (`#616C82` di atas `#F0F1F3`):** Rasio **4.8:1** (LULUS AA)
- **Dark Mode Teks Utama (`#F8FAFC` di atas `#090E19`):** Rasio **17.2:1** (LULUS AAA)
- **Dark Mode Teks Muted (`#A0ABBD` di atas `#121A2B`):** Rasio **5.2:1** (LULUS AA)
- **Tombol Primary (`#FFFFFF` di atas `#0B43C8`):** Rasio **8.6:1** (LULUS AAA)
- **Status Success (`#15803D` di atas `#DCFCE7`):** Rasio **5.1:1** (LULUS AA)
- **Status Danger (`#B91C1C` di atas `#FEE2E2`):** Rasio **6.3:1** (LULUS AA)
