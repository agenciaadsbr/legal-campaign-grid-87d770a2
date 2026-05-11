import { createClient } from "@supabase/supabase-js";
import { generateText } from "npm:ai@^5.0.0";
import { corsHeaders, jsonResponse, createLovableAiGatewayProvider, defaultModelFor, estimateCost } from "../_shared/ai-gateway.ts";

const PROMPTS_DEFAULT: Record<string, string> = {
  resumo_cliente:
    "Você é um assistente que escreve resumos curtos de reuniões para enviar ao cliente, no estilo ata. Use tom profissional e direto, em português, listando alinhamentos e próximos passos do cliente. Máximo 8 linhas.",
  resumo_operacional:
    "Você é um assistente que escreve resumos operacionais detalhados de reuniões para a equipe interna, em português. Liste cada decisão, tarefa, responsável sugerido e prazo mencionado. Use bullets curtos.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization" }, 401);
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supa = createClient(supaUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await supa.auth.getUser();
    if (!userData.user) return jsonResponse({ error: "Invalid token" }, 401);

    const body = await req.json().catch(() => ({}));
    const tipo = String(body?.tipo ?? "");
    const transcricao = String(body?.transcricao ?? "");
    const contexto = String(body?.contexto ?? "");
    if (!["resumo_cliente", "resumo_operacional"].includes(tipo)) return jsonResponse({ error: "tipo inválido" }, 400);
    if (!transcricao.trim()) return jsonResponse({ error: "transcricao vazia" }, 400);

    const { data: configs } = await supa.from("ia_config").select("*").eq("ativo", true);
    const cfg = (configs ?? [])[0];
    if (!cfg) return jsonResponse({ error: "Nenhum provedor de IA ativo" }, 400);

    const { data: prompts } = await supa.from("ia_prompts").select("*").eq("tipo", tipo).eq("ativo", true).limit(1);
    const systemPrompt = prompts?.[0]?.conteudo?.trim() || PROMPTS_DEFAULT[tipo];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return jsonResponse({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const gateway = createLovableAiGatewayProvider(apiKey);
    const modelId = cfg.model || defaultModelFor(cfg.provider);

    const t0 = Date.now();
    const result = await generateText({
      model: gateway(modelId),
      system: systemPrompt,
      prompt: `${contexto ? `Contexto: ${contexto}\n\n` : ""}Transcrição:\n${transcricao}`,
    });
    const latency = Date.now() - t0;

    const tokensIn = result.usage?.inputTokens ?? 0;
    const tokensOut = result.usage?.outputTokens ?? 0;
    const custo = estimateCost(cfg.provider, modelId, tokensIn, tokensOut);

    await supa.from("ia_logs").insert({
      tipo,
      modelo: modelId,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      custo,
      input_resumo: transcricao.slice(0, 280),
      criado_por: userData.user.id,
    });

    return jsonResponse({ texto: result.text, tokens_input: tokensIn, tokens_output: tokensOut, custo, modelo: modelId, latency_ms: latency });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
