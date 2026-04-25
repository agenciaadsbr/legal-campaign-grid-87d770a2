## Problema
No diálogo "Histórico de Comentários":
1. Texto longo aparece cortado / com tags HTML cruas (`<p>`, `<ul>`) visíveis, porque os comentários agora podem vir do `RichTextEditor` em HTML, mas o histórico ainda renderiza como texto puro.
2. Edição inline e composer usam `<Textarea>` simples — sem formatação consistente com `PostDetalhe`.

## Alterações em `src/components/HistoricoComentariosDialog.tsx`

### 1. Renderização (corrige o corte)
- Substituir o `<div className="text-sm mt-1 whitespace-pre-wrap break-words">{com.comentario_texto}</div>` por `<RichTextView content={com.comentario_texto} />`.
  - `RichTextView` já trata HTML (sanitização + prose) e texto puro legado (whitespace-pre-wrap), então comentários antigos continuam funcionando.
- Garantir contenção de overflow no item:
  - No wrapper externo do `ComentarioItem`, manter `flex gap-3` mas acrescentar `min-w-0` no `flex-1` (já existe) e `overflow-hidden` no container do texto para evitar estouro horizontal.

### 2. Editor inline (edição de comentário existente)
- Substituir o `<Textarea>` da edição pelo `<RichTextEditor value={texto} onChange={setTexto} onEnterSubmit={salvar} minHeight="min-h-[60px]" />`.
- Remover `onKeyDown` manual (Enter/Escape) — o `onEnterSubmit` cobre o envio; manter botões Salvar/Cancelar.

### 3. Composer (novo comentário)
- Substituir o `<Textarea>` pelo `<RichTextEditor value={novo} onChange={setNovo} onEnterSubmit={enviar} placeholder="Escreva um comentário..." minHeight="min-h-[44px]" className="border-0 shadow-none" />`.
- Manter a barra de ações (anexar imagem, emoji desabilitado, etc.) e o botão Enviar.
- Ajustar `enviar()` para não depender de `novo.trim()` direto (HTML pode ter `<p></p>`); usar:
  ```ts
  const isEmpty = !novo || novo === "<p></p>" || !novo.replace(/<[^>]+>/g, "").trim();
  if ((isEmpty && !imagemUrl) || !clienteId) return;
  ```
- Mesmo critério no `disabled` do botão Enviar.

### 4. Layout do diálogo (centralização e largura)
- `DialogContent`: manter `max-w-2xl p-0 gap-0`, adicionar `w-[95vw]` para responsividade.
- `ScrollArea`: adicionar `w-full` e usar `px-3` para que o conteúdo respire e fique centralizado dentro do diálogo.
- No `ComentarioItem`, envolver o bloco de conteúdo com `min-w-0 overflow-hidden` para que `break-words` do `RichTextView` funcione corretamente dentro do flexbox.

## Resultado esperado
- Comentários com formatação (negrito, listas, caixa alta) renderizam corretamente sem mostrar HTML cru.
- Texto longo quebra linha corretamente, sem corte horizontal.
- Edição e criação de comentários no histórico ganham o mesmo editor rico usado em `PostDetalhe`, garantindo consistência em todo o sistema.
- Layout centralizado e responsivo.

## Arquivos afetados
- `src/components/HistoricoComentariosDialog.tsx` (único arquivo)

Sem novas dependências (TipTap e DOMPurify já instalados na etapa anterior).