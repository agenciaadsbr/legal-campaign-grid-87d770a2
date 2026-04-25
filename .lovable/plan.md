# Problema raiz

A coluna `clientes.status` é um **enum Postgres restrito** (`'ativo' | 'pausado' | 'inativo'`), mas o sistema agora usa status dinâmicos da tabela `status_options` com labels livres ("Ativo", "Próximo da renovação", etc.). Toda tentativa de criar cliente falha no banco com:

> `invalid input value for enum status_cliente: "Ativo"`

Por isso a tabela `clientes` está **vazia** e nenhum cliente cadastrado aparece. Os logs do Postgres confirmam o erro nos últimos minutos.

Além disso:
- `status_options` está poluída com status de **cards** ("CRIAR", "REVISAR", "AGENDADO", "POSTADO", "ATRASADO") misturados com os de cliente.
- O `addCliente` não trata erros de forma visível — ele faz `throw`, mas o usuário não vê toast claro.

# Solução

## 1. Migração SQL — converter `clientes.status` de enum para `text`

```sql
ALTER TABLE public.clientes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.clientes ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.clientes ALTER COLUMN status SET DEFAULT 'Ativo';

-- Limpeza: remover status de card que vazaram para status_options
DELETE FROM public.status_options 
WHERE label IN ('CRIAR','REVISAR','AGENDADO','POSTADO','ATRASADO');

WITH r AS (SELECT id, ROW_NUMBER() OVER (ORDER BY ordem) - 1 AS rn FROM public.status_options)
UPDATE public.status_options s SET ordem = r.rn FROM r WHERE s.id = r.id;
```

> O enum `status_cliente` continua existindo, mas a coluna não usa mais — assim aceita qualquer label criado em "Configurações do painel".

## 2. Ajustar `src/store/crm.ts`

- `addCliente`: garantir fallback `"Ativo"` para status vazio, e exibir `toast.error(error.message)` antes de relançar — para que erros futuros sejam visíveis.
- `updateCliente`: mesma proteção de feedback.

## 3. Resiliência no UI

Em `src/pages/Clientes.tsx`, envolver a chamada de `addCliente` no submit do dialog "+ Novo Cliente" em try/catch com `toast.error`, para feedback imediato.

# Resultado esperado

- Criação de cliente funciona imediatamente; o registro aparece para todos os usuários via Realtime já configurado.
- Status de cliente aceita qualquer label dinâmico criado em "Configurações do painel → Status do Cliente".
- A tabela `status_options` fica limpa, contendo só status reais de cliente.