CREATE TABLE public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo_video text NOT NULL DEFAULT 'youtube',
  video_url text NOT NULL,
  categoria text,
  ordem integer NOT NULL DEFAULT 0,
  thumbnail_url text,
  anexo_url text,
  anexo_nome text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_aulas
  ON public.aulas FOR SELECT TO authenticated USING (true);

CREATE POLICY rw_aulas_insert
  ON public.aulas FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY rw_aulas_update
  ON public.aulas FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY rw_aulas_delete
  ON public.aulas FOR DELETE TO authenticated
  USING (public.can_write(auth.uid()));

CREATE TRIGGER trg_aulas_updated_at
  BEFORE UPDATE ON public.aulas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_aulas_categoria_ordem ON public.aulas (categoria, ordem, created_at);