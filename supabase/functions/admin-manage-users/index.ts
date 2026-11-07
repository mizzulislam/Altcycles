// Supabase Edge Function: admin-manage-users
// Khusus Super Admin (UC-30, FR-A3): membuat akun internal baru & mengatur status aktif/peran
// Berjalan di runtime Deno Supabase Edge Functions (Tier Gratis: 500.000 panggilan/bulan)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  action: "create_user" | "toggle_active" | "change_role";
  email?: string;
  password?: string;
  fullName?: string;
  role?: "user" | "admin" | "super_admin";
  targetUserId?: string;
  isActive?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token autentikasi tidak ditemukan." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifikasi pemanggil menggunakan JWT pengguna
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Sesi tidak sah." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", userRes.user.id)
      .single();

    if (!callerProfile || !callerProfile.is_active || callerProfile.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Akses ditolak: hanya Super Admin aktif yang dapat mengelola akun." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as CreateUserPayload;

    if (body.action === "create_user") {
      if (!body.email || !body.password || !body.fullName || !body.role) {
        return new Response(JSON.stringify({ error: "Data pembuatan pengguna belum lengkap." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName,
          role: body.role,
        },
      });

      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Gagal membuat pengguna." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient
        .from("profiles")
        .update({ created_by: callerProfile.id, role: body.role, full_name: body.fullName })
        .eq("id", created.user.id);

      return new Response(JSON.stringify({ userId: created.user.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "toggle_active" && body.targetUserId && typeof body.isActive === "boolean") {
      if (body.targetUserId === callerProfile.id && !body.isActive) {
        return new Response(
          JSON.stringify({ error: "Super Admin tidak dapat menonaktifkan akunnya sendiri." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: updErr } = await adminClient
        .from("profiles")
        .update({ is_active: body.isActive })
        .eq("id", body.targetUserId);

      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "change_role" && body.targetUserId && body.role) {
      const { error: roleErr } = await adminClient
        .from("profiles")
        .update({ role: body.role })
        .eq("id", body.targetUserId);

      if (roleErr) {
        return new Response(JSON.stringify({ error: roleErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Aksi tidak dikenali." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kesalahan internal server";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

