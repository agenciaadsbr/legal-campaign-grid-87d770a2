## Adicionar filtros no topo da página "Clientes"

Conforme imagem de referência, adicionar dois filtros na barra superior da página `/clientes`.

### Arquivo: `src/pages/Clientes.tsx`

**1. Novos estados locais:**
- `filtroResponsaveis: string[]` — IDs dos responsáveis selecionados
- `apenasMinhas: boolean` — toggle "Minhas tarefas"
- `currentUserId` — primeiro responsável de `responsaveis` do store (placeholder até existir auth)

**2. Componente `FiltrosTopo`** (novo, no mesmo arquivo), renderizado na toolbar antes do botão "Colunas":

- **Botão "Filtrar por responsável"**:
  - `Popover` + `Button variant="outline"` com ícone `Filter` à esquerda.
  - Badge contador quando há seleção ativa.
  - Conteúdo do popover: lista de responsáveis com `Checkbox` (cor + nome).
  - Rodapé: botão "Limpar" (ghost) que zera o array.

- **Botão toggle "Minhas tarefas"**:
  - `Button variant={apenasMinhas ? "default" : "outline"}` com ícone `CheckCircle2`.
  - Texto "Minhas tarefas".
  - Mostra mini-avatar do `currentUser` à esquerda (usando estilo do `AvatarStack`).

**3. Lógica de filtragem** — atualizar o `useMemo` `filtrados`:
```ts
.filter(c => filtroResponsaveis.length === 0 || c.responsaveis.some(r => filtroResponsaveis.includes(r)))
.filter(c => !apenasMinhas || (currentUserId && c.responsaveis.includes(currentUserId)))
```

**4. Layout da toolbar:**
- Os filtros ficam agrupados à esquerda da toolbar superior (antes da busca), separados por `gap-2`.
- Em telas menores, mantém wrap natural via `flex-wrap`.

### Resultado
Toolbar com: `[Filtrar por responsável ▾] [✓ Minhas tarefas]  ...  [Busca] [Colunas] [Novo Cliente]`, idêntica à imagem de referência. Filtros combinam-se com a busca já existente.