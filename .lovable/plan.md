## Problema

Ao abrir "Detalhes da tarefa" pelo ícone de atalho em **Minhas Tarefas**, o conteúdo do dialog fica cortado na base (campo "Atividade / Briefing" e o composer de comentários ficam parcialmente invisíveis), porque não há barra de rolagem para o conteúdo total.

## Causa

Em `src/components/demandas/DemandaDetalheDialog.tsx` (linha 340), o `DialogContent` está configurado com `max-h-[90vh] overflow-hidden flex flex-col`. Dentro dele:

- O **Card 1** (informações + anexos + briefing) usa `shrink-0` → cresce livremente conforme conteúdo.
- O **Card 2** (Atividade/comentários) usa `flex-1 min-h-0` com scroll interno.

Quando o Card 1 é alto (vários anexos, briefing longo), ele "empurra" o Card 2 e ultrapassa o limite do dialog. Como o `DialogContent` está `overflow-hidden`, o excesso é cortado e o usuário não consegue rolar.

## Correção

Em `src/components/demandas/DemandaDetalheDialog.tsx`:

1. Manter o botão "Voltar para Visão Geral" fixo no topo (`shrink-0`).
2. Envolver os dois cards (Card 1 + Card 2) em um container `flex-1 min-h-0 overflow-y-auto` para que todo o corpo do dialog ganhe uma única barra de rolagem vertical.
3. Remover o scroll interno separado do Card 2 (o composer de comentários e a lista passam a rolar junto com o restante), e tirar `flex-1 / min-h-0 / overflow-hidden` que forçavam altura fixa nesse card.
4. Ajustar o `DialogContent` para continuar com `max-h-[90vh]` e `flex flex-col`, mas o `overflow-hidden` permanece apenas para conter os cantos arredondados — o scroll real fica no wrapper interno.

## Fora de escopo

- Nenhuma mudança de regra de negócio, dados, filtros ou outros módulos.
- Layout, paddings, cores e tipografia preservados.
