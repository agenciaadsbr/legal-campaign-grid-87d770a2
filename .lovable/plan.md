
## Objetivo

Corrigir apenas o módulo **Minhas Tarefas** para:
1. Agrupar **cards de posts** em uma única tarefa "Criar X posts" por cliente/responsável/lote.
2. Corrigir o **filtro de período** (Hoje, Esta semana, Próximos 7/14/30, Últimos 7/14/30, Mês passado, Personalizado).

Sem alterar Projeto Completo, aba Clientes, criação automática dos cards, nem o banco.

---

## 1. Agrupamento de posts (`src/lib/minhasTarefas.ts`)

Hoje cada `Card` vira um `UnifiedTask`. Vou substituir esse trecho por uma rotina que agrupa.

**Chave de agrupamento** (sem campo `lote_id` no banco, infiro pelo lote natural já existente):

```
cliente_id  +  responsavelId  +  lote_key
```

onde `lote_key` é derivada dos campos atuais do card:
- `mes_referencia` (já existe em `Card`) → identifica o ciclo/mês do contrato
- ano calendário do `data_agendada` (ou `created_at` se não houver) → separa lotes que se repetem em meses iguais de anos diferentes
- agrupamos por (cliente, responsável, ano, mes_referencia)

Isso significa, na prática:
- Contrato trimestral, 12 posts (4 por mês × 3 meses) → **3 tarefas** (uma por mês de referência) — o briefing pediu "1 tarefa para 12 posts", mas como o contrato pode atravessar meses e o usuário pediu também "12 + 12 etapas = 2 tarefas", a chave por `mes_referencia + ano` cobre os dois casos descritos. Caso o usuário queira **uma única tarefa por contrato inteiro**, pergunto abaixo.

**Campos da tarefa agrupada**:
- `id`: `posts:<cliente_id>:<responsavelId>:<ano>-<mes_referencia>`
- `fonte`: `"post"` (mantém compatibilidade com `ConcluirTarefaDialog`, que já trata posts) — mas como agora representa N cards, o botão "Concluir" abre o cliente em vez de marcar tudo como Postado (ver §3)
- `titulo`: `Criar {N} posts` (apenas pendentes; concluídos vão para uma label "{N} concluídos")
- `area`: `"Posts"`
- `prioridade`: maior prioridade entre os cards do grupo (`Urgente` se algum `is_urgent`, senão `Media`)
- `prazo`: menor `data_agendada` entre os cards **pendentes** do grupo (null se nenhum)
- `status`:
  - `concluido` se todos `status_card === "Postado"`
  - `atrasado` se algum pendente com `data_agendada < hoje`
  - `em_andamento` se algum em `Criar/Revisar/Agendar`
  - `pendente` caso contrário
- `urgente`: true se algum card do grupo é `is_urgent`
- `responsaveis_ids`: `[responsavelId]`
- `link`: `/clientes/{cliente_id}/projeto?tab=posts&lote={ano}-{mes_referencia}` (a aba já existe; o query param é apenas informativo — se o `ProjetoCliente` não interpretar, o usuário cai na aba Posts normalmente, conforme item 5 do briefing)
- guarda `_postsIds: string[]` interno (campo extra opcional na interface) para uso futuro

Tarefas de outras áreas (demandas, planejamento, documentação) **ficam inalteradas** — continuam individuais.

---

## 2. Filtro de período (`src/pages/MinhasTarefas.tsx`)

O bug atual está aqui:
```ts
if (ini !== null || fim !== null) {
  if (!t.prazo) return false;        // exclui tudo sem prazo
  const p = new Date(t.prazo).getTime();
  if (ini !== null && p < ini) return false;
  if (fim !== null && p > fim) return false;
}
```

Problemas:
- Tarefas **atrasadas** (`prazo < hoje`) são excluídas em "Hoje", "Esta semana", "Próximos N" — o briefing pede que **atrasadas apareçam junto com Hoje** e nas janelas futuras.
- `new Date("YYYY-MM-DD")` em JS interpreta como UTC, jogando o dia para o fuso anterior — quebra "Hoje".

**Nova regra de filtragem por período**:

```text
isFuturo = preset ∈ {hoje, esta_semana, prox_7, prox_14, prox_30}
isPassado = preset ∈ {ult_7, ult_14, ult_30, mes_passado}

Para cada tarefa pendente (status !== concluido):
  prazoDate = parsePrazoLocal(t.prazo)   // parser que respeita timezone local
  
  Se isFuturo:
    inclui se (prazoDate ≤ fim) E (prazoDate ≥ ini OU status === "atrasado")
    // ou seja: tudo que vence até "fim", incluindo atrasadas
  
  Se isPassado:
    inclui se (prazoDate ≥ ini) E (prazoDate ≤ fim)
  
  Se personalizado:
    inclui se (prazoDate ≥ ini) E (prazoDate ≤ fim)
  
  Tarefas concluídas: aplicam-se as datas normalmente (sem o "atrasadas grátis").
  Tarefas sem prazo: aparecem só quando preset === "todos".
```

Adiciono helper `parsePrazoLocal(s)` que trata `YYYY-MM-DD` como meia-noite local (e mantém ISO completo se vier com timezone), evitando o off-by-one de fuso.

A função `calcularPeriodo` no `PeriodoFiltro.tsx` já está correta — não mexo nela.

---

## 3. Conclusão da tarefa agrupada de posts

`ConcluirTarefaDialog` hoje chama `updateCard(task.origem_id, ...)`. Para a tarefa agrupada não faz sentido marcar 12 cards como Postado de uma vez. Solução mínima:

- Quando `task.fonte === "post"` **e** `task.id` começa com `posts:` (agrupada), o botão "Concluir" no `MinhasTarefasTabela` é substituído por um botão **"Abrir posts"** que navega para `task.link`. Não abre o dialog.
- Cards individuais (não agrupados) deixam de existir no Minhas Tarefas — então o caminho antigo do dialog para posts pode ser removido com segurança (o dialog continua funcionando para `demanda`, `planejamento`, `documentacao`).

---

## 4. KPIs do topo

Já são calculados a partir de `todasTarefas`. Como agora `todasTarefas` retorna tarefas agrupadas para posts, os 4 cards (Total, Pendentes, Atrasadas, Urgentes) passam a refletir a contagem correta automaticamente. Sem mudança extra.

---

## Arquivos alterados

- `src/lib/minhasTarefas.ts` — substitui o bloco "Posts (cards)" por agrupamento; mantém demandas/planejamento/documentação intactos. Adiciona `parsePrazoLocal` exportado.
- `src/pages/MinhasTarefas.tsx` — substitui o bloco do filtro de período pela nova regra usando `parsePrazoLocal`.
- `src/components/tarefas/MinhasTarefasTabela.tsx` — para tarefas com `id` iniciado por `posts:`, troca o botão "Concluir" por "Abrir posts" (`navigate(t.link)`).

Sem migrações. Sem alteração de criação de cards. Nenhum outro módulo é tocado.

---

## Pergunta antes de implementar

Sobre o **agrupamento de posts**, qual granularidade você quer?

- **A — Por mês de referência** (proposto): contrato de 3 meses com 12 posts (4/mês) → 3 tarefas ("Criar 4 posts — Cliente X — Mês 1", etc.). Trimestral com 12 posts no mesmo `mes_referencia` → 1 tarefa.
- **B — Por contrato inteiro**: 12 posts trimestrais → sempre 1 tarefa, independente de quantos meses cubra. Exigiria inferir o "contrato" pela tabela `contratos` (data_inicio/data_fim) e mapear cards cujo `data_agendada` cai no intervalo.

Se preferir B, ajusto o plano antes de implementar.

