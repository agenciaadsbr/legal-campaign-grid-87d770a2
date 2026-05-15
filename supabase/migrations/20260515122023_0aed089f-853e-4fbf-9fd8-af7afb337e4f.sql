
-- Índices de apoio (idempotentes)
CREATE INDEX IF NOT EXISTS idx_cards_cliente_status ON public.cards (cliente_id, status);
CREATE INDEX IF NOT EXISTS idx_comentarios_cliente_created ON public.comentarios (cliente_id, created_at DESC);

-- View de métricas agregadas por cliente
CREATE OR REPLACE VIEW public.clientes_metricas
WITH (security_invoker = on) AS
SELECT
  c.id AS cliente_id,
  COUNT(*) FILTER (WHERE k.status = 'Atrasado')                                                AS posts_atrasados,
  COUNT(*) FILTER (WHERE k.data_limite_tarefa IS NOT NULL
                     AND k.data_limite_tarefa < CURRENT_DATE
                     AND k.status NOT IN ('Postado','Concluido','Entregue'))                  AS tarefas_atrasadas,
  COUNT(*) FILTER (WHERE k.is_urgent = true
                     AND k.status NOT IN ('Postado','Concluido','Entregue'))                  AS tarefas_urgentes,
  COUNT(*) FILTER (WHERE k.status IN ('Criar','Revisar','Agendar','Agendado'))                AS posts_pendentes,
  COUNT(*) FILTER (WHERE k.status = 'Postado')                                                AS posts_postados
FROM public.clientes c
LEFT JOIN public.cards k ON k.cliente_id = c.id
GROUP BY c.id;

-- View do último comentário por cliente
CREATE OR REPLACE VIEW public.clientes_ultimo_comentario
WITH (security_invoker = on) AS
SELECT DISTINCT ON (cliente_id)
  cliente_id,
  id            AS comentario_id,
  usuario_id,
  comentario_texto,
  created_at
FROM public.comentarios
WHERE cliente_id IS NOT NULL
ORDER BY cliente_id, created_at DESC;
