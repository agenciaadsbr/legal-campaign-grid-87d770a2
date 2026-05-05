# Corrigir: campos do formulário não refletem seleção em tempo real

## Diagnóstico

Os pais (`Demandas.tsx` e `AreaTab.tsx`) abrem o `DemandaDetalheDialog` passando uma **cópia estática** da demanda salva em `useState` (`selecionada`). Quando o usuário muda Categoria, Subtipo, Prioridade ou Datas, o `updateDemanda` atualiza o store Zustand corretamente — mas o `selecionada` no pai continua sendo o snapshot antigo. O `<Select value={demanda.categoria}>` e os `<Input type="datetime-local" value={demanda.data_inicio…}>` continuam exibindo o valor antigo até o usuário fechar e reabrir o card.

Isso só não acontecia com Título e Descrição porque eles usam estado local + debounce.

## Solução

Dentro de `DemandaDetalheDialog.tsx`, em vez de usar o `demanda` recebido por prop como fonte de verdade dos campos, derivar a demanda **viva** do store pelo `id`. Assim qualquer `updateDemanda` re-renderiza o dialog com o valor atualizado.

### Mudanças em `src/components/demandas/DemandaDetalheDialog.tsx`

1. Renomear o prop recebido para `demandaProp` e, logo no início do componente, fazer:
   ```ts
   const { demandas } = useDemandas();
   const demanda = demandaProp
     ? demandas.find((d) => d.id === demandaProp.id) ?? demandaProp
     : null;
   ```
   - Fallback para `demandaProp` cobre o caso da demanda ter sido removida do store (ex.: descarte de rascunho ao fechar).
2. Manter todo o restante do componente igual — todos os `demanda.*` agora leem do store automaticamente.
3. O `useEffect` que sincroniza `tituloLocal`/`descricaoLocal` continua dependendo de `demanda?.id`, então não dispara em mudanças de outros campos (sem perda de cursor).

### Bump de versão

`public/version.json` — atualizar timestamp para forçar refresh dos clientes.

## Resultado esperado

Ao abrir uma tarefa (rascunho ou existente) e alterar Categoria, Subtipo, Prioridade, Data início, Data limite ou Responsáveis, os controles passam a exibir imediatamente o valor selecionado, sem precisar fechar e reabrir o card.
