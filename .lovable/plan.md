## Objetivo

Na aba **Documentação**, quando um bloco (Acessos, Materiais, Documentos, etc.) tiver muito conteúdo — especialmente as "Mensagens completas" do Acessos/Materiais com textos longos — o card está crescendo verticalmente e empurrando a altura da página inteira.

Vamos limitar a altura interna do conteúdo de cada card e adicionar uma **barra de rolagem própria dentro do card**, semelhante à coluna "Finalizados" mostrada na imagem de referência (lista interna scrollável, header fixo).

## O que muda

Apenas o arquivo `src/components/projeto/DocumentacaoTab.tsx`. Sem migrações, sem alterações de store.

### 1. Scroll interno do bloco (todos os cards da grid)

No `<CollapsibleContent>` de cada bloco (linhas ~259-329), envolver a lista de itens (`grid grid-cols-1 gap-2`) num container com:

- `max-h-[420px]` (altura confortável para ~3-4 cards em telas grandes)
- `overflow-y-auto`
- `pr-1` (espaço para a barra de rolagem não colar no conteúdo)
- classes utilitárias para deixar a scrollbar mais discreta no tema escuro (`scrollbar-thin` via tailwind arbitrary, ou estilo custom usando `[&::-webkit-scrollbar]:w-1.5` etc., usando tokens semânticos `bg-border` para o thumb)

A toolbar interna do bloco (botões "Adicionar item", "Adicionar em lote", "Copiar mensagem") **fica fora** do container scrollável, funcionando como header fixo do card — igual ao topo "Finalizados" na imagem.

### 2. Scroll interno da Mensagem completa (MensagemAcessosCard)

Na `MensagemAcessosCard` (linhas ~1063-1101), a `<div>` que renderiza o texto formatado (linha 1096) também recebe limite de altura:

- `max-h-[320px]`
- `overflow-y-auto`
- mesmas classes de scrollbar discreta

Assim, mesmo se a mensagem completa for muito longa (caso típico do bloco Acessos / Materiais com vários sites), o card mantém altura controlada e o usuário rola dentro dele.

### 3. Detalhes visuais

- Manter o `Collapsible` funcionando — o `max-height` só se aplica quando o bloco está aberto.
- Usar tokens semânticos do tema (`border-border`, `bg-card`, `bg-muted/30`) já presentes no componente. Nada de cores hardcoded.
- Em telas pequenas (mobile) os limites continuam válidos — o card ainda fica scrollável internamente.

## Arquivos afetados

- `src/components/projeto/DocumentacaoTab.tsx` (apenas classes utilitárias adicionadas em 2 pontos)

## Fora do escopo

- Briefing, Planejamento e outras abas (não foi pedido).
- Mudança no esquema de dados ou store.
- Mudança na altura/layout dos cards individuais (`ItemCard`) — apenas a lista que os contém ganha scroll.
