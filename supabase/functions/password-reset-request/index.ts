import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GENERIC_MSG =
  "Se este e-mail estiver cadastrado e ativo, enviaremos um link de recuperação.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, redirectTo } = (await req.json()) as {
      email?: string;
      redirectTo?: string;
    };
    if (!email || typeof email !== "string") {
      return json({ error: "Email obrigatório" }, 400);
    }

    const normalized = email.trim().toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Lookup profile (cadastrados em Equipe & Acessos)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id,ativo")
      .ilike("email", normalized)
      .maybeSingle();

    if (!profile) {
      // Não vaza existência
      return json({ ok: true, status: "generic", message: GENERIC_MSG });
    }

    if (profile.ativo === false) {
      return json({
        ok: false,
        status: "inactive",
        message: "Conta inativa. Entre em contato com o administrador.",
      }, 200);
    }

    // Envia recovery via anon client (Supabase dispara o email)
    const anonClient = createClient(supabaseUrl, anonKey);
    const { error } = await anonClient.auth.resetPasswordForEmail(normalized, {
      redirectTo: redirectTo || undefined,
    });
    if (error) {
      return json({ error: "Falha ao enviar recuperação" }, 500);
    }

    return json({ ok: true, status: "sent", message: GENERIC_MSG });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
