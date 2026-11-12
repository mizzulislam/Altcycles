import fs from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const SUPABASE_AUTH_SHIM_SQL = `
CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  raw_user_meta_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$;

GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
`;

export interface TestActors {
  superAdminId: string;
  adminId: string;
  userAssignedId: string;
  userOtherId: string;
}

export const TEST_ACTORS: TestActors = {
  superAdminId: "11111111-1111-4111-8111-111111111111",
  adminId: "22222222-2222-4222-8222-222222222222",
  userAssignedId: "33333333-3333-4333-8333-333333333333",
  userOtherId: "44444444-4444-4444-8444-444444444444",
};

export async function createMigratedTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_AUTH_SHIM_SQL);

  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await db.exec(sql);
  }

  const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");
  const seedSql = fs.readFileSync(seedPath, "utf8");
  await db.exec(seedSql);

  // Masukkan 4 pengguna uji ke auth.users (trigger default selalu membuat peran 'user'),
  // lalu tetapkan peran istimewa secara eksplisit layaknya service_role / seed resmi.
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data)
     VALUES
       ($1, 'superadmin@altvira.id', '{"full_name":"Super Admin Uji"}'::jsonb),
       ($2, 'admin@altvira.id',      '{"full_name":"Admin Bendahara Uji"}'::jsonb),
       ($3, 'user1@altvira.id',      '{"full_name":"User Anggota Proyek"}'::jsonb),
       ($4, 'user2@altvira.id',      '{"full_name":"User Proyek Lain"}'::jsonb)`,
    [
      TEST_ACTORS.superAdminId,
      TEST_ACTORS.adminId,
      TEST_ACTORS.userAssignedId,
      TEST_ACTORS.userOtherId,
    ],
  );

  await db.query(
    `UPDATE public.profiles
     SET role = 'super_admin',
         roles = ARRAY['super_admin', 'admin', 'user']::public.user_role[]
     WHERE id = $1`,
    [TEST_ACTORS.superAdminId],
  );

  await db.query(
    `UPDATE public.profiles
     SET role = 'admin',
         roles = ARRAY['admin', 'user']::public.user_role[]
     WHERE id = $1`,
    [TEST_ACTORS.adminId],
  );

  // Tugaskan userAssignedId ke proyek contoh PRJ/ALT/2026/001
  await db.query(
    `INSERT INTO public.project_members (project_id, user_id, member_role, assigned_by)
     SELECT id, $1, 'Frontend Engineer', $2
     FROM public.projects
     WHERE code = 'PRJ/ALT/2026/001'`,
    [TEST_ACTORS.userAssignedId, TEST_ACTORS.adminId],
  );

  return db;
}

/**
 * Menjalankan kueri di dalam transaksi sebagai pengguna authenticated tertentu
 * sehingga kebijakan RLS PostgreSQL benar-benar dievaluasi seperti di Supabase.
 */
export async function runAsAuthenticated<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE authenticated;`);
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [
      userId,
    ]);
    return fn(tx);
  });
}

/**
 * Menjalankan kueri sebagai pengunjung publik tanpa login (peran anon).
 */
export async function runAsAnon<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE anon;`);
    await tx.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
    return fn(tx);
  });
}

/**
 * Menjalankan kueri sebagai service_role (mensimulasikan Supabase Edge Function).
 */
export async function runAsServiceRole<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE service_role;`);
    await tx.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
    return fn(tx);
  });
}

