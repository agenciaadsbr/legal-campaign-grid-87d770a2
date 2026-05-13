import { createClient } from "npm:@supabase/supabase-js";
import { generateText } from "npm:ai";
import { corsHeaders, jsonResponse, getProviderClient, defaultModelFor, resolveRealModelId, CURATED_MODELS } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization" }, 401);

    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider ?? "");
    if (!CURATED_MODELS[provider]) return jsonResponse({ error: "Provider inválido" }, 400);

    const modelId = body?.model || defaultModelFor(provider);

    let client;
    try {
      client = getProviderClient(provider);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 400);
    }

    const realModel = resolveRealModelId(provider, modelId);
    const t0 = Date.now();
    let ok = false;
    let errMsg: string | null = null;
    try {
      const r = await generateText({
        model: client(realModel),
        prompt: "ping",
        maxOutputTokens: 5,
      });
      ok = !!r.text || r.finishReason !== undefined;
    } catch (e) {
      errMsg = (e as Error).message;
    }
    const latency_ms = Date.now() - t0;

    if (ok) {
      const supaUrl = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const supa = createClient(supaUrl, anon, { global: { headers: { Authorization: authHeader } } });
      await supa
        .from("ia_config")
        .update({ ultima_verificacao: new Date().toISOString(), latency_ms, modelos_disponiveis: CURATED_MODELS[provider] })
        .eq("provider", provider);
    }

    return jsonResponse({ ok, latency_ms, error: errMsg, modelos: CURATED_MODELS[provider] });
  } catch (e) {
    return jsonResponse({ ok: false, error: (e as Error).message }, 500);
  }
});
