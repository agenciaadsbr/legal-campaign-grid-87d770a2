## Contratos flexíveis de 1 a 6 meses

### `src/store/crm.ts`
- Alterar `gerarCardsEPosts(cliente_id, responsaveis, meses: number)` para gerar `meses * 4` cards (loop de mês 1..meses, 4 semanas cada).
- O campo `mes_referencia` e `numero_semana` continuam preenchidos corretamente em cada card.
- Em `addCliente`, calcular `meses` a partir de `data_inicio_contrato` e `data_fim_contrato` (clamp 1–6) e passar para `gerarCardsEPosts`.
- Atualizar criação do contrato para usar `total_posts = meses * 4`.
- Bump do `persist.name` para `crm-juridico-v7` para invalidar cache local e re-semear demo.
- Atualizar seeds de demo para incluir clientes com 3 e 6 meses, demonstrando o comportamento.

### `src/pages/Clientes.tsx` (formulário Novo Cliente)
- Adicionar select "Duração (meses)" de 1 a 6.
- Auto-calcular `data_fim_contrato` somando a duração à `data_inicio_contrato` (mantendo edição manual permitida).
- Exibir prévia: "Serão criados N cards" (N = meses × 4).

### `src/pages/ClienteDetalhe.tsx`
- Substituir filtro fixo "Mês 1/2/3" por geração dinâmica de opções baseada em `contrato.total_posts / 4` (ou no maior `mes_referencia` dos cards do cliente).
- Mantém filtro "Todos os meses".

### Refletir no restante do sistema
- `Dashboard`, `Relatorios`, `Contratos`, `Alertas`: já consomem `cards`, `posts` e `contrato.total_posts` dinamicamente — apenas validar que não há `=== 12` ou `=== 3` hardcoded; substituir por `contrato.total_posts` quando houver.
- `PostDetalhe`: nada a mudar (usa post individual).

### Preservado
- Estrutura de status, responsáveis, comentários, campos personalizados.
- Comportamento Kanban e agrupamento por status.