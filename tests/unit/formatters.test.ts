import { describe, expect, it } from "vitest";
import {
  formatDateID,
  formatRupiah,
  inferRevenueMethodFromTerms,
  roundRupiah,
  terbilangRupiah,
} from "@/lib/formatters";

describe("Utilitas Lokalisasi Indonesia & Rupiah (BR-11 & Lampiran A.0)", () => {
  it("membulatkan dan memformat mata uang Rupiah tanpa pecahan sen", () => {
    expect(roundRupiah(120_000_000.4)).toBe(120_000_000);
    expect(roundRupiah(120_000_000.6)).toBe(120_000_001);
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(30_000_000)).toBe("Rp30.000.000");
    expect(formatRupiah(120_000_000)).toBe("Rp120.000.000");
    expect(formatRupiah(-45_000_000)).toBe("-Rp45.000.000");
  });

  it("memformat tanggal ke format dd/mm/yyyy", () => {
    expect(formatDateID("2026-11-07")).toBe("07/11/2026");
    expect(formatDateID("2026-12-31")).toBe("31/12/2026");
    expect(formatDateID(null)).toBe("-");
  });

  it("mengubah nominal Rupiah menjadi kalimat terbilang Bahasa Indonesia", () => {
    expect(terbilangRupiah(0)).toBe("Nol rupiah");
    expect(terbilangRupiah(11)).toBe("Sebelas rupiah");
    expect(terbilangRupiah(1_000)).toBe("Seribu rupiah");
    expect(terbilangRupiah(30_000_000)).toBe("Tiga puluh juta rupiah");
    expect(terbilangRupiah(45_000_000)).toBe("Empat puluh lima juta rupiah");
    expect(terbilangRupiah(80_000_000)).toBe("Delapan puluh juta rupiah");
    expect(terbilangRupiah(120_000_000)).toBe(
      "Seratus dua puluh juta rupiah",
    );
  });

  it("memilih metode pengakuan pendapatan berdasarkan jumlah termin (BR-13)", () => {
    expect(inferRevenueMethodFromTerms(1)).toBe("single_term_deferral");
    expect(inferRevenueMethodFromTerms(2)).toBe("two_term_accrual");
    expect(inferRevenueMethodFromTerms(3)).toBe("progress_billing");
    expect(inferRevenueMethodFromTerms(5)).toBe("progress_billing");
  });
});

