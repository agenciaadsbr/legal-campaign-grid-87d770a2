## Problema

Em **Minhas Tarefas**, ao clicar no ícone de "abrir" (ExternalLink) de uma tarefa do tipo demanda, o usuário é levado a `/clientes/:id/projeto?tab=...&demanda=:id`, que abre o componente `DemandaDetalheDialog`.

Hoje esse dialog é renderizado com:

```
<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
```

Ou seja: largura até `max-w-4xl` (~896px) e altura até **90% da viewport**. Em telas grandes (ex.: 1875×1090) isso resulta em um modal gigantesco (~981px de altura) com barra de rolagem interna sempre visível, parecendo "esticado" e fora do padrão dos demais dialogs do sistema (que têm tamanho mais compacto e contido).

## Solução

Ajustar o `DialogContent` em `src/components/demandas/DemandaDetalheDialog.tsx` (linha 240) para um tamanho padrão e mais contido, semelhante aos outros dialogs do projeto, deixando que o conteúdo determine a altura natural — sem barra de rolagem global do modal — e usando rolagem interna **apenas** quando o conteúdo realmente exceder a tela.

### Mudanças

1. **`src/components/demandas/DemandaDetalheDialog.tsx`** (linha 240)
   - Trocar:
     ```
     max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6
     ```
   - Por algo como:
     ```
     max-w-3xl max-h-[85vh] overflow-y-auto p-4 md:p-5
     ```
   - Resultado:
     - Largura reduzida de `4xl` (896px) → `3xl` (768px), padrão mais compacto.
     - Altura levemente reduzida (`85vh`) e o `overflow-y-auto` mantido apenas como segurança (só aparecerá scroll se o conteúdo passar de ~85% da viewport, em vez de quase sempre).
     - Padding interno levemente reduzido em desktop para visual mais enxuto.

2. **`public/version.json`** — bump do timestamp para forçar recarga.

### Por que não mexer em mais nada

- O ícone clicado em Minhas Tarefas apenas faz `navigate(t.link)`; não há "formulário" novo a ajustar — o que aparece é o `DemandaDetalheDialog`. Ajustar o tamanho desse dialog resolve o problema relatado para todas as entradas (tabela, kanban, Minhas Tarefas).
- Os cards internos do dialog já têm seus próprios layouts; reduzir só o container externo é suficiente para evitar o "modal gigante com scrollbar".
