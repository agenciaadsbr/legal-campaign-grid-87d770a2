# CRM Jurídico — Plano de Construção

> Observação: o projeto atual está vazio (placeholder). Os screenshots enviados serão usados como **referência visual**. Vamos construir tudo seguindo a arquitetura correta desde o início, sem módulos legados de "Posts" ou "Kanban Geral".

---

## 1. Layout & Navegação

- **Sidebar fixa** (shadcn Sidebar, recolhível para ícones) com logo "CRM Jurídico":
  Dashboard · Clientes · Contratos · Alertas · Responsáveis · Campos Personalizados · Relatórios · Configurações
- Header com toggle da sidebar, sino de alertas (badge com contagem) e toggle dark/light.
- Footer da sidebar com email do usuário (placeholder por enquanto, sem auth).
- Tema claro/escuro persistente, paleta azul primário + neutros (igual aos prints).

## 2. Fluxo aninhado obrigatório

Rotas refletem a hierarquia:
- `/` → Dashboard
- `/clientes` → tabela dinâmica
- `/clientes/:clienteId` → **Kanban exclusivo do cliente** (abas Quadro / Atividade)
- `/clientes/:clienteId/posts/:postId` → **Detalhes do Post**
- `/contratos`, `/alertas`, `/responsaveis`, `/campos-personalizados`, `/relatorios`, `/configuracoes`

Breadcrumb sempre visível: `Clientes › Seu José › Post Mês 1 - Semana 1`.
**Não existirão** páginas separadas de Posts ou Kanban Geral.

## 3. Tela Clientes — Tabela dinâmica avançada

Estilo ClickUp/Airtable, com:
- Agrupamento por Status (linhas colapsáveis com badge colorido — ex: REVISADO 0).
- Busca por nome, paginação + lazy loading (suporta 100+ clientes).
- Scroll horizontal e vertical, colunas redimensionáveis, arrastáveis, ocultáveis, fixáveis, ordenáveis.
- Botão **Colunas** abre painel "Gerenciar Colunas": adicionar / editar / excluir / ocultar / reordenar (drag) / mudar cor / definir tipo. Colunas fixas (Nome, Status, Responsáveis) não podem ser removidas.
- Botão **+ Novo Cliente** abre formulário com Nome, Nicho, Responsáveis (multi-select com avatar, permite criar novo na hora), Status, Data Início, Data Fim, Observações.

**Colunas padrão**: Nome do Cliente, Responsáveis (multi + avatar), Últimos Comentários (auto), Nicho (dropdown), Status Cliente (dropdown), Data Início, Data Fim, Observações.

**Tipos de coluna disponíveis**: Texto, Número, Data, Dropdown (com opções coloridas), Responsáveis, Link, Status, Etiqueta colorida.

**Ao salvar novo cliente** dispara automação 1 (ver §7).

## 4. Kanban do Cliente

Aberto ao clicar no nome do cliente. Cabeçalho com nome, status (Ativo/etc.), nicho e contador "X/12 postados". Abas **Quadro** e **Atividade** (timeline de comentários e mudanças).

Colunas fixas: **Criar Conteúdo · Revisar · Agendar · Postado · Renovação** (drag-and-drop entre colunas atualiza `status_card`).

Filtro "Mostrar cards: Todos / Mês 1 / Mês 2 / Mês 3".

Cada **card** mostra: Título, Mês · Semana, avatares dos responsáveis, badge de status.

## 5. Detalhe do Post

Aberto ao clicar no card. Layout dos prints:
- Bloco superior: Status (dropdown colorido), Título, Data de agendamento, Data de postagem, Link do Meta.
- Bloco **Anexos** com "+ Adicionar anexo" (upload no bucket).
- Bloco **Legenda** (textarea grande).
- Bloco **Atividade**: histórico + comentários (texto + upload de imagem + botão Enviar). O **último comentário** é replicado na coluna "Últimos Comentários" do cliente.

## 6. Demais módulos

- **Contratos**: tabela Cliente · Status · Progresso (barra X/12) · Início · Fim. Gerada automaticamente ao criar cliente.
- **Alertas**: abas Pendentes / Histórico, colunas Tipo (badge colorido) · Cliente · Data · Mensagem · botão Resolver.
- **Responsáveis**: lista com nome, avatar, cor, permissão (admin/editor/viewer — campo informativo enquanto não há auth). CRUD completo.
- **Campos Personalizados**: lista global de campos custom aplicáveis a Clientes ou Posts (Texto, Número, Data, Dropdown, Link).
- **Relatórios**: gráficos de Posts por mês, Carga por responsável, Funil de status.
- **Configurações**: tema, opções de status do cliente, nichos, cores.
- **Dashboard**: 6 cards de KPI (Clientes ativos, Posts hoje, Agendados, Postados, Renovação, Alertas) + gráfico de Posts por mês + gráfico de Carga por responsável.

## 7. Banco de dados (Lovable Cloud / Supabase)

Tabelas:
- `clientes` (id, nome_cliente, nicho, status_cliente, data_inicio_contrato, data_fim_contrato, responsaveis uuid[], observacoes, ultimo_comentario, created_at)
- `contratos` (id, cliente_id, status, data_inicio, data_fim, total_posts, posts_concluidos)
- `cards` (id, cliente_id, titulo_card, mes_referencia, numero_semana, status_card, responsaveis uuid[], created_at)
- `posts` (id, card_id, titulo_post, descricao, data_agendamento, data_postagem, link_post, status, created_at)
- `comentarios` (id, post_id nullable, cliente_id nullable, usuario_id, comentario_texto, imagem_url, created_at)
- `alertas` (id, cliente_id, tipo_alerta, data_alerta, status, mensagem, created_at)
- `responsaveis` (id, nome, avatar_url, cor, permissao, email)
- `custom_fields` (id, escopo: 'cliente'|'post', nome, tipo, opcoes jsonb, ordem, cor)
- `custom_field_values` (id, field_id, entity_id, valor jsonb)
- `column_config` (id, escopo, key, label, tipo, ordem, oculta, fixada, cor, largura) — persiste config da tabela dinâmica

**RLS**: dado "sem auth agora", políticas serão **públicas (read/write para anon)**. ⚠️ Aviso explícito: qualquer pessoa com a URL pode ler/editar dados. Recomendo ativar auth antes de subir para produção.

**Storage**: bucket público `comentarios-imagens` para anexos e imagens de comentário.

## 8. Automações (modelo híbrido)

1. **Trigger SQL `AFTER INSERT` em `clientes`** → cria contrato + 12 cards (Mês 1-3 × Semana 1-4) com status `Criar` + 1 post em cada (status `Criar`, título "Post Mês X - Semana Y").
2. **Edge Function agendada (cron diário)**:
   - Para todo contrato com `data_fim - 7 dias = hoje` e sem alerta ativo → cria alerta `Renovacao` com mensagem "Contrato de {cliente} termina em 7 dias".
   - Verifica clientes com 12 posts em status `Postado` → atualiza `status_cliente = 'Próximo da renovação'` e cria alerta `Posts_Pendentes`/`Contrato_Finalizando` conforme regras.
3. **Trigger SQL `AFTER INSERT` em `comentarios`** → atualiza `clientes.ultimo_comentario` (concatena nome + trecho do texto + data).
4. **Trigger SQL em `posts`** quando `status = 'Postado'` → incrementa `contratos.posts_concluidos`; quando chega a 12 dispara a regra acima.

## 9. Performance

- Paginação server-side (range Supabase) na tabela de Clientes (50/página).
- Lazy loading de cards do Kanban por mês.
- React Query com cache + invalidations cirúrgicas após mutations.
- Índices em `cards.cliente_id`, `posts.card_id`, `comentarios.post_id`, `alertas.cliente_id`, `contratos.data_fim`.
- Realtime opcional (Supabase channels) só na tela aberta para evitar over-fetch.

## 10. Entregáveis desta primeira iteração

- Sidebar + tema + todas as rotas montadas.
- Schema Supabase completo + triggers + edge function de cron + bucket.
- Tela Clientes funcional (tabela dinâmica com agrupamento, gerenciar colunas, novo cliente disparando automação).
- Kanban do cliente com drag-and-drop entre colunas.
- Tela Detalhe do Post com comentários + anexos.
- Dashboard com KPIs reais e 1 gráfico (Posts por mês).
- Contratos, Alertas, Responsáveis em versão funcional.
- Campos Personalizados, Relatórios e Configurações em estrutura inicial (extensíveis).

⚠️ **Avisos que serão dados ao implementar**:
- Sem autenticação → dados acessíveis publicamente.
- Edge Function de cron exige agendamento manual no painel após criada.
