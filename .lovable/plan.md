## Mudança

Em `src/components/projeto/PlanejamentoTab.tsx`, remover dos itens do checklist:
- Botões de seta ↑ ↓ (mover para cima / baixo)
- Botão de duplicar (ícone copy)

Permanecem apenas: **editar** (lápis) e **remover** (lixeira).

## Edits

1. **`SecaoBlock`**: remover funções `moverCima` / `moverBaixo` e simplificar a chamada do `ItemRow` para passar apenas `item`.
2. **`ItemRow`**: remover props `onMoverCima`, `onMoverBaixo`, `podeMoverCima`, `podeMoverBaixo`; remover hook `duplicar`; remover os 3 botões correspondentes da toolbar do item.
3. Limpar imports não utilizados: `ArrowUp`, `ArrowDown`, `Copy as CopyIcon`.

Sem mudanças em store, exportações ou layout dos blocos.
