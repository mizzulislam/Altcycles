import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  BuyerPortalLookupDto,
  ClientPurchaseOrderRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProfitSharingSchemeRow,
} from "@/types/database.types";
import {
  postDemoJournal,
  pushDemoNotification,
} from "@/lib/operations/shared";

// =============================================================================
// 8. Bagi Hasil Proyek & Alokasi Proporsional Biaya Bersama (UC-28)
// =============================================================================
export async function getProfitSharingBundle(projectId?: string): Promise<{
  schemes: ProfitSharingSchemeRow[];
  results: ProfitSharingResultRow[];
  lines: ProfitSharingLineRow[];
}> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      const myLines = demoStore.profitSharingLines.filter(
        (l) => l.recipient_user_id === actor.id,
      );
      const resIds = new Set(myLines.map((l) => l.result_id));
      return {
        schemes: [],
        results: structuredClone(
          demoStore.profitSharingResults.filter((r) => resIds.has(r.id)),
        ),
        lines: structuredClone(myLines),
      };
    }
    return {
      schemes: structuredClone(
        projectId
          ? demoStore.profitSharingSchemes.filter((s) => s.project_id === projectId)
          : demoStore.profitSharingSchemes,
      ),
      results: structuredClone(
        projectId
          ? demoStore.profitSharingResults.filter((r) => r.project_id === projectId)
          : demoStore.profitSharingResults,
      ),
      lines: structuredClone(demoStore.profitSharingLines),
    };
  }

  const [sRes, rRes, lRes] = await Promise.all([
    projectId
      ? supabase.from("profit_sharing_schemes").select("*").eq("project_id", projectId)
      : supabase.from("profit_sharing_schemes").select("*"),
    projectId
      ? supabase.from("profit_sharing_results").select("*").eq("project_id", projectId)
      : supabase.from("profit_sharing_results").select("*"),
    supabase.from("profit_sharing_lines").select("*"),
  ]);
  return {
    schemes: sRes.data ?? [],
    results: rRes.data ?? [],
    lines: lRes.data ?? [],
  };
}

export async function saveProfitSharingScheme(
  projectId: string,
  schemes: Array<{
    recipientName: string;
    recipientUserId: string | null;
    percentage: number;
  }>,
): Promise<void> {
  const sum = Number(schemes.reduce((s, x) => s + x.percentage, 0).toFixed(2));
  if (sum !== 100) {
    throw new Error(
      `Total persentase bagi hasil per proyek harus tepat 100% (saat ini: ${sum}%) (BR-10).`,
    );
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const existing = demoStore.profitSharingResults.find(
      (r) => r.project_id === projectId,
    );
    if (existing?.status === "finalized") {
      throw new Error("Bagi hasil proyek ini sudah difinalisasi dan terkunci (BR-9).");
    }
    demoStore.profitSharingSchemes = demoStore.profitSharingSchemes.filter(
      (s) => s.project_id !== projectId,
    );
    for (const s of schemes) {
      demoStore.profitSharingSchemes.push({
        id: crypto.randomUUID(),
        project_id: projectId,
        recipient_name: s.recipientName.trim(),
        recipient_user_id: s.recipientUserId,
        percentage: s.percentage,
        created_at: new Date().toISOString(),
      });
    }
    return;
  }

  const { error } = await supabase.rpc("save_profit_sharing_scheme", {
    p_project_id: projectId,
    p_schemes: schemes.map((s) => ({
      recipient_name: s.recipientName.trim(),
      recipient_user_id: s.recipientUserId ?? "",
      percentage: s.percentage,
    })),
  });
  if (error) throw new Error(error.message);
}

export async function runProjectProfitSharing(params: {
  projectId: string;
  finalize: boolean;
  postingDate: string;
  manualSharedCost?: number | null;
}): Promise<ProfitSharingResultRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const existing = demoStore.profitSharingResults.find(
      (r) => r.project_id === params.projectId,
    );
    if (existing?.status === "finalized") {
      throw new Error("Bagi hasil proyek ini sudah difinalisasi dan terkunci (BR-9).");
    }
    const schemes = demoStore.profitSharingSchemes.filter(
      (s) => s.project_id === params.projectId,
    );
    const sumPct = Number(schemes.reduce((s, x) => s + x.percentage, 0).toFixed(2));
    if (sumPct !== 100 || schemes.length === 0) {
      throw new Error("Skema bagi hasil belum lengkap 100% (BR-10).");
    }

    const postedNonClosing = new Set(
      demoStore.journals
        .filter((j) => j.status === "posted" && j.journal_type !== "closing")
        .map((j) => j.id),
    );
    let projRev = 0;
    let allRev = 0;
    let directCost = 0;
    let sharedPool = 0;

    for (const jl of demoStore.journalLines) {
      if (!postedNonClosing.has(jl.journal_id)) continue;
      const acc = demoStore.accounts.find((a) => a.id === jl.account_id);
      const j = demoStore.journals.find((x) => x.id === jl.journal_id);
      if (!acc || !j) continue;
      const effPrj = jl.project_id ?? j.project_id;

      if (acc.account_type === "revenue") {
        if (effPrj) allRev += jl.credit - jl.debit;
        if (effPrj === params.projectId) projRev += jl.credit - jl.debit;
      } else if (acc.account_type === "expense") {
        if (acc.system_tag === "shared_expense") {
          sharedPool += jl.debit - jl.credit;
        } else if (
          acc.system_tag !== "profit_sharing_expense" &&
          effPrj === params.projectId
        ) {
          directCost += jl.debit - jl.credit;
        }
      }
    }

    const allocShared =
      params.manualSharedCost != null
        ? roundRupiah(params.manualSharedCost)
        : allRev > 0 && sharedPool > 0
          ? roundRupiah((sharedPool * projRev) / allRev)
          : 0;

    const grossProfit = projRev - directCost - allocShared;
    let jrnId: string | null = null;

    if (params.finalize && grossProfit > 0) {
      const expAcc = demoStore.accounts.find(
        (a) => a.system_tag === "profit_sharing_expense",
      );
      const payAcc = demoStore.accounts.find(
        (a) => a.system_tag === "profit_sharing_payable",
      );
      if (!expAcc || !payAcc) {
        throw new Error("Akun Beban/Utang Bagi Hasil tidak ditemukan di COA.");
      }
      const j = postDemoJournal({
        journalDate: params.postingDate,
        journalType: "profit_sharing",
        description: "Finalisasi bagi hasil laba kotor proyek",
        projectId: params.projectId,
        lines: [
          {
            accountId: expAcc.id,
            projectId: params.projectId,
            debit: grossProfit,
            credit: 0,
          },
          {
            accountId: payAcc.id,
            projectId: params.projectId,
            debit: 0,
            credit: grossProfit,
          },
        ],
      });
      jrnId = j.id;
    }

    const now = new Date().toISOString();
    const resId = existing?.id ?? crypto.randomUUID();
    const resultRow: ProfitSharingResultRow = {
      id: resId,
      project_id: params.projectId,
      recognized_revenue: projRev,
      direct_cost: directCost,
      allocated_shared_cost: allocShared,
      gross_profit: grossProfit,
      status: params.finalize ? "finalized" : "draft_simulation",
      journal_id: jrnId,
      finalized_at: params.finalize ? now : null,
      finalized_by: params.finalize ? actor.id : null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    demoStore.profitSharingResults = demoStore.profitSharingResults.filter(
      (r) => r.project_id !== params.projectId,
    );
    demoStore.profitSharingResults.push(resultRow);

    demoStore.profitSharingLines = demoStore.profitSharingLines.filter(
      (l) => l.result_id !== resId,
    );

    let runningSum = 0;
    schemes.forEach((sc, idx) => {
      const share =
        grossProfit <= 0
          ? 0
          : idx === schemes.length - 1
            ? grossProfit - runningSum
            : roundRupiah((grossProfit * sc.percentage) / 100);
      runningSum += share;
      demoStore.profitSharingLines.push({
        id: crypto.randomUUID(),
        result_id: resId,
        recipient_name: sc.recipient_name,
        recipient_user_id: sc.recipient_user_id,
        percentage: sc.percentage,
        share_amount: share,
      });
    });

    if (params.finalize) {
      appendDemoAudit(
        actor,
        "FINALIZE_SHARING",
        "profit_sharing_results",
        resId,
        null,
        resultRow,
      );
    }

    return structuredClone(resultRow);
  }

  const { data, error } = await supabase.rpc("calculate_project_profit_sharing", {
    p_project_id: params.projectId,
    p_finalize: params.finalize,
    p_posting_date: params.postingDate,
    p_manual_shared_cost: params.manualSharedCost ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

// =============================================================================
// 9. Portal Pembeli Tanpa Login (UC-34..36, FR-PB1..9)
// =============================================================================
function generateRandomBuyerPoCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PO-${ym}-${suffix}`;
}

export async function publicBuyerSubmitPo(input: {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  quotationReference: string;
  items: Array<{ item: string; qty: number; price: number }>;
  turnstileToken?: string;
}): Promise<{ po_number: string; po_value: number; status: string }> {
  const poValue = input.items.reduce(
    (s, it) => s + roundRupiah(it.qty * it.price),
    0,
  );
  if (poValue <= 0) {
    throw new Error("Total nilai item PO klien harus lebih besar dari Rp0.");
  }

  if (isDemoMode || !supabase) {
    const poNumber = generateRandomBuyerPoCode();
    const now = new Date().toISOString();
    const created: ClientPurchaseOrderRow = {
      id: crypto.randomUUID(),
      po_number: poNumber,
      project_id: null,
      quotation_reference: input.quotationReference.trim() || null,
      client_name: input.clientName.trim(),
      client_company: input.clientCompany.trim() || null,
      client_email: input.clientEmail.trim(),
      client_phone: input.clientPhone.trim() || null,
      items_json: input.items.map((i) => ({
        item: i.item.trim(),
        qty: i.qty,
        price: roundRupiah(i.price),
      })),
      po_value: poValue,
      status: "pending_verification",
      verified_by: null,
      verified_at: null,
      rejection_note: null,
      attachment_path: null,
      submitted_ip_hash: "demo",
      created_at: now,
      updated_at: now,
    };
    demoStore.clientPos.unshift(created);
    for (const adm of demoStore.profiles.filter(
      (p) => p.role === "admin" && p.is_active,
    )) {
      pushDemoNotification(
        adm.id,
        `PO Klien Baru: ${poNumber}`,
        `${created.client_name} mengajukan PO senilai Rp${poValue.toLocaleString("id-ID")} (Menunggu Verifikasi).`,
        "/admin/proyek",
      );
    }
    return {
      po_number: poNumber,
      po_value: poValue,
      status: created.status,
    };
  }

  const { data, error } = await supabase.functions.invoke("buyer-submit-po", {
    body: {
      clientName: input.clientName.trim(),
      clientCompany: input.clientCompany.trim(),
      clientEmail: input.clientEmail.trim(),
      clientPhone: input.clientPhone.trim(),
      quotationReference: input.quotationReference.trim(),
      poValue,
      items: input.items,
      turnstileToken: input.turnstileToken,
    },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as { po_number: string; po_value: number; status: string };
}

export async function publicBuyerLookupPo(
  rawPoNumber: string,
): Promise<BuyerPortalLookupDto> {
  const norm = rawPoNumber.trim().toUpperCase();
  if (!norm) {
    throw new Error("Masukkan Nomor PO terlebih dahulu.");
  }

  if (isDemoMode || !supabase) {
    const cpo = demoStore.clientPos.find((c) => c.po_number === norm);
    if (!cpo) {
      throw new Error(
        "Nomor PO tidak ditemukan. Pastikan format kode PO sesuai (contoh pada Mode Lokal: PO-202611-SN8K4P).",
      );
    }

    const prj = cpo.project_id
      ? demoStore.projects.find((p) => p.id === cpo.project_id)
      : null;

    const maxPct = cpo.project_id
      ? demoStore.projectProgress
          .filter((pp) => pp.project_id === cpo.project_id)
          .reduce((m, pp) => Math.max(m, pp.cumulative_percentage), 0)
      : 0;

    const milestones = cpo.project_id
      ? demoStore.milestones
          .filter((m) => m.project_id === cpo.project_id)
          .sort((a, b) => a.sequence_no - b.sequence_no)
          .map((m) => ({
            sequence_no: m.sequence_no,
            name: m.name,
            percentage: m.percentage,
            amount: m.amount,
            status: m.status,
            achievement_criteria: m.achievement_criteria,
          }))
      : [];

    const documents: BuyerPortalLookupDto["documents"] = [];
    if (cpo.project_id) {
      for (const q of demoStore.quotations.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "Quotation",
          doc_number: q.quotation_number,
          doc_date: q.quotation_date,
          status: q.status,
        });
      }
      for (const pd of demoStore.projectDocuments.filter(
        (x) => x.project_id === cpo.project_id && x.visible_to_buyer,
      )) {
        documents.push({
          category: pd.doc_type,
          doc_number: pd.doc_number,
          doc_date: pd.created_at.slice(0, 10),
          status: pd.is_signed ? "Bertanda Tangan" : "Draf",
        });
      }
      for (const b of demoStore.progressReports.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "BAKP",
          doc_number: b.bakp_number,
          doc_date: b.bakp_date,
          status: b.status,
        });
      }
      for (const u of demoStore.uatChecklists.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "UAT",
          doc_number: u.uat_number,
          doc_date: u.test_date,
          status: u.conclusion,
        });
      }
      for (const h of demoStore.handoverReports.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "BAST",
          doc_number: h.bast_number,
          doc_date: h.bast_date,
          status: h.status,
        });
      }
      for (const i of demoStore.salesInvoices.filter(
        (x) =>
          x.project_id === cpo.project_id &&
          x.client_po_id === cpo.id &&
          x.doc_status === "issued",
      )) {
        documents.push({
          category: "Invoice",
          doc_number: i.invoice_number,
          doc_date: i.invoice_date,
          status: i.payment_status,
        });
      }
      for (const r of demoStore.receipts.filter((x) =>
        demoStore.salesInvoices.some(
          (i) => i.id === x.invoice_id && i.client_po_id === cpo.id,
        ),
      )) {
        documents.push({
          category: "Kuitansi",
          doc_number: r.receipt_number,
          doc_date: r.receipt_date,
          status: "Sah",
        });
      }
    }

    return {
      po_number: cpo.po_number,
      client_name: cpo.client_name,
      client_company: cpo.client_company,
      po_value: cpo.po_value,
      verification_status: cpo.status,
      submitted_at: cpo.created_at,
      project: prj
        ? {
            code: prj.code,
            name: prj.name,
            status: prj.status,
            start_date: prj.start_date,
            target_end_date: prj.target_end_date,
            cumulative_progress_pct: maxPct,
          }
        : null,
      milestones,
      documents,
    };
  }

  const { data, error } = await supabase.functions.invoke("buyer-portal-lookup", {
    body: { poNumber: norm },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as BuyerPortalLookupDto;
}
