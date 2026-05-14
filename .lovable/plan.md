## Objetivo

No módulo lateral **Criar Tarefa** (`/criar-tarefa`), exibir imediatamente **um único formulário completo** idêntico ao de Detalhes da Tarefa, com Cliente e Área/Categoria no topo, **sem criar rascunho automático no banco** e **sem etapas**. A tarefa só é persistida quando o usuário clicar em **Salvar tarefa**.

Restrições já confirmadas: não alterar Projeto Completo, kanbans, cards, dados existentes, layout do `DemandaDetalheDialog` quando usado em outros lugares.

## Diagnóstico

`DemandaDetalheDialog` (compartilhado com Projeto Completo) só funciona com uma `Demanda` real no store. Hoje todos os campos (título, descrição, status, prioridade, datas, responsáveis, anexos, comentários, link Meister/Drive, workflow) chamam `updateDemanda`/`addAnexo`/`addComentario`, que persistem **imediatamente no Supabase**. Por isso a versão anterior precisava de `createRascunho` no mount — gerando cards fantasmas. A correção seguinte escondeu o formulário até selecionar Cliente+Área, o que o usuário rejeitou.

A única forma de manter o formulário **sempre visível**, **sem alterar Projeto Completo**, e **sem persistir nada antes do Salvar**, é introduzir um **rascunho local (in-memory)** no store: uma `Demanda` com id temporário que vive só em memória. As mutações detectam esse id e atualizam apenas o estado local; nada vai ao Supabase até o commit explícito.

## Plano

### 1. Store `src/store/demandas.ts` — modo rascunho local

- Convenção: id local começa com `"local-draft-"` (gerado via `crypto.randomUUID()` prefixado). Helper `isLocalDraftId(id)`.
- Novo `createLocalRascunho({ cliente_id?, categoria? })`: monta uma `Demanda` com id local, valores default (`titulo: ""`, `categoria: categoria ?? "Personalizado"`, `status: "Criar"`, `prioridade: "Media"`, arrays vazios), insere em `demandas` em memória, retorna o objeto. **Não chama Supabase.**
- `updateDemanda(id, patch)`: se `isLocalDraftId(id)`, atualiza só `set({ demandas: ... })` e retorna. Caso contrário, comportamento atual inalterado.
- `addComentario`, `addAnexo`, `removeAnexo`, `deleteDemanda`: mesmo guard — se id local, opera só em memória (anexos/comentários armazenados com `demanda_id` local). `deleteDemanda` local apenas remove do array, sem Supabase.
- Novo `commitLocalRascunho(localId, overrides?) → Promise<Demanda | null>`:
  1. Lê a demanda local, valida `cliente_id` e `categoria` presentes (caller já validou; aqui só guarda).
  2. Faz `supabase.from("demandas").insert(...)` com **todos** os campos atuais do rascunho local + `overrides`.
  3. Pega `novo.id` real, transfere comentários/anexos locais (insert no Supabase + storage upload se houver `file` pendente — para esta fase, anexos locais ficam desabilitados; ver §3).
  4. Remove a entrada local de `demandas`, `comentarios`, `anexos`; insere as versões persistidas.
  5. Retorna a `Demanda` real.

### 2. `DemandaDetalheDialog` — props mínimas, zero mudança visual

- Adicionar props **opcionais**, sem default behavior change para chamadas existentes:
  - `showSaveButton?: boolean` — quando true, renderiza botão **Salvar tarefa** (estilo primário) + **Cancelar** no rodapé do diálogo.
  - `onSave?: () => void | Promise<void>` — handler do Salvar.
  - `onCancel?: () => void` — handler do Cancelar.
  - `disableAutoDiscard?: boolean` — quando true, `handleOpenChange(false)` **não** chama `deleteDemanda` (o caller controla descarte).
- Comportamento existente (Projeto Completo, Posts, Kanbans) permanece intacto: nada é renderizado se essas props não forem passadas.

### 3. `src/pages/CriarTarefa.tsx` — reescrita do fluxo

- No mount: chamar `createLocalRascunho({})` → obtém `localId`. **Sem Supabase, sem toast, sem card.**
- `clienteId` e `area` começam vazios (placeholders). Mudar Cliente → `updateDemanda(localId, { cliente_id })`. Mudar Área:
  - Se `Posts`: descarta o rascunho local (`deleteDemanda(localId)`) e segue o fluxo atual de `createCardRascunho` + navegação para a aba Posts (comportamento já existente preservado).
  - Senão: `updateDemanda(localId, { categoria })`.
- Renderiza **sempre** `DemandaDetalheDialog` com a demanda local, passando:
  - `headerExtras` com os dois selects (igual hoje).
  - `isRascunho` (mantém auto-foco no título).
  - `showSaveButton`, `onSave`, `onCancel`, `disableAutoDiscard: true`.
- `onSave`:
  1. Validações: se `!clienteId` → `toast.error("Selecione um cliente para criar a tarefa.")`; se `!area` → `toast.error("Selecione uma área/categoria para criar a tarefa.")`; se `!titulo.trim()` (lê do store local) → `toast.error("Informe um título para a tarefa.")`. Se faltar algo, **não persiste e não fecha**.
  2. `commitLocalRascunho(localId)` → `nova`. Se OK, `toast.success("Tarefa criada")`, `navigate(-1)` (ou para `/clientes/${cli}/projeto?tab=...&demanda=${nova.id}` se quisermos abrir já — manter `navigate(-1)` para consistência com fluxo lateral).
- `onCancel` / fechamento: `deleteDemanda(localId)` (no-op no Supabase pois é local) + `navigate(-1)`.
- Anexos durante rascunho local: na primeira iteração, **bloquear upload** quando id é local — o input chama `toast.error("Salve a tarefa primeiro para adicionar anexos.")`. Isso evita orfãos no Storage e mantém o escopo da mudança curto. Demais campos (título, descrição, status, prioridade, datas, responsáveis, links Meister/Drive, workflow, IA) funcionam normalmente em memória; alguns (workflow, comentários, IA) também exigem id real — mostrar aviso interno consistente: **"Salve a tarefa primeiro para usar esta seção."**

### 4. Validação manual

1. Abrir `/criar-tarefa` → formulário completo aparece, Cliente e Área vazios, sem cards no banco.
2. Fechar/cancelar → nenhuma demanda criada (verificar lista de demandas do cliente Lucas Carvalho).
3. Preencher Cliente + Área (não-Posts) + Título + outros campos → Salvar → uma única demanda criada no cliente/aba corretos.
4. Salvar sem título → toast de erro, formulário continua visível.
5. Trocar Área para Posts com cliente selecionado → segue para aba Posts (fluxo legado intacto).
6. Abrir uma demanda existente em Projeto Completo → comportamento idêntico ao atual (props novas não passadas → sem botão Salvar, sem mudanças).

## Detalhes técnicos

- `isLocalDraftId = (id: string) => id.startsWith("local-draft-")`.
- Em `commitLocalRascunho`, a transferência de comentários/anexos locais reusa `addComentario`/`addAnexo` com o id real após o insert.
- Como anexos/comentários/workflow ficarão bloqueados no modo local, não há orfãos no Storage nem em tabelas filhas.
- Nenhuma migration de banco é necessária.
