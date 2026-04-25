## Diagnóstico

Ao criar um novo cliente, o diálogo informa que serão gerados N cards, mas a função `addCliente` em `src/store/crm.ts` **só insere o registro em `clientes` e o `contrato`** — nunca insere nada em `cards` nem em `posts`. Por isso:

1. O cliente recém-criado não tem cards no Kanban.
2. O agrupamento "Status de Posts" no painel `/clientes` mostra `(0)` para todos os status, porque ele filtra `cards.filter(card => card.status_card === s.label && filtradosIds.has(card.cliente_id))` e não existe nenhum card.

Além disso, o mapper `mapCard` em `crm.ts` força `mes_referencia: 0, numero_semana: 0` (a tabela `cards` não tem essas colunas — só `titulo`, `status`, `posicao`, `cliente_id`, `descricao`, `data_agendada`). Para o Kanban exibir "Mês X · Sem Y" como na imagem ("Post Mês 1 - Semana 1"), precisamos derivar mês/semana a partir de `posicao` (ou do título).

## Escopo (somente esta feature, sem mexer em outras áreas)

### 1. `src/store/crm.ts` — `addCliente`

Após criar o cliente e o contrato, gerar automaticamente:

- **`meses × 4` cards**, um por semana, com:
  - `cliente_id`: id do cliente recém-criado
  - `titulo`: `"Post Mês {m} - Semana {s}"` (formato visto na imagem do usuário)
  - `status`: primeiro status de `statusPostOptions` ordenado (fallback `"Criar"`)
  - `responsaveis_ids`: `data.responsaveis ?? []`
  - `posicao`: índice sequencial `(m-1)*4 + (s-1)` — usado depois para reconstruir mês/semana
  - `data_agendada`: `null` (preenchido pelo usuário depois)

- Para cada card inserido, criar **1 post correspondente** em `posts`:
  - `card_id`: id do card
  - `titulo`: mesmo título do card
  - `status`: mesmo status do card
  - demais campos default

Tudo em batch via `supabase.from("cards").insert([...]).select()` e depois `posts.insert([...])`. Em caso de erro, exibir `toast.error` mas não derrubar a criação do cliente.

Se `data.data_inicio_contrato` ou `data.data_fim_contrato` não forem informados, usar duração padrão de 3 meses (12 cards), igual ao default do diálogo.

### 2. `src/store/crm.ts` — `mapCard`

Derivar `mes_referencia` e `numero_semana` a partir de `row.posicao`:

```ts
const pos = row.posicao ?? 0;
const mes_referencia = Math.floor(pos / 4) + 1;
const numero_semana = (pos % 4) + 1;
```

Assim o Kanban e o filtro por mês passam a funcionar com os cards recém-criados, sem depender de novas colunas no banco.

### 3. Nada mais é alterado

- `src/pages/Clientes.tsx`: já agrupa corretamente por `status_post_options` — voltará a contar assim que os cards existirem.
- `src/pages/ClienteDetalhe.tsx`: já lê `mes_referencia`/`numero_semana` de `Card`, passa a exibir corretamente após o ajuste em `mapCard`.
- Sem migrations: a tabela `cards` já aceita `titulo`, `status` text, `posicao`, `responsaveis_ids` — não precisa mudar schema.
- Sem mudanças em `OpcoesEditor`, `StatusBadge`, `PostDetalhe`, `Kanban`, etc.

## Resultado esperado

- Ao clicar em "Criar Cliente" com duração 3 meses → 12 cards aparecem no Kanban como "Post Mês 1 - Semana 1" … "Post Mês 3 - Semana 4", todos no primeiro status (ex: **Criar**).
- No painel `/clientes`, a seção "Status de Posts" passa a contar corretamente: `Criar (12)`, `Revisar (0)`, etc., e o cliente aparece dentro do grupo `Criar` ao expandir.
- O usuário pode arrastar os cards entre colunas — fluxo que já funciona.