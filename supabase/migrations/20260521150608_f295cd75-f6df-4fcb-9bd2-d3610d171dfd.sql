
-- Central de Reuniões — aditivo, não destrutivo

ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'agendada',
  ADD COLUMN IF NOT EXISTS post_status text NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid NULL,
  ADD COLUMN IF NOT EXISTS motivo_nao_realizada text NULL,
  ADD COLUMN IF NOT EXISTS analise_iniciada_em timestamptz NULL,
  ADD COLUMN IF NOT EXISTS analise_iniciada_por uuid NULL;

-- Backfill seguro: apenas para registros não migrados ainda
UPDATE public.reunioes
   SET status = 'realizada',
       post_status = CASE
         WHEN (link_tldv IS NOT NULL AND length(link_tldv) > 0)
           OR (transcricao IS NOT NULL AND length(transcricao) > 0)
           OR (resumo_cliente IS NOT NULL AND length(resumo_cliente) > 0)
           OR (resumo_tarefas IS NOT NULL AND length(resumo_tarefas) > 0)
         THEN 'nao_analisada'
         ELSE NULL
       END
 WHERE data < now()
   AND status = 'agendada'
   AND post_status IS NULL;

-- Constraint leve via trigger (permite valores conhecidos)
CREATE OR REPLACE FUNCTION public.validate_reuniao_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('agendada','realizada','nao_realizada') THEN
    RAISE EXCEPTION 'status inválido: %', NEW.status;
  END IF;
  IF NEW.post_status IS NOT NULL
     AND NEW.post_status NOT IN ('nao_analisada','em_analise','delegada','sem_acao') THEN
    RAISE EXCEPTION 'post_status inválido: %', NEW.post_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reuniao_status ON public.reunioes;
CREATE TRIGGER trg_validate_reuniao_status
BEFORE INSERT OR UPDATE ON public.reunioes
FOR EACH ROW EXECUTE FUNCTION public.validate_reuniao_status();

-- meeting_tasks: rastreabilidade de tarefas geradas de reuniões
CREATE TABLE IF NOT EXISTS public.meeting_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  client_id uuid NOT NULL,
  project_id uuid NULL,
  task_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  assigned_to uuid NULL,
  due_date date NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_meeting_tasks_meeting ON public.meeting_tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_client ON public.meeting_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_task ON public.meeting_tasks(task_id);

ALTER TABLE public.meeting_tasks ENABLE ROW LEVEL SECURITY;

-- Espelha exatamente as policies de demandas
DROP POLICY IF EXISTS auth_read_meeting_tasks ON public.meeting_tasks;
CREATE POLICY auth_read_meeting_tasks ON public.meeting_tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS rw_meeting_tasks_insert ON public.meeting_tasks;
CREATE POLICY rw_meeting_tasks_insert ON public.meeting_tasks
  FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS rw_meeting_tasks_update ON public.meeting_tasks;
CREATE POLICY rw_meeting_tasks_update ON public.meeting_tasks
  FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS admin_meeting_tasks_delete ON public.meeting_tasks;
CREATE POLICY admin_meeting_tasks_delete ON public.meeting_tasks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Log de atividade para transições de status da reunião
CREATE OR REPLACE FUNCTION public.log_atividade_reuniao_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'reuniao', 'criada', NEW.id, COALESCE(NEW.criado_por, auth.uid()),
              'Reunião criada: ' || COALESCE(NEW.titulo,''),
              jsonb_build_object('status', NEW.status, 'post_status', NEW.post_status));
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
        VALUES (NEW.cliente_id, 'reuniao', 'status', NEW.id, auth.uid(),
                'Status da reunião: ' || OLD.status || ' → ' || NEW.status,
                jsonb_build_object('de', OLD.status, 'para', NEW.status));
      END IF;
      IF NEW.post_status IS DISTINCT FROM OLD.post_status AND NEW.post_status IS NOT NULL THEN
        INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
        VALUES (NEW.cliente_id, 'reuniao', 'post_status', NEW.id, auth.uid(),
                'Pós-reunião: ' || COALESCE(OLD.post_status,'—') || ' → ' || NEW.post_status,
                jsonb_build_object('de', OLD.post_status, 'para', NEW.post_status));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_atividade_reuniao_status ON public.reunioes;
CREATE TRIGGER trg_log_atividade_reuniao_status
AFTER INSERT OR UPDATE ON public.reunioes
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_reuniao_status();
