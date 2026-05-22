## Problema

Na Central de Tarefas, as tarefas do tipo "Criar N posts" são agregações de vários cards do mesmo cliente/responsável. Em `src/lib/minhasTarefas.ts` (linhas 277–286), o status do grupo é calculado assim:

1. Todos concluídos → `concluido`
2. Prazo vencido → `atrasado`
3. Algum em andamento → `em_andamento`
4. Caso contrário → `pendente`

O cálculo **não considera o status "Revisar" (Aguardando aprovação do cliente)**. Por isso, quando a Bianca move um card para "Aguardando aprovação do cliente" no detalhe da tarefa, o card individual atualiza corretamente, mas o grupo na Central de Tarefas continua marcado como **Atrasado** (porque a regra do prazo vence primeiro).

Para demandas individuais (linhas 174–179) já existe a lógica correta: `Revisar` → status `aprovacao`, e a checagem de atrasado é ignorada nesse caso. Falta replicar isso para grupos de posts.

## Correção

Em `src/lib/minhasTarefas.ts`, dentro do `grupos.forEach` (bloco que monta a tarefa "Criar N posts"):

1. Separar `pendentes` em dois subconjuntos:
   - `emRevisar` = cards com `status_card === "Revisar"`
   - `ativos` = pendentes que **não** estão em "Revisar"
2. Ajustar a regra de status do grupo:
   - Se `todosConcluidos` → `concluido`
   - Senão, se `ativos.length === 0` (ou seja, todos os pendentes estão em "Revisar") → `aprovacao`
   - Senão, se `isAtrasado(prazoDosAtivos)` → `atrasado` (usando o prazo dos cards ativos, não dos que estão em Revisar)
   - Senão, se algum ativo está "Criar/Agendar" → `em_andamento`
   - Senão → `pendente`
3. Calcular `prazo`/`data_limite`/`data_inicio` priorizando os cards `ativos`; só usar prazos de cards em Revisar como fallback. Isso evita que um card em aprovação puxe o grupo para "atrasado".

Nenhuma estrutura de dados, coluna de banco ou outra funcionalidade é alterada. As demandas individuais e o restante do fluxo continuam idênticos.

## Resultado esperado

Quando todos os posts pendentes de um cliente estiverem em "Aguardando aprovação do cliente", a linha na Central de Tarefas passará a exibir o status **Aguardando aprovação** (e sairá do filtro "Atrasadas"), refletindo o que já aparece no detalhe da tarefa.
