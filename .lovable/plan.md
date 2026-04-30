# Métricas comparativas no painel geral de Clientes

Foco: trazer para a tabela geral as **métricas que só fazem sentido comparando clientes lado a lado** — coisas que hoje obrigam a entrar em cada projeto pra descobrir, e que são exatamente o que dá visão de gestão de carteira.

## Princípio

Tudo que é "olhar um cliente em profundidade" continua dentro do Projeto Completo. O painel geral vira uma **tela de triagem**: em 5 segundos você sabe quem precisa de atenção, quem está saudável, quem está rendendo mais e quem está esfriando.

## Mudanças na tabela

### 1. Remover coluna "Responsáveis" como coluna fixa
Vira um stack de avatares pequeno (`xs`, max 2) **colado ao nome do cliente**. Continua clicável (popover do `CelulaResponsaveis` para reatribuir). Libera espaço sem perder a funcionalidade.

### 2. Nova coluna: "Saúde" (consolidada)
Um único pill colorido que resume tudo:
- 🟢 **Ok** — sem atrasos, contrato ativo, onboarding em dia
- 🟡 **Atenção** — 1+ demanda atrasada OU contrato vencendo em ≤30 dias OU sem atividade há 7-14 dias
- 🔴 **Crítico** — posts atrasados OU 3+ demandas atrasadas OU contrato vencido OU onboarding com prazo vencido OU sem atividade há 14+ dias

Tooltip detalha os motivos. Os ícones soltos de hoje (AlertTriangle, Hourglass, Zap, CalendarClock) somem da linha — informação muda do "ruído visual" pro tooltip do pill.

### 3. Nova coluna: "Entrega do mês"
Mini barra de progresso `6/12` baseada em:
- Numerador: cards do mês corrente com `status_card === "Postado"`
- Denominador: `total_posts` do contrato ativo (ou total de cards do mês se não houver contrato)

Cores: verde (≥80%), âmbar (40-80%), vermelho (<40%) **e** o mês já passou da metade.

### 4. Nova coluna: "Atividade" (frescor)
Texto curto: `há 2 dias`, `há 3 sem`, `nunca`. Calculado pelo `MAX(updated_at)` entre comentários do cliente, demandas, cards e posts. Deixa óbvio quem está esfriando.

Ordenável — clicar ordena os mais frios no topo.

### 5. Nova coluna: "MRR / Plano"
Mostra `R$ 3.500 · Mensal` (formatado em pt-BR). Vem de `cliente.valor_venda` + `cliente.plano`. 
- Permite **ordenar por receita** — você vê quem dá mais dinheiro e cruza com saúde.
- Aparece só se `valor_venda` existir, senão `—`.

Ordenável.

### 6. Coluna "Nicho" e "Período do contrato": mantidas
São os filtros estruturais. Sem mudança.

### 7. Coluna "Último comentário": mantida mas reduzida
Vira mais estreita (max 160px) já que agora "Atividade" responde *quando* foi a última coisa.

## Layout final da tabela

```text
# | Cliente (avatares xs) | Status | Saúde | Entrega mês | Atividade | MRR/Plano | Último coment. | Nicho | Contrato
```

## Mudanças no topo da página

### KPIs agregados (faixa fina acima da tabela)
4 cards minúsculos com totais da carteira filtrada:
- **Clientes ativos** (count)
- **MRR total** (soma de `valor_venda` dos ativos)
- **Em risco** (count com Saúde 🟡 ou 🔴)
- **Contratos vencendo em 30d** (count)

Cada card é clicável e aplica o filtro correspondente (ex: clicar em "Em risco" filtra só esses).

### Novo filtro: "Saúde"
Multi-select `Ok / Atenção / Crítico`. Combina com os filtros existentes.

## Detalhes técnicos

**Arquivos a editar:**
- `src/components/clientes/ClientesGeralTable.tsx` — recolocar colunas, calcular Saúde, Entrega do mês, Atividade, MRR
- `src/pages/Clientes.tsx` — adicionar faixa de KPIs, filtro de Saúde

**Cálculo de Saúde** — função pura `calcularSaude(cliente, cards, demandas, comentarios)` que retorna `{ nivel: 'ok'|'atencao'|'critico', motivos: string[] }`. Reutilizável em ordenação e filtro.

**Cálculo de Atividade** — função `ultimaAtividade(clienteId)` que pega o `MAX` entre `comentarios.created_at`, `demandas.updated_at`, `cards.updated_at`, `posts.updated_at` filtrados por cliente. Memoizado por `clienteId` no `useMemo` da tabela.

**Entrega do mês** — `cards.filter(c => c.cliente_id === id && c.status === 'Postado' && mesmo mês corrente).length` sobre `contrato.total_posts || cardsDoMes.length`.

**Ordenação** — adicionar `SortKey` para `saude`, `entrega`, `atividade`, `mrr`. Mantém os atuais.

**Sem mudanças no banco.** Tudo derivado dos dados que já existem (`clientes.valor_venda`, `clientes.plano`, `cards`, `demandas`, `comentarios`, `contratos`).

## O que NÃO entra (para manter o painel enxuto)

- NPS / satisfação — não existe no schema, fora de escopo.
- Detalhamento de quais demandas estão atrasadas — isso é trabalho do projeto do cliente.
- Histórico de MRR ao longo do tempo — isso é Relatórios, não painel geral.
