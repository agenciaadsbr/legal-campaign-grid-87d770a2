## Objetivo

Separar a IA atual (que mistura objetivos) em **dois agentes totalmente independentes**, cada um com seu próprio provider, modelo, prompt, temperatura e contexto adicional. Tudo o que já existe (configs de provider, prompts antigos, fluxo de reunião, tarefas sugeridas, logs) é mantido — apenas adicionamos a nova camada de "agentes".

---

## 1. Banco de dados (nova tabela `ia_agentes`)

Criar tabela dedicada para os agentes (não mexe em `ia_config` nem `ia_prompts`):

```text
ia_agentes
- id uuid pk
- tipo text  ('resumo_cliente' | 'operacional')   UNIQUE
- nome text                                        ('Agente Resumo Cliente', 'Agente Operacional')
- provider text                                    ('gpt' | 'gemini')
- model text
- prompt text                                      (system prompt completo, editável)
- temperatura numeric default 0.4
- contexto_adicional text                          (instruções extras opcionais)
- regras_categorizacao text  (apenas operacional, nullable)
- regras_responsaveis text   (apenas operacional, nullable)
- ativo boolean default true
- created_at / updated_at
```

RLS: leitura para `authenticated`, escrita só para `admin` (mesmo padrão de `ia_config`).

Seed inicial: inserir 2 linhas (`resumo_cliente` e `operacional`) já preenchidas com prompts de boas práticas e provider/modelo da `ia_config` ativa.

Adicionar coluna em `reunioes` para rastrear processamento:

```text
reunioes
+ ia_processed_at timestamptz null
+ ia_status jsonb default '{}'  -- { cliente: 'ok'|'erro'|null, operacional: 'ok'|'erro'|null, tarefas: 'ok'|'erro'|null, msg?: string }
```

---

## 2. Edge Functions

**Manter** `ia-gerar-resumo`, `ia-gerar-tarefas`, `ia-test-connection`, `ia-list-models` (sem mudanças de comportamento).

**Adicionar `ia-processar-reuniao`** (orquestrador novo):
- Input: `{ reuniao_id, modo: 'novo' | 'substituir' | 'manter' }`
- Lê transcrição da reunião e os 2 agentes da `ia_agentes`.
- Dispara em **paralelo** (`Promise.allSettled`):
  - **Agente 1 (resumo_cliente)** → `generateText` com seu provider/modelo/prompt/temperatura → grava `reunioes.resumo_cliente`.
  - **Agente 2 (operacional)** → 2 chamadas sequenciais com o **mesmo agente** (mesma config, contextos diferentes):
    1. `generateText` resumo operacional detalhado → grava `reunioes.resumo_tarefas`.
    2. `generateText` + `experimental_output` (schema Zod) extraindo tarefas + responsável sugerido (consultando `responsabilidades_equipe` para mapear skills/setores) → insere em `tarefas_sugeridas`.
- Antes de inserir tarefas: se já existem com `reuniao_id` e `status='aguardando_aprovacao'`, respeita `modo`:
  - `manter` → não insere nada novo.
  - `substituir` → deleta as antigas ainda não aprovadas e insere as novas.
  - `novo` (default) → insere em paralelo às existentes.
  - **Nunca** toca tarefas com status diferente de `aguardando_aprovacao`.
- Atualiza `reunioes.ia_processed_at` e `ia_status` por etapa.
- Grava 1 log em `ia_logs` por agente (com `tipo='agente_cliente'` e `tipo='agente_operacional'`).

Ambos agentes rodam **isolados** — sem compartilhar memória/contexto entre si.

---

## 3. Frontend — Configurações → IA → nova aba "Agentes"

Em `src/components/configuracoes/IAConfigManager.tsx`, adicionar TabsTrigger **"Agentes"** ao lado de Provedor/Prompts/Logs (mantém os existentes).

Novo componente `IAAgentesManager.tsx` com 2 cards lado a lado:

**Card 1 — Agente Resumo Cliente**
- Nome (input)
- Provider (select: GPT / Gemini)
- Modelo (select dependente do provider, reutiliza `CURATED_MODELS`)
- Temperatura (slider 0–1)
- Prompt (textarea grande, com placeholder explicando objetivo "simplificar para WhatsApp")
- Contexto adicional (textarea curto)
- Botão "Salvar"

**Card 2 — Agente Operacional**
- Mesmos campos +
- Regras de categorização (textarea)
- Regras de responsáveis (textarea, com hint "consulta Configurações → Responsabilidades da Equipe")

Store novo: `src/store/iaAgentes.ts` (Zustand), espelhando o padrão do `iaConfig.ts`.

---

## 4. Frontend — `ReuniaoDialog.tsx`

Manter tudo que existe. **Adicionar** acima da Tabs uma nova seção compacta "Processamento IA":

```text
┌─ Processamento IA ──────────────────────────────────────┐
│ ✅ Resumo cliente   ✅ Resumo operacional   ⚠ Tarefas  │
│ Última execução: 11/05/2026 15:42                       │
│ [✨ Processar reunião com IA]   [🔄 Reprocessar]        │
└─────────────────────────────────────────────────────────┘
```

Comportamento:
- Botão **"Processar reunião com IA"** chama `ia-processar-reuniao` com `modo='novo'`. Habilitado se houver transcrição e a reunião já estiver salva.
- Se a reunião já tiver `ia_processed_at`, o botão vira **"Reprocessar IA"** e abre um pequeno diálogo de confirmação:
  - "Já existem tarefas sugeridas para esta reunião." → opções `Substituir` / `Manter` / `Gerar novas separadamente`.
  - Resumos manuais editados: confirma antes de sobrescrever (`resumo_cliente`/`resumo_tarefas` não vazios → pergunta).
- Indicadores ✅/⚠ vêm de `reunioes.ia_status`.
- Os botões antigos "Gerar com IA" individuais permanecem (compatibilidade), mas passam a usar o agente correspondente automaticamente.

---

## 5. Tarefas sugeridas — responsáveis

`ia-processar-reuniao` carrega `responsabilidades_equipe` (cargo, areas, skills, setores) e injeta como contexto no Agente Operacional. O schema Zod das tarefas ganha `responsavel_sugerido_id` (uuid opcional). Inserção em `tarefas_sugeridas` preenche `responsavel_sugerido_id` quando a IA retornar match. Nunca delega automaticamente — apenas sugere; aprovação manual continua igual.

---

## 6. Logs

`ia_logs` ganha registros com `tipo` em `agente_cliente`, `agente_operacional`, `agente_operacional_tarefas`. Exibidos na aba Logs/consumo já existente sem mudanças de UI além do novo tipo aparecendo.

---

## Garantias de não regressão

- `ia_config`, `ia_prompts`, `ia-gerar-resumo`, `ia-gerar-tarefas`, `IAProviderCard`, fluxo atual de "Gerar com IA" individual: **inalterados**.
- Nenhuma mudança de layout fora da nova seção "Processamento IA" no modal e da nova aba "Agentes" em Configurações.
- Tarefas já aprovadas nunca são tocadas.
- Sem sobrescrever conteúdo manual sem confirmação.

---

## Ordem de implementação

1. Migração SQL (`ia_agentes` + colunas em `reunioes` + seed).
2. Store `iaAgentes.ts` + componente `IAAgentesManager.tsx` + nova aba em `IAConfigManager`.
3. Edge function `ia-processar-reuniao`.
4. Seção "Processamento IA" + botões no `ReuniaoDialog`.
5. Diálogo de confirmação anti-duplicidade / anti-sobrescrita.
