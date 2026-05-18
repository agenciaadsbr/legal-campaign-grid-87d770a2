## Escopo

Melhorias seguras na IA "Está com dúvidas na tarefa? Consulte aqui", sem RAG/embeddings, sem mexer em Kanban, cards, workflow, comentários ou layout geral. Apenas:
contexto enviado, prompt, carregamento, histórico e categoria da aba Posts.

---

## Arquivos a alterar

1. `src/components/clientes/PostDetalheDialog.tsx`
2. `src/components/configuracoes/IAPromptSetorManager.tsx`
3. `src/components/demandas/TarefaIAConsulta.tsx`
4. `src/store/iaConsultas.ts`
5. `supabase/functions/ia-consultar-tarefa/index.ts`

Nenhuma migração de banco. Nenhuma alteração em `reunioes.ts`, `crm.ts`, kanbans, cards, workflow ou comentários.

---

## 1. `PostDetalheDialog.tsx` — categoria correta

No `demandaStub` usado para alimentar `TarefaIAConsulta`:

- Trocar `categoria: "Personalizado"` por `categoria: "Posts" as any`.
- Manter `id: post.id` (estável → histórico não some).
- Subtipo continua `card.formato || null`.

Resto do arquivo intocado.

---

## 2. `IAPromptSetorManager.tsx` — adicionar setor "Posts"

- Acrescentar `"Posts"` no início do array `SETORES` (lista local; coluna `setor` em `ia_setor_prompts` é texto livre — não precisa alterar enum de categorias).
- Mostrar com label "Posts" e key `Posts`. Como `CATEGORIA_LABEL` não tem `Posts`, criar mapa local `LABEL_SETOR` que cai em `CATEGORIA_LABEL[setor] ?? setor`.
- Texto-guia padrão (placeholder) já fica orientando temas, conteúdo, linguagem, CTA, identidade etc. (conforme briefing do item 2 do pedido).

---

## 3. `TarefaIAConsulta.tsx` — carregamento + histórico padronizado

### Ordem de carregamento
- Estado `ready` (boolean).
- `useEffect([isOpen, demanda.id])`: quando abre, dispara em sequência `loadSetorPrompts()`, `loadReunioes()` e `loadConsultasByDemanda(demanda.id)`; ao terminar, marca `ready = true`.
- Botão "Consultar IA" e Textarea desabilitados enquanto `!ready || loading`.
- Mensagem discreta abaixo do textarea quando `!ready`: "Carregando reuniões do cliente…".

### Tratamento de erro
- `consultarIA` retorna `null` em falha → manter `pergunta` no textarea (não limpar).
- Caso especial: se não houver nenhuma reunião do cliente, exibir toast informativo e ainda assim chamar a IA (ela vai responder usando apenas briefing/comentários e cair no "não encontrei").

### Histórico padronizado
Substituir o item compacto atual por um card por consulta com:
- **Pergunta:** texto integral (negrito).
- **Resposta:** integral; se > 280 chars, mostrar truncada com botão "Ver mais"/"Ver menos" (estado local por id).
- **Data/hora:** `toLocaleString('pt-BR')`.
- **Usuário:** resolver via `useCRM().authoresPorAuthId[c.usuario_id]?.nome` com fallback "Sistema".
- **Fontes:** badges (mesmo componente já usado na resposta atual).
- **Confiança:** chip colorido (verde/âmbar/destructive) igual ao atual.

Sem cortes que escondam a resposta. Sem `line-clamp-2`.

---

## 4. `src/store/iaConsultas.ts` — incluir fontes/confiança e tratamento de erro

- `TarefaConsulta` já tem `fontes` e `nivel_confianca` — confirmar que o `select("*")` traz.
- `consultarIA`: em caso de `error` retornado pela edge function (HTTP/2xx mas body com `error`), tratar:
  - `"rate"` / status 429 → toast "Limite de uso atingido. Tente novamente em instantes."
  - `"credit"` / status 402 → toast "Créditos da IA esgotados. Avise o admin."
  - Demais → toast "Não foi possível consultar a IA agora."
- Sempre `await loadConsultasByDemanda(params.demanda_id)` ao final (já existe).

Sem alteração de schema.

---

## 5. `supabase/functions/ia-consultar-tarefa/index.ts` — prompt e contexto

### Validação e limites
- Manter o `body` atual.
- Ordenar `reunioes` desc por `data`; pegar `slice(0, 5)`.
- Truncar por seção dentro de cada reunião:
  - `transcricao` → 6000 chars
  - `resumo_tarefas` (operacional) → 2500
  - `resumo_cliente` → 2500
  - `observacoes` → 1500
- Truncar `tarefa_descricao` em 4000 chars e `tarefa_comentarios` em 3000.

### Contexto estruturado
Substituir o bloco "CONTEXTO DE REUNIÕES" por blocos rotulados:

```
=== CLIENTE ===
Nome: ...

=== TAREFA ===
Categoria: ...
Subtipo: ...
Título: ...
Briefing: ...
Comentários: ...

=== REUNIÕES (mais recentes primeiro) ===
[1] Título — data (tipo)
  - Transcrição: ...
  - Resumo operacional: ...
  - Resumo cliente: ...
  - Observações: ...
[2] ...
```

### Prompt do sistema (reforçado)
Substituir o `systemPrompt` por versão que:
- Define papel "assistente operacional da ADS BR".
- Lista a ordem de prioridade das fontes (1. transcrição … 7. observações gerais).
- Inclui diretrizes por categoria (Posts, TrafegoPago, EditorVideo, LandingPage, IAAtendimento, Operacional, Personalizado/Urgência) — selecionar dinamicamente o bloco da `tarefa_categoria` recebida, em vez de despejar todos.
- Proíbe respostas genéricas tipo "o cliente atua na área da advocacia" salvo se for a única informação disponível.
- Se não houver dado, responder exatamente:
  "Não encontrei essa informação nas reuniões, resumos ou briefing deste cliente. Recomendo confirmar no grupo ou adicionar essa observação na tarefa." e `nivel_confianca: "Baixo"`, `fontes: []`.
- Inclui o `setor_prompt` (vindo do gestor de prompts) no topo, se existir.

### Saída estruturada
- Manter `generateText` (já em uso). Continuar pedindo JSON, mas reforçar:
  - "Responda SOMENTE com um objeto JSON válido. Sem markdown, sem texto fora do JSON."
  - Schema esperado: `{ resposta: string, fontes: string[], nivel_confianca: "Alto"|"Médio"|"Baixo" }`.
- Fallback robusto: tentar `JSON.parse(text)`; se falhar, tentar extrair primeiro objeto com regex; se ainda falhar, retornar `{ resposta: text.trim(), fontes: [], nivel_confianca: "Médio" }`.
- Normalizar `nivel_confianca` (aceitar "alto"/"medio"/"baixo" e variações com acento).

### Persistência
- Continuar gravando em `ia_tarefa_consultas` com `demanda_id`, `usuario_id`, `pergunta`, `resposta`, `fontes`, `nivel_confianca` (já existente). Aceitar `demanda_id` que vem da aba Posts (post.id) — coluna é uuid, qualquer uuid serve.

### Erros
- Em catch genérico, retornar `{ error: "..." }` com status 500.
- Em 429/402 do upstream propagar status equivalente para o cliente identificar.

---

## Validação manual

1. Abrir card da aba Posts → expandir "Está com dúvidas?" → botão fica desabilitado enquanto carrega; mensagem "Carregando reuniões…" some quando pronto.
2. Perguntar "Quais temas o cliente quer postar?" → resposta cita reuniões/resumos; aparece em Histórico com pergunta, resposta, usuário, data, fontes (badges) e confiança.
3. Fechar e reabrir o post → histórico persiste (mesmo `demanda_id = post.id`).
4. Repetir em Tráfego Pago, Vídeos, LP/Site, IA/Atendimento, Operacional, Urgência → categoria correta orienta a resposta.
5. Cliente sem reuniões → IA responde a mensagem padrão de "Não encontrei…".
6. Forçar erro de rede → toast amigável e a pergunta permanece no textarea.
7. Conferir que Kanban, cards, workflow, comentários e layout não mudaram.