# Audit Kesiapan Publish Altcycles: Bidang E - File Kode Terlalu Panjang & Arsitektur Pemecahan (ID: SP-xx)

Dokumen ini memetakan seluruh file kode sumber di `src/` yang memiliki ukuran lebih dari 400 baris (prioritas tinggi di atas 800 baris), analisis tanggung jawab yang tercampur (*god files*), serta rencana pemecahan konkret menurut modul dan tanggung jawab fungsional.

---

## 1. Standar Batas Ukuran File (Target Arsitektur)
- **Target Ideal:** Maksimal **~300 - 400 baris** per file sumber.
- **Pengecualian Terdaftar:**
  - `src/types/database.types.ts` (1,354 baris) — skema TypeScript yang digenerate oleh Supabase CLI.
  - `src/lib/pdf/pdf-engine.ts` (2,976 baris) — mesin tata letak PDF presisi tinggi (dikelola modular per generator dokumen).
- **Aturan Pemecahan:**
  - Pecah berdasarkan **tanggung jawab** (Komponen Presentasional, Dialog/Modal, Hook Logika, Konstanta/Tipe, Servis Data), bukan sekadar memotong baris secara sembarang.
  - Perilaku dan tampilan **TIDAK BOLEH BERUBAH** sedikit pun.
  - Setiap pemecahan dieksekusi dalam **satu commit terpisah per file**, disertai verifikasi test dan build.

---

## 2. Tabel File Panjang Prioritas Tinggi (> 800 Baris)

| ID | Path File | Baris | Tanggung Jawab yang Tercampur | Rekomendasi Pemecahan Konkret | Dependensi Terpengaruh | Risiko | Perlu Keputusan User |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **SP-01** | `src/features/master-data/coa-accounts-page.tsx` | 1,588 | Manajemen Chart of Accounts, modal tambah/edit akun, filter hierarki tipe akun, kalkulasi saldo, ekspor tabel. | Pecah menjadi:<br>1. `coa-page-container.tsx` (state & toolbar)<br>2. `coa-table.tsx` (tabel akun & hierarki)<br>3. `coa-form-dialog.tsx` (modal tambah/edit)<br>4. `use-coa-accounts.ts` (hook fetch & mutasi) | `accounting-page.tsx`, `journals-page.tsx` | Rendah | **Ya** (Urutan pemecahan) |
| **SP-02** | `src/features/invoicing/invoicing-page.tsx` | 1,307 | Penagihan klien, kalkulasi termin proyek, modal pembuatan invoice, validasi pajak PPN/PPh, status pembayaran, ekspor. | Pecah menjadi:<br>1. `invoicing-page-container.tsx`<br>2. `invoicing-table.tsx`<br>3. `invoice-create-dialog.tsx`<br>4. `use-invoicing-data.ts` | Navigasi Admin, Ringkasan Dashboard | Rendah | **Ya** (Urutan pemecahan) |
| **SP-03** | `src/features/system-config/company-profile-page.tsx` | 1,301 | Profil badan usaha, data rekening bank, status PKP & perpajakan, upload logo lokal/GDrive, modal tanda tangan digital, kunci buku. | Pecah menjadi:<br>1. `company-profile-tab-general.tsx`<br>2. `company-profile-tab-bank.tsx`<br>3. `company-profile-tab-tax.tsx`<br>4. `use-company-profile.ts` | Navigasi Super Admin, PDF Generator | Sedang | **Ya** (Urutan pemecahan) |
| **SP-04** | `src/features/profile/profile-settings-page.tsx` | 1,291 | Pengaturan akun pribadi, ganti password, data PTKP/pajak karyawan, rekening pencairan pribadi, upload foto profil lokal/GDrive. | Pecah menjadi:<br>1. `profile-info-form.tsx`<br>2. `profile-security-form.tsx`<br>3. `profile-tax-bank-form.tsx`<br>4. `use-profile-settings.ts` | Navigasi Pengguna & Super Admin | Rendah | **Ya** (Urutan pemecahan) |
| **SP-05** | `src/features/buyer-portal/buyer-portal-page.tsx` | 1,250 | Halaman portal eksternal klien, tinjauan invoice & kuitansi, riwayat pembayaran, download lampiran PDF, verifikasi token. | Pecah menjadi:<br>1. `buyer-portal-container.tsx`<br>2. `buyer-invoice-card.tsx`<br>3. `buyer-receipt-list.tsx` | Route Buyer Portal Publik | Rendah | **Ya** (Urutan pemecahan) |
| **SP-06** | `src/features/purchase-orders/po-page.tsx` | 1,215 | Daftar PO internal & vendor, modal buat PO baru, approval status, link termin pembayaran, kalkulasi total biaya. | Pecah menjadi:<br>1. `po-table.tsx`<br>2. `po-create-dialog.tsx`<br>3. `po-status-badge.tsx`<br>4. `use-po-data.ts` | Navigasi Admin & User | Rendah | **Ya** (Urutan pemecahan) |
| **SP-07** | `src/features/accounting/journals-page.tsx` | 1,181 | Jurnal umum akuntansi, filter debit/kredit seimbang, validasi balancing, pencatatan otomatis & manual, pagination. | Pecah menjadi:<br>1. `journals-table.tsx`<br>2. `manual-journal-dialog.tsx`<br>3. `journals-filter-bar.tsx`<br>4. `use-journals.ts` | `accounting-page.tsx` | Sedang | **Ya** (Urutan pemecahan) |
| **SP-08** | `src/features/system-config/login-media-page.tsx` | 1,159 | Pengaturan background login, rotasi quote motivasi, media upload, preview simulasi login. | Pecah menjadi:<br>1. `media-gallery-grid.tsx`<br>2. `quote-editor-tab.tsx`<br>3. `media-upload-dialog.tsx` | `login-page.tsx`, Super Admin | Rendah | **Ya** (Urutan pemecahan) |
| **SP-09** | `src/lib/navigation-shortcuts-registry.ts` | 1,132 | Peta registrasi pintasan keyboard untuk seluruh 27+ halaman di 3 portal. | Dapat dibagi menjadi registry modular per portal (`shortcuts-super-admin.ts`, `shortcuts-admin.ts`, `shortcuts-user.ts`) lalu digabungkan di index. | Command Palette, Shortcuts Sheet | Rendah | **Ya** (Urutan pemecahan) |
| **SP-10** | `src/lib/i18n.tsx` | 1,127 | Inisialisasi i18next, provider konteks bahasa, fallback dictionary, formatter tanggal/angka. | Pisahkan kamus fallback internal ke file terpisah dan rapikan helper format. | Seluruh modul sistem | Sedang | **Ya** (Urutan pemecahan) |

---

## 3. Strategi Pelaksanaan Bertahap
1. **Fase A (Risiko Rendah):** Pemecahan komponen form modal (`coa-form-dialog.tsx`, `po-create-dialog.tsx`) tanpa mengubah tipe interface luar.
2. **Fase B (Risiko Sedang):** Pemecahan halaman profil dan pengaturan pengguna (`company-profile-page.tsx`, `profile-settings-page.tsx`).
3. **Fase C (Modul Inti):** Pemecahan modul akuntansi dan jurnal (`journals-page.tsx`, `invoicing-page.tsx`).
