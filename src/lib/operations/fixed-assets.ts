import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  readLocalJson,
  writeLocalJson,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { postDemoJournal } from "@/lib/operations/shared";
import { cachedQuery, invalidateAndNotifyDataChange } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  FixedAssetDepreciationRow,
  FixedAssetRow,
  FixedAssetStatus,
  PeriodRow,
} from "@/types/database.types";

const FIXED_ASSETS_STORAGE_KEY = "altcycles_fixed_assets_v1";
const FIXED_ASSET_DEPR_STORAGE_KEY = "altcycles_fixed_asset_depreciations_v1";

// In-memory store synchronized with localStorage for Demo & Fallback mode
let memoryFixedAssets: FixedAssetRow[] | null = null;
let memoryDepreciations: FixedAssetDepreciationRow[] | null = null;

export function ensureDefaultDepreciationAccounts(): void {
  const now = "2026-07-01T00:00:00.000Z";
  if (!demoStore.accounts.some((a) => a.code === "1-2101")) {
    demoStore.accounts.push({
      id: "acc-12101",
      code: "1-2101",
      name: "Peralatan & Perangkat Keras",
      account_type: "asset",
      normal_balance: "debit",
      parent_id: null,
      system_tag: "none",
      cash_flow_category: "investing",
      is_postable: true,
      is_active: true,
      used_in_journal_count: 0,
      description: "Aset tetap peralatan kerja dan perangkat keras komputer",
      created_by: null,
      created_at: now,
      updated_at: now,
    });
  }
  if (!demoStore.accounts.some((a) => a.code === "1-2102")) {
    demoStore.accounts.push({
      id: "acc-12102",
      code: "1-2102",
      name: "Akumulasi Penyusutan Peralatan",
      account_type: "contra_asset",
      normal_balance: "credit",
      parent_id: null,
      system_tag: "none",
      cash_flow_category: "operating",
      is_postable: true,
      is_active: true,
      used_in_journal_count: 0,
      description: "Akumulasi penyusutan peralatan dan perangkat keras",
      created_by: null,
      created_at: now,
      updated_at: now,
    });
  }
  if (!demoStore.accounts.some((a) => a.code === "6-1401")) {
    demoStore.accounts.push({
      id: "acc-61401",
      code: "6-1401",
      name: "Beban Penyusutan Peralatan",
      account_type: "expense",
      normal_balance: "debit",
      parent_id: null,
      system_tag: "shared_expense",
      cash_flow_category: "operating",
      is_postable: true,
      is_active: true,
      used_in_journal_count: 0,
      description: "Beban penyusutan bulanan aset tetap peralatan",
      created_by: null,
      created_at: now,
      updated_at: now,
    });
  }
}

// Auto-seed default depreciation accounts on module load
ensureDefaultDepreciationAccounts();

function getDefaultSeedFixedAssets(): FixedAssetRow[] {
  ensureDefaultDepreciationAccounts();
  const equipAcc = demoStore.accounts.find((a) => a.code === "1-2101");
  const accumAcc = demoStore.accounts.find((a) => a.code === "1-2102");
  const expAcc = demoStore.accounts.find((a) => a.code === "6-1401");
  if (!equipAcc || !accumAcc || !expAcc) return [];
  return [
    {
      id: "fa-seed-001",
      asset_code: "FA-2026-001",
      asset_name: "Workstation & Server Lokal Development",
      acquisition_date: "2026-07-01",
      acquisition_cost: 24_000_000,
      useful_life_months: 48,
      salvage_value: 0,
      depreciation_method: "straight_line",
      asset_account_id: equipAcc.id,
      accum_depr_account_id: accumAcc.id,
      expense_account_id: expAcc.id,
      status: "active",
      disposed_date: null,
      notes: "Perangkat server dan workstation pengembangan internal Altvira",
      created_by: null,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
  ];
}

export function getLocalFixedAssetsStore(): FixedAssetRow[] {
  ensureDefaultDepreciationAccounts();
  if (!memoryFixedAssets) {
    const stored = readLocalJson<FixedAssetRow[] | null>(FIXED_ASSETS_STORAGE_KEY, null);
    memoryFixedAssets = stored ?? getDefaultSeedFixedAssets();
  }
  return memoryFixedAssets;
}

export function setLocalFixedAssetsStore(next: FixedAssetRow[]): void {
  memoryFixedAssets = structuredClone(next);
  writeLocalJson(FIXED_ASSETS_STORAGE_KEY, memoryFixedAssets);
}

export function getLocalFixedAssetDepreciationsStore(): FixedAssetDepreciationRow[] {
  if (!memoryDepreciations) {
    memoryDepreciations = readLocalJson<FixedAssetDepreciationRow[]>(
      FIXED_ASSET_DEPR_STORAGE_KEY,
      [],
    );
  }
  return memoryDepreciations;
}

export function setLocalFixedAssetDepreciationsStore(
  next: FixedAssetDepreciationRow[],
): void {
  memoryDepreciations = structuredClone(next);
  writeLocalJson(FIXED_ASSET_DEPR_STORAGE_KEY, memoryDepreciations);
}

export function resetFixedAssetsMemoryStore(): void {
  memoryFixedAssets = null;
  memoryDepreciations = null;
  ensureDefaultDepreciationAccounts();
}

function parseIsoDateUtc(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = parseIsoDateUtc(startIso).getTime();
  const end = parseIsoDateUtc(endIso).getTime();
  if (end < start) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export interface CalculatePeriodDepreciationInput {
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLifeMonths: number;
  salvageValue: number;
  periodStartDate: string;
  periodEndDate: string;
  priorAccumulatedDepreciation: number;
  priorElapsedMonths?: number;
  status?: FixedAssetStatus;
  disposedDate?: string | null;
}

export interface CalculatePeriodDepreciationResult {
  depreciationAmount: number;
  accumulatedAfter: number;
  bookValueAfter: number;
  nextStatus: FixedAssetStatus;
  activeDays: number;
  totalDaysInPeriod: number;
  isPartialMonth: boolean;
}

/**
 * Mesin Perhitungan Penyusutan Aset Tetap Metode Garis Lurus (Straight-Line) — Item 3.
 * Menangani:
 * 1) Bulan parsial (perolehan atau pelepasan di tengah bulan secara prorata hari aktif)
 * 2) Pembulatan bulan terakhir & klem nilai sisa (Nilai Buku Bersih tidak pernah < Nilai Sisa)
 * 3) Aset yang sudah sepenuhnya disusutkan (menghasilkan Rp0)
 * 4) Aset yang dilepas/dijual sebelum atau di tengah periode
 * 5) Perubahan umur manfaat atau nilai sisa secara prospektif (PSAK 25)
 */
export function calculatePeriodDepreciation(
  input: CalculatePeriodDepreciationInput,
): CalculatePeriodDepreciationResult {
  const cost = Math.max(0, roundRupiah(input.acquisitionCost));
  const salvage = Math.max(0, Math.min(cost, roundRupiah(input.salvageValue)));
  const depreciableBase = Math.max(0, cost - salvage);
  const priorAccum = Math.max(0, roundRupiah(input.priorAccumulatedDepreciation));
  const remainingDepreciable = Math.max(0, depreciableBase - priorAccum);
  const totalDaysInPeriod = Math.max(
    1,
    diffDaysInclusive(input.periodStartDate, input.periodEndDate),
  );

  const acqDate = input.acquisitionDate.slice(0, 10);
  const pStart = input.periodStartDate.slice(0, 10);
  const pEnd = input.periodEndDate.slice(0, 10);
  const dispDate = input.disposedDate ? input.disposedDate.slice(0, 10) : null;

  // 1. Jika aset dilepas sebelum awal periode ini
  if (
    (dispDate && dispDate < pStart) ||
    (input.status === "disposed" && !dispDate)
  ) {
    return {
      depreciationAmount: 0,
      accumulatedAfter: priorAccum,
      bookValueAfter: Math.max(salvage, cost - priorAccum),
      nextStatus: "disposed",
      activeDays: 0,
      totalDaysInPeriod,
      isPartialMonth: false,
    };
  }

  // 2. Jika aset baru diperoleh setelah akhir periode ini
  if (acqDate > pEnd) {
    return {
      depreciationAmount: 0,
      accumulatedAfter: priorAccum,
      bookValueAfter: Math.max(salvage, cost - priorAccum),
      nextStatus: input.status ?? "active",
      activeDays: 0,
      totalDaysInPeriod,
      isPartialMonth: false,
    };
  }

  // 3. Jika aset sudah sepenuhnya disusutkan
  if (depreciableBase <= 0 || remainingDepreciable <= 0) {
    return {
      depreciationAmount: 0,
      accumulatedAfter: priorAccum,
      bookValueAfter: Math.max(salvage, cost - priorAccum),
      nextStatus: dispDate && dispDate <= pEnd ? "disposed" : "fully_depreciated",
      activeDays: 0,
      totalDaysInPeriod,
      isPartialMonth: false,
    };
  }

  // 4. Hitung rentang hari aktif pada periode ini
  const effectiveStart = acqDate > pStart ? acqDate : pStart;
  const effectiveEnd = dispDate && dispDate < pEnd ? dispDate : pEnd;

  if (effectiveStart > effectiveEnd) {
    return {
      depreciationAmount: 0,
      accumulatedAfter: priorAccum,
      bookValueAfter: Math.max(salvage, cost - priorAccum),
      nextStatus: dispDate && dispDate <= pEnd ? "disposed" : (input.status ?? "active"),
      activeDays: 0,
      totalDaysInPeriod,
      isPartialMonth: false,
    };
  }

  const activeDays = diffDaysInclusive(effectiveStart, effectiveEnd);
  const isPartialMonth = activeDays < totalDaysInPeriod;

  // 5. Hitung beban penyusutan bulanan penuh (mendukung revisi prospektif bila priorElapsedMonths diberikan)
  const totalLifeMonths = Math.max(1, Math.floor(input.usefulLifeMonths));
  const priorMonths = Math.max(0, input.priorElapsedMonths ?? 0);

  let fullMonthlyAmount: number;
  if (priorMonths > 0 && priorAccum > 0) {
    const remainingMonths = Math.max(1, totalLifeMonths - priorMonths);
    fullMonthlyAmount = roundRupiah(remainingDepreciable / remainingMonths);
  } else {
    fullMonthlyAmount = roundRupiah(depreciableBase / totalLifeMonths);
  }

  // 6. Hitung nominal periode ini (prorata jika bulan parsial, atau serap sisa pembulatan di bulan penuh terakhir)
  let rawAmount: number;
  const isFinalFullMonth =
    !isPartialMonth && priorMonths + 1 >= totalLifeMonths;

  if (isFinalFullMonth) {
    rawAmount = remainingDepreciable;
  } else if (isPartialMonth) {
    rawAmount = roundRupiah((fullMonthlyAmount * activeDays) / totalDaysInPeriod);
  } else {
    rawAmount = fullMonthlyAmount;
  }

  // 7. Klem agar tidak pernah melebihi sisa dasar penyusutan (Nilai Buku >= Nilai Sisa)
  const depreciationAmount = Math.max(0, Math.min(rawAmount, remainingDepreciable));
  const accumulatedAfter = priorAccum + depreciationAmount;
  const bookValueAfter = Math.max(salvage, cost - accumulatedAfter);

  const isDisposedInOrBeforePeriod = Boolean(dispDate && dispDate <= pEnd);
  const nextStatus: FixedAssetStatus = isDisposedInOrBeforePeriod
    ? "disposed"
    : accumulatedAfter >= depreciableBase
      ? "fully_depreciated"
      : "active";

  return {
    depreciationAmount,
    accumulatedAfter,
    bookValueAfter,
    nextStatus,
    activeDays,
    totalDaysInPeriod,
    isPartialMonth,
  };
}

export async function listFixedAssets(): Promise<{
  assets: FixedAssetRow[];
  depreciations: FixedAssetDepreciationRow[];
}> {
  return cachedQuery("fixed_assets:list", async () => {
    const localAssets = getLocalFixedAssetsStore();
    const localDeprs = getLocalFixedAssetDepreciationsStore();

    if (isDemoMode || !supabase) {
      const actor = getDemoActor();
      if (actor.role === "user") {
        throw new Error("Akses ditolak: Hanya Bendahara dan Super Admin yang dapat melihat Register Aset Tetap.");
      }
      return {
        assets: structuredClone(localAssets).sort((a, b) =>
          a.asset_code.localeCompare(b.asset_code),
        ),
        depreciations: structuredClone(localDeprs),
      };
    }

    const [aRes, dRes] = await Promise.all([
      supabase.from("fixed_assets").select("*").order("asset_code", { ascending: true }),
      supabase.from("fixed_asset_depreciations").select("*"),
    ]);

    if (aRes.error || dRes.error) {
      return {
        assets: structuredClone(localAssets).sort((a, b) =>
          a.asset_code.localeCompare(b.asset_code),
        ),
        depreciations: structuredClone(localDeprs),
      };
    }

    return {
      assets: (aRes.data as FixedAssetRow[]) ?? [],
      depreciations: (dRes.data as FixedAssetDepreciationRow[]) ?? [],
    };
  });
}

export async function saveFixedAsset(
  input: Omit<
    FixedAssetRow,
    "id" | "created_at" | "updated_at" | "created_by" | "depreciation_method"
  > & {
    id?: string;
    depreciation_method?: "straight_line";
  },
): Promise<FixedAssetRow> {
  if (!input.asset_code.trim() || !input.asset_name.trim()) {
    throw new Error("Kode aset dan nama aset tetap wajib diisi.");
  }
  if (input.acquisition_cost < 0) {
    throw new Error("Harga perolehan aset tetap tidak boleh negatif.");
  }
  if (input.salvage_value < 0 || input.salvage_value > input.acquisition_cost) {
    throw new Error("Nilai sisa (residu) harus berada di antara Rp0 hingga Harga Perolehan.");
  }
  if (!Number.isFinite(input.useful_life_months) || input.useful_life_months < 1) {
    throw new Error("Umur manfaat aset tetap minimal 1 bulan.");
  }

  const assets = getLocalFixedAssetsStore();
  const deprs = getLocalFixedAssetDepreciationsStore();
  const now = new Date().toISOString();

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Bendahara (Admin) yang dapat mengelola Register Aset Tetap.");
    }

    if (input.id) {
      const target = assets.find((a) => a.id === input.id);
      if (!target) throw new Error("Aset tetap tidak ditemukan.");

      const duplicateCode = assets.some(
        (a) =>
          a.id !== input.id &&
          a.asset_code.trim().toLowerCase() === input.asset_code.trim().toLowerCase(),
      );
      if (duplicateCode) {
        throw new Error(`Kode aset ${input.asset_code} sudah digunakan.`);
      }

      // Hitung akumulasi penyusutan yang sudah terposting untuk menentukan apakah status perlu disesuaikan
      const postedAccum = deprs
        .filter((d) => d.asset_id === target.id)
        .reduce((sum, d) => sum + d.depreciation_amount, 0);
      const nextCost = roundRupiah(input.acquisition_cost);
      const nextSalvage = roundRupiah(input.salvage_value);
      const nextDepreciableBase = Math.max(0, nextCost - nextSalvage);

      const before = structuredClone(target);
      const resolvedStatus: FixedAssetStatus =
        input.status === "disposed" || input.disposed_date
          ? "disposed"
          : postedAccum >= nextDepreciableBase && nextDepreciableBase > 0
            ? "fully_depreciated"
            : "active";

      Object.assign(target, {
        ...input,
        asset_code: input.asset_code.trim(),
        asset_name: input.asset_name.trim(),
        acquisition_cost: nextCost,
        salvage_value: nextSalvage,
        useful_life_months: Math.floor(input.useful_life_months),
        depreciation_method: "straight_line" as const,
        status: resolvedStatus,
        disposed_date: input.disposed_date || null,
        notes: input.notes?.trim() || null,
        updated_at: now,
      });
      setLocalFixedAssetsStore(assets);
      appendDemoAudit(actor, "UPDATE", "fixed_assets", target.id, before, target);
      invalidateAndNotifyDataChange("accounts");
      return structuredClone(target);
    }

    if (
      assets.some(
        (a) => a.asset_code.trim().toLowerCase() === input.asset_code.trim().toLowerCase(),
      )
    ) {
      throw new Error(`Kode aset ${input.asset_code} sudah digunakan.`);
    }

    const created: FixedAssetRow = {
      id: crypto.randomUUID(),
      asset_code: input.asset_code.trim(),
      asset_name: input.asset_name.trim(),
      acquisition_date: input.acquisition_date,
      acquisition_cost: roundRupiah(input.acquisition_cost),
      useful_life_months: Math.floor(input.useful_life_months),
      salvage_value: roundRupiah(input.salvage_value),
      depreciation_method: "straight_line",
      asset_account_id: input.asset_account_id,
      accum_depr_account_id: input.accum_depr_account_id,
      expense_account_id: input.expense_account_id,
      status: input.disposed_date ? "disposed" : input.status ?? "active",
      disposed_date: input.disposed_date || null,
      notes: input.notes?.trim() || null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    assets.push(created);
    setLocalFixedAssetsStore(assets);
    appendDemoAudit(actor, "INSERT", "fixed_assets", created.id, null, created);
    invalidateAndNotifyDataChange("accounts");
    return structuredClone(created);
  }

  const payload = {
    asset_code: input.asset_code.trim(),
    asset_name: input.asset_name.trim(),
    acquisition_date: input.acquisition_date,
    acquisition_cost: roundRupiah(input.acquisition_cost),
    useful_life_months: Math.floor(input.useful_life_months),
    salvage_value: roundRupiah(input.salvage_value),
    depreciation_method: "straight_line" as const,
    asset_account_id: input.asset_account_id,
    accum_depr_account_id: input.accum_depr_account_id,
    expense_account_id: input.expense_account_id,
    status: input.disposed_date ? ("disposed" as const) : (input.status ?? "active"),
    disposed_date: input.disposed_date || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { data, error } = await (supabase as unknown as {
      from: (tbl: string) => {
        update: (vals: unknown) => {
          eq: (col: string, val: unknown) => {
            select: (cols: string) => {
              single: () => Promise<{ data: unknown; error: { message: string } | null }>;
            };
          };
        };
      };
    })
      .from("fixed_assets")
      .update({ ...payload, updated_at: now })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) {
      // Fallback ke store lokal bila tabel cloud belum dimigrasi
      const idx = assets.findIndex((a) => a.id === input.id);
      if (idx >= 0) {
        assets[idx] = { ...assets[idx]!, ...payload, updated_at: now };
        setLocalFixedAssetsStore(assets);
        invalidateAndNotifyDataChange("accounts");
        return structuredClone(assets[idx]!);
      }
      throw new Error(error.message);
    }
    invalidateAndNotifyDataChange("accounts");
    return data as FixedAssetRow;
  }

  const { data, error } = await (supabase as unknown as {
    from: (tbl: string) => {
      insert: (vals: unknown) => {
        select: (cols: string) => {
          single: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("fixed_assets")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    const fallbackCreated: FixedAssetRow = {
      id: crypto.randomUUID(),
      ...payload,
      created_by: null,
      created_at: now,
      updated_at: now,
    };
    assets.push(fallbackCreated);
    setLocalFixedAssetsStore(assets);
    invalidateAndNotifyDataChange("accounts");
    return structuredClone(fallbackCreated);
  }
  invalidateAndNotifyDataChange("accounts");
  return data as FixedAssetRow;
}

export async function deleteFixedAsset(assetId: string): Promise<void> {
  const assets = getLocalFixedAssetsStore();
  const deprs = getLocalFixedAssetDepreciationsStore();

  if (deprs.some((d) => d.asset_id === assetId)) {
    throw new Error(
      "Aset tetap sudah memiliki riwayat jurnal penyusutan terposting dan tidak dapat dihapus. Gunakan status Dilepas (Disposed) jika aset sudah tidak digunakan.",
    );
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Bendahara (Admin) yang dapat menghapus Aset Tetap.");
    }
    const idx = assets.findIndex((a) => a.id === assetId);
    if (idx === -1) throw new Error("Aset tetap tidak ditemukan.");
    const before = structuredClone(assets[idx]!);
    assets.splice(idx, 1);
    setLocalFixedAssetsStore(assets);
    appendDemoAudit(actor, "DELETE", "fixed_assets", assetId, before, null);
    invalidateAndNotifyDataChange("accounts");
    return;
  }

  const { error } = await supabase.from("fixed_assets").delete().eq("id", assetId);
  if (error) {
    const idx = assets.findIndex((a) => a.id === assetId);
    if (idx >= 0) {
      assets.splice(idx, 1);
      setLocalFixedAssetsStore(assets);
      invalidateAndNotifyDataChange("accounts");
      return;
    }
    throw new Error(error.message);
  }
  invalidateAndNotifyDataChange("accounts");
}

export interface RunPeriodDepreciationSummary {
  periodId: string;
  periodName: string;
  postedCount: number;
  skippedCount: number;
  totalDepreciationAmount: number;
  generatedJournalIds: string[];
}

/**
 * Menjalankan penyusutan otomatis untuk seluruh aset tetap yang memenuhi syarat pada suatu periode.
 * 100% Idempoten: jika suatu aset sudah memiliki catatan penyusutan atau jurnal penyusutan pada
 * `(asset_id, period_id)` yang sama, aset tersebut dilewati dan tidak akan membuat jurnal ganda.
 */
export async function runPeriodFixedAssetDepreciation(
  periodId: string,
): Promise<RunPeriodDepreciationSummary> {
  const assets = getLocalFixedAssetsStore();
  const deprs = getLocalFixedAssetDepreciationsStore();

  const period: PeriodRow | undefined = demoStore.periods.find((p) => p.id === periodId);
  if (!period) {
    throw new Error("Periode akuntansi tidak ditemukan.");
  }
  if (period.status === "closed") {
    throw new Error(
      `Periode ${period.name} sudah ditutup.Penyusutan tidak dapat diposting ke periode tertutup.`,
    );
  }

  const actor = getDemoActor();
  if (actor.role !== "admin") {
    throw new Error("Hanya Bendahara (Admin) yang dapat menjalankan penyusutan aset tetap.");
  }

  let postedCount = 0;
  let skippedCount = 0;
  let totalDepreciationAmount = 0;
  const generatedJournalIds: string[] = [];

  // Urutkan periode secara kronologis untuk menghitung akumulasi sebelumnya
  const periodsById = new Map(demoStore.periods.map((p) => [p.id, p]));

  for (const asset of assets) {
    // 1. Cek idempotensi: apakah sudah ada jadwal penyusutan atau jurnal penyusutan pada periode ini?
    const existingRecord = deprs.find(
      (d) => d.asset_id === asset.id && d.period_id === period.id,
    );
    const expectedDescPrefix = `Penyusutan Aset Tetap: ${asset.asset_code} -`;
    const existingJournal = demoStore.journals.find(
      (j) =>
        j.period_id === period.id &&
        j.status === "posted" &&
        j.journal_type === "adjustment" &&
        j.description.startsWith(expectedDescPrefix),
    );

    if (existingRecord || existingJournal) {
      skippedCount++;
      continue;
    }

    // 2. Hitung akumulasi penyusutan & jumlah bulan yang sudah disusutkan sebelum periode ini
    const priorRecords = deprs.filter((d) => {
      if (d.asset_id !== asset.id) return false;
      const recPeriod = periodsById.get(d.period_id);
      if (!recPeriod) return true;
      return recPeriod.end_date < period.start_date;
    });

    const priorAccum = priorRecords.reduce(
      (sum, r) => sum + r.depreciation_amount,
      0,
    );
    const priorElapsedMonths = priorRecords.length;

    const calc = calculatePeriodDepreciation({
      acquisitionDate: asset.acquisition_date,
      acquisitionCost: asset.acquisition_cost,
      usefulLifeMonths: asset.useful_life_months,
      salvageValue: asset.salvage_value,
      periodStartDate: period.start_date,
      periodEndDate: period.end_date,
      priorAccumulatedDepreciation: priorAccum,
      priorElapsedMonths,
      status: asset.status,
      disposedDate: asset.disposed_date,
    });

    if (calc.depreciationAmount <= 0) {
      if (asset.status !== calc.nextStatus) {
        asset.status = calc.nextStatus;
        asset.updated_at = new Date().toISOString();
      }
      skippedCount++;
      continue;
    }

    const headerDescription = `Penyusutan Aset Tetap: ${asset.asset_code} - ${asset.asset_name} (${period.name})`;
    const creditLineDescription = `Akumulasi Penyusutan: ${asset.asset_code} - ${asset.asset_name} (${period.name})`;

    const createdJournal = postDemoJournal({
      journalDate: period.end_date,
      journalType: "adjustment",
      description: headerDescription,
      projectId: null,
      lines: [
        {
          accountId: asset.expense_account_id,
          description: headerDescription,
          debit: calc.depreciationAmount,
          credit: 0,
        },
        {
          accountId: asset.accum_depr_account_id,
          description: creditLineDescription,
          debit: 0,
          credit: calc.depreciationAmount,
        },
      ],
    });

    const deprRecord: FixedAssetDepreciationRow = {
      id: crypto.randomUUID(),
      asset_id: asset.id,
      period_id: period.id,
      journal_id: createdJournal.id,
      depreciation_amount: calc.depreciationAmount,
      accumulated_after: calc.accumulatedAfter,
      book_value_after: calc.bookValueAfter,
      created_at: new Date().toISOString(),
    };
    deprs.push(deprRecord);

    asset.status = calc.nextStatus;
    asset.updated_at = new Date().toISOString();

    postedCount++;
    totalDepreciationAmount += calc.depreciationAmount;
    generatedJournalIds.push(createdJournal.id);
  }

  setLocalFixedAssetsStore(assets);
  setLocalFixedAssetDepreciationsStore(deprs);
  invalidateAndNotifyDataChange("journals");
  invalidateAndNotifyDataChange("accounts");

  return {
    periodId: period.id,
    periodName: period.name,
    postedCount,
    skippedCount,
    totalDepreciationAmount,
    generatedJournalIds,
  };
}
