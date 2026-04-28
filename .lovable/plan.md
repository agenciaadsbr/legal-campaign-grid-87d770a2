## Objetivo

Transformar o **Projeto Completo** do cliente em um hub único de tarefas, onde:
- Existe **uma única base de tarefas** por cliente (a tabela `demandas` já existente).
- Cada tarefa tem uma **categoria** que define em qual aba ela aparece.
- O botão **"Adicionar Tarefa"** abre um único modal, já com o cliente atual fixado, e o usuário só escolhe a categoria + dados.
- Cada aba filtra exclusivamente pelas tarefas da sua categoria. Sem mistura entre áreas.

Escopo limitado a `/clientes/:clienteId` (Projeto Completo). Menu lateral, módulo Demandas global, dashboard e relatórios globais ficam intactos.

---

## 1. Categorias e mapeamento por aba

A tabela `demandas` tem o enum `demanda_categoria` com 7 valores. Vamos **adicionar 3 novos valores via migração** para representar limpamente as áreas pedidas:

```sql
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'IAAtendimento';
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'Briefing';
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'Planejamento';
```

Não criamos categoria nova de "Documentação" porque ela tem natureza diferente (links/credenciais, não tarefa) — vai para tabela própria (§5).

Mapeamento aba → filtro:

| Aba | Fonte | Filtro |
|---|---|---|
| Posts | `cards` (já existente) | `cliente_id` |
| Vídeos | `demandas` | `categoria = 'EditorVideo'` |
| Tráfego Pago | `demandas` | `categoria = 'TrafegoPago'` |
| Landing Page / Site | `demandas` | `categoria = 'LandingPage'` |
| IA / Atendimento | `demandas` | `categoria = 'IAAtendimento'` |
| Briefing | `demandas` | `categoria = 'Briefing'` |
| Planejamento | `demandas` | `categoria = 'Planejamento'` |
| Urgência / Outro | `demandas` | `categoria IN ('Suporte','Personalizado','Designer','Tecnologia')` ou `prioridade='Urgente'` |
| Documentação e Acessos | `cliente_documentacao` (nova) | `cliente_id` |

Atualizar `src/lib/demandas-categorias.ts` para incluir as novas categorias com label e subtipos:
- `IAAtendimento`: "Agente de IA", "CRM", "WhatsApp", "Automação", "Prompt", "Fluxo", "Integração"
- `Briefing`: "Reunião inicial", "Atualização", "Outro"
- `Planejamento`: "Mensal", "Trimestral", "Campanha", "Outro"
- Estender subtipos existentes em `EditorVideo`, `TrafegoPago`, `LandingPage` conforme as áreas operacionais (Meta Ads, Google Ads, Lovable, Wix, WordPress, Vídeo IA, etc.)

---

## 2. Nova estrutura de abas

Substituir as 6 abas atuais por **12 abas** na ordem:

`Visão Geral · Posts · Vídeos · Tráfego Pago · Landing Page / Site · IA / Atendimento · Documentação e Acessos · Briefing · Planejamento · Atividades · Responsáveis · Relatórios`

`TabsList` com `overflow-x-auto` para não quebrar.

---

## 3. Botão "Adicionar Tarefa" — fluxo único

O botão atual no header continua exatamente onde está. Mudanças no `NovaDemandaDialog`:

- **Cliente fixado**: receber `defaultClienteId` (já recebe) e **ocultar** o seletor de cliente quando vier preenchido.
- **Categoria proeminente**: o seletor de categoria vira o primeiro campo, com ícones e nomes amigáveis ("Post", "Vídeo", "Tráfego Pago", "LP/Site", "IA/Atendimento", "Briefing", "Planejamento", "Urgência/Outro").
- **Categoria "Post"**: caso especial — em vez de criar `demanda`, cria um `card` extra na tabela `cards` (mesmo fluxo do "+ Novo Post").
- Os demais campos (subtipo, responsáveis, prioridade, prazo, descrição) seguem como hoje, com subtipos atualizados conforme a categoria escolhida.
- Após salvar, fechar modal e mudar automaticamente para a aba correspondente à categoria criada (UX: usuário vê onde a tarefa apareceu).

Renomear o título do dialog de "Nova Demanda" para "Nova Tarefa".

---

## 4. Aba Visão Geral (compacta)

Substituir os 2 cards atuais por **grid de 9 cards compactos**, um por área:

Posts · Vídeos · Tráfego Pago · LP/Site · IA/Atendimento · Documentação · Briefing · Planejamento · Urgências/Outros

Cada card mostra:
- Ícone + nome da área
- Total · Pendentes · Atrasadas (mini-stats)
- `AvatarStack xs` dos responsáveis daquela área
- Botão "Ver detalhes" → muda para a aba correspondente (via state lifted ou `Tabs` controlado)

Layout: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3`, padding `p-3`. Sem kanbans aqui.

---

## 5. Abas operacionais (Vídeos, Tráfego, LP, IA, Briefing, Planejamento, Urgências)

Componente reutilizável **`AreaTab`** com props `{ titulo, icone, clienteId, demandas, categoriaPadrao, subtipos }`:

- Header: contadores Total/Pendentes/Atrasadas + botão **"+ Nova tarefa de [Área]"** (abre `NovaDemandaDialog` com `defaultCategoria` e `lockCategoria=true`)
- Filtros: subtipo (chips), responsável, status
- Visualização: `ProjetoKanban` com as demandas filtradas
- Click no card → `DemandaDetalheDialog` (já existente — comentários, status, prazo, prioridade, responsáveis, anexos, marcar como concluída)
- Estado vazio amigável

As 7 abas operacionais (exceto Posts e Documentação) reaproveitam esse componente.

---

## 6. Aba Posts

Mantém comportamento atual: `<PostsKanbanCliente />` com os 12 cards pré-criados (lógica de criação automática preservada). Adicionar botão **"+ Novo Post"** acima do kanban para criar cards extras.

Tarefas categorizadas como "Post" no modal "Adicionar Tarefa" caem aqui (criam `card`, não `demanda`).

---

## 7. Aba Documentação e Acessos (tabela nova)

Migração:

```sql
CREATE TABLE public.cliente_documentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  tipo text NOT NULL,           -- 'drive', 'site', 'lp', 'instagram', 'facebook', 'google_ads', 'meta_business', 'whatsapp', 'acesso', 'outro'
  titulo text NOT NULL,
  url text,
  login text,
  senha text,
  observacao text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_documentacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_doc ON public.cliente_documentacao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_doc_insert ON public.cliente_documentacao
  FOR INSERT TO authenticated WITH CHECK (can_write(auth.uid()));
CREATE POLICY rw_doc_update ON public.cliente_documentacao
  FOR UPDATE TO authenticated USING (can_write(auth.uid())) WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_doc_delete ON public.cliente_documentacao
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_doc
  BEFORE UPDATE ON public.cliente_documentacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

UI:
- Itens agrupados por `tipo` (Drive · Site · LP · Redes Sociais · Mídia Paga · WhatsApp · Acessos · Outros)
- Cada item: título · URL clicável · botão copiar · editar · excluir
- Botão "+ Adicionar item" → modal com campos tipo/título/url/login/senha/observação
- Senhas exibidas com toggle "mostrar/ocultar"
- Sem informação de plano (essa fica no cadastro do cliente)

Quando o usuário cria uma tarefa com categoria "Documentação e Acessos" no modal global, em vez de criar demanda, abre o mesmo modal de "Adicionar item de documentação".

---

## 8. Aba Atividades

Reaproveitar `TimelineAtividades`, mas o badge de origem passa a refletir a **categoria** quando a atividade vier de uma demanda:
- `[POST]` (laranja), `[VÍDEO]` (roxo), `[TRÁFEGO]` (verde), `[LP]` (azul), `[IA]` (ciano), `[BRIEFING]`, `[PLANEJAMENTO]`, `[DOC]`, `[URGÊNCIA]` (vermelho)

Para isso, ler `categoria` da demanda referenciada pela atividade (lookup no Map `demandas`).

---

## 9. Aba Responsáveis

Substituir as 2 seções por **8 seções** (uma por área operacional + Geral), cada uma derivando os responsáveis das tarefas filtradas daquela categoria. Sem fallback automático para "geral".

---

## 10. Aba Relatórios

Manter `RelatoriosTab` atual + adicionar **chips de filtro por área** no topo (Tudo / Posts / Vídeos / Tráfego / LP / IA / Briefing / Planejamento / Urgências). Métricas separadas: total / concluídas / pendentes / atrasadas por categoria.

---

## 11. Arquivos afetados

**Migração SQL** (única):
- ADD VALUE no enum `demanda_categoria` (×3)
- CREATE TABLE `cliente_documentacao` + RLS + trigger

**Editados:**
- `src/pages/ProjetoCliente.tsx` — 12 abas, `Tabs` controlado, Visão Geral compacta, integração com novas abas
- `src/components/demandas/NovaDemandaDialog.tsx` — esconde seletor de cliente quando fixado, categoria proeminente, props `lockCategoria`/`defaultCategoria`/`defaultSubtipo`, redireciona para `cards` quando categoria=Post, redireciona para modal de doc quando categoria=Documentação, troca título para "Nova Tarefa"
- `src/lib/demandas-categorias.ts` — adicionar `IAAtendimento`, `Briefing`, `Planejamento`, novos subtipos
- `src/store/demandas.ts` — tipos atualizados
- `src/integrations/supabase/types.ts` — regenerado automaticamente

**Criados:**
- `src/components/projeto/AreaTab.tsx` — kanban filtrado por categoria + botão criar
- `src/components/projeto/VisaoGeralCard.tsx` — card compacto com totais e "Ver detalhes"
- `src/components/projeto/DocumentacaoTab.tsx`
- `src/components/projeto/DocumentacaoItemDialog.tsx`
- `src/store/documentacao.ts` — Zustand + Supabase

---

## 12. Validação

1. Entrar em `/clientes` → clicar num cliente → abre direto Projeto Completo ✓
2. Conferir as 12 abas no topo
3. Visão Geral: 9 cards compactos, "Ver detalhes" navega para a aba certa
4. Botão "Adicionar Tarefa" abre modal com cliente já fixado (sem seletor)
5. Criar tarefa "Vídeo" → aparece **só** em Vídeos
6. Criar tarefa "Tráfego Pago" → aparece **só** em Tráfego Pago
7. Criar tarefa "Post" → aparece em Posts (como card extra)
8. Criar tarefa "Documentação" → abre modal de item de documentação, salva em `cliente_documentacao`
9. Posts: 12 cards pré-criados continuam funcionando + botão "+ Novo Post" ativo
10. Atividades: badges identificam categoria de origem
11. Responsáveis: 8 seções separadas, sem fallback
12. Relatórios: filtro por área funciona

---

## Restrições respeitadas

- Menu lateral: intacto
- Módulo Demandas global: intacto
- Dashboard global: intacto
- Sem duplicar clientes
- Sem deletar dados existentes (demandas atuais aparecem na aba conforme `categoria` atual; "Designer/Tecnologia/Suporte/Personalizado" caem em Urgências/Outros até serem recategorizadas manualmente)
