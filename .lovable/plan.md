
# Status Principal por Cliente (sem duplicação)

Hoje em `src/pages/Clientes.tsx` (linhas 785-796) o `gruposPosts` insere o **mesmo cliente em vários grupos** — um por status de card existente. É a causa da duplicação. Vamos calcular um **status principal único** por cliente baseado em prioridade e renderizá-lo apenas em um grupo, mantendo os contadores na linha.

Regras de nomenclatura: o sistema usa labels em PT capitalizado (`Atrasado`, `Revisar`, `Criar`, `Agendado`, `Postado`) — vou manter essas chaves (não migrar para minúsculo).

---

## 1. Banco de dados (migração)

Adicionar coluna persistida em `clientes` + função + triggers para manter sincronizado.

```sql
-- 1. Coluna
ALTER TABLE public.clientes
  ADD COLUMN primary_status text NOT NULL DEFAULT 'Criar';

-- 2. Função de cálculo
CREATE OR REPLACE FUNCTION public.update_client_primary_status(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM cards WHERE cliente_id = p_client_id AND status = 'Atrasado') THEN 'Atrasado'
    WHEN EXISTS (SELECT 1 FROM cards WHERE cliente_id = p_client_id AND status = 'Revisar')  THEN 'Revisar'
    WHEN EXISTS (SELECT 1 FROM cards WHERE cliente_id = p_client_id AND status = 'Criar')    THEN 'Criar'
    WHEN EXISTS (SELECT 1 FROM cards WHERE cliente_id = p_client_id AND status = 'Agendado') THEN 'Agendado'
    WHEN EXISTS (SELECT 1 FROM cards WHERE cliente_id = p_client_id) THEN 'Postado'
    ELSE 'Criar'
  END INTO v_status;

  UPDATE public.clientes SET primary_status = v_status WHERE id = p_client_id;
END;
$$;

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_client_primary_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_client_primary_status(OLD.cliente_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_client_primary_status(NEW.cliente_id);
    IF TG_OP = 'UPDATE' AND OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      PERFORM public.update_client_primary_status(OLD.cliente_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- 4. Triggers em cards
CREATE TRIGGER cards_primary_status_ins
  AFTER INSERT ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_client_primary_status();

CREATE TRIGGER cards_primary_status_upd
  AFTER UPDATE OF status, cliente_id ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_client_primary_status();

CREATE TRIGGER cards_primary_status_del
  AFTER DELETE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_client_primary_status();

-- 5. Backfill inicial
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clientes LOOP
    PERFORM public.update_client_primary_status(r.id);
  END LOOP;
END $$;
```

---

## 2. `src/store/crm.ts`

- Acrescentar `primary_status?: string` ao tipo `Cliente`.
- No mapper de cliente (onde `clientes` são lidos do Supabase), incluir `primary_status: row.primary_status ?? "Criar"`.
- Nenhuma escrita manual: o trigger cuida. (No `addCliente`, após criar os 4×N cards, o trigger já vai setar `Criar`.)

---

## 3. `src/pages/Clientes.tsx` — re-agrupamento por `primary_status`

**Substituir o `gruposPosts` atual (linhas 785-796)** por agrupamento único:

```ts
const PRIORIDADE = ["Atrasado", "Revisar", "Criar", "Agendado", "Postado"] as const;

const gruposPosts = useMemo(() => {
  const map: Record<string, typeof clientes> = {};
  PRIORIDADE.forEach((s) => (map[s] = []));
  filtrados.forEach((c) => {
    const ps = (c as any).primary_status ?? "Criar";
    if (!map[ps]) map[ps] = [];
    map[ps].push(c);
  });
  return map;
}, [filtrados]);
```

Substituir o `statusPostOptions.map(...)` da renderização (linha 866) por iteração sobre `PRIORIDADE`, buscando cor/label em `statusPostOptions` por `label`. Cada cliente agora aparece **uma única vez** no grupo do seu `primary_status`.

### Contadores na linha do cliente
Na célula `posts` (já existente), além de `X/Y posts` e `⚠ N atrasados`, adicionar uma linha compacta de contadores por status (apenas os > 0):

```tsx
const counts = PRIORIDADE.reduce((acc, s) => {
  acc[s] = cardsCliente.filter(k => k.status_card === s).length;
  return acc;
}, {} as Record<string, number>);

// Render: pílulas pequenas coloridas — Criar:3 · Revisar:1 · Agendado:4 · Atrasado:2
```

### Realtime
Em `useCRM` já existem subscriptions a `cards` e `clientes`. Após a migração, qualquer UPDATE em `cards.status` dispara trigger → UPDATE em `clientes.primary_status` → realtime do `clientes` re-popula o store. Verificar se a subscription de `clientes` está ativa; se não estiver, adicionar canal Postgres realtime para `public.clientes` UPDATE.

### Remover badge "ATIVO" rosa
Localizar e remover o badge inline ao lado do nome (linha ~894 que usa `statusOptions.find(... cliente.status_cliente)`). O filtro de Status do Cliente no topo permanece — apenas o badge visual é removido.

---

## 4. Arquivos tocados

| Arquivo | Mudança |
|---|---|
| migração SQL | nova coluna + função + 3 triggers + backfill |
| `src/store/crm.ts` | tipo `Cliente.primary_status` + mapper |
| `src/pages/Clientes.tsx` | `gruposPosts` por `primary_status` (sem duplicar), contadores inline, remover badge ATIVO |

## 5. Testes manuais (correspondem aos testes pedidos)

1. Cliente com `Criar`+`Revisar` → grupo **Revisar**.
2. Cliente com `Atrasado`+`Revisar` → grupo **Atrasado**.
3. Cliente só `Agendado` → grupo **Agendado**.
4. Cliente só `Postado` → grupo **Postado**.
5. Cliente sem cards → grupo **Criar** (fallback no SQL).

Pronto para implementar.
