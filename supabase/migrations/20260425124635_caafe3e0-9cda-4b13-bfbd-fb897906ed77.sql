
-- Seed de status_options (apenas se vazio)
INSERT INTO public.status_options (label, cor)
SELECT v.label, v.cor
FROM (VALUES
  ('Ativo', '#10b981'),
  ('Pausado', '#f59e0b'),
  ('Próximo da renovação', '#06b6d4'),
  ('Finalizado', '#6b7280')
) AS v(label, cor)
WHERE NOT EXISTS (SELECT 1 FROM public.status_options);

-- Seed de colunas_cliente (apenas se vazio)
INSERT INTO public.colunas_cliente (key, label, tipo, ordem, oculta, fixada, largura, fixa, opcoes)
SELECT v.key, v.label, v.tipo::tipo_coluna, v.ordem, false, v.fixada, v.largura, v.fixa, '[]'::jsonb
FROM (VALUES
  ('nome_cliente',      'Nome do Cliente',     'texto',         0, true,  200, true),
  ('responsaveis',      'Responsáveis',        'responsaveis',  1, false, 110, true),
  ('ultimo_comentario', 'Últimos Comentários', 'texto',         2, false, 260, false),
  ('nicho',             'Nicho',               'dropdown',      3, false, 130, false),
  ('periodo_contrato',  'Período do Contrato', 'texto',         4, false, 150, true),
  ('posts',             'Posts',               'texto',         5, false, 130, true),
  ('observacoes',       'Observações',         'texto',         6, false, 200, false)
) AS v(key, label, tipo, ordem, fixada, largura, fixa)
WHERE NOT EXISTS (SELECT 1 FROM public.colunas_cliente);

-- Habilita Realtime nas tabelas principais
ALTER TABLE public.clientes      REPLICA IDENTITY FULL;
ALTER TABLE public.contratos     REPLICA IDENTITY FULL;
ALTER TABLE public.cards         REPLICA IDENTITY FULL;
ALTER TABLE public.posts         REPLICA IDENTITY FULL;
ALTER TABLE public.comentarios   REPLICA IDENTITY FULL;
ALTER TABLE public.alertas       REPLICA IDENTITY FULL;
ALTER TABLE public.colunas_cliente REPLICA IDENTITY FULL;
ALTER TABLE public.status_options  REPLICA IDENTITY FULL;
ALTER TABLE public.nichos          REPLICA IDENTITY FULL;
ALTER TABLE public.responsaveis    REPLICA IDENTITY FULL;
ALTER TABLE public.custom_fields   REPLICA IDENTITY FULL;
ALTER TABLE public.modelos_colunas REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes','contratos','cards','posts','comentarios','alertas',
    'colunas_cliente','status_options','nichos','responsaveis',
    'custom_fields','modelos_colunas'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
