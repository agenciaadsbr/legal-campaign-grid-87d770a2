## Coluna "Posts" automática em Clientes

### 1. Store (`src/store/crm.ts`)
- Em `colunasPadrao`, adicionar nova coluna fixa:
  - `{ key: "posts", label: "Posts", visivel: true, fixa: true }` posicionada após `periodo_contrato` (antes de `ultimo_comentario`).
- Bumpar versão da persistência Zustand de `crm-juridico-v2` para `crm-juridico-v3` para forçar migração da estrutura de colunas no localStorage existente.

### 2. Renderização (`src/pages/Clientes.tsx`)
- No `CelulaValor`, tratar `col.key === "posts"`:
  - Buscar `contrato` do cliente em `state.contratos` (o mais recente/ativo).
  - Calcular a partir de `state.cards` filtrados pelo `contrato.id`:
    - `total` = `contrato.total_posts` (referência do contrato).
    - `postados` = cards com `status === "Postado"`.
    - `agendados` = cards com `status === "Agendar"`.
  - UI compacta em duas linhas (igual à imagem):
    - Linha 1: `{postados}/{total} postados` (fonte tabular, destaque).
    - Linha 2: `{agendados} agendados` (texto menor, `text-muted-foreground`).
  - Caso não haja contrato: exibir `—`.
- Reatividade: como os dados vêm direto do store via `useCRM`, a coluna se atualiza automaticamente sempre que cards mudarem de status no Kanban ou novos posts forem criados.

### 3. UX
- Tipografia tabular (`tabular-nums`) para alinhamento vertical perfeito dos números.
- Sem hex hardcoded — apenas tokens (`text-foreground`, `text-muted-foreground`).

### Resultado
Nova coluna "Posts" exibe automaticamente o progresso de cada cliente (postados/total e agendados), atualizando em tempo real conforme o status dos cards muda.