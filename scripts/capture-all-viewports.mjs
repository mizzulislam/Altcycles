import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://127.0.0.1:5173";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dir: "docs/render-check/flexbox/post_refactor_desktop" },
  { name: "tablet", width: 768, height: 1024, dir: "docs/render-check/flexbox/tablet_768" },
  { name: "mobile", width: 375, height: 812, dir: "docs/render-check/flexbox/mobile_375" },
];

const ROUTES = [
  { name: "01_login", path: "/login", role: "none" },
  { name: "02_lupa_kata_sandi", path: "/lupa-kata-sandi", role: "none" },
  { name: "03_portal_pembeli", path: "/portal-pembeli", role: "none" },
  { name: "04_super_admin_dashboard", path: "/super-admin/dashboard", role: "super_admin" },
  { name: "05_super_admin_profil_perusahaan", path: "/super-admin/profil-perusahaan", role: "super_admin" },
  { name: "06_super_admin_administrasi", path: "/super-admin/administrasi", role: "super_admin" },
  { name: "07_super_admin_pengguna", path: "/super-admin/pengguna", role: "super_admin" },
  { name: "08_super_admin_konfigurasi", path: "/super-admin/konfigurasi", role: "super_admin" },
  { name: "09_super_admin_master_tinjau", path: "/super-admin/master-tinjau", role: "super_admin" },
  { name: "10_super_admin_audit_trail", path: "/super-admin/audit-trail", role: "super_admin" },
  { name: "11_super_admin_media_login", path: "/super-admin/media-login", role: "super_admin" },
  { name: "12_super_admin_pintasan_keyboard", path: "/super-admin/pintasan-keyboard", role: "super_admin" },
  { name: "13_admin_dashboard", path: "/admin/dashboard", role: "admin" },
  { name: "14_admin_persetujuan", path: "/admin/persetujuan", role: "admin" },
  { name: "15_admin_po_internal", path: "/admin/po-internal", role: "admin" },
  { name: "16_admin_proyek", path: "/admin/proyek", role: "admin" },
  { name: "17_admin_penagihan", path: "/admin/penagihan", role: "admin" },
  { name: "18_admin_anggaran", path: "/admin/anggaran", role: "admin" },
  { name: "19_admin_akuntansi", path: "/admin/akuntansi", role: "admin" },
  { name: "20_admin_bagi_hasil", path: "/admin/bagi-hasil", role: "admin" },
  { name: "21_admin_master", path: "/admin/master", role: "admin" },
  { name: "22_user_dashboard", path: "/user/dashboard", role: "user" },
  { name: "23_user_po", path: "/user/po", role: "user" },
  { name: "24_user_pembayaran", path: "/user/pembayaran", role: "user" },
  { name: "25_user_anggaran", path: "/user/anggaran", role: "user" },
  { name: "26_profil_overview", path: "/profil", role: "admin" },
  { name: "27_profil_pengaturan", path: "/pengaturan/profil", role: "admin" },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    const outDir = path.resolve(process.cwd(), vp.dir);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`\n======================================================`);
    console.log(`Mengambil tangkapan layar untuk viewport ${vp.name.toUpperCase()} (${vp.width}x${vp.height})...`);
    console.log(`======================================================`);

    await page.setViewport({ width: vp.width, height: vp.height });

    for (const item of ROUTES) {
      try {
        console.log(`[${vp.name}] Membuka: ${item.name} (${item.path})...`);
        if (item.role !== "none") {
          await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
          await page.evaluate((role) => {
            window.sessionStorage.setItem("altcycles_demo_session_email", "superadmin@altvira.id");
            window.sessionStorage.setItem("altcycles_tab_active_role", role);
          }, item.role);
        }

        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "networkidle2" });
        await new Promise((r) => setTimeout(r, 1100));

        const filePath = path.join(outDir, `${item.name}_${vp.width}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`  -> Tersimpan: ${filePath}`);
      } catch (err) {
        console.error(`  -> Gagal pada ${item.name}:`, err);
      }
    }
  }

  await browser.close();
  console.log("\nSemua tangkapan layar 3 viewport berhasil diambil!");
}

run().catch(console.error);
