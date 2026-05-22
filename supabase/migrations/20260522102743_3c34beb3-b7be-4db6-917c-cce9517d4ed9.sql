
-- Tabela principal de cadências
CREATE TABLE public.cadencias_operacionais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('aprovacao','recarga')),
  etapa_atual integer NOT NULL DEFAULT 1 CHECK (etapa_atual BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','aguardando_resposta','finalizada','sem_retorno','resolvida')),
  responsavel_id uuid,
  ultima_acao_em timestamptz,
  proxima_acao_em timestamptz,
  observacao text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cadops_cliente ON public.cadencias_operacionais(cliente_id);
CREATE INDEX idx_cadops_status ON public.cadencias_operacionais(status);

ALTER TABLE public.cadencias_operacionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_read_cadops ON public.cadencias_operacionais FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_cadops_insert ON public.cadencias_operacionais FOR INSERT TO authenticated WITH CHECK (can_write(auth.uid()));
CREATE POLICY rw_cadops_update ON public.cadencias_operacionais FOR UPDATE TO authenticated USING (can_write(auth.uid())) WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_cadops_delete ON public.cadencias_operacionais FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_cadops_updated BEFORE UPDATE ON public.cadencias_operacionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Execuções
CREATE TABLE public.cadencia_execucoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cadencia_id uuid NOT NULL REFERENCES public.cadencias_operacionais(id) ON DELETE CASCADE,
  etapa integer NOT NULL,
  acao text NOT NULL,
  executado_por uuid,
  executado_em timestamptz NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cadexec_cadencia ON public.cadencia_execucoes(cadencia_id);

ALTER TABLE public.cadencia_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_read_cadexec ON public.cadencia_execucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_cadexec_insert ON public.cadencia_execucoes FOR INSERT TO authenticated WITH CHECK (can_write(auth.uid()));
CREATE POLICY rw_cadexec_update ON public.cadencia_execucoes FOR UPDATE TO authenticated USING (can_write(auth.uid())) WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_cadexec_delete ON public.cadencia_execucoes FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Mensagens padrão
CREATE TABLE public.cadencia_mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('aprovacao','recarga')),
  etapa integer NOT NULL CHECK (etapa BETWEEN 1 AND 4),
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cadencia_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_read_cadmsg ON public.cadencia_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_cadmsg_insert ON public.cadencia_mensagens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY admin_cadmsg_update ON public.cadencia_mensagens FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY admin_cadmsg_delete ON public.cadencia_mensagens FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_cadmsg_updated BEFORE UPDATE ON public.cadencia_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds das mensagens padrão
INSERT INTO public.cadencia_mensagens (tipo, etapa, titulo, mensagem, ordem) VALUES
('aprovacao', 1, 'Mensagem no grupo', 'Olá! Passando para confirmar a aprovação do material enviado. Conseguem dar uma olhada hoje?', 1),
('aprovacao', 2, 'Mensagem no privado', 'Oi, tudo bem? Ainda estamos aguardando sua aprovação. Pode me dar um retorno?', 2),
('aprovacao', 3, 'Enviar áudio', 'Áudio reforçando o pedido de aprovação e explicando os próximos passos.', 3),
('aprovacao', 4, 'Ligação', 'Ligar para o cliente para entender o que está travando a aprovação.', 4),
('recarga', 1, 'Mensagem no grupo', 'Olá! O saldo da campanha está baixo. Conseguem fazer a recarga ainda hoje?', 1),
('recarga', 2, 'Mensagem no privado', 'Oi! Reforçando o aviso sobre a recarga. Pode me confirmar?', 2),
('recarga', 3, 'Enviar áudio', 'Áudio explicando o impacto da pausa por falta de saldo e pedindo a recarga.', 3),
('recarga', 4, 'Ligação', 'Ligar para o cliente para resolver a recarga.', 4);
