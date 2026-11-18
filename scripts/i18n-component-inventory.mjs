import fs from "fs";
import path from "path";

const PORTALS = [
  {
    name: "Portal User / Team Member",
    role: "user",
    routes: ["/user/dashboard", "/user/po", "/user/pembayaran", "/user/anggaran"],
    files: [
      "src/features/dashboard/user-dashboard.tsx",
      "src/features/payment-approvals/user-payments-page.tsx",
      "src/features/purchase-orders/po-page.tsx",
      "src/features/budgeting/budget-page.tsx"
    ]
  },
  {
    name: "Portal Super Admin",
    role: "super_admin",
    routes: [
      "/super-admin/dashboard",
      "/super-admin/profil-perusahaan",
      "/super-admin/administrasi",
      "/super-admin/pengguna",
      "/super-admin/konfigurasi",
      "/super-admin/master-tinjau",
      "/super-admin/audit-trail",
      "/super-admin/media-login"
    ],
    files: [
      "src/features/system-config/super-admin-dashboard.tsx",
      "src/features/system-config/company-profile-page.tsx",
      "src/features/system-config/admin-settings-page.tsx",
      "src/features/system-config/users-management-page.tsx",
      "src/features/system-config/system-config-page.tsx",
      "src/features/system-config/master-readonly-page.tsx",
      "src/features/system-config/audit-trail-page.tsx",
      "src/features/system-config/login-media-page.tsx"
    ]
  },
  {
    name: "Portal Admin (Bendahara / Akuntan)",
    role: "admin",
    routes: [
      "/admin/dashboard",
      "/admin/persetujuan",
      "/admin/po-internal",
      "/admin/proyek",
      "/admin/proyek/:projectId",
      "/admin/penagihan",
      "/admin/anggaran",
      "/admin/akuntansi",
      "/admin/bagi-hasil",
      "/admin/master"
    ],
    files: [
      "src/features/master-data/admin-dashboard.tsx",
      "src/features/payment-approvals/admin-approvals-page.tsx",
      "src/features/purchase-orders/po-page.tsx",
      "src/features/master-data/projects-page.tsx",
      "src/features/client-projects/project-detail-page.tsx",
      "src/features/invoicing/invoicing-page.tsx",
      "src/features/budgeting/budget-page.tsx",
      "src/features/accounting/accounting-page.tsx",
      "src/features/profit-sharing/profit-sharing-page.tsx",
      "src/features/master-data/parties-master-page.tsx"
    ]
  },
  {
    name: "Auth, Profil, Buyer Portal, & Layout Bersama",
    role: "public / shared",
    routes: [
      "/login",
      "/lupa-kata-sandi",
      "/reset-kata-sandi",
      "/portal-pembeli",
      "/profil",
      "/pengaturan/profil"
    ],
    files: [
      "src/features/auth/login-page.tsx",
      "src/features/auth/password-reset-pages.tsx",
      "src/features/buyer-portal/buyer-portal-page.tsx",
      "src/features/profile/profile-overview-page.tsx",
      "src/features/profile/profile-settings-page.tsx",
      "src/components/layout/portal-shell.tsx",
      "src/components/layout/header.tsx",
      "src/components/layout/sidebar.tsx"
    ]
  }
];

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, count: 0, items: [] };
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const items = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
      return;
    }

    // 1. Ternary manual isEn
    if (/\bisEn\b|\blanguage\s*===|\blang\s*===/i.test(line)) {
      items.push({ line: idx + 1, type: "ternary", text: trimmed });
    }

    // 2. Deteksi teks JSX langsung tanpa t()
    // Contoh: >Teks Indonesia< atau placeholder="Teks Indonesia"
    const jsxTextMatch = line.match(/>([^<>{}\n]+)</);
    if (jsxTextMatch) {
      const text = jsxTextMatch[1].trim();
      // Bila bukan angka, simbol, atau kosong, dan bukan interpolation
      if (text.length > 1 && !/^[\d\s.,:;()/#%_+\-*&=]+$/.test(text) && !text.startsWith("&")) {
        // Abaikan teks brand resmi
        if (!["Altvira", "Altcycles", "USD", "IDR", "Rp", "PKP", "Non-PKP", "CoA", "UAT", "BAKP", "BAST", "SoW", "SPK", "PO", "INV"].includes(text)) {
          items.push({ line: idx + 1, type: "raw_jsx_text", text });
        }
      }
    }

    // 3. Deteksi placeholder / title / aria-label literal
    const propMatch = line.match(/(placeholder|title|aria-label)\s*=\s*["']([^"']+)["']/);
    if (propMatch) {
      const val = propMatch[2].trim();
      if (val.length > 1 && !val.includes("{{")) {
        items.push({ line: idx + 1, type: "raw_prop", prop: propMatch[1], text: val });
      }
    }
  });

  return { exists: true, count: items.length, items };
}

const summary = [];

for (const portal of PORTALS) {
  const portalResult = {
    name: portal.name,
    role: portal.role,
    routes: portal.routes,
    totalIssues: 0,
    files: []
  };

  for (const f of portal.files) {
    const res = analyzeFile(f);
    portalResult.totalIssues += res.count;
    portalResult.files.push({
      file: f,
      count: res.count,
      items: res.items.slice(0, 10) // sample 10
    });
  }

  summary.push(portalResult);
}

fs.writeFileSync("docs/audit-inventory.json", JSON.stringify(summary, null, 2));

console.log("\n=================== RINGKASAN AUDIT INVENTARIS i18n ===================");
for (const portal of summary) {
  console.log(`\n### ${portal.name} (Role: ${portal.role})`);
  console.log(`Total Masalah: ${portal.totalIssues}`);
  console.table(portal.files.map(f => ({ File: f.file, Issues: f.count })));
}

