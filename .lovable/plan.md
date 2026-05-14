## Resumo
Corrigir o preenchimento automático dos campos "Cliente" e "Área / Categoria" no módulo lateral "Criar Tarefa", fazendo-os iniciar vazios com placeholders, sem alterar o restante do formulário.

## Alterações

### 1. `src/pages/CriarTarefa.tsx`
- **Remover** a linha `setClienteId(primeiro)` dentro do `useEffect` de inicialização, mantendo `clienteId` como `""`.
- **Alterar** o estado inicial de `area` de `"Personalizado"` para `""`.
- **Ajustar** o tipo do estado `area` para aceitar string vazia (`AreaSel | ""`).
- **Manter** a criação do rascunho silencioso no `useEffect` (usando o primeiro cliente e categoria `"Personalizado"` internamente), garantindo que o formulário completo continue aparecendo desde o início.
- **Manter** toda a lógica de salvamento, fechamento e navegação inalterada.

## O que NÃO muda
- Layout ou campos do formulário.
- `DemandaDetalheDialog.tsx` ou qualquer outro componente.
- Lógica de criação/edição de tarefas, rascunhos, Posts, Workflow, Kanbans ou dashboards.
- Dados existentes.

## Resultado esperado
Ao abrir "Criar Tarefa", os selects de Cliente e Área/Categoria exibem os placeholders "Selecione o cliente" e "Selecione a área/categoria". O usuário preenche manualmente. O formulário completo continua visível imediatamente.