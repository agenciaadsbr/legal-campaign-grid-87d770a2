## Objetivo

Fazer com que a aba **"Documentos padrão para clientes"** sempre exiba os 5 blocos colapsáveis (Acessos, Links importantes, Reuniões, Materiais enviados ao cliente, Documentos), exatamente como a aba **"Documentos internos da empresa"** já exibe — inclusive quando ainda não há nenhum documento cadastrado.

## Causa atual

Em `src/components/configuracoes/DocumentosGlobaisManager.tsx` (linhas 215–221), há um early-return: quando `filtrados.length === 0`, a aba renderiza apenas a mensagem "Nenhum documento … encontrado com os filtros atuais", em vez da grade de blocos. Como a aba "padrão para clientes" começa sem itens, a grade nunca aparece. A aba "interno" mostra os blocos só porque já tem 1 item de bootstrap em "Acessos".

## Mudanças

### 1. `src/components/configuracoes/DocumentosGlobaisManager.tsx`

- **Remover o early-return** de "Nenhum documento encontrado". A grade dos 5 blocos passa a renderizar sempre.
- Cada bloco já tem internamente o estado vazio próprio ("Nenhum item neste bloco.") + botão "Adicionar neste bloco", então o usuário continua tendo feedback claro quando não houver itens.
- **Manter** um aviso discreto apenas quando houver filtros ativos (busca/bloco/categoria) e nenhum item bater — exibido como uma faixa fina acima da grade, sem esconder os blocos. Quando não houver filtros, nada é exibido (a própria grade vazia comunica o estado).

### 2. `public/version.json`

- Bump do timestamp para invalidar cache.

## Resultado visual

A aba "Documentos padrão para clientes" passa a abrir já com os 5 cards (Acessos 0, Links importantes 0, Reuniões 0, Materiais enviados ao cliente 0, Documentos 0), idêntica em estrutura à aba "Documentos internos da empresa" da segunda imagem enviada — preservando a regra de propagação automática para clientes (escopo `cliente`) e a restrição de admin para o escopo `interno`.
