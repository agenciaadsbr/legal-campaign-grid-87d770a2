## Objetivo

Eliminar a tela intermediária (Kanban simples do cliente) em **Clientes/Posts**. Ao clicar num cliente, abrir direto a tela **Projeto Completo**, com as abas reorganizadas e a Visão Geral exibindo apenas os painéis-resumo de Posts e Demandas Diárias lado a lado.

## Mudanças de navegação

1. **Rota `/clientes/:clienteId`** (`src/App.tsx`): trocar o componente de `ClienteDetalhe` para `ProjetoCliente`. A rota `/clientes/:clienteId/projeto` continua funcionando (mesmo componente) para compatibilidade com links existentes (`Contratos.tsx`, `Alertas.tsx`, `ClientesGeralTable.tsx`, `Clientes.tsx`).
2. **`ClienteDetalhe.tsx`**: deixar o arquivo no projeto (sem deletar, conforme pedido), mas remover do roteamento principal. Não fica mais acessível a partir do clique no cliente.
3. Os links existentes que apontam para `/clientes/${id}` agora abrem direto o Projeto Completo — sem alterações nas tabelas.

## Ajustes na tela Projeto Completo (`src/pages/ProjetoCliente.tsx`)

### Breadcrumb
- Atualizar para: `Clientes / {Nome do Cliente} / Projeto Completo`.
- Remover o botão "Voltar" que ia para `/clientes/:id` (rota antiga). "Voltar" passa a ir para `/clientes`.

### Aba "Visão Geral" — simplificar
A versão atual da Visão Geral repete o Kanban de Posts, o Kanban de Demandas e a Timeline. Reduzir para **apenas o resumo executivo**:

- Manter os 2 cards lado a lado (`grid md:grid-cols-2`) já existentes:
  - **Painel Posts**: Total / Pendentes / Atrasados + AvatarStack dos responsáveis dos posts.
  - **Painel Demandas Diárias**: Total / Pendentes / Atrasadas + AvatarStack dos responsáveis das demandas.
- **Remover** desta aba: a seção `Posts` (PostsKanbanCliente), a seção `Demandas Diárias` (ProjetoKanban) e a seção `Atividades` (TimelineAtividades). Esses conteúdos passam a viver exclusivamente nas suas próprias abas.

### Aba "Posts"
- Substituir o card placeholder atual ("Abrir Kanban de Posts" + ResumoPosts) pelo **Kanban completo do cliente**: renderizar `<PostsKanbanCliente />` diretamente, que já traz filtros, busca, meses, responsáveis e colunas (Planejamento, Criar, Revisar, Agendado, Postado, Atrasado).
- Remover o botão "Abrir Kanban de Posts" (não há mais para onde ir).

### Aba "Demandas"
- Mantém como está hoje (`DemandasTab` com `ProjetoKanban` + botão Nova Demanda + dialogs).

### Aba "Atividades"
- Mantém `AtividadesTab` (linha do tempo já consolida posts e demandas com identificação de origem via `AcaoIcone`).

### Aba "Responsáveis" e "Relatórios"
- Sem alteração.

## Separação de dados (já correta, apenas garantir)

- **Posts**: `cards.filter(c => c.cliente_id === id)` e `c.responsaveis`.
- **Demandas**: `demandas.filter(d => d.cliente_id === id)` e `getResponsaveisIds(d)`.
- Nenhuma mistura entre os dois conjuntos. `cliente.responsaveis` continua só informativo.

## Detalhes técnicos

Arquivos a editar:
- `src/App.tsx` — trocar componente da rota `/clientes/:clienteId` para `ProjetoCliente`; manter import de `ClienteDetalhe` removido (ou deixar não usado). Manter rota `/clientes/:clienteId/projeto` apontando para `ProjetoCliente`.
- `src/pages/ProjetoCliente.tsx`:
  - Breadcrumb: remover botão Voltar antigo / ajustar texto para "Projeto Completo".
  - `VisaoGeral`: deletar as 3 `<section>` extras (Posts kanban, Demandas kanban, Atividades) e os imports/estado relacionados que ficarem órfãos (`novaDemandaOpen`, `demandaSelecionada`, `NovaDemandaDialog`, `DemandaDetalheDialog`, `ProjetoKanban`, `PostsKanbanCliente`, `TimelineAtividades` se não usados em outro lugar do componente). `TimelineAtividades` continua sendo usada por `AtividadesTab`, então mantém.
  - Aba `posts`: substituir conteúdo por `<PostsKanbanCliente />`. Remover `ResumoPosts` se não for reutilizado.

Sem mudanças em banco de dados, stores, ou dados de posts/demandas/atividades.

## Validação manual

1. Em `/clientes`, clicar num cliente → abre direto `/clientes/:id` renderizando Projeto Completo.
2. Não aparece mais o botão "Ver projeto completo".
3. Aba Visão Geral mostra só os 2 painéis-resumo lado a lado.
4. Aba Posts mostra o Kanban completo de posts.
5. Aba Demandas mostra apenas o Kanban de demandas diárias.
6. Aba Atividades mostra a timeline.
7. Responsáveis de Posts e Demandas seguem separados.
8. Links em `/contratos`, `/alertas` e tabela "Geral" continuam funcionando (vão direto para Projeto Completo).
