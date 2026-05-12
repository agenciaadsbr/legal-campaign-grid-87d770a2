## Adicionar "Duplicar tarefa" (com workflow) nos cards de demanda

### Objetivo
Permitir duplicar uma demanda inteira a partir do card aberto, copiando todos os campos editáveis e, opcionalmente, anexos e vínculos de workflow (dependências). Sem alterar layout existente nem fluxos atuais.

### Onde aparece o botão
- No header do **DemandaDetalheDialog**, ao lado dos botões já existentes "Copiar link" e "Excluir" (linhas ~491–500). Ícone `Copy` (lucide-react), `variant="ghost"`, `size="icon"`, tooltip "Duplicar tarefa". Visível apenas quando `canWrite`.

### Comportamento ao clicar
Abre um pequeno `AlertDialog` de confirmação com 3 checkboxes (todas marcadas por padrão):
1. **Copiar anexos** — duplica linhas de `anexos_demandas` apontando para as mesmas URLs do Storage (igual ao `herdar_anexos` já existente no `createProximaEtapa`).
2. **Copiar descrição e links** — copia `descricao`, `link_meister`, `link_drive` (ligado por padrão; já implícito em "duplicar completa").
3. **Manter no mesmo workflow** — replica as **dependências pai** (linhas em `task_dependencies` onde `task_id = original.id`) para a nova demanda, preservando `modo_liberacao` e `liberado`. As dependências filhas (cards que dependem do original) **não** são reapontadas — a cópia entra como "irmã" no fluxo.

Comentários e histórico **não** são copiados (são logs do card original).

### Nova action no store `useDemandasStore` (`src/store/demandas.ts`)
Adicionar método `duplicarDemanda(id, options)`:
```text
duplicarDemanda(
  id: string,
  options?: { copiar_anexos?: boolean; copiar_workflow?: boolean }
) => Promise<string | null>
```
Lógica:
- Lê a demanda e dependências do estado atual.
- Insere nova linha em `demandas` com:
  - `titulo`: `"<original> (cópia)"`
  - `categoria`, `subtipo`, `prioridade`, `descricao`, `link_meister`, `link_drive`, `responsaveis_ids`, `data_inicio`, `data_limite`, `precisa_aprovacao` copiados.
  - `status`: `"Planejamento"` (reset), `data_conclusao: null`, `aprovado_por: null`.
  - `origem: "manual"`, `template_id: null`, `marcado_ja_possui: false` (cópia nunca herda flag de template).
  - `criado_por`: usuário atual.
- Se `copiar_anexos`: replica linhas de `anexos_demandas` apontando para mesma URL/nome/mime/size (mesmo padrão de `createProximaEtapa` com `herdar_anexos`).
- Se `copiar_workflow`: para cada `dep` em `dependencies` com `dep.task_id === id`, insere uma nova linha em `task_dependencies` com `task_id = nova.id`, mesmo `depends_on_task_id`, `modo_liberacao` e `liberado` herdados.
- Atualiza state (demandas, anexos, dependencies) e dispara `toast.success("Tarefa duplicada")`.
- Retorna o id da nova demanda.

### UI no DemandaDetalheDialog
- Importar ícone `Copy` de lucide-react e `duplicarDemanda` do store.
- Estado local `duplicarOpen` + opções (`copiarAnexos`, `copiarWorkflow`).
- Botão `Copy` no grupo de actions; ao clicar abre `AlertDialog` com os checkboxes; "Confirmar" chama `duplicarDemanda(demanda.id, opts)`, fecha o diálogo de confirmação e mantém o card original aberto (sem navegar para a cópia, para não atrapalhar o usuário). A cópia aparece automaticamente nas listas (Kanban, Aba Operacional, etc.) via reatividade do store.

### O que NÃO muda
- Nenhuma migração de banco (todas as tabelas e colunas já existem).
- `createProximaEtapa`, `WorkflowSection`, `EtapasRelacionadas`, `OperacionalTab`, posts automáticos e templates operacionais permanecem intactos.
- Layout do dialog é preservado — apenas um botão a mais no grupo de ações já existente.
- Cards de template operacional também podem ser duplicados; a cópia perde o vínculo com `template_id` (vira tarefa manual normal), evitando duplicar a "estrutura padrão".

### Arquivos alterados
- `src/store/demandas.ts` — nova action `duplicarDemanda` + tipagem na interface `State`.
- `src/components/demandas/DemandaDetalheDialog.tsx` — botão `Copy` + `AlertDialog` de confirmação.

### Validação
- Build TS passa.
- Duplicar tarefa simples → aparece nas listas com "(cópia)", status `Planejamento`, sem dependências.
- Duplicar tarefa que depende de outra → cópia herda a mesma dependência pai, ícone de cadeado aparece igual.
- Duplicar com anexos → anexos visíveis no card duplicado.
