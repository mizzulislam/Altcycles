// Supabase Edge Function: buyer-portal-lookup
// Publik tanpa login untuk Portal Pembeli (UC-35, UC-36, FR-PB4..9):
// Hanya mengembalikan DTO tersanitasi untuk SATU nomor PO yang cocok tanpa mengekspos
// proyek lain, jurnal internal, biaya vendor, maupun margin perusahaan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://altcycles.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function buildCorsHeaders(req: Request): Record<string, string> {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
  const reqOrigin = req.headers.get("Origin")?.trim() ?? "";
  const origin = allowed.includes(reqOrigin) ? reqOrigin : allowed[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface LookupRequest {
  poNumber: string;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ipHashSalt = Deno.env.get("IP_HASH_SALT") ?? "altcycles-lookup-salt";

    const body = (await req.json()) as LookupRequest;
    const poNumber = (body.poNumber ?? "").trim().toUpperCase();
    if (!poNumber) {
      return new Response(
        JSON.stringify({ error: "Nomor PO wajib diisi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const ipHash = await sha256Hex(`${ipHashSalt}:${clientIp}`);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminClient.rpc("rpc_buyer_lookup_po", {
      p_po_number: poNumber,
      p_ip_hash: ipHash,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data as {
      ok: boolean;
      code?: string;
      error?: string;
      data?: Record<string, unknown>;
    };

    if (!result.ok) {
      const httpStatus = result.code === "RATE_LIMITED" ? 429 : 404;
      return new Response(JSON.stringify({ error: result.error ?? "Nomor PO tidak ditemukan." }), {
        status: httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
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

