DO $$
DECLARE
  p RECORD;
  v_resp_id uuid;
  v_palette text[] := ARRAY['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#22c55e','#3b82f6','#a855f7'];
  v_idx int;
BEGIN
  FOR p IN
    SELECT id, email, nome FROM public.profiles
     WHERE responsavel_id IS NULL AND ativo = true AND email IS NOT NULL
  LOOP
    SELECT r.id INTO v_resp_id
      FROM public.responsaveis r
     WHERE lower(r.email) = lower(p.email)
     LIMIT 1;

    IF v_resp_id IS NULL THEN
      SELECT (count(*) % array_length(v_palette,1)) + 1 INTO v_idx FROM public.responsaveis;
      INSERT INTO public.responsaveis (nome, email, cor, permissao)
      VALUES (COALESCE(NULLIF(p.nome,''), split_part(p.email,'@',1)), p.email, v_palette[v_idx], 'editor')
      RETURNING id INTO v_resp_id;
    END IF;

    UPDATE public.profiles SET responsavel_id = v_resp_id WHERE id = p.id;
  END LOOP;
END $$;