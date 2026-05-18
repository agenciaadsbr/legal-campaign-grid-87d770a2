## Problema

A tabela `ia_setor_prompts` tem uma policy legada (`Apenas admin/editor pode inserir/atualizar prompts`) que valida permissão por `profiles.cargo IN ('admin','editor')`. No banco, `profiles.cargo` guarda cargos de trabalho ("Diretor", "Designer", "Comercial", "Gestor de Tráfego" etc.) — ninguém tem cargo literal `admin` ou `editor`. Resultado: todo INSERT/UPDATE é bloqueado pelo RLS, gerando o erro do screenshot.

O restante do sistema já usa o padrão correto: tabela `user_roles` + função `has_role(uuid, app_role)`.

## Correção (apenas RLS, sem mexer em dados, layout ou frontend)

Migration única que:

1. Remove a policy legada incorreta:
   - `DROP POLICY "Apenas admin/editor pode inserir/atualizar prompts" ON public.ia_setor_prompts;`
2. Remove a duplicata genérica de SELECT para consolidar:
   - `DROP POLICY "Qualquer usuário autenticado pode ler prompts" ON public.ia_setor_prompts;`
3. Cria policies novas usando `has_role()` (mesmo padrão de `ia_agentes`, `ia_config`, `ia_prompts`):
   - SELECT: qualquer usuário autenticado
   - INSERT: somente `admin` ou `super_admin`
   - UPDATE: somente `admin` ou `super_admin`
   - DELETE: somente `admin` ou `super_admin`

Nada de tabela, colunas, dados, frontend, store ou edge function é alterado. A tabela já é simples (`setor`, `prompt`, timestamps) — não há `organization_id`/`user_id` envolvidos.

## SQL

```sql
DROP POLICY IF EXISTS "Apenas admin/editor pode inserir/atualizar prompts" ON public.ia_setor_prompts;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ler prompts" ON public.ia_setor_prompts;

CREATE POLICY "auth_read_ia_setor_prompts"
  ON public.ia_setor_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_ia_setor_prompts_insert"
  ON public.ia_setor_prompts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "admin_ia_setor_prompts_update"
  ON public.ia_setor_prompts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "admin_ia_setor_prompts_delete"
  ON public.ia_setor_prompts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
```

## Resultado esperado

- Admins/super_admins salvam, editam e removem prompts por setor sem erro de RLS.
- Demais usuários autenticados continuam lendo normalmente.
- Nenhum dado é apagado; nenhuma outra tabela, tela, store ou função é tocada.