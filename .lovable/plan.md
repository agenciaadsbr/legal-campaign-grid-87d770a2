
# ✅ Grupo "CONCLUÍDOS" no painel de Clientes — sem novo status, sem migration

## 📋 Verificação do guia vs. estado atual

| Item do guia | Decisão |
|---|---|
| Não criar novo status `REVISADO` no banco | ✅ |
| Não alterar Kanban / fluxo de posts | ✅ |
| Manter lógica REVISAR/CRIAR | ✅ |
| VIEW `clients_panel_view` no Postgres | ❌ **dispensável** — a derivação roda em memória no front e mantém realtime imediato (já temos `cards` + `clientes` assinados na store). Criar VIEW exigiria migration, RPC e quebraria a reatividade que já funciona. |
| Trocar tabela `posts` + coluna `due_date` | ❌ **não aplicável** — projeto usa `cards.data_agendada` e `cards.status` (`Postado`/`Atrasado`/`Revisar`/`Criar`). Já cobre o conceito. |
| Toggle "mostrar concluídos" + grupo cinza no fim | ✅ **a implementar** |

> Mantenho o padrão atual (derivação no front via `useMemo`) — é mais simples, instantâneo via realtime, e zero retrabalho.

---

## 🧠 Conceito de "concluído" (frontend)

Cliente é **CONCLUÍDO** quando, considerando todos os seus cards:

- `cards.length > 0` (cliente tem trabalho cadastrado), **e**
- todos os cards têm `status_card === "Postado"`

Equivalente: **`pendentes === 0`** onde `pendentes = cards não-Postados`.

Cliente sem nenhum card → continua em **CRIAR** (default atual), não em concluído (evita poluir).

---

## 🛠️ Mudanças (1 arquivo)

### `src/pages/Clientes.tsx`

**1. Novo estado de toggle** (próximo a `apenasPendentes`, ~linha 787):

```tsx
const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
```

**2. Pré-cálculo de pendências por cliente** (novo `useMemo`, antes de `gruposPosts`):

```tsx
const pendentesPorCliente = useMemo(() => {
  const map: Record<string, { total: number; pendentes: number }> = {};
  cards.forEach((card) => {
    if (!map[card.cliente_id]) map[card.cliente_id] = { total: 0, pendentes: 0 };
    map[card.cliente_id].total += 1;
    if (card.status_card !== "Postado") map[card.cliente_id].pendentes += 1;
  });
  return map;
}, [cards]);
```

**3. Atualizar `GRUPOS` e `gruposPosts`** (~linhas 786, 817):

```tsx
const GRUPOS = ["Revisar", "Criar", "Concluidos"] as const;

const gruposPosts = useMemo(() => {
  const map: Record<string, typeof clientes> = { Revisar: [], Criar: [], Concluidos: [] };
  filtradosFinal.forEach((c) => {
    const stats = pendentesPorCliente[c.id];
    const concluido = stats && stats.total > 0 && stats.pendentes === 0;
    if (concluido) {
      if (mostrarConcluidos) map.Concluidos.push(c);
      // se toggle off → cliente concluído some do painel
      return;
    }
    const ps = (c.primary_status as string) === "Revisar" ? "Revisar" : "Criar";
    map[ps].push(c);
  });
  return map;
}, [filtradosFinal, pendentesPorCliente, mostrarConcluidos]);
```

> Importante: quando `mostrarConcluidos === false`, clientes concluídos são **ocultados** (comportamento que o usuário pediu — "painel limpo por padrão"). Isso muda o comportamento atual ligeiramente: hoje eles aparecem em CRIAR. O guia explicitamente quer esse filtro. Ok e desejado.

**4. Renderização do header do grupo** (`tbody` ~linha 898) — atualizar a cor default para incluir Concluidos:

```tsx
const cor = statusOpt?.cor ?? (
  statusLabel === "Revisar" ? "#f59e0b" :
  statusLabel === "Criar"   ? "#3b82f6" :
  "#9ca3af"  // Concluidos: cinza neutro
);
const labelExibido = statusLabel === "Concluidos" ? "Concluídos" : statusLabel;
// usar labelExibido no <ColorBadge label={labelExibido.toUpperCase()} ... />
```

A ordem do `GRUPOS` (Revisar → Criar → Concluidos) já garante que CONCLUÍDOS aparece por último.

**5. Toggle na barra superior** (~linha 839, ao lado de "Apenas com ações pendentes"):

```tsx
<label className="flex items-center gap-1.5 text-xs px-2 h-8 rounded-md border bg-card cursor-pointer">
  <Switch checked={mostrarConcluidos} onCheckedChange={setMostrarConcluidos} />
  <span>Mostrar concluídos</span>
</label>
```

**6. Esconder chip de tarefas para concluídos**: como concluídos não têm pendentes (`total === 0` em `tarefasPorCliente`), o `<TarefasInline>` já não renderiza. Nada a fazer.

---

## 🚫 O que NÃO mudo

- Banco: zero migration, zero VIEW, zero RPC
- Kanban (`ClienteDetalhe.tsx`): inalterado
- `cards.status` / `posts.status`: inalterados
- Função `update_client_primary_status`: inalterada (concluído é derivação puramente visual no front)
- Realtime: já funciona, propaga mudança de `status_card → Postado` instantaneamente

---

## 🧪 Casos de teste

| Cenário | Resultado esperado |
|---|---|
| Cliente com todos cards `Postado` + toggle OFF | Não aparece |
| Cliente com todos cards `Postado` + toggle ON | Aparece em **CONCLUÍDOS** (cinza, último grupo) |
| Cliente com 1 card `Revisar` + 9 `Postado` | Aparece em **REVISAR** com chip de tarefas |
| Cliente sem nenhum card | Aparece em **CRIAR** (não concluído) |
| Marcar último card pendente como `Postado` | Realtime → cliente sai dos grupos ativos imediatamente |

---

## 📂 Arquivos afetados

- `src/pages/Clientes.tsx` (único)
