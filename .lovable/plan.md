# Adicionar "Excluir selecionados" nas demais abas do Projeto Completo

## Contexto
O componente `AreaTab` (usado pelas abas Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Urgências e Operacional) já implementa todo o fluxo de "Excluir selecionados" — barra de seleção, contador, modal de confirmação e chamada a `deleteDemanda`. O botão só aparece quando a prop `allowBulkDelete` é passada como `true`.

Hoje apenas a aba **Operacional** ativa essa prop (`allowBulkDelete={isAdmin}`). As demais 5 abas não passam a prop, então o botão fica oculto. A aba **Posts** (componente próprio `PostsKanbanCliente`) já mostra o botão sem restrição de admin.

## Mudança
Adicionar `allowBulkDelete` em cada uma das 5 chamadas de `AreaTab` em `src/pages/ProjetoCliente.tsx`, seguindo o mesmo padrão da aba Posts (sem restrição de admin), para manter consistência com o pedido do usuário.

### Arquivo: `src/pages/ProjetoCliente.tsx`
Adicionar `allowBulkDelete` nas instâncias de `AreaTab`:

- Linha ~291 — Vídeos
- Linha ~303 — Tráfego Pago
- Linha ~315 — LP / Site
- Linha ~327 — IA / Atendimento
- Linha ~348 — Urgências

Exemplo:
```tsx
<AreaTab
  titulo="Vídeos"
  icone={Video}
  clienteId={clienteId!}
  demandas={filtrarPorArea(demandasCli, "videos")}
  categoria="EditorVideo"
  demandaInicial={abaDemandaDeepLink === "videos" ? demandaDeepLink : null}
  allowBulkDelete
/>
```

## O que NÃO muda
- Nenhuma funcionalidade existente é removida.
- Nenhum dado existente é alterado (a exclusão continua manual, sob confirmação no modal já existente).
- `AreaTab.tsx`, `OperacionalTab.tsx` e o componente `PostsKanbanCliente` não são alterados.
- Lógica de seleção, popovers de status/datas/responsáveis e Kanban permanecem intactos.

## Pergunta opcional
A aba Operacional restringe a exclusão em massa a administradores (`isAdmin`). Quer manter as 5 novas abas **abertas** (igual Posts) ou também restringir a admin? Por padrão deste plano: aberto a todos, igual Posts.
