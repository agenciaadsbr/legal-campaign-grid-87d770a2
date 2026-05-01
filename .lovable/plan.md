## Permitir quebra de linha nas colunas "Cliente" e "Último comentário"

Em `src/components/clientes/ClientesGeralTable.tsx`:

### 1. Título "Último comentário" (linha 275)
Quebrar em duas linhas, igual aos títulos das colunas de alerta:
```tsx
<TableHead className="min-w-[160px]">
  <div className="leading-tight">
    <div>Último</div>
    <div>comentário</div>
  </div>
</TableHead>
```

### 2. Nome do cliente (linhas 417–424)
Hoje o `<Link>` usa `truncate`, cortando o nome com "…". Trocar por quebra de linha natural:
```tsx
<TableCell className="min-w-[200px] max-w-[260px]">
  <Link
    to={`/clientes/${cliente.id}`}
    className="text-primary text-xs font-medium hover:underline break-words leading-snug block"
  >
    {cliente.nome_cliente}
  </Link>
</TableCell>
```
Remover `truncate`, adicionar `break-words` + `leading-snug` + `block`, e colocar `max-w` na célula para forçar a quebra.

### 3. Texto "Último comentário" (linhas 428–442)
Hoje o `<button>` usa `truncate max-w-[220px]`, cortando o texto. Substituir por clamp de 2 linhas:
```tsx
<TableCell className="text-xs max-w-[240px]">
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onAbrirHistorico?.(cliente.id); }}
    className="text-left hover:text-primary line-clamp-2 break-words leading-snug w-full"
    title={cliente.ultimo_comentario}
  >
    {cliente.ultimo_comentario || <span className="text-muted-foreground">—</span>}
  </button>
</TableCell>
```
`line-clamp-2` mostra até 2 linhas (mantém compacto e evita linhas muito longas), com `break-words` para quebrar palavras longas.

### 4. Bump em `public/version.json`

### Resultado
- Título "Último comentário" em duas linhas, ocupando menos largura horizontal.
- Nomes longos de clientes quebram em várias linhas em vez de cortar com "…".
- Comentários longos exibem até 2 linhas, com tooltip nativo (`title`) mantendo o texto completo.