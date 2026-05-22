-- 1) Adicionar coluna setor (nullable = "Geral"/fallback)
ALTER TABLE public.cadencia_mensagens
  ADD COLUMN IF NOT EXISTS setor text;

CREATE INDEX IF NOT EXISTS idx_cadencia_mensagens_tipo_setor_etapa
  ON public.cadencia_mensagens (tipo, setor, etapa);

-- 2) Inserir mensagens padrão por setor (somente se ainda não existir aquela combinação)
DO $$
DECLARE
  r record;
  msgs jsonb := '[
    {"tipo":"aprovacao","setor":"videos","etapa":1,"titulo":"Dia 1 — Enviou mensagem no grupo","mensagem":"Olá! Passando para confirmar a aprovação dos vídeos enviados no grupo.\n\nAssim que tivermos seu retorno, conseguimos seguir com as próximas etapas do projeto e liberar os materiais para o time de tráfego pago ativar as suas campanhas."},
    {"tipo":"aprovacao","setor":"videos","etapa":2,"titulo":"Dia 2 — Enviou mensagem no privado","mensagem":"Oi, tudo bem? Ainda estamos aguardando a aprovação dos vídeos enviados.\n\nEnquanto essa etapa não avança, ficamos limitados para finalizar novos materiais e também para liberar as campanhas para ativação dos seus anúncios e otimização. Se puder nos dar um retorno hoje, mesmo que seja com ajustes, já conseguimos destravar o fluxo por aqui e seguir com o seu projeto."},
    {"tipo":"aprovacao","setor":"videos","etapa":3,"titulo":"Dia 3 — Enviou áudio","mensagem":"Olá! Estou passando para reforçar sobre os vídeos enviados para aprovação.\n\nHoje essa etapa é muito importante, porque o time de tráfego depende dessa validação para seguir com as campanhas de tráfego pago e otimizações. Assim que tivermos seu retorno, conseguimos avançar rapidamente nas próximas etapas do seu projeto."},
    {"tipo":"aprovacao","setor":"videos","etapa":4,"titulo":"Dia 4 — Fez ligação","mensagem":"Olá! Tentei contato rapidamente para entender se houve alguma dificuldade na aprovação dos vídeos ou se existe algum ajuste que possamos fazer para avançarmos.\n\nSe preferir, podemos alinhar rapidamente por áudio ou ligação para facilitar esse processo e fazer o seu projeto prosseguir normalmente."},

    {"tipo":"aprovacao","setor":"imagens_anuncios","etapa":1,"titulo":"Dia 1 — Enviou mensagem no grupo","mensagem":"Olá! Passando para confirmar a aprovação das imagens para anúncios enviadas no grupo.\n\nAssim que tivermos seu retorno, conseguimos liberar os materiais para ativação das campanhas de tráfego pago."},
    {"tipo":"aprovacao","setor":"imagens_anuncios","etapa":2,"titulo":"Dia 2 — Enviou mensagem no privado","mensagem":"Oi, tudo bem? Ainda estamos aguardando a aprovação das imagens para anúncios enviadas.\n\nSem essa validação, o time fica limitado para subir novos anúncios, validar as campanhas, seguir com as próximas entregas do projeto e avançar na captação de clientes. Se puder nos retornar hoje, conseguimos avançar por aqui."},
    {"tipo":"aprovacao","setor":"imagens_anuncios","etapa":3,"titulo":"Dia 3 — Enviou áudio","mensagem":"Olá! Passando para reforçar sobre as imagens para anúncios enviadas para aprovação.\n\nEssa validação é importante porque impacta diretamente na ativação das campanhas de tráfego pago e na velocidade das próximas etapas do seu projeto."},
    {"tipo":"aprovacao","setor":"imagens_anuncios","etapa":4,"titulo":"Dia 4 — Fez ligação","mensagem":"Oi! Entrei em contato rapidamente para entender se houve alguma dificuldade na aprovação das imagens para anúncios enviadas no grupo.\n\nSe precisar de ajustes ou quiser alinhar algo rapidamente, podemos resolver por áudio ou ligação."},

    {"tipo":"aprovacao","setor":"landing_page","etapa":1,"titulo":"Dia 1 — Enviou mensagem no grupo","mensagem":"Olá! Passando para confirmar a aprovação da landing page enviada no grupo.\n\nAssim que tivermos seu retorno, conseguimos seguir com a conclusão do seu projeto e com a ativação das campanhas de tráfego pago no Google Ads."},
    {"tipo":"aprovacao","setor":"landing_page","etapa":2,"titulo":"Dia 2 — Enviou mensagem no privado","mensagem":"Oi, tudo bem? Ainda estamos aguardando sua aprovação da landing page enviada no grupo.\n\nEnquanto essa etapa não avança, ficamos travados em outras etapas do projeto, como configuração de domínio e hospedagem, integrações e ativação das campanhas de tráfego pago no Google Ads para que seu projeto prossiga com a captação de clientes."},
    {"tipo":"aprovacao","setor":"landing_page","etapa":3,"titulo":"Dia 3 — Enviou áudio","mensagem":"Olá! Estou reforçando sobre a aprovação da landing page enviada no grupo.\n\nEssa etapa é fundamental para concluirmos sua landing page e permitir que o restante da operação avance, como configuração de domínio e hospedagem, instalação de tags de rastreamento, pixel e ativação da campanha de tráfego pago."},
    {"tipo":"aprovacao","setor":"landing_page","etapa":4,"titulo":"Dia 4 — Fez ligação","mensagem":"Olá! Tentei contato para entender se houve alguma dificuldade na aprovação da landing page ou se existe algum ajuste que possamos alinhar rapidamente.\n\nSe preferir, podemos resolver isso por áudio ou ligação."},

    {"tipo":"aprovacao","setor":"trafego_pago","etapa":1,"titulo":"Dia 1 — Enviou mensagem no grupo","mensagem":"Olá! Passando para confirmar a aprovação pendente para conseguirmos avançar com a ativação e otimização das campanhas de tráfego pago no Meta Ads e/ou Google Ads."},
    {"tipo":"aprovacao","setor":"trafego_pago","etapa":2,"titulo":"Dia 2 — Enviou mensagem no privado","mensagem":"Oi, tudo bem? Ainda estamos aguardando seu retorno para seguirmos com as campanhas de tráfego pago no Meta Ads e/ou Google Ads.\n\nEnquanto essa etapa não avança, o time de tráfego fica limitado para iniciar otimizações, manter o projeto em andamento e buscar novos resultados na captação de clientes."},
    {"tipo":"aprovacao","setor":"trafego_pago","etapa":3,"titulo":"Dia 3 — Enviou áudio","mensagem":"Olá! Estou reforçando sobre a aprovação pendente para conseguirmos seguir com as campanhas.\n\nHoje essa validação é essencial para destravarmos sua captação de leads através do tráfego pago, avançarmos com possíveis fechamentos de contratos e seguirmos com as otimizações."},
    {"tipo":"aprovacao","setor":"trafego_pago","etapa":4,"titulo":"Dia 4 — Fez ligação","mensagem":"Olá! Tentei contato rapidamente para entender se existe alguma dúvida ou dificuldade na aprovação pendente.\n\nSe preferir, podemos alinhar rapidamente por áudio ou ligação para facilitar."}
  ]'::jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(msgs) AS x(item)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.cadencia_mensagens
      WHERE tipo = (r.item->>'tipo')
        AND setor IS NOT DISTINCT FROM (r.item->>'setor')
        AND etapa = (r.item->>'etapa')::int
    ) THEN
      INSERT INTO public.cadencia_mensagens (tipo, setor, etapa, titulo, mensagem, ativo, ordem)
      VALUES (
        r.item->>'tipo',
        r.item->>'setor',
        (r.item->>'etapa')::int,
        r.item->>'titulo',
        r.item->>'mensagem',
        true,
        0
      );
    END IF;
  END LOOP;
END $$;