
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.demanda_status AS ENUM ('Planejamento','Criar','Revisar','Entregue','Concluido','Atrasado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.demanda_prioridade AS ENUM ('Baixa','Media','Alta','Urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.demanda_categoria AS ENUM ('Designer','EditorVideo','LandingPage','TrafegoPago','Tecnologia','Suporte','Personalizado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ TABELAS ============
CREATE TABLE public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  titulo text NOT NULL,
  categoria public.demanda_categoria NOT NULL DEFAULT 'Personalizado',
  subtipo text,
  descricao text,
  status public.demanda_status NOT NULL DEFAULT 'Planejamento',
  prioridade public.demanda_prioridade NOT NULL DEFAULT 'Media',
  responsavel_id uuid,
  criado_por uuid,
  data_limite timestamptz,
  data_inicio timestamptz,
  data_conclusao timestamptz,
  precisa_aprovacao boolean NOT NULL DEFAULT false,
  aprovado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_demandas_cliente ON public.demandas(cliente_id);
CREATE INDEX idx_demandas_responsavel ON public.demandas(responsavel_id);
CREATE INDEX idx_demandas_status ON public.demandas(status);

CREATE TABLE public.comentarios_demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  texto text NOT NULL,
  imagem_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coment_demandas_demanda ON public.comentarios_demandas(demanda_id);

CREATE TABLE public.anexos_demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  mime text,
  size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_anexos_demandas_demanda ON public.anexos_demandas(demanda_id);

CREATE TABLE public.historico_demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  usuario_id uuid,
  acao text NOT NULL,
  de_status public.demanda_status,
  para_status public.demanda_status,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hist_demandas_demanda ON public.historico_demandas(demanda_id);

-- ============ TRIGGERS ============
CREATE TRIGGER set_demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.data_limite IS NOT NULL
     AND NEW.data_limite < now()
     AND NEW.status NOT IN ('Concluido','Entregue','Atrasado') THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_marcar_demanda_atrasada
  BEFORE INSERT OR UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.auto_marcar_demanda_atrasada();

CREATE OR REPLACE FUNCTION public.log_historico_demanda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, para_status, payload)
    VALUES (NEW.id, NEW.criado_por, 'criada', NEW.status, jsonb_build_object('titulo', NEW.titulo));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, de_status, para_status, payload)
      VALUES (NEW.id, auth.uid(), 'status_alterado', OLD.status, NEW.status, '{}'::jsonb);
    END IF;
    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
      INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, payload)
      VALUES (NEW.id, auth.uid(), 'responsavel_alterado',
              jsonb_build_object('de', OLD.responsavel_id, 'para', NEW.responsavel_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_historico_demanda
  AFTER INSERT OR UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.log_historico_demanda();

CREATE OR REPLACE FUNCTION public.marcar_demandas_atrasadas()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.demandas
     SET status = 'Atrasado'
   WHERE status NOT IN ('Concluido','Entregue','Atrasado')
     AND data_limite IS NOT NULL
     AND data_limite < now();
$$;

-- ============ RLS ============
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_demandas ENABLE ROW LEVEL SECURITY;

-- demandas
CREATE POLICY auth_read_demandas ON public.demandas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR responsavel_id = auth.uid()
  OR criado_por = auth.uid()
);
CREATE POLICY rw_demandas_insert ON public.demandas FOR INSERT TO authenticated
WITH CHECK (can_write(auth.uid()));
CREATE POLICY rw_demandas_update ON public.demandas FOR UPDATE TO authenticated
USING (can_write(auth.uid())) WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_demandas_delete ON public.demandas FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

-- comentarios_demandas
CREATE POLICY auth_read_coment_demandas ON public.comentarios_demandas FOR SELECT TO authenticated USING (true);
CREATE POLICY users_create_own_coment_demandas ON public.comentarios_demandas FOR INSERT TO authenticated
WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY users_update_own_coment_demandas ON public.comentarios_demandas FOR UPDATE TO authenticated
USING (auth.uid() = usuario_id OR has_role(auth.uid(),'admin'));
CREATE POLICY users_delete_own_coment_demandas ON public.comentarios_demandas FOR DELETE TO authenticated
USING (auth.uid() = usuario_id OR has_role(auth.uid(),'admin'));

-- anexos_demandas
CREATE POLICY auth_read_anexos_demandas ON public.anexos_demandas FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_anexos_demandas_insert ON public.anexos_demandas FOR INSERT TO authenticated
WITH CHECK (can_write(auth.uid()));
CREATE POLICY rw_anexos_demandas_update ON public.anexos_demandas FOR UPDATE TO authenticated
USING (can_write(auth.uid())) WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_anexos_demandas_delete ON public.anexos_demandas FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

-- historico_demandas
CREATE POLICY auth_read_hist_demandas ON public.historico_demandas FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_hist_demandas_insert ON public.historico_demandas FOR INSERT TO authenticated
WITH CHECK (true);
CREATE POLICY admin_hist_demandas_delete ON public.historico_demandas FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));
