-- 1. Novos campos em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS telefone text;

-- 2. Tabela de cargos pré-definidos
CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_cargos" ON public.cargos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_insert_cargos" ON public.cargos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_cargos" ON public.cargos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_cargos" ON public.cargos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Seeds
INSERT INTO public.cargos (label) VALUES
  ('Social Media'),
  ('Designer'),
  ('Redator'),
  ('Gestor de Tráfego'),
  ('Atendimento'),
  ('Administrador')
ON CONFLICT (label) DO NOTHING;