UPDATE public.responsaveis r
SET avatar_url = p.avatar_url
FROM public.profiles p
WHERE p.responsavel_id = r.id
  AND p.avatar_url IS NOT NULL
  AND (r.avatar_url IS NULL OR r.avatar_url = '');