# Plano — Acelerar carregamento do Dash Tasks (sem quebrar nada)

## Diagnóstico

Mapeei o `useCRM` (`src/store/crm.ts`) e a página de Clientes. Os 4 gargalos principais:

1. **`_loadAll()` é chamado após CADA mutação (38 ocorrências no store).** Criar 1 card, mover 1 post, alterar 1 comentário → recarrega responsáveis, clientes, contratos, colunas, modelos, status, nichos, profiles, custom_fields, **+ todos os cards, posts e comentários paginados de 1000 em 1000**. Em uma base com 95 clientes isso significa milhares de linhas trafegadas a cada clique.
2. **Realtime dispara `_loadAll()` em 13 tabelas, sem debounce.** Qualquer alteração de qualquer usuário em qualquer tabela faz a tela inteira recarregar tudo. Em uso simultâneo, o sistema fica em loop de recarga.
3. **`comentarios` é baixado inteiro só para preencher a coluna "Último comentário"** de cada cliente. Hoje é a tabela com mais linhas.
4. **`cards` e `posts` são baixados inteiros** mesmo quando a tela só precisa de contagens agregadas (Posts atrasados / Tarefas atrasadas / Tarefas urgentes). Por isso aparece o badge "Sincronizando dados detalhados..." e as colunas ficam vazias até terminar.

Tudo isso é seguro de corrigir — nenhuma funcionalidade existente depende do reload geral; depende apenas de o estado local ficar consistente, o que dá pra fazer com updates locais + realtime delta.

## Mudanças propostas

### 1. Eliminar o reload geral após mutações (frontend, `src/store/crm.ts`)
- Substituir todos os `await get()._loadAll()` em `addCliente`, `updateCliente`, `deleteCliente`, `addCard`, `updateCard`, `moveCard`, `deleteCard`, `addPost`, `updatePost`, `addComentario`, `addAlerta`, `createCicloPosts`, etc. por **patch local do estado** com a linha já retornada pelo Supabase (insert/update já devolvem o registro; delete já tem o id).
- Resultado: mutação fica instantânea, sem refetch de milhares de linhas.

### 2. Realtime mais inteligente
- Trocar o handler único que chama `_loadAll()` por handlers por tabela que aplicam o **delta do payload** (`eventType`, `new`, `old`) direto no slice correspondente (`cards`, `posts`, `comentarios`, `alertas`, `clientes`, `contratos`).
- Tabelas de configuração raramente mudadas (`status_options`, `nichos`, `colunas_cliente`, `modelos_colunas`, `custom_fields`, `responsaveis`) ficam com debounce de 2s antes de refazer só aquela query.
- Realtime continua ativo em todas as 13 tabelas; só para de reprocessar tudo a cada evento.

### 3. Coluna "Último comentário" via agregação
- Criar uma **view materializável leve** ou função SQL `clientes_ultimo_comentario(cliente_id, texto, autor, created_at)` que retorne apenas a última observação por cliente (não a lista inteira).
- O store passa a hidratar `cliente.ultimo_comentario` por essa view no carregamento inicial; o histórico completo de comentários continua sendo carregado **sob demanda** quando o usuário abre o dialog de histórico (já existe esse fluxo).

### 4. Métricas de cards/posts agregadas no banco
- Criar a view `clientes_metricas(cliente_id, posts_atrasados, tarefas_atrasadas, tarefas_urgentes, posts_pendentes, posts_postados)` calculada com `count(*) filter (where ...)` direto em `cards`.
- A página de Clientes consome essa view (1 select rápido, ~95 linhas) em vez de baixar todos os cards.
- O store continua tendo o slice `cards` para as outras telas (Kanban, Projeto Completo, Posts), mas esse slice passa a ser **lazy**: só carrega quando o usuário entra em uma rota que precisa dele (`/clientes/:id`, `/clientes/:id/posts`, etc.). A tela de listagem de Clientes deixa de esperar por ele.

### 5. Pequenos ganhos
- Cache em memória dos dados estáticos (`responsaveis`, `nichos`, `status_options`, `custom_fields`, `colunas_cliente`, `modelos_colunas`) com TTL de 5 min, evitando refetch quando o usuário troca de rota.
- Remover o `for…of` sequencial de `authoresPorAuthId` (já é rápido, mas fica como `Object.fromEntries`).
- Garantir índices em `cards(cliente_id)`, `cards(status)`, `cards(is_urgent)`, `cards(data_limite_tarefa)`, `comentarios(cliente_id, created_at desc)`, `posts(card_id)` — a maioria já existe via FKs, vou validar e criar só os faltantes.

## Garantias de não-regressão

- Nenhum dado é apagado: as mudanças são só de leitura/cache.
- Todas as funcionalidades atuais continuam (Kanban, Projeto Completo, Posts, Reuniões, Comentários, Alertas, Workflow, IA).
- O badge "Sincronizando dados detalhados..." pode permanecer enquanto o slice `cards` carrega em rotas que ainda dependem dele.
- Realtime continua ligado nas mesmas tabelas.

## Resumo técnico (para devs)

```text
src/store/crm.ts
  - _loadAll → divide em loadCore() (rápido) + loadHeavy(slice) sob demanda
  - 38× await get()._loadAll() → patch local + retorno otimizado do Supabase
  - startRealtime() → handler por tabela com delta + debounce 2s para configs
  - novo: loadMetricasClientes() consumindo view clientes_metricas
  - novo: loadUltimoComentario() consumindo view clientes_ultimo_comentario

supabase/migrations/*
  - CREATE VIEW public.clientes_metricas (security_invoker=on)
  - CREATE VIEW public.clientes_ultimo_comentario (security_invoker=on)
  - CREATE INDEX se necessário em cards/comentarios
```

Quer que eu siga com essa implementação?