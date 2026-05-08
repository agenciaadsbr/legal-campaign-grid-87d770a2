## Problema

Usuários **não-admin (editor)** não conseguem remover anexos das demandas dentro do "Projeto Completo" do cliente.

## Causa raiz

A tabela `public.anexos_demandas` tem RLS configurado assim:

- SELECT: liberado para autenticados
- INSERT/UPDATE: `can_write(auth.uid())` (admin + editor) ✅
- **DELETE: `has_role(auth.uid(), 'admin')`** ❌ — só admin

Resultado: quando um editor clica em "Remover anexo" no `DemandaDetalheDialog`, o Supabase rejeita o `delete` silenciosamente (0 linhas afetadas) e o arquivo continua aparecendo. O frontend chama `supabase.from("anexos_demandas").delete().eq("id", id)` em `src/store/demandas.ts` e o erro de RLS pode nem ser retornado, dependendo do caso.

Esse mesmo padrão (somente admin pode deletar) provavelmente bloqueia editores em fluxos parecidos, mas o pedido é específico para anexos.

## Correção

### 1. Migration de banco

Substituir a policy de DELETE de `anexos_demandas` por uma que permita admins e editores:

```sql
DROP POLICY IF EXISTS admin_anexos_demandas_delete ON public.anexos_demandas;

CREATE POLICY rw_anexos_demandas_delete
ON public.anexos_demandas
FOR DELETE
TO authenticated
USING (public.can_write(auth.uid()));
```

Isso alinha o DELETE com o INSERT/UPDATE já existentes (ambos usam `can_write`), permitindo que **admin + editor** removam anexos. Viewers continuam sem permissão.

### 2. Garantir feedback de erro no frontend

Em `src/store/demandas.ts`, função `removeAnexo`, adicionar verificação extra: quando o `delete` retorna 0 linhas (caso de RLS bloqueando sem erro explícito), mostrar toast de "sem permissão". Isso evita silêncio em casos futuros.

```ts
const { error, count } = await supabase
  .from("anexos_demandas")
  .delete({ count: "exact" })
  .eq("id", id);

if (error) { /* toast erro */ return; }
if (count === 0) {
  toast.error("Você não tem permissão para remover este anexo");
  return;
}
```

### 3. Storage bucket "anexos"

O cleanup do arquivo no bucket já é best-effort (`.catch(() => {})`) então não precisa mudar — se o editor não tiver permissão de delete no bucket, o registro do banco some e o arquivo vira órfão (aceitável). Caso queira limpar de verdade, adicionamos depois uma policy de DELETE no `storage.objects` para `bucket_id = 'anexos'` com `can_write`.

## Resultado esperado

Editores passam a remover anexos de demandas normalmente, com feedback claro caso algo dê errado.