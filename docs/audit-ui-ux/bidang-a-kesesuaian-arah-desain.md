# Bidang A: Kesesuaian dengan Arah Desain "Fintech Premium Bersih" (Gaya Polestar)

Dokumen ini mengevaluasi seluruh halaman dan komponen utama terhadap **7 Karakter Polestar**:
1. Sangat bersih & lapang (*spacious*)
2. Latar mengikuti tema sistem (gelap dan terang seimbang)
3. Angka KPI berukuran besar (*bold & prominent*)
4. Garis pemisah tipis 1px rendah kontras (*subtle 1px dividers*)
5. Elemen kontrol dengan sudut hampir tanpa rounded (*monolithic sharp/micro-radius*)
6. Ikon minimalis dengan warna lembut (*muted icons*)
7. Nuansa fintech premium tanpa dekorasi berlebih (tanpa bingkai tebal, tanpa gradien dekoratif, tanpa bayangan berat)

---

## Tabel Temuan Bidang A (ID: DS-xx)

| ID | Halaman / Komponen | Karakter Evaluasi | Kondisi Saat Ini | Standar Desain Polestar | Selisih (Gap) | Usulan Konkret | Berdampak ke Desktop? | Prioritas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **DS-01** | `Card` (`src/components/ui/card.tsx:11`) | Sudut Kontrol & Lapang | Memakai `rounded-2xl` (16px / 1rem) dan `shadow-2xs`. | Sudut hampir tidak ada rounded (2px/4px: `rounded-xs` atau `rounded-sm`), flat tanpa kurva gelembung. | Kurva 16px terasa "lembut/consumer SaaS", bukan "monolitik/fintech enterprise arsitektural". | Buat token khusus `--card-radius-desktop` dan opsi mobile `--card-radius-mobile`. | **Ya (Perlu Keputusan: Ya)** | P1 |
| **DS-02** | `Button` (`src/components/ui/button.tsx:8`) | Sudut Kontrol & Presisi | Memakai `rounded-xl` (12px / 0.75rem) untuk semua varian default, sm, lg. | Sudut tegas arsitektural: `rounded-[3px]` atau `rounded-sm` (4px). | Bentuk tombol membulat konvensional. | Terapkan varian `rounded-[4px]` atau `rounded-none` terkontrol via token. | **Ya (Perlu Keputusan: Ya)** | P1 |
| **DS-03** | `Input`, `Select`, `Textarea` (`src/components/ui/input.tsx`) | Sudut Kontrol | Memakai `rounded-xl` dan border `border-input`. | Sudut presisi `rounded-xs` (2px) atau `rounded-[3px]`, border tipis 1px `border-border/60`. | Input membulat tinggi. | Standarisasi radius kontrol ke token micro-radius. | **Ya (Perlu Keputusan: Ya)** | P2 |
| **DS-04** | `LoginPage` (`src/features/auth/login-page.tsx:531`) | Bebas Gradien Dekoratif | Terdapat `bg-gradient-to-t from-black/75` dan `shadow-2xl`. | Bidang datar murni (*flat plane*) dengan latar tema aktif dan garis pemisah 1px. | Gradien dekoratif hitam gelap di atas gambar branding. | Hapus overlay gradien tebal, ganti dengan filter backdrop blur tipis atau solid tint datar. | **Ya (Perlu Keputusan: Ya)** | P2 |
| **DS-05** | `DashboardKpiCard` (`src/components/shared/dashboard-kpi-card.tsx:155`) | Angka KPI Besar & Grid | Angka menggunakan `text-xl sm:text-2xl`, ukuran proporsional kartu standar. | Angka KPI sangat besar, dominan di layar (`text-3xl sm:text-4xl lg:text-5xl`), `tabular-nums`, spasi lapang. | Angka saldo belum menjadi jangkar visual utama (*visual anchor*). | Tingkatkan hierarki ukuran teks angka KPI dengan rumus clamp responsif. | **Ya (Perlu Keputusan: Ya)** | P1 |
| **DS-06** | `PortalShell` Header & Kontainer (`src/components/layout/portal-shell.tsx:434`) | Ritme Jarak & Garis Pemisah | Shell memakai `px-4 md:px-6 py-6`, kartu memakai `border-border/80`. | Padding kanvas lapang, pemisah 1px warna token rendah kontras (`border-border/50`), margin rapi pada grid 8px. | Border sedikit terlalu tebal secara visual di beberapa monitor kontras tinggi. | Gunakan token pemisah tipis `border-border/40` di mode gelap dan terang. | **Tidak** | P3 |
| **DS-07** | Ikon Navigasi & Tabel (`src/components/layout/shell-sidebar.tsx:101`) | Ikon Minimalis Muted | Beberapa ikon memakai aksen `text-primary` penuh atau gradien `from-white/30`. | Seluruh ikon netral memakai `text-muted-foreground`, hanya ikon status transaksi yang memakai warna semantik. | Ikon UI terkadang mendominasi teks label. | Standarisasi seluruh ikon struktural ke warna muted `text-muted-foreground/80`. | **Tidak** | P2 |
| **DS-08** | Bayangan Elemen Mengambang (`src/components/navigation/command-palette-dialog.tsx:276`) | Tanpa Bayangan Berat | Memakai `shadow-2xl` tebal pada dialog popover. | Mengandalkan border 1px presisi dan backdrop redup tanpa bayangan tebal menyebar. | Bayangan menyebar terlalu jauh ala material design. | Ubah `shadow-2xl` menjadi border presisi `border border-border/80 shadow-xs`. | **Ya (Perlu Keputusan: Ya)** | P2 |

---

## Catatan Aturan Keras & Rekomendasi Desktop Freeze

> [!IMPORTANT]
> **Aturan Keras Desktop:** Perubahan radius kontrol (`rounded-xl` / `rounded-2xl` menjadi sudut tegas hampir tanpa rounded `rounded-xs` / `rounded-sm`) dan penghapusan bayangan pada dialog desktop secara langsung **mengubah tampilan desktop ($\ge 1024$px)** yang saat ini telah dikunci (*Desktop Freeze Rule*).
> 
> Sesuai instruksi pengguna, perubahan ini **TIDAK DIAPLIKASIKAN OTOMATIS**. Usulan ini didokumentasikan di sini dan dialokasikan ke **Paket 6 (Opsional Desktop Polestar)** dengan status: **"Perlu Keputusanku: YA"**.
