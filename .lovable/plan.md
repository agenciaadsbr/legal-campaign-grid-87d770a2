## Objetivo
Reposicionar o botão **"Ver projeto completo"** para ficar ao lado do botão **"Atividade"** (na mesma linha das abas Quadro/Atividade), em vez de ficar no topo direito do header.

## Arquivo afetado
- `src/pages/ClienteDetalhe.tsx`

## Mudanças

### 1. Remover o botão do header (linhas 457–461)
Hoje o botão fica num bloco `flex items-start justify-between` ao lado do título. Será removido daí, deixando o cabeçalho apenas com nome do cliente, status, nicho, contagem de posts e responsáveis.

### 2. Inserir o botão na barra de `TabsList` (linhas 464–468)
Envolver `TabsList` + botão em um wrapper `flex items-center justify-between` para que o botão apareça à direita, alinhado horizontalmente com as abas Quadro/Atividade:

```tsx
<Tabs defaultValue="quadro">
  <div className="flex items-center justify-between gap-2 flex-wrap">
    <TabsList>
      <TabsTrigger value="quadro">Quadro</TabsTrigger>
      <TabsTrigger value="atividade">Atividade</TabsTrigger>
    </TabsList>
    <Button variant="outline" size="sm" asChild>
      <Link to={`/clientes/${cliente.id}/projeto`}>
        <LayoutDashboard className="h-4 w-4 mr-1" /> Ver projeto completo
      </Link>
    </Button>
  </div>
  <TabsContent value="quadro" className="mt-4"><KanbanView /></TabsContent>
  <TabsContent value="atividade" className="mt-4"><AtividadeView /></TabsContent>
</Tabs>
```

### 3. Simplificar o header
Como nada mais ocupa o lado direito, trocar `flex items-start justify-between gap-4 flex-wrap` por um bloco simples (mantendo `flex-wrap` para responsividade).

## Garantias
- Nenhuma alteração de rota, comportamento ou Kanban.
- Botão mantém estilo, ícone e link `/clientes/:id/projeto`.
- Funciona em mobile (TabsList e botão quebram via `flex-wrap`).
