-- 1) Tabela de dependências entre tarefas
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  modo_liberacao text NOT NULL DEFAULT 'automatico' CHECK (modo_liberacao IN ('automatico','manual')),
  liberado boolean NOT NULL DEFAULT false,
  liberado_em timestamptz,
  liberado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_dependencies_no_self CHECK (task_id <> depends_on_task_id),
  CONSTRAINT task_dependencies_unique UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_pai ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_pendentes ON public.task_dependencies(task_id) WHERE liberado = false;

-- 2) RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_task_dependencies"
  ON public.task_dependencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rw_task_dependencies_insert"
  ON public.task_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "rw_task_dependencies_update"
  ON public.task_dependencies FOR UPDATE
  TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "rw_task_dependencies_delete"
  ON public.task_dependencies FOR DELETE
  TO authenticated
  USING (public.can_write(auth.uid()));

-- 3) Trigger de liberação automática quando a tarefa pai é concluída/entregue
CREATE OR REPLACE FUNCTION public.liberar_dependencias_automaticas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.status IN ('Concluido','Entregue')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR r IN
      SELECT id, task_id
      FROM public.task_dependencies
      WHERE depends_on_task_id = NEW.id
        AND liberado = false
        AND modo_liberacao = 'automatico'
    LOOP
      UPDATE public.task_dependencies
         SET liberado = true,
             liberado_em = now(),
             liberado_por = auth.uid()
       WHERE id = r.id;

      BEGIN
        INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, payload)
        VALUES (r.task_id, auth.uid(), 'dependencia_liberada',
                jsonb_build_object('depends_on_task_id', NEW.id, 'titulo_pai', NEW.titulo, 'modo','automatico'));
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_liberar_dependencias ON public.demandas;
CREATE TRIGGER trg_liberar_dependencias
  AFTER UPDATE ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.liberar_dependencias_automaticas();

-- 4) Atrasos: ignorar tarefas com dependência pendente
CREATE OR REPLACE FUNCTION public.marcar_demandas_atrasadas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.demandas d
     SET status = 'Atrasado'
   WHERE status NOT IN ('Concluido','Entregue','Atrasado')
     AND data_limite IS NOT NULL
     AND data_limite < now()
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = d.id AND td.liberado = false
     );
$function$;

CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_limite IS NOT NULL
     AND NEW.data_limite < now()
     AND NEW.status NOT IN ('Concluido','Entregue','Atrasado')
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = NEW.id AND td.liberado = false
     ) THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$function$;