import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const BASE_URL = "http://localhost:4173";

const VIEWPORTS = [
  { width: 1024, height: 768, name: "desktop_1024" },
  { width: 1280, height: 800, name: "desktop_1280" },
  { width: 1440, height: 900, name: "desktop_1440" },
  { width: 1920, height: 1080, name: "desktop_1920" },
  { width: 320, height: 568, name: "mobile_320" },
  { width: 360, height: 740, name: "mobile_360" },
  { width: 376, height: 667, name: "mobile_376" },
  { width: 390, height: 844, name: "mobile_390" },
  { width: 768, height: 1024, name: "tablet_768" },
];

const THEMES = ["dark", "light"];
const LANGUAGES = ["id", "en"];

async function main() {
  const stage = process.argv.includes("--after") ? "after" : "before";
  const outBase = path.resolve(process.cwd(), `docs/render-check/login/${stage}`);
  if (!fs.existsSync(outBase)) {
    fs.mkdirSync(outBase, { recursive: true });
  }

  console.log(`\n======================================================`);
  console.log(`Mengambil Screenshot Login (${stage.toUpperCase()})`);
  console.log(`Output: ${outBase}`);
  console.log(`======================================================\n`);

  // Start dev server on port 4173
  const devServer = spawn("npm.cmd", ["run", "dev", "--", "--port", "4173"], {
    shell: true,
    stdio: "pipe",
    env: { ...process.env, VITE_DEMO_MODE: "true" },
  });

  console.log("Menunggu server Vite aktif di port 4173...");
  let serverReady = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.ok || res.status === 200 || res.status === 304) {
        serverReady = true;
        console.log("Server Vite siap!");
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!serverReady) {
    console.error("Server Vite gagal merespons setelah 15 detik!");
    devServer.kill();
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();

  try {
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const theme of THEMES) {
        for (const lang of LANGUAGES) {
          const fileName = `${vp.name}_${theme}_${lang}.png`;
          const filePath = path.join(outBase, fileName);

          // Initial load
          await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

          // Set localStorage and DOM attributes
          await page.evaluate((t, l) => {
            localStorage.setItem("altcycles_theme", t);
            localStorage.setItem("altcycles_language", l);
            sessionStorage.clear();
            if (t === "dark") {
              document.documentElement.classList.add("dark");
              document.documentElement.classList.remove("light");
            } else {
              document.documentElement.classList.remove("dark");
              document.documentElement.classList.add("light");
            }
          }, theme, lang);

          // Reload to let react context initialize with the stored settings
          await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
          await new Promise((r) => setTimeout(r, 500));

          await page.screenshot({ path: filePath, fullPage: true });
          console.log(`[SAVED] ${fileName}`);
        }
      }
    }
  } finally {
    try {
      await browser.close();
    } catch {}
    if (devServer && devServer.pid) {
      try {
        spawn("taskkill", ["/F", "/T", "/PID", String(devServer.pid)], { shell: true });
      } catch {}
    }
  }

  console.log(`\nSelesai! Seluruh screenshot ${stage.toUpperCase()} tersimpan di ${outBase}`);
}

main().catch((err) => {
  console.error("Terjadi error:", err);
  process.exit(1);
});
