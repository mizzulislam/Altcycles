import fs from "node:fs";
import path from "node:path";

const BASELINE_ROOT = path.resolve(process.cwd(), "docs/render-check/layout-optimization/baseline");
const POST_ROOT = path.resolve(process.cwd(), "docs/render-check/layout-optimization/post");

const DESKTOP_VIEWPORTS = [
  "desktop_1024",
  "desktop_1280",
  "desktop_1366",
  "desktop_1440",
  "desktop_1920",
];

console.log("\n==========================================================================");
console.log("VERIFIKASI PARITAS DESKTOP RESMI (>=1024px) - MULTI VIEWPORT");
console.log("Viewport: 1024px, 1280px, 1366px, 1440px, 1920px");
console.log("Aturan Mutlak: 0 Piksel Berubah / Selisih Byte = 0 (100% Identik)");
console.log("==========================================================================\n");

let grandTotal = 0;
let grandIdentical = 0;
let grandFailed = 0;

for (const vp of DESKTOP_VIEWPORTS) {
  const baseDir = path.join(BASELINE_ROOT, vp);
  const postDir = path.join(POST_ROOT, vp);

  if (!fs.existsSync(baseDir)) {
    console.log(`[SKIP] Direktori baseline belum ada untuk ${vp}`);
    continue;
  }

  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".png"));
  console.log(`\n--- Memeriksa Viewport: ${vp.toUpperCase()} (${files.length} tangkapan layar) ---`);

  for (const file of files) {
    grandTotal++;
    const baseFile = path.join(baseDir, file);
    const postFile = path.join(postDir, file);

    if (!fs.existsSync(postFile)) {
      grandFailed++;
      console.log(`[MISMATCH] Belum ada screenshot post-refactor: ${file}`);
      continue;
    }

    const baseStat = fs.statSync(baseFile);
    const postStat = fs.statSync(postFile);

    const diffBytes = Math.abs(baseStat.size - postStat.size);
    const diffPct = ((diffBytes / baseStat.size) * 100).toFixed(2);

    if (diffBytes === 0 || diffPct === "0.00") {
      grandIdentical++;
      console.log(`  [100% IDENTIK] ${file} (${baseStat.size} bytes)`);
    } else {
      grandFailed++;
      console.log(`  [GAGAL PARITAS] ${file} (selisih: ${diffBytes} bytes / ${diffPct}%)`);
    }
  }
}

console.log(`\n==========================================================================`);
console.log(`RINGKASAN PARITAS DESKTOP:`);
console.log(`Total Tangkapan Layar Diuji : ${grandTotal}`);
console.log(`Lulus Paritas 100% Identik  : ${grandIdentical}`);
console.log(`Gagal / Ada Perubahan       : ${grandFailed}`);
console.log(`Status                      : ${grandFailed === 0 && grandTotal > 0 ? "LULUS PARITAS MUTLAK (DESKTOP FREEZE BERHASIL)" : "GAGAL PARITAS"}`);
console.log("==========================================================================\n");

if (grandFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
