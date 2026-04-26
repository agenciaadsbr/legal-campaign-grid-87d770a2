## Objetivo

Reestruturar o **interior do card de detalhe da Demanda** (`DemandaDetalheDialog.tsx`) para reproduzir fielmente a mesma estrutura visual do card do módulo **Clientes** (`PostDetalhe.tsx`) mostrada na imagem de referência — eliminando o layout atual baseado em `Tabs` e adotando o formato em **dois Cards verticais** (informações + atividade).

---

## Comparação atual × alvo

**Hoje (Demandas):** `Dialog` com `Tabs` (Atividade / Arquivos / Comentários / Histórico), grid de 4 selects no topo, textareas simples.

**Alvo (igual à imagem do Clientes/PostDetalhe):**
1. **Card 1 — "Informações da Demanda"** (substitui o conteúdo atual do dialog), contendo, em ordem:
   - **Header**: label "TÍTULO DA TAREFA" em uppercase pequeno, `Input` grande do título (sem borda), subtítulo `Cliente · Categoria · Subtipo`. À direita: botão **Urgente** (toggle amarelo/âmbar quando `prioridade = "Urgente"`) + `Select` de **Status**.
   - **Grid 2 colunas** com: Data limite (datetime-local), Data início, Link/Referência (se aplicável — opcional, podemos omitir se não houver campos equivalentes), Responsável (Select).
   - **Bloco Responsáveis** com `Popover` + `AvatarStack` (igual ao PostDetalhe) — usando `responsavel_id` (single) ou habilitando múltiplos se desejado (mantém single por enquanto, apenas visual com avatar).
   - **Separador + Bloco Anexos**: thumbnails 72×72 com preview de imagem, ícone para arquivos, botão "+ Adicionar anexo" e tile tracejado "Anexar". Reaproveita `anexos` de `useDemandas` + `addAnexo`.
   - **Separador + Atividade / Briefing**: `Textarea` ligada a `descricao` com hint "Visível apenas dentro deste card."
   - **Separador + Campo extra opcional** (ex: "Observações") — só se fizer sentido; caso contrário, omitir para manter simetria sem inventar campo.
2. **Card 2 — "Atividade"** (igual ao da imagem):
   - Lista de comentários com bolhas (componente local simples — não precisa do `ComentarioBubble` do PostDetalhe, mas estilo similar: avatar do autor colorido, nome, data, texto).
   - Composer com `RichTextEditor` (mesmo componente usado em PostDetalhe), botões de anexar imagem/arquivo/emoji/menção (visuais), e botão **Enviar** azul à direita com texto "Enter envia · Shift+Enter quebra".
   - Mantém `addComentario` existente.

---

## Mudanças técnicas

### Arquivo principal
**`src/components/demandas/DemandaDetalheDialog.tsx`** — reescrito:
- Remove `Tabs` e o grid de 4 selects superior.
- Mantém `Dialog` + `DialogContent` (max-w-4xl, scroll), mas o conteúdo interno passa a ser **dois `<Card>` empilhados** com a mesma estrutura/classes do `PostDetalhe` (linhas 132–399 e 402+).
- Reaproveita: `updateDemanda`, `addComentario`, `addAnexo`, `deleteDemanda`, `comentarios`, `anexos`, `historico` do `useDemandas`.
- Botão **Urgente** alterna `prioridade` entre `"Urgente"` e `"Normal"` (estilo `bg-amber-500` quando ativo, igual ao PostDetalhe).
- **Histórico**: vira um `<details>`/colapsável discreto no rodapé do Card 1 (ou removido daqui — pode ficar acessível pelo `HistoricoComentariosDialog` existente). Proposta: manter um botão pequeno "Ver histórico" que abre o dialog já existente, evitando poluir o layout.
- **Excluir** (admin): mantém o `AlertDialog` no canto superior direito do Card 1, ao lado do Status.

### Componentes reutilizados (sem alterar)
- `Card`, `CardHeader`, `CardContent`, `CardTitle` de `@/components/ui/card`.
- `RichTextEditor` e `RichTextView` de `@/components/`.
- `AvatarStack` de `@/components/AvatarStack`.
- `Popover`, `Checkbox`, `Select`, `Input`, `Textarea`, `Button`, `Label`.

### Bolhas de comentário
Componente inline simples no próprio arquivo (não justifica novo arquivo): avatar circular colorido com inicial do autor, nome + timestamp, `RichTextView` para o texto, suporte a `imagem_url` se houver. Não precisa editar/deletar nesta primeira versão (mantém paridade com o store atual de demandas).

### Tokens de design
Tudo via tokens semânticos (`bg-card`, `border-border`, `text-muted-foreground`, etc.) conforme a regra de Core Memory — sem cores hardcoded. O amarelo do botão Urgente segue o padrão já usado em PostDetalhe (`bg-amber-500`), mantendo consistência cross-módulo.

---

## Itens não incluídos (fora de escopo)
- Não altera o `DemandCard.tsx` (cards do Kanban) — só o **interior do dialog de detalhe**.
- Não altera o schema do banco nem o store `useDemandas`.
- Não adiciona campos novos à entidade `Demanda` que não existam hoje.

---

## Resultado esperado
Ao clicar em uma demanda em qualquer aba (Quadro, Calendário, Novas Solicitações, Minhas Demandas), o dialog aberto terá **a mesma identidade visual** do detalhe de Post do módulo Clientes: dois cards empilhados, header com Urgente + Status, grid de campos, anexos em thumbnails, briefing, e bloco de Atividade com editor rico — exatamente como na imagem de referência.