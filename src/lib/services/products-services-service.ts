import type { ServiceProductRow } from "@/types/database.types";

const STORAGE_KEY = "altcycles_company_services_products";

const INITIAL_SERVICES_PRODUCTS: ServiceProductRow[] = [
  {
    id: "srv-001",
    code: "SRV-001",
    name: "Pengembangan Web App & Portal Perusahaan",
    category: "Software Development",
    description: "Arsitektur frontend modern (React/Next.js), API backend scalable, dan integrasi database performa tinggi.",
    unit: "Proyek",
    price: 35000000,
    is_active: true,
    created_at: new Date("2026-01-10").toISOString(),
    updated_at: new Date("2026-01-10").toISOString(),
  },
  {
    id: "srv-002",
    code: "SRV-002",
    name: "Implementasi ERP Keuangan & Akuntansi",
    category: "Enterprise System",
    description: "Solusi otomatisasi jurnal umum, buku besar, penagihan termin (progress billing), dan pelaporan keuangan komprehensif.",
    unit: "Paket / Modul",
    price: 75000000,
    is_active: true,
    created_at: new Date("2026-01-15").toISOString(),
    updated_at: new Date("2026-01-15").toISOString(),
  },
  {
    id: "srv-003",
    code: "SRV-003",
    name: "Desain UI/UX & Design System",
    category: "Product Design",
    description: "Riset pengguna, wireframing, interactive prototyping Figma, dan penyeragaman token desain sistem komponen terpadu.",
    unit: "Paket",
    price: 20000000,
    is_active: true,
    created_at: new Date("2026-02-01").toISOString(),
    updated_at: new Date("2026-02-01").toISOString(),
  },
  {
    id: "srv-004",
    code: "SRV-004",
    name: "Dukungan Pemeliharaan & SLA Cloud (DevOps)",
    category: "Cloud & DevOps",
    description: "Pemantauan server 24/7, manajemen patch keamanan, cadangan data otomatis berkala, dan optimasi performa infrastruktur cloud.",
    unit: "Bulan",
    price: 8500000,
    is_active: true,
    created_at: new Date("2026-02-15").toISOString(),
    updated_at: new Date("2026-02-15").toISOString(),
  },
  {
    id: "srv-005",
    code: "SRV-005",
    name: "Pengembangan Aplikasi Mobile (iOS & Android)",
    category: "Mobile Development",
    description: "Aplikasi cross-platform responsif dan native-like dengan integrasi push notification, payment gateway, dan analitik.",
    unit: "Proyek",
    price: 50000000,
    is_active: true,
    created_at: new Date("2026-03-01").toISOString(),
    updated_at: new Date("2026-03-01").toISOString(),
  },
];

function loadFromStorage(): ServiceProductRow[] {
  if (typeof window === "undefined") return INITIAL_SERVICES_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SERVICES_PRODUCTS));
      return INITIAL_SERVICES_PRODUCTS;
    }
    const parsed = JSON.parse(raw) as ServiceProductRow[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SERVICES_PRODUCTS;
  } catch {
    return INITIAL_SERVICES_PRODUCTS;
  }
}

function saveToStorage(items: ServiceProductRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Abaikan jika quota storage terlampaui
  }
}

export async function listServicesProducts(): Promise<ServiceProductRow[]> {
  // Simulasi asinkronus yang mulus
  return Promise.resolve(loadFromStorage());
}

export async function saveServiceProduct(
  payload: Partial<ServiceProductRow> & { code: string; name: string },
): Promise<ServiceProductRow> {
  const current = loadFromStorage();
  const now = new Date().toISOString();

  if (payload.id) {
    const idx = current.findIndex((item) => item.id === payload.id);
    if (idx >= 0) {
      const updated: ServiceProductRow = {
        ...current[idx]!,
        ...payload,
        updated_at: now,
      };
      current[idx] = updated;
      saveToStorage(current);
      return Promise.resolve(updated);
    }
  }

  const newId = `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newItem: ServiceProductRow = {
    id: newId,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    category: payload.category?.trim() || "Software Development",
    description: payload.description?.trim() || null,
    unit: payload.unit?.trim() || "Paket",
    price: Number(payload.price) || 0,
    is_active: payload.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  const nextList = [newItem, ...current];
  saveToStorage(nextList);
  return Promise.resolve(newItem);
}

export async function deleteServiceProduct(id: string): Promise<void> {
  const current = loadFromStorage();
  const nextList = current.filter((item) => item.id !== id);
  saveToStorage(nextList);
  return Promise.resolve();
}
