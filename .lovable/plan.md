## Causa raiz

A aba Posts do **Timidati Advogados** abria o card sem navegar para o detalhe porque:

- O banco tem **1.096 cards** e **1.096 posts**.
- O store carrega tudo com `supabase.from("posts").select("*")` e `supabase.from("cards").select("*")`, que usam o **limite default de 1000 linhas por query do PostgREST/Supabase**.
- Os 96 registros excedentes (entre eles, os 12 cards/posts do Timidati) **não chegam ao frontend**.
- Em `PostsKanbanCliente.tsx` (linha 247–248), o `<Link to="posts/...">` só envolve o card quando o `post` correspondente existe na store. Sem post, o card vira um `<div>` puro — clicar não abre o detalhe. Isso explica exatamente o sintoma relatado para o Timidati e potencialmente afetará qualquer cliente novo daqui pra frente.

A migração SQL anterior (que padronizou os títulos do Timidati) não tinha relação com esse bug — era um problema separado de UI que coincidiu no mesmo cliente.

## Correção

Buscar `cards` e `posts` em **lotes paginados** no `loadFromSupabase` de `src/store/crm.ts`, removendo o teto de 1000 linhas. Isso conserta o Timidati e qualquer cliente futuro de uma vez.

### Mudança em `src/store/crm.ts`

1. Criar helper `fetchAll(table, orderBy?)` que busca via `.range(from, to)` em lotes de 1000 até receber menos que o tamanho do lote.
2. Substituir as duas chamadas dentro do `Promise.all` (linhas 467–468):
   - `supabase.from("cards").select("*").order("posicao")` → `fetchAll("cards", { column: "posicao", ascending: true })`
   - `supabase.from("posts").select("*")` → `fetchAll("posts")`
3. Adaptar para que `Promise.all` continue funcionando (o helper retorna `{ data, error }` no mesmo formato esperado pelo restante do código).

Por segurança, aplicar a mesma paginação para `comentarios` (também pode crescer rápido) — opcional, mas recomendado já que segue o mesmo padrão.

### Validação após a mudança

- Abrir a aba Posts do Timidati (`/clientes/d5b6975c.../?tab=posts`) e clicar em um card → deve navegar para `/clientes/.../posts/{post_id}`.
- Verificar no DevTools/Network que apenas 2 requests adicionais a `cards` e `posts` (range 1000-1999) acontecem no boot.
- Confirmar que outros clientes continuam funcionando.

## Escopo

- 1 arquivo alterado: `src/store/crm.ts` (apenas o `loadFromSupabase`).
- Nenhuma mudança de schema, nenhuma migração SQL.
- Nenhum impacto em RLS, autenticação ou outras telas (o resto da app já consome `cards`/`posts` da mesma store).
