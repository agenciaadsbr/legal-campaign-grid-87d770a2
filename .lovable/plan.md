## Filtro de Período na aba Clientes

Adicionar um novo filtro **"Período"** na barra de filtros da visão Clientes, posicionado entre o filtro de Nicho e o de Contrato. Ele filtra clientes com base em **prazos de tarefas e posts** (a vencer ou já vencidos) dentro do intervalo selecionado, combinando com os filtros já existentes (responsável, nicho, status, contrato).

---

### 1. UI do filtro

Botão "Período" abrindo um Popover com três seções:

```text
📅 FUTURO (planejamento)
   • Hoje
   • Esta semana
   • Próximos 7 dias
   • Próximos 14 dias
   • Próximos 30 dias

📊 PASSADO (análise)
   • Últimos 7 dias
   • Últimos 14 dias
   • Últimos 30 dias
   • Mês passado

⚙️ PERSONALIZADO
   [Data inicial] [Data final]  [Aplicar]
```

- Botão mostra um badge contador quando ativo e o label do período selecionado (ex.: "Período: Próximos 7 dias").
- Opção "Limpar" dentro do popover para resetar.
- Datepickers usam `Calendar` shadcn dentro de Popover (com `pointer-events-auto`).

### 2. Comportamento de filtragem

Para cada cliente, coleta-se:
- `data_postagem` dos cards (posts) que ainda não foram concluídos
- `data_limite` das demandas (tarefas) ainda em aberto

O cliente passa no filtro se **pelo menos uma** dessas datas cair no intervalo `[inicio, fim]` calculado conforme o preset:

| Preset | Intervalo |
|---|---|
| Hoje | tarefas vencendo hoje **ou** atrasadas (data_limite ≤ hoje, status ≠ Concluído) |
| Esta semana | início da semana atual → fim da semana atual (seg–dom) |
| Próximos 7/14/30 dias | hoje → hoje + N |
| Últimos 7/14/30 dias | hoje − N → hoje (apenas itens vencidos/atrasados) |
| Mês passado | 1º ao último dia do mês anterior |
| Personalizado | data_inicial → data_final (inclui vencidas e a vencer no intervalo) |

Regras adicionais:
- Considera tarefas com status `Atrasado` e prioridade `Urgente` quando a data cai no intervalo.
- Considera posts com `status_card = "Atrasado"` quando `data_postagem` cai no intervalo.
- Combina com filtros existentes via AND (responsável, nicho, status, contrato).
- "Todos os períodos" (default) desativa o filtro.

### 3. Persistência

Salvar o preset selecionado em `localStorage` (`dashtasks.clientes.filtroPeriodo`) para sobreviver entre sessões. Datas personalizadas também persistidas.

---

### Arquivos alterados

**`src/components/clientes/ClientesGeralTable.tsx`**
- Novo tipo `FiltroPeriodo` com presets + custom.
- Nova prop `filtroPeriodo?: { tipo: PeriodoPreset; inicio?: string; fim?: string }`.
- Função utilitária `resolveIntervalo(filtro)` retornando `{inicio: Date, fim: Date, modo: "futuro"|"passado"|"ambos"}`.
- No `useMemo` de `linhas`, após os filtros existentes, aplicar verificação cruzando `cards` (data_postagem) + `demandas` (data_limite) do cliente contra o intervalo.

**`src/pages/Clientes.tsx`**
- Novo state `filtroPeriodo` (com persistência em localStorage).
- Novo componente `FiltroPeriodoButton` (Popover com as 3 seções + datepickers).
- Renderizar o botão entre Nicho e Contrato.
- Incluir `filtroPeriodo` em `algumFiltroAtivo`, `limparFiltros` e props passadas para `ClientesGeralTable`.

**`public/version.json`** — bump de versão.

---

### Detalhes técnicos

```ts
type PeriodoPreset =
  | "todos"
  | "hoje" | "esta_semana"
  | "prox_7" | "prox_14" | "prox_30"
  | "ult_7" | "ult_14" | "ult_30" | "mes_passado"
  | "custom";

interface FiltroPeriodo {
  tipo: PeriodoPreset;
  inicio?: string; // ISO yyyy-mm-dd, só usado quando tipo="custom"
  fim?: string;
}
```

Lógica de match por cliente (pseudo):
```ts
const datas: Date[] = [];
cardsCli.filter(naoConcluido).forEach(c => c.data_postagem && datas.push(new Date(c.data_postagem)));
demandasCli.filter(naoConcluida).forEach(d => d.data_limite && datas.push(new Date(d.data_limite)));
return datas.some(dt => dt >= inicio && dt <= fim);
```

Para "Hoje" especificamente, também inclui itens com `data < hoje` e status atrasado/aberto (não apenas `=== hoje`).
