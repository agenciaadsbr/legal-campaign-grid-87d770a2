## Objetivo

Trocar o texto dos tooltips dos indicadores rápidos da tabela de Clientes para usar a palavra **"Tarefa"** em vez de **"demanda"**, mantendo todo o resto (ícones, cores, contagens) igual.

## Alteração em `src/components/clientes/ClientesGeralTable.tsx`

Na coluna **Cliente**, dentro dos badges de saúde:

1. **Tooltip do indicador ⌛ (atrasadas)** — linha 353
   - De: `{demAtrasadas} demanda{...} atrasada{...}`
   - Para: `{demAtrasadas} Tarefa{demAtrasadas > 1 ? "s" : ""} atrasada{demAtrasadas > 1 ? "s" : ""}`

2. **Tooltip do indicador ⚡ (urgentes)** — linha 366
   - De: `{demUrgentes} demanda{...} urgente{...}`
   - Para: `{demUrgentes} Tarefa{demUrgentes > 1 ? "s" : ""} urgente{demUrgentes > 1 ? "s" : ""}`

Os demais tooltips (posts atrasados, vencimento de contrato, onboarding) permanecem inalterados.

## Validação

- Hover no badge ⌛ amarelo mostra: `2 Tarefas atrasadas` (ou `1 Tarefa atrasada`).
- Hover no badge ⚡ azul mostra: `1 Tarefa urgente` (ou `3 Tarefas urgentes`).
- Bump de `public/version.json`.
