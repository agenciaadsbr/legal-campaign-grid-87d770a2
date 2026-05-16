-- Atualizar a função has_role para que super_admin herde permissões de admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and (
        role = _role 
        OR (role = 'super_admin' AND _role = 'admin')
      )
  )
$function$;

-- Agora can_write pode ser simplificado, embora o que fizemos antes já funcione.
-- Vamos simplificar para manter a consistência.
CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'editor')
$function$;
-- Nota: has_role(..., 'admin') agora retornará verdadeiro para super_admin.
