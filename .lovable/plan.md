## Objetivo

Mover a ação **Ocultar / Reexibir cliente** para dentro do **modal "Editar Cliente"**, removendo o ícone de olho da coluna **Ações** da tabela. Toda a lógica de persistência, filtros e "Mostrar ocultos" permanece intacta.

## Mudanças

### 1. `src/pages/Clientes.tsx` — `AcoesCliente` (linhas ~615–680)

- **Remover** o `<Button>` com ícone `Eye`/`EyeOff` (linhas 648–658) e a função `handleToggleOculto`.
- Manter botões: **Editar** (canetinha) e **Excluir** (lixeira).
- A coluna Ações fica visualmente mais limpa.

### 2. `src/pages/Clientes.tsx` — `EditarClienteDialog` (linhas ~430–613)

Adicionar uma nova seção **"Visibilidade do cliente"** ao final do formulário, antes do `DialogFooter`:

- Bloco com `Switch` (componente já existente em `src/components/ui/switch.tsx`) controlado por `form.oculto`.
- Label: **"Ocultar cliente do painel"**
- Texto auxiliar (muted): *"Clientes ocultos não aparecem na listagem principal, mas continuam no banco e nos relatórios internos. Use 'Mostrar ocultos' para reexibir."*
- Estado inicial: `cliente?.oculto ?? false` — vem marcado se já estiver oculto (persistência preservada).
- No `submit()`, incluir `oculto: form.oculto` no patch enviado ao `updateCliente`. O store já trata o timestamp `oculto_em` automaticamente.
- Toast diferenciado quando o valor de `oculto` mudar: *"Cliente ocultado do painel"* ou *"Cliente reexibido no painel"*, caso contrário mantém *"Cliente atualizado"*.

### 3. Identificação visual dos ocultos (opcional, mínimo)

Já existe filtragem por `mostrarOcultos`. Sem alterar layout/colunas, manter o comportamento atual. Nenhuma badge nova é adicionada nesta etapa para não poluir — o usuário pediu "sem poluir visualmente" e a opção "levemente apagados OU badge" é alternativa; mantemos como está hoje (registros aparecem normalmente quando o toggle do header está ligado).

## O que **não** muda

- Coluna `oculto` / `oculto_em` no banco.
- Função `updateCliente` no `src/store/crm.ts`.
- Toggle **"Mostrar ocultos"** no header da página (linhas ~1657–1660).
- Filtros aplicados em `ClientesGeralTable`, `Dashboard.tsx`, `Relatorios.tsx`.
- Ordenação, paginação, busca, tarefas, projeto completo, acessos, relatórios.

## Arquivos afetados

- `src/pages/Clientes.tsx` (apenas: `AcoesCliente` e `EditarClienteDialog`)

## Validação

1. Abrir Editar Cliente → ver switch "Ocultar cliente do painel" (refletindo estado atual).
2. Ativar e salvar → cliente some da listagem.
3. Ligar "Mostrar ocultos" → cliente reaparece.
4. Reabrir Editar → switch vem marcado; desativar e salvar → volta à listagem normal.
5. Confirmar que o ícone de olho não existe mais na coluna Ações.
