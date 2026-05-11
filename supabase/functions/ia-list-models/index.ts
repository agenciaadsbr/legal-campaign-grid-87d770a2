import { createClient } from "@supabase/supabase-js";
import { corsHeaders, jsonResponse, CURATED_MODELS } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization" }, 401);
    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider ?? "");
    const modelos = CURATED_MODELS[provider] ?? [];
    if (modelos.length) {
      const supaUrl = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const supa = createClient(supaUrl, anon, { global: { headers: { Authorization: authHeader } } });
      await supa.from("ia_config").update({ modelos_disponiveis: modelos }).eq("provider", provider);
    }
    return jsonResponse({ modelos });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
