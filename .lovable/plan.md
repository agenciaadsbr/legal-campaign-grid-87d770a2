# Remover "+ Adicionar item" da aba Documentação

## Objetivo
Manter apenas o botão "Adicionar em lote" em todos os blocos da aba Documentação (Acessos, Links, Reuniões, Materiais, Documentos).

## Mudança
**Arquivo:** `src/components/projeto/DocumentacaoTab.tsx`

- Remover o `<Button>` "+ Adicionar item" (linhas 298–305), que abre o dialog `setDialogState({ open: true, bloco, item: null })`.
- Manter intacto o botão "Adicionar em lote" e o botão de copiar mensagem (acessos/materiais).
- Manter o `dialogState` e o componente de dialog de item único, pois ainda é usado para **editar** itens existentes (clique no item da lista).

## Resultado
Cada bloco da Documentação exibirá apenas:
- "Adicionar em lote"
- (quando aplicável) botão de copiar mensagem completa

Sem alterações em lógica de dados, edição ou layout dos itens.