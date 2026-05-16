-- Atualizar o perfil do Cristiano (agenciaadsbr@gmail.com)
UPDATE public.profiles 
SET nome = 'Cristiano', 
    responsavel_id = (SELECT id FROM public.responsaveis WHERE nome ILIKE '%Cristiano%' LIMIT 1)
WHERE email = 'agenciaadsbr@gmail.com';

-- Deletar roles antigas e inserir a nova
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'agenciaadsbr@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role 
FROM public.profiles 
WHERE email = 'agenciaadsbr@gmail.com';
