
-- =====================================================
-- Tabela: documentos_globais (templates da empresa)
-- =====================================================
CREATE TABLE public.documentos_globais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escopo text NOT NULL DEFAULT 'cliente', -- 'cliente' | 'interno'
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'material',
  bloco text NOT NULL DEFAULT 'materiais', -- acessos|links|reunioes|materiais|documentos
  categoria text NOT NULL DEFAULT 'Outros',
  descricao text,
  url text,
  arquivo_url text,
  login text,
  senha text,
  observacao_interna text,
  aplicar_automatico boolean NOT NULL DEFAULT true,
  permissao_acesso text NOT NULL DEFAULT 'todos', -- 'todos' | 'admin'
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_globais ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_documentos_globais
  ON public.documentos_globais
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_insert_documentos_globais
  ON public.documentos_globais
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY admin_update_documentos_globais
  ON public.documentos_globais
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY admin_delete_documentos_globais
  ON public.documentos_globais
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_documentos_globais_updated_at
  BEFORE UPDATE ON public.documentos_globais
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_documentos_globais_escopo_ativo
  ON public.documentos_globais (escopo, ativo, ordem);

-- =====================================================
-- Extensão da cliente_documentacao
-- =====================================================
ALTER TABLE public.cliente_documentacao
  ADD COLUMN IF NOT EXISTS origem_global_id uuid NULL,
  ADD COLUMN IF NOT EXISTS enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_envio timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_cliente_documentacao_origem
  ON public.cliente_documentacao (cliente_id, origem_global_id);
