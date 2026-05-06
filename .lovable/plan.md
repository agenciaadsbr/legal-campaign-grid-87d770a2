## Objetivo

Permitir que **qualquer usuário autenticado** veja e edite **todas as demandas/tarefas** do sistema (incluindo abrir via link compartilhado), mantendo a página **"Minhas Tarefas"** filtrando apenas as tarefas atribuídas ao usuário logado.

## Causa raiz

A política RLS atual em `demandas` (`auth_read_demandas`) só libera leitura para:
- admin, OU
- criador da demanda, OU
- usuário presente em `responsaveis_ids` / `responsavel_id`

Por isso usuários comuns não veem tarefas em que não estão atribuídos — nem pelo link, nem em listas gerais.

## Mudanças

### 1. Migração SQL — liberar leitura de demandas para todos autenticados

Substituir a policy `auth_read_demandas` para que qualquer usuário autenticado leia qualquer demanda:

```sql
DROP POLICY IF EXISTS auth_read_demandas ON public.demandas;

CREATE POLICY auth_read_demandas
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (true);
```

Políticas de INSERT/UPDATE/DELETE continuam iguais (já usam `can_write` / admin), então **edição segue restrita a admin/editor** — viewers só leem. Isso atende: "ver/editar todas as tarefas sem restrições" para usuários com permissão de escrita; viewers conseguem visualizar tudo.

### 2. "Minhas Tarefas" — sem alteração funcional

A página `src/pages/MinhasTarefas.tsx` (e `src/lib/minhasTarefas.ts`) já filtra no frontend pelas tarefas do usuário logado. Como agora o RLS retorna todas, o filtro client-side garante que esse módulo continue mostrando apenas as tarefas do próprio usuário. Vou revisar rapidamente o arquivo para confirmar que o filtro é por `responsavel_id` do usuário e não depende de "só veio o que é meu" pelo RLS — se depender, ajusto para filtrar explicitamente.

### 3. Sem mudanças no componente "Colar link da tarefa"

Continua funcionando como está; apenas deixará de "abrir vazio" porque a demanda passará a ser carregada para qualquer usuário.

## Considerações de segurança

- Leitura de demandas passa a ser global entre usuários autenticados (decisão explícita do usuário).
- Edição/exclusão continuam restritas via `can_write` e `has_role(admin)`.
- Comentários, anexos e histórico de demandas já têm `SELECT USING (true)` para autenticados — coerente com a nova política.

Confirma para eu aplicar?
