-- Permitir que TODOS os usuários autenticados (admin, super_admin, editor, viewer)
-- consigam alterar status e demais campos de cards, posts e demandas.
-- Mantém DELETE restrito a admin (não alterado).

CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id)
$$;