## Unificar o formulário do "Workflow / Continuidade" com o de "Detalhes da tarefa"

Hoje o formulário do Workflow tem só um subconjunto dos campos da tarefa principal (faltam Data início, Responsáveis, Anexos com upload e os campos próprios de Link Meister / Link Drive). Isso obriga o usuário a abrir a próxima etapa logo depois de criar para terminar de preencher. A proposta é fazer o Workflow ter exatamente os mesmos campos do detalhe, mais os campos exclusivos da continuidade (bloqueio e reaproveitamento).

### Campos do formulário (na mesma ordem do detalhe da tarefa)

1. Título da próxima tarefa
2. Categoria · Subtipo · Prioridade (linha de 3 colunas, igual hoje)
3. Data início · Data limite (linha de 2 colunas) — hoje só existe "Prazo"
4. Responsáveis — usando o mesmo `AtribuirResponsaveisPopover` do detalhe ("+ atribuir responsáveis", chips removíveis)
5. Anexos — bloco com botão "+ Adicionar anexo", lista com preview/remover, igual ao do detalhe. Os arquivos selecionados ficam pendentes em estado local (`File[]`) e só são enviados ao Storage e gravados em `anexos_demandas` depois que a próxima etapa é criada com sucesso.
6. Link do Meister · Link do Drive (linha de 2 colunas) — visíveis somente para as categorias que já hoje exibem links (`EditorVideo`, `TrafegoPago`, `LandingPage`, `IAAtendimento`, `Personalizado`)
7. Atividade / Briefing (RichTextEditor — já existe, mantido)

### Campos exclusivos da continuidade (continuam abaixo, separados por divisor)

- Bloquear execução até concluir esta tarefa + Modo de liberação (Automático / Manual) — sem mudanças.
- Bloco "Reaproveitar desta tarefa" — repensado para funcionar como atalho de pré-preenchimento dos novos campos editáveis, mesma lógica que já implementamos para "Descrição / briefing":
  - **Descrição / briefing** — ao marcar, copia `pai.descricao` para o campo de Atividade / Briefing (só se vazio); ao desmarcar, limpa se o conteúdo ainda for idêntico ao herdado. (já está assim, mantido.)
  - **Links (Meister / Drive)** — ao marcar, preenche os inputs de Link Meister e Link Drive com os do pai (só se vazios); ao desmarcar, limpa se ainda idênticos.
  - **Anexos** — ao marcar, marca um flag para o `createProximaEtapa` clonar os anexos do pai (comportamento atual via `herdar_anexos: true`). Os anexos enviados manualmente no novo bloco de Anexos são adicionados por cima depois que a etapa é criada.
  - **Responsáveis** (novo item do bloco de reaproveitamento) — ao marcar, pré-popula a lista de responsáveis com a do pai; ao desmarcar, limpa se ainda for igual.

### Reset / Cancelar

Ao criar a próxima etapa com sucesso ou clicar em Cancelar, todos os novos estados (data_inicio, responsaveis_ids, anexos pendentes, link_meister, link_drive, todos os toggles "herdar*") voltam ao padrão.

### Fora de escopo

- Não vamos mexer no formulário do detalhe da tarefa.
- Não vamos transformar o Workflow em um Dialog separado nem reaproveitar o componente do detalhe inteiro (a renderização inline atual no painel lateral é mantida; só os mesmos campos/componentes são adicionados).
- Status, "precisa aprovação" e área de comentários/atividade NÃO entram no Workflow (só fazem sentido depois que a tarefa existe).
- Histórico, dependências, botão de excluir/aprovar continuam exclusivos do detalhe.

---

### Detalhes técnicos

Arquivos afetados:

- `src/components/demandas/WorkflowSection.tsx` (principal)
- `src/store/demandas.ts` — `createProximaEtapa` precisa aceitar `data_inicio` no payload (hoje força `data_inicio: null` na linha 410). Passa a usar `proxima.data_inicio ?? null`. Nenhuma outra mudança no store.

Novos estados no `WorkflowSection`:

```ts
const [dataInicio, setDataInicio] = useState<string>("");
const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
const [linkMeister, setLinkMeister] = useState("");
const [linkDrive, setLinkDrive] = useState("");
const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
const [herdarResponsaveis, setHerdarResponsaveis] = useState(false);
// herdarLinks vira pré-preenchimento dos inputs em vez de flag de envio
```

Reaproveitamento de componentes/utilitários já existentes:

- `AtribuirResponsaveisPopover` (mesmo do detalhe) para a UI de responsáveis.
- `RichTextEditor` para o briefing (já no arquivo).
- Para upload de anexos, replicamos o mesmo fluxo já usado em `DemandaDetalheDialog.tsx` (bucket `anexos`, `sanitizeFileName`, insert em `anexos_demandas`). Como a demanda só existe após o `createProximaEtapa`, fazemos: criar a demanda → para cada `File` em `anexosPendentes`, upload no Storage e insert em `anexos_demandas` com `demanda_id = nova.id`.

Fluxo do `salvar()`:

```text
1. createProximaEtapa(pai.id, {
     titulo, cliente_id, categoria, subtipo, prioridade,
     data_inicio, data_limite,
     descricao, link_meister, link_drive,
     responsaveis_ids,
   }, { modo_liberacao, bloquear, herdar_anexos: herdarAnexos })
2. Se retornar id e houver anexosPendentes: faz upload e insert por arquivo.
3. reset() + fecha o painel.
```

Visibilidade dos inputs de link: usa o mesmo array `CATEGORIAS_COM_LINKS` já definido no detalhe (extraído para `src/lib/demandas-categorias.ts` ou duplicado localmente — preferência por duplicar localmente para não criar mudança de superfície fora do escopo).
