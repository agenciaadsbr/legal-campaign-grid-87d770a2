
INSERT INTO public.operational_templates (nome, ordem, prioridade, status_inicial)
VALUES
  ('Criar Drive e Acessos', 10, 'Media', 'Criar'),
  ('Enviar Script de Atendimento', 20, 'Media', 'Criar'),
  ('Auditoria', 30, 'Media', 'Criar'),
  ('Criar Página Facebook', 40, 'Media', 'Criar'),
  ('Criar Gmail e Google Ads', 50, 'Media', 'Criar'),
  ('Criar Instagram e BM', 60, 'Media', 'Criar'),
  ('Enviar Roteiros', 70, 'Media', 'Criar'),
  ('Criar LP', 80, 'Media', 'Criar'),
  ('Configurar Lovable', 90, 'Media', 'Criar'),
  ('Criar CRM / Agente IA', 100, 'Media', 'Criar'),
  ('Ativar CP Meta Ads', 110, 'Media', 'Criar'),
  ('Ativar CP Google Ads', 120, 'Media', 'Criar'),
  ('Criação / Gestão GMN', 130, 'Media', 'Criar'),
  ('Agendar Reunião Performance', 140, 'Media', 'Criar')
ON CONFLICT DO NOTHING;
