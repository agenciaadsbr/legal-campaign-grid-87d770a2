## Objetivo
1. Mover os botões **Rápida** e **Nova Demanda** do cabeçalho para dentro da barra de filtros, posicionados imediatamente após o filtro "Todos os status" (e antes dos botões rápidos `todas / hoje / atrasadas / semana`).
2. Centralizar os títulos das colunas de status no Kanban (`Quadro Geral`) para que fiquem totalmente legíveis dentro de cada seção.

## Alterações

### 1) `src/pages/Demandas.tsx`
- **Remover** o bloco de botões do header (linhas 110–117), mantendo apenas o título e a descrição. O cabeçalho ficará mais limpo.
- **Inserir** os mesmos botões dentro do `CardContent` dos filtros, logo após o `<Select>` de Status (linha 163) e antes do bloco `flex gap-1 ml-auto` dos filtros rápidos. Manter `size="sm"` e altura `h-9` para alinhar com os selects.
- Ajustar o agrupamento para que `Rápida` + `Nova Demanda` fiquem juntos em um wrapper `flex gap-1.5`, e os botões rápidos continuem encostados à direita via `ml-auto`.

```tsx
<Button variant="outline" size="sm" className="h-9" onClick={() => setRapidaOpen(true)}>
  <Zap className="h-4 w-4 mr-1" /> Rápida
</Button>
<Button size="sm" className="h-9" onClick={() => setNovaOpen(true)}>
  <Plus className="h-4 w-4 mr-1" /> Nova Demanda
</Button>
```

### 2) `src/components/demandas/DemandasKanban.tsx`
- Centralizar o cabeçalho de cada coluna (linhas 42–55):
  - Trocar `flex items-center justify-between` por um layout centralizado (`flex flex-col items-center` ou `justify-center` com contador discreto ao lado).
  - Garantir que `STATUS_DEMANDA_LABEL[status]` use `text-center` e `whitespace-nowrap` para ser legível.
  - Manter o ponto colorido + label + contador, mas alinhados ao centro da coluna.

Estrutura proposta:
```tsx
<div className="flex items-center justify-center gap-2 mb-2 px-1">
  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DEMANDA_COR[status] }} />
  <span className="text-xs font-semibold uppercase tracking-wide text-center">
    {STATUS_DEMANDA_LABEL[status]}
  </span>
  <span className="text-[10px] text-muted-foreground bg-background rounded px-1.5 py-0.5">
    {items.length}
  </span>
</div>
```

## Resultado esperado
- Cabeçalho da página "Demandas" mostra apenas título/descrição.
- Barra de filtros passa a conter, na sequência: Buscar · Cliente · Responsável · Categoria · Prioridade · Status · **Rápida · Nova Demanda** · (à direita) todas/hoje/atrasadas/semana.
- No "Quadro Geral", os nomes dos status (Planejamento, Criar, Revisar, Entregue, Concluído, Atrasado) ficam centralizados em cada coluna e totalmente visíveis.
- Nenhuma outra funcionalidade é alterada.
