UPDATE public.operational_templates
SET ativo = false, updated_at = now()
WHERE ativo = true
  AND (
    nome ILIKE 'Configuração Google Ads%'
    OR nome ILIKE 'Configuração Meta Ads%'
    OR nome ILIKE 'Instalação de Pixel%'
    OR nome ILIKE 'Criação de Landing Page%'
    OR nome ILIKE 'Configuração CRM%'
    OR nome ILIKE 'Configuração CRM / Atendimento IA%'
    OR nome ILIKE 'Atendimento IA%'
    OR nome ILIKE 'Anúncio IA - Tema 1%'
    OR nome ILIKE 'Anúncio I.A. - Tema 1%'
    OR nome ILIKE 'Anúncio imagem - Tema 1%'
  );