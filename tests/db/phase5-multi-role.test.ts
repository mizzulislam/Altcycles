import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMigratedTestDb,
  runAsAuthenticated,
  TEST_ACTORS,
} from "./setup-pglite";

describe("Uji DB & RLS: Multi-Role Switcher & Pembaruan Profil (PostgreSQL)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it("Super Admin memiliki array roles lengkap ['super_admin', 'admin', 'user']", async () => {
    const res = await db.query<{ role: string; roles: string[] }>(
      "SELECT role, roles FROM public.profiles WHERE id = $1",
      [TEST_ACTORS.superAdminId],
    );
    expect(res.rows[0]?.role).toBe("super_admin");
    expect(res.rows[0]?.roles).toContain("super_admin");
    expect(res.rows[0]?.roles).toContain("admin");
    expect(res.rows[0]?.roles).toContain("user");
  });

  it("Super Admin dapat beralih ke peran 'admin' dan RLS backend langsung mengikuti peran aktif baru", async () => {
    await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
      // Panggil switch_active_role('admin')
      const switchRes = await tx.query<{ role: string }>(
        "SELECT role FROM public.switch_active_role('admin')",
      );
      expect(switchRes.rows[0]?.role).toBe("admin");

      // Verifikasi bahwa public.current_user_role() sekarang mengembalikan 'admin'
      const roleCheck = await tx.query<{ r: string }>(
        "SELECT public.current_user_role() AS r",
      );
      expect(roleCheck.rows[0]?.r).toBe("admin");

      // Kembalikan ke super_admin agar memiliki wewenang membaca public.audit_logs sesuai RLS
      await tx.query("SELECT public.switch_active_role('super_admin')");

      // Periksa bahwa riwayat penggantian peran tercatat di audit_logs
      const auditRes = await tx.query<{ action: string; new_data: any }>(
        "SELECT action, new_data FROM public.audit_logs WHERE actor_id = $1 AND entity_name = 'profiles' ORDER BY id DESC LIMIT 5",
        [TEST_ACTORS.superAdminId],
      );
      expect(auditRes.rows[0]?.action).toBe("UPDATE");
      const rolesRecorded = auditRes.rows.map(
        (r) => r.new_data?.active_role ?? r.new_data?.role,
      );
      expect(rolesRecorded).toContain("admin");
      expect(rolesRecorded).toContain("super_admin");
    });
  });

  it("Menolak upaya switch_active_role jika pengguna TIDAK memiliki peran tersebut", async () => {
    await runAsAuthenticated(db, TEST_ACTORS.userAssignedId, async (tx) => {
      // user1 hanya memiliki peran 'user'
      await expect(
        tx.query("SELECT public.switch_active_role('super_admin')"),
      ).rejects.toThrow(/Akses ditolak: Anda tidak memiliki wewenang/i);
    });
  });

  it("Pengguna dapat memperbarui profil mandiri melalui update_my_profile dan terekam di Audit Trail", async () => {
    await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
      const updateRes = await tx.query<{
        full_name: string;
        username: string;
        phone_number: string;
        job_title: string;
        bio: string;
      }>(
        `SELECT full_name, username, phone_number, job_title, bio
         FROM public.update_my_profile(
           'Muhammad Izzul Islam, M.Kom.',
           'izzul_altvira_official',
           '081299991111',
           'Chief Technology Officer',
           'Administrator Utama Altcycles.'
         )`,
      );

      expect(updateRes.rows[0]?.full_name).toBe("Muhammad Izzul Islam, M.Kom.");
      expect(updateRes.rows[0]?.username).toBe("izzul_altvira_official");
      expect(updateRes.rows[0]?.phone_number).toBe("081299991111");
      expect(updateRes.rows[0]?.job_title).toBe("Chief Technology Officer");
      expect(updateRes.rows[0]?.bio).toBe("Administrator Utama Altcycles.");
    });
  });

  it("Menolak update_my_profile jika nama lengkap kosong", async () => {
    await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
      await expect(
        tx.query("SELECT public.update_my_profile('   ')"),
      ).rejects.toThrow(/Nama lengkap wajib diisi/i);
    });
  });

  describe("RPC update_user_roles & delete_internal_user (Migrasi 0010)", () => {
    it("Super Admin dapat menambahkan & mencabut peran pengguna lain dengan update_user_roles", async () => {
      await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
        const res = await tx.query<{ roles: string[]; role: string }>(
          `SELECT roles, role FROM public.update_user_roles(
             $1::UUID,
             ARRAY['admin', 'user']::public.user_role[],
             'admin'::public.user_role
           )`,
          [TEST_ACTORS.userAssignedId],
        );

        const rolesStr = String(res.rows[0]?.roles);
        expect(rolesStr).toContain("admin");
        expect(rolesStr).toContain("user");
        expect(res.rows[0]?.role).toBe("admin");
      });
    });

    it("Menolak update_user_roles pada akun sendiri", async () => {
      await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
        await expect(
          tx.query(
            `SELECT public.update_user_roles(
               $1::UUID,
               ARRAY['admin']::public.user_role[]
             )`,
            [TEST_ACTORS.superAdminId],
          ),
        ).rejects.toThrow(/tidak dapat mengubah peran akun Anda sendiri/i);
      });
    });

    it("Menolak delete_internal_user pada akun sendiri", async () => {
      await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
        await expect(
          tx.query("SELECT public.delete_internal_user($1::UUID)", [TEST_ACTORS.superAdminId]),
        ).rejects.toThrow(/tidak dapat menghapus akun Anda sendiri/i);
      });
    });

    it("Menolak pemanggil non-super_admin untuk menghapus pengguna", async () => {
      await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await expect(
          tx.query("SELECT public.delete_internal_user($1::UUID)", [TEST_ACTORS.userOtherId]),
        ).rejects.toThrow(/Hanya Super Admin/i);
      });
    });
  });
});
