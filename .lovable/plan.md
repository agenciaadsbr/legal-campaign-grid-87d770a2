## Editor rico para "Atividade" nos cards

### Problema
No `PostDetalhe.tsx`, o campo "Atividade" usa `<Textarea>` puro. Quando o usuário cria listas com `•` ou quebras de linha, a renderização fica desalinhada (bullets em uma linha, texto em outra), e não há suporte para negrito, itálico, caixa alta etc.

### Dependências a instalar
- `@tiptap/react`
- `@tiptap/starter-kit` (já inclui Bold, Italic, Strike, BulletList, OrderedList, ListItem, History)
- `@tiptap/extension-underline`
- `dompurify` + `@types/dompurify`

### Novos componentes

**`src/components/RichTextEditor.tsx`**
- Componente controlado (`value: string`, `onChange: (html: string) => void`, `placeholder?: string`).
- Toolbar com botões (ícones do `lucide-react`):
  - **B** Bold, *I* Italic, U Underline, ~~S~~ Strike
  - Lista com marcadores, lista numerada
  - **AA** CAIXA ALTA (transforma a seleção em uppercase via `editor.chain().focus().command(({tr, state}) => { ... }).run()` ou substitui o texto selecionado)
  - aa minúscula (opcional, mesma lógica)
  - Desfazer / Refazer
- Estilizado com tokens semânticos (`bg-card`, `border-border`, `text-foreground`); botão ativo usa `bg-accent`.
- Área editável com classe `prose prose-sm dark:prose-invert max-w-none min-h-[80px] p-3` para listas/negrito renderizarem corretamente.

**`src/components/RichTextView.tsx`**
- Recebe `content: string`.
- Detecta se é HTML (regex `/<[a-z][\s\S]*>/i`); se for, sanitiza com `DOMPurify.sanitize` e injeta via `dangerouslySetInnerHTML` dentro de um `div` com classe `prose prose-sm dark:prose-invert max-w-none`.
- Se for texto puro (comentários antigos), renderiza com `whitespace-pre-wrap` preservando a compatibilidade.

### Integração em `src/pages/PostDetalhe.tsx`
- **Compositor de comentário** (textarea principal de "Atividade"): substituir `<Textarea>` por `<RichTextEditor>`.
- **Bolhas de comentários existentes**: trocar render de texto puro por `<RichTextView content={c.texto} />`.
- **Edição inline** de comentário: trocar `<Textarea>` por `<RichTextEditor>`.
- O store (`crm.ts`) continua salvando `texto: string` — não exige migração; legados renderizam como texto puro.

### Estilos
- Garantir que `tailwindcss/typography` esteja disponível. Se não estiver, instalar `@tailwindcss/typography` e adicionar ao `plugins` do `tailwind.config.ts`. Caso contrário, definir estilos manuais (`[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline`) no wrapper do editor e do viewer — abordagem preferida para evitar nova dependência de plugin Tailwind.

### Preservado
- Estrutura de comentários, histórico, responsáveis, store.
- Tema dark azul profundo (tokens semânticos em todos os controles novos).
