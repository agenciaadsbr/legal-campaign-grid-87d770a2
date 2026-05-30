# Dash Tasks

Sistema interno de gestão operacional da ADS BR — tarefas, clientes, reuniões, onboarding, posts, campanhas e rotinas centralizadas em uma única plataforma.

## Visão Geral

O **Dash Tasks** é uma plataforma web interna que centraliza toda a operação da agência. Foi desenhado para reduzir perda de informações entre times, organizar tarefas por cliente / responsável / área / status e oferecer gestão operacional em tempo real, com indicadores claros de carga, prazos e ativações.

## Objetivo do Sistema

- Centralizar a operação da agência em um único ambiente.
- Reduzir perda de contexto entre times (atendimento, criação, tráfego, IA).
- Organizar tarefas por cliente, responsável, área e status.
- Acompanhar prazos, atrasos, ativações e renovações.
- Documentar reuniões e gerar delegações operacionais a partir delas.
- Padronizar fluxos repetitivos (onboarding, ativação Meta Ads, ativação Google Ads).

## Principais Módulos

Disponíveis no menu lateral:

- **Dashboard** — visão geral consolidada da operação.
- **Central de Tarefas** — minhas tarefas, tarefas sugeridas, delegação de reunião, cadências operacionais.
- **Central de Reuniões** — cadastro, análise e delegação de reuniões.
- **Clientes** — lista de clientes e acesso ao Projeto Completo.
- **Criar Tarefa** — entrada rápida de tarefas.
- **Contratos** — controle contratual.
- **Alertas** — alertas críticos da operação.
- **Relatórios** — relatórios consolidados (posts, demandas, clientes).
- **Aulas** — base de conteúdo interno e treinamentos.
- **Configurações** — administração do sistema.

## Configurações

Abas disponíveis em **Configurações**:

- Meu perfil
- Aparência
- Equipe & Acessos
- Demandas
- Documentos
- Responsabilidades
- IA
- Delegação
- Estruturas automáticas
- Documentação do Sistema (README e backup)

## Funcionalidades por Módulo

### Dashboard
- Visão geral dos clientes.
- Indicadores de posts e demandas internas.
- Gráficos de status e carga.
- Status dos clientes (donut).
- Carga por responsável.
- Alertas recentes.
- Renovações próximas.
- Visão por colaborador.

### Central de Tarefas
- Tarefas individuais (Minhas Tarefas).
- Filtros por cliente, área, status e período.
- Tarefas sugeridas.
- Delegação de reunião.
- Cadências operacionais.
- Coluna de status, prioridade, prazo, entrada no status, dias no status e cadência.
- Conclusão de tarefas com diálogo dedicado.

### Cadências Operacionais
- Controle de aprovações e recargas.
- Etapas de follow-up:
  - Dia 1 — mensagem no grupo.
  - Dia 2 — mensagem no privado.
  - Dia 3 — áudio.
  - Dia 4 — encaminhamento / ação final.
- Mensagens padrão por etapa.
- Registro de data e hora de cada interação.
- Status da cadência por cliente.

### Central de Reuniões
- Cadastro de reuniões.
- Vínculo com cliente.
- Tipo / contexto da reunião.
- Link TLDV.
- Responsável e temperatura do cliente.
- Transcrição, resumo cliente e resumo operacional.
- Observações.
- Delegação interna a partir da reunião.
- Pós-reunião e status de análise.
- Confirmação de delegação.

### Clientes / Projeto Completo
Abas internas do Projeto Completo:
- Visão geral, Posts, Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Operacional, Urgências, Acessos/Links/Materiais, Reuniões, Briefing, Planejamento, Atividades, Relatórios e Observações.

### Posts
- Criação de ciclo de posts e cards por semana.
- Responsáveis distintos para **criação** e **postagem**.
- Datas: início, limite da criação, data de postagem.
- Status: Criar / Aguardando aprovação / Agendar / Postado.
- Ações em massa: definir datas, atribuir responsáveis, alterar status, excluir selecionados.

### Vídeos
- Tarefas de vídeo, edição, responsáveis, status, anexos, briefing e workflow.

### Tráfego Pago
- Demandas de campanhas (Meta Ads e Google Ads), criativos, ativação, otimização e acompanhamento.

### LP / Site
- Landing pages, domínio, hospedagem, ajustes, formulário, links e aprovação.

### IA / Atendimento
- CRM, agente de IA, automações, WhatsApp, integrações e scripts.

### Operacional
- Estrutura operacional baseada em **Card Pai**.
- Etapas do processo, templates, onboarding.
- Ativação Meta Ads e Google Ads.
- Tarefas dependentes e desbloqueio automático de etapas.

### Urgências
- Demandas urgentes, prioridade e controle de prazo.

### Relatórios
- Visão geral, posts, demandas e clientes.
- Indicadores reais com filtros por período.
- Exportação CSV.

### Alertas
- Alertas de tarefas, atrasos, onboarding, aprovação e críticos.

### Aulas
- Área de conteúdo interno, treinamentos e materiais de apoio.

## Card Pai

Conceito de processo multi-etapas:
- Um **Card Pai** agrupa etapas filhas em sequência.
- Etapas podem ter dependências e bloqueios.
- Liberação automática conforme conclusão das anteriores.
- Responsáveis padrão configuráveis por etapa.
- Usado, entre outros, em **Ativação Meta Ads** e **Ativação Google Ads**.

### Modelo: Ativar campanha Meta Ads
1. Criar anúncio de imagem.
2. Criar / editar anúncio em vídeo.
3. Aguardando aprovação do cliente.
4. Ativar campanha Meta Ads.

### Modelo: Ativar campanha Google Ads
1. Criar landing page.
2. Aprovação interna da landing page.
3. Aguardando aprovação do cliente.
4. Configurar domínio e hospedagem.
5. Configurar tags, pixel e conversões.
6. Ativar campanha Google Ads.

## Central de Ativação / Onboarding

- Contagem regressiva de ativação (prazo padrão 30 dias).
- Clientes em onboarding e ativações em risco.
- Clientes travados.
- SLA operacional e responsáveis.
- Alertas por responsável.
- Etapas atrasadas e previsão de ativação.

## Regras de Negócio

- Um post só é considerado **postado** quando possui **data de postagem válida**.
- **Data limite** não deve ser tratada como data de postagem.
- **Responsável pela criação** e **responsável pela postagem** são pessoas distintas e exibidas conforme a etapa atual do card.
- Tarefas excluídas refletem em todo o sistema.
- Reuniões realizadas devem ser analisadas e ter status de pós-reunião.
- Usuários externos **não podem** criar conta (cadastro público desabilitado).
- Recuperação de senha apenas para usuários **cadastrados e ativos**.
- Admin / Super Admin podem alterar a senha de usuários cadastrados.
- A leitura do resumo da reunião é registrada ao clicar em **"Ver resumo da reunião"**.
- Datas de tarefas usam o timezone **America/Sao_Paulo**.

## Permissões e Usuários

Papéis:
- **super_admin** — acesso total, inclusive backup e configuração crítica.
- **admin** — administração da operação e equipe.
- **editor** — edição operacional padrão.
- **viewer** — apenas leitura.

Equipe & Acessos:
- Convite, ativação, inativação e vínculo com responsável da operação.
- Contas inativas não podem logar nem recuperar senha.

## Autenticação

- **Supabase Auth** (e-mail + senha).
- Login centralizado em `/auth`.
- Recuperação de senha restrita a usuários cadastrados e ativos via edge function `password-reset-request`.
- Alteração de senha pelo próprio usuário em **Meu perfil** (com reautenticação).
- Alteração de senha por admin via edge function `admin-update-user`.
- Domínio customizado: `https://dashtasks.com.br`.
- Redirect URLs configurados no Supabase.

## Integrações

- **Supabase** — banco, auth, storage e edge functions.
- **Lovable** — ambiente de build e deploy.
- **Domínio customizado** — `dashtasks.com.br`.
- **TLDV** — links de reuniões.
- **Lovable AI Gateway** — IA interna (resumos, geração de tarefas, consultas).
- Integrações opcionais previstas: Google Ads, Meta Ads, WhatsApp / CRM.

## Estrutura Técnica

### Stack
- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS v3 + shadcn/ui.
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions Deno).
- **IA:** Lovable AI Gateway.

### Estrutura de pastas (resumo)
```
src/
  components/    # UI por domínio (clientes, demandas, reunioes, tarefas, ...)
  hooks/         # useAuth, useCRM e utilitários
  lib/           # utilitários (timezone, workflow, statusDisplay, ...)
  pages/         # rotas principais
  store/         # camadas de acesso a dados (Supabase)
  integrations/  # cliente Supabase tipado
public/          # estáticos
supabase/
  functions/     # edge functions (admin-*, password-reset-request, ia-*)
  config.toml    # configuração das functions
```

### Rotas principais
`/`, `/auth`, `/dashboard`, `/clientes`, `/clientes/:id`, `/demandas`, `/minhas-tarefas`, `/criar-tarefa`, `/reunioes`, `/contratos`, `/alertas`, `/relatorios`, `/aulas`, `/configuracoes`.

## Variáveis de Ambiente

Apenas os **nomes**, sem valores reais:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Secrets de Edge Functions (configuradas em Lovable Cloud / Supabase):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
LOVABLE_API_KEY
```

> **Nunca** versionar `.env` com valores reais. Nunca expor `SERVICE_ROLE_KEY` em código cliente.

## Como Rodar Localmente

```bash
# 1. Instalar dependências
bun install

# 2. Criar .env com as variáveis acima

# 3. Rodar em desenvolvimento
bun run dev

# 4. Build de produção
bun run build

# 5. Preview do build
bun run preview
```

## Deploy

- Deploy gerenciado pelo **Lovable**.
- Domínio customizado: `dashtasks.com.br` (configurado no Lovable + DNS).
- No Supabase, **URL Configuration** deve conter:
  - Site URL: `https://dashtasks.com.br`
  - Additional Redirect URLs: `https://dashtasks.com.br/**`, preview do Lovable.
- Cuidado ao alterar redirects: pode quebrar login e recuperação de senha.

## Backup

A aba **Configurações → Documentação do Sistema** oferece:

1. **Baixar README.md** — exporta este arquivo.
2. **Baixar backup do código-fonte** — gera `dash-tasks-backup-YYYY-MM-DD.zip` com `src/`, `public/`, `supabase/`, `package.json`, `README.md` e arquivos de configuração necessários.
3. Backup **não inclui**: `node_modules/`, `.env*`, `dist/`, caches, logs, tokens, secrets ou dados de banco.
4. Apenas **admin** e **super_admin** visualizam e executam o backup.

Para backup externo recomenda-se também versionar o repositório no GitHub.

## Segurança

- Não versionar `.env`.
- Não expor senhas, API keys ou tokens em código cliente.
- Não exportar `SERVICE_ROLE_KEY` em backups.
- Não compartilhar backups que contenham dados sensíveis de clientes.
- RLS habilitada nas tabelas sensíveis do Supabase.
- Autorização sensível (alterar senha de outro usuário, convidar) é feita **server-side** em edge functions com checagem de papel.
