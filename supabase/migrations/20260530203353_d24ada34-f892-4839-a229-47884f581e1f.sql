
-- 1) search_path fixo nas 3 funções faltantes
ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.log_project_note_activity() SET search_path = 'public';

-- 2) Funções SECURITY DEFINER usadas SOMENTE em triggers — revogar EXECUTE de todos os roles expostos via API.
-- Triggers chamam estas funções no contexto do trigger, não dependem de GRANT no role chamador.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'handle_new_user()',
    'log_atividade_card()',
    'log_atividade_comentario_post()',
    'log_atividade_demanda()',
    'log_atividade_comentario_demanda()',
    'log_atividade_anexo_demanda()',
    'liberar_dependencias_automaticas()',
    'log_project_note_activity()',
    'sync_card_pai_etapa_demanda()',
    'track_approval_status_card()',
    'track_approval_status_demanda()',
    'prevent_insert_aprovacao_demanda()',
    'prevent_insert_aprovacao_card()',
    'auto_liberar_proxima_etapa()',
    'log_atividade_reuniao_status()',
    'update_client_primary_status(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;

-- 3) Funções SECURITY DEFINER usadas em RLS policies — manter acessíveis a authenticated, revogar de anon/public.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'has_role(uuid, app_role)',
    'can_write(uuid)',
    'current_responsavel_id()',
    'marcar_demandas_atrasadas()',
    'marcar_cards_atrasados()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;
