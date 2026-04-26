## Objetivo

No módulo **Demandas**, na aba **"Clientes"** (componente `ClientesDemandasTable`), adicionar duas novas colunas entre **"Responsáveis"** e **"Última atividade"**, replicando exatamente o comportamento do módulo Clientes:

1. **Último comentário** — texto truncado clicável que abre o histórico de comentários do cliente.
2. **Nicho** — `ColorBadge` colorido com o nicho cadastrado.

## Arquivos a alterar

### 1. `src/components/demandas/ClientesDemandasTable.tsx`

- **Imports adicionais**:
  - `ColorBadge` de `@/components/StatusBadge`
  - `HistoricoComentariosDialog` de `@/components/HistoricoComentariosDialog`
  - `useState` do React
  - `nichos` do hook `useCRM` (já importado)

- **Estado local**: `const [historicoClienteId, setHistoricoClienteId] = useState<string | null>(null);`

- **Header da tabela** — inserir entre `<TableHead>Responsáveis</TableHead>` e `<TableHead>Última atividade</TableHead>`:
  ```tsx
  <TableHead className="min-w-[180px]">Último comentário</TableHead>
  <TableHead>Nicho</TableHead>
  ```

- **Linhas** — para cada `clienteAtual`, calcular `nichoOpt = nichos.find(n => n.label === clienteAtual?.nicho)` e inserir, entre a célula de Responsáveis e a de Última atividade:
  ```tsx
  <TableCell className="text-xs">
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setHistoricoClienteId(l.cliente_id); }}
      className="text-left truncate max-w-[220px] hover:text-primary block"
      title={clienteAtual?.ultimo_comentario}
    >
      {clienteAtual?.ultimo_comentario || <span className="text-muted-foreground">—</span>}
    </button>
  </TableCell>
  <TableCell>
    {clienteAtual?.nicho && nichoOpt ? (
      <ColorBadge label={nichoOpt.label} color={nichoOpt.cor} />
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )}
  </TableCell>
  ```

- **Renderizar o dialog** ao final do componente (irmão do Card):
  ```tsx
  <HistoricoComentariosDialog
    clienteId={historicoClienteId}
    open={!!historicoClienteId}
    onOpenChange={(v) => !v && setHistoricoClienteId(null)}
  />
  ```

## Observações

- O dado `ultimo_comentario` já vem mapeado em `Cliente` no `crm.ts`, sem necessidade de query adicional.
- `nichos` já está disponível via `useCRM`.
- Mantém o padrão visual e comportamental idêntico ao módulo Clientes (mesma classe, mesmo `ColorBadge`, mesmo dialog).
- Nenhuma migração de banco é necessária.