-- =========================================================
-- TABELA: atividade_cliente (timeline unificada por cliente)
-- =========================================================
CREATE TABLE public.atividade_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('post','demanda')),
  acao text NOT NULL,
  referencia_id uuid,
  usuario_id uuid,
  descricao text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividade_cliente_cliente
  ON public.atividade_cliente(cliente_id, created_at DESC);

CREATE INDEX idx_atividade_cliente_ref
  ON public.atividade_cliente(referencia_id);

ALTER TABLE public.atividade_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_atividade_cliente
  ON public.atividade_cliente FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY rw_atividade_cliente_insert
  ON public.atividade_cliente FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY admin_atividade_cliente_delete
  ON public.atividade_cliente FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- TRIGGERS (todos com SECURITY DEFINER + try/catch defensivo)
-- =========================================================

-- 1) cards (posts)
CREATE OR REPLACE FUNCTION public.log_atividade_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.atividade_cliente
        (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES
        (NEW.cliente_id, 'post', 'criado', NEW.id, auth.uid(),
         'Card criado: ' || COALESCE(NEW.titulo,''),
         jsonb_build_object('status', NEW.status));
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.atividade_cliente
          (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
        VALUES
          (NEW.cliente_id, 'post', 'status', NEW.id, auth.uid(),
           'Status do post: ' || OLD.status || ' → ' || NEW.status,
           jsonb_build_object('de', OLD.status, 'para', NEW.status, 'titulo', NEW.titulo));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_atividade_card
AFTER INSERT OR UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_card();

-- 2) comentarios (posts)
CREATE OR REPLACE FUNCTION public.log_atividade_comentario_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente uuid;
BEGIN
  BEGIN
    v_cliente := NEW.cliente_id;
    IF v_cliente IS NULL AND NEW.post_id IS NOT NULL THEN
      SELECT c.cliente_id INTO v_cliente
      FROM public.posts p
      JOIN public.cards c ON c.id = p.card_id
      WHERE p.id = NEW.post_id
      LIMIT 1;
    END IF;

    IF v_cliente IS NOT NULL THEN
      INSERT INTO public.atividade_cliente
        (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES
        (v_cliente, 'post', 'comentario', NEW.post_id, NEW.usuario_id,
         'Novo comentário em post',
         jsonb_build_object('texto', LEFT(COALESCE(NEW.comentario_texto,''), 280)));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_atividade_comentario_post
AFTER INSERT ON public.comentarios
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_comentario_post();

-- 3) demandas
CREATE OR REPLACE FUNCTION public.log_atividade_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.atividade_cliente
        (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES
        (NEW.cliente_id, 'demanda', 'criado', NEW.id, COALESCE(NEW.criado_por, auth.uid()),
         'Demanda criada: ' || COALESCE(NEW.titulo,''),
         jsonb_build_object('status', NEW.status, 'prioridade', NEW.prioridade));
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.atividade_cliente
          (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
        VALUES
          (NEW.cliente_id, 'demanda', 'status', NEW.id, auth.uid(),
           'Status da demanda: ' || OLD.status || ' → ' || NEW.status,
           jsonb_build_object('de', OLD.status, 'para', NEW.status, 'titulo', NEW.titulo));
      END IF;
      IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio AND NEW.data_inicio IS NOT NULL THEN
        INSERT INTO public.atividade_cliente
          (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
        VALUES
          (NEW.cliente_id, 'demanda', 'iniciado', NEW.id, auth.uid(),
           'Demanda iniciada: ' || COALESCE(NEW.titulo,''),
           '{}'::jsonb);
      END IF;
      IF NEW.data_conclusao IS DISTINCT FROM OLD.data_conclusao AND NEW.data_conclusao IS NOT NULL THEN
        INSERT INTO public.atividade_cliente
          (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
        VALUES
          (NEW.cliente_id, 'demanda', 'concluido', NEW.id, auth.uid(),
           'Demanda concluída: ' || COALESCE(NEW.titulo,''),
           '{}'::jsonb);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_atividade_demanda
AFTER INSERT OR UPDATE ON public.demandas
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_demanda();

-- 4) comentarios_demandas
CREATE OR REPLACE FUNCTION public.log_atividade_comentario_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente uuid;
BEGIN
  BEGIN
    SELECT cliente_id INTO v_cliente FROM public.demandas WHERE id = NEW.demanda_id;
    IF v_cliente IS NOT NULL THEN
      INSERT INTO public.atividade_cliente
        (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES
        (v_cliente, 'demanda', 'comentario', NEW.demanda_id, NEW.usuario_id,
         'Novo comentário em demanda',
         jsonb_build_object('texto', LEFT(COALESCE(NEW.texto,''), 280)));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_atividade_comentario_demanda
AFTER INSERT ON public.comentarios_demandas
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_comentario_demanda();

-- 5) anexos_demandas
CREATE OR REPLACE FUNCTION public.log_atividade_anexo_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente uuid;
BEGIN
  BEGIN
    SELECT cliente_id INTO v_cliente FROM public.demandas WHERE id = NEW.demanda_id;
    IF v_cliente IS NOT NULL THEN
      INSERT INTO public.atividade_cliente
        (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES
        (v_cliente, 'demanda', 'anexo', NEW.demanda_id, auth.uid(),
         'Anexo enviado: ' || COALESCE(NEW.nome,''),
         jsonb_build_object('url', NEW.url));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_atividade_anexo_demanda
AFTER INSERT ON public.anexos_demandas
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_anexo_demanda();