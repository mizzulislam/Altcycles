import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://127.0.0.1:5173";
const OUTPUT_DIR = path.resolve(process.cwd(), "docs/render-check/flexbox/baseline");

// 25 Rute terpetakan
const ROUTES = [
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
  { name: "13_admin_dashboard", path: "/admin/dashboard", role: "admin" },
  { name: "14_admin_persetujuan", path: "/admin/persetujuan", role: "admin" },
  { name: "15_admin_po_internal", path: "/admin/po-internal", role: "admin" },
  { name: "16_admin_proyek", path: "/admin/proyek", role: "admin" },
  { name: "17_admin_penagihan", path: "/admin/penagihan", role: "admin" },
  { name: "18_admin_anggaran", path: "/admin/anggaran", role: "admin" },
  { name: "19_admin_akuntansi", path: "/admin/akuntansi", role: "admin" },
  { name: "20_admin_bagi_hasil", path: "/admin/bagi-hasil", role: "admin" },
  { name: "21_admin_master", path: "/admin/master", role: "admin" },

  // User / Anggota Tim
  { name: "22_user_dashboard", path: "/user/dashboard", role: "user" },
  { name: "23_user_po", path: "/user/po", role: "user" },
  { name: "24_user_pembayaran", path: "/user/pembayaran", role: "user" },
  { name: "25_user_anggaran", path: "/user/anggaran", role: "user" },

  // Profil Bersama
  { name: "26_profil_overview", path: "/profil", role: "admin" },
  { name: "27_profil_pengaturan", path: "/pengaturan/profil", role: "admin" },
];

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Inisialisasi sesi login di browser via demo account jika diperlukan
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });

  for (const item of ROUTES) {
    try {
      console.log(`Mengambil baseline: ${item.name} (${item.path})...`);
      
      // Inject session jika role memerlukan otentikasi
      if (item.role !== "none") {
        await page.evaluate((role) => {
          window.sessionStorage.setItem("altcycles_demo_session_email", "superadmin@altvira.id");
          window.sessionStorage.setItem("altcycles_tab_active_role", role);
        }, item.role);
      }

      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 1200)); // Beri waktu render komponen & data

      const filePath = path.join(OUTPUT_DIR, `${item.name}_1440.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`  -> Berhasil disimpan di ${filePath}`);
    } catch (err) {
      console.error(`  -> Gagal pada ${item.name}:`, err);
    }
  }

  await browser.close();
  console.log("Semua tangkapan layar baseline selesai diambil!");
}

run().catch(console.error);
