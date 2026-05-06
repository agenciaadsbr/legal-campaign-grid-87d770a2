# Diagnóstico — por que usuários não-admin não veem suas tarefas

## Causa raiz (bug crítico de RLS)

A política `SELECT` da tabela `public.demandas` está comparando o **id do usuário autenticado** (`auth.uid()`) diretamente com colunas que armazenam o **id do responsável** (`responsaveis.id`):

```sql
USING (
  has_role(auth.uid(), 'admin')
  OR criado_por      = auth.uid()
  OR auth.uid() = ANY(responsaveis_ids)   --  comparação errada
  OR responsavel_id  = auth.uid()         --  comparação errada
)
```

No projeto, `auth.uid()` ≠ `responsaveis.id`. O vínculo correto é:

```text
auth.users.id  ──►  profiles.id
                    profiles.responsavel_id  ──►  responsaveis.id  ──►  demandas.responsaveis_ids
```

Conferi no banco: todos os 11 usuários têm `profiles.responsavel_id` corretamente preenchido, e existem demandas atribuídas a eles. Mesmo assim a RLS rejeita, porque está comparando UUIDs de tabelas diferentes. Por isso, um editor (ex.: Robson) só consegue ler as demandas que ele mesmo criou, nunca as que foram atribuídas a ele por outra pessoa.

## Causa secundária (UX/consistência)

- `useResponsavelAtual` retorna `responsavelId = null` enquanto a query a `profiles` ainda não respondeu. O `MinhasTarefas.tsx` já recalcula via `useMemo`, mas o estado de loading não é exibido — o usuário vê "0 tarefas" por uma fração de segundo e pode confundir com o bug.
- O `cache` em memória de `useResponsavelAtual` é indexado por `auth.uid` (ok), mas não invalida ao trocar de usuário na mesma aba (improvável em produção, mas vale limpar no `signOut`).
- Posts/Cards e Planejamento já têm RLS permissiva (todos autenticados leem), então a filtragem por responsável é feita só no front. Isso continua funcionando — o problema afeta principalmente **demandas**.

# Plano de correção

## 1. Migration SQL — corrigir a política `auth_read_demandas`

Criar uma função `SECURITY DEFINER` que resolve o `responsavel_id` do usuário autenticado, e reescrever a política usando essa função. Isso evita recursão e mantém performance.

```sql
-- Helper: retorna o responsavel_id vinculado ao auth.uid()
create or replace function public.current_responsavel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select responsavel_id
    from public.profiles
   where id = auth.uid()
   limit 1
$$;

-- Política antiga (errada)
drop policy if exists auth_read_demandas on public.demandas;

-- Nova política (correta)
create policy auth_read_demandas on public.demandas
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or criado_por = auth.uid()
  or public.current_responsavel_id() = any(responsaveis_ids)
  or public.current_responsavel_id() = responsavel_id
);
```

Tabelas relacionadas (`comentarios_demandas`, `anexos_demandas`, `historico_demandas`) já têm SELECT aberto a qualquer autenticado (`USING true`), então não precisam de mudança — quem não vê a demanda também não consegue agir nela porque a UI esconde.

## 2. Verificar consistência de outras tabelas

- `cards`, `posts`, `clientes`, `cliente_planejamento_itens`, `cliente_documentacao`, `contratos`, `responsaveis`, `profiles` (próprio): já permitem leitura ao autenticado adequado. Sem mudança.
- `demandas` é a única com filtro por usuário no SELECT — e é exatamente onde o bug está.

## 3. Pequenos ajustes no front (qualidade)

- `src/pages/MinhasTarefas.tsx`: mostrar um skeleton/aviso enquanto `useResponsavelAtual().loading === true` E `responsavelId` ainda for `null`, em vez de já renderizar a tabela vazia.
- `src/hooks/useResponsavelAtual.ts`: limpar o `cache` em `signOut` (exportar uma função `clearResponsavelCache` chamada em `useAuth.signOut`) para evitar ID antigo em troca de usuário.

Nenhuma alteração de schema, nenhuma quebra de tipos.

## 4. Validação após aplicar

1. Logar como `robsonlobato31@gmail.com` (editor) → "Minhas Tarefas" deve listar as 4 demandas atribuídas + ~444 grupos de posts dos clientes onde ele é responsável.
2. Logar como `agenciaadsbr@gmail.com` (admin) → comportamento permanece idêntico (vê tudo, e o seletor "Todos os usuários / por responsável" continua funcional).
3. Conferir no Network que `GET /rest/v1/demandas` retorna as linhas esperadas (e não mais um array vazio) para o editor.

# Detalhes técnicos

- A função `current_responsavel_id()` é `STABLE SECURITY DEFINER` e fixa `search_path = public`, seguindo o mesmo padrão de `has_role`, evitando recursão de RLS (a função lê `profiles` com privilégios elevados, sem disparar a policy `users_read_own_profile`).
- A política não usa subquery direta na tabela `demandas`, então não há risco de "infinite recursion".
- Mantemos `criado_por = auth.uid()` para não quebrar quem criou a demanda mas ainda não foi adicionado como responsável.
- Não há mudança nas políticas `INSERT/UPDATE/DELETE` (continuam usando `can_write` / `has_role(admin)`).

# Arquivos previstos

- Nova migration SQL (corrigir política + criar função helper).
- `src/hooks/useResponsavelAtual.ts` — exportar `clearResponsavelCache`.
- `src/hooks/useAuth.tsx` — chamar `clearResponsavelCache` no `signOut`.
- `src/pages/MinhasTarefas.tsx` — exibir estado de carregamento quando `responsavelId` ainda não resolveu.
- `public/version.json` — bump.
