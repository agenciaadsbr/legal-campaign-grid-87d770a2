DO $$
DECLARE
  r RECORD;
  msg TEXT;
  item RECORD;
BEGIN
  FOR r IN SELECT DISTINCT cliente_id FROM public.cliente_documentacao WHERE bloco='acessos'
  LOOP
    msg := '';
    FOR item IN
      SELECT * FROM public.cliente_documentacao
      WHERE cliente_id = r.cliente_id AND bloco='acessos'
      ORDER BY ordem, created_at
    LOOP
      -- Se já for tipo mensagem, mantém o conteúdo da observação
      IF item.tipo = 'mensagem' THEN
        IF item.observacao IS NOT NULL AND length(trim(item.observacao)) > 0 THEN
          msg := msg || E'\n' || item.observacao || E'\n';
        END IF;
      ELSE
        msg := msg || E'\n🔗 ' || COALESCE(NULLIF(trim(item.titulo), ''), 'Acesso') || E':\n';
        IF item.url IS NOT NULL AND length(trim(item.url)) > 0 THEN
          msg := msg || trim(item.url) || E'\n';
        END IF;
        IF item.login IS NOT NULL AND length(trim(item.login)) > 0 THEN
          msg := msg || 'Login: ' || trim(item.login) || E'\n';
        END IF;
        IF item.senha IS NOT NULL AND length(trim(item.senha)) > 0 THEN
          msg := msg || 'Senha: ' || trim(item.senha) || E'\n';
        END IF;
        IF item.observacao IS NOT NULL AND length(trim(item.observacao)) > 0 THEN
          msg := msg || trim(item.observacao) || E'\n';
        END IF;
      END IF;
    END LOOP;

    IF length(trim(msg)) > 0 THEN
      -- Apaga TODOS os antigos do bloco acessos desse cliente
      DELETE FROM public.cliente_documentacao
      WHERE cliente_id = r.cliente_id AND bloco='acessos';

      -- Insere o novo item único do tipo mensagem
      INSERT INTO public.cliente_documentacao (cliente_id, bloco, tipo, titulo, observacao, ordem)
      VALUES (r.cliente_id, 'acessos', 'mensagem', 'Mensagem de acessos', trim(msg), 0);
    END IF;
  END LOOP;
END $$;