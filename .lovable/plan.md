## Problema
Os cards Total/Pendentes/Atrasadas/Urgentes em "Minhas Tarefas" são calculados sobre `todasTarefas` (lista completa), então não mudam quando o usuário aplica filtro de data, cliente, área, status ou busca.

## Correção
Em `src/pages/MinhasTarefas.tsx`, alterar o `useMemo` de `kpis` para usar `tarefasFiltradas` em vez de `todasTarefas`. A troca de visualização por responsável continua funcionando porque já entra no escopo do builder e, portanto, em `tarefasFiltradas`.

```ts
const kpis = useMemo(() => {
  const total = tarefasFiltradas.length;
  const pendentes = tarefasFiltradas.filter((t) => t.status !== "concluido").length;
  const atrasadas = tarefasFiltradas.filter((t) => t.status === "atrasado").length;
  const urgentes = tarefasFiltradas.filter((t) => t.urgente && t.status !== "concluido").length;
  return { total, pendentes, atrasadas, urgentes };
}, [tarefasFiltradas]);
```

## Fora de escopo
- Sem alteração em lógica de tarefas, Projeto Completo, Clientes, banco ou outros módulos.
- `areasDisponiveis` continua baseado em `todasTarefas` (para não esvaziar opções do filtro de área quando outro filtro está ativo).
