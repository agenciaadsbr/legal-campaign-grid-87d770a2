## Objetivo

Igualar o tamanho visual dos cards da seção **"Clientes — Visão geral da base"** ao tamanho dos cards das seções **"Conteúdo & Posts"** e **"Demandas internas"** no Dashboard / aba Visão Geral.

## Diagnóstico

Hoje os 3 grupos já usam `KpiCard compact` com `gap-2`, mas a linha de Clientes aparece visivelmente mais alta no screenshot por dois motivos:

1. O card **"Total"** recebe `hint={`${pctAtivos}% ativos`}`, que adiciona uma linha extra de texto. Como o CSS Grid alinha todas as células pela mais alta, **os 5 cards de Clientes ficam mais altos** que os de Posts/Demandas (que não têm `hint`).
2. O grid de Clientes usa `lg:grid-cols-5` (5 colunas → cards mais largos) enquanto Posts usa `lg:grid-cols-6` (6 colunas → cards mais estreitos). Isso reforça a sensação de "blocos maiores".

## Mudanças

**`src/pages/Dashboard.tsx` — seção 1 (Clientes), linhas 144–155**

- Remover o `hint="${clientesKpis.pctAtivos}% ativos"` do card "Total" (mesma altura dos demais cards, sem linha extra).
- Trocar o grid de `lg:grid-cols-5` para `lg:grid-cols-6` para casar com a densidade da linha de Posts (cards mais estreitos, mesmo padrão visual).
- A seção continua com 5 KPIs; a 6ª coluna fica vazia em telas largas, o que mantém os cards no MESMO tamanho dos de Posts (objetivo do pedido).

Alternativa considerada (e descartada): manter `grid-cols-5` em Clientes e Demandas e reduzir Posts também para 5. Foi descartada porque tiraria um KPI ou agruparia dois — preferi alinhar Clientes/Demandas ao formato mais denso de Posts apenas via colunas, sem perder informação.

**`src/pages/Dashboard.tsx` — seção 3 (Demandas), linha 173**

- Trocar `lg:grid-cols-5` para `lg:grid-cols-6` pela mesma razão (5 KPIs em grid de 6 colunas → mesma largura/altura visual dos cards de Posts).

**`public/version.json`**

- Bump do timestamp para forçar refresh do client.

## Resultado esperado

As três seções (Clientes, Conteúdo & Posts, Demandas internas) ficam com cards de **mesma altura e mesma largura**, totalmente padronizados visualmente como no print de referência.

## Sem mudanças

- `KpiCard.tsx` permanece igual (já está em modo `compact`).
- Tabs, header, gráficos e demais seções permanecem inalterados.
- Lógica de KPIs e dados não muda.