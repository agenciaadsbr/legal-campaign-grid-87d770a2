# Corrigir duplicação ao "Adicionar em lote"

## Diagnóstico

Verifiquei o banco: existe **apenas 1 registro real** em `documentos_globais`. Não há triggers de propagação. A duplicação que aparece na tela ("15") é resultado de itens repetidos sendo enviados/inseridos pelo fluxo de lote, sem nenhuma proteção. Causas possíveis e cumulativas:

1. **Texto colado contém o mesmo título várias vezes** (ex.: 15 linhas iguais ou linhas em branco com espaços). O código atual cria um item por linha sem deduplicar.
2. **Clique duplo no botão "Adicionar"** dispara `salvarLote` mais de uma vez antes de `loteSalvando` virar `true` (a flag só é setada no meio da função, depois das validações).
3. **Sem checagem de existência**: títulos já cadastrados no mesmo escopo+bloco são recriados a cada lote.
4. **Sem constraint única no banco** — não há rede de proteção em última instância.

## Correções

### `src/components/configuracoes/DocumentosGlobaisManager.tsx` — função `salvarLote`

- **Guarda anti-clique-duplo**: `if (loteSalvando) return;` no topo da função, antes de qualquer trabalho.
- **Deduplicar dentro do lote**: usar `new Set()` sobre as linhas trimadas e não vazias (split com `/\r?\n/` para cobrir CRLF colado do Windows/Sheets).
- **Filtrar títulos já existentes**: comparar `titulo.trim().toLowerCase()` contra os itens atuais do mesmo `escopo` + `bloco`. Itens repetidos são ignorados silenciosamente.
- **Inserir sequencialmente com `await`** (já é assim) e contar sucessos para o toast final ("N adicionados · M ignorados (já existiam)").
- **Toast informativo** quando nada é criado: "Todos os títulos informados já existem neste bloco".

Isso resolve 100% dos casos sem precisar de migração.

### Opcional (recomendado mas não obrigatório) — constraint única no banco

Para blindar de vez contra qualquer fluxo futuro, criar índice único parcial em `documentos_globais (escopo, bloco, lower(titulo))`. Só faço isso se você confirmar — exigirá uma migração e pode rejeitar dados legados que tenham títulos repetidos legítimos. **Por padrão, NÃO vou criar a constraint** — apenas a proteção em código acima.

### `public/version.json`

Bump do timestamp para invalidar cache.

## Resultado

- Colar 15 linhas iguais → cria **1 item**.
- Colar 5 linhas, das quais 3 já existem → cria **2 itens** + toast "2 adicionados · 3 ignorados".
- Clicar 2x no botão "Adicionar" → segunda chamada é ignorada.
- Sem mudanças no banco, sem migração.
