/**
 * Utilitas Perhitungan PTKP dan Simulasi Pajak Penghasilan (PPh 21) Altcycles.
 * Sesuai regulasi:
 * - UU Harmonisasi Peraturan Perpajakan (UU HPP No. 7/2021)
 * - PMK 101/PMK.010/2016 (Besaran Penghasilan Tidak Kena Pajak / PTKP)
 * - PP No. 58 Tahun 2023 & PMK No. 168 Tahun 2023 (Kategori TER PPh 21)
 */

import type { MaritalStatus } from "@/types/database.types";

export type PtkpCode =
  | "TK/0"
  | "TK/1"
  | "TK/2"
  | "TK/3"
  | "K/0"
  | "K/1"
  | "K/2"
  | "K/3";

export type TerCategory = "A" | "B" | "C";

export interface PtkpInfo {
  code: PtkpCode;
  label: string;
  maritalStatus: MaritalStatus;
  dependentsCount: number;
  annualValue: number;
  monthlyValue: number;
  terCategory: TerCategory;
  description: string;
}

export interface Pph21SimulationResult {
  grossAmount: number;
  ptkp: PtkpInfo;
  hasNpwp: boolean;
  dpp: number; // Dasar Pengenaan Pajak (50% dari bruto untuk bukan pegawai / fee tenaga ahli)
  effectiveRatePct: number;
  taxAmount: number;
  netPayout: number;
  formulaNote: string;
}

const PTKP_ANNUAL_VALUES: Record<PtkpCode, number> = {
  "TK/0": 54_000_000,
  "TK/1": 58_500_000,
  "TK/2": 63_000_000,
  "TK/3": 67_500_000,
  "K/0": 58_500_000,
  "K/1": 63_000_000,
  "K/2": 67_500_000,
  "K/3": 72_000_000,
};

const PTKP_TO_TER_CATEGORY: Record<PtkpCode, TerCategory> = {
  "TK/0": "A",
  "TK/1": "A",
  "K/0": "A",
  "TK/2": "B",
  "TK/3": "B",
  "K/1": "B",
  "K/2": "B",
  "K/3": "C",
};

/**
 * Menentukan kode PTKP dan informasi detailnya berdasarkan status pernikahan & jumlah tanggungan.
 */
export function getPtkpInfo(
  maritalStatus?: MaritalStatus | null,
  dependentsCount?: number | null,
): PtkpInfo {
  const normStatus: MaritalStatus =
    maritalStatus === "married"
      ? "married"
      : maritalStatus === "widowed"
        ? "widowed"
        : "single";

  const rawDeps = typeof dependentsCount === "number" ? dependentsCount : 0;
  const normDeps = Math.max(0, Math.min(3, Math.floor(rawDeps)));

  const prefix = normStatus === "married" ? "K" : "TK";
  const code = `${prefix}/${normDeps}` as PtkpCode;
  const annualValue = PTKP_ANNUAL_VALUES[code] ?? 54_000_000;
  const terCategory = PTKP_TO_TER_CATEGORY[code] ?? "A";

  const statusLabel =
    normStatus === "married"
      ? "Menikah"
      : normStatus === "widowed"
        ? "Duda / Janda"
        : "Belum Menikah";

  return {
    code,
    label: `${code} - ${statusLabel} (${normDeps} Tanggungan)`,
    maritalStatus: normStatus,
    dependentsCount: normDeps,
    annualValue,
    monthlyValue: Math.round(annualValue / 12),
    terCategory,
    description: `PTKP ${code} sebesar Rp ${(annualValue).toLocaleString("id-ID")}/tahun (Kategori TER ${terCategory})`,
  };
}

/**
 * Menghitung simulasi pemotongan PPh 21 untuk jasa tenaga ahli / bagi hasil proyek tim non-pegawai
 * sesuai PMK 168/2023:
 * DPP = 50% x Penghasilan Bruto.
 * Tarif Progresif Pasal 17 Ayat (1) Huruf a UU PPh:
 * - s/d Rp 60 juta: 5%
 * - > Rp 60 juta s/d Rp 250 juta: 15%
 * - > Rp 250 juta s/d Rp 500 juta: 25%
 * - > Rp 500 juta s/d Rp 5 miliar: 30%
 * - > Rp 5 miliar: 35%
 * Tanpa NPWP dikenakan tarif 20% lebih tinggi (120%).
 */
export function simulatePph21NonEmployee(
  grossAmount: number,
  hasNpwp = true,
  maritalStatus?: MaritalStatus | null,
  dependentsCount?: number | null,
): Pph21SimulationResult {
  const ptkp = getPtkpInfo(maritalStatus, dependentsCount);
  const safeGross = Math.max(0, grossAmount);

  // DPP = 50% Bruto
  const dpp = Math.round(safeGross * 0.5);

  let tax = 0;
  let remainingDpp = dpp;

  // Tier 1: s/d 60jt (5%)
  const tier1Cap = 60_000_000;
  const inTier1 = Math.min(remainingDpp, tier1Cap);
  tax += inTier1 * 0.05;
  remainingDpp -= inTier1;

  // Tier 2: 60jt - 250jt (15%)
  if (remainingDpp > 0) {
    const tier2Cap = 190_000_000; // 250jt - 60jt
    const inTier2 = Math.min(remainingDpp, tier2Cap);
    tax += inTier2 * 0.15;
    remainingDpp -= inTier2;
  }

  // Tier 3: 250jt - 500jt (25%)
  if (remainingDpp > 0) {
    const tier3Cap = 250_000_000;
    const inTier3 = Math.min(remainingDpp, tier3Cap);
    tax += inTier3 * 0.25;
    remainingDpp -= inTier3;
  }

  // Tier 4: 500jt - 5M (30%)
  if (remainingDpp > 0) {
    const tier4Cap = 4_500_000_000;
    const inTier4 = Math.min(remainingDpp, tier4Cap);
    tax += inTier4 * 0.3;
    remainingDpp -= inTier4;
  }

  // Tier 5: > 5M (35%)
  if (remainingDpp > 0) {
    tax += remainingDpp * 0.35;
  }

  // Penalti tanpa NPWP (20% lebih tinggi)
  if (!hasNpwp && tax > 0) {
    tax = Math.round(tax * 1.2);
  } else {
    tax = Math.round(tax);
  }

  const effectiveRatePct =
    safeGross > 0 ? Number(((tax / safeGross) * 100).toFixed(2)) : 0;
  const netPayout = Math.max(0, safeGross - tax);

  const formulaNote = hasNpwp
    ? "DPP (50% Bruto) x Tarif Progresif Ps. 17"
    : "DPP (50% Bruto) x Tarif Progresif Ps. 17 (+20% Tanpa NPWP)";

  return {
    grossAmount: safeGross,
    ptkp,
    hasNpwp,
    dpp,
    effectiveRatePct,
    taxAmount: tax,
    netPayout,
    formulaNote,
  };
}
