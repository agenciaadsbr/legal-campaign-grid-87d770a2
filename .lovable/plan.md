## Consolidar "Post do Mês" em uma única seção

### Objetivo
Mesclar os cards **Cabeçalho/Dados**, **Anexos** e **Legenda** em um único `Card` "Post do Mês". O card de **Atividade** permanece separado abaixo. Anexos e legenda devem ser visualizados imediatamente após salvos no formato da imagem de referência.

### Arquivo: `src/pages/PostDetalhe.tsx`

**1. Card único "Post do Mês"** (substitui os 3 cards atuais — linhas 127–292):
- `CardHeader`: título editável (Input borderless) + meta info (Mês/Semana) à esquerda; `Select` de status à direita.
- `CardContent` com 3 sub-blocos separados por divider sutil (`border-t pt-4`):
  
  **a) Dados do post** — grid 2 colunas:
  - Data agendamento, Data postagem
  - Link do Meta (com botão `ExternalLink`)
  - Link do Meister (com botão `ExternalLink`)
  - Responsáveis (col-span-2) com `AvatarStack`
  
  **b) Anexos** — sub-bloco com label "Anexos":
  - Grid de thumbnails **72x72** (`h-[72px] w-[72px]`) com cantos arredondados (`rounded-lg`), conforme imagem de referência.
  - Cada thumbnail: imagem `object-cover` ou ícone `FileText` + nome truncado para não-imagens.
  - Hover mostra botão `X` no canto para remover.
  - Após o último thumbnail, botão ghost **"+ Adicionar anexo"** (mesmo tamanho 72x72, borda tracejada `border-dashed`) que abre o file picker.
  - Estado vazio: apenas o tile "+ Adicionar anexo" visível.
  - Anexos salvos em **base64 (dataURL)** já implementado — persistem após reload e aparecem instantaneamente.
  
  **c) Legenda** — sub-bloco com label "Legenda" + indicador "✓ Salvo" alinhado à direita:
  - Textarea (5 linhas), contador de caracteres no rodapé.
  - Indicador "✓ Salvo" debounced (1.5s) já implementado, reaproveitado.

**2. Card "Atividade"** — mantém-se separado (linhas 294–377), sem alterações.

**3. Sem alterações no store**: `Post.anexos`, `Post.legenda`, `Post.link_meister` já existem.

### Resultado
- 2 cards no total (antes: 4): "Post do Mês" unificado + "Atividade".
- Anexos e legenda visíveis imediatamente após salvar (já são reativos via Zustand).
- Layout idêntico à imagem enviada: thumbnails compactos quadrados + tile "+ Adicionar anexo".
