## Objetivo

Ajustar o modal `DemandaDetalheDialog` (usado por todas as abas do Projeto Completo: Posts, Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Urgências/Outros) para abrir em formato compacto, centralizado, em **uma coluna**, sem barra de rolagem no formulário principal. Apenas a seção **Atividade** (lista de comentários) pode ter scroll interno.

Sem alterar lógica, campos, categorias, responsáveis, status, anexos, comentários ou banco.

## Arquivo a editar

- `src/components/demandas/DemandaDetalheDialog.tsx`

## Mudanças propostas

### 1. Container do Dialog
- Manter `max-w-2xl w-[92vw]` (≈ 640px — dentro da faixa 560–680px pedida).
- Manter `overflow-hidden` no `DialogContent` para o modal não rolar como um todo.
- Trocar a estrutura interna do `DialogContent` de stack vertical livre para um **flex column com altura controlada**: `flex flex-col max-h-[90vh]`.
  - `Voltar para Visão Geral`: `shrink-0`.
  - **Card 1 (Informações)**: `shrink-0` — sem scroll, mostra todos os campos principais.
  - **Card 2 (Atividade)**: `flex-1 min-h-0` — recebe todo o espaço restante e tem scroll interno apenas na lista de comentários.

### 2. Card 1 — Informações da Demanda (sem scroll, compacto)
Reduzir densidade para caber tudo sem rolagem em viewports padrão (≥ 768px de altura):
- `CardHeader`: manter `pb-1.5 pt-2.5 px-3`.
- Input do título: `text-sm` (era `text-base`), `h-auto`.
- Linha Categoria · Subtipo · Prioridade: `gap-2`, `SelectTrigger` `h-8 text-xs`, `Label` `text-[11px]`.
- Linha Datas + Responsáveis: `gap-2`, inputs `h-8 text-xs`.
- Bloco Responsáveis: reduzir `min-h-[40px]` → `min-h-[36px]`, avatar `h-6 w-6` (de `h-7 w-7`).
- Bloco Anexos: thumbnails `h-16 w-16` (de `h-[72px]`), `gap-1.5`, `pt-2` no border-top.
- Bloco Atividade / Briefing: `Textarea rows={2}` `min-h-[56px]`, `pt-2` no border-top.
- `CardContent` do Card 1: `space-y-2 px-3 pb-2.5`.

### 3. Card 2 — Atividade (scroll apenas aqui)
- `Card className="flex flex-col flex-1 min-h-0 overflow-hidden"`.
- `CardHeader`: `pb-1 pt-2 px-3` com título `text-xs uppercase tracking-wide`.
- `CardContent`: `flex flex-col flex-1 min-h-0 px-3 pb-3 gap-2`.
- **Lista de comentários**: container próprio `flex-1 min-h-0 overflow-y-auto pr-1 space-y-2` — esta é a única área com scroll.
- **Composer (novo comentário)**: `shrink-0`, fica fixo no rodapé do card. Reduzir `RichTextEditor` `minHeight` de `60px` para `48px`.
- **Histórico colapsável**: `shrink-0` abaixo do composer (mantém comportamento atual `<details>`).

### 4. Responsividade
- Em telas menores (`< 640px`): manter `w-[92vw]` e `max-h-[90vh]`. Se ainda assim não couber, o scroll vertical do `DialogContent` é evitado, mas a lista de comentários (já com overflow) absorve o espaço — campos principais permanecem visíveis no topo sem rolagem.

## Validação visual

Após a edição, testar abrindo "Nova tarefa" / "Editar" em cada aba do Projeto Completo:
1. Posts, 2. Vídeos, 3. Tráfego Pago, 4. LP/Site, 5. IA/Atendimento, 6. Urgências/Outros, 7. Editar tarefa existente.

Em todos:
- Modal centralizado, ~640px de largura, 1 coluna.
- Sem barra de rolagem no formulário principal nem no `DialogContent`.
- Todos os campos principais visíveis (título, urgente, status, categoria, subtipo, prioridade, datas, responsáveis, anexos, briefing).
- Apenas a lista de comentários da seção Atividade rola internamente quando há histórico longo; composer permanece fixo no rodapé do card.

## Não alterado

- Nenhuma lógica, estado, store, campos, validação, persistência, RLS ou layout estrutural (continua 1 coluna, mesmas seções na mesma ordem).
