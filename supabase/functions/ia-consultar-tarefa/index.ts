import { createClient } from "npm:@supabase/supabase-js";
import { generateText } from "npm:ai";
import { corsHeaders, jsonResponse, getProviderClient, defaultModelFor, resolveRealModelId } from "../_shared/ai-gateway.ts";

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
      reunioes, // Array de { titulo, data, transcricao, resumo_operacional, resumo_cliente, observacoes }
      setor_prompt 
    } = body;

    if (!demanda_id || !pergunta) {
      return jsonResponse({ error: "Campos obrigatórios ausentes" }, 400);
    }

    // Configuração do Supabase Client para buscar config de IA
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, supaKey);

    // 1. Obter config de IA ativa
    const { data: configs } = await supa.from("ia_config").select("*").eq("ativo", true).limit(1);
    const config = configs?.[0];
    
    const provider = config?.provider || "openai";
    const modelId = config?.model || defaultModelFor(provider);
    const client = getProviderClient(provider);
    const realModel = resolveRealModelId(provider, modelId);

    // 2. Construir Contexto das Reuniões
    const contextoReunioes = (reunioes || []).map((r: any) => `
--- REUNIÃO: ${r.titulo} (${r.data}) ---
RESUMO CLIENTE: ${r.resumo_cliente || ""}
RESUMO OPERACIONAL: ${r.resumo_operacional || ""}
OBSERVAÇÕES: ${r.observacoes || ""}
TRANSCRIÇÃO: ${r.transcricao || ""}
`).join("\n");

    // 3. Prompt do Sistema
    const systemPrompt = `
${setor_prompt || "Você é um assistente operacional. Responda dúvidas sobre tarefas usando as informações fornecidas."}

REGRAS CRÍTICAS:
1. RESPONDA APENAS com base nos dados fornecidos do cliente e da tarefa.
2. Se a informação NÃO estiver nos dados, diga explicitamente: "Não encontrei essa informação nas reuniões cadastradas deste cliente. Recomendo confirmar no grupo ou adicionar essa observação na tarefa."
3. NÃO invente prazos, orçamentos, pedidos do cliente, responsáveis ou estratégias que não estejam documentadas.
4. Seja objetivo e profissional.
5. Formate sua resposta em JSON com os campos: 
   - resposta: (texto da explicação)
   - fontes: (lista de strings identificando de onde veio a info, ex: ["Reunião: Kickoff (10/05)"])
   - nivel_confianca: ("Alto", "Médio" ou "Baixo")

DADOS DO CLIENTE E TAREFA:
Cliente: ${cliente_nome}
Tarefa: ${tarefa_titulo}
Categoria: ${tarefa_categoria}
Subtipo: ${tarefa_subtipo || "N/A"}
Prioridade: ${tarefa_prioridade}
Descrição/Briefing: ${tarefa_descricao || "N/A"}
Comentários Recentes: ${tarefa_comentarios || "N/A"}

CONTEXTO DE REUNIÕES:
${contextoReunioes || "Nenhuma reunião cadastrada para este cliente."}
`;

    // 4. Chamar IA
    const { text } = await generateText({
      model: client(realModel),
      system: systemPrompt,
      prompt: pergunta,
    });

    // 5. Tentar parsear JSON ou retornar texto bruto formatado
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      result = {
        resposta: text,
        fontes: [],
        nivel_confianca: "Médio"
      };
    }

    // 6. Salvar no histórico (ia_tarefa_consultas)
    // Usamos o authHeader do usuário para que o usuario_id seja detectado via RLS/Auth
    const userSupa = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: user } = await userSupa.auth.getUser();
    
    await supa.from("ia_tarefa_consultas").insert({
      demanda_id,
      usuario_id: user.user?.id,
      pergunta,
      resposta: result.resposta,
      fontes: result.fontes,
      nivel_confianca: result.nivel_confianca
    });

    // 7. Retornar resposta
    return jsonResponse(result);

  } catch (e) {
    console.error(e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
