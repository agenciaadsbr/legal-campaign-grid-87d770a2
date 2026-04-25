
# Cards do Kanban: título real + prazo visível + atividade interna

## Objetivo
Tornar os cards do Kanban autoexplicativos: bater o olho e entender **o que fazer**, **quando** e **quem** — sem precisar abrir. A complementação detalhada (briefing/atividade) fica no card interno.

## Decisões de modelagem

Vou **reaproveitar campos existentes** ao invés de criar novos, para manter compatibilidade com os 56+ cards já cadastrados:

| Conceito do briefing | Onde mora hoje | Decisão |
|---|---|---|
| `titulo_tarefa` (título principal visível) | `cards.titulo` (texto livre, atualmente "Post Mês X - Semana Y") | **Reaproveitar.** Vira o título da tarefa. |
| `referencia_post` (Mês X - Semana Y) | `cards.posicao` (já calcula mês/semana) | **Derivar via `mapCard`** — não precisa coluna nova. |
| `descricao_atividade` (briefing interno) | `cards.descricao` (já existe, nullable, não usada) | **Reaproveitar.** |
| `prazo_final` | `cards.data_agendada` (timestamp) | **Reaproveitar.** Já é o prazo. |
| `responsavel_id` / `status` | `cards.responsaveis_ids` / `cards.status` | Já existem. |

→ **Sem migração de schema.** Apenas uma migração de **dados** opcional para garantir que cards antigos tenham um título legível (que já têm: "Post Mês 1 - Semana 2").

## Mudanças

### 1. `src/store/crm.ts` — expor descrição no tipo `Card`
- Adicionar `descricao?: string | null` na interface `Card`.
- `mapCard`: incluir `descricao: row.descricao ?? ""`.
- `updateCard`: aceitar e gravar `descricao` (campo `descricao` na tabela `cards`).

### 2. `src/store/crm.ts` — geração de cards novos
- Em `addCliente`, manter `titulo: \`Post Mês ${m} - Semana ${s}\`` como **placeholder editável** (vira referência genérica até o usuário renomear na ativação).

### 3. `src/components/IniciarTarefaDialog.tsx` — capturar título + briefing
Adicionar dois campos no topo do modal:
- **Título da tarefa** (input, obrigatório) — pré-preenchido com o título atual; se ainda for o placeholder "Post Mês X - Semana Y", vem vazio com placeholder sugerindo "Ex: Criar arte carrossel sobre aposentadoria rural".
- **Briefing / atividade** (textarea, opcional) — substitui o atual campo "Observação". Salvo em `cards.descricao`.

Ao confirmar `iniciarTarefa`, persistir também `titulo` e `descricao` (estender a assinatura do método em `crm.ts`).

### 4. `src/pages/ClienteDetalhe.tsx` — `CardItem` com novo layout
Estrutura visual nova (mantendo tokens semânticos do design system, sem cores hex):

```
┌─────────────────────────────────────────┐
│ ⚡ Criar arte carrossel aposentadoria   │ ← titulo_card (font-medium, 2 linhas max, line-clamp-2)
│ Post Mês 1 · Semana 2                   │ ← referência (text-[10px] text-muted-foreground)
├─────────────────────────────────────────┤
│ 📅 24 Abr 2026          (B)(M)          │ ← prazo + AvatarStack
│ [▶ Iniciar tarefa] | [STATUS BADGE]     │ ← botão se Planejamento, badge caso contrário
└─────────────────────────────────────────┘
```

Detalhes:
- **Título**: `line-clamp-2`, com `title={card.titulo_card}` para tooltip nativo no hover.
- **Referência**: linha pequena logo abaixo do título.
- **Prazo** (`data_agendada`):
  - Sem prazo → texto "Definir prazo" em `text-muted-foreground`.
  - Vencido → `text-destructive` + ícone `CalendarX`.
  - Vence hoje → `text-amber-500` (token do design existente).
  - Futuro → `text-muted-foreground` + ícone `Calendar`.
  - Formato: `dd MMM yyyy` (date-fns, locale pt-BR já usado no projeto).
- **Botão "Iniciar tarefa"** continua só em Planejamento; o `StatusBadge` aparece nos demais.
- Manter ícone de urgência ⚡ inline com o título.

### 5. `src/pages/PostDetalhe.tsx` — card interno
- **Topo**: já mostra `titulo_post` editável → trocar para editar `card.titulo_card` (fonte da verdade) + linha menor mostrando "Post Mês X · Semana Y" como referência readonly.
- **Nova seção "Atividade / Briefing"** acima da Legenda: textarea ligada a `card.descricao`, com placeholder "Detalhes internos: cores, CTA, tom, referências…". Auto-save via `updateCard({ descricao })` (mesmo padrão de debounce já usado pela legenda).
- **Importante**: trigger `sync_post_status_with_card` no banco já mantém `posts.status` em sincronia. O título do post (`posts.titulo`) deixa de ser editado diretamente — vira espelho do `cards.titulo`. Não precisa migração; apenas remover o input duplicado.

### 6. Filtros / busca (`ClienteDetalhe.tsx`)
- Adicionar **input de busca por título** no topo do Kanban (filtra `card.titulo_card.toLowerCase().includes(q)`). Os filtros existentes (responsáveis, mês, hoje/semana/atrasados) continuam.

### 7. Migração de dados (opcional, sem schema change)
Cards antigos já têm título "Post Mês X - Semana Y" — funcionam como placeholder válido. **Nenhuma migração SQL necessária.** O usuário renomeia ao ativar.

## Fora do escopo (Fase 2)
- Histórico estruturado de movimentações (hoje os comentários cobrem parcialmente).
- Notificações automáticas baseadas no novo título.
- Relatórios filtrando por título.

## Perguntas (se houver dúvida)
Nenhuma — todos os campos do briefing mapeiam em colunas existentes. Se você preferir colunas dedicadas (`titulo_tarefa`, `descricao_atividade`) ao invés de reaproveitar `titulo`/`descricao`, me avise antes de aprovar e eu adiciono a migração.
