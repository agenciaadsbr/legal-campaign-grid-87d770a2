import { createClient } from "@supabase/supabase-js";
import { generateText } from "npm:ai";
import { corsHeaders, jsonResponse, createLovableAiGatewayProvider, defaultModelFor, CURATED_MODELS } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization" }, 401);

    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider ?? "");
    if (!CURATED_MODELS[provider]) return jsonResponse({ error: "Provider inválido" }, 400);

    const modelId = body?.model || defaultModelFor(provider);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return jsonResponse({ ok: false, error: "LOVABLE_API_KEY não configurada" }, 500);

    const gateway = createLovableAiGatewayProvider(apiKey);
    const t0 = Date.now();
    let ok = false;
    let errMsg: string | null = null;
    try {
      const r = await generateText({
        model: gateway(modelId),
        prompt: "ping",
        maxOutputTokens: 5,
      });
      ok = !!r.text || r.finishReason !== undefined;
    } catch (e) {
      errMsg = (e as Error).message;
    }
    const latency_ms = Date.now() - t0;

    // Persistir resultado em ia_config
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
