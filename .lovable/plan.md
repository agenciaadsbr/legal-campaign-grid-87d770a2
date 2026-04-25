
# ⚡ Toggle "Urgente" — PostDetalhe + Kanban

A implementação atual do **Painel Inteligente de Clientes** já cobre 90% do guia recebido (2 grupos REVISAR/CRIAR, chips 🔴/⚡/🟡, popover de tarefas, filtro "apenas com pendências", `cards.is_urgent` no banco, store mapeando o campo, função `update_client_primary_status` reescrita).

A peça que falta é a **UI para marcar um card como urgente** — sem ela o chip ⚡ no painel nunca é populado organicamente.

---

## ✅ Verificação do guia recebido vs. estado atual

| Item do guia | Status |
|---|---|
| Cliente único em REVISAR ou CRIAR | ✅ implementado (`primary_status`) |
| Ignorar `Agendado`/`Postado` no agrupamento | ✅ função SQL atual já faz isso |
| Chips de tarefas no nome (🔴 ⚡ 🟡) | ✅ implementado em `Clientes.tsx` (`tarefasPorCliente`) |
| Popover com lista de tarefas (máx 5) | ✅ componente `TarefasInline` |
| Filtro "Apenas com ações pendentes" | ✅ Switch já existe |
| `is_urgent` no banco | ✅ coluna em `cards` |
| Atualização realtime | ✅ store já assina `cards`/`clientes` |
| **Toggle para marcar urgente** | ❌ **falta** |

> Nota: o guia menciona `due_date` em `posts`, mas o domínio do projeto usa `cards.data_agendada` (cards = unidade semanal de trabalho). A classificação atrasado/hoje já funciona corretamente nessa base — não vamos migrar.

---

## 🛠️ Mudanças

### 1. `src/pages/PostDetalhe.tsx` — toggle ⚡ Urgente

Adicionar um botão toggle no cabeçalho do card (próximo ao status), visível apenas quando `canWrite`:

- Ícone `Zap` da lucide-react
- Estado lido de `card.is_urgent`
- Ao clicar: `updateCard(card.id, { is_urgent: !card.is_urgent })`
- Visual: botão outline normal quando off; preenchido âmbar/amarelo + ícone preenchido quando on
- Tooltip: "Marcar como urgente" / "Remover urgência"
- Toast curto ao alternar

### 2. `src/pages/ClienteDetalhe.tsx` — indicador + toggle ⚡ no card do Kanban

No `CardItem` (linhas 15–42):

- **Indicador visual** quando `card.is_urgent === true`: ícone `Zap` âmbar pequeno ao lado do título + borda esquerda âmbar (`border-l-2 border-l-amber-500`)
- **Botão toggle** discreto no canto superior direito do card (ícone `Zap`, `h-6 w-6`, ghost):
  - Aparece sempre, mas com `opacity-0 group-hover:opacity-100` quando off (não polui)
  - Sempre visível quando on
  - `onClick` precisa de `e.preventDefault()` + `e.stopPropagation()` para não disparar o `<Link>` nem o drag
  - Só renderiza se `canWrite`
- Adicionar `group` no `className` do card

### 3. (Sem mudanças) — store e banco

`updateCard` já aceita `is_urgent` (`crm.ts:611`). Schema já tem a coluna. Realtime já propaga.

---

## 🎯 Resultado

- Usuário marca card como urgente em 1 clique (no Kanban ou abrindo o post)
- Chip ⚡ aparece imediatamente no painel `/clientes` via realtime
- Popover de tarefas lista o card na seção "⚡ Urgentes"
- Zero mudança de schema, zero migration

## 📂 Arquivos afetados

- `src/pages/PostDetalhe.tsx` — botão toggle no header
- `src/pages/ClienteDetalhe.tsx` — toggle + indicador visual no `CardItem`
