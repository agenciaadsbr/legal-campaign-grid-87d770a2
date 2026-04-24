## Histórico Interativo de Comentários (estilo ClickUp)

### 1. Atualizar Store (`src/store/crm.ts`)
- Adicionar ações:
  - `updateComentario(id, patch)` — edita texto/anexos de um comentário existente.
  - `deleteComentario(id)` — remove comentário.
- Criar helper interno `recomputeUltimoComentario(clienteId)` que recalcula o campo `ultimo_comentario` do cliente com base no comentário mais recente (direto + de posts vinculados). Chamar após add/update/delete.

### 2. Novo componente `src/components/HistoricoComentariosDialog.tsx`
- Props: `clienteId`, `open`, `onOpenChange`.
- Layout (usando `Dialog` + `ScrollArea`):
  - Header: "Histórico de Comentários — {nome do cliente}".
  - Lista cronológica (mais recente no topo) mesclando comentários diretos do cliente e de posts vinculados, com badge indicando origem ("Direto" ou nome do post).
  - Cada item: avatar/autor, data formatada pt-BR, texto, anexos (se houver), e ações no hover: **Editar** e **Excluir**.
  - Edição inline: troca o texto por `Textarea`; salvar com botão ou `Ctrl+Enter`; cancelar com `Esc`.
  - Exclusão: confirmação via `AlertDialog`.
  - Composer fixo no rodapé: `Textarea` + botão "Adicionar comentário" (cria comentário direto no cliente).
- Toasts de sucesso via `sonner` para criar/editar/excluir.

### 3. Integração na tabela (`src/pages/Clientes.tsx`)
- No `CelulaValor`, quando `col.key === "ultimo_comentario"`:
  - Renderizar como `<button>` clicável (estilo link/hover) que abre o `HistoricoComentariosDialog`.
  - Usar `e.stopPropagation()` para não disparar o clique da linha (que abre o detalhe).
  - Mostrar preview do último comentário (truncado) ou "Adicionar comentário" se vazio.
- Estado local na página: `historicoClienteId: string | null` controla qual diálogo está aberto.

### 4. UX
- Confirmação de exclusão obrigatória.
- Atalhos: `Ctrl+Enter` envia/salva; `Esc` cancela edição.
- Lista atualiza reativamente via Zustand após cada ação.

### Resultado
Clicar em "Últimos Comentários" na tabela abre um modal completo onde o usuário visualiza todo o histórico do cliente, podendo adicionar, editar e excluir comentários sem sair da página.