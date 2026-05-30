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
  })).max(100),
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

    // Prioriza prompts da tabela ia_prompts se existirem e estiverem ativos
    const { data: promptsTable } = await supa.from("ia_prompts").select("*").eq("ativo", true);
    const pCliente = (promptsTable ?? []).find(p => p.tipo === "resumo_cliente");
    const pOper = (promptsTable ?? []).find(p => p.tipo === "resumo_operacional");
    const pTarefas = (promptsTable ?? []).find(p => p.tipo === "tarefas_sugeridas");

    const promptClienteFinal = pCliente?.conteudo || agCliente.prompt;
    const promptOperFinal = pOper?.conteudo || agOper.prompt;
    const promptTarefasFinal = pTarefas?.conteudo || agOper.prompt; // Fallback para agOper se não houver específico

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

    // Marca reunião como "processando" antes de devolver imediatamente
    await supa.from("reunioes").update({
      ia_status: { cliente: { ok: null, processing: true }, operacional: { ok: null, processing: true }, tarefas: { ok: null, processing: true } },
      ia_processed_at: null,
    }).eq("id", reuniao_id);

    const work = (async () => {
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
          const sys = [promptClienteFinal, agCliente.contexto_adicional].filter(Boolean).join("\n\n");
          const t0 = Date.now();
          const result = await generateText({
            model: client(realModel),
            system: sys,
            temperature: Number(agCliente.temperatura ?? 0.4),
            maxTokens: 1000,
            prompt: `Título da Reunião: ${reuniao.titulo}\n\nTranscrição para processar:\n${transcricao}`,
          });
          const tIn = result.usage?.inputTokens ?? 0;
          const tOut = result.usage?.outputTokens ?? 0;
          resumoClienteOut = result.text;
          await supa.from("ia_logs").insert({
            tipo: "agente_cliente", modelo: modelId, provider: agCliente.provider,
            source_module: "ia-processar-reuniao", reuniao_id, cliente_id: reuniao.cliente_id,
            tokens_input: tIn, tokens_output: tOut,
            custo: estimateCost(agCliente.provider, modelId, tIn, tOut),
            input_resumo: transcricao.slice(0, 280), criado_por: userData.user.id,
            status: "success", latency_ms: Date.now() - t0,
          });
          status.cliente = { ok: true, latency_ms: Date.now() - t0 };
        } catch (e) {
          status.cliente = { ok: false, error: (e as Error).message };
        }
      })();

      // Agentes 2 e 3 — Operacional e Tarefas
      const runOperAndTasks = (async () => {
        try {
          const client = getProviderClient(agOper.provider);
          const modelId = agOper.model || defaultModelFor(agOper.provider);
          const realModel = resolveRealModelId(agOper.provider, modelId);

          const contextBase = [
            agOper.contexto_adicional,
            agOper.regras_categorizacao ? `Regras de categorização:\n${agOper.regras_categorizacao}` : null,
            agOper.regras_responsaveis ? `Regras de responsáveis:\n${agOper.regras_responsaveis}` : null,
            equipeContext ? `BASE DE RESPONSABILIDADES (FONTE PRINCIPAL - USE OS IDs EXATOS):\n${equipeContext}` : null,
          ].filter(Boolean).join("\n\n");

          const sysOper = [promptOperFinal, contextBase].filter(Boolean).join("\n\n");
          const sysTarefas = [promptTarefasFinal, contextBase].filter(Boolean).join("\n\n");

          const [resumoResult, tarefasResult] = await Promise.allSettled([
            generateText({
              model: client(realModel),
              system: sysOper,
              temperature: Number(agOper.temperatura ?? 0.3),
              maxTokens: 8000,
              prompt: `Transcrição completa da reunião "${reuniao.titulo}":\n\n${transcricao}\n\nLembre-se: gere o briefing operacional completo e detalhado conforme as instruções do prompt de sistema.`,
            }),
            generateText({
              model: client(realModel),
              system: sysTarefas,
              temperature: Number(agOper.temperatura ?? 0.2),
              maxTokens: 8000,
              prompt: `Extraia as tarefas operacionais detalhadas da reunião "${reuniao.titulo}".\n\nTranscrição:\n${transcricao}`,
              experimental_output: Output.object({ schema: TarefasSchema }),
            })
          ]);

          const tFinal = Date.now();

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
                supervisor_sugerido_id: t.supervisor_sugerido_id && validProfileIds.has(t.supervisor_sugerido_id) ? t.supervisor_sugerido_id : null,
                apoio: t.apoio ?? null,
                checklist: t.checklist ?? null,
                entregavel_esperado: t.entregavel_esperado ?? null,
                justificativa_atribuicao: t.justificativa_atribuicao ?? null,
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

      const updates: any = { ia_processed_at: new Date().toISOString(), ia_status: status };
      if (resumoClienteOut !== null && (sobrescrever_resumos || !reuniao.resumo_cliente)) {
        updates.resumo_cliente = resumoClienteOut;
      }
      if (resumoOperOut !== null && (sobrescrever_resumos || !reuniao.resumo_tarefas)) {
        updates.resumo_tarefas = resumoOperOut;
      }
      await supa.from("reunioes").update(updates).eq("id", reuniao_id);
    })();

    // Executa em background — não bloqueia a resposta HTTP (evita timeout de 150s)
    // @ts-ignore EdgeRuntime é injetado em runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work);
    } else {
      work.catch((e) => console.error("background work failed:", e));
    }

    return jsonResponse({ ok: true, queued: true, reuniao_id });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
