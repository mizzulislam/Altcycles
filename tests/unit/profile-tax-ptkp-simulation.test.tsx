/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/supabase", () => ({
  isDemoMode: true,
  supabase: null,
  IDLE_TIMEOUT_MINUTES: 30,
  TAB_AUTH_STORAGE_KEY: "altcycles_tab_auth_token",
}));

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import {
  getPtkpInfo,
  simulatePph21NonEmployee,
} from "@/lib/tax-calculation";
import {
  getMergedProfileFields,
  setDemoCurrentUser,
  updateMyProfile,
} from "@/lib/data-service";
import { demoStore } from "@/lib/services/demo-store";
import { DEMO_PROFILES } from "@/lib/demo-seed";
import { ProfileOverviewPage } from "@/features/profile/profile-overview-page";
import { AuthProvider } from "@/features/auth/auth-context";
import { LanguageProvider } from "@/lib/i18n";

describe("Integrasi Status Pernikahan, Jumlah Tanggungan, PTKP, & Simulasi PPh 21", () => {
  beforeEach(() => {
    demoStore.profiles = structuredClone(DEMO_PROFILES);
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Logika Perhitungan PTKP & Kategori TER (UU HPP & PMK 168/2023)", () => {
    it("menghitung klasifikasi PTKP TK/0 secara akurat (Belum Menikah, 0 Tanggungan)", () => {
      const ptkp = getPtkpInfo("single", 0);
      expect(ptkp.code).toBe("TK/0");
      expect(ptkp.annualValue).toBe(54_000_000);
      expect(ptkp.monthlyValue).toBe(4_500_000);
      expect(ptkp.terCategory).toBe("A");
    });

    it("menghitung klasifikasi PTKP K/1 secara akurat (Menikah, 1 Tanggungan)", () => {
      const ptkp = getPtkpInfo("married", 1);
      expect(ptkp.code).toBe("K/1");
      expect(ptkp.annualValue).toBe(63_000_000);
      expect(ptkp.terCategory).toBe("B");
    });

    it("menghitung klasifikasi PTKP K/3 secara akurat (Menikah, 3 Tanggungan)", () => {
      const ptkp = getPtkpInfo("married", 3);
      expect(ptkp.code).toBe("K/3");
      expect(ptkp.annualValue).toBe(72_000_000);
      expect(ptkp.terCategory).toBe("C");
    });

    it("mengunci tanggungan maksimal 3 orang meskipun input lebih dari 3", () => {
      const ptkp = getPtkpInfo("married", 5);
      expect(ptkp.code).toBe("K/3");
      expect(ptkp.dependentsCount).toBe(3);
      expect(ptkp.annualValue).toBe(72_000_000);
    });

    it("menangani status duda/janda dengan tanggungan sebagai TK/2", () => {
      const ptkp = getPtkpInfo("widowed", 2);
      expect(ptkp.code).toBe("TK/2");
      expect(ptkp.annualValue).toBe(63_000_000);
      expect(ptkp.terCategory).toBe("B");
    });
  });

  describe("2. Logika Simulasi PPh 21 Tenaga Ahli / Bagi Hasil Proyek", () => {
    it("menghitung pemotongan PPh 21 dengan DPP 50% untuk penerima yang memiliki NPWP", () => {
      // Bruto Rp 10.000.000
      // DPP = 50% = Rp 5.000.000
      // Tarif Tier 1 (5% s/d 60jt): 5% x 5.000.000 = Rp 250.000
      // Netto = Rp 9.750.000
      const sim = simulatePph21NonEmployee(10_000_000, true, "single", 0);
      expect(sim.grossAmount).toBe(10_000_000);
      expect(sim.dpp).toBe(5_000_000);
      expect(sim.taxAmount).toBe(250_000);
      expect(sim.netPayout).toBe(9_750_000);
      expect(sim.effectiveRatePct).toBe(2.5);
    });

    it("menerapkan penalti tarif 20% lebih tinggi bagi penerima tanpa NPWP", () => {
      // Bruto Rp 10.000.000, DPP = Rp 5.000.000
      // Normal tax = Rp 250.000
      // Surcharge without NPWP (120%) = Rp 300.000
      // Netto = Rp 9.700.000
      const sim = simulatePph21NonEmployee(10_000_000, false, "single", 0);
      expect(sim.taxAmount).toBe(300_000);
      expect(sim.netPayout).toBe(9_700_000);
      expect(sim.effectiveRatePct).toBe(3);
    });
  });

  describe("3. Persistensi Data Profil Keuangan & Sinkronisasi", () => {
    it("menyimpan status pernikahan dan jumlah tanggungan melalui updateMyProfile", async () => {
      const targetUser = demoStore.profiles[0]!;
      setDemoCurrentUser(targetUser.id);
      sessionStorage.setItem("altcycles_demo_session_email", targetUser.email);

      const updated = await updateMyProfile({
        fullName: targetUser.full_name,
        maritalStatus: "married",
        dependentsCount: 2,
        npwp: "01.234.567.8-901.000",
      });

      expect(updated.marital_status).toBe("married");
      expect(updated.dependents_count).toBe(2);

      const merged = getMergedProfileFields(updated);
      expect(merged?.marital_status).toBe("married");
      expect(merged?.dependents_count).toBe(2);
    });
  });

  describe("4. Tampilan Ringkasan Profil Saya (/profil)", () => {
    it("menampilkan kartu status PTKP pada grid Data Keuangan & Rekening", async () => {
      const targetUser = demoStore.profiles[2]!; // Fajar Nugroho (married, 1 dependent -> K/1)
      setDemoCurrentUser(targetUser.id);
      sessionStorage.setItem("altcycles_demo_session_email", targetUser.email);

      render(
        <MemoryRouter initialEntries={["/profil"]}>
          <LanguageProvider>
            <AuthProvider>
              <ProfileOverviewPage />
            </AuthProvider>
          </LanguageProvider>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-ptkp-value")).toBeInTheDocument();
      });

      // Kartu status PTKP harus muncul dengan kode K/1 dan batas tahunan Rp63.000.000
      expect(screen.getByTestId("overview-ptkp-value")).toHaveTextContent("K/1");
      expect(screen.getByText(/Rp63\.000\.000\/th/i)).toBeInTheDocument();
      expect(screen.getByText(/TER B/i)).toBeInTheDocument();
    });
  });
});
