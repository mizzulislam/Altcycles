import puppeteer from "puppeteer";
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

async function main() {
  console.log("\n==========================================================================");
  console.log("VERIFIKASI PIKSEL PARITAS DESKTOP RESMI (>=1024px) - MULTI VIEWPORT");
  console.log("Membandingkan Pixel-by-Pixel Canvas (0 Pixel Berbeda Toleransi)");
  console.log("==========================================================================\n");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  let grandTotal = 0;
  let grandIdentical = 0;
  let grandFailed = 0;
  const results = [];

  for (const vp of DESKTOP_VIEWPORTS) {
    const baseDir = path.join(BASELINE_ROOT, vp);
    const postDir = path.join(POST_ROOT, vp);

    if (!fs.existsSync(baseDir)) continue;

    const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".png"));
    console.log(`\n--- Memeriksa Viewport: ${vp.toUpperCase()} (${files.length} tangkapan layar) ---`);

    for (const file of files) {
      grandTotal++;
      const baseFile = path.join(baseDir, file);
      const postFile = path.join(postDir, file);

      if (!fs.existsSync(postFile)) {
        grandFailed++;
        console.log(`  [FILE HILANG] ${file}`);
        continue;
      }

      const b64Base = fs.readFileSync(baseFile).toString("base64");
      const b64Post = fs.readFileSync(postFile).toString("base64");

      const res = await page.evaluate(async (b1, b2) => {
        const loadImg = (b64) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = "data:image/png;base64," + b64;
          });
        const [img1, img2] = await Promise.all([loadImg(b1), loadImg(b2)]);

        if (img1.width !== img2.width || img1.height !== img2.height) {
          return {
            dimMismatch: true,
            w1: img1.width,
            h1: img1.height,
            w2: img2.width,
            h2: img2.height,
            diffPixels: -1,
          };
        }

        const c1 = document.createElement("canvas");
        c1.width = img1.width;
        c1.height = img1.height;
        const ctx1 = c1.getContext("2d");
        ctx1.drawImage(img1, 0, 0);
        const d1 = ctx1.getImageData(0, 0, c1.width, c1.height).data;

        const c2 = document.createElement("canvas");
        c2.width = img2.width;
        c2.height = img2.height;
        const ctx2 = c2.getContext("2d");
        ctx2.drawImage(img2, 0, 0);
        const d2 = ctx2.getImageData(0, 0, c2.width, c2.height).data;

        let diffPixels = 0;
        for (let i = 0; i < d1.length; i += 4) {
          if (
            d1[i] !== d2[i] ||
            d1[i + 1] !== d2[i + 1] ||
            d1[i + 2] !== d2[i + 2] ||
            d1[i + 3] !== d2[i + 3]
          ) {
            diffPixels++;
          }
        }
        return {
          dimMismatch: false,
          totalPixels: d1.length / 4,
          diffPixels,
        };
      }, b64Base, b64Post);

      const pct = res.dimMismatch
        ? 100
        : ((res.diffPixels / res.totalPixels) * 100).toFixed(4);

      if (res.diffPixels === 0) {
        grandIdentical++;
        console.log(`  [100% IDENTIK] ${file} (${res.totalPixels.toLocaleString()} piksel, 0 beda)`);
      } else {
        grandFailed++;
        console.log(`  [SELISIH PIKSEL] ${file} -> ${res.diffPixels} piksel berbeda (${pct}%)`);
      }

      results.push({
        viewport: vp,
        file,
        diffPixels: res.diffPixels,
        pct,
      });
    }
  }

  await browser.close();

  console.log(`\n==========================================================================`);
  console.log(`RINGKASAN VERIFIKASI PIKSEL DESKTOP:`);
  console.log(`Total Halaman Desktop Diuji : ${grandTotal}`);
  console.log(`Lulus Paritas 100% Identik   : ${grandIdentical}`);
  console.log(`Perbedaan Terdeteksi         : ${grandFailed}`);
  console.log("==========================================================================\n");
}

main().catch(console.error);
