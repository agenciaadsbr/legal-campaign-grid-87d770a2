## Reduzir espaçamento horizontal entre colunas — /clientes

Manter quebras de linha atuais (posts e periodo_contrato continuam em duas linhas).

### `src/store/crm.ts`
Reduzir `largura` padrão das colunas:
- `nome_cliente`: → 200
- `responsaveis`: → 110
- `ultimo_comentario`: → 260
- `nicho`: → 130
- `status_cliente`: → 140
- `periodo_contrato`: → 150
- `posts`: → 130
- `observacoes`: → 200

### `src/pages/Clientes.tsx`
- Padding horizontal de `<th>`, `<td>` e cabeçalhos de grupo: `px-3` → `px-2`
- Em `CelulaValor` (`periodo_contrato`): largura do label `w-7` → `w-6`

### Não alterar
- Estrutura de duas linhas em `posts` e `periodo_contrato`
- Lógica de filtros, agrupamento, drag-and-drop
- Tipografia já otimizada anteriormente
