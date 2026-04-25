# Reestruturação do "Post Detalhe" + sincronização com "Últimos Comentários"

## 1. Store (`src/store/crm.ts`)
- Adicionar campo `link_meister?: string` na interface `Post`.
- Bump da chave de persistência: `crm-juridico-v4` → `crm-juridico-v5` para garantir migração suave.
- A lógica `addComentario` / `updateComentario` / `deleteComentario` já recalcula `ultimo_comentario` do cliente via `computeUltimoComentario`. **Manter como está** — basta usar do PostDetalhe para o sync automático na coluna "Últimos Comentários" funcionar.

## 2. Persistência de imagens (anexos + comentários)
Hoje os arquivos são salvos como `URL.createObjectURL(f)` (blob temporário que quebra ao recarregar).
- Substituir por **dataURL (base64)** via `FileReader.readAsDataURL` em:
  - `PostDetalhe.tsx` → `addAnexo` (anexos do post)
  - `PostDetalhe.tsx` → `onPickImg` (preview do comentário)
- Assim as imagens persistem no localStorage do Zustand e ficam visíveis após reload.

## 3. UI — `src/pages/PostDetalhe.tsx` (refatoração do bloco em vermelho)
Seguindo a referência enviada (estilo Discord/chat moderno):

### Cabeçalho do post
- Manter título editável + select de status.
- Adicionar **novo input "Link do Meister"** (clicável quando preenchido) ao lado de "Link do Meta", em grid de 2 colunas dentro da seção de links.

### Card "Anexos"
- Trocar lista textual por **grid de thumbnails 80x80** (rounded, border).
- Cada thumb com botão `X` (hover) para remover.
- Botão "Adicionar anexo" com ícone `Paperclip` no canto superior direito.
- Se o anexo for imagem (mime/url), exibe preview; caso contrário, ícone genérico + nome.

### Card "Legenda"
- Textarea expandida + **contador de caracteres** no rodapé direito.
- Indicador "✓ Salvo" sutil (debounce 500ms via `setTimeout`).

### Card "Atividade" (chat)
- Lista de comentários com:
  - Avatar colorido do autor (já existe).
  - Bubble com nome + timestamp + texto + imagem (se houver).
  - Hover mostra ações (editar/excluir) → usa `updateComentario` / `deleteComentario`.
- **Composer redesenhado** (estilo Discord):
  - Container `rounded-xl border` com fundo `bg-muted/30`.
  - Botão `+` à esquerda → abre input file (imagem).
  - Textarea sem borda, auto-resize, placeholder "Mensagem...".
  - Preview da imagem anexada inline acima do textarea, com botão X.
  - Botão `Send` à direita (ícone roxo/primary), Enter = enviar, Shift+Enter = quebra.
- Ao enviar `addComentario({ post_id, ... })`, a store já propaga `ultimo_comentario` para o cliente — a coluna "Últimos Comentários" da tabela `/clientes` atualiza automaticamente em tempo real (Zustand reatividade).

## 4. Sincronização garantida
- Cada `addComentario` / `updateComentario` / `deleteComentario` chama `computeUltimoComentario` → atualiza `clientes[].ultimo_comentario`.
- A `Clientes.tsx` já lê `ultimo_comentario` do cliente via `useCRM()` → re-renderiza automaticamente.
- Imagens em base64 ficam no `localStorage` (persist), portanto sobrevivem ao reload.

## Arquivos editados
- `src/store/crm.ts` — adicionar `link_meister`, bump versão.
- `src/pages/PostDetalhe.tsx` — refatoração completa do layout + persistência base64.

Nenhuma quebra de dados existentes (campo opcional, lógica de comentários inalterada).