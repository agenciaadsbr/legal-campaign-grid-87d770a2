## Objetivo
Mover os botões **Todas / Hoje / Atrasadas / Semana** para a mesma linha das abas (Clientes, Quadro Geral, Minhas Demandas, Novas Solicitações, Calendário, Relatórios), alinhados à direita — conforme a seta vermelha do print.

## Alterações em `src/pages/Demandas.tsx`

### 1. Remover do Card de filtros
Excluir o bloco (linhas 162–174) com os botões rápidos. A barra superior fica apenas com: busca, selects, Rápida e Nova Demanda.

### 2. Reposicionar ao lado da TabsList
Envolver `<TabsList>` em um wrapper flex e renderizar os botões à direita:
```tsx
<div className="flex items-center justify-between gap-2 flex-wrap">
  <TabsList>
    <TabsTrigger value="clientes">Clientes</TabsTrigger>
    {/* ... demais triggers ... */}
  </TabsList>
  <div className="flex gap-1">
    {(["todas","hoje","atrasadas","semana"] as FiltroRapido[]).map((f) => (
      <Button
        key={f}
        size="sm"
        variant={fRapido === f ? "default" : "outline"}
        onClick={() => setFRapido(f)}
        className="capitalize"
      >
        {f}
      </Button>
    ))}
  </div>
</div>
```

O estado `fRapido` / `setFRapido` permanece o mesmo — apenas o local de renderização muda. Nenhuma outra lógica é afetada.