#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL secret belum dikonfigurasi pada GitHub Actions Secrets; melewati pencadangan."
  if [[ -n "${GITHUB_ENV:-}" ]]; then
    echo "BACKUP_CREATED=false" >> "${GITHUB_ENV}"
  fi
  exit 0
fi

echo "Menjalankan keep-alive ping skema public Altcycles..."
psql "${SUPABASE_DB_URL}" -c "SELECT now() AS keep_alive_utc;" >/dev/null

if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  echo "Keep-alive berhasil. BACKUP_PASSPHRASE belum disetel; melewati penyimpanan arsip agar dump tidak pernah disimpan tanpa enkripsi."
  if [[ -n "${GITHUB_ENV:-}" ]]; then
    echo "BACKUP_CREATED=false" >> "${GITHUB_ENV}"
  fi
  exit 0
fi

mkdir -p backups
STAMP="$(date -u +%Y%m%d_%H%M%S)"
RAW_GZIP="backups/altcycles_public_${STAMP}.sql.gz"
ENC_FILE="${RAW_GZIP}.gpg"

pg_dump "${SUPABASE_DB_URL}" \
  --schema=public \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${RAW_GZIP}"

printf '%s' "${BACKUP_PASSPHRASE}" | gpg \
  --batch \
  --yes \
  --passphrase-fd 0 \
  --symmetric \
  --cipher-algo AES256 \
  --output "${ENC_FILE}" \
  "${RAW_GZIP}"

rm -f "${RAW_GZIP}"

echo "Cadangan terenkripsi AES-256 berhasil dibuat: ${ENC_FILE}"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "BACKUP_CREATED=true" >> "${GITHUB_ENV}"
fi
