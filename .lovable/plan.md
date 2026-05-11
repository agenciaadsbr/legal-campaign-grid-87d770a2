# Painel de IA — Novo layout + Ativação real

Manter tudo aditivo: a aba "IA" em Configurações ganha um novo card por provedor com o layout da imagem, e por baixo passa a chamar edge functions reais usando o **Lovable AI Gateway** (que já cobre tanto modelos `google/gemini-*` quanto `openai/gpt-*` com uma única chave gerenciada `LOVABLE_API_KEY` — sem pedir chave para o usuário).

---

## 1. Novo layout do card de provedor (igual à imagem)

Refatorar `src/components/configuracoes/IAConfigManager.tsx` — aba "Provedor" passa a renderizar um `ProviderCard` por provider (Gemini, GPT) com a mesma estrutura visual da referência:

**Header do card:**
- Ícone (Sparkles) + título: "OpenAI / GPT — Análise com IA" / "Google Gemini — Análise com IA"
- Subtítulo curto explicando o uso
- Botões à direita:
  - `Insights I.A: Ativado/Desativado` (toggle visual — controla campo `ativo` na tabela `ia_config`)
  - `Testar Conexão` → chama edge function `ia-test-connection`
  - `Atualizar Configuração` → re-busca lista de modelos disponíveis (edge function `ia-list-models`)
  - `Desconectar` → seta `ativo=false`

**Linha de status:**
- Bolinha verde + "Conectado" / cinza + "Desconectado"
- "N modelos disponíveis" (vindo da edge function `ia-list-models`, cacheado em `ia_config.modelos_disponiveis` jsonb)
- À direita: label "Modelo" + `<Select>` com a lista de modelos retornada (ex: "GPT-4o mini · rápido e barato"). Ao mudar, salva em `ia_config.model`.

**Mini-gráfico de consumo:**
- "Consumo · {período}" + sparkline (componente leve via `recharts` `<LineChart>` mini, sem eixos)
- Range buttons: Hoje · Ontem · 3D · 5D · 7D · 15D · 30D · 60D · 90D (estado local)
- À direita: custo total agregado (ex: "$0.0098") + "{N} chamadas"
- Dados vêm de agregação client-side da tabela `ia_logs` filtrada por `provider` e período

As abas existentes "Prompts" e "Logs / consumo" continuam intactas.

---

## 2. Ativar IA de verdade — Edge Functions + Lovable AI Gateway

Habilitar Lovable AI Gateway (provisiona `LOVABLE_API_KEY` automaticamente — não pedimos chave ao usuário).

Criar 4 edge functions em `supabase/functions/`:

### `ia-test-connection`
- Body: `{ provider: "gemini" | "gpt" }`
- Faz uma chamada mínima (1 token) ao gateway com o modelo default do provider para validar.
- Retorna `{ ok, latency_ms, error? }`.

### `ia-list-models`
- Body: `{ provider }`
- Retorna lista curada de modelos suportados pelo gateway para o provider, cada um com `{ id, label, descricao_curta }` (ex.: `gpt-5-mini` → "rápido e barato"). Lista mantida server-side; sem chamada externa cara.

### `ia-gerar-resumo`
- Body: `{ tipo: "resumo_cliente" | "resumo_operacional", transcricao, contexto? }`
- Carrega o prompt ativo de `ia_prompts` (tipo correspondente) + config ativa de `ia_config`.
- Chama gateway via Vercel AI SDK (`generateText`) com modelo e prompt configurados.
- Insere registro em `ia_logs` com tokens/custo estimado.
- Retorna `{ texto, tokens_input, tokens_output, custo, modelo }`.

### `ia-gerar-tarefas`
- Body: `{ reuniao_id, transcricao, cliente_id }`
- Usa `Output.object` (AI SDK) com schema Zod: `{ tarefas: [{ titulo, descricao, categoria, prioridade, prazo_sugerido, responsavel_sugerido_hint }] }`.
- Insere as tarefas em `tarefas_sugeridas` com `status='pendente'` e `reuniao_id` ligado.
- Loga em `ia_logs`.
- Retorna `{ count, tarefas }`.

Helper compartilhado `supabase/functions/_shared/ai-gateway.ts` com `createLovableAiGatewayProvider` (padrão Lovable AI).

Todas com CORS, validação Zod do body, RLS-friendly (verificam JWT do chamador).

---

## 3. Integração no fluxo existente (sem quebrar nada)

- **`ReuniaoDialog.tsx`**: adicionar dois botões opcionais ao lado dos campos de resumo:
  - "Gerar resumo cliente com IA" → chama `ia-gerar-resumo` e preenche o textarea
  - "Gerar resumo operacional com IA" → idem
  - "Gerar tarefas sugeridas" → chama `ia-gerar-tarefas`, depois recarrega `useTarefasSugeridas`
- Botões só aparecem se há `ia_config` ativo correspondente.
- Geração manual continua funcionando exatamente como hoje (parsing de texto). IA é aditiva.

---

## 4. Banco de dados (migração aditiva)

Adicionar à `ia_config`:
- `modelos_disponiveis jsonb` (cache da lista de modelos curada)
- `ultima_verificacao timestamptz` (preenchida pelo Testar Conexão)
- `latency_ms int` (idem)

Nenhuma coluna existente alterada. `ia_logs` já tem `tokens_input/output/custo` — basta começar a popular.

---

## 5. Detalhes técnicos

**Stack:**
- Edge functions: Deno + `npm:ai` + `npm:@ai-sdk/openai-compatible` + `npm:zod`
- Frontend: novo `ProviderCard` reutilizável dentro de `IAConfigManager.tsx`, sparkline com `recharts` (já no projeto), botões/select via shadcn (já existentes), tokens semânticos (`text-emerald-500` para Conectado, `text-muted-foreground`, etc.)
- Custo estimado client-side a partir de tabela de preços hardcoded por modelo (mesmo fallback que o gateway usa).

**Modelos curados expostos no Select:**
- GPT: `gpt-5-nano` (rápido/barato), `gpt-5-mini` (default), `gpt-5` (qualidade)
- Gemini: `gemini-2.5-flash-lite`, `gemini-2.5-flash` (default), `gemini-2.5-pro`

**Segurança:** `LOVABLE_API_KEY` só vive nas edge functions. Frontend nunca a vê. Nenhuma chave pedida ao usuário.

**Compatibilidade:** Layout atual da aba IA (Provider/Prompts/Logs) preservado — só o conteúdo da sub-aba "Provedor" muda. Stores `useIAConfig` ganham `testConnection`, `refreshModels`, `getConsumo(provider, periodo)`. Métodos antigos intactos.

---

## Ordem de execução

1. Migração: 3 colunas em `ia_config`.
2. Habilitar Lovable AI Gateway.
3. Criar `_shared/ai-gateway.ts` + 4 edge functions.
4. Refatorar `IAConfigManager.tsx` com novo `ProviderCard` (header + status + sparkline).
5. Estender `useIAConfig` com helpers de teste/modelos/consumo.
6. Adicionar botões de IA no `ReuniaoDialog.tsx`.
7. Validar visualmente vs. screenshot e testar `ia-test-connection`.
