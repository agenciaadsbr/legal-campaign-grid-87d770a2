CREATE OR REPLACE FUNCTION public.get_user_display_names(_ids uuid[])
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(NULLIF(r.nome, ''), NULLIF(p.nome, ''), NULLIF(p.email, ''), 'Usuário') AS nome
    FROM public.profiles p
    LEFT JOIN public.responsaveis r ON r.id = p.responsavel_id
   WHERE p.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_display_names(uuid[]) TO authenticated;