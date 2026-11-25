/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { CoaAccountsPage } from "@/features/master-data/coa-accounts-page";
import {
  deleteAccount,
  demoStore,
  listAccounts,
  saveAccount,
  setDemoCurrentUser,
} from "@/lib/data-service";
import { getLocalizedTransactionDescription } from "@/lib/glossary";
import { LanguageProvider } from "@/lib/i18n";
import {
  calculatePeriodDepreciation,
  deleteFixedAsset,
  listFixedAssets,
  resetFixedAssetsMemoryStore,
  runPeriodClosingBook,
  runPeriodFixedAssetDepreciation,
  saveFixedAsset,
} from "@/lib/operations-service";

describe("Kelompok C — Item 3 dan 8 (Penyusutan Aset Tetap & Kolom Aksi Setup Akuntansi)", () => {
  const initialAccounts = structuredClone(demoStore.accounts);
  const initialPeriods = structuredClone(demoStore.periods);
  const initialJournals = structuredClone(demoStore.journals);
  const initialJournalLines = structuredClone(demoStore.journalLines);

  beforeEach(() => {
    localStorage.clear();
    demoStore.accounts = structuredClone(initialAccounts);
    demoStore.periods = structuredClone(initialPeriods);
    demoStore.journals = structuredClone(initialJournals);
    demoStore.journalLines = structuredClone(initialJournalLines);
    resetFixedAssetsMemoryStore();

    const adminUser = demoStore.profiles.find((p) => p.role === "admin");
    if (adminUser) {
      setDemoCurrentUser(adminUser.id);
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // (a) ITEM 3: Kalkulasi Penyusutan Garis Lurus & Kasus Pinggir
  // ===========================================================================
  describe("(a) Item 3 — Kalkulasi Penyusutan Aset Tetap (Bulan Penuh, Parsial, Pembulatan Akhir, Habis Susut, Dilepas, & Revisi Prospektif)", () => {
    it("menghitung penyusutan bulan penuh, bulan parsial prorata hari aktif, dan pembulatan bulan terakhir tanpa menembus nilai sisa", () => {
      // 1. Bulan penuh: Rp24.000.000, residu 0, 48 bulan -> Rp500.000/bulan
      const fullMonth = calculatePeriodDepreciation({
        acquisitionDate: "2026-07-01",
        acquisitionCost: 24_000_000,
        usefulLifeMonths: 48,
        salvageValue: 0,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 2_000_000,
        priorElapsedMonths: 4,
      });
      expect(fullMonth.isPartialMonth).toBe(false);
      expect(fullMonth.depreciationAmount).toBe(500_000);
      expect(fullMonth.accumulatedAfter).toBe(2_500_000);
      expect(fullMonth.bookValueAfter).toBe(21_500_000);
      expect(fullMonth.nextStatus).toBe("active");

      // 2. Bulan parsial (diperoleh 16 Nov 2026 pada periode 1-30 Nov 2026 = 15/30 hari aktif)
      const partialMonth = calculatePeriodDepreciation({
        acquisitionDate: "2026-11-16",
        acquisitionCost: 12_000_000,
        usefulLifeMonths: 12,
        salvageValue: 0,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 0,
        priorElapsedMonths: 0,
      });
      expect(partialMonth.isPartialMonth).toBe(true);
      expect(partialMonth.activeDays).toBe(15);
      expect(partialMonth.totalDaysInPeriod).toBe(30);
      expect(partialMonth.depreciationAmount).toBe(500_000);
      expect(partialMonth.bookValueAfter).toBe(11_500_000);

      // 3. Pembulatan bulan terakhir & klem nilai sisa:
      // Harga Rp10.000.000, Nilai Sisa Rp1.000.000 (Dasar = Rp9.000.000), Umur 7 bulan
      // Bulan 1-6 = round(9.000.000 / 7) = 1.285.714 -> 6 bulan = 7.714.284
      // Bulan ke-7 wajib menyerap sisa Rp1.285.716 agar total akumulasi tepat Rp9.000.000 dan Nilai Buku = Rp1.000.000
      const finalMonth = calculatePeriodDepreciation({
        acquisitionDate: "2026-05-01",
        acquisitionCost: 10_000_000,
        usefulLifeMonths: 7,
        salvageValue: 1_000_000,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 7_714_284,
        priorElapsedMonths: 6,
      });
      expect(finalMonth.depreciationAmount).toBe(1_285_716);
      expect(finalMonth.accumulatedAfter).toBe(9_000_000);
      expect(finalMonth.bookValueAfter).toBe(1_000_000);
      expect(finalMonth.nextStatus).toBe("fully_depreciated");
    });

    it("menangani aset yang sudah habis disusutkan, aset yang dilepas/dijual, dan perubahan umur manfaat secara prospektif (PSAK 25)", () => {
      // 1. Aset sudah habis disusutkan -> Rp0
      const fullyDepr = calculatePeriodDepreciation({
        acquisitionDate: "2022-01-01",
        acquisitionCost: 15_000_000,
        usefulLifeMonths: 36,
        salvageValue: 1_500_000,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 13_500_000,
        priorElapsedMonths: 36,
      });
      expect(fullyDepr.depreciationAmount).toBe(0);
      expect(fullyDepr.bookValueAfter).toBe(1_500_000);
      expect(fullyDepr.nextStatus).toBe("fully_depreciated");

      // 2. Aset dilepas sebelum periode dimulai -> Rp0
      const disposedBefore = calculatePeriodDepreciation({
        acquisitionDate: "2026-01-01",
        acquisitionCost: 12_000_000,
        usefulLifeMonths: 12,
        salvageValue: 0,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 9_000_000,
        disposedDate: "2026-10-15",
      });
      expect(disposedBefore.depreciationAmount).toBe(0);
      expect(disposedBefore.nextStatus).toBe("disposed");

      // 3. Aset dilepas di tengah periode (10 Nov 2026 = 10/30 hari aktif)
      const disposedMidMonth = calculatePeriodDepreciation({
        acquisitionDate: "2026-01-01",
        acquisitionCost: 18_000_000,
        usefulLifeMonths: 12, // Rp1.500.000/bulan penuh
        salvageValue: 0,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 0,
        disposedDate: "2026-11-10",
      });
      expect(disposedMidMonth.isPartialMonth).toBe(true);
      expect(disposedMidMonth.activeDays).toBe(10);
      expect(disposedMidMonth.depreciationAmount).toBe(500_000);
      expect(disposedMidMonth.nextStatus).toBe("disposed");

      // 4. Revisi prospektif umur manfaat (awal 12 bulan, sudah jalan 6 bulan dengan akum Rp6.000.000 dari Rp12.000.000,
      // lalu umur manfaat diperpanjang menjadi total 18 bulan -> sisa 12 bulan untuk sisa Rp6.000.000 = Rp500.000/bulan)
      const prospectiveRev = calculatePeriodDepreciation({
        acquisitionDate: "2026-05-01",
        acquisitionCost: 12_000_000,
        usefulLifeMonths: 18,
        salvageValue: 0,
        periodStartDate: "2026-11-01",
        periodEndDate: "2026-11-30",
        priorAccumulatedDepreciation: 6_000_000,
        priorElapsedMonths: 6,
      });
      expect(prospectiveRev.depreciationAmount).toBe(500_000);
      expect(prospectiveRev.accumulatedAfter).toBe(6_500_000);
    });
  });

  // ===========================================================================
  // (b) ITEM 3: Idempotensi Penjurnalan & Integrasi Tutup Buku + Lokalisasi
  // ===========================================================================
  describe("(b) Item 3 — Idempotensi Jurnal Penyusutan & Integrasi Tutup Buku", () => {
    it("membuat jurnal penyesuaian penyusutan secara idempoten (tidak dobel saat dijalankan ulang atau saat tutup buku) dan melokalisasi deskripsi jurnal", async () => {
      const openPeriod = demoStore.periods.find((p) => p.status === "open")!;
      expect(openPeriod).toBeDefined();

      // Eksekusi pertama pada periode terbuka
      const firstRun = await runPeriodFixedAssetDepreciation(openPeriod.id);
      expect(firstRun.postedCount).toBe(1);
      expect(firstRun.skippedCount).toBe(0);
      expect(firstRun.totalDepreciationAmount).toBe(500_000);

      // Verifikasi jurnal penyesuaian yang terbentuk: Debit 6-1401, Kredit 1-2102
      const deprJournal = demoStore.journals.find(
        (j) => j.id === firstRun.generatedJournalIds[0],
      );
      expect(deprJournal).toBeDefined();
      expect(deprJournal?.journal_type).toBe("adjustment");
      expect(deprJournal?.description).toContain("Penyusutan Aset Tetap: FA-2026-001");

      // Verifikasi lokalisasi otomatis ke Bahasa Inggris
      const localizedEn = getLocalizedTransactionDescription(
        deprJournal!.description,
        "en",
      );
      expect(localizedEn).toContain("Fixed Asset Depreciation: FA-2026-001");

      // Eksekusi kedua pada periode yang sama -> 100% idempoten, tidak ada jurnal baru!
      const journalCountAfterFirst = demoStore.journals.length;
      const secondRun = await runPeriodFixedAssetDepreciation(openPeriod.id);
      expect(secondRun.postedCount).toBe(0);
      expect(secondRun.skippedCount).toBe(1);
      expect(demoStore.journals.length).toBe(journalCountAfterFirst);

      // Tutup buku pada periode tersebut -> tidak menduplikasi jurnal penyusutan dan berhasil menutup periode
      await runPeriodClosingBook(openPeriod.id);
      expect(openPeriod.status).toBe("closed");
      const deprJournalsInPeriod = demoStore.journals.filter(
        (j) =>
          j.period_id === openPeriod.id &&
          j.description.startsWith("Penyusutan Aset Tetap: FA-2026-001"),
      );
      expect(deprJournalsInPeriod).toHaveLength(1);

      // Aset yang sudah memiliki riwayat penyusutan tidak boleh dihapus
      const { assets } = await listFixedAssets();
      await expect(deleteFixedAsset(assets[0]!.id)).rejects.toThrow(
        /sudah memiliki riwayat jurnal penyusutan/i,
      );
    });
  });

  // ===========================================================================
  // (c) ITEM 8: Kolom Aksi Bagan Akun (Ubah, Nonaktifkan/Aktifkan, Hapus Aman)
  // ===========================================================================
  describe("(c) Item 8 — Kolom Aksi Tabel Bagan Akun & Proteksi Hapus Akun Terpakai", () => {
    it("menampilkan kolom Aksi selalu tanpa tombol Edit header, mengizinkan hapus untuk akun baru tanpa transaksi, dan memblokir hapus untuk akun yang sudah terpakai di jurnal", async () => {
      // Buat 1 akun baru yang belum dipakai di jurnal
      await saveAccount({
        code: "6-1999",
        name: "Beban Eksperimen Baru",
        account_type: "expense",
        normal_balance: "debit",
        parent_id: null,
        system_tag: "none",
        cash_flow_category: "operating",
        is_postable: true,
        is_active: true,
        description: "Akun uji tanpa transaksi",
      });

      const allAccounts = await listAccounts();
      const usedAccount = allAccounts.find((a) => a.used_in_journal_count > 0)!;
      const unusedAccount = allAccounts.find((a) => a.code === "6-1999")!;
      expect(usedAccount).toBeDefined();
      expect(unusedAccount).toBeDefined();

      // Coba hapus akun yang sudah terpakai di jurnal via service -> DITOLAK (BR-19)
      await expect(deleteAccount(usedAccount.id)).rejects.toThrow(
        /sudah digunakan dalam jurnal dan tidak boleh dihapus/i,
      );

      render(
        <LanguageProvider>
          <MemoryRouter>
            <CoaAccountsPage />
          </MemoryRouter>
        </LanguageProvider>,
      );

      // Pastikan judul kolom adalah "Aksi" dan tidak ada tombol "Edit" mode di header kartu Bagan Akun
      const actionHeaders = await screen.findAllByRole("columnheader", {
        name: /^Aksi$|^Actions$/i,
      });
      expect(actionHeaders.length).toBeGreaterThanOrEqual(2);

      // Cari akun "6-1999" di kotak pencarian Bagan Akun
      const searchInput = screen.getByPlaceholderText(
        /Cari kode atau nama akun|Search account code or name/i,
      );
      fireEvent.change(searchInput, { target: { value: "6-1999" } });

      expect(await screen.findByText("6-1999")).toBeInTheDocument();

      // Tombol Hapus Akun untuk 6-1999 harus aktif (tidak disabled)
      const deleteAccBtn = screen.getByRole("button", {
        name: /Hapus Akun|Delete Account/i,
      });
      expect(deleteAccBtn).not.toBeDisabled();

      // Klik Hapus Akun -> dialog konfirmasi muncul -> konfirmasi hapus
      fireEvent.click(deleteAccBtn);
      const confirmDeleteBtn = await screen.findByRole("button", {
        name: /Ya, Hapus Akun|Yes, Delete Account/i,
      });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(async () => {
        const afterDelete = await listAccounts();
        expect(afterDelete.some((a) => a.code === "6-1999")).toBe(false);
      });

      // Sekarang filter ke akun yang sudah terpakai di jurnal (misal 1-1102 Kas di Bank)
      fireEvent.change(searchInput, { target: { value: usedAccount.code } });
      expect(await screen.findByText(usedAccount.code)).toBeInTheDocument();

      const usedDeleteBtn = screen.getByRole("button", {
        name: /Hapus Akun|Delete Account/i,
      });
      expect(usedDeleteBtn).toBeDisabled();

      // Pastikan aset baru tanpa penyusutan dapat ditambahkan dan dihapus dengan aman
      const createdAsset = await saveFixedAsset({
        asset_code: "FA-2026-099",
        asset_name: "Monitor Ultrawide Desain",
        acquisition_date: "2026-11-10",
        acquisition_cost: 6_000_000,
        useful_life_months: 24,
        salvage_value: 0,
        asset_account_id: allAccounts.find((a) => a.code === "1-2101")!.id,
        accum_depr_account_id: allAccounts.find((a) => a.code === "1-2102")!.id,
        expense_account_id: allAccounts.find((a) => a.code === "6-1401")!.id,
        status: "active",
      });
      expect(createdAsset.asset_code).toBe("FA-2026-099");
      await deleteFixedAsset(createdAsset.id);
      const afterAssetDel = await listFixedAssets();
      expect(afterAssetDel.assets.some((a) => a.id === createdAsset.id)).toBe(false);
    });
  });
});
