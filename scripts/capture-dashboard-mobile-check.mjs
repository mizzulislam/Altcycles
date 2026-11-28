import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:5173";
const outDir = path.resolve(process.cwd(), "docs/render-check/mobile-header-check");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const VIEWPORTS = [
  { name: "iphone_se", width: 375, height: 667 },
  { name: "iphone_16_pro_max", width: 440, height: 956 },
  { name: "desktop", width: 1440, height: 900 },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      window.sessionStorage.setItem("altcycles_demo_session_email", "admin@altvira.id");
      window.sessionStorage.setItem("altcycles_tab_active_role", "admin");
    });
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));

    const filePath = path.join(outDir, `dashboard_${vp.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved screenshot: ${filePath}`);

    // If mobile, test clicking info button
    if (vp.name === "iphone_se") {
      const infoBtn = await page.$('button[aria-label="Informasi halaman"]');
      if (infoBtn) {
        await infoBtn.click();
        await new Promise((r) => setTimeout(r, 500));
        const modalPath = path.join(outDir, `dashboard_${vp.name}_gamedialog.png`);
        await page.screenshot({ path: modalPath, fullPage: false });
        console.log(`Saved modal screenshot: ${modalPath}`);
      }
    }
  }

  await browser.close();
  console.log("Done!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
