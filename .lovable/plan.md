# Atalho do Relatório no cabeçalho do Projeto Completo

## Objetivo
Exibir, no cabeçalho do Projeto Completo do cliente (ao lado do badge de status), o mesmo acesso ao relatório (`cliente.link_relatorio`) já disponível na coluna "Relatório" da aba Clientes — sem duplicar dados nem alterar a coluna existente.

## Onde mexer
Apenas em `src/pages/ProjetoCliente.tsx`, no bloco do header (linhas ~236–245), logo após `<StatusClienteBadge>`.

Nenhum outro arquivo é alterado. A coluna `LinkRelatorioCell` em `ClienteCellEditors.tsx` e o uso em `ClientesGeralTable.tsx` ficam intactos.

## Comportamento

- Lê `cliente.link_relatorio` direto do store (`useCRM`). Como ambos os pontos consomem o mesmo store, a sincronização é automática nos dois sentidos.
- Se `link_relatorio` existir: renderiza um botão pequeno `variant="outline" size="sm"` com ícone `BarChart3` + texto "Relatório" + ícone `ExternalLink`. Ao clicar, abre o link em nova aba (`target="_blank" rel="noreferrer"`).
- Se `link_relatorio` estiver vazio: renderiza um botão discreto `variant="ghost" size="sm"` com `Plus` + "Adicionar relatório". Ao clicar, abre um `Popover` (mesmo padrão usado em `LinkRelatorioCell`) com um `Input type="url"` e botões Cancelar/Salvar; ao salvar chama `updateCliente(clienteId, { link_relatorio: v || null })`.
- O mesmo popover também é usado para editar quando já existe link — adicionar um pequeno botão `Pencil` ao lado, idêntico ao padrão da célula da tabela, para manter consistência e permitir edição rápida.

## Componente auxiliar
Para evitar duplicação, extrair um componente leve `RelatorioHeaderButton({ clienteId, value })` dentro do próprio `ProjetoCliente.tsx` (ou num arquivo novo `src/components/clientes/RelatorioHeaderButton.tsx`) — reusa `Popover` + `Input` + `updateCliente` da store, espelhando a lógica de `LinkRelatorioCell` mas com estilo de cabeçalho (botão maior, mais elegante) em vez do estilo compacto da célula.

## Visual
```
[Nome do Cliente]  [Ativo]  [📊 Relatório ↗]   (com ✏️ ao lado para editar)
```
ou, sem link:
```
[Nome do Cliente]  [Ativo]  [+ Adicionar relatório]
```

Tudo com tokens semânticos (`text-muted-foreground`, `border-border`, etc.), responsivo (header já usa `flex-wrap`).

## Permissões
Reutiliza `updateCliente` da store — mesma regra de permissão já aplicada na aba Clientes (sem mudança).

## Validação
1. Cliente com `link_relatorio`: botão "Relatório" aparece ao lado do status; clique abre em nova aba.
2. Editar via lápis no header → mudança reflete na coluna Relatório da aba Clientes (mesmo store).
3. Editar via coluna na aba Clientes → reabrir Projeto Completo mostra novo link.
4. Cliente sem link: botão "Adicionar relatório" abre popover; ao salvar, link passa a aparecer nos dois lugares.
5. Nenhuma alteração em abas, Kanban, Central de Tarefas, layout geral.
