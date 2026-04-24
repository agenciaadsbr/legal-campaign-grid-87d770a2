# Edição e remoção de Nichos e Status do Cliente

## 1. Store (`src/store/crm.ts`)

Adicionar à interface `State` e implementar as ações:

- `updateNicho(oldLabel, patch)` → renomeia/recolore. Se label mudou, atualiza `clientes[].nicho` correspondentes. Retorna nº de clientes afetados.
- `deleteNicho(label)` → remove da lista; limpa `clientes[].nicho` em quem usava. Retorna nº de clientes afetados.
- `updateStatusOption(oldLabel, patch)` → idem para `statusOptions`, atualiza `clientes[].status_cliente`.
- `deleteStatusOption(label)` → remove e limpa `clientes[].status_cliente` (vira string vazia / "Pausado" como fallback seguro). Retorna nº afetados.

Validações dentro das ações: ignorar label vazio; não permitir duplicados (retorna -1 como sinal).

## 2. UI (`src/pages/Configuracoes.tsx`)

Criar componente reutilizável `OpcoesEditor` usado pelos cards de **Nichos** e **Status do Cliente**:

- Renderiza cada opção como linha com:
  - Swatch de cor (input `type="color"` quando em edição)
  - Input de label
  - Botões: **Editar** (lápis) → entra em modo edição inline; **Salvar** (check) e **Cancelar** (X) durante edição; **Excluir** (lixeira) com `AlertDialog` de confirmação informando quantos clientes serão afetados.
- Atalhos: `Enter` salva, `Esc` cancela.
- Toasts via `sonner` em todas as ações ("Nicho atualizado", "Status removido — N clientes afetados", erro de duplicado, etc.).
- Mantém o formulário "Adicionar novo" existente abaixo da lista.

## 3. Detalhes de UX

- Cores em edição via `<input type="color">` pequeno ao lado do label.
- Itens fixos não existem aqui (todos editáveis), mas avisar antes de excluir status que está em uso.
- Lista usa estilo já presente (badge com swatch + cor de fundo translúcida).

Após aprovação, implemento store + refator do `Configuracoes.tsx`.
