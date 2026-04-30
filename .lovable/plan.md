
# Plano final aprovado — Dash Tasks (implementação por fases)

Respeitando a regra: **não remover layout/funcionalidades existentes** — apenas adicionar/ajustar conforme combinado.

## Decisões fechadas
- Aba **Demandas** do menu lateral: **removida totalmente**.
- Categoria **Designer**: removida; demandas existentes migradas para **Personalizado (Urgência/Outro)**.
- **Plano nominal + Valor de venda**: entram nesta rodada.
- **Visão Geral colapsável**: linha fechada mostra números **+ avatares** dos responsáveis.

---

## FASE 1 — Limpeza estrutural

### 1.1 Sidebar
- `src/components/AppSidebar.tsx`: remover apenas a entrada `{ title: "Demandas", url: "/demandas" }`.
- Manter rota `/demandas` registrada em `App.tsx` (não quebra links antigos).

### 1.2 Aba "Urgências" dentro do projeto
- `src/pages/ProjetoCliente.tsx`: adicionar `<TabsTrigger value="urgencias">` ao lado de "IA / Atendimento".
- Renderiza `<AreaTab titulo="Urgências" categoria="Personalizado" ...>` filtrando por `URGENCIA_OUTRO_CATS` + `prioridade === Urgente`.
- Card "Urgências/Outros" da Visão Geral passa a navegar para `urgencias` (hoje vai para `atividades`).

### 1.3 Categorias Designer/Tecnologia
- `src/lib/demandas-categorias.ts`:
  - Remover `Designer` e `Tecnologia` de `CATEGORIAS` (somem dos seletores do `NovaDemandaDialog`).
  - Manter as chaves no `CATEGORIA_LABEL`/`CATEGORIA_SUBTIPOS` para retrocompatibilidade de leitura (badges não quebram).
- `src/store/demandas.ts`: na hidratação, mapear em runtime:
  - `categoria === "Designer"` → `Personalizado` (urgência)
  - `categoria === "Tecnologia"` → `IAAtendimento`
- Sem alteração no banco — migração é puramente de exibição.

---

## FASE 2 — Posts (formato/slides) e Vídeos (cascata)

### 2.1 Cards de Post: formato + qtd_slides
- **Migração SQL**: `ALTER TABLE cards ADD COLUMN formato text, ADD COLUMN qtd_slides int;`
- `src/store/crm.ts`: tipo `Card` ganha `formato?: "imagem_unica" | "carrossel" | "video"` e `qtd_slides?: number`.
- Form de edição/criação de post (`PostsKanbanCliente.tsx` / dialog): select de formato; se "carrossel" → input numérico (1–10).
- Card no Kanban: badge discreta com formato (ex: "Carrossel · 5").

### 2.2 Subtipo de Vídeo em cascata
- `src/components/demandas/NovaDemandaDialog.tsx`: quando `categoria === "EditorVideo"`, substituir o `Select` plano por **2 perguntas**:
  1. Finalidade: `Anúncio` | `Orgânico/Feed`
  2. Origem: `Vídeo do cliente` | `Vídeo IA c/ foto do cliente` | `Vídeo IA banco da agência`
- Salvar como string concatenada no campo `subtipo` existente: `"Anúncio · IA banco"`.
- Sem mudança de schema.

---

## FASE 3 — Visão Geral colapsável

- `src/pages/ProjetoCliente.tsx` → componente `VisaoGeral`: trocar grid de cards por **lista de linhas com `Collapsible`**.
- **Linha fechada** (compacta): ícone, título, mini-stats (Total / Pend / Atras) + **AvatarStack** dos responsáveis + botão "Ver detalhes" + chevron.
- **Linha aberta**: lista os últimos 5 itens da área (título + status + responsável) + link "Abrir aba completa".
- Estado aberto/fechado salvo em `localStorage` por cliente (`dashtasks:visao:{clienteId}`).
- `VisaoGeralCard.tsx` mantido como componente reutilizável (não removido); a Visão Geral apenas passa a usar uma nova variante em formato linha.

---

## FASE 4 — Cadastro de Cliente enriquecido

### 4.1 Migração SQL
- `ALTER TABLE clientes ADD COLUMN plano text, ADD COLUMN valor_venda numeric, ADD COLUMN nicho_extra text;`

### 4.2 `NovoClienteDialog` e `EditarClienteDialog` (em `src/pages/Clientes.tsx`)
- Novo campo **Plano**: Select `Mensal | Trimestral | Semestral | Anual | Personalizado`.
  - Auto-preenche `duracao_meses` (1/3/6/12). "Personalizado" mantém o input livre que já existe.
- Novo campo **Valor de venda** (R$, numérico).
- Novo campo **Nicho extra** (texto livre opcional, ao lado de `nicho`).
- Demais campos preservados (nome, status, responsáveis, datas, observações).

---

## FASE 5 — Polimento

- Validar visualmente que a aba Posts continua com botão "Adicionar tarefa" funcional (já está).
- Confirmar que a Visão Geral não duplica painel de Posts fora do mini-card.
- Atualizar `mem://index.md` com a nova convenção de categorias (Designer/Tecnologia descontinuadas).

---

## Arquivos que serão alterados

```text
src/components/AppSidebar.tsx
src/pages/ProjetoCliente.tsx
src/lib/demandas-categorias.ts
src/store/demandas.ts
src/store/crm.ts
src/components/demandas/NovaDemandaDialog.tsx
src/components/clientes/PostsKanbanCliente.tsx
src/pages/Clientes.tsx
supabase/migrations/<nova>.sql   (cards: formato, qtd_slides)
supabase/migrations/<nova>.sql   (clientes: plano, valor_venda, nicho_extra)
```

## Garantias
- **Nada de remoção** de abas, blocos, dialogs, kanban ou layout já ajustados.
- **Nada de mudança de cor/tokens** — segue paleta azul escura existente.
- Migrações SQL apenas **adicionam colunas** (nullable) — zero impacto em dados existentes.
- Categorias antigas continuam legíveis (mapeamento em runtime).

Confirma para eu começar pela **Fase 1**?
