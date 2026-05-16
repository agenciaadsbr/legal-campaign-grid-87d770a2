import { createClient } from "@supabase/supabase-js";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import {
  corsHeaders,
  jsonResponse,
  getProviderClient,
  defaultModelFor,
  resolveRealModelId,
  estimateCost,
} from "../_shared/ai-gateway.ts";

const TarefasSchema = z.object({
  tarefas: z.array(z.object({
    titulo: z.string().min(3).max(200),
    descricao: z.string().max(3000).optional(),
    categoria: z.string().optional(),
    prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    prazo_sugerido: z.string().optional(),
    responsavel_sugerido_id: z.string().uuid().optional().nullable(),
    supervisor_sugerido_id: z.string().uuid().optional().nullable(),
    apoio: z.string().optional(),
    checklist: z.string().optional(),
    entregavel_esperado: z.string().optional(),
    justificativa_atribuicao: z.string().optional(),
  })).max(30),
});

type Modo = "novo" | "substituir" | "manter";

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
    const reuniao_id = String(body?.reuniao_id ?? "");
    const modo: Modo = (body?.modo ?? "novo") as Modo;
    const sobrescrever_resumos: boolean = !!body?.sobrescrever_resumos;
    if (!reuniao_id) return jsonResponse({ error: "reuniao_id obrigatório" }, 400);

    const { data: reuniao } = await supa.from("reunioes").select("*").eq("id", reuniao_id).single();
    if (!reuniao) return jsonResponse({ error: "Reunião não encontrada" }, 404);
    const transcricao = String(reuniao.transcricao ?? "");
    if (!transcricao.trim()) return jsonResponse({ error: "Transcrição vazia" }, 400);

    const { data: agentes } = await supa.from("ia_agentes").select("*").eq("ativo", true);
    const agCliente = (agentes ?? []).find((a: any) => a.tipo === "resumo_cliente");
    const agOper = (agentes ?? []).find((a: any) => a.tipo === "operacional");
    if (!agCliente || !agOper) return jsonResponse({ error: "Configure ambos agentes em Configurações → IA → Agentes" }, 400);

    const { data: equipe } = await supa.from("responsabilidades_equipe").select(`
      profile_id, cargo, demandas_ia, palavras_chave_ia, quando_acionar, quando_nao_acionar, 
      tipos_participacao, setores_compativeis, regras_atribuicao, supervisor_padrao_id,
      prioridade_padrao, prazo_padrao_sugerido, entregaveis_esperados, checklist_padrao
    `);
    const { data: profiles } = await supa.from("profiles").select("id, nome, email, cargo");
    
    const equipeContext = (equipe ?? []).map((e: any) => {
      const p = (profiles ?? []).find((x: any) => x.id === e.profile_id);
      return [
        `- USUÁRIO: ${p?.nome ?? p?.email ?? e.profile_id} (id=${e.profile_id})`,
        `  CARGO: ${e.cargo ?? p?.cargo ?? "N/A"}`,
        `  DEMANDAS IA: ${e.demandas_ia || "N/A"}`,
        `  PALAVRAS-CHAVE: ${e.palavras_chave_ia || "N/A"}`,
        `  QUANDO ACIONAR: ${e.quando_acionar || "N/A"}`,
        `  QUANDO NÃO ACIONAR: ${e.quando_nao_acionar || "N/A"}`,
        `  SETORES COMPATÍVEIS: ${(e.setores_compativeis ?? []).join(", ")}`,
        `  TIPO PARTICIPAÇÃO: ${(e.tipos_participacao ?? []).join(", ")}`,
        `  SUPERVISOR PADRÃO ID: ${e.supervisor_padrao_id || "N/A"}`,
        `  PRIORIDADE PADRÃO: ${e.prioridade_padrao || "N/A"}`,
        `  PRAZO PADRÃO: ${e.prazo_padrao_sugerido || "N/A"}`,
        `  ENTREGÁVEL: ${e.entregaveis_esperados || "N/A"}`,
        `  CHECKLIST: ${e.checklist_padrao || "N/A"}`
      ].join("\n");
    }).join("\n\n");

    const startTime = Date.now();
    const status: any = { cliente: null, operacional: null, tarefas: null };
    let resumoClienteOut: string | null = null;
    let resumoOperOut: string | null = null;
    let tarefasInseridas = 0;
    let tarefasSubstituidas = 0;

    // Agente 1 — Resumo Cliente
    const runCliente = (async () => {
      try {
        const client = getProviderClient(agCliente.provider);
        const modelId = agCliente.model || defaultModelFor(agCliente.provider);
        const realModel = resolveRealModelId(agCliente.provider, modelId);
        const sys = [agCliente.prompt, agCliente.contexto_adicional].filter(Boolean).join("\n\n");
        const t0 = Date.now();
        const result = await generateText({
          model: client(realModel),
          system: sys,
          temperature: Number(agCliente.temperatura ?? 0.4),
          prompt: `Reunião: ${reuniao.titulo}\n\nTranscrição:\n${transcricao}`,
        });
        const tIn = result.usage?.inputTokens ?? 0;
        const tOut = result.usage?.outputTokens ?? 0;
        resumoClienteOut = result.text;
        await supa.from("ia_logs").insert({
          tipo: "agente_cliente", modelo: modelId, tokens_input: tIn, tokens_output: tOut,
          custo: estimateCost(agCliente.provider, modelId, tIn, tOut),
          input_resumo: transcricao.slice(0, 280), criado_por: userData.user.id,
        });
        status.cliente = { ok: true, latency_ms: Date.now() - t0 };
      } catch (e) {
        status.cliente = { ok: false, error: (e as Error).message };
      }
    })();

    // Agentes 2 e 3 — Operacional e Tarefas (Executados em paralelo se possível, ou otimizados)
    const runOperAndTasks = (async () => {
      try {
        const client = getProviderClient(agOper.provider);
        const modelId = agOper.model || defaultModelFor(agOper.provider);
        const realModel = resolveRealModelId(agOper.provider, modelId);
        const fallbackRules = `
MAPA DE FALLBACK OBRIGATÓRIO (se a ficha de responsabilidades não for suficiente):
1. Tráfego/Campanhas/Performance (revisar, ajustar, orçamento, leads, Meta/Google Ads): Executor=Greice, Supervisor=Robson. Categoria: Tráfego.
2. Relatórios/Saldos/Acessos (enviar relatório, atualizar saldo, recarga, estrutura Google/FB): Executor=Dalton, Supervisor=Robson. Categoria: Relatórios ou Saldos.
3. CRM/IA/Automação/Técnico (configurar CRM, pixel, UTM, integração, erro técnico): Executor=Erick, Supervisor=Robson. Categoria: CRM, IA / Automação ou Suporte Técnico.
4. Landing Page/Site (criar/ajustar LP, texto/imagem na página, layout web): Executor=Bruno, Supervisor=Robson. Categoria: Web / Landing Pages.
5. Design/Criativos Estáticos (arte, post, carrossel, imagem de anúncio): Executor=Lorenzo, Supervisor=Robson. Categoria: Design.
6. Vídeo/Edição (reels, cortes, legenda, vídeo com IA): Executor=Bianca, Supervisor=Robson. Categoria: Vídeo.
7. Social Media (agendar/publicar postagem pronta): Executor=Pablo, Supervisor=Robson. Categoria: Social Media.
8. Comercial (agendar reunião comercial, follow-up, qualificar lead): Executor=Thauana/Flor, Supervisor=Tales. Categoria: Comercial.
9. Estratégia/Performance/Retenção (reunião estratégica, análise de funil, cliente insatisfeito): Executor=Tales, Supervisor=Cristiano. Categoria: Estratégia ou Reuniões de Performance.
10. Financeiro/Administrativo/Decisão Crítica: Executor=Cristiano, Supervisor=Cristiano. Categoria: Financeiro ou Administrativo.
11. Gestão de Projetos (delegar, cobrar, organizar): Executor/Supervisor=Robson. Categoria: Gestão de Projetos.
`;

        const sysBase = [
          agOper.prompt,
          agOper.contexto_adicional,
          fallbackRules,
          agOper.regras_categorizacao ? `Regras de categorização:\n${agOper.regras_categorizacao}` : null,
          agOper.regras_responsaveis ? `Regras de responsáveis:\n${agOper.regras_responsaveis}` : null,
          equipeContext ? `BASE DE RESPONSABILIDADES (FONTE PRINCIPAL - USE OS IDs EXATOS):\n${equipeContext}` : null,
        ].filter(Boolean).join("\n\n");

        // Executa resumo operacional e extração de tarefas em paralelo para ganhar tempo
        const [resumoResult, tarefasResult] = await Promise.allSettled([
          generateText({
            model: client(realModel),
            system: sysBase,
            temperature: Number(agOper.temperatura ?? 0.3),
            prompt: `Produza um briefing operacional detalhado da reunião abaixo. Liste decisões, contexto, demandas, riscos e próximos passos. Use bullets ricos em contexto técnico.\n\nReunião: ${reuniao.titulo}\n\nTranscrição:\n${transcricao}`,
          }),
          generateText({
            model: client(realModel),
            system: sysBase,
            temperature: Number(agOper.temperatura ?? 0.3),
            prompt: `Extraia as tarefas operacionais desta reunião. Cada tarefa deve ser detalhada (não genérica), com contexto rico na descrição. Sugira responsável apenas se houver match claro com a equipe disponível.\n\nReunião: ${reuniao.titulo}\n\nTranscrição:\n${transcricao}`,
            experimental_output: Output.object({ schema: TarefasSchema }),
          })
        ]);

        const tFinal = Date.now();

        // Processa resultado do Resumo
        if (resumoResult.status === "fulfilled") {
          const r1 = resumoResult.value;
          resumoOperOut = r1.text;
          const tIn1 = r1.usage?.inputTokens ?? 0;
          const tOut1 = r1.usage?.outputTokens ?? 0;
          await supa.from("ia_logs").insert({
            tipo: "agente_operacional", modelo: modelId, tokens_input: tIn1, tokens_output: tOut1,
            custo: estimateCost(agOper.provider, modelId, tIn1, tOut1),
            input_resumo: transcricao.slice(0, 280), criado_por: userData.user.id,
          });
          status.operacional = { ok: true, latency_ms: tFinal - startTime };
        } else {
          status.operacional = { ok: false, error: resumoResult.reason?.message };
        }

        // Processa resultado das Tarefas
        if (tarefasResult.status === "fulfilled") {
          const r2 = tarefasResult.value;
          const parsed = (r2 as any).experimental_output as z.infer<typeof TarefasSchema> | undefined;
          const tarefas = parsed?.tarefas ?? [];
          const tIn2 = r2.usage?.inputTokens ?? 0;
          const tOut2 = r2.usage?.outputTokens ?? 0;
          await supa.from("ia_logs").insert({
            tipo: "agente_operacional_tarefas", modelo: modelId, tokens_input: tIn2, tokens_output: tOut2,
            custo: estimateCost(agOper.provider, modelId, tIn2, tOut2),
            input_resumo: transcricao.slice(0, 280), criado_por: userData.user.id,
          });

          // Política de duplicidade e inserção
          const { data: existentes } = await supa.from("tarefas_sugeridas")
            .select("id, status")
            .eq("reuniao_id", reuniao_id)
            .eq("status", "aguardando_aprovacao");
          const temPendentes = (existentes ?? []).length > 0;

          if (!(temPendentes && modo === "manter")) {
            if (temPendentes && modo === "substituir") {
              const ids = (existentes ?? []).map((x: any) => x.id);
              const { error } = await supa.from("tarefas_sugeridas").delete().in("id", ids);
              if (!error) tarefasSubstituidas = ids.length;
            }

            const validProfileIds = new Set((profiles ?? []).map((p: any) => p.id));
            const inserts = tarefas.map(t => ({
              cliente_id: reuniao.cliente_id,
              reuniao_id,
              titulo: t.titulo,
              descricao: t.descricao ?? null,
              categoria: t.categoria ?? null,
              prioridade: t.prioridade ?? null,
              prazo_sugerido: t.prazo_sugerido ?? null,
              responsavel_sugerido_id: t.responsavel_sugerido_id && validProfileIds.has(t.responsavel_sugerido_id) ? t.responsavel_sugerido_id : null,
              origem: "ia_reuniao",
              status: "aguardando_aprovacao",
              criado_por: userData.user.id,
            }));

            if (inserts.length > 0) {
              const { error } = await supa.from("tarefas_sugeridas").insert(inserts);
              if (!error) tarefasInseridas = inserts.length;
            }
          }
          status.tarefas = { ok: true, latency_ms: tFinal - startTime, count: tarefasInseridas, substituidas: tarefasSubstituidas };
        } else {
          status.tarefas = { ok: false, error: tarefasResult.reason?.message };
        }
      } catch (e) {
        status.operacional = status.operacional ?? { ok: false, error: (e as Error).message };
        status.tarefas = status.tarefas ?? { ok: false, error: (e as Error).message };
      }
    })();

    await Promise.allSettled([runCliente, runOperAndTasks]);

    // Atualiza reunião (resumos só sobrescrevem se autorizado ou se estavam vazios)
    const updates: any = { ia_processed_at: new Date().toISOString(), ia_status: status };
    if (resumoClienteOut !== null && (sobrescrever_resumos || !reuniao.resumo_cliente)) {
      updates.resumo_cliente = resumoClienteOut;
    }
    if (resumoOperOut !== null && (sobrescrever_resumos || !reuniao.resumo_tarefas)) {
      updates.resumo_tarefas = resumoOperOut;
    }
    await supa.from("reunioes").update(updates).eq("id", reuniao_id);

    return jsonResponse({
      ok: true,
      status,
      resumo_cliente: resumoClienteOut,
      resumo_operacional: resumoOperOut,
      tarefas_inseridas: tarefasInseridas,
      tarefas_substituidas: tarefasSubstituidas,
    });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
