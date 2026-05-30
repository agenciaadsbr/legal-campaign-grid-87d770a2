import { createClient } from "npm:@supabase/supabase-js";
import { generateText } from "npm:ai";
import { corsHeaders, jsonResponse, getProviderClient, defaultModelFor, resolveRealModelId, estimateCost } from "../_shared/ai-gateway.ts";

const PROMPTS_DEFAULT: Record<string, string> = {
  resumo_cliente:
    `Você é responsável por gerar um resumo de reunião em estilo ata, pronto para ser enviado ao cliente no grupo.

O resumo deve ser objetivo, profissional e organizado, mas não deve ser curto demais. Sua função é registrar com clareza o que foi alinhado, preservando informações importantes da reunião, sem transformar o texto em um relatório interno extenso.

Tamanho ideal: mínimo de 12 linhas quando houver conteúdo, ideal entre 18 e 35 linhas, máximo aproximado de 50 linhas (salvo reuniões muito longas).

Estruture o resumo exatamente com os tópicos abaixo, em português, usando markdown:

**Resumo da Reunião: [tipo ou título da reunião]**

**1. Responsabilidades da Agência (ADS BR)**
Liste as ações assumidas pela equipe da agência, incluindo prazos quando mencionados.

**2. Responsabilidades do Cliente**
Liste as ações, envios, aprovações ou retornos que dependem do cliente, incluindo prazos quando mencionados.

**3. Pontos Importantes Alinhados**
Liste informações relevantes discutidas na reunião: campanhas, orçamento, verba diária/mensal, região/cidade/estado, público, plataformas, materiais, aprovações, desempenho, ajustes e decisões.

**4. Próximos Passos**
Liste de forma clara o que deve acontecer após a reunião.

**Contexto final**
Parágrafo curto explicando o objetivo geral da reunião e o motivo dos próximos passos.

Regras obrigatórias:
- Não invente informações.
- Nunca omita: valores financeiros, orçamento, verba, datas/prazos, região, plataformas, campanhas (ativar/pausar/manter/alterar), materiais a enviar/aprovar, pendências do cliente, pendências da agência, decisões tomadas, aprovações necessárias e próximos passos.
- Não use linguagem técnica demais nem comercial exagerada.
- Não deixe o resumo curto demais nem o transforme em transcrição.
- Se algo ficou pendente de confirmação, mencione de forma clara.
- Se a reunião não tiver informação suficiente para algum tópico, escreva apenas o que foi possível identificar (não invente).
- Use bullets curtos, porém completos.
- Preserve o sentido exato do que foi falado.`,
  resumo_operacional:
    "Você é um assistente que escreve resumos de tarefas detalhados e operacionais de reuniões para a equipe interna, em português. O resumo deve ser pronto para virar tarefas, descrevendo tecnicamente o que precisa ser feito. Liste cada decisão, tarefa, responsável sugerido e prazo mencionado de forma profunda e detalhada.",
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

    let client;
    try {
      client = getProviderClient(cfg.provider);
    } catch (e) {
      return jsonResponse({ error: (e as Error).message }, 400);
    }
    const modelId = cfg.model || defaultModelFor(cfg.provider);
    const realModel = resolveRealModelId(cfg.provider, modelId);

    const t0 = Date.now();
    const result = await generateText({
      model: client(realModel),
      system: systemPrompt,
      maxTokens: tipo === "resumo_operacional" ? 8000 : 2500,
      prompt: `${contexto ? `Contexto: ${contexto}\n\n` : ""}Transcrição:\n${transcricao}`,
    });
    const latency = Date.now() - t0;

    const tokensIn = result.usage?.inputTokens ?? 0;
    const tokensOut = result.usage?.outputTokens ?? 0;
    const custo = estimateCost(cfg.provider, modelId, tokensIn, tokensOut);

    await supa.from("ia_logs").insert({
      tipo,
      modelo: modelId,
      provider: cfg.provider,
      source_module: "ia-gerar-resumo",
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      custo,
      input_resumo: transcricao.slice(0, 280),
      criado_por: userData.user.id,
      status: "success",
      latency_ms: latency,
    });

    return jsonResponse({ texto: result.text, tokens_input: tokensIn, tokens_output: tokensOut, custo, modelo: modelId, latency_ms: latency });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
