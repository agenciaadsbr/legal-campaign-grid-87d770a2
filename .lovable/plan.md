## Objetivo
Corrigir o tamanho dos cards exibidos em **"Demandas com data limite no mês"** (aba Calendário do módulo Demandas), que atualmente aparecem esticados/compridos ocupando toda a largura disponível. Os cards devem ficar no tamanho padrão usado no **Quadro Geral** (Kanban), dispostos lado a lado com quebra de linha automática quando o espaço acabar.

## Diagnóstico
Em `src/pages/Demandas.tsx` (linhas 229-239), o container da lista usa:
- `flex-1 space-y-2` → empilha verticalmente, e como `DemandCard` é `display: block` (div), ele se estende ocupando 100% da largura do `flex-1` (que pode ter ~1500px+ no viewport atual de 2368px).

No Quadro Geral (`DemandasKanban.tsx`), as colunas têm `auto-cols-[minmax(260px,1fr)]` — limitando o card a ~260-280px de largura, que é o tamanho padrão correto.

## Alteração proposta
**Arquivo:** `src/pages/Demandas.tsx` (linhas 229-239)

Trocar o container vertical (`space-y-2`) por um **CSS grid responsivo** com colunas de largura fixa mínima (~260px), permitindo que os cards fluam lado a lado e quebrem para a próxima linha automaticamente — exatamente como descrito pelo usuário.

### Mudança específica
- Substituir `flex-1 space-y-2 max-h-96 overflow-y-auto` no wrapper por `flex-1 max-h-96 overflow-y-auto`
- Envolver o título "Demandas com data limite no mês:" + a grid em estrutura adequada
- A grid de cards usará: `grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2`
  - `auto-fill` + `minmax(260px,1fr)` → cria quantas colunas couberem com no mínimo 260px
  - Cards mantêm tamanho compacto (mesmo padrão visual do Kanban)
  - Quebra de linha automática quando o espaço da linha se esgota

## Garantias
- ❌ **Nenhuma alteração** no componente `DemandCard` (mantém visual idêntico ao usado no Kanban e em "Minhas Demandas").
- ❌ **Nenhuma alteração** no `DemandasKanban`, filtros, store, ou demais abas.
- ✅ Apenas o layout do container da lista do Calendário é ajustado.
- ✅ Comportamento de scroll vertical (`max-h-96 overflow-y-auto`) preservado.
- ✅ Responsivo: em telas estreitas (mobile) cairá naturalmente para 1 coluna pelo `auto-fill`.

## Resultado esperado
- Cards no Calendário com a mesma largura compacta do Quadro Geral.
- Cards exibidos lado a lado horizontalmente, quebrando para a linha seguinte quando preenchem o espaço da linha — comportamento semelhante ao Kanban referenciado pelo usuário.
