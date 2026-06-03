-- Habilitar realtime para demandas e tabelas relacionadas, garantindo que
-- exclusões e atualizações sejam propagadas para todos os clientes em tempo real
-- (Central de Tarefas, Dashboard, Kanban do Projeto, Alertas, etc.).

ALTER TABLE public.demandas REPLICA IDENTITY FULL;
ALTER TABLE public.comentarios_demandas REPLICA IDENTITY FULL;
ALTER TABLE public.anexos_demandas REPLICA IDENTITY FULL;
ALTER TABLE public.historico_demandas REPLICA IDENTITY FULL;
ALTER TABLE public.task_dependencies REPLICA IDENTITY FULL;
ALTER TABLE public.card_pai REPLICA IDENTITY FULL;
ALTER TABLE public.card_pai_etapas REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'demandas',
    'comentarios_demandas',
    'anexos_demandas',
    'historico_demandas',
    'task_dependencies',
    'card_pai',
    'card_pai_etapas'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;