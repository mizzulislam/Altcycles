import fs from "fs";
import path from "path";

// Daftar kata kunci/istilah Indonesia khas untuk deteksi teks mentah di JSX/props
const ID_INDICATOR_WORDS = [
  "Belum ada", "Daftar", "Tambah", "Kelola", "Simpan", "Batal", "Ubah", "Hapus",
  "Pilih", "Total", "Status", "Tanggal", "Nominal", "Catat", "Rincian", "Keterangan",
  "Pengajuan", "Pembayaran", "Persetujuan", "Bagi Hasil", "Klaim", "Anggaran",
  "Realisasi", "Kompensasi", "Alokasi", "Pagu", "Pengeluaran", "Penerimaan", "Tagihan",
  "Termin", "Pelanggan", "Vendor", "Peran", "Pengguna", "Perusahaan", "Identitas",
  "Rekening", "Tanda Tangan", "Paraf", "Perpajakan", "Kop Surat", "Media Latar",
  "Bagan Akun", "Saldo", "Debit", "Kredit", "Beban", "Pendapatan", "Ekuitas", "Liabilitas",
  "Aset", "Jurnal", "Buku Besar", "Neraca", "Laba Rugi", "Tutup Buku", "Wajib",
  "Berhasil", "Gagal", "Memuat", "Tidak ada", "Cari", "Semua", "Aktif", "Nonaktif"
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = walk("src");

const auditReport = [];

for (const filePath of allFiles) {
  // Abaikan file locale JSON atau lib/glossary atau lib/pdf (pdf specs terpisah)
  if (filePath.includes("locales") || filePath.includes("lib\\pdf") || filePath.includes("lib/pdf")) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const findings = [];

  // 1. Deteksi ternary bahasa manual
  lines.forEach((line, idx) => {
    if (/\bisEn\b|\blanguage\s*===|\blang\s*===/i.test(line)) {
      findings.push({
        line: idx + 1,
        type: "ternary_or_flag",
        text: line.trim()
      });
    }
  });

  // 2. Deteksi teks JSX literal dalam bahasa Indonesia
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Abaikan baris komentar atau import atau deklarasi type
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("import ") || trimmed.startsWith("type ")) {
      return;
    }
    // Cek apakah ada teks Indonesia di JSX atau props
    for (const word of ID_INDICATOR_WORDS) {
      const regex = new RegExp(`[>"\`']\\s*[^<"\`']*?\\b${word}\\b[^<"\`']*?[<"\`']`, "i");
      if (regex.test(line)) {
        // Cek jika baris ini sudah memakai t(...) atau i18n
        // Jika teks berada di argumen kedua t("key", "Default Teks"), ini diperbolehkan sebagai fallback resmi
        const isFallbackOfT = /t\(\s*["'][^"']+["']\s*,\s*["'][^"']+["']\s*\)/.test(line);
        if (!isFallbackOfT) {
          findings.push({
            line: idx + 1,
            type: "literal_id_text",
            text: trimmed.slice(0, 100),
            matchedWord: word
          });
          break;
        }
      }
    }
  });

  if (findings.length > 0) {
    auditReport.push({
      file: filePath.replace(/\\/g, "/"),
      count: findings.length,
      findings
    });
  }
}

auditReport.sort((a, b) => b.count - a.count);

console.log(JSON.stringify(auditReport, null, 2));
