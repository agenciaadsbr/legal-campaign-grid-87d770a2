## Objetivo

Na aba **Documentação**, alterar o layout dos blocos (Acessos, Links, Reuniões, Materiais, Documentos, Observações) para que fiquem dispostos lado a lado em colunas (como o destaque vermelho na imagem de referência), em vez de empilhados verticalmente.

## Mudanças

**Arquivo:** `src/components/projeto/DocumentacaoTab.tsx`

1. Substituir o container atual dos blocos (`<div id="documentacao-export-root" className="space-y-3">`) por um **grid responsivo**:
   - Mobile (`<768px`): 1 coluna (empilhado)
   - Tablet (`md`): 2 colunas
   - Desktop (`lg+`): 3 ou 4 colunas (a definir conforme melhor caimento — proposta inicial: **3 colunas em `lg`, 4 em `xl`**)
   - Cada `Collapsible`/`Card` de bloco vira uma célula do grid.

2. Ajustes finos:
   - Remover `space-y-3` (substituído por `gap-3` do grid).
   - Garantir que os Cards tenham altura independente (sem forçar mesma altura) para não criar espaço vazio.
   - A grade interna de itens dentro de cada bloco passa de `md:grid-cols-2` para **1 coluna**, já que cada bloco agora é mais estreito.

3. O cabeçalho (toolbar de busca/filtro/exportar/adicionar) permanece igual, ocupando toda a largura acima do grid.

4. Nada muda em `BriefingTab`, `PlanejamentoTab` nem na exportação TXT — apenas layout visual da Documentação.

## Resultado esperado

Os 6 blocos passam a se distribuir em uma grade horizontal, aproveitando a largura da tela em telas grandes, semelhante às colunas destacadas em vermelho na imagem enviada.
