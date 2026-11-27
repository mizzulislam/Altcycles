# Bidang E: Mobile dan Responsivitas (ID: MB-xx)

Dokumen ini memvalidasi antarmuka Altcycles pada seluruh rentang viewport (320px hingga 430px, tablet 768px-1024px, dan desktop 1024px-1920px), menguji kepatuhan terhadap **Standar Mobile Acuan (393 x 852 px)**, serta mengonfirmasi perlindungan mutlak **Desktop Freeze Rule**.

---

## 1. Validasi Matriks Viewport

Pengujian kode dan analisis snapshot visual dilakukan pada matriks resolusi:
- **Mobile Sempit (320px - 360px):** iPhone SE 1st gen, Galaxy A series lama.
- **Mobile Standar Acuan (375px - 393px):** iPhone 12/13/14/15/16, Google Pixel.
- **Mobile Lebar (412px - 430px):** Galaxy S24 Ultra, iPhone Pro Max.
- **Tablet (768px - 834px):** iPad Mini, iPad Air portrait.
- **Desktop Terkunci (1024px, 1280px, 1366px, 1440px, 1920px):** MacBook Air, Laptop FHD, Monitor Ultrawide.

---

## 2. Tabel Temuan Bidang E (ID: MB-xx)

| ID | Komponen / Area | Kondisi Saat Ini | Standar Mobile Acuan (393x852) | Selisih (Gap) | Rekomendasi Solusi | Berdampak ke Desktop? | Prioritas |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **MB-01** | Kontainer Halaman Mobile (`PortalShell`) | Memakai `px-3 sm:px-4 md:px-6` (padding horizontal 12-16px). | Padding kiri/kanan tepat 25px pada kanvas 393px (`px-[25px]` / lebar kartu 343px fleksibel). | Tampilan terasa terlalu mepet ke tepi layar ponsel. | Terapkan padding responsif fleksibel: `max-sm:px-[clamp(16px,6.36vw,25px)]` (mencapai 25px pada 393px). | **Tidak** | P1 |
| **MB-02** | Safe Area Atas & Bawah (`PortalShell`) | Padding atas menggunakan nilai tetap `pt-2` atau `pt-3`. | Safe area atas minimal 44px acuan (`max(44px, env(safe-area-inset-top))`) dan gesture bar bawah. | Header mobile berisiko menabrak Dynamic Island atau status bar baterai. | Pasang `pt-[max(44px,env(safe-area-inset-top))]` dan `pb-[max(16px,env(safe-area-inset-bottom))]` di mobile shell. | **Tidak** | P1 |
| **MB-03** | Tabel Akuntansi & Transaksi | Seluruh kolom dipaksa muat dengan overflow horizontal default. | Tabel mobile memiliki controlled horizontal scroll dengan visual fade atau bertransformasi ke stacked cards. | Di 360-390px, pengguna tidak menyadari tabel bisa digeser ke kanan jika kolom terpotong rata. | Pasang indikator geser tipis atau ubah tampilan ringkasan transaksi menjadi stacked card list di mobile. | **Tidak** | P2 |
| **MB-04** | FAB (Floating Action Button) Melayang | Tombol Catat Transaksi mengambang di pojok kanan bawah (`bottom-4 right-4`). | Tombol CTA dalam jangkauan jempol natural (*thumb zone*), tidak menutupi tombol paginasi tabel. | FAB terkadang menutupi baris data terakhir pada tabel jika list panjang. | Tambahkan padding bawah ekstra `pb-20` pada scroll kontainer bila FAB aktif. | **Tidak** | P2 |
| **MB-05** | Dialog Form Menjadi Terlalu Tinggi | Dialog `sm:max-w-3xl` ditampilkan sebagai modal pop-in di tengah layar mobile. | Dialog form kompleks berubah menjadi full-height bottom sheet dengan sticky header & footer. | Pengguna mobile kesulitan menjangkau tombol aksi di atas/bawah dialog. | Tambahkan variant drawer/sheet untuk mobile viewport `< 640px`. | **Tidak** | P2 |

---

## 3. Bukti Desktop Terkunci (Desktop Freeze Guarantee)

> [!NOTE]
> Seluruh penyesuaian mobile pada Bidang E dirancang secara **aditif murni** menggunakan modifier breakpoint Tailwind (`max-sm:` atau media query `@media (max-width: 639px)`).
> 
> Tampilan desktop pada resolusi **$\ge 1024$px** (1024, 1280, 1366, 1440, 1920) diproteksi oleh:
> 1. Snapshot baseline visual di `docs/render-check/layout-optimization/baseline/`
> 2. Uji unit guard otomatis `tests/unit/desktop-freeze-guard.test.ts`
> 3. Skrip verifikasi pixel parity `scripts/verify-desktop-parity-multivp.mjs` yang memastikan $0$ pixel shift pada layar PC.
