# Plano — Acelerar o Dash Tasks e corrigir o "Carregando CRM..." travado

## Diagnóstico

A tela de Clientes fica em "Carregando CRM..." porque o `useCRM` (`src/store/crm.ts`) baixa em paralelo TODOS os dados do sistema antes de liberar a UI — incluindo milhares de linhas de `cards`, `posts` e `comentarios` paginados de 1000 em 1000. Pior: a cada mutação (criar card, mover post, comentar) e a cada evento de realtime de QUALQUER usuário em QUALQUER uma das 13 tabelas, o store chama `_loadAll()` de novo, recarregando tudo. Em uso simultâneo isso vira loop de recarga e congela a tela.

Os 4 gargalos:

1. **`_loadAll()` chamado após cada mutação** (38 ocorrências no store) — 1 clique = milhares de linhas trafegadas.
2. **Realtime dispara `_loadAll()` em 13 tabelas sem debounce** — qualquer alteração de qualquer usuário recarrega tudo na tela de todo mundo.
3. **`comentarios` baixado inteiro** só para preencher a coluna "Último comentário" da lista de clientes.
4. **`cards` e `posts` baixados inteiros** mesmo quando a tela de Clientes só precisa de contagens agregadas (Posts atrasados / Tarefas atrasadas / Tarefas urgentes). É o que prende a tela em "Carregando CRM…" e faz aparecer "Sincronizando dados detalhados...".

## Mudanças

### 1. Boot rápido em duas fases (`src/store/crm.ts`)
- Dividir `_loadAll()` em `loadCore()` (rápido — responsáveis, clientes, contratos, colunas, status, nichos, profiles, custom_fields) e `loadHeavy(slice)` sob demanda (cards/posts/comentários só quando a rota precisa).
- A tela de Clientes deixa de esperar por cards/posts/comentarios — libera a UI assim que o core carrega.

### 2. Eliminar reload geral após mutações
- Trocar todos os `await get()._loadAll()` em `addCliente`, `updateCliente`, `deleteCliente`, `addCard`, `updateCard`, `moveCard`, `deleteCard`, `addPost`, `updatePost`, `addComentario`, `addAlerta`, `createCicloPosts`, etc. por **patch local do estado** usando a linha já retornada pelo Supabase. Mutação fica instantânea.

### 3. Realtime delta (não recarga total)
- Substituir o handler único que chama `_loadAll()` por handlers por tabela que aplicam o **delta do payload** (`eventType`, `new`, `old`) direto no slice correspondente.
- Tabelas de configuração raramente alteradas (`status_options`, `nichos`, `colunas_cliente`, `modelos_colunas`, `custom_fields`, `responsaveis`) ganham debounce de 2s antes de refazer só aquela query.
- Realtime continua ativo nas mesmas 13 tabelas; só para de reprocessar tudo a cada evento — fim do loop de recarga.

### 4. Agregações no banco para a lista de Clientes
- Criar view `clientes_metricas(cliente_id, posts_atrasados, tarefas_atrasadas, tarefas_urgentes, posts_pendentes, posts_postados)` calculada com `count(*) filter (where ...)` em `cards`.
- Criar view `clientes_ultimo_comentario(cliente_id, texto, autor, created_at)` retornando só a última observação por cliente.
- A página de Clientes consome essas duas views (~95 linhas cada) em vez de baixar todos os cards e comentários. Histórico completo continua carregando sob demanda quando o usuário abre o dialog.

### 5. Ganhos menores
- Cache em memória com TTL 5 min para dados estáticos (`responsaveis`, `nichos`, `status_options`, `custom_fields`, `colunas_cliente`, `modelos_colunas`) — evita refetch ao trocar de rota.
- Garantir índices em `cards(cliente_id, status, is_urgent, data_limite_tarefa)`, `comentarios(cliente_id, created_at desc)`, `posts(card_id)` — criar só os que faltarem.

## Garantias de não-regressão

- Nenhuma funcionalidade muda: Kanban, Projeto Completo, Posts, Reuniões, Comentários, Alertas, Workflow e IA continuam idênticos.
- As views são só leitura — nada é apagado.
- Realtime continua ligado nas mesmas tabelas; só fica mais inteligente.
- O badge "Sincronizando dados detalhados..." some na tela de Clientes (não precisa mais dos slices pesados).

## Resumo técnico

```text
src/store/crm.ts
  - _loadAll → loadCore() (rápido) + loadHeavy(slice) sob demanda
  - 38× await _loadAll() → patch local com retorno do Supabase
  - startRealtime() → handler por tabela com delta + debounce 2s p/ configs
  - novo: loadMetricasClientes()        → view clientes_metricas
  - novo: loadUltimoComentario()        → view clientes_ultimo_comentario

supabase/migrations/*
  - CREATE VIEW public.clientes_metricas           (security_invoker=on)
  - CREATE VIEW public.clientes_ultimo_comentario  (security_invoker=on)
  - CREATE INDEX se necessário em cards/comentarios/posts

src/pages/Clientes.tsx
  - consome as views; deixa de depender dos slices cards/posts/comentarios
```

Posso implementar?
