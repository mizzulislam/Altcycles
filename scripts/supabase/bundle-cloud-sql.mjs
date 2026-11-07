import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const seedFile = path.join(rootDir, "supabase", "seed.sql");
const outDir = path.join(rootDir, "supabase", ".temp");
const outFile = path.join(outDir, "full_altcycles_cloud_setup.sql");

fs.mkdirSync(outDir, { recursive: true });

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sections = [
  "-- =============================================================================",
  "-- BUNDEL LENGKAP INSTALASI SUPABASE CLOUD — ALTCYCLES (ALTVIRA)",
  "-- Dihasilkan otomatis dari supabase/migrations/0001..0008 + supabase/seed.sql",
  "-- Jalankan berkas ini di Supabase Dashboard -> SQL Editor jika tidak memakai CLI.",
  "-- =============================================================================\n",
];

for (const file of migrationFiles) {
  const fullPath = path.join(migrationsDir, file);
  const content = fs.readFileSync(fullPath, "utf8");
  sections.push(`-- >>> MULAI MIGRASI: ${file} <<<`);
  sections.push(content.trim());
  sections.push(`-- >>> SELESAI MIGRASI: ${file} <<<\n`);
}

const seedContent = fs.readFileSync(seedFile, "utf8");
sections.push("-- >>> MULAI DATA AWAL (SEED): supabase/seed.sql <<<");
sections.push(seedContent.trim());
sections.push("-- >>> SELESAI DATA AWAL (SEED) <<<\n");

fs.writeFileSync(outFile, sections.join("\n"), "utf8");
console.log(`Bundel SQL berhasil dibuat di: ${outFile}`);

