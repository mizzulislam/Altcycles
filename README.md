# Altcycles — ERP Keuangan & Akuntansi Proyek Altvira

**Altcycles** adalah sistem administrasi keuangan dan pencatatan akuntansi berbasis web untuk **Altvira Technology (PT Representasi Mitra Mandiri)**. Aplikasi menyatukan empat portal dalam satu basis kode gratis: **User**, **Admin (Bendahara/Akuntan)**, **Super Admin**, dan **Portal Pembeli (tanpa login melalui Nomor PO)**.

---

## 1. Tech Stack (100% Gratis & Komersial Diizinkan)

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + `shadcn/ui` (MIT)
- **Backend, Auth, Database, Storage:** Supabase Free Tier (PostgreSQL, Auth, Row Level Security, Storage, Edge Functions)
- **Hosting:** Cloudflare Pages Free Tier
- **Anti-Bot Publik:** Cloudflare Turnstile Free Tier
- **Dokumen & Ekspor:** `pdf-lib` (PDF A4 Lampiran A.0–A.8 & laporan keuangan) dan `write-excel-file` (ekspor `.xlsx` buku jurnal, laporan, & pencadangan data), seluruhnya berlisensi MIT
- **Pengujian:** Vitest + `@electric-sql/pglite` (uji unit & uji integrasi PostgreSQL nyata untuk aturan akuntansi, Progress Billing Rp120.000.000, dan RLS Fase 1–4)

---

## 2. Cara Menjalankan Lokal

### Prasyarat
- Node.js `>= 20` dan `npm`
- Proyek Supabase gratis (atau gunakan mode pratinjau lokal `VITE_DEMO_MODE=true` untuk meninjau antarmuka sebelum menghubungkan kredensial Supabase)

### Langkah Menjalankan
1. Salin berkas variabel lingkungan:
   ```bash
   cp .env.example .env.local
   ```
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada `.env.local` (atau setel `VITE_DEMO_MODE=true` untuk simulasi data seed lokal).
3. Pasang dependensi:
   ```bash
   npm install
   ```
4. Jalankan migrasi dan seed ke proyek Supabase Anda (melalui Supabase SQL Editor atau Supabase CLI `supabase db push` lalu jalankan `supabase/seed.sql`).
5. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

### Menjalankan Pemeriksaan Kualitas & Pengujian Otomatis
```bash
npm run typecheck   # Pemeriksaan tipe TypeScript ketat
npm run lint        # Pemeriksaan ESLint
npm test            # Uji unit + uji tingkat database PostgreSQL (PGlite)
```

---

## 3. Variabel Lingkungan

Lihat [`.env.example`](./.env.example):
- `VITE_SUPABASE_URL` — URL proyek Supabase.
- `VITE_SUPABASE_ANON_KEY` — Kunci publik (`anon`) Supabase; keamanan ditegakkan di server oleh Row Level Security (RLS).
- `VITE_TURNSTILE_SITE_KEY` — Kunci publik widget Cloudflare Turnstile untuk Portal Pembeli.
- `VITE_IDLE_TIMEOUT_MINUTES` — Durasi tidak aktif sebelum sesi berakhir otomatis (default `30` menit).
- `VITE_DEMO_MODE` — `true` hanya untuk pengembangan UI lokal tanpa server; pastikan bernilai `false` di produksi.

> **Penting:** Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, atau `DATABASE_URL` di dalam kode frontend maupun repositori Git. Simpan rahasia tersebut khusus di Supabase Edge Function Secrets dan GitHub Actions Secrets.

---

## 4. Cara Deploy Gratis (Rp0/Bulan)

1. **Database & Auth (Supabase Free Tier):**
   - Buat proyek baru di Supabase Dashboard.
   - Jalankan seluruh berkas SQL di `supabase/migrations/` secara berurutan, diikuti `supabase/seed.sql`.
   - Deploy ketiga Edge Functions di folder `supabase/functions/`:
     ```bash
     npx supabase functions deploy admin-manage-users
     npx supabase functions deploy buyer-submit-po
     npx supabase functions deploy buyer-portal-lookup
     ```
2. **Frontend (Cloudflare Pages Free Tier):**
   - Hubungkan repositori GitHub ke Cloudflare Pages.
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Tambahkan variabel lingkungan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, dan `VITE_DEMO_MODE=false`.

---

## 5. Cara Mencadangkan Data Gratis

Karena Supabase Free Tier tidak menyertakan pencadangan otomatis harian dan menjeda proyek bila 7 hari tanpa aktivitas:
1. **Otomatis via GitHub Actions:** Simpan `SUPABASE_DB_URL` dan `BACKUP_PASSPHRASE` pada *GitHub Repository Secrets*. Jadwal workflow pencadangan berkala (`.github/workflows/backup-db.yml`) menjalankan *keep-alive* setiap 3 hari sekaligus mengekspor skema `public` menggunakan `pg_dump` yang dienkripsi **AES-256 (`gpg`)** ke cabang terisolasi `backups-archive` (rotasi 10 snapshot terbaru).
2. **Manual dari Aplikasi:** Admin dapat mengekspor data dan laporan keuangan ke format Excel (`.xlsx`) dan PDF secara berkala sebagai arsip lokal perusahaan.

