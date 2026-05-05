# Adicionar funcionalidades da DocumentacaoTab ao gerenciador global

Replicar no `DocumentosGlobaisManager` (abas "Documentos padrão para clientes" e "Documentos internos da empresa") as 4 funcionalidades destacadas na imagem, que hoje só existem na aba Documentação dentro do cliente:

1. **Adicionar em lote** — botão no topo de cada bloco abre um diálogo com textarea (uma linha = um item) para criar vários documentos de uma vez no bloco/escopo atual.
2. **Copiar mensagem** — botão no topo dos blocos `Acessos` e `Materiais`. Reutiliza os helpers `construirMensagemAcessos` / `construirMensagemMateriais` para gerar a mensagem padrão a partir dos itens do bloco e copia para o clipboard.
3. **Selecionar todos** + ações em massa — checkbox no topo da lista de cada bloco, com contador "N selecionado(s)", botões "Limpar" e "Excluir (N)" para excluir vários itens de uma vez. Cada item ganha um checkbox próprio à esquerda.
4. **Copiar tudo** (por item) — novo botão na barra de ações de cada `ItemGlobalCard`, ao lado de Editar/Excluir, que copia para o clipboard um bloco de texto consolidado do item (título, categoria, descrição, URL, login, senha quando houver).

Comportamento idêntico ao da `DocumentacaoTab` (mesmo visual, mesmos toasts via `sonner`), respeitando o escopo atual (`cliente` / `interno`) e o admin gating já existente.

## Arquivos alterados

- **`src/components/configuracoes/DocumentosGlobaisManager.tsx`**
  - Importar `Checkbox`, `ListPlus`, `ClipboardCopy`, `Textarea`, `Dialog*`, `toast` do sonner e os helpers `construirMensagemAcessos` / `construirMensagemMateriais` de `DocumentacaoTab` (extraindo-os para `src/lib/documentacaoMensagens.ts` se ainda não forem exportados — ver abaixo).
  - Adicionar estado `selecionados: Record<DocBloco, Set<string>>` (resetado ao trocar de escopo) e handlers `toggleItem`, `toggleTodos`, `limparSelecao`, `excluirSelecionados` (chamando `remove` do store em sequência com `confirm` agregado).
  - Adicionar estado `loteState: { open: boolean; bloco: DocBloco | null }` e diálogo "Adicionar em lote — {nome do bloco}" com textarea + botão Salvar que cria N itens via `useDocumentosGlobais.create`, herdando escopo atual, `aplicar_automatico` padrão do escopo e `permissao_acesso` padrão.
  - Dentro de cada bloco: adicionar barra de ações (Adicionar em lote, Copiar mensagem condicional) + barra de seleção (checkbox "Selecionar todos" com contador e ações em massa), espelhando o layout da `DocumentacaoTab` (linhas 309-376).
  - `ItemGlobalCard`: adicionar prop `selecionado`, `onToggleSelecionado`, renderizar `Checkbox` à esquerda dos botões de mover; adicionar botão "Copiar tudo" (ícone `ClipboardCopy`) na barra de ações inferior, antes do Editar; implementar `copiarTudoItem(item)` que monta a string e chama `navigator.clipboard.writeText` + `toast.success("Item copiado")`.

- **`src/lib/documentacaoMensagens.ts`** *(novo, se necessário)*
  - Mover/expor `construirMensagemAcessos(items)` e `construirMensagemMateriais(items)` da `DocumentacaoTab` para reuso. Importar de volta na `DocumentacaoTab` para manter comportamento original. Se as funções já forem exportáveis trivialmente sem mover, apenas exportar do próprio arquivo.

- **`public/version.json`** — bump do timestamp para invalidar cache.

## Detalhes técnicos

- **Adicionar em lote**: `linhas.split("\n").map(t => t.trim()).filter(Boolean).forEach(titulo => create({ escopo, bloco, titulo, tipo: "material" | "acesso" | ... conforme bloco }))`. Tipo padrão por bloco: `acessos→acesso`, `links→link`, `reunioes→reuniao`, `materiais→material`, `documentos→documento` (alinhado com `DOC_TIPO_LABEL`).
- **Excluir em massa**: um único `confirm("Excluir N itens selecionados?")` antes do loop `await remove(id)`; ao final, limpar seleção do bloco.
- **Seleção é local** ao componente (não persistida) e por bloco; ao trocar de escopo (`cliente` ↔ `interno`) ou aplicar filtros, a seleção é resetada para evitar IDs órfãos.
- **Copiar tudo (item)**: formato
  ```
  {titulo}
  Categoria: {categoria} | Tipo: {tipo}
  {descricao?}
  URL: {url?}
  Login: {login?}
  Senha: {senha?}
  ```
  Apenas linhas com valor.
- **Copiar mensagem (bloco)**: idêntica à `DocumentacaoTab` — usa item do tipo `mensagem` se existir; senão monta a partir dos demais itens via os helpers compartilhados.

## Resultado

Ambas as abas do gerenciador global passam a ter, em cada um dos 5 blocos, exatamente os mesmos controles mostrados na imagem: **Adicionar em lote**, **Copiar mensagem** (Acessos/Materiais), **Selecionar todos** com exclusão em massa, e o botão **Copiar tudo** por item.
