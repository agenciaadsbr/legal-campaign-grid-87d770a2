-- 1. Campo de urgência nos cards
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

-- 2. Reescrita da função: apenas Revisar ou Criar
CREATE OR REPLACE FUNCTION public.update_client_primary_status(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN;
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.cards
      WHERE cliente_id = p_client_id AND status = 'Revisar'
    ) THEN 'Revisar'
    ELSE 'Criar'
  END INTO v_status;

  UPDATE public.clientes SET primary_status = v_status WHERE id = p_client_id;
END;
$$;

-- 3. Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clientes LOOP
    PERFORM public.update_client_primary_status(r.id);
  END LOOP;
END $$;