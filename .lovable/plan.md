Vou corrigir o filtro de período do módulo “Minhas Tarefas” para que, ao selecionar uma única data no calendário, a tabela mostre somente tarefas daquele dia exato.

Plano de ajuste:

1. Corrigir a seleção de data única no calendário
- Em `src/components/filters/PeriodoFiltro.tsx`, ajustar o `onSelect` do calendário para tratar corretamente quando o usuário clica em apenas um dia.
- Quando o calendário retornar apenas `from` sem `to`, gravar `inicio` e `fim` como o mesmo dia, com `fim` no final do dia.
- Assim, uma seleção única como `06/05/2026` vira internamente: início `06/05/2026 00:00:00` e fim `06/05/2026 23:59:59`.

2. Ajustar a exibição do rótulo do filtro
- Quando `inicio` e `fim` forem o mesmo dia, mostrar apenas uma data no botão, por exemplo: `06/05/2026`.
- Quando for intervalo real, manter o formato atual: `06/05/2026 – 08/05/2026`.

3. Reforçar a comparação por dia em “Minhas Tarefas”
- Em `src/pages/MinhasTarefas.tsx`, normalizar o início do período para o começo do dia e o fim do período para o final do dia antes de comparar com o prazo da tarefa.
- Isso evita falhas por horário/fuso e garante que tarefas de outros dias não passem no filtro.

4. Manter fora do escopo
- Não alterar lógica de criação/ordenação das tarefas.
- Não mexer em Projeto Completo.
- Não mexer em Clientes.
- Não alterar banco de dados.
- Não remover funcionalidades existentes.

Resultado esperado:
- Se o usuário selecionar somente `06/05/2026`, a tabela exibirá apenas tarefas com prazo em `06/05/2026`.
- Não aparecerão tarefas de `07/05/2026`, `08/05/2026` ou outros dias.
- O filtro continuará funcionando para intervalos, presets e “Limpar”.