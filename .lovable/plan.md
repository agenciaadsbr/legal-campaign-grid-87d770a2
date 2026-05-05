## Objetivo

Permitir que **administradores** vejam, na página **Minhas Tarefas**, as tarefas atribuídas a **todos os usuários** (não apenas as suas), com um seletor para alternar entre "Minhas tarefas" e tarefas de qualquer responsável (ou de todos).

Para usuários não-admin, nada muda: continuam vendo apenas as próprias tarefas.

## Escopo da mudança

### 1. `src/lib/minhasTarefas.ts` — flexibilizar o builder

- Adicionar suporte a **múltiplos responsáveis** no `buildUnifiedTasks`:
  - Novo campo opcional `responsavelIds?: string[] | "all"` (mantém `responsavelId` para compatibilidade).
  - Quando `"all"`: inclui demandas/posts/planejamento de **qualquer** responsável; documentação de qualquer `enviado_por`.
  - Quando array específico: filtra por qualquer responsável da lista.
- Ajustar a "trava de segurança" no fim para respeitar o novo escopo (não descartar tarefas válidas no modo admin).
- Para **posts**, a chave de agrupamento passa a incluir o `responsavel_id` real do card (já é o caso, mas precisa funcionar quando há múltiplos responsáveis distintos visíveis).

### 2. `src/pages/MinhasTarefas.tsx` — seletor de visualização (apenas admin)

- Ler `isAdmin` de `useAuth()`.
- Novo estado `visualizacao: "minhas" | "todos" | <responsavelId>` (default `"minhas"`).
- Renderizar um `<Select>` no header **apenas se `isAdmin`**, com opções:
  - "Minhas tarefas" (default)
  - "Todos os usuários"
  - Lista de responsáveis (de `useCRM(s => s.responsaveis)`) ordenada por nome.
- Resolver o `responsavelIds` passado ao `buildUnifiedTasks` conforme a seleção:
  - `"minhas"` → `responsavelId` atual (comportamento de hoje)
  - `"todos"` → `"all"`
  - `<id>` → `[id]`
- Para o caso `"todos"`/`<id>` admin, passar também `authUserId` adequadamente:
  - `"todos"`: documentação de **todos** os usuários (passar `authUserId: "all"` e tratar no builder).
  - `<id>`: documentação do auth_user vinculado àquele responsável (via `profiles.responsavel_id`) — se não existir, omitir documentação.
- Atualizar o subtítulo/header para refletir a visualização ativa (ex.: "Visualizando: Todos os usuários", "Tarefas de João Silva").
- O badge "Concluir" / ações continuam funcionando, mas o admin vê tudo igualmente.

### 3. `src/components/tarefas/MinhasTarefasTabela.tsx` — coluna "Responsável" no modo admin

- Receber prop opcional `mostrarResponsavel?: boolean`.
- Quando `true`, adicionar coluna **Responsável** (após "Cliente") exibindo nomes dos responsáveis (lookup via `useCRM`), separados por vírgula, com truncate.
- Em `MinhasTarefas.tsx`, passar `mostrarResponsavel={isAdmin && visualizacao !== "minhas"}`.

### 4. KPIs

- Mantidos, mas refletem o conjunto atual (`todasTarefas` já considera o escopo da visualização). Sem mudanças adicionais.

### 5. `public/version.json`

- Bump do timestamp para forçar refresh em produção.

## Detalhes técnicos

- **RLS**: a policy de `demandas` já permite SELECT para admin (`has_role(auth.uid(), 'admin')`), então não é preciso mudar nada no banco. Para `cards`, `cliente_planejamento_itens` e `cliente_documentacao`, todas têm `auth_read_*` com `USING (true)` para autenticados — admin já lê tudo.
- **Mapeamento auth_user → responsavel**: usar `profiles.responsavel_id` (já existe na coluna). Para a opção `<id>` específica, buscar em `profiles` o `id` (auth uid) onde `responsavel_id = <id>` para incluir documentação correspondente. Se não houver vínculo, documentação fica vazia para essa visualização.
- **Sem mudanças de schema** e sem migrations.

## Resumo de arquivos editados

- `src/lib/minhasTarefas.ts`
- `src/pages/MinhasTarefas.tsx`
- `src/components/tarefas/MinhasTarefasTabela.tsx`
- `public/version.json`
