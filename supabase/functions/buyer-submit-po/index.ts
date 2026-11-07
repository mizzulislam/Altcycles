// Supabase Edge Function: buyer-submit-po
// Publik tanpa login untuk Portal Pembeli (UC-34, FR-PB1..3, FR-PB7, BR-18):
// 1. Memverifikasi token anti-bot Cloudflare Turnstile di sisi server
// 2. Melakukan hash SHA-256 pada IP pengakses untuk pembatasan laju (rate limit) tanpa menyimpan IP mentah
// 3. Memanggil RPC rpc_buyer_submit_po melalui service_role (kunci tabel tetap tertutup dari anon)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitPoRequest {
  clientName: string;
  clientCompany?: string;
  clientEmail: string;
  clientPhone?: string;
  quotationReference?: string;
  poValue: number;
  items: Array<{ item: string; qty: number; price: number }>;
  turnstileToken?: string;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
    const ipHashSalt = Deno.env.get("IP_HASH_SALT") ?? "altcycles-po-salt";

    const body = (await req.json()) as SubmitPoRequest;

    if (
      !body.clientName ||
      body.clientName.trim().length < 2 ||
      !body.clientEmail ||
      !body.clientEmail.includes("@") ||
      !Number.isFinite(body.poValue) ||
      body.poValue <= 0
    ) {
      return new Response(
        JSON.stringify({ error: "Data identitas klien atau nilai PO tidak valid." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    // Verifikasi Cloudflare Turnstile apabila TURNSTILE_SECRET_KEY terkonfigurasi di server
    if (turnstileSecret) {
      if (!body.turnstileToken) {
        return new Response(
          JSON.stringify({ error: "Verifikasi keamanan Turnstile wajib dilengkapi." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const formData = new FormData();
      formData.append("secret", turnstileSecret);
      formData.append("response", body.turnstileToken);
      formData.append("remoteip", clientIp);

      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body: formData },
      );
      const verifyJson = (await verifyRes.json()) as { success?: boolean };
      if (!verifyJson.success) {
        return new Response(
          JSON.stringify({ error: "Verifikasi anti-bot gagal. Silakan muat ulang halaman." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const ipHash = await sha256Hex(`${ipHashSalt}:${clientIp}`);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminClient.rpc("rpc_buyer_submit_po", {
      p_client_name: body.clientName.trim(),
      p_client_company: body.clientCompany?.trim() ?? "",
      p_client_email: body.clientEmail.trim(),
      p_client_phone: body.clientPhone?.trim() ?? "",
      p_quotation_reference: body.quotationReference?.trim() ?? "",
      p_po_value: Math.round(body.poValue),
      p_items: body.items ?? [],
      p_ip_hash: ipHash,
    });

    if (error) {
      const status = error.message.includes("Batas laju") ? 429 : 400;
      return new Response(JSON.stringify({ error: error.message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
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

