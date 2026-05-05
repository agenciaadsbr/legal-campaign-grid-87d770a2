## Problema identificado

Na imagem enviada, no card "Links importantes" a barra de ações (Copiar tudo, olho, copiar, lápis, lixeira) aparece **no meio do card**, sobreposta ao texto da descrição ("Se o saldo acabar e não for recarregado..."), enquanto o texto continua sendo renderizado abaixo dela. Isso quebra o padrão visual do card "Acessos" ao lado, onde a barra fica corretamente fixada no rodapé.

## Causa raiz

Em `ItemGlobalCard` (`src/components/configuracoes/DocumentosGlobaisManager.tsx`, linha 615), a row horizontal que contém o checkbox + coluna de conteúdo usa `items-start`. Isso impede que a coluna de conteúdo seja esticada verticalmente até a altura do card. Sem essa altura limitada, o `flex-1 min-h-0 overflow-y-auto` aplicado à descrição (linha 672) nunca recebe um teto, então:

- A descrição cresce naturalmente para acomodar todo o texto (sem scroll interno).
- A barra de ações (irmã da row, no rodapé do `CardContent`) é renderizada na posição natural — que acaba caindo **dentro** da área ocupada pela descrição, gerando o overlap visto na imagem.

## Correção

Arquivo: `src/components/configuracoes/DocumentosGlobaisManager.tsx`

1. **Linha 615** — Trocar a row horizontal de `items-start` para `items-stretch` (default do flex), para que a coluna de conteúdo herde a altura disponível do card. Manter `flex-1 min-h-0`.

2. **Linha 616** — A coluna lateral do checkbox + setas continua usando `items-center` próprio; só precisamos garantir que ela não estique de forma estranha. Usar `shrink-0` para mantê-la com largura natural.

3. **Validar cadeia flex** para o scroll interno funcionar:
   - `Card`: `flex flex-col h-full` ✓ (já está)
   - `CardContent`: `flex flex-col flex-1 min-h-0` ✓ (já está)
   - Row horizontal: `flex items-stretch gap-2 flex-1 min-h-0` ← ajuste
   - Coluna de conteúdo: `flex flex-col flex-1 min-w-0 min-h-0` ✓ (já está)
   - Descrição: `flex-1 min-h-0 overflow-y-auto …` ✓ (já está)

4. **`public/version.json`** — bump do timestamp para forçar refresh do cache.

## Resultado esperado

- A barra de ações fica **sempre fixa no rodapé** do card, alinhada ao padrão do card "Acessos".
- A descrição ocupa todo o espaço entre o cabeçalho/badges e a barra de ações.
- Quando o texto colado for maior que a altura disponível, aparece **scroll interno** (a barra de rolagem fininha já estilizada) dentro da área da descrição — sem nunca invadir ou ser invadida pela barra de ações.
- Nenhuma alteração em comportamento de salvamento, store ou estrutura de dados.
