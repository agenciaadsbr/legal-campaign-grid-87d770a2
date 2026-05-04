## Objetivo

Reforçar o módulo **Minhas Tarefas** para garantir, em todas as camadas, que o usuário só veja tarefas atribuídas a **ele mesmo** — nunca de outro responsável.

Hoje o filtro já existe (`useResponsavelAtual` resolve o `responsavelId` do usuário logado e `buildUnifiedTasks` filtra por ele em demandas/posts/planejamento), mas não há uma trava defensiva final. Se algum dia uma fonte nova esquecer o filtro, ou se uma demanda tiver múltiplos responsáveis e for indevidamente repassada, a tarefa apareceria. Vamos blindar.

## Mudanças

### 1. `src/lib/minhasTarefas.ts` — Trava de segurança final

Antes do `return out` em `buildUnifiedTasks`, adicionar uma camada que:

- Se há `responsavelId` definido: manter apenas tarefas onde `t.responsaveis_ids.includes(responsavelId)`. Exceção: `t.fonte === "documentacao"` (já filtrada por `authUserId`, não tem responsável).
- Se NÃO há `responsavelId` (usuário sem vínculo): retornar apenas tarefas da fonte `documentacao` (do próprio usuário). Nada de demandas/posts/planejamento aparece sem vínculo.
- Logar `console.warn` se a trava descartar algo, para facilitar diagnóstico.

### 2. `src/pages/MinhasTarefas.tsx` — Mensagem clara quando sem vínculo

Já existe um aviso amarelo quando `!responsavelId`. Reforçar o subtítulo do header para deixar explícito que o painel só mostra tarefas do responsável atual:

- Subtítulo passa a ser: `Painel individual de <strong>{nome}</strong> — apenas tarefas atribuídas a você` (quando há responsável).
- Quando sem responsável: manter o aviso atual e exibir lista vazia naturalmente (graças à trava acima).

### 3. `public/version.json`

Bump de versão.

## Garantias resultantes

- Nenhuma demanda atribuída a outro responsável aparece em Minhas Tarefas.
- Nenhum card de Posts de outro responsável aparece (o agrupamento por `(cliente, responsavel, contrato)` já isola, e a trava confirma).
- Nenhum item de Planejamento de outro responsável aparece.
- Documentação continua restrita a `enviado_por === authUserId`.
- Usuário sem vínculo de responsável vê painel vazio + aviso para contatar admin.

Nada além de `minhasTarefas.ts` e da página `MinhasTarefas` é tocado. Projeto Completo, Clientes, criação de cards e banco de dados permanecem intactos.