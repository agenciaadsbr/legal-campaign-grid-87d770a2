
-- ============================================
-- DELETE restrito a admin (conteúdo)
-- ============================================
DROP POLICY IF EXISTS rw_clientes_delete ON public.clientes;
CREATE POLICY admin_clientes_delete ON public.clientes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS rw_contratos_delete ON public.contratos;
CREATE POLICY admin_contratos_delete ON public.contratos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS rw_cards_delete ON public.cards;
CREATE POLICY admin_cards_delete ON public.cards
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS rw_posts_delete ON public.posts;
CREATE POLICY admin_posts_delete ON public.posts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS rw_alertas_delete ON public.alertas;
CREATE POLICY admin_alertas_delete ON public.alertas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Tabelas estruturais: apenas admin pode mutar
-- ============================================

-- custom_fields
DROP POLICY IF EXISTS rw_custom_fields_insert ON public.custom_fields;
DROP POLICY IF EXISTS rw_custom_fields_update ON public.custom_fields;
DROP POLICY IF EXISTS rw_custom_fields_delete ON public.custom_fields;
CREATE POLICY admin_custom_fields_insert ON public.custom_fields
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_custom_fields_update ON public.custom_fields
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_custom_fields_delete ON public.custom_fields
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- colunas_cliente
DROP POLICY IF EXISTS rw_colunas_cliente_insert ON public.colunas_cliente;
DROP POLICY IF EXISTS rw_colunas_cliente_update ON public.colunas_cliente;
DROP POLICY IF EXISTS rw_colunas_cliente_delete ON public.colunas_cliente;
CREATE POLICY admin_colunas_cliente_insert ON public.colunas_cliente
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_colunas_cliente_update ON public.colunas_cliente
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_colunas_cliente_delete ON public.colunas_cliente
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- modelos_colunas
DROP POLICY IF EXISTS rw_modelos_colunas_insert ON public.modelos_colunas;
DROP POLICY IF EXISTS rw_modelos_colunas_update ON public.modelos_colunas;
DROP POLICY IF EXISTS rw_modelos_colunas_delete ON public.modelos_colunas;
CREATE POLICY admin_modelos_colunas_insert ON public.modelos_colunas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_modelos_colunas_update ON public.modelos_colunas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_modelos_colunas_delete ON public.modelos_colunas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- status_options
DROP POLICY IF EXISTS rw_status_options_insert ON public.status_options;
DROP POLICY IF EXISTS rw_status_options_update ON public.status_options;
DROP POLICY IF EXISTS rw_status_options_delete ON public.status_options;
CREATE POLICY admin_status_options_insert ON public.status_options
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_status_options_update ON public.status_options
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_status_options_delete ON public.status_options
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- nichos
DROP POLICY IF EXISTS rw_nichos_insert ON public.nichos;
DROP POLICY IF EXISTS rw_nichos_update ON public.nichos;
DROP POLICY IF EXISTS rw_nichos_delete ON public.nichos;
CREATE POLICY admin_nichos_insert ON public.nichos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_nichos_update ON public.nichos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_nichos_delete ON public.nichos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- responsaveis
DROP POLICY IF EXISTS rw_responsaveis_insert ON public.responsaveis;
DROP POLICY IF EXISTS rw_responsaveis_update ON public.responsaveis;
DROP POLICY IF EXISTS rw_responsaveis_delete ON public.responsaveis;
CREATE POLICY admin_responsaveis_insert ON public.responsaveis
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_responsaveis_update ON public.responsaveis
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_responsaveis_delete ON public.responsaveis
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
