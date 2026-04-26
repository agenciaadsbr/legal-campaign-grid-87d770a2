
# Plano — Módulo Demandas (aditivo, não-destrutivo)

Princípio orientador: **não modificar nada que já funciona**. Tudo novo é adicionado em arquivos próprios. Onde precisamos tocar arquivos existentes (sidebar, App.tsx, Dashboard, Relatórios, Alertas), a alteração será apenas **acrescentar itens/abas**, sem remover ou refatorar o que está lá.

---

## 1. Banco de dados (migration nova, nenhuma tabela existente alterada)

Criar 4 tabelas novas + tipos enum dedicados ao módulo:

- `demanda_status` enum: `Planejamento | Criar | Revisar | Entregue | Concluido | Atrasado`
- `demanda_prioridade` enum: `Baixa | Media | Alta | Urgente`
- `demanda_categoria` enum: `Designer | EditorVideo | LandingPage | TrafegoPago | Tecnologia | Suporte | Personalizado`

Tabelas:

- `demandas` — `id, cliente_id (uuid, ref clientes.id por valor, sem FK rígida para seguir o padrão atual do projeto), titulo, categoria, subtipo (text), descricao, status, prioridade, responsavel_id, criado_por (auth.uid), data_limite, data_inicio, data_conclusao, precisa_aprovacao bool, aprovado_por uuid, created_at, updated_at`
- `comentarios_demandas` — `id, demanda_id, usuario_id (auth.uid), texto, imagem_url, created_at`
- `anexos_demandas` — `id, demanda_id, nome, url, mime, size, created_at`
- `historico_demandas` — `id, demanda_id, usuario_id, acao (text), de_status, para_status, payload jsonb, created_at`

RLS (espelhando o padrão atual do projeto):
- SELECT: `authenticated` true para `demandas`, `comentarios_demandas`, `anexos_demandas`, `historico_demandas` — *exceto*: usuário padrão só vê demandas onde `responsavel_id = auth.uid()` OR `criado_por = auth.uid()`. Admin vê tudo via `has_role(auth.uid(), 'admin')`.
- INSERT/UPDATE: `can_write(auth.uid())` para demandas/anexos/histórico; comentários só pelo próprio usuário (`auth.uid() = usuario_id`).
- DELETE: somente admin.

Triggers:
- `set_updated_at` em `demandas`.
- `auto_marcar_demanda_atrasada`: BEFORE INSERT/UPDATE — se `data_limite < now()` e `status NOT IN ('Concluido','Entregue')` → `status = 'Atrasado'`.
- `log_historico_demanda`: AFTER INSERT/UPDATE em `demandas` registra mudança de status / responsável em `historico_demandas`.

Função utilitária `marcar_demandas_atrasadas()` (igual padrão de `marcar_cards_atrasados`).

Nada nas tabelas `clientes`, `cards`, `posts`, `contratos`, `alertas`, `responsaveis`, `profiles` será modificado.

## 2. Store (arquivo novo)

Criar `src/store/demandas.ts` (Zustand independente, **sem** mexer em `src/store/crm.ts`):
- Tipos: `Demanda`, `ComentarioDemanda`, `AnexoDemanda`, `HistoricoDemanda`, enums.
- Hook `useDemandas()` + `useDemandasBootstrap()` que carrega via Supabase e assina realtime nas 4 tabelas.
- Ações: `createDemanda`, `createDemandaRapida`, `updateDemanda`, `moveStatus`, `assign`, `addComentarioDemanda`, `addAnexoDemanda`, `requestApproval`, `approveDemanda`, `deleteDemanda` (admin).
- Reaproveita `clientes` e `responsaveis` lendo do `useCRM()` — clientes ficam **únicos**, sem duplicação.

## 3. Rotas e menu (alterações pontuais aditivas)

- `src/App.tsx`: adicionar `<Route path="/demandas" element={<Demandas />} />` (e `/demandas/:id` opcional para tela interna). Demais rotas inalteradas.
- `src/components/AppSidebar.tsx`: inserir um item `{ title: "Demandas", url: "/demandas", icon: ListChecks }` entre Contratos e Alertas. Nenhum outro item alterado.

## 4. Tela `/demandas` (arquivos novos)

`src/pages/Demandas.tsx` com `Tabs` reutilizando o padrão visual atual (cards, bordas, tipografia, tokens semânticos):

Abas:
1. **Quadro Geral** — Kanban próprio (componente novo `DemandasKanban`) com colunas Planejamento / Criar / Revisar / Entregue / Concluído / Atrasado; drag-and-drop com `@dnd-kit` (já presente). Filtros superiores: cliente, responsável, categoria, prioridade, status, hoje, atrasadas, semana.
2. **Minhas Demandas** — lista filtrada por `responsavel_id = auth.uid()`.
3. **Novas Solicitações** — fila de demandas com status `Planejamento` ou criadas nas últimas 48h, para triagem.
4. **Calendário** — grid mensal usando `react-day-picker` (já presente) marcando `data_limite`.
5. **Relatórios** — embute o painel de relatórios de demandas (ver §7).

Componentes novos (em `src/components/demandas/`):
- `DemandCard.tsx` — card próprio, **não** reutiliza o componente de post. Mostra título, cliente, categoria/subtipo, responsável (avatar), data limite, prioridade (badge `Urgente` quando aplicável), status.
- `DemandasKanban.tsx`
- `NovaDemandaDialog.tsx` — campos: cliente, título, categoria, subtipo (lista dependente da categoria, ver §5), responsável, prioridade, data limite, descrição, anexos (bucket `anexos` já existe).
- `DemandaRapidaDialog.tsx` — cliente, título, responsável, data limite.
- `DemandaDetalheDialog.tsx` — topo (título/cliente/categoria/responsável/status/prioridade/data limite) + abas internas: Atividade, Arquivos, Comentários, Histórico.
- `FiltrosDemandas.tsx`.

## 5. Categorias e subtipos

Hardcoded em `src/lib/demandas-categorias.ts` (mapa categoria → subtipos), exatamente conforme a lista do briefing (Designer, Editor de Vídeo, Landing Page, Tráfego Pago, Tecnologia, Suporte, Personalizado/Outro). Subtipo livre quando categoria = Personalizado.

## 6. Permissões

Aplicadas em duas camadas:
- **RLS** (servidor) conforme §1.
- **UI**: `useAuth().roles` — admin/superadmin vê todos os botões (criar/editar/reatribuir/aprovar/relatórios gerais). Usuário padrão vê apenas suas demandas, pode mudar status próprio, comentar, anexar, solicitar revisão, marcar como concluído (entra em estado `Entregue` aguardando aprovação se `precisa_aprovacao = true`).

## 7. Dashboard, Relatórios e Alertas (apenas adições)

- **`src/pages/Dashboard.tsx`**: ao final da página, **adicionar** uma seção `<section>` titulada "Demandas Operacionais" com 5 KPIs (Abertas, Urgentes, Atrasadas, Em revisão, Concluídas hoje). Os KPIs e gráficos atuais permanecem intactos acima.
- **`src/pages/Relatorios.tsx`**: **envolver** o conteúdo atual em uma `Tabs` adicionando abas `Geral | Posts | Demandas | Por Cliente | Por Responsável`. A aba **Posts** recebe exatamente o JSX atual sem modificações na lógica. Abas novas exibem gráficos calculados a partir do store `useDemandas` (criadas no período, concluídas, atrasadas, por responsável, por categoria, gargalos por status).
- **`src/pages/Alertas.tsx`**: estender a lista derivada para incluir alertas de demandas (urgente sem responsável, atrasada, aguardando aprovação > 24h). Cada item recebe um badge `[POST]` ou `[DEMANDA]` no início da mensagem. A lógica atual de alertas de posts permanece igual.

## 8. Realtime e regra de atraso

- Job leve no `useDemandasBootstrap` chama `marcar_demandas_atrasadas()` ao montar e em foco da janela.
- Trigger BEFORE garante consistência mesmo sem o job.
- Regra **só** afeta tabela `demandas` — `cards`/`posts` continuam usando `auto_marcar_atrasado` original.

## 9. Verificação pós-implementação

Após o build, validar manualmente que continuam funcionando:
- `/` Dashboard (KPIs e gráficos antigos visíveis e corretos).
- `/clientes` (Kanban, grupos Revisar/Criar fixos, ações editar/excluir).
- `/clientes/:id`, `/clientes/:id/posts/:postId`.
- `/contratos`, `/alertas` (alertas de posts ainda aparecem), `/relatorios` (aba Posts = visual original), `/configuracoes`.

## Resumo de arquivos

**Novos:**
- migration SQL (4 tabelas + enums + triggers + função)
- `src/store/demandas.ts`
- `src/lib/demandas-categorias.ts`
- `src/pages/Demandas.tsx`
- `src/components/demandas/{DemandCard,DemandasKanban,NovaDemandaDialog,DemandaRapidaDialog,DemandaDetalheDialog,FiltrosDemandas,RelatoriosDemandas,DashboardDemandasSection,AlertasDemandas}.tsx`

**Editados (apenas adições):**
- `src/App.tsx` (1 rota)
- `src/components/AppSidebar.tsx` (1 item de menu)
- `src/pages/Dashboard.tsx` (1 seção ao final)
- `src/pages/Relatorios.tsx` (envolver em Tabs preservando JSX atual na aba Posts)
- `src/pages/Alertas.tsx` (incluir alertas derivados de demandas com badge `[DEMANDA]`)

Nenhum componente, store, tabela, política RLS, rota ou regra existente é removido, renomeado ou reescrito.
