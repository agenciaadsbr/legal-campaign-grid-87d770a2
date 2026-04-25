## Refatorar "Histórico de Comentários" (acessado via "Últimos Comentários")

### Objetivo
Quando o usuário clicar em "Últimos Comentários" na coluna da tabela de Clientes, o dialog que abrir deve ter a interface completa de "Atividade" (estilo Discord), idêntica à usada em `PostDetalhe.tsx`, com TODAS as funcionalidades.

### Arquivo: `src/components/HistoricoComentariosDialog.tsx`

**Composer (caixa de novo comentário)**:
- Layout `rounded-xl` com borda sutil, fundo `bg-background`
- Textarea transparente (`border-0 focus-visible:ring-0`), placeholder "Escreva um comentário..."
- Toolbar inferior com ícones: `Plus` (anexar), `ImageIcon`, `Smile`, `AtSign` à esquerda
- Botão "Enviar" com ícone `Send` à direita
- Tecla **Enter** envia; **Shift+Enter** quebra linha (atualizar lógica atual que usa Ctrl+Enter)
- Texto auxiliar "Enter para enviar • Shift+Enter para nova linha"

**Anexos de imagem**:
- Input file oculto acionado pelos botões `Plus`/`ImageIcon`
- Conversão para **base64 (dataURL)** para persistir após reload (mesmo padrão do PostDetalhe)
- Preview em grid de thumbnails (60x60) acima do textarea, cada um com botão `X` para remover antes de enviar
- Ao enviar, salvar no campo `imagem_url` do comentário

**Lista de comentários**:
- Manter visual atual (avatar + nome + data + badge "Direto"/"Post: ...")
- Manter edição inline e exclusão com `AlertDialog`
- Garantir que `imagem_url` seja exibida com preview clicável (abre em nova aba)
- Ordenar do mais recente para o mais antigo (já está)

**Sincronização**:
- `addComentario`, `updateComentario`, `deleteComentario` do store já chamam `computeUltimoComentario`
- Garantir que comentários adicionados aqui apareçam imediatamente na coluna "Últimos Comentários" da tabela de Clientes (já funciona via Zustand reactive store)

### Sem alterações em outros arquivos
O store `src/store/crm.ts` já suporta `imagem_url` em `Comentario` e já recomputa `ultimo_comentario` automaticamente. Nenhuma mudança de schema necessária.