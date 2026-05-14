## Escopo

Apenas `src/components/tarefas/TaskFormBase.tsx`. Nenhuma alteração em store, banco, kanbans, Projeto Completo, Central de Tarefas, Dashboards, demais áreas, `PostDetalhe.tsx` ou qualquer outro arquivo.

## Diagnóstico

A aba Posts já abre o card via `PostDetalhe` → `<TaskFormBase initialPostId=... />`. Ou seja, o componente já é o mesmo formulário padrão usado em Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Operacional e Urgências (mesma estrutura, mesmo CSS, mesmo Workflow, mesma IA Consulta, mesmos comentários/histórico/anexos/briefing). Isso atende ao requisito "usar exatamente o mesmo componente já existente" — não é necessário criar nada novo nem duplicar componente.

Pendências do comando ainda não satisfeitas:

1. O bloco "Campos de Post" hoje só tem **Data Agendamento, Data Postagem, Link Meta Business Suite**. Falta **Legenda** (4º campo exigido).
2. O campo Legenda foi removido na iteração anterior do `TaskFormBase`: estado, leitura (`p.legenda`) e gravação (`updatePost({ legenda })`) não existem mais. Precisa voltar — sem migração destrutiva e preservando dados antigos em `posts.legenda`.
3. Garantir o **placeholder** do Briefing exatamente como pedido.
4. Garantir **posicionamento**: bloco "Campos de Post" entre Responsáveis e Anexos (já está correto hoje — apenas confirmar que não regride ao adicionar Legenda).
5. Garantir que, fora o bloco "Campos de Post", o formulário de Posts é visualmente indistinguível das demais áreas (já é — apenas reconfirmar nenhuma divergência sobrou).

## Mudanças (todas em `src/components/tarefas/TaskFormBase.tsx`)

### 1. Reintroduzir estado da Legenda
- Adicionar `const [legenda, setLegenda] = useState("");` junto a `dataAgendamento`, `dataPostagem`, `linkMeta`.

### 2. Carregar Legenda de posts existentes
- No `useEffect` de carga, branch `initialPostId`: adicionar `setLegenda(p.legenda || "")`.

### 3. Persistir Legenda
- Em `handleSubmit`, branch Posts, nas duas chamadas `updatePost(...)` (post existente e novo via `createCardRascunho`), incluir `legenda: legenda || undefined`.
- Compatibilidade: se o usuário não preencher, valor antigo no banco não é apagado pelo `undefined`; se preencher, sobrescreve normalmente.

### 4. Adicionar campo Legenda dentro do bloco "Campos de Post"
- Reimportar `Textarea` de `@/components/ui/textarea`.
- Após o item "Link Meta Business Suite" do `<Card>` "Campos de Post", adicionar em `md:col-span-2`:
  - `<Label>Legenda</Label>`
  - `<Textarea value={legenda} onChange={e => setLegenda(e.target.value)} placeholder="Texto final do post (Instagram/Facebook)..." rows={4} />`
- Ordem final do bloco: Data Agendamento → Data Postagem → Link Meta Business Suite → Legenda. Bloco continua entre Responsáveis e Anexos.

### 5. Confirmar placeholder do Briefing
- Manter exatamente: `"Descreva detalhes do post, legenda, CTA, referências, contexto e instruções internas..."` (já está aplicado para `categoria === "Posts"`).

### 6. Garantir paridade total com as outras áreas
- Não remover, esconder, simplificar ou reordenar nenhuma seção do `TaskFormBase`.
- Cabeçalho (Cliente, Área, Subtipo, Título, Urgente, Status, Prioridade), Datas, Responsáveis, Anexos, Link Meister, Link Drive, Atividade/Briefing, Atividade/Comentários, Ver histórico, IA Consulta ("Está com dúvidas na tarefa? Consulte aqui") e Workflow/Continuidade permanecem idênticos aos das demais áreas.

## Não fazer

- Sem migração SQL. `posts.legenda` permanece como está.
- Sem alterar `PostDetalhe.tsx`, `DemandaDetalheDialog.tsx`, kanbans, store `crm`/`demandas`, edge functions, tipos, dashboards, central de tarefas ou formulários de outras categorias.
- Sem `DELETE`/`UPDATE` em massa, sem limpar valores antigos.

## Validação manual

1. Cliente → Projeto Completo → aba Posts → abrir um card existente.
2. Confirmar que o layout é visualmente idêntico ao de Vídeos/Tráfego/LP/IA/Operacional/Urgência.
3. Confirmar única diferença: bloco "Campos de Post" entre Responsáveis e Anexos com **Data Agendamento, Data Postagem, Link Meta Business Suite, Legenda**.
4. Abrir post antigo cuja `legenda` esteja salva no banco → valor aparece preenchido no campo Legenda.
5. Editar Legenda + salvar → persistido em `posts.legenda`. Reabrir → mantém o novo valor.
6. Salvar sem mexer em Legenda → valor anterior continua intacto.
7. Briefing exibe o placeholder ampliado exigido.
8. Comentários, Ver histórico, IA Consulta, Workflow, anexos, links Meister/Drive funcionando normalmente.
9. Abrir tarefa de outra área → bloco "Campos de Post" não aparece; nenhuma regressão visual.
