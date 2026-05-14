## Escopo

Aplicar mudanças apenas em:

- `src/components/tarefas/TaskFormBase.tsx` — modo Posts (`initialPostId` definido)
- `src/pages/PostDetalhe.tsx` — apenas se necessário (sem alterar layout externo)

Nada em Projeto Completo, `DemandaDetalheDialog`, kanbans, store ou demais áreas.

## Diagnóstico

- O "formulário padrão validado" é o `TaskFormBase` (já usado em Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Operacional, Urgências). Posts já usa o mesmo componente, mas hoje tem um campo extra `Legenda` e a seção "Campos de Post" está renderizada com `Legenda` embutida.
- `PostDetalhe` carrega o post pelo `initialPostId` em `TaskFormBase`. Isso já garante mesma estrutura, mesmo layout, mesmas interações (Workflow, IA Consulta, Comentários, Histórico, Anexos, Briefing).
- O único delta entre Posts e demais áreas é: (a) campo Legenda, (b) campos extras Data Agendamento, Data Postagem, Link Meta Business Suite.

## Mudanças

### 1. Remover completamente o campo Legenda do formulário Posts

Em `TaskFormBase.tsx`:

- Remover estado local `legenda` e `setLegenda`.
- Remover bloco JSX do `<Label>Legenda</Label>` + `<Textarea>` dentro da seção "Campos de Post".
- Remover leitura `setLegenda(p.legenda || "")` no `useEffect` de carregamento.
- Remover envio de `legenda` em `updatePost(...)` (ambos branches: `initialPostId` existente e novo via `createCardRascunho`). O backend continua aceitando `legenda` opcional, então registros antigos não são alterados (compatibilidade preservada).

### 2. Briefing passa a cobrir a legenda

- Atualizar `placeholder` do `RichTextEditor` de "Atividade / Briefing" para:
  `"Descreva detalhes do post, legenda, CTA, referências, contexto e instruções internas..."`
- Manter o nome do campo "Atividade / Briefing".
- Não mexer em `descricao` para áreas não-Posts (placeholder único é aceitável; mantém consistência e não altera funcionalidade — apenas amplia o texto-guia).

### 3. Reordenar para a estrutura final exigida

Hoje a ordem em modo Posts é:

```
Cliente / Área | Título / Urgente / Status / Prioridade
Subtipo (se não-Posts)
[Campos de Post: Data agendamento, Data postagem, Link Meta, Legenda]
Data Início / Data Limite / Responsáveis | Link Meister / Link Drive / Anexos
Briefing
Comentários
Workflow
```

Reordenar para casar com o pedido (válido para Posts e demais áreas):

```
Cliente / Área | Título / Urgente / Status / Prioridade
Subtipo
Data Início / Data Limite | (coluna direita: Links)
Responsáveis
[CAMPOS DE POST] (somente quando categoria === "Posts")
Anexos
Link Meister / Link Drive
Briefing (placeholder ampliado)
Comentários (Atividade / Comentários + Ver histórico + IA Consulta já presente)
Workflow / Continuidade
```

Detalhes:

- A seção "CAMPOS DE POST" (card destacado já existente) é movida para ficar **após Responsáveis e antes de Anexos**.
- Anexos sai da coluna direita do grid de datas e vira bloco próprio em largura cheia, antes dos Links.
- Mantidos: bloco `TarefaIAConsulta` ("Está com dúvidas na tarefa? Consulte aqui"), histórico via `meuHistorico`, `WorkflowSection`.

### 4. Compatibilidade

- Posts antigos com `legenda` no banco continuam carregando (apenas não são exibidos/editados pelo formulário). Nenhum DELETE/UPDATE em massa.
- Anexos, comentários, workflow, IA Consulta, histórico permanecem com os mesmos handlers.
- Cards e rotas inalterados.
- Tarefas das demais áreas (não-Posts): apenas a reordenação visual descrita acima e o placeholder do Briefing. Nenhum campo removido, nenhum binding alterado.

## Validação manual

1. Abrir `/clientes/:id/posts/:postId` → mesmo layout do formulário das demais áreas.
2. Confirmar ausência total do campo Legenda.
3. Confirmar presença de Data agendamento, Data postagem, Link Meta Business Suite na seção "Campos de Post" entre Responsáveis e Anexos.
4. Confirmar novo placeholder do Briefing.
5. Comentários, Workflow, IA Consulta, anexos e histórico funcionando.
6. Abrir post antigo (que tinha `legenda` salva) → abre normalmente, sem quebrar.
7. Abrir tarefa de Vídeos/Tráfego/LP/IA/Operacional/Urgência → mesma ordem visual, sem regressão.
