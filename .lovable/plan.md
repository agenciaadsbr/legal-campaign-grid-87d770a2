# Renomear "Revisar" → "Aguardando aprovação do cliente" na aba Posts

## Diagnóstico

O Kanban de Posts (coluna, badges, dropdowns) lê o rótulo direto de `statusPostOptions` (tabela `status_post_options`, label = `"Revisar"`). O `StatusBadge` prioriza essa lista dinâmica e cai no `ColorBadge`, ignorando o mapeamento amigável que já existe para "Revisar". Por isso a UI mostra "Revisar".

Renomear o registro no banco quebraria triggers que verificam o literal `'Revisar'` (`auto_marcar_atrasado`, `update_client_primary_status`, `track_approval_status_card`) e o RPC de KPIs. O usuário pediu para não remover dados nem funcionalidades.

## Solução (apenas camada de exibição)

Criar um helper `displayStatusPostLabel(label: string)` em `src/lib/demandas-categorias.ts` (ou novo arquivo `src/lib/statusDisplay.ts`) que retorna `"Aguardando aprovação do cliente"` quando o label de entrada for `"Revisar"`, e o próprio label caso contrário. Usar esse helper em todos os pontos onde `statusPostOptions[].label` é renderizado:

1. **src/components/StatusBadge.tsx** — passar `displayStatusPostLabel(dyn.label)` para `ColorBadge`. Mantém a cor e a chave de comparação intactas.
2. **src/components/clientes/PostsKanbanCliente.tsx** — o header da coluna já usa `<StatusBadge>` (será corrigido pelo item 1). Verificar dropdowns/popovers que listam `statusPostOptions.map(...)` e exibir `displayStatusPostLabel(o.label)` mantendo o `value={o.label}`.
3. **src/components/clientes/PostDetalheDialog.tsx** (linha ~351) — `<SelectItem value={o.label}>{displayStatusPostLabel(o.label)}</SelectItem>`.
4. **src/components/tarefas/TaskFormBase.tsx** (linha 412) — mesmo padrão no `<Select>`.
5. **src/pages/MinhasTarefas.tsx** (linha 405) e **src/components/OpcoesEditor.tsx** (linha 244) — onde o label aparece em listas/filtros, usar o helper só para exibição. Em `OpcoesEditor` (tela de configuração de status), manter o label original para não confundir o admin que edita a opção; **não alterar lá**.

## Não alterar

- Banco de dados, triggers, funções, RPCs, enum `demanda_status`.
- Valor de `status_card` em `cards` (continua `"Revisar"`).
- Lógica de filtros, drag-and-drop, comparações `=== "Revisar"`.
- Configurações de Demandas / OpcoesEditor (admin precisa ver/editar o label real).
- Cores e ordem das colunas.

## Validação

- Abrir `/clientes/.../?tab=posts` → coluna e badges mostram "Aguardando aprovação do cliente".
- Abrir detalhe de um post → dropdown de status mostra "Aguardando aprovação do cliente" e ao selecionar grava `"Revisar"` no banco.
- Mover card entre colunas continua funcionando.
- KPIs, contagens e triggers de atraso/aprovação inalterados.
