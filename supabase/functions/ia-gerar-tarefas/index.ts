import { createClient } from "@supabase/supabase-js";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { corsHeaders, jsonResponse, getProviderClient, defaultModelFor, resolveRealModelId, estimateCost } from "../_shared/ai-gateway.ts";

const DEFAULT_PROMPT =
  "Você é um assistente que extrai tarefas acionáveis a partir de transcrições/resumos de reuniões. Retorne apenas tarefas claras, com título curto e descrição objetiva. Categorias possíveis: IAAtendimento, Trafego, Video, Personalizado, Urgencia, LP. Prioridades: baixa, media, alta, urgente. Em português.";

const Schema = z.object({
  tarefas: z.array(z.object({
    titulo: z.string().min(3).max(200),
    descricao: z.string().max(2000).optional(),
    categoria: z.string().optional(),
    prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    prazo_sugerido: z.string().optional(), // ISO date
    responsavel_sugerido_id: z.string().uuid().optional().nullable(),
    supervisor_sugerido_id: z.string().uuid().optional().nullable(),
    apoio: z.string().optional(),
    checklist: z.string().optional(),
    entregavel_esperado: z.string().optional(),
    justificativa_atribuicao: z.string().optional(),
  })).max(100),
});

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
    const cliente_id = String(body?.cliente_id ?? "");
    const reuniao_id = body?.reuniao_id ? String(body.reuniao_id) : null;
    const transcricao = String(body?.transcricao ?? "");
    if (!cliente_id) return jsonResponse({ error: "cliente_id obrigatório" }, 400);
    if (!transcricao.trim()) return jsonResponse({ error: "transcricao vazia" }, 400);

    const { data: configs } = await supa.from("ia_config").select("*").eq("ativo", true);
    const cfg = (configs ?? [])[0];
    if (!cfg) return jsonResponse({ error: "Nenhum provedor de IA ativo" }, 400);

    const { data: prompts } = await supa.from("ia_prompts").select("*").eq("tipo", "tarefas_sugeridas").eq("ativo", true).limit(1);
    const systemPrompt = prompts?.[0]?.conteudo?.trim() || DEFAULT_PROMPT;

    let client;
    try {
      client = getProviderClient(cfg.provider);
    } catch (e) {
      return jsonResponse({ error: (e as Error).message }, 400);
    }
    const modelId = cfg.model || defaultModelFor(cfg.provider);
    const realModel = resolveRealModelId(cfg.provider, modelId);

    const result = await generateText({
      model: client(realModel),
      system: systemPrompt,
      maxTokens: 8000,
      prompt: `Extraia as tarefas desta reunião:\n\n${transcricao}`,
      experimental_output: Output.object({ schema: Schema }),
    });

    const parsed = (result as any).experimental_output as z.infer<typeof Schema> | undefined;
    const tarefas = parsed?.tarefas ?? [];

    const tokensIn = result.usage?.inputTokens ?? 0;
    const tokensOut = result.usage?.outputTokens ?? 0;
    const custo = estimateCost(cfg.provider, modelId, tokensIn, tokensOut);

    let inseridas = 0;
    for (const t of tarefas) {
      const { error } = await supa.from("tarefas_sugeridas").insert({
        cliente_id,
        reuniao_id,
        titulo: t.titulo,
        descricao: t.descricao ?? null,
        categoria: t.categoria ?? null,
        prioridade: t.prioridade ?? null,
        prazo_sugerido: t.prazo_sugerido ?? null,
        responsavel_sugerido_id: t.responsavel_sugerido_id ?? null,
        supervisor_sugerido_id: t.supervisor_sugerido_id ?? null,
        apoio: t.apoio ?? null,
        checklist: t.checklist ?? null,
        entregavel_esperado: t.entregavel_esperado ?? null,
        justificativa_atribuicao: t.justificativa_atribuicao ?? null,
        origem: "ia_reuniao",
        status: "aguardando_aprovacao",
        criado_por: userData.user.id,
      });
      if (!error) inseridas++;
    }

    await supa.from("ia_logs").insert({
      tipo: "tarefas_sugeridas",
      modelo: modelId,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      custo,
      input_resumo: transcricao.slice(0, 280),
      criado_por: userData.user.id,
    });

    return jsonResponse({ count: inseridas, tarefas, modelo: modelId, custo });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
