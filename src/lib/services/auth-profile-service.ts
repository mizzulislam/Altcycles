import { cachedQuery } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type { ProfileRow, PurchaseOrderRow, UserRole } from "@/types/database.types";
import { appendDemoAudit, demoStore, getDemoActor } from "./demo-store";

// =============================================================================
// 1. Profil & Manajemen Pengguna (Super Admin & Multi-Role)
// =============================================================================
export async function switchActiveRole(targetRole: UserRole): Promise<ProfileRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const allowed = actor.roles && actor.roles.length > 0 ? actor.roles : [actor.role];
    if (!allowed.includes(targetRole)) {
      throw new Error(`Akses ditolak: Anda tidak memiliki wewenang untuk peran ${targetRole}.`);
    }
    const before = structuredClone(actor);
    actor.role = targetRole;
    actor.updated_at = new Date().toISOString();
    appendDemoAudit(
      actor,
      "UPDATE",
      "profiles",
      actor.id,
      { event: "ROLE_SWITCH", old_role: before.role },
      { event: "ROLE_SWITCH", active_role: targetRole },
    );
    return structuredClone(actor);
  }

  const { data, error } = await supabase.rpc("switch_active_role", {
    p_target_role: targetRole,
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ProfileRow;
}

export async function updateMyProfile(payload: {
  fullName: string;
  username?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}): Promise<ProfileRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (!payload.fullName.trim()) {
      throw new Error("Nama lengkap wajib diisi.");
    }
    if (payload.username?.trim()) {
      const uname = payload.username.trim().toLowerCase();
      const conflict = demoStore.profiles.some(
        (p) => p.id !== actor.id && p.username?.toLowerCase() === uname,
      );
      if (conflict) {
        throw new Error(`Username "${payload.username.trim()}" sudah digunakan oleh akun lain.`);
      }
    }
    const before = structuredClone(actor);
    actor.full_name = payload.fullName.trim();
    actor.username = payload.username?.trim() || null;
    actor.phone_number = payload.phoneNumber?.trim() || null;
    actor.job_title = payload.jobTitle?.trim() || null;
    actor.bio = payload.bio?.trim() || null;
    if (payload.avatarUrl !== undefined) {
      actor.avatar_url = payload.avatarUrl ? payload.avatarUrl.trim() : null;
    }
    actor.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "profiles", actor.id, before, actor);
    return structuredClone(actor);
  }

  const { data, error } = await supabase.rpc("update_my_profile", {
    p_full_name: payload.fullName.trim(),
    p_username: payload.username?.trim() || null,
    p_phone_number: payload.phoneNumber?.trim() || null,
    p_job_title: payload.jobTitle?.trim() || null,
    p_bio: payload.bio?.trim() || null,
    p_avatar_url: payload.avatarUrl ? payload.avatarUrl.trim() : null,
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ProfileRow;
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran berkas melebihi batas maksimal 2MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
  }

  if (isDemoMode || !supabase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Gagal membaca berkas gambar."));
        }
      };
      reader.onerror = () => reject(new Error("Gagal memproses berkas avatar."));
      reader.readAsDataURL(file);
    });
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || "user";
  const ext = file.name.split(".").pop() || "png";
  const filePath = `avatars/${userId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("altcycles-files")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    // Fallback: Jika bucket belum disiapkan, ubah jadi base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(uploadError.message));
      reader.readAsDataURL(file);
    });
  }

  const { data: publicUrlData } = supabase.storage
    .from("altcycles-files")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function listProfiles(): Promise<ProfileRow[]> {
  return cachedQuery("profiles:list", async () => {
    if (isDemoMode || !supabase) {
      const actor = getDemoActor();
      if (actor.role === "user") {
        return [actor];
      }
      return [...demoStore.profiles].sort((a, b) =>
        a.full_name.localeCompare(b.full_name),
      );
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

export async function createInternalUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Akses ditolak: hanya Super Admin yang dapat membuat pengguna.");
    }
    if (
      demoStore.profiles.some(
        (p) => p.email.toLowerCase() === input.email.trim().toLowerCase(),
      )
    ) {
      throw new Error("Email pengguna sudah terdaftar.");
    }
    const now = new Date().toISOString();
    const row: ProfileRow = {
      id: crypto.randomUUID(),
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      is_active: true,
      last_login_at: null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.profiles.push(row);
    appendDemoAudit(actor, "INSERT", "profiles", row.id, null, row);
    return;
  }

  const { data, error } = await supabase.functions.invoke("admin-manage-users", {
    body: {
      action: "create_user",
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role,
    },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
}

export async function updateInternalUserRoles(
  targetUserId: string,
  roles: UserRole[],
  primaryRole?: UserRole,
): Promise<ProfileRow> {
  if (roles.length === 0) {
    throw new Error("Pengguna harus memiliki minimal satu peran aktif.");
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah peran pengguna.");
    }
    if (actor.id === targetUserId) {
      throw new Error("Anda tidak dapat mengubah peran akun Anda sendiri.");
    }
    const target = demoStore.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error("Pengguna tidak ditemukan.");

    const hadSuperAdmin =
      target.role === "super_admin" || target.roles?.includes("super_admin");
    if (hadSuperAdmin && !roles.includes("super_admin")) {
      const otherSa = demoStore.profiles.filter(
        (p) =>
          p.id !== targetUserId &&
          p.is_active &&
          (p.role === "super_admin" || p.roles?.includes("super_admin")),
      );
      if (otherSa.length === 0) {
        throw new Error("Tidak dapat mencabut hak Super Admin terakhir pada sistem.");
      }
    }

    const before = structuredClone(target);
    const newActiveRole: UserRole =
      primaryRole && roles.includes(primaryRole)
        ? primaryRole
        : roles.includes(target.role)
        ? target.role
        : roles[0]!;

    target.roles = roles;
    target.role = newActiveRole;
    target.updated_at = new Date().toISOString();

    appendDemoAudit(
      actor,
      "UPDATE",
      "profiles",
      target.id,
      { event: "USER_ROLES_UPDATED", previous_roles: before.roles || [before.role] },
      { event: "USER_ROLES_UPDATED", new_roles: roles, new_active_role: newActiveRole },
    );

    return structuredClone(target);
  }

  const { data, error } = await supabase.rpc("update_user_roles", {
    p_target_user_id: targetUserId,
    p_roles: roles,
    p_primary_role: primaryRole ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ProfileRow;
}

export async function deleteInternalUser(targetUserId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang berhak menghapus akun pengguna.");
    }
    if (actor.id === targetUserId) {
      throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
    }

    const targetIdx = demoStore.profiles.findIndex((p) => p.id === targetUserId);
    if (targetIdx === -1) throw new Error("Pengguna tidak ditemukan.");
    const target = demoStore.profiles[targetIdx]!;

    const isSa =
      target.role === "super_admin" || target.roles?.includes("super_admin");
    if (isSa) {
      const otherSa = demoStore.profiles.filter(
        (p) =>
          p.id !== targetUserId &&
          p.is_active &&
          (p.role === "super_admin" || p.roles?.includes("super_admin")),
      );
      if (otherSa.length === 0) {
        throw new Error("Tidak dapat menghapus Super Admin terakhir pada sistem.");
      }
    }

    // Periksa keterkaitan data transaksi keuangan
    const hasPo = demoStore.purchaseOrders.some(
      (po: PurchaseOrderRow) => po.created_by === targetUserId,
    );
    if (hasPo) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena tercatat dalam dokumen PO Pembelian. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasPayment = demoStore.paymentRequests.some(
      (pr) => pr.requester_id === targetUserId || pr.approver_id === targetUserId,
    );
    if (hasPayment) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena tercatat dalam pengajuan pembayaran. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasJournal = demoStore.journals.some(
      (j) => j.created_by === targetUserId,
    );
    if (hasJournal) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena telah menerbitkan ayat jurnal akuntansi. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasInvoice = demoStore.salesInvoices.some(
      (inv) => inv.created_by === targetUserId,
    );
    if (hasInvoice) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena tercatat dalam penerbitan invoice penagihan. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasProjectMember = demoStore.projectMembers.some(
      (pm) => pm.user_id === targetUserId,
    );
    if (hasProjectMember) {
      throw new Error(
        "Pengguna masih terdaftar sebagai anggota proyek aktif. Silakan cabut penugasan proyek terlebih dahulu atau pilih opsi 'Nonaktifkan'.",
      );
    }

    demoStore.profiles.splice(targetIdx, 1);
    appendDemoAudit(
      actor,
      "DELETE",
      "profiles",
      target.id,
      target,
      { event: "USER_DELETED", deleted_user_email: target.email },
    );
    return;
  }

  const { error } = await supabase.rpc("delete_internal_user", {
    p_target_user_id: targetUserId,
  });
  if (error) throw new Error(error.message);
}

export async function updateInternalUserRole(
  targetUserId: string,
  role: UserRole,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah peran.");
    }
    const target = demoStore.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error("Pengguna tidak ditemukan.");
    const before = structuredClone(target);
    target.role = role;
    target.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "profiles", target.id, before, target);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
}

export async function toggleInternalUserActive(
  targetUserId: string,
  isActive: boolean,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat menonaktifkan pengguna.");
    }
    if (actor.id === targetUserId && !isActive) {
      throw new Error("Super Admin tidak dapat menonaktifkan akunnya sendiri.");
    }
    const target = demoStore.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error("Pengguna tidak ditemukan.");
    const before = structuredClone(target);
    target.is_active = isActive;
    target.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "profiles", target.id, before, target);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
}
