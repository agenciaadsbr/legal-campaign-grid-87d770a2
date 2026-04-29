DO $$
DECLARE r RECORD; novo TEXT; chave TEXT; valor TEXT; rotulos jsonb;
BEGIN
  rotulos := jsonb_build_object(
    'resumo','Resumo geral do cliente',
    'nicho','Nicho / área de atuação',
    'servicos','Serviços prioritários',
    'publico','Público-alvo',
    'regiao','Região de atuação',
    'diferenciais','Diferenciais do cliente',
    'tom','Tom de comunicação',
    'dores','Principais dores do público',
    'estrategia','Estratégia inicial',
    'anuncios','Informações sobre anúncios',
    'posts','Informações sobre posts',
    'videos','Informações sobre vídeos',
    'lp','Informações sobre landing page',
    'ia','Informações sobre CRM / IA / atendimento',
    'observacoes','Observações importantes',
    'links_reuniao','Links da reunião',
    'materiais','Arquivos ou materiais complementares'
  );

  FOR r IN SELECT id, blocos FROM cliente_briefing LOOP
    -- Se já tem campo documento, pula
    IF (r.blocos ? 'documento') AND length(trim(coalesce(r.blocos->>'documento',''))) > 0 THEN
      CONTINUE;
    END IF;

    novo := '';
    FOR chave, valor IN SELECT * FROM jsonb_each_text(r.blocos) LOOP
      IF chave = 'documento' THEN CONTINUE; END IF;
      -- remove tags HTML simples
      valor := regexp_replace(coalesce(valor,''), '<[^>]+>', '', 'g');
      valor := trim(valor);
      IF length(valor) = 0 THEN CONTINUE; END IF;
      novo := novo || E'\n🔗 ' || coalesce(rotulos->>chave, chave) || E':\n' || valor || E'\n';
    END LOOP;

    IF length(trim(novo)) > 0 THEN
      UPDATE cliente_briefing
      SET blocos = jsonb_build_object('documento', trim(novo))
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;