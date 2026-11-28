import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const BASE_URL = "http://localhost:4173";

// 9 Viewport sesuai instruksi: 5 Desktop (>=1024px) + 4 Mobile/Tablet (<1024px)
const VIEWPORTS = [
  // Desktop Viewports
  { id: "1024", name: "desktop_1024", width: 1024, height: 768, isDesktop: true },
  { id: "1280", name: "desktop_1280", width: 1280, height: 800, isDesktop: true },
  { id: "1366", name: "desktop_1366", width: 1366, height: 768, isDesktop: true },
  { id: "1440", name: "desktop_1440", width: 1440, height: 900, isDesktop: true },
  { id: "1920", name: "desktop_1920", width: 1920, height: 1080, isDesktop: true },

  // Mobile & Tablet Viewports
  { id: "360", name: "mobile_360", width: 360, height: 740, isDesktop: false },
  { id: "375", name: "mobile_375", width: 375, height: 812, isDesktop: false },
  { id: "390", name: "mobile_390", width: 390, height: 844, isDesktop: false },
  { id: "768", name: "tablet_768", width: 768, height: 1024, isDesktop: false },
];

const ALL_ROUTES = [
  // Auth & Public
  { name: "01_login", path: "/login", role: "none" },
  { name: "02_lupa_kata_sandi", path: "/lupa-kata-sandi", role: "none" },
  { name: "03_portal_pembeli", path: "/portal-pembeli", role: "none" },

  // Super Admin
  { name: "04_super_admin_dashboard", path: "/super-admin/dashboard", role: "super_admin" },
  { name: "05_super_admin_profil_perusahaan", path: "/super-admin/profil-perusahaan", role: "super_admin" },
  { name: "06_super_admin_administrasi", path: "/super-admin/administrasi", role: "super_admin" },
  { name: "07_super_admin_pengguna", path: "/super-admin/pengguna", role: "super_admin" },
  { name: "08_super_admin_konfigurasi", path: "/super-admin/konfigurasi", role: "super_admin" },
  { name: "09_super_admin_master_tinjau", path: "/super-admin/master-tinjau", role: "super_admin" },
  { name: "10_super_admin_audit_trail", path: "/super-admin/audit-trail", role: "super_admin" },
  { name: "11_super_admin_media_login", path: "/super-admin/media-login", role: "super_admin" },
  { name: "12_super_admin_pintasan_keyboard", path: "/super-admin/pintasan-keyboard", role: "super_admin" },

  // Admin / Bendahara
  { name: "13_admin_dashboard", path: "/admin/dashboard", role: "admin", isPilot: true },
  { name: "14_admin_persetujuan", path: "/admin/persetujuan", role: "admin" },
  { name: "15_admin_po_internal", path: "/admin/po-internal", role: "admin" },
  { name: "16_admin_proyek", path: "/admin/proyek", role: "admin" },
  { name: "17_admin_penagihan", path: "/admin/penagihan", role: "admin" },
  { name: "18_admin_anggaran", path: "/admin/anggaran", role: "admin" },
  { name: "19_admin_akuntansi", path: "/admin/akuntansi?tab=jurnal", role: "admin", isPilot: true },
  { name: "20_admin_bagi_hasil", path: "/admin/bagi-hasil", role: "admin" },
  { name: "21_admin_master", path: "/admin/master", role: "admin" },

  // User / Anggota Tim
  { name: "22_user_dashboard", path: "/user/dashboard", role: "user" },
  { name: "23_user_po", path: "/user/po", role: "user" },
  { name: "24_user_pembayaran", path: "/user/pembayaran", role: "user" },
  { name: "25_user_anggaran", path: "/user/anggaran", role: "user" },

  // Profil Bersama
  { name: "26_profil_overview", path: "/profil", role: "admin" },
  { name: "27_profil_pengaturan", path: "/pengaturan/profil", role: "admin", isPilot: true },
];

async function main() {
  const isPilotOnly = process.argv.includes("--pilot");
  const isPostRefactor = process.argv.includes("--post");
  const groupArg = process.argv.find((a) => a.startsWith("--group="));
  const targetGroup = groupArg ? groupArg.split("=")[1] : null;

  const vpArg = process.argv.find((a) => a.startsWith("--vp="));
  const targetVpId = vpArg ? vpArg.split("=")[1] : null;

  const baseTargetFolder = isPostRefactor
    ? "docs/render-check/layout-optimization/post"
    : "docs/render-check/layout-optimization/baseline";

  let targetRoutes = isPilotOnly
    ? ALL_ROUTES.filter((r) => r.isPilot)
    : ALL_ROUTES;

  if (targetGroup) {
    if (targetGroup === "auth") {
      targetRoutes = ALL_ROUTES.filter((r) => r.role === "none");
    } else if (targetGroup === "super_admin") {
      targetRoutes = ALL_ROUTES.filter((r) => r.role === "super_admin");
    } else if (targetGroup === "admin") {
      targetRoutes = ALL_ROUTES.filter((r) => r.role === "admin");
    } else if (targetGroup === "user") {
      targetRoutes = ALL_ROUTES.filter((r) => r.role === "user");
    }
  }

  let activeViewports = VIEWPORTS;
  if (targetVpId) {
    if (targetVpId === "desktop") {
      activeViewports = VIEWPORTS.filter((v) => v.isDesktop);
    } else if (targetVpId === "mobile") {
      activeViewports = VIEWPORTS.filter((v) => !v.isDesktop);
    } else {
      activeViewports = VIEWPORTS.filter((v) => v.id === targetVpId);
    }
  }

  console.log(`\n================================================================`);
  console.log(`Memulai Pengambilan Tangkapan Layar: ${isPostRefactor ? "POST-REFACTOR" : "BASELINE AWAL"}`);
  console.log(`Target: ${targetRoutes.length} Rute Halaman ${targetGroup ? `(Grup: ${targetGroup})` : ""}`);
  console.log(`Viewport: ${activeViewports.length} Ukuran`);
  console.log(`================================================================\n`);

  console.log("Menjalankan server Vite preview di port 4173...");
  const devServer = spawn("npm.cmd", ["run", "dev", "--", "--port", "4173"], {
    shell: true,
    stdio: "pipe",
    env: { ...process.env, VITE_DEMO_MODE: "true" },
  });

  console.log("Menunggu server Vite aktif...");
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
    protocolTimeout: 120000,
  });

  console.log("Melakukan pre-warm Vite dev server...");
  try {
    const warmPage = await browser.newPage();
    await warmPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await warmPage.close();
    console.log("Pre-warm selesai!");
  } catch (err) {
    console.warn("Peringatan pre-warm:", err.message);
  }

  for (const vp of activeViewports) {
    const outDir = path.resolve(process.cwd(), baseTargetFolder, vp.name);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`\n>> Memproses Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    let currentRole = null;

    for (const item of targetRoutes) {
      try {
        if (item.role === "none") {
          if (currentRole !== null) {
            await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
            await page.evaluate(() => {
              window.sessionStorage.clear();
              window.localStorage.removeItem("altcycles_tab_active_role");
              window.localStorage.setItem("altcycles_sidebar_collapsed", "false");
            });
            currentRole = null;
          }
        } else if (item.role !== currentRole) {
          await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
          await page.evaluate((role) => {
            window.sessionStorage.setItem("altcycles_demo_session_email", "admin@altvira.id");
            window.sessionStorage.setItem("altcycles_tab_active_role", role);
            window.localStorage.setItem("altcycles_sidebar_collapsed", "false");
          }, item.role);
          currentRole = item.role;
        }

        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "networkidle2", timeout: 45000 });
        await new Promise((r) => setTimeout(r, 1000));

        const filePath = path.join(outDir, `${item.name}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`   [OK] ${item.name} -> ${filePath}`);
      } catch (err) {
        console.error(`   [FAIL] ${item.name}:`, err.message);
      }
    }
    await page.close();
  }

  await browser.close();
  devServer.kill();
  console.log("\nPengambilan tangkapan layar selesai!");
  process.exit(0);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
