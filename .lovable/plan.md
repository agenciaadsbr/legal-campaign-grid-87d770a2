## Objetivo
Remover a seção "Observações" da aba Documentação do projeto/cliente.

## Mudanças

**`src/store/documentacao.ts`**
- Remover `"observacoes"` do tipo `DocBloco` (manter como tipo legado opcional ou apenas tirar da union — vou apenas tirar da union, já que não é mais usado).
- Remover `observacoes: "Observações"` de `DOC_BLOCO_LABEL`.
- Remover `"observacoes"` do array `DOC_BLOCOS` (é ele que controla a renderização das seções).
- Remover a entrada `observacoes` de `TIPOS_POR_BLOCO`.

**`src/components/projeto/DocumentacaoTab.tsx`**
- Remover `observacoes: StickyNote` do mapa de ícones.
- Remover `observacoes: true` do estado inicial de blocos abertos.
- Remover `observacoes: new Set()` do estado de seleção.
- Remover `observacoes: "Observação"` do mapa de labels singulares.
- Remover as condições `bloco === "observacoes"` (linhas 863 e 1047) e o `bloco !== "observacoes"` (linha 310), simplificando a lógica conforme o caso (observacoes some dos blocos renderizados, então essas guardas viram desnecessárias).
- Atualizar o comentário da linha 1087 removendo a menção a "Observações".

## Compatibilidade
Itens antigos com `bloco = 'observacoes'` no banco simplesmente deixarão de aparecer (não serão excluídos). Se quiser apagá-los do banco, posso incluir uma migration — me avise; por padrão **não** vou excluir dados.
