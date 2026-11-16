import { cachedQuery, invalidateAndNotifyDataChange } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type { AccountRow, PeriodRow } from "@/types/database.types";
import { appendDemoAudit, demoStore, getDemoActor } from "./demo-store";

// =============================================================================
// 4. Bagan Akun / COA (Admin Kelola, Super Admin Baca)
// =============================================================================
export async function listAccounts(): Promise<AccountRow[]> {
  return cachedQuery("accounts:list", async () => {
    if (isDemoMode || !supabase) {
      const actor = getDemoActor();
      if (actor.role === "user") {
        return demoStore.accounts.filter(
          (a) => a.is_active && a.account_type === "expense",
        );
      }
      return [...demoStore.accounts].sort((a, b) => a.code.localeCompare(b.code));
    }
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

export async function saveAccount(
  input: Omit<
    AccountRow,
    "id" | "created_at" | "updated_at" | "used_in_journal_count" | "created_by"
  > & { id?: string },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengelola Bagan Akun.");
    }
    const now = new Date().toISOString();
    if (input.id) {
      const target = demoStore.accounts.find((a) => a.id === input.id);
      if (!target) throw new Error("Akun tidak ditemukan.");
      const before = structuredClone(target);
      Object.assign(target, input, { updated_at: now });
      appendDemoAudit(actor, "UPDATE", "accounts", target.id, before, target);
    } else {
      if (demoStore.accounts.some((a) => a.code === input.code.trim())) {
        throw new Error(`Kode akun ${input.code} sudah digunakan.`);
      }
      const created: AccountRow = {
        ...input,
        id: crypto.randomUUID(),
        code: input.code.trim(),
        name: input.name.trim(),
        used_in_journal_count: 0,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      };
      demoStore.accounts.push(created);
      appendDemoAudit(actor, "INSERT", "accounts", created.id, null, created);
    }
    invalidateAndNotifyDataChange("accounts");
    return;
  }

  if (input.id) {
    const { id, ...patch } = input;
    const { error } = await supabase.from("accounts").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("accounts").insert({
      ...input,
      created_by: null,
    });
    if (error) throw new Error(error.message);
  }
  invalidateAndNotifyDataChange("accounts");
}

export async function deleteAccount(accountId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus akun.");
    }
    const idx = demoStore.accounts.findIndex((a) => a.id === accountId);
    const target = demoStore.accounts[idx];
    if (!target) throw new Error("Akun tidak ditemukan.");
    if (target.used_in_journal_count > 0) {
      throw new Error(
        `Akun ${target.code} (${target.name}) sudah digunakan dalam jurnal dan tidak boleh dihapus; silakan nonaktifkan akun tersebut (BR-19).`,
      );
    }
    demoStore.accounts.splice(idx, 1);
    appendDemoAudit(actor, "DELETE", "accounts", target.id, target, null);
    invalidateAndNotifyDataChange("accounts");
    return;
  }

  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("accounts");
}

// =============================================================================
// 5. Periode Akuntansi (Admin)
// =============================================================================
const NAMA_BULAN = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function listPeriods(): Promise<PeriodRow[]> {
  return cachedQuery("periods:list", async () => {
    if (isDemoMode || !supabase) {
      getDemoActor();
      return [...demoStore.periods].sort(
        (a, b) => b.year - a.year || b.month - a.month,
      );
    }
    const { data, error } = await supabase
      .from("periods")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

export async function createPeriod(year: number, month: number): Promise<void> {
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const name = `${NAMA_BULAN[month] ?? mm} ${year}`;

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat membuat periode akuntansi.");
    }
    if (demoStore.periods.some((p) => p.year === year && p.month === month)) {
      throw new Error(`Periode ${name} sudah ada.`);
    }
    const now = new Date().toISOString();
    const created: PeriodRow = {
      id: crypto.randomUUID(),
      year,
      month,
      name,
      start_date: startDate,
      end_date: endDate,
      status: "open",
      closed_at: null,
      closed_by: null,
      reopened_at: null,
      reopened_by: null,
      reopen_reason: null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.periods.push(created);
    appendDemoAudit(actor, "INSERT", "periods", created.id, null, created);
    invalidateAndNotifyDataChange("periods");
    return;
  }

  const { error } = await supabase.from("periods").insert({
    year,
    month,
    name,
    start_date: startDate,
    end_date: endDate,
  });
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("periods");
}

export async function closePeriod(periodId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menutup periode akuntansi.");
    }
    const target = demoStore.periods.find((p) => p.id === periodId);
    if (!target) throw new Error("Periode tidak ditemukan.");
    const before = structuredClone(target);
    target.status = "closed";
    target.closed_at = new Date().toISOString();
    target.closed_by = actor.id;
    appendDemoAudit(actor, "CLOSE_PERIOD", "periods", target.id, before, target);
    invalidateAndNotifyDataChange("periods");
    return;
  }

  const { error } = await supabase.rpc("close_accounting_period", {
    p_period_id: periodId,
  });
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("periods");
}

export async function reopenPeriod(
  periodId: string,
  reason: string,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat membuka kembali periode tertutup.");
    }
    if (reason.trim().length < 5) {
      throw new Error("Alasan pembukaan kembali wajib diisi minimal 5 karakter.");
    }
    const target = demoStore.periods.find((p) => p.id === periodId);
    if (!target) throw new Error("Periode tidak ditemukan.");
    const before = structuredClone(target);
    target.status = "open";
    target.reopened_at = new Date().toISOString();
    target.reopened_by = actor.id;
    target.reopen_reason = reason.trim();
    appendDemoAudit(actor, "REOPEN_PERIOD", "periods", target.id, before, target);
    invalidateAndNotifyDataChange("periods");
    return;
  }

  const { error } = await supabase.rpc("reopen_accounting_period", {
    p_period_id: periodId,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("periods");
}

export async function deletePeriod(periodId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus periode akuntansi.");
    }
    const targetIdx = demoStore.periods.findIndex((p) => p.id === periodId);
    if (targetIdx === -1) throw new Error("Periode tidak ditemukan.");
    const target = demoStore.periods[targetIdx]!;
    const hasJournals = demoStore.journals.some((j) => j.period_id === periodId);
    if (hasJournals) {
      throw new Error("Tidak dapat menghapus periode yang sudah memiliki transaksi jurnal.");
    }
    const before = structuredClone(target);
    demoStore.periods.splice(targetIdx, 1);
    appendDemoAudit(actor, "DELETE", "periods", target.id, before, null);
    invalidateAndNotifyDataChange("periods");
    return;
  }

  const { count, error: cntError } = await supabase
    .from("journals")
    .select("id", { count: "exact", head: true })
    .eq("period_id", periodId);
  if (cntError) throw new Error(cntError.message);
  if (count && count > 0) {
    throw new Error("Tidak dapat menghapus periode yang sudah memiliki transaksi jurnal.");
  }

  const { error } = await supabase.from("periods").delete().eq("id", periodId);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("periods");
}
