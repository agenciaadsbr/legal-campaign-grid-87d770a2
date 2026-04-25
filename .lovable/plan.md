
# 🎯 Painel de Clientes Inteligente — Simples + Automático

Reduzir o painel a **2 grupos de ação** (REVISAR / CRIAR) e mostrar as **tarefas prioritárias** (atrasadas, hoje, urgentes) de cada cliente direto na linha — sem criar abas novas, sem fluxo paralelo.

---

## 🧱 1. Banco de Dados (migration)

### 1.1 Adicionar campo de urgência em `cards`
```sql
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;
```

### 1.2 Reescrever `update_client_primary_status` — só 2 estados de ação

A regra agora ignora `Agendado` e `Postado` (não são ação). Também desconsidera cards finalizados (`Postado`) ao olhar atrasos.

```sql
CREATE OR REPLACE FUNCTION public.update_client_primary_status(p_client_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  IF p_client_id IS NULL THEN RETURN; END IF;
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.cards
      WHERE cliente_id = p_client_id AND status = 'Revisar'
    ) THEN 'Revisar'
    ELSE 'Criar'
  END INTO v_status;
  UPDATE public.clientes SET primary_status = v_status WHERE id = p_client_id;
END;
$$;
```

Rebackfill de todos os clientes via `DO $$` loop após a mudança.

> Trigger existente em `cards` (insert/update/delete) **continua válida** — só muda a função interna.

---

## ⚙️ 2. Lógica de tarefas prioritárias (frontend)

Para cada cliente, derivar em runtime a partir de `cards`:

```ts
const PRIORIDADES = ["Postado"]; // ignorar
function classificarCard(card) {
  if (card.status === "Postado") return null;
  const due = card.data_agendada ? new Date(card.data_agendada) : null;
  const hojeStart = new Date(); hojeStart.setHours(0,0,0,0);
  const amanhaStart = new Date(hojeStart); amanhaStart.setDate(amanhaStart.getDate()+1);

  if (card.status === "Atrasado" || (due && due < hojeStart)) return "atrasado";
  if (card.is_urgent) return "urgente";
  if (due && due >= hojeStart && due < amanhaStart) return "hoje";
  return null; // não aparece
}
```

Contadores por cliente: `atrasadas`, `urgentes`, `hoje`.

---

## 👁️ 3. UI no painel `src/pages/Clientes.tsx`

### 3.1 Substituir os 5 grupos atuais (`Atrasado/Revisar/Criar/Agendado/Postado`) por **2 grupos**:

```ts
const GRUPOS = ["Revisar", "Criar"] as const;
```

Cabeçalho do grupo mantém o `ColorBadge` atual (cores do `status_post_options`).

### 3.2 Coluna "Nome do cliente" — adicionar disclosure inline

Ao lado do nome:
- Se cliente tem ≥1 tarefa prioritária → mostra **chips compactos**:
  - `🔴 2` (atrasadas) · `⚡ 1` (urgentes) · `🟡 1` (hoje)
- Botão `▶/⌄` abre um `Popover` com a lista (máx 5, "+N tarefas" se exceder):
  ```
  🔴 Atrasadas (2)
    • Revisar post — Semana 2  →  /clientes/:id
    • Criar post — Semana 3
  ⚡ Urgentes (1)
    • Agendar post
  🟡 Hoje (1)
    • Criar post
  ```
- Cada item linka para o cliente (mantém comportamento atual de abrir Kanban).

### 3.3 Filtro "Mostrar apenas com ações pendentes" (toggle no topo)

Quando ativo, esconde clientes que não têm `atrasadas + urgentes + hoje > 0`. Padrão: **desligado** (mantém todos visíveis para não quebrar fluxo atual).

### 3.4 Marcar card como urgente

No `PostDetalhe.tsx` / Kanban, adicionar **toggle ⚡ Urgente** no card (atualiza `cards.is_urgent`). Ícone discreto ⚡ aparece no card quando `true`.

> Escopo deste plano: apenas adicionar o toggle dentro do dialog de edição do card já existente em `PostDetalhe`. Não muda layout do Kanban.

---

## 🔄 4. Atualização automática

- **Realtime já ativo** em `cards` via store (`useCRM`). Mudanças em `status`, `data_agendada`, `is_urgent` re-renderizam contadores automaticamente.
- `primary_status` é atualizado pelo trigger SQL → reagrupa cliente entre Revisar/Criar sem refetch manual.

---

## 🚫 5. O que NÃO será feito (proteção contra escopo)

- ❌ Nova aba "Minhas Tarefas"
- ❌ Sistema paralelo de tarefas
- ❌ Drag & drop adicional
- ❌ Mudança no Kanban / fluxo de cliques
- ❌ Mexer em outros painéis (Alertas, Dashboard, Contratos)

---

## 📝 Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/<novo>.sql` | Adiciona `cards.is_urgent`; reescreve `update_client_primary_status`; rebackfill |
| `src/store/crm.ts` | Tipo `Card` ganha `is_urgent`; mapper inclui o campo |
| `src/pages/Clientes.tsx` | `GRUPOS = ["Revisar","Criar"]`; chips de tarefas + Popover na linha; filtro "apenas pendentes" |
| `src/pages/PostDetalhe.tsx` | Toggle ⚡ Urgente |

## ✅ Resultado

- Cliente aparece **uma vez só** em Revisar **ou** Criar
- Vê tarefas críticas **sem abrir o Kanban**
- Painel atualiza **sozinho** quando datas/status mudam
- Zero complexidade nova — apenas inteligência sobre o que já existe
