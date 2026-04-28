## Objetivo

Adicionar um botão padronizado **"← Voltar para Visão Geral"** no topo de cada card de detalhe de tarefa (todas as abas do Projeto Completo do cliente), permitindo retornar rapidamente ao Kanban da aba sem precisar clicar no X do dialog ou usar o breadcrumb.

## Escopo

Cobre os dois tipos de detalhe que existem no hub:

1. **`DemandaDetalheDialog`** (modal) — usado em Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Briefing, Planejamento, Atividades, Demandas em geral.
2. **`PostDetalhe`** (página `/posts/:postId`) — usado quando o usuário abre um card da aba **Posts**.

## Mudanças

### 1. `src/components/demandas/DemandaDetalheDialog.tsx`
Adicionar uma barra fina no topo do `DialogContent`, antes do primeiro Card:

```text
┌─ Dialog ──────────────────────────────────┐
│ ← Voltar para Visão Geral            [X]  │
├───────────────────────────────────────────┤
│ TÍTULO DA TAREFA                          │
│ ...                                        │
```

- Botão `variant="ghost"` `size="sm"` com ícone `ArrowLeft`.
- `onClick` chama `onOpenChange(false)` (fecha o dialog → usuário volta ao Kanban onde já estava).
- Texto: "Voltar para Visão Geral".

### 2. `src/pages/PostDetalhe.tsx`
No topo da página (acima ou abaixo do breadcrumb existente), adicionar o mesmo botão padronizado:

- Usa `useNavigate` + `useLocation` para fazer `navigate(-1)` quando houver histórico, com fallback para `/clientes/{clienteId}` (Projeto Completo, aba Posts).
- Mesmo visual e label do dialog ("← Voltar para Visão Geral") para padronização.

### 3. Componente compartilhado `VoltarVisaoGeralButton`
Criar `src/components/projeto/VoltarVisaoGeralButton.tsx` para garantir padronização visual:

- Props: `onClick: () => void`, `className?: string`.
- Renderiza `<Button variant="ghost" size="sm">` com `ArrowLeft` + texto.
- Usa apenas tokens semânticos (`text-muted-foreground hover:text-foreground`).

Reutilizado em ambos os arquivos acima.

## Detalhes técnicos

- Sem mudança no banco, sem mudança no `ProjetoKanban`, sem mudança nos cards do Kanban (`DemandCard`).
- O X de fechar do dialog continua funcionando normalmente.
- O breadcrumb existente do `PostDetalhe` não é removido — o botão é adicional, mais visível e padronizado.
- Cores: somente tokens semânticos (memória do projeto exige isso).

## Resultado visual

```text
DemandaDetalheDialog (Vídeos, Tráfego, LP, IA, Briefing, Planejamento):
┌──────────────────────────────────────┐
│ ← Voltar para Visão Geral       [X] │
│ ──────────────────────────────────── │
│  TÍTULO DA TAREFA                    │
│  Criar Post                          │
│  ...                                  │
└──────────────────────────────────────┘

PostDetalhe (aba Posts):
Clientes/Posts › Alex Medeiros › Criar Post
← Voltar para Visão Geral
┌──────────────────────────────────────┐
│  TÍTULO DA TAREFA                    │
│  ...                                  │
└──────────────────────────────────────┘
```
