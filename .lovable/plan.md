## Diagnóstico

Os filtros indicados ("Todos responsáveis", "Todos status", "Todas prioridades") aparecem em **dois lugares ao mesmo tempo** no módulo Demandas:

1. **Barra principal** (`src/pages/Demandas.tsx`) — global, já aplica filtro a todas as abas (Clientes, Quadro Geral, Minhas Demandas, etc.).
2. **Sub-barra da aba Clientes** (`src/components/demandas/ClientesDemandasTable.tsx`, linhas 135–173) — repete exatamente os mesmos três `<Select>`, gerando a duplicação visual mostrada na captura.

A sub-barra é redundante: o usuário aplica o filtro em cima e vê o mesmo controle logo abaixo, sem ganho funcional.

## Correção

### 1) `src/components/demandas/ClientesDemandasTable.tsx`
- **Remover** os três `<Select>` duplicados (Responsável, Status, Prioridade).
- **Manter** apenas o campo `Buscar cliente...` (único filtro exclusivo desta aba).
- **Remover** os states locais `fResp`, `fStatus`, `fPrio` e os imports não mais usados (`Select*`, `STATUS_DEMANDA`, `STATUS_DEMANDA_LABEL`, `PRIORIDADES`, `PRIORIDADE_LABEL`).
- **Aceitar props** `filtroResp`, `filtroStatus`, `filtroPrio` vindas da página, e usá-las no `useMemo` no lugar dos states removidos. A lógica de filtragem permanece igual.

### 2) `src/pages/Demandas.tsx`
- Passar os estados globais já existentes (`fResp`, `fStatus`, `fPrio`) como props para `<ClientesDemandasTable filtroResp={fResp} filtroStatus={fStatus} filtroPrio={fPrio} />` no render da aba Clientes.

## Resultado

- Sub-barra da aba Clientes exibe **apenas** o campo "Buscar cliente...".
- Os filtros de Responsável, Status e Prioridade ficam **somente** na barra principal e seguem agindo globalmente sobre a tabela de clientes.
- Sem duplicação visual; comportamento de filtragem preservado.
- Nenhum outro layout, estilo ou funcionalidade é alterado.