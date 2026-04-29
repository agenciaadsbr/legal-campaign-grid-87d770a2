## Objetivo

Aplicar o mesmo padrão visual da "Mensagem completa" (caixa interna com borda, fundo suave e barra de rolagem própria) aos cards individuais dos blocos **Links importantes, Reuniões, Documentos e Observações** dentro da aba **Documentação**, para que observações longas não estiquem o card nem a página.

## Situação atual

- A lista de itens de cada bloco já tem scroll interno (`max-h-[420px] overflow-y-auto`) — mantida como está.
- O `MensagemAcessosCard` (usado em Acessos / Materiais) já tem a caixa interna scrollável (`max-h-[320px]`, scrollbar custom) — referência visual.
- O `ItemCard` (usado em Links, Reuniões, Documentos, Observações) renderiza `item.observacao` em uma `<div>` simples (linhas 524-528), sem limite de altura nem caixa visual. Textos grandes esticam o card.

## Mudança proposta

Apenas em `src/components/projeto/DocumentacaoTab.tsx`, no componente `ItemCard` (linhas ~524-528).

Trocar o bloco atual:

```tsx
{item.observacao && (
  <div className="text-[11px] text-muted-foreground border-t border-border pt-1.5 whitespace-pre-wrap">
    {item.observacao}
  </div>
)}
```

por uma caixa interna no mesmo padrão visual do `MensagemAcessosCard`:

- Container com `border border-border`, `rounded-md`, `bg-muted/30`, padding `p-2.5`.
- `max-h-[200px]` + `overflow-y-auto` para scroll interno (altura menor que o card de Mensagem porque aqui é uma observação secundária dentro de um card já compacto).
- Scrollbar customizada com tokens semânticos:
  - `[&::-webkit-scrollbar]:w-1.5`
  - `[&::-webkit-scrollbar-track]:bg-transparent`
  - `[&::-webkit-scrollbar-thumb]:bg-border`
  - `[&::-webkit-scrollbar-thumb]:rounded-full`
  - `hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40`
- Mantém `whitespace-pre-wrap break-words` para preservar quebras e quebrar URLs longas.
- Tipografia `text-[11px] text-muted-foreground leading-relaxed`.

Como o `ItemCard` é usado por todos os blocos exceto Acessos/Materiais (que usam o `MensagemAcessosCard`), essa única alteração já cobre Links importantes, Reuniões, Documentos e Observações automaticamente.

## Fora do escopo

- Acessos e Materiais (já usam `MensagemAcessosCard` com o padrão).
- Outras abas (Briefing, Planejamento, Área).
- Mudanças de store, schema ou layout do bloco/lista.

## Arquivos afetados

- `src/components/projeto/DocumentacaoTab.tsx` (apenas o trecho da observação dentro de `ItemCard`).
