## Confirmação
Sim, está duplicado. Na aba **Visão Geral** o cabeçalho mostra um botão "Adicionar Tarefa" (`src/pages/ProjetoCliente.tsx`, linha 150) que dispara exatamente a mesma ação (`setNovaTarefaOpen(true)`) do botão recém-adicionado dentro da aba **Posts** (ao lado do "Buscar por título…"). Como o usuário inicia em Visão Geral e logo abre Posts pra adicionar tarefa, o de Visão Geral fica redundante.

## Mudança
Em `src/pages/ProjetoCliente.tsx`, dentro do `headerBtn` (linhas 145-151), adicionar:

```ts
if (tab === "visao") return null;
```

Isso faz o cabeçalho da Visão Geral não renderizar nenhum botão (o `{headerBtn && …}` na linha 198 já trata o caso `null`). Demais abas (Vídeos, Tráfego, LP/Site, IA, Atividades, Responsáveis, Relatórios) continuam mostrando "Adicionar Tarefa" no header normalmente.

## Fora de escopo
- Não mexer no botão da aba Posts.
- Não alterar o modal `NovaTarefaDialog` nem o estado `novaTarefaOpen`.
