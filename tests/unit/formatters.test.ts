import { describe, expect, it } from "vitest";
import {
  DOC_EMPTY_CELL,
  formatDateID,
  formatDocDateLong,
  formatDocEmpty,
  formatDocRupiah,
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

  describe("Standar Dokumen Altvira (docs/standar-dokumen.md & Keputusan Konflik 6)", () => {
    it("formatDocDateLong: memformat tanggal dengan nama bulan lengkap bahasa Indonesia", () => {
      expect(formatDocDateLong("2026-10-14")).toBe("14 Oktober 2026");
      expect(formatDocDateLong("2026-11-01")).toBe("1 November 2026");
      expect(formatDocDateLong("2026-12-31")).toBe("31 Desember 2026");
      expect(formatDocDateLong(new Date(2026, 4, 20))).toBe("20 Mei 2026");
      expect(formatDocDateLong(null)).toBe("–");
      expect(formatDocDateLong("")).toBe("–");
      expect(formatDocDateLong("invalid-date")).toBe("–");
    });

    it("formatDocRupiah: memformat nominal bulat tanpa desimal dan pecahan sen dengan desimal lengkap", () => {
      // Nilai bulat / pecahan ,00 ditulis dengan pembulatan
      expect(formatDocRupiah(1_234_567)).toBe("Rp1.234.567");
      expect(formatDocRupiah(120_000_000)).toBe("Rp120.000.000");
      expect(formatDocRupiah(0)).toBe("Rp0");
      expect(formatDocRupiah(-500_000)).toBe("-Rp500.000");

      // Nilai pecahan yang bernilai sen (,01 s/d ,99) ditulis lengkap dengan desimal koma
      expect(formatDocRupiah(1_234_567.5)).toBe("Rp1.234.567,50");
      expect(formatDocRupiah(1_234_567.25)).toBe("Rp1.234.567,25");
      expect(formatDocRupiah(1_234_567.05)).toBe("Rp1.234.567,05");
      expect(formatDocRupiah(1_065_987.39)).toBe("Rp1.065.987,39");
      expect(formatDocRupiah(-25_000.75)).toBe("-Rp25.000,75");
    });

    it("formatDocEmpty & DOC_EMPTY_CELL: menghasilkan tanda en-dash resmi", () => {
      expect(DOC_EMPTY_CELL).toBe("–");
      expect(formatDocEmpty(null)).toBe("–");
      expect(formatDocEmpty(undefined)).toBe("–");
      expect(formatDocEmpty("")).toBe("–");
      expect(formatDocEmpty("   ")).toBe("–");
      expect(formatDocEmpty("Ada Isi")).toBe("Ada Isi");
      expect(formatDocEmpty(123)).toBe("123");
    });
  });
});

