import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  return {
    ...actual,
    isDemoMode: true,
    supabase: null,
  };
});

import {
  bulkUpdateDocSequencesResetPeriod,
  listDocSequences,
  nextDemoDocNumber,
  setDemoCurrentUser,
} from "@/lib/data-service";

describe("Pengaturan Penomoran Dokumen & Switch Reset Periode (Langkah 6)", () => {
  it("mendukung switch kebijakan reset penomoran dokumen (bulanan 2026 vs tahunan 2027) di portal Super Admin", async () => {
    setDemoCurrentUser("00000000-0000-0000-0000-000000000001");

    // 1. Set mode 2026 (bulanan)
    await bulkUpdateDocSequencesResetPeriod("monthly");
    const { sequences: seqs2026 } = await listDocSequences();
    expect(seqs2026.every((s) => s.reset_period === "monthly")).toBe(true);

    const docNumNov = nextDemoDocNumber("INV", "2026-11-15");
    expect(docNumNov).toContain("2026/11");

    // 2. Switch ke mode standar 2027 (tahunan) dengan prefix ALT/{JENIS}/{YYYY}/{MM}/{URUT4}
    await bulkUpdateDocSequencesResetPeriod("yearly", {
      applyStandard2027Prefix: true,
    });
    const { sequences: seqs2027 } = await listDocSequences();
    expect(seqs2027.every((s) => s.reset_period === "yearly")).toBe(true);
    expect(seqs2027.every((s) => s.padding_digits === 4)).toBe(true);
    expect(
      seqs2027.find((s) => s.doc_type === "INV")?.prefix_pattern,
    ).toBe("ALT/INV/{{tahun}}/{{bulan}}/{{urut}}");

    const docNum2027 = nextDemoDocNumber("INV", "2027-01-10");
    expect(docNum2027).toMatch(/^ALT\/INV\/2027\/01\/\d{4}$/);

    // 3. Kembalikan ke mode bulanan untuk konsistensi data demo
    await bulkUpdateDocSequencesResetPeriod("monthly");
    const { sequences: seqsRestored } = await listDocSequences();
    expect(seqsRestored.every((s) => s.reset_period === "monthly")).toBe(true);
  });
});
