
# Reestruturar abas Documentação, Briefing e Planejamento (Projeto Completo)

## Visão geral

Hoje as três abas dependem do mesmo modal genérico de demanda (exceto Documentação, que já tem store própria mas estrutura limitada). O plano transforma cada aba numa interface dedicada:

- **Documentação e Acessos** → 6 blocos colapsáveis (Acessos, Links, Reuniões, Materiais Enviados, Documentos, Observações) + exportações.
- **Briefing** → editor estilo documento com modo leitura/edição + exportações.
- **Planejamento** → checklist operacional fixo (3 blocos) com situação do cliente, progresso e exportações.
- O botão **"Adicionar Tarefa"** no header passa a ser **contextual** por aba.

Escopo limitado a `ProjetoCliente.tsx`. Sem mudanças no menu, dashboard ou módulo Demandas externo.

---

## Mudanças por aba

### 1. Documentação e Acessos

Reaproveitar `cliente_documentacao` (já existe) expandindo o enum de tipos e a UI:

- 6 blocos colapsáveis (`Collapsible`) com cabeçalho mostrando contagem:
  1. **Acessos** (login/senha/url) — Gmail, Google Ads, Meta, Facebook, IG, GMN, WhatsApp, CRM/IA, Hospedagem, Domínio, Wix, WordPress, Lovable, Outro.
  2. **Links importantes** — Drive, Pasta, Site, LP, redes, Planilha.
  3. **Reuniões** — tipo (fechamento/start/briefing/alinhamento/performance), título, link gravação, data, resumo.
  4. **Materiais enviados ao cliente** — tipo, título, link, formato, data, enviado por, observação. Inclui "seeds" sugeridos: Material de Boas-Vindas, Treinamento Comercial (Loom), Script de Atendimento, Planilha de leads.
  5. **Documentos** — Briefing, Planejamento, Contrato, Materiais cliente/agência, Outros.
  6. **Observações** — texto livre por cliente (item único).
- Ações em cada item: editar inline, remover, copiar login/senha/link, abrir em nova aba.
- Botão **"+ Adicionar"** dentro de cada bloco (em vez de modal único).
- Botão **"Adicionar em lote"** por bloco — textarea para colar várias linhas (formato: `título | url | login | senha`).
- Busca interna + filtro por bloco/tipo no topo.
- **Exportações** (TXT/PDF/PNG) gerando layout pronto para envio ao cliente, conforme modelo do brief.

### 2. Briefing

Substituir o `AreaTab` atual (que usa demandas) por um documento por cliente:

- Visual de documento: título "Briefing — {cliente}", última atualização, responsável.
- 17 blocos pré-definidos (Resumo, Nicho, Serviços, Público, Região, Diferenciais, Tom, Dores, Estratégia, Anúncios, Posts, Vídeos, LP, CRM/IA, Observações, Links de reunião, Materiais).
- Cada bloco usa o `RichTextEditor` já existente no projeto.
- Modo **leitura** (renderiza com `RichTextView`) e **edição** (toggle).
- Botões: Editar, Salvar, Copiar tudo, Exportar TXT/PDF/PNG.
- Sem subtipo/prioridade/responsável de demanda.

### 3. Planejamento

Substituir o `AreaTab` por um checklist operacional. Estrutura **fixa em código** (3 blocos), itens **fixos por padrão** + permite adicionar/duplicar/reordenar/remover por cliente. Persistência por cliente em nova tabela.

**Blocos e itens iniciais:**

```text
Etapa 1 — Onboarding e Configuração
  Início do Projeto
    - Reunião de Start do Projeto
    - Análise das informações coletadas
    - Criação e envio do planejamento
    - Envio do material de boas-vindas       (link p/ Documentação)
    - Envio do vídeo de treinamento comercial (link p/ Documentação)
    - Envio do script de atendimento
  Estratégia
    - Análise de mercado (palavras-chave)
  Estrutura de Presença
    - Página do Facebook
    - Instagram

Campanhas — Meta Ads + Google Ads
  Estrutura Meta Ads
    - Criação da BM
    - Anúncios em imagem
    - Anúncios em vídeo com IA
    - Roteiros para vídeos gravados
    - Ativação das campanhas no Meta
  Estrutura Google
    - Criação do Gmail
    - Criação do Google Ads
    - Gestão / Criação do Google Meu Negócio
  Estrutura Web
    - Criação da Landing Page
    - Configuração de domínio e hospedagem
  Configurações Técnicas
    - Configurações técnicas (WhatsApp, pixel, pagamentos)
    - Configuração CRM / Agente de IA
  Campanhas Google Ads
    - Definição da estrutura (palavras-chave, títulos, descrições)
    - Ativação das campanhas no Google Ads
  Gestão e Otimização
    - Envio semanal de relatório
    - Análise e otimização

Conteúdo
  Social Media
    - Construção dos Posts (Feed Instagram)
```

**Por item:** título, descrição, status (pendente/em_andamento/concluido/atrasado), situação (precisa_criar/ja_possui/nao_aplicavel), responsável, prazo, prioridade, observação, ordem.

**Regras de progresso:**
- `nao_aplicavel` é ignorado.
- `ja_possui` não conta como atraso e pode ser marcado concluído.
- % conclusão = concluídos / (total − não_aplicavel).
- Métricas exibidas no topo: % • barra • total • concluídos • pendentes • atrasados • já_possui • não_aplicável.

**UX:** blocos colapsáveis, edição inline (sem modal pequeno), drag-to-reorder, duplicar item, adicionar item em qualquer bloco, item destacado em vermelho quando atrasado.

**Exportações:** TXT, PDF e PNG — ocultam campo "situação", mostram só tarefas + status + progresso, layout limpo.

### 4. Botão "Adicionar Tarefa" contextual

Em `ProjetoCliente.tsx`, o botão do header muda label e ação conforme `tab`:

| Aba | Label | Ação |
|---|---|---|
| documentacao | "Adicionar documentação" | abre seletor de bloco + form |
| briefing | "Editar briefing" | entra em modo edição |
| planejamento | "Adicionar item" | abre form inline + seletor de bloco |
| demais (posts, vídeos, tráfego, lp, ia, urgências) | "Adicionar Tarefa" | comportamento atual (NovaDemandaDialog) |

---

## Detalhes técnicos

### Banco (migration)

1. Adicionar campos opcionais a `cliente_documentacao` (sem quebrar dados):
   - `bloco text` (acessos | links | reunioes | materiais | documentos | observacoes) — default `'documentos'`, backfill por `tipo`.
   - `data_evento date null` (reuniões/materiais).
   - `enviado_por uuid null`.
   - `formato text null`.
   - Estender enum/aceitar mais valores em `tipo` (campo já é text — só adicionar labels no front).

2. Nova tabela `cliente_briefing`:
   ```text
   id uuid pk, cliente_id uuid, blocos jsonb default '{}', 
   atualizado_por uuid, created_at, updated_at
   ```
   `blocos` guarda `{ resumo: "<html>", nicho: "<html>", ... }`. Um registro por cliente.

3. Nova tabela `cliente_planejamento_itens`:
   ```text
   id uuid pk, cliente_id uuid, bloco text, secao text,
   titulo text, descricao text, status text, situacao text,
   responsavel_id uuid null, prazo date null, prioridade text,
   observacao text, ordem int, created_at, updated_at
   ```
   Seed automático: ao abrir aba pela 1ª vez por cliente, inserir os itens fixos listados acima (idempotente via flag `cliente.planejamento_inicializado` ou check de existência).

4. RLS em todas seguindo o padrão do projeto: SELECT `true`, INSERT/UPDATE `can_write(auth.uid())`, DELETE `has_role(... 'admin')`.

### Frontend — novos arquivos

```text
src/store/briefing.ts                    # zustand + supabase
src/store/planejamento.ts                # zustand + supabase + seed
src/components/projeto/
  DocumentacaoBlocos.tsx                 # nova UI por blocos
  DocumentacaoBlocoCard.tsx
  DocumentacaoLoteDialog.tsx
  DocumentacaoExport.ts                  # gera TXT/PDF/PNG
  BriefingTab.tsx                        # editor doc
  BriefingExport.ts
  PlanejamentoTab.tsx                    # checklist
  PlanejamentoItem.tsx
  PlanejamentoProgresso.tsx
  PlanejamentoExport.ts
```

### Frontend — arquivos editados

- `src/pages/ProjetoCliente.tsx` — trocar `AreaTab` por `BriefingTab` e `PlanejamentoTab`; tornar botão "Adicionar Tarefa" contextual; trocar `DocumentacaoTab` por `DocumentacaoBlocos`.
- `src/store/documentacao.ts` — adicionar campo `bloco` e mapeamento.
- `src/components/projeto/VisaoGeralCard.tsx` — usar contagens do novo planejamento (substitui contagem de demanda categoria=Planejamento).

### Bibliotecas para exportação

- **TXT** — string nativo + `Blob`.
- **PDF** — `jspdf` (já é leve, sem dependência de servidor).
- **PNG** — `html-to-image` (gera imagem de um nó React).

Adicionar via `bun add jspdf html-to-image`.

### Categorias `Briefing` e `Planejamento` em demandas

Ficam coexistindo (não removo o enum no banco, evita migration destrutiva). A aba apenas deixa de listá-las. Demandas legadas continuam visíveis em "Atividades"/"Relatórios".

---

## Fora de escopo

- Não altero menu lateral, Dashboard, módulo Demandas externo.
- Não removo o enum `Briefing`/`Planejamento` em `demanda_categoria`.
- Compartilhamento por link público fica para uma fase 2 (exporta arquivo agora).
- Conexão automática "material de boas-vindas" ↔ planejamento será apenas via link manual exibido no item (botão "Abrir em Documentação"); sincronização de status fica fase 2.

---

## Ordem de implementação

1. Migrations (3 alterações + seed function).
2. Stores `briefing` e `planejamento` + extensão do `documentacao`.
3. Componentes da aba Planejamento (maior impacto operacional).
4. Componentes da aba Briefing.
5. Refatorar Documentação para blocos.
6. Botão contextual no header.
7. Exportações TXT/PDF/PNG nas três abas.
8. Ajustar `VisaoGeralCard` para usar contagem do novo planejamento.
