
-- ============================
-- 1) Tabelas de motivos (badges)
-- ============================
CREATE TABLE IF NOT EXISTS public.status_motivo_cliente_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_motivo_cliente_custom TO authenticated;
GRANT ALL ON public.status_motivo_cliente_custom TO service_role;

ALTER TABLE public.status_motivo_cliente_custom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_status_motivo_cliente ON public.status_motivo_cliente_custom;
CREATE POLICY auth_read_status_motivo_cliente ON public.status_motivo_cliente_custom
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS rw_status_motivo_cliente_insert ON public.status_motivo_cliente_custom;
CREATE POLICY rw_status_motivo_cliente_insert ON public.status_motivo_cliente_custom
  FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS rw_status_motivo_cliente_update ON public.status_motivo_cliente_custom;
CREATE POLICY rw_status_motivo_cliente_update ON public.status_motivo_cliente_custom
  FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS admin_status_motivo_cliente_delete ON public.status_motivo_cliente_custom;
CREATE POLICY admin_status_motivo_cliente_delete ON public.status_motivo_cliente_custom
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.status_motivo_interno_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_motivo_interno_custom TO authenticated;
GRANT ALL ON public.status_motivo_interno_custom TO service_role;

ALTER TABLE public.status_motivo_interno_custom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_status_motivo_interno ON public.status_motivo_interno_custom;
CREATE POLICY auth_read_status_motivo_interno ON public.status_motivo_interno_custom
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS rw_status_motivo_interno_insert ON public.status_motivo_interno_custom;
CREATE POLICY rw_status_motivo_interno_insert ON public.status_motivo_interno_custom
  FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS rw_status_motivo_interno_update ON public.status_motivo_interno_custom;
CREATE POLICY rw_status_motivo_interno_update ON public.status_motivo_interno_custom
  FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS admin_status_motivo_interno_delete ON public.status_motivo_interno_custom;
CREATE POLICY admin_status_motivo_interno_delete ON public.status_motivo_interno_custom
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seeds iniciais
INSERT INTO public.status_motivo_cliente_custom (label, ordem) VALUES
  ('Enviar acesso do Instagram', 10),
  ('Enviar acesso do Facebook', 20),
  ('Enviar acesso do Gmail', 30),
  ('Enviar acesso do Google Ads', 40),
  ('Enviar acesso do Meta Business', 50),
  ('Enviar acesso do Google Meu Negócio', 60),
  ('Confirmar número do WhatsApp', 70),
  ('Comprar domínio', 80),
  ('Comprar hospedagem', 90),
  ('Enviar logo', 100),
  ('Enviar fotos', 110),
  ('Enviar documentos', 120),
  ('Enviar dados da empresa', 130),
  ('Enviar dados do escritório', 140),
  ('Enviar briefing', 150),
  ('Enviar link do site', 160),
  ('Confirmar dados da landing page', 170),
  ('Autorizar configuração', 180),
  ('Responder alinhamento', 190),
  ('Validar informações', 200),
  ('Aprovar orçamento', 210)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.status_motivo_interno_custom (label, ordem) VALUES
  ('Configuração de domínio', 10),
  ('Configuração de hospedagem', 20),
  ('Criação de landing page', 30),
  ('Ajuste na landing page', 40),
  ('Criação de criativos', 50),
  ('Revisão de criativos', 60),
  ('Revisão do gestor', 70),
  ('Configuração de conta', 80),
  ('Configuração de campanha', 90),
  ('Validação interna', 100),
  ('Ajuste técnico', 110),
  ('Organização do CRM', 120),
  ('Configuração de IA', 130),
  ('Configuração de WhatsApp', 140),
  ('Configuração de formulário', 150),
  ('Ajuste no site', 160),
  ('Etapa anterior da equipe', 170)
ON CONFLICT (label) DO NOTHING;

-- ============================
-- 2) Generalizar track_approval_status_demanda
-- ============================
CREATE OR REPLACE FUNCTION public.track_approval_status_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dias int;
  v_old_monitored boolean;
  v_new_monitored boolean;
BEGIN
  v_old_monitored := OLD.status::text IN ('Revisar','Aguardando aprovação do cliente','Aguardando ação do cliente','Aguardando etapa interna','Aguardando etapa anterior');
  v_new_monitored := NEW.status::text IN ('Revisar','Aguardando aprovação do cliente','Aguardando ação do cliente','Aguardando etapa interna','Aguardando etapa anterior');

  IF v_new_monitored AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.approval_waiting_since := now();
    NEW.approval_waiting_by := auth.uid();
    NEW.approval_previous_status := OLD.status::text;
    BEGIN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'demanda', 'status_espera_entrou', NEW.id, auth.uid(),
              'Tarefa entrou em "' || NEW.status::text || '"',
              jsonb_build_object('titulo', NEW.titulo, 'de', OLD.status, 'para', NEW.status));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSIF v_old_monitored AND NOT v_new_monitored AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF OLD.approval_waiting_since IS NOT NULL THEN
      v_dias := GREATEST(0, floor(EXTRACT(EPOCH FROM (now() - OLD.approval_waiting_since)) / 86400)::int);
    ELSE
      v_dias := 0;
    END IF;
    BEGIN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'demanda', 'status_espera_saiu', NEW.id, auth.uid(),
              'Tarefa saiu de "' || OLD.status::text || '" após ' || v_dias || ' dia(s).',
              jsonb_build_object('titulo', NEW.titulo, 'para', NEW.status, 'dias', v_dias));
    EXCEPTION WHEN OTHERS THEN NULL; END;
    NEW.approval_waiting_since := NULL;
    NEW.approval_waiting_by := NULL;
    NEW.approval_previous_status := NULL;
    NEW.status_motivo := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================
-- 3) Corrigir auto_marcar_demanda_atrasada (24h grace + novos status excluidos)
-- ============================
CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.data_limite IS NOT NULL
     AND NEW.data_limite < now()
     AND NEW.status::text NOT IN ('Concluido','Entregue','Atrasado','Revisar','Aguardando aprovação do cliente','Aguardando ação do cliente','Aguardando etapa interna','Aguardando etapa anterior','Agendado','Postado')
     AND (NEW.created_at IS NULL OR now() - NEW.created_at >= interval '24 hours')
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = NEW.id AND td.liberado = false
     ) THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================
-- 4) Corrigir marcar_demandas_atrasadas (job batch)
-- ============================
CREATE OR REPLACE FUNCTION public.marcar_demandas_atrasadas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.demandas d
     SET status = 'Atrasado'
   WHERE d.status::text NOT IN ('Concluido','Entregue','Atrasado','Revisar','Aguardando aprovação do cliente','Aguardando ação do cliente','Aguardando etapa interna','Aguardando etapa anterior','Agendado','Postado')
     AND d.data_limite IS NOT NULL
     AND d.data_limite < now()
     AND (d.created_at IS NULL OR now() - d.created_at >= interval '24 hours')
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = d.id AND td.liberado = false
     );
$function$;
