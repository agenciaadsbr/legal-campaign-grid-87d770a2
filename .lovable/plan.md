## Problema

Hoje os 3 blocos do Planejamento (Onboarding, Campanhas, Conteúdo) são renderizados **um abaixo do outro**, ocupando 100% da largura. Cada bloco tem várias seções com vários itens, gerando uma rolagem vertical enorme — desperdiçando o espaço lateral disponível (viewport ~1936px).

## Solução

Transformar o layout em **colunas paralelas (kanban-style)**, com os 3 blocos lado a lado em telas médias/grandes, mantendo empilhamento apenas no mobile.

### Mudanças em `src/components/projeto/PlanejamentoTab.tsx`

1. **Container dos blocos** (linha ~202): trocar o stack vertical por um grid responsivo de 3 colunas:
   - `grid grid-cols-1 lg:grid-cols-3 gap-3 items-start`
   - Cada bloco vira uma coluna independente, com altura própria.

2. **Cards dos blocos**:
   - Manter o `Collapsible` (usuário ainda pode recolher um bloco).
   - Reduzir padding interno (`p-3` → `p-2.5`) e o gap entre seções (`space-y-4` → `space-y-3`).
   - Cabeçalho do bloco mais compacto: ícone + label + contador, sem ocupar linha inteira extra.

3. **Seções dentro do bloco**:
   - Título da seção em linha única menor (já está `text-xs uppercase`), reduzir margem inferior.
   - Itens com padding mais enxuto (`p-2` → `p-1.5`) e badges menores quando agrupadas.

4. **Card de progresso geral** (linha ~183): manter no topo em **largura total** (acima das 3 colunas), pois é resumo geral. Reduzir `p-4` → `p-3` e o grid de mini-métricas para `grid-cols-3 md:grid-cols-6` mais compacto.

5. **Toolbar topo**: sem mudança estrutural, apenas garantir que continua acima do grid.

### Resultado visual

```text
+-----------------------------------------------------------+
| [Progresso geral - largura total]                         |
+-----------------------------------------------------------+
| Onboarding         | Campanhas          | Conteúdo        |
| - seção 1          | - seção 1          | - seção 1       |
|   [ ] item         |   [ ] item         |   [ ] item      |
|   [ ] item         |   [ ] item         |   [ ] item      |
| - seção 2          | - seção 2          | - seção 2       |
|   [ ] item         |   [ ] item         |   [ ] item      |
+--------------------+--------------------+-----------------+
```

### Breakpoints

- `< lg` (mobile/tablet): 1 coluna (comportamento atual, empilhado).
- `>= lg` (≥1024px): 3 colunas paralelas.

### Não alterar

- Lógica de seed, store, exportação (TXT/PDF/PNG), edição inline, drag/reorder.
- Estrutura de dados (`PLAN_BLOCOS`, `PlanItem`).
- Funcionalidade do botão "Adicionar item".

Arquivo único modificado: `src/components/projeto/PlanejamentoTab.tsx`.