-- =============================================================================
-- Promosi Akun Pertama Menjadi Super Admin Altcycles
-- Jalankan di Supabase Dashboard -> SQL Editor SETELAH membuat pengguna pertama
-- (mizzulislam.id@gmail.com) pada menu Authentication -> Users -> Add user.
-- =============================================================================

UPDATE public.profiles
SET role = 'super_admin',
    full_name = 'Muhammad Izzul Islam',
    is_active = true,
    updated_at = now()
WHERE lower(email) = lower('mizzulislam.id@gmail.com');

-- Verifikasi hasil promosi peran & kesiapan data inti
SELECT id, full_name, email, role, is_active, created_at
FROM public.profiles
WHERE lower(email) = lower('mizzulislam.id@gmail.com');

