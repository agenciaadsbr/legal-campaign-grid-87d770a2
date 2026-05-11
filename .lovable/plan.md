Plano de implementação por fases para evoluir o Dash Tasks em uma central operacional, sem quebrar nada do que já existe. Cada fase é **aditiva**: novas colunas, novas tabelas, novas abas e novas áreas, sempre com migrações compatíveis (colunas nullable, defaults seguros) e sem mexer em layout, Kanbans, filtros, tarefas ou dados atuais.

A regra geral em todas as fases:
- Migrações apenas com `ADD COLUMN ... NULL` ou `CREATE TABLE IF NOT EXISTS`.
- Nada de `DROP`, `RENAME` físico ou alteração de tipos existentes.
- RLS nas tabelas novas seguindo o padrão atual (`auth_read_*` + `can_write` / `has_role admin`).
- Renomeações são **apenas visuais** (label no front), nunca no banco nem em rotas.

---

## Fase 1 — Novas colunas em Clientes (gerenciais)

Objetivo: enriquecer a listagem de clientes sem alterar tabela, filtros ou badges atuais.

Migração (aditiva em `public.clientes`):
- `data_contratacao date NULL`
- `status_relacionamento text NULL` (valores aceitos no front: Bom / Neutro / Crítico)
- `status_performance text NULL` (Alto / Médio / Baixo)
- `link_relatorio text NULL`

Front:
- `ClientesGeralTable.tsx`: adicionar 4 novas colunas ao final, ocultas por padrão via o sistema de `colunas_cliente` existente (admin liga quando quiser). Não tocar nas colunas atuais nem na ordenação atual.
- Edição inline reaproveitando o padrão já existente das colunas customizadas.
- Badges leves usando tokens semânticos (`bg-muted`, variantes do `ColorBadge`) — sem cores hardcoded.
- "Período de contrato" continua exatamente como está.

Validação: abrir `/clientes`, conferir que tudo carrega igual e que as novas colunas aparecem só quando habilitadas.

---

## Fase 2 — Reestruturar Documentação (apenas visual)

Objetivo: separar reuniões de documentação operacional, sem migrar dados.

- A aba `Documentação` no Projeto Completo passa a se chamar **"Acessos, Links e Materiais"** (somente label em `ClienteDetalhe.tsx` / `DocumentacaoTab.tsx`).
- Dentro da aba, agrupar visualmente por categoria já existente em `cliente_documentacao.bloco` / `tipo`, criando seções: Acessos, Links importantes, Materiais enviados, Relatórios, CRM / Automação, Outros.
- Itens sem categoria caem em "Outros" — nada é movido fisicamente.
- Zero mudanças em `documentos_globais` ou nas regras de aplicação automática.

Validação: documentos antigos continuam aparecendo, edição/upload continuam funcionando.

---

## Fase 3 — Nova aba "Reuniões" no Projeto Completo

Objetivo: central de reuniões por cliente.

Migração (novas tabelas):
- `reunioes` (id, cliente_id, titulo, data timestamptz, tipo text, link_tldv text, transcricao text, observacoes text, responsavel_id uuid, resumo_cliente text, resumo_tarefas text, criado_por, created_at, updated_at).
- RLS: leitura para autenticados, insert/update via `can_write`, delete via admin (mesmo padrão de `demandas`).
- Trigger `set_updated_at`.

Front:
- Nova aba "Reuniões" em `ClienteDetalhe` (após Documentação).
- Componente `ReunioesTab.tsx` em `src/components/projeto/`: lista ordenada por data desc, card com título/data/tipo/responsável.
- Dialog `ReuniaoDialog.tsx` com botões: Ver transcrição, Editar, Gerar resumo cliente, Gerar resumo tarefas (na Fase 3 estes dois últimos abrem só os campos de texto — IA entra na Fase 8).
- Store `src/store/reunioes.ts` no padrão Zustand do projeto.

Validação: aba aparece, criar/editar/listar funciona, demais abas intactas.

---

## Fase 4 — Estrutura de Resumos (manual)

Objetivo: separar resumo cliente x resumo operacional, ainda sem IA.

- Já contemplado nos campos `resumo_cliente` e `resumo_tarefas` da Fase 3.
- No `ReuniaoDialog`, dois `RichTextEditor` separados, cada um com botão "Copiar" (cliente: pronto pra mandar no grupo; tarefas: pronto pra virar tarefas sugeridas).
- Sem chamadas a IA.

Validação: usuário consegue preencher manualmente e copiar.

---

## Fase 5 — Tarefas Sugeridas

Objetivo: camada intermediária entre reunião e tarefa real.

Migração (nova tabela `tarefas_sugeridas`):
- Campos: id, cliente_id, reuniao_id (nullable), titulo, descricao, categoria, responsavel_sugerido_id, prioridade, prazo_sugerido, origem text default 'reuniao', status text default 'aguardando_aprovacao', demanda_id (preenchido ao converter), criado_por, aprovado_por, created_at, updated_at.
- Status aceitos: `aguardando_aprovacao | aprovada | rejeitada | convertida`.
- RLS: leitura autenticados; insert via `can_write`; update/delete só admin (gestores) — controle gerencial.

Front:
- Nova aba "Tarefas Sugeridas" dentro da Central de Tarefas (Fase 6). Acessível também como botão dentro da reunião.
- Ações: Aprovar (cria registro em `demandas` reutilizando o store atual + grava `demanda_id` e `status='convertida'`), Rejeitar, Editar.
- Conversão preserva vínculo: a demanda criada herda título/descrição/categoria/responsável/prazo e ganha campo `origem_reuniao_id` (ver migração abaixo).

Migração extra (aditiva em `demandas`):
- `origem_reuniao_id uuid NULL`
- `origem_sugestao_id uuid NULL`

Validação: aprovar uma sugestão gera demanda real visível no Kanban atual, sem alterar fluxo de criação manual.

---

## Fase 6 — Evoluir "Minhas Tarefas" → "Central de Tarefas"

Objetivo: agrupar tudo numa central, sem remover a página atual.

- Manter rota `/minhas-tarefas` funcionando.
- Renomear visualmente para "Central de Tarefas" no sidebar e no título da página.
- Dentro da página, transformar o conteúdo atual em uma aba "Minhas Tarefas" e adicionar abas:
  - Minhas Tarefas (conteúdo atual intacto)
  - Todas as Tarefas (lista global — reutiliza `useDemandas`)
  - Tarefas Sugeridas (Fase 5)
  - Ciclos (placeholder na Fase 6, estrutura na Fase 6.x futura)
  - Criar Tarefa (abre o dialog atual de criação)
- Nenhuma alteração de comportamento na aba "Minhas Tarefas".

Validação: usuário acessa o link antigo e cai na mesma experiência; novas abas aparecem ao lado.

---

## Fase 7 — Base de Responsabilidades da Equipe

Objetivo: preparar terreno para sugestões automáticas de responsável.

Migração:
- Nova tabela `responsabilidades_equipe` (id, profile_id, cargo text, areas text[], skills text[], setores text[], responsabilidades text, observacoes, created_at, updated_at).
- RLS: leitura autenticados; insert/update/delete só admin.

Front:
- Nova aba em `Configurações` chamada "Responsabilidades da Equipe" (admin only, padrão das outras tabs admin).
- CRUD simples por usuário com chips para áreas/skills/setores. Exemplos pré-cadastráveis: vídeos, tráfego, LP, design, IA, atendimento, CRM.

Validação: dados salvam, apenas admin acessa.

---

## Fase 8 — Preparação para IA (sem ativar automações)

Objetivo: estrutura de chaves, prompts e logs.

Migração:
- `ia_config` (id, provider text [gemini|gpt], model text, ativo bool, created_at, updated_at) — sem armazenar keys.
- `ia_prompts` (id, tipo text [resumo_cliente|resumo_operacional|tarefas_sugeridas], conteudo text, ativo bool, updated_at).
- `ia_logs` (id, tipo text, input_resumo text, tokens_input int, tokens_output int, custo numeric, modelo text, created_at, criado_por).
- RLS: admin para escrita; leitura autenticados em prompts/config; logs só admin.

Secrets (via tool de secrets, não banco): `GEMINI_API_KEY`, `OPENAI_API_KEY` — adicionar somente quando o usuário confirmar e fornecer. **Nada é chamado ainda**, só estrutura.

Front:
- Nova sub-aba em `Configurações` → "IA": provider ativo, modelo, edição dos prompts, visualização de logs/consumo. Botões de "Gerar resumo" continuam não chamando IA (fica para fase futura de ativação).

Validação: telas existem, salvam config; nenhum efeito colateral em fluxos atuais.

---

## Fase 9 — Regras de segurança aplicadas continuamente

Em cada PR/fase:
- Rodar `supabase--linter` após cada migração.
- Garantir que toda nova tabela tem RLS habilitada e políticas equivalentes ao padrão atual.
- Nunca usar `DROP`, `TRUNCATE`, `ALTER COLUMN TYPE` em tabelas existentes.
- Nada de cores hardcoded — usar tokens semânticos do `index.css`.

---

## Fase 10 — Validação final por fase

Checklist obrigatório antes de avançar:
- `/clientes` carrega e ordena igual.
- Projeto Completo abre, todas as abas antigas funcionam.
- Kanban de Demandas e de Posts intactos.
- `/minhas-tarefas` mostra as mesmas tarefas de antes.
- Filtros, badges e responsáveis sem regressão.
- `supabase--linter` sem novos avisos críticos.

---

## Resumo técnico (referência rápida)

Tabelas novas: `reunioes`, `tarefas_sugeridas`, `responsabilidades_equipe`, `ia_config`, `ia_prompts`, `ia_logs`.
Colunas novas:
- `clientes`: `data_contratacao`, `status_relacionamento`, `status_performance`, `link_relatorio`.
- `demandas`: `origem_reuniao_id`, `origem_sugestao_id`.
Stores novos: `src/store/reunioes.ts`, `src/store/tarefasSugeridas.ts`, `src/store/responsabilidades.ts`, `src/store/ia.ts`.
Componentes novos: `ReunioesTab`, `ReuniaoDialog`, `TarefasSugeridasTab`, `CentralTarefasTabs`, `ResponsabilidadesEquipeManager`, `IAConfigManager`.
Renomeações **somente visuais**: "Documentação" → "Acessos, Links e Materiais"; "Minhas Tarefas" → "Central de Tarefas".
