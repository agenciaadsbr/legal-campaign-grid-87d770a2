## Problema

Hoje cada `ItemGlobalCard` tem altura "natural" (auto), e a descrição é limitada a `max-h-40` (~160px) com scroll interno. Quando o card individual fica num grid com `min-h-[480px]` no contêiner pai, a descrição preenche apenas ~160px e sobra muito espaço vazio embaixo — exatamente o "corte pela metade" que aparece no print.

A imagem de referência mostra cards onde a área de texto **ocupa toda a altura disponível** do card, com scroll interno só quando o conteúdo passa do limite.

## Correção

**Arquivo:** `src/components/configuracoes/DocumentosGlobaisManager.tsx`

1. **Card raiz (`ItemGlobalCard`)** — transformar em coluna flex de altura total:
   - `<Card>` recebe `flex flex-col h-full`.
   - `<CardContent>` recebe `flex flex-col flex-1 min-h-0 p-2.5`.
   - O wrapper `flex items-start gap-2` vira `flex items-start gap-2 flex-1 min-h-0`.
   - O wrapper interno `flex-1 min-w-0` passa a ser `flex flex-col flex-1 min-w-0 min-h-0`.

2. **Bloco da descrição** — deixar de ter altura fixa e passar a esticar:
   - Trocar `max-h-40` por `flex-1 min-h-0` (mantendo `overflow-y-auto`, `whitespace-pre-wrap`, `break-words` e o estilo de scrollbar).
   - Resultado: o texto preenche toda a altura restante do card; quando excede, aparece scroll interno.

3. **Grid pai dos itens (linhas 475-484)** — garantir que cada célula do grid estique:
   - Adicionar `auto-rows-fr` ao grid (`grid grid-cols-1 gap-2 auto-rows-fr ...`) para que cada linha tenha altura igual e os cards ocupem toda a altura da linha.
   - Manter `max-h-[calc(100vh-320px)] min-h-[480px] overflow-y-auto` para o scroll externo do bloco.

4. **Bump `public/version.json`** para o timestamp atual.

## Resultado esperado

- Cada card preenche toda a altura disponível na sua linha (sem espaço morto embaixo).
- A descrição ocupa todo o espaço sobrando entre o cabeçalho (título + badges) e a barra de ações.
- Scroll interno aparece **só** quando o texto colado é maior que a altura do card.
- Visual fica idêntico ao print de referência (cards altos, texto preenchendo tudo).
