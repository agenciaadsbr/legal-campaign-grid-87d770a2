## Objetivo

Replicar na aba **Briefing** o mesmo comportamento aplicado na aba **Documentação**: quando o conteúdo do briefing for muito longo, o card deve ter uma barra de rolagem interna própria, sem empurrar a altura da página.

## O que muda

Apenas `src/components/projeto/BriefingTab.tsx`. Sem migrações, sem alterações de store.

### 1. Scroll interno no modo visualização

A `<div>` que renderiza `renderMensagemFormatada(documento)` (atualmente com `whitespace-pre-wrap break-words leading-relaxed`) recebe:

- `max-h-[600px]`
- `overflow-y-auto`
- `pr-2` (espaço para a barra não colar no texto)
- scrollbar discreta com tokens semânticos: `[&::-webkit-scrollbar]:w-1.5`, `[&::-webkit-scrollbar-thumb]:bg-border`, `[&::-webkit-scrollbar-thumb]:rounded-full`, `[&::-webkit-scrollbar-track]:bg-transparent`

O header do card (título "Briefing — {cliente}" + descrição) e a toolbar superior (Copiar / TXT / Editar) ficam **fora** do container scrollável, funcionando como header fixo — igual ao padrão da aba Documentação.

### 2. Modo edição

A `<Textarea>` já possui `min-h-[480px]` e rolagem nativa do próprio textarea. Para manter consistência e impedir crescimento exagerado, trocar `min-h-[480px]` por `h-[600px]` (altura fixa, com scroll interno do textarea).

### 3. Detalhes visuais

- Manter tokens semânticos do tema (`border-border`, `bg-card`, `text-foreground`) — nada hardcoded.
- Mantém compatibilidade com tema claro/escuro (azul escuro profundo no dark).
- Em telas menores o limite continua válido — o card permanece scrollável internamente.

## Arquivos afetados

- `src/components/projeto/BriefingTab.tsx` (apenas classes utilitárias em 2 pontos: div de visualização e Textarea de edição)

## Fora do escopo

- Outras abas (Documentação já foi feita; Planejamento/Área não foram pedidas).
- Mudanças de store, schema ou layout estrutural do card.
