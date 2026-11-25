import { cachedQuery, invalidateAndNotifyDataChange } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  AuditLogRow,
  CompanyProfileRow,
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
  DocTypeCode,
  LoginMediaCategory,
  LoginMediaItemRow,
} from "@/types/database.types";
import { appendDemoAudit, demoStore, getDemoActor } from "./demo-store";
import {
  COMPANY_EXT_STORAGE_KEY,
  LOGIN_ACTIVE_CACHE_KEY,
  LOGIN_MEDIA_STORAGE_KEY,
  readLocalJson,
  writeLocalJson,
} from "./storage-helpers";

// =============================================================================
// 2. Konfigurasi Sistem, Pajak, Penomoran, & Template (Super Admin)
// =============================================================================
export async function getCompanyProfile(): Promise<CompanyProfileRow> {
  return cachedQuery("company:profile", async () => {
    const localExt = readLocalJson<Partial<CompanyProfileRow>>(COMPANY_EXT_STORAGE_KEY, {});
    if (isDemoMode || !supabase) {
      const base = structuredClone(demoStore.company);
      return {
        ...base,
        ...localExt,
        bank_accounts_json: base.bank_accounts_json ?? localExt.bank_accounts_json ?? [
          {
            bank_name: base.bank_name,
            account_number: base.bank_account_number,
            account_holder: base.bank_account_holder,
          },
        ],
      };
    }
    const { data, error } = await supabase
      .from("company_profile")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw new Error(error.message);
    return {
      ...localExt,
      ...data,
      signer_name: data.signer_name,
      signer_title: data.signer_title,
      tax_id_number: data.tax_id_number ?? localExt.tax_id_number ?? null,
      logo_storage_path: data.logo_storage_path ?? localExt.logo_storage_path ?? null,
      tagline: data.tagline ?? localExt.tagline ?? "ADAPT TODAY, INNOVATE TOMORROW",
      signing_city: data.signing_city ?? localExt.signing_city ?? "Bogor",
      telephone_fax: data.telephone_fax ?? localExt.telephone_fax ?? null,
      website: data.website ?? localExt.website ?? null,
      signer_signature_path: data.signer_signature_path ?? localExt.signer_signature_path ?? null,
      signer_paraf_path: data.signer_paraf_path ?? localExt.signer_paraf_path ?? null,
      pkp_proof_storage_path:
        data.pkp_proof_storage_path ?? localExt.pkp_proof_storage_path ?? null,
      pkp_proof_file_name:
        data.pkp_proof_file_name ?? localExt.pkp_proof_file_name ?? null,
      pkp_proof_mime_type:
        data.pkp_proof_mime_type ?? localExt.pkp_proof_mime_type ?? null,
      pkp_proof_size_bytes:
        data.pkp_proof_size_bytes ?? localExt.pkp_proof_size_bytes ?? null,
      pkp_proof_uploaded_at:
        (data as Partial<CompanyProfileRow>).pkp_proof_uploaded_at ??
        localExt.pkp_proof_uploaded_at ??
        null,
      bank_accounts_json:
        data.bank_accounts_json ??
        localExt.bank_accounts_json ?? [
          {
            bank_name: data.bank_name,
            account_number: data.bank_account_number,
            account_holder: data.bank_account_holder,
          },
        ],
      social_links_json:
        localExt.social_links_json ??
        data.social_links_json ?? [
          { platform: "Instagram", username: "@altvira.tech" },
          { platform: "LinkedIn", username: "altvira-technology" },
          { platform: "TikTok", username: "@altvira.tech" },
        ],
    };
  });
}

export interface UploadedPkpProofMetadata {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export async function uploadCompanyPkpProof(
  file: File,
): Promise<UploadedPkpProofMetadata> {
  const allowedMimes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  const extLower = (file.name.split(".").pop() || "").toLowerCase();
  const allowedExts = ["pdf", "png", "jpg", "jpeg"];

  if (
    !allowedMimes.includes((file.type || "").toLowerCase()) &&
    !allowedExts.includes(extLower)
  ) {
    throw new Error(
      "Format berkas bukti PKP tidak didukung. Gunakan PDF, JPG, atau PNG.",
    );
  }
  if (file.size <= 0) {
    throw new Error("Berkas bukti PKP kosong atau tidak valid.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran berkas bukti PKP melebihi batas maksimal 5 MB.");
  }

  const uploadedAt = new Date().toISOString();
  const resolvedMime =
    file.type ||
    (extLower === "pdf"
      ? "application/pdf"
      : extLower === "png"
        ? "image/png"
        : "image/jpeg");

  const readAsDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Gagal membaca berkas bukti PKP."));
        }
      };
      reader.onerror = () => reject(new Error("Gagal memproses berkas bukti PKP."));
      reader.readAsDataURL(file);
    });

  if (isDemoMode || !supabase) {
    const dataUrl = await readAsDataUrl();
    return {
      storagePath: dataUrl,
      fileName: file.name,
      mimeType: resolvedMime,
      sizeBytes: file.size,
      uploadedAt,
    };
  }

  const safeExt = allowedExts.includes(extLower) ? extLower : "pdf";
  const filePath = `company-pkp/pkp-proof-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from("altcycles-files")
    .upload(filePath, file, { upsert: true, contentType: resolvedMime });

  if (uploadError) {
    const fallbackUrl = await readAsDataUrl();
    return {
      storagePath: fallbackUrl,
      fileName: file.name,
      mimeType: resolvedMime,
      sizeBytes: file.size,
      uploadedAt,
    };
  }

  const { data: signedData, error: signedErr } = await supabase.storage
    .from("altcycles-files")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  const storagePath =
    !signedErr && signedData?.signedUrl
      ? signedData.signedUrl
      : await readAsDataUrl();

  return {
    storagePath,
    fileName: file.name,
    mimeType: resolvedMime,
    sizeBytes: file.size,
    uploadedAt,
  };
}

export async function updateCompanyProfile(
  patch: Partial<CompanyProfileRow>,
): Promise<CompanyProfileRow> {
  // Validasi akun sosial media jika disertakan pada patch (Item 6)
  if (patch.social_links_json !== undefined && patch.social_links_json !== null) {
    const seen = new Set<string>();
    for (const item of patch.social_links_json) {
      const platform = (item.platform || "").trim();
      const username = (item.username || "").trim();
      const url = (item.url || "").trim();
      if (!platform || !username) {
        throw new Error(
          "Setiap akun sosial media wajib memiliki platform dan username/handle.",
        );
      }
      if (url && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
        throw new Error(
          `Format URL sosial media "${url}" tidak valid. Gunakan awalan https:// atau http://.`,
        );
      }
      const dedupKey = `${platform.toLowerCase()}::${username.toLowerCase()}`;
      if (seen.has(dedupKey)) {
        throw new Error(
          `Akun sosial media duplikat terdeteksi untuk ${platform} (${username}).`,
        );
      }
      seen.add(dedupKey);
    }
  }

  const prevExt = readLocalJson<Partial<CompanyProfileRow>>(COMPANY_EXT_STORAGE_KEY, {});

  // Validasi Bukti Pengukuhan PKP wajib saat pkp_enabled diaktifkan atau disimpan sebagai aktif (Item 7)
  if (patch.pkp_enabled === true) {
    const effectiveProofPath =
      patch.pkp_proof_storage_path ??
      demoStore.company.pkp_proof_storage_path ??
      prevExt.pkp_proof_storage_path ??
      null;
    if (!effectiveProofPath || !String(effectiveProofPath).trim()) {
      throw new Error(
        "Wajib mengunggah dokumen bukti pengukuhan PKP (PDF, JPG, atau PNG maks. 5 MB) sebelum mengaktifkan status PKP.",
      );
    }
  }

  // Jika toggle PKP dimatikan (pkp_enabled = false), jangan hapus bukti lama
  const safePatch: Partial<CompanyProfileRow> = { ...patch };
  if (safePatch.pkp_enabled === false) {
    delete safePatch.pkp_proof_storage_path;
    delete safePatch.pkp_proof_file_name;
    delete safePatch.pkp_proof_mime_type;
    delete safePatch.pkp_proof_size_bytes;
    delete safePatch.pkp_proof_uploaded_at;
  }

  const extKeys: Array<keyof CompanyProfileRow> = [
    "tagline",
    "signing_city",
    "tax_id_number",
    "signer_signature_path",
    "signer_paraf_path",
    "social_links_json",
    "bank_accounts_json",
    "logo_storage_path",
    "telephone_fax",
    "website",
    "pkp_proof_storage_path",
    "pkp_proof_file_name",
    "pkp_proof_mime_type",
    "pkp_proof_size_bytes",
    "pkp_proof_uploaded_at",
  ];
  const nextExt: Partial<CompanyProfileRow> = { ...prevExt };
  for (const k of extKeys) {
    if (k in safePatch) {
      (nextExt as Record<string, unknown>)[k] = safePatch[k];
    }
  }
  writeLocalJson(COMPANY_EXT_STORAGE_KEY, nextExt);

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah konfigurasi perusahaan.");
    }
    const before = structuredClone(demoStore.company);
    demoStore.company = {
      ...demoStore.company,
      ...safePatch,
      id: 1,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    };
    appendDemoAudit(actor, "UPDATE", "company_profile", "1", before, demoStore.company);
    invalidateAndNotifyDataChange("company_profile");
    return { ...structuredClone(demoStore.company), ...nextExt };
  }

  const { data, error } = await supabase
    .from("company_profile")
    .update(safePatch)
    .eq("id", 1)
    .select("*")
    .single();
  if (!error) {
    invalidateAndNotifyDataChange("company_profile");
    return { ...nextExt, ...data };
  }

  // Fallback jika kolom baru (migrasi 0014/0015/0018/0022) belum diterapkan di database cloud
  if (error.message.includes("column") || error.message.includes("schema cache")) {
    const corePatch: Record<string, unknown> = { ...safePatch };
    delete corePatch.tagline;
    delete corePatch.signing_city;
    delete corePatch.tax_id_number;
    delete corePatch.signer_signature_path;
    delete corePatch.signer_paraf_path;
    delete corePatch.social_links_json;
    delete corePatch.bank_accounts_json;
    delete corePatch.telephone_fax;
    delete corePatch.website;
    delete corePatch.pkp_proof_storage_path;
    delete corePatch.pkp_proof_file_name;
    delete corePatch.pkp_proof_mime_type;
    delete corePatch.pkp_proof_size_bytes;
    delete corePatch.pkp_proof_uploaded_at;
    if (Object.keys(corePatch).length > 0) {
      const { data: coreData, error: coreErr } = await supabase
        .from("company_profile")
        .update(corePatch as Partial<CompanyProfileRow>)
        .eq("id", 1)
        .select("*")
        .single();
      if (coreErr) throw new Error(coreErr.message);
      invalidateAndNotifyDataChange("company_profile");
      return { ...coreData, ...nextExt };
    }
    invalidateAndNotifyDataChange("company_profile");
    return getCompanyProfile();
  }

  throw new Error(error.message);
}

export async function setJournalLockStatus(enabled: boolean): Promise<boolean> {
  demoStore.company.journal_lock_enabled = enabled;
  if (isDemoMode || !supabase) {
    invalidateAndNotifyDataChange("company_profile");
    return enabled;
  }

  // Coba update via RPC jika ada, atau fallback langsung ke update company_profile
  try {
    const { data, error } = await supabase.rpc("set_journal_lock_status", {
      p_enabled: enabled,
    });
    if (!error) {
      invalidateAndNotifyDataChange("company_profile");
      return Boolean(data ?? enabled);
    }
  } catch {
    // Abaikan dan gunakan update langsung ke company_profile
  }

  const { error: updErr } = await supabase
    .from("company_profile")
    .update({ journal_lock_enabled: enabled })
    .eq("id", 1);
  if (updErr) throw new Error(updErr.message);
  invalidateAndNotifyDataChange("company_profile");
  return enabled;
}

/**
 * Membersihkan seluruh data pengujian dan mereset pencacah nomor urut dokumen (1-Click Purge).
 * Sesuai keputusan resmi pemilik pada KONF-001 & KONF-003.
 */
export async function purgeTestData(): Promise<{ success: boolean; message: string }> {
  demoStore.counters = [];

  if (isDemoMode || !supabase) {
    invalidateAndNotifyDataChange("company_profile");
    return {
      success: true,
      message: "Nomor urut dokumen pengujian berhasil di-reset ke status awal (Belum dipakai).",
    };
  }

  try {
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: { success: boolean; message: string } | null; error: { message: string } | null }>)(
      "reset_doc_sequence_counters",
      { p_doc_type: null },
    );
    if (rpcErr || !rpcData?.success) {
      const { error: cntErr } = await supabase
        .from("doc_sequence_counters")
        .delete()
        .gte("last_number", 0);
      if (cntErr) {
        console.warn("Peringatan saat reset doc_sequence_counters:", cntErr.message);
      }
    }
  } catch (err) {
    console.warn("Exception saat reset doc_sequence_counters:", err);
  }

  invalidateAndNotifyDataChange("company_profile");
  return {
    success: true,
    message: "Nomor urut dokumen pengujian berhasil di-reset ke status awal (Belum dipakai).",
  };
}

/**
 * Mereset counter urutan penomoran dokumen kembali ke status awal (Belum dipakai / 0).
 * Jika `docType` diberikan, hanya me-reset pencacah untuk jenis dokumen tersebut.
 * Jika `docType` tidak diberikan, me-reset seluruh pencacah dokumen.
 */
export async function resetDocSequenceCounters(
  docType?: DocTypeCode,
): Promise<{ success: boolean; message: string }> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const isSuperAdmin =
      actor.role === "super_admin" || actor.roles?.includes("super_admin");
    if (!isSuperAdmin) {
      throw new Error("Hanya Super Admin yang dapat mereset urutan penomoran dokumen.");
    }
    const before = structuredClone(demoStore.counters);
    if (docType) {
      demoStore.counters = demoStore.counters.filter((c) => c.doc_type !== docType);
    } else {
      demoStore.counters = [];
    }
    appendDemoAudit(
      actor,
      "DELETE",
      "doc_sequence_counters",
      docType ?? "ALL",
      before,
      demoStore.counters,
    );
    invalidateAndNotifyDataChange("company_profile");
    return {
      success: true,
      message: docType
        ? `Urutan penomoran untuk dokumen ${docType} berhasil di-reset kembali ke status awal (Belum dipakai).`
        : "Seluruh urutan penomoran dokumen berhasil di-reset kembali ke status awal (Belum dipakai).",
    };
  }

  try {
    // 1. Coba melalui RPC SECURITY DEFINER (bypass RLS dan pasti menghapus record di Postgres)
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: { success: boolean; message: string } | null; error: { message: string } | null }>)(
      "reset_doc_sequence_counters",
      { p_doc_type: docType ?? null },
    );

    if (!rpcErr && rpcData?.success) {
      invalidateAndNotifyDataChange("company_profile");
      return {
        success: true,
        message: rpcData.message,
      };
    }

    // 2. Fallback direct delete jika RPC belum ada di database cloud
    let query = supabase.from("doc_sequence_counters").delete();
    if (docType) {
      query = query.eq("doc_type", docType);
    } else {
      query = query.gte("last_number", 0);
    }
    const { error } = await query;
    if (error) {
      console.warn("Peringatan saat reset doc_sequence_counters:", error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.warn("Exception saat reset doc_sequence_counters:", err);
    throw err;
  }

  invalidateAndNotifyDataChange("company_profile");
  return {
    success: true,
    message: docType
      ? `Urutan penomoran untuk dokumen ${docType} berhasil di-reset kembali ke status awal (Belum dipakai).`
      : "Seluruh urutan penomoran dokumen berhasil di-reset kembali ke status awal (Belum dipakai).",
  };
}

export async function setAutoClosingStatus(enabled: boolean): Promise<boolean> {
  demoStore.company.auto_closing_enabled = enabled;
  if (isDemoMode || !supabase) {
    invalidateAndNotifyDataChange("company_profile");
    return enabled;
  }

  try {
    const { error: updErr } = await supabase
      .from("company_profile")
      .update({ auto_closing_enabled: enabled })
      .eq("id", 1);
    if (!updErr) {
      invalidateAndNotifyDataChange("company_profile");
      return enabled;
    }
  } catch {
    // Abaikan jika kolom di Supabase belum dimigrasi
  }
  invalidateAndNotifyDataChange("company_profile");
  return enabled;
}

export async function setPph23EstimateStatus(enabled: boolean): Promise<boolean> {
  demoStore.company.pph_enabled = enabled;
  if (isDemoMode || !supabase) {
    invalidateAndNotifyDataChange("company_profile");
    return enabled;
  }

  const { error: updErr } = await supabase
    .from("company_profile")
    .update({ pph_enabled: enabled })
    .eq("id", 1);
  if (updErr) throw new Error(updErr.message);
  invalidateAndNotifyDataChange("company_profile");
  return enabled;
}

function isLoginMediaMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("login_media_items") &&
    (m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("could not find the table"))
  );
}

function sortLoginMedia(rows: LoginMediaItemRow[]): LoginMediaItemRow[] {
  return [...rows].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

function writeActiveLoginMediaCache(activeRows: LoginMediaItemRow[]): void {
  writeLocalJson(LOGIN_ACTIVE_CACHE_KEY, sortLoginMedia(activeRows));
}

/** Membaca cache media aktif halaman login secara sinkron agar refresh /login tampil instan tanpa kedipan grid kosong. */
export function getCachedActiveLoginMedia(): LoginMediaItemRow[] {
  const cached = sortLoginMedia(
    readLocalJson<LoginMediaItemRow[]>(LOGIN_ACTIVE_CACHE_KEY, []),
  ).filter((item) => item.is_active);
  if (cached.length > 0) return cached;
  return sortLoginMedia(
    readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []),
  ).filter((item) => item.is_active);
}

export async function listActiveLoginMedia(): Promise<LoginMediaItemRow[]> {
  return cachedQuery("login_media:active", async () => {
    const localItems = getCachedActiveLoginMedia();

    if (isDemoMode || !supabase) {
      return localItems;
    }

    try {
      const { data, error } = await supabase
        .from("login_media_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) {
        if (isLoginMediaMissingTableError(error.message)) {
          return localItems;
        }
        throw new Error(error.message);
      }
      const items = sortLoginMedia((data ?? []) as LoginMediaItemRow[]);
      writeActiveLoginMediaCache(items);
      return items;
    } catch {
      return localItems;
    }
  });
}

export async function listAllLoginMedia(): Promise<{
  items: LoginMediaItemRow[];
  usingLocalFallback: boolean;
}> {
  return cachedQuery("login_media:all", async () => {
    const localItems = sortLoginMedia(
      readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []),
    );

    if (isDemoMode || !supabase) {
      return { items: localItems, usingLocalFallback: false };
    }

    const { data, error } = await supabase
      .from("login_media_items")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      if (isLoginMediaMissingTableError(error.message)) {
        return { items: localItems, usingLocalFallback: true };
      }
      throw new Error(error.message);
    }

    const items = sortLoginMedia((data ?? []) as LoginMediaItemRow[]);
    writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, items);
    writeActiveLoginMediaCache(items.filter((x) => x.is_active));
    return { items, usingLocalFallback: false };
  });
}

export async function createLoginMediaItem(input: {
  title: string;
  subtitle?: string | null;
  category: LoginMediaCategory;
  image_url: string;
  link_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}): Promise<{ item: LoginMediaItemRow; savedToCloud: boolean }> {
  const now = new Date().toISOString();
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    category: input.category,
    image_url: input.image_url.trim(),
    link_url: input.link_url?.trim() || null,
    display_order: Math.max(1, Math.round(input.display_order ?? 1)),
    is_active: input.is_active ?? true,
  };

  const makeLocal = (): LoginMediaItemRow => ({
    id: crypto.randomUUID(),
    ...payload,
    created_by: isDemoMode ? getDemoActor().id : null,
    created_at: now,
    updated_at: now,
  });

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengelola media login.");
    }
    const created = makeLocal();
    const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
    const nextAll = sortLoginMedia([...prev, created]);
    writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
    writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
    appendDemoAudit(actor, "INSERT", "login_media_items", created.id, null, {
      ...created,
      image_url:
        created.image_url.length > 256
          ? `[MEDIA_URL_${created.image_url.length}_CHARS]`
          : created.image_url,
    });
    invalidateAndNotifyDataChange("login_media");
    return { item: created, savedToCloud: false };
  }

  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("login_media_items")
    .insert({
      ...payload,
      created_by: userRes.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      const created = makeLocal();
      const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
      const nextAll = sortLoginMedia([...prev, created]);
      writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
      writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
      invalidateAndNotifyDataChange("login_media");
      return { item: created, savedToCloud: false };
    }
    throw new Error(error.message);
  }

  const created = data as LoginMediaItemRow;
  const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
  const nextAll = sortLoginMedia([...prev.filter((x) => x.id !== created.id), created]);
  writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
  writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
  invalidateAndNotifyDataChange("login_media");
  return { item: created, savedToCloud: true };
}

export async function updateLoginMediaItem(
  id: string,
  patch: Partial<{
    title: string;
    subtitle: string | null;
    category: LoginMediaCategory;
    image_url: string;
    link_url: string | null;
    display_order: number;
    is_active: boolean;
  }>,
): Promise<{ item: LoginMediaItemRow; savedToCloud: boolean }> {
  const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
  const now = new Date().toISOString();

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengelola media login.");
    }
    const idx = prev.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error("Media tidak ditemukan.");
    const before = structuredClone(prev[idx]!);
    const updated: LoginMediaItemRow = {
      ...before,
      ...patch,
      updated_at: now,
    };
    const next = [...prev];
    next[idx] = updated;
    const sortedNext = sortLoginMedia(next);
    writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, sortedNext);
    writeActiveLoginMediaCache(sortedNext.filter((x) => x.is_active));
    appendDemoAudit(
      actor,
      "UPDATE",
      "login_media_items",
      id,
      {
        ...before,
        image_url:
          before.image_url.length > 256
            ? `[MEDIA_URL_${before.image_url.length}_CHARS]`
            : before.image_url,
      },
      {
        ...updated,
        image_url:
          updated.image_url.length > 256
            ? `[MEDIA_URL_${updated.image_url.length}_CHARS]`
            : updated.image_url,
      },
    );
    invalidateAndNotifyDataChange("login_media");
    return { item: updated, savedToCloud: false };
  }

  const { data, error } = await supabase
    .from("login_media_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx < 0) throw new Error("Media tidak ditemukan.");
      const updated: LoginMediaItemRow = {
        ...prev[idx]!,
        ...patch,
        updated_at: now,
      };
      const next = [...prev];
      next[idx] = updated;
      const sortedNext = sortLoginMedia(next);
      writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, sortedNext);
      writeActiveLoginMediaCache(sortedNext.filter((x) => x.is_active));
      invalidateAndNotifyDataChange("login_media");
      return { item: updated, savedToCloud: false };
    }
    throw new Error(error.message);
  }

  const updated = data as LoginMediaItemRow;
  const nextAll = sortLoginMedia([...prev.filter((x) => x.id !== id), updated]);
  writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
  writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
  invalidateAndNotifyDataChange("login_media");
  return { item: updated, savedToCloud: true };
}

export async function deleteLoginMediaItem(id: string): Promise<void> {
  const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat menghapus media login.");
    }
    const target = prev.find((x) => x.id === id);
    const nextAll = prev.filter((x) => x.id !== id);
    writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
    writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
    if (target) {
      appendDemoAudit(
        actor,
        "DELETE",
        "login_media_items",
        id,
        {
          ...target,
          image_url:
            target.image_url.length > 256
              ? `[MEDIA_URL_${target.image_url.length}_CHARS]`
              : target.image_url,
        },
        null,
      );
    }
    invalidateAndNotifyDataChange("login_media");
    return;
  }

  const { error } = await supabase.from("login_media_items").delete().eq("id", id);
  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      const nextAll = prev.filter((x) => x.id !== id);
      writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
      writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
      invalidateAndNotifyDataChange("login_media");
      return;
    }
    throw new Error(error.message);
  }

  const nextAll = prev.filter((x) => x.id !== id);
  writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, nextAll);
  writeActiveLoginMediaCache(nextAll.filter((x) => x.is_active));
  invalidateAndNotifyDataChange("login_media");
}

export async function listDocSequences(): Promise<{
  sequences: DocSequenceRow[];
  counters: DocSequenceCounterRow[];
}> {
  return cachedQuery("doc_sequences:list", async () => {
    if (isDemoMode || !supabase) {
      getDemoActor();
      return {
        sequences: structuredClone(demoStore.sequences),
        counters: structuredClone(demoStore.counters),
      };
    }
    const [seqRes, cntRes] = await Promise.all([
      supabase.from("doc_sequences").select("*").order("doc_type"),
      supabase.from("doc_sequence_counters").select("*"),
    ]);
    if (seqRes.error) throw new Error(seqRes.error.message);
    if (cntRes.error) throw new Error(cntRes.error.message);
    return {
      sequences: seqRes.data ?? [],
      counters: cntRes.data ?? [],
    };
  });
}

export async function updateDocSequence(
  docType: DocTypeCode,
  patch: Pick<DocSequenceRow, "prefix_pattern" | "padding_digits" | "reset_period">,
): Promise<void> {
  if (!patch.prefix_pattern.includes("{{urut}}")) {
    throw new Error("Pola penomoran wajib memuat placeholder {{urut}}.");
  }
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengatur penomoran.");
    }
    const target = demoStore.sequences.find((s) => s.doc_type === docType);
    if (!target) throw new Error("Jenis dokumen tidak ditemukan.");
    const before = structuredClone(target);
    Object.assign(target, patch, {
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    });
    appendDemoAudit(actor, "UPDATE", "doc_sequences", docType, before, target);
    invalidateAndNotifyDataChange("doc_sequences");
    return;
  }

  const { error } = await supabase
    .from("doc_sequences")
    .update(patch)
    .eq("doc_type", docType);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("doc_sequences");
}

export async function bulkUpdateDocSequencesResetPeriod(
  resetPeriod: "monthly" | "yearly" | "never",
  options?: { applyStandard2027Prefix?: boolean },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengatur penomoran.");
    }
    const before = structuredClone(demoStore.sequences);
    for (const seq of demoStore.sequences) {
      seq.reset_period = resetPeriod;
      if (options?.applyStandard2027Prefix) {
        seq.padding_digits = 4;
        if (seq.doc_type === "PRJ") {
          seq.prefix_pattern = "ALT/PRJ/{{tahun}}/{{urut}}";
        } else {
          seq.prefix_pattern = `ALT/${seq.doc_type}/{{tahun}}/{{bulan}}/{{urut}}`;
        }
      }
      seq.updated_by = actor.id;
      seq.updated_at = new Date().toISOString();
    }
    appendDemoAudit(
      actor,
      "UPDATE",
      "doc_sequences",
      "ALL",
      before,
      demoStore.sequences,
    );
    invalidateAndNotifyDataChange("doc_sequences");
    return;
  }

  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>)(
    "set_all_doc_sequences_reset_period",
    {
      p_reset_period: resetPeriod,
      p_apply_standard_2027: Boolean(options?.applyStandard2027Prefix),
    },
  );

  if (error) {
    const { data: currentSeqs } = await supabase
      .from("doc_sequences")
      .select("doc_type");
    if (currentSeqs) {
      for (const item of currentSeqs) {
        const patch: Partial<DocSequenceRow> = { reset_period: resetPeriod };
        if (options?.applyStandard2027Prefix) {
          patch.padding_digits = 4;
          patch.prefix_pattern =
            item.doc_type === "PRJ"
              ? "ALT/PRJ/{{tahun}}/{{urut}}"
              : `ALT/${item.doc_type}/{{tahun}}/{{bulan}}/{{urut}}`;
        }
        await supabase
          .from("doc_sequences")
          .update(patch)
          .eq("doc_type", item.doc_type);
      }
    }
  }
  invalidateAndNotifyDataChange("doc_sequences");
}

export async function listDocTemplates(): Promise<DocTemplateRow[]> {
  return cachedQuery("doc_templates:list", async () => {
    if (isDemoMode || !supabase) {
      getDemoActor();
      return structuredClone(demoStore.templates);
    }
    const { data, error } = await supabase
      .from("doc_templates")
      .select("*")
      .order("doc_type");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

export async function updateDocTemplate(
  docType: DocTypeCode,
  patch: Pick<DocTemplateRow, "default_placeholders" | "footer_notes">,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah template dokumen.");
    }
    const target = demoStore.templates.find((t) => t.doc_type === docType);
    if (!target) throw new Error("Template tidak ditemukan.");
    const before = structuredClone(target);
    target.default_placeholders = patch.default_placeholders;
    target.footer_notes = patch.footer_notes;
    target.version += 1;
    target.updated_by = actor.id;
    target.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "doc_templates", docType, before, target);
    invalidateAndNotifyDataChange("doc_templates");
    return;
  }

  const { error } = await supabase
    .from("doc_templates")
    .update(patch)
    .eq("doc_type", docType);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("doc_templates");
}

// =============================================================================
// 3. Audit Trail (Super Admin Read-Only) — Dioptimasi dengan Cache & Batas Baris (Item 9)
// =============================================================================
export interface ListAuditLogsOptions {
  limit?: number;
  summaryOnly?: boolean;
}

export async function listAuditLogs(
  options?: ListAuditLogsOptions,
): Promise<AuditLogRow[]> {
  const limit = Math.max(1, Math.min(1000, options?.limit ?? 300));
  const summaryOnly = Boolean(options?.summaryOnly);
  const cacheKey = `audit_logs:list:${limit}:${summaryOnly ? "summary" : "full"}`;

  return cachedQuery(cacheKey, async () => {
    if (isDemoMode || !supabase) {
      const actor = getDemoActor();
      if (actor.role !== "super_admin") {
        throw new Error("Hanya Super Admin yang dapat membaca Audit Trail.");
      }
      const sliced = demoStore.auditLogs.slice(0, limit);
      if (summaryOnly) {
        return sliced.map((row) => ({
          ...row,
          old_data: null,
          new_data: null,
        }));
      }
      return structuredClone(sliced);
    }

    if (summaryOnly) {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, actor_id, actor_role, action, entity_name, entity_id, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<Omit<AuditLogRow, "old_data" | "new_data">>).map(
        (row) => ({
          ...row,
          old_data: null,
          new_data: null,
        }),
      );
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

/**
 * Mengambil ringkasan metadata Audit Trail tanpa kolom JSONB `old_data` dan `new_data`
 * untuk kebutuhan grafik/agregasi di Dashboard Super Admin (hemat >90% ukuran payload).
 */
export async function listAuditLogsSummary(limit = 300): Promise<AuditLogRow[]> {
  return listAuditLogs({ limit, summaryOnly: true });
}
