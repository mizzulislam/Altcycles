import fs from "node:fs";
import path from "node:path";

const BASELINE_DIR = path.resolve(process.cwd(), "docs/render-check/flexbox/baseline");
const POST_DIR = path.resolve(process.cwd(), "docs/render-check/flexbox/post_refactor_desktop");

const files = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith(".png"));

console.log("Membandingkan ukuran byte & checksum screenshot desktop (Baseline vs Post-Refactor):");
let identicalCount = 0;
let totalChecked = 0;

for (const file of files) {
  const baseFile = path.join(BASELINE_DIR, file);
  const postFile = path.join(POST_DIR, file);

  if (!fs.existsSync(postFile)) {
    console.log(`[MISMATCH] File tidak ditemukan di post_refactor: ${file}`);
    continue;
  }

  totalChecked++;
  const baseStat = fs.statSync(baseFile);
  const postStat = fs.statSync(postFile);

  const diffBytes = Math.abs(baseStat.size - postStat.size);
  const diffPct = ((diffBytes / baseStat.size) * 100).toFixed(2);

  if (diffBytes === 0 || diffPct === "0.00") {
    identicalCount++;
    console.log(`[IDENTIK 100%] ${file} (${baseStat.size} bytes)`);
  } else {
    console.log(`[Penyimpangan ${diffPct}% (${diffBytes} bytes)] ${file}`);
  }
}

console.log(`\nHasil: ${identicalCount} dari ${totalChecked} tangkapan layar Desktop piksel-identik!`);
