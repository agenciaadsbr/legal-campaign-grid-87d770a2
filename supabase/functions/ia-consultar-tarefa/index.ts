import { createClient } from "npm:@supabase/supabase-js";
import { generateText } from "npm:ai";
import { corsHeaders, jsonResponse, getProviderClient, defaultModelFor, resolveRealModelId, estimateCost } from "../_shared/ai-gateway.ts";

// ----- Helpers -----
function trunc(s: any, max: number): string {
  if (!s) return "";
  const str = String(s);
  return str.length > max ? str.slice(0, max) + "…[truncado]" : str;
}

function normalizarConfianca(v: any): "Alto" | "Médio" | "Baixo" {
  const s = String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.startsWith("alt")) return "Alto";
  if (s.startsWith("bai")) return "Baixo";
  return "Médio";
}

function diretrizesPorCategoria(categoria: string): string {
  const c = String(categoria || "").toLowerCase();
  if (c === "posts") return `
- temas de conteúdo discutidos com o cliente
- nicho/áreas jurídicas mencionadas
- linguagem, tom de comunicação e identidade visual
- CTA, legenda, formato e referências visuais
- estratégia/frequência editorial`;
  if (c === "trafegopago" || c === "tráfego pago" || c === "trafego pago") return `
- campanhas (Meta Ads, Google Ads), objetivo, público e orçamento
- criativos e variações aprovadas
- páginas de destino e formulários
- métricas alvo (CPL, leads qualificados, ROAS)`;
  if (c === "editorvideo" || c === "videos" || c === "vídeos") return `
- formato (reels, anúncio, orgânico), roteiro e referências
- objetivo do vídeo e tipo de produção
- diretrizes de edição/identidade`;
  if (c === "landingpage" || c === "lp" || c === "site") return `
- estrutura da página, copy e CTA
- formulários, integração e domínio
- oferta e prova social`;
  if (c === "iaatendimento" || c === "ia/atendimento" || c === "ia atendimento") return `
- fluxo de atendimento e automações
- integração com CRM e WhatsApp
- prompts, tags e regras de qualificação`;
  if (c === "operacional") return `
- entregas internas, prazos, dependências
- responsáveis e status de tarefas relacionadas`;
  if (c === "personalizado" || c === "urgencia" || c === "urgência") return `
- urgência específica e contexto da solicitação
- responsáveis envolvidos e prazo`;
  return `
- objetivos gerais do cliente
- contexto operacional já registrado`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization" }, 401);

    const body = await req.json();
    const {
      demanda_id,
      pergunta,
      cliente_nome,
      tarefa_titulo,
      tarefa_categoria,
      tarefa_subtipo,
      tarefa_prioridade,
      tarefa_descricao,
      tarefa_comentarios,
      reunioes,
      setor_prompt,
    } = body;

    if (!demanda_id || !pergunta) {
      return jsonResponse({ error: "Campos obrigatórios ausentes" }, 400);
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, supaKey);

    // 1. Config de IA ativa
    const { data: configs } = await supa.from("ia_config").select("*").eq("ativo", true).limit(1);
    const config = configs?.[0];

    const provider = config?.provider || "openai";
    const modelId = config?.model || defaultModelFor(provider);
    const client = getProviderClient(provider);
    const realModel = resolveRealModelId(provider, modelId);

    // 2. Ordenar reuniões mais recentes primeiro, no máximo 5, truncar seções
    const reunioesArr: any[] = Array.isArray(reunioes) ? [...reunioes] : [];
    reunioesArr.sort((a, b) => {
      const da = new Date(a?.data || 0).getTime();
      const db = new Date(b?.data || 0).getTime();
      return db - da;
    });
    const reunioesTop = reunioesArr.slice(0, 5);

    const blocoReunioes = reunioesTop.length
      ? reunioesTop
          .map((r, i) => {
            const transcricao = trunc(r.transcricao, 6000);
            const resumoOp = trunc(r.resumo_operacional, 2500);
            const resumoCli = trunc(r.resumo_cliente, 2500);
            const obs = trunc(r.observacoes, 1500);
            return `[${i + 1}] ${r.titulo || "Reunião sem título"} — ${r.data || "sem data"}${r.tipo ? ` (${r.tipo})` : ""}
  - Transcrição: ${transcricao || "—"}
  - Resumo operacional: ${resumoOp || "—"}
  - Resumo cliente: ${resumoCli || "—"}
  - Observações: ${obs || "—"}`;
          })
          .join("\n\n")
      : "Nenhuma reunião cadastrada para este cliente.";

    const diretrizes = diretrizesPorCategoria(tarefa_categoria);

    // 3. Prompt estruturado
    const systemPrompt = `${setor_prompt ? setor_prompt + "\n\n" : ""}Você é um assistente operacional da ADS BR. Responda dúvidas sobre uma tarefa específica usando APENAS as informações cadastradas do cliente.

ORDEM DE PRIORIDADE DAS FONTES (use nesta ordem):
1. Transcrição completa da reunião
2. Resumo operacional
3. Resumo cliente
4. Observações da reunião
5. Briefing da tarefa
6. Comentários da tarefa

DIRETRIZES PARA A CATEGORIA "${tarefa_categoria || "Geral"}":${diretrizes}

REGRAS CRÍTICAS:
- NÃO invente prazos, orçamentos, pedidos, responsáveis ou estratégias.
- NÃO responda genericamente (ex.: "o cliente atua na área da advocacia") — busque o que foi efetivamente discutido nas reuniões e resumos.
- Se a pergunta for sobre temas, áreas de atuação, objetivo ou orientação, busque essas informações nas reuniões, resumos e briefing antes de responder.
- Considere a CATEGORIA da tarefa para priorizar o que é relevante.
- Se NÃO houver informação suficiente nos dados fornecidos, responda EXATAMENTE: "Não encontrei essa informação nas reuniões, resumos ou briefing deste cliente. Recomendo confirmar no grupo ou adicionar essa observação na tarefa." e use nivel_confianca: "Baixo" e fontes: [].

FORMATO DE SAÍDA OBRIGATÓRIO:
Responda SOMENTE com um objeto JSON válido, sem markdown e sem texto fora do JSON:
{
  "resposta": "<texto>",
  "fontes": ["Reunião: <titulo> (<data>) — <seção>", ...],
  "nivel_confianca": "Alto" | "Médio" | "Baixo"
}

=== CLIENTE ===
Nome: ${cliente_nome || "Desconhecido"}

=== TAREFA ===
Categoria: ${tarefa_categoria || "—"}
Subtipo: ${tarefa_subtipo || "—"}
Título: ${tarefa_titulo || "—"}
Prioridade: ${tarefa_prioridade || "—"}
Briefing: ${trunc(tarefa_descricao, 4000) || "—"}
Comentários: ${trunc(tarefa_comentarios, 3000) || "—"}

=== REUNIÕES (mais recentes primeiro) ===
${blocoReunioes}`;

    // 4. Chamar IA
    const { text } = await generateText({
      model: client(realModel),
      system: systemPrompt,
      prompt: pergunta,
    });

    // 5. Parse robusto
    let result: { resposta: string; fontes: string[]; nivel_confianca: "Alto" | "Médio" | "Baixo" } = {
      resposta: "",
      fontes: [],
      nivel_confianca: "Médio",
    };
    try {
      const parsed = JSON.parse(text);
      result = {
        resposta: String(parsed.resposta ?? "").trim(),
        fontes: Array.isArray(parsed.fontes) ? parsed.fontes.map(String) : [],
        nivel_confianca: normalizarConfianca(parsed.nivel_confianca),
      };
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          result = {
            resposta: String(parsed.resposta ?? "").trim(),
            fontes: Array.isArray(parsed.fontes) ? parsed.fontes.map(String) : [],
            nivel_confianca: normalizarConfianca(parsed.nivel_confianca),
          };
        } catch {
          result = { resposta: text.trim(), fontes: [], nivel_confianca: "Médio" };
        }
      } else {
        result = { resposta: text.trim(), fontes: [], nivel_confianca: "Médio" };
      }
    }

    if (!result.resposta) {
      result.resposta = "Não encontrei essa informação nas reuniões, resumos ou briefing deste cliente. Recomendo confirmar no grupo ou adicionar essa observação na tarefa.";
      result.nivel_confianca = "Baixo";
      result.fontes = [];
    }

    // 6. Persistir histórico
    const userSupa = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: user } = await userSupa.auth.getUser();

    await supa.from("ia_tarefa_consultas").insert({
      demanda_id,
      usuario_id: user.user?.id,
      pergunta,
      resposta: result.resposta,
      fontes: result.fontes,
      nivel_confianca: result.nivel_confianca,
    });

    return jsonResponse(result);
  } catch (e) {
    console.error("ia-consultar-tarefa error", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
