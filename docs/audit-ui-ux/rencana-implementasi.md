# Rencana Implementasi Bertahap (rencana-implementasi.md)

Dokumen ini memetakan seluruh rencana eksekusi audit UI/UX ke dalam **paket-paket berurutan dari risiko terendah hingga tertinggi**. Setiap paket memiliki cakupan file yang jelas, metode pembuktian (verifikasi otomatis), penilaian risiko, prosedur rollback, dan status keputusan desktop.

---

## Aturan Eksekusi (Masa Depan setelah Persetujuan)
1. **Satu Commit per Paket:** Setiap paket kecil dieksekusi secara terisolasi dengan pesan commit konvensional.
2. **Cek `git diff --stat`:** Setiap commit wajib diverifikasi perubahannya agar tidak menyentuh file di luar rencana.
3. **Desktop Freeze:** Tidak ada perubahan visual pada viewport desktop $\ge 1024$px tanpa persetujuan eksplisit.
4. **Laporan Perubahan:** Format tabel: `file | jenis perubahan | alasan | ID temuan`.

---

## 1. Rincian Paket Implementasi

### Paket 1: Penguncian Baseline Visual Desktop & Guard Test Otomatis (Risiko Terendah)
- **ID Terkait:** MB-04, DOC-03
- **Tujuan:** Membuat snapshot baseline visual 5 resolusi desktop (1024, 1280, 1366, 1440, 1920) dan mengaktifkan test guard regresi desktop.
- **Daftar File yang Terkena:**
  - `tests/unit/desktop-freeze-guard.test.ts` (penambahan assertions)
  - `docs/render-check/layout-optimization/baseline/` (verifikasi snapshot)
- **Metode Pembuktian:** `npm run test tests/unit/desktop-freeze-guard.test.ts`
- **Tingkat Risiko:** Sangat Rendah (Tidak menyentuh kode aplikasi).
- **Rollback:** `git checkout HEAD -- tests/unit/`
- **Berdampak ke Desktop:** **TIDAK (0% perubahan visual).**
- **Perlu Keputusan Pengguna:** **TIDAK.**

---

### Paket 2: Pembersihan Token Warna & Optimasi Font (Risiko Rendah)
- **ID Terkait:** TK-01, TK-02, TK-04
- **Tujuan:** Mengganti 48 warna hex hardcode di komponen interaktif dengan token semantik CSS, serta memasang font-display swap dan fallback sistem (SF Pro / Inter).
- **Daftar File yang Terkena:**
  - `src/index.css` (penyempurnaan font stack & border opacity dark mode)
  - `src/components/ui/date-picker.tsx`
  - `src/components/shared/dashboard-kpi-card.tsx`
  - `src/components/layout/shell-sidebar.tsx`
  - `src/components/shared/language-toggle.tsx`
- **Metode Pembuktian:** Uji kontras warna WCAG AA dan build check `npm run typecheck && npm run lint`.
- **Tingkat Risiko:** Rendah.
- **Rollback:** `git checkout HEAD -- src/components/`
- **Berdampak ke Desktop:** **TIDAK (Warna visual rendered identik dengan palet asli).**
- **Perlu Keputusan Pengguna:** **TIDAK.**

---

### Paket 3: Standarisasi Komponen Bersama & Touch Target 44px (Risiko Rendah)
- **ID Terkait:** UX-01, UX-04, AX-01, AX-05
- **Tujuan:** Memperluas area tap icon button baris tabel di layar sentuh menjadi 44px via pseudo-tap area (`after:absolute after:-inset-1.5`), serta menambahkan `aria-hidden="true"` pada ikon dekoratif.
- **Daftar File yang Terkena:**
  - `src/components/ui/button.tsx`
  - `src/components/ui/switch.tsx`
  - `src/components/shared/monetary-cell.tsx`
  - `src/components/shared/export-download-menu.tsx`
- **Metode Pembuktian:** Uji unit komponen React Testing Library & verifikasi area sentuh Puppeteer.
- **Tingkat Risiko:** Rendah.
- **Rollback:** `git checkout HEAD -- src/components/ui/`
- **Berdampak ke Desktop:** **TIDAK (Pseudo-tap target dinonaktifkan di viewport desktop `sm:after:hidden`).**
- **Perlu Keputusan Pengguna:** **TIDAK.**

---

### Paket 4: Standarisasi Layout Mobile 393px & Safe Area (Risiko Sedang)
- **ID Terkait:** MB-01, MB-02, TK-03
- **Tujuan:** Menetapkan padding lateral 25px pada kanvas 393px (`px-[clamp(16px,6.36vw,25px)]`), safe area atas minimal 44px dinamis, dan tipografi angka saldo clamp selebar layar.
- **Daftar File yang Terkena:**
  - `src/components/layout/portal-shell.tsx`
  - `src/components/shared/page-header.tsx`
  - `src/components/shared/dashboard-kpi-card.tsx`
- **Metode Pembuktian:** Visual regression script di resolusi 320, 360, 375, 390, 393, 412, 430 px.
- **Tingkat Risiko:** Sedang.
- **Rollback:** `git checkout HEAD -- src/components/layout/`
- **Berdampak ke Desktop:** **TIDAK (Menggunakan modifier `max-sm:` murni).**
- **Perlu Keputusan Pengguna:** **TIDAK.**

---

### Paket 5: Polesan Per Halaman & Mobile Bottom Sheet (Risiko Sedang)
- **ID Terkait:** UX-02, UX-03, FL-02, MB-03, MB-05
- **Tujuan:** Transformasi modal form kompleks menjadi bottom sheet responsif di mobile, ringkasan toolbar filter 1 baris, dan cue geser tabel.
- **Daftar File yang Terkena:**
  - `src/features/accounting/components/journal-entry-dialog.tsx`
  - `src/features/purchase-orders/po-page.tsx`
  - `src/features/accounting/journals-page.tsx`
  - `src/features/master-data/master-data-page.tsx`
- **Metode Pembuktian:** End-to-end interactive flow run via browser automation.
- **Tingkat Risiko:** Sedang.
- **Rollback:** `git checkout HEAD -- src/features/`
- **Berdampak ke Desktop:** **TIDAK (Perilaku modal desktop tetap dialog pop-in).**
- **Perlu Keputusan Pengguna:** **TIDAK.**

---

### Paket 6 (OPSIONAL): Transformasi Karakter Desktop Polestar Sudut Tegas (Risiko Tinggi)
- **ID Terkait:** DS-01, DS-02, DS-03, DS-04, DS-08
- **Tujuan:** Mengubah radius kartu dari `rounded-2xl` (16px) menjadi `rounded-[4px]`, tombol/input dari `rounded-xl` (12px) menjadi `rounded-[3px]`, serta menghapus bayangan tebal `shadow-2xl` di seluruh tampilan desktop.
- **Daftar File yang Terkena:**
  - `src/components/ui/card.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/input.tsx`
  - `src/components/navigation/command-palette-dialog.tsx`
  - `src/features/auth/login-page.tsx`
- **Metode Pembuktian:** Perbandingan visual side-by-side desktop sebelum/sesudah.
- **Tingkat Risiko:** Tinggi (Mengubah tampilan desktop yang sudah ada).
- **Rollback:** `git checkout HEAD -- src/components/ui/`
- **Berdampak ke Desktop:** **YA (PERUBAHAN VISUAL DESKTOP SIGNIFIKAN).**
- **Perlu Keputusan Pengguna:** **YA (Wajib konfirmasi eksplisit dari pengguna sebelum disentuh).**

---

## 2. Hal-Hal yang Belum Bisa Diverifikasi Otomatis (Uji Manual yang Dibutuhkan)
1. **Perangkat iOS Safari Fisik Nyata:** Emulasi Chromium Puppeteer tidak selalu merefleksikan 100% perilaku rendering WebKit pada transisi bar navigasi dinamis dan rendering font `SF Pro` native di mesin non-Apple.
2. **Keyboard Virtual Ponsel:** Penyesuaian tinggi viewport (`dvh` / `interactive-widget=resizes-content`) saat keyboard virtual muncul perlu diverifikasi manual pada perangkat Android & iPhone fisik.
3. **Font SF Pro Display/Text Native:** Pada mesin pengujian berbasis Windows/Linux, sistem akan memuat fallback `Inter` atau `Montserrat` karena lisensi font Apple dibatasi pada ekosistem Apple.
