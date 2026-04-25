Implementar centralização da gestão dentro do botão ⚙ Configurações no topo da página /clientes:

1. **Criar `src/components/OpcoesEditor.tsx`** — extrair `OpcoesEditor` (com helper `toHex`) de `src/pages/Configuracoes.tsx` para reutilização. Props: `titulo`, `tipo` ('status' | 'nicho').

2. **Criar `src/components/ResponsaveisEditor.tsx`** — versão compacta de gestão de responsáveis (lista + form inline add/editar/remover), baseada em `src/pages/Responsaveis.tsx`, usando `useCRM().responsaveis` e métodos `addResponsavel/updateResponsavel/removeResponsavel`.

3. **`src/pages/Clientes.tsx`** — adicionar na toolbar superior botão `[⚙ Configurações]` (variant outline, ícone `Settings`) abrindo um `Sheet` lateral direito (`sm:max-w-xl`). Dentro: três cards empilhados — Status do Cliente, Nichos, Responsáveis — usando os componentes extraídos.

4. **`src/pages/Configuracoes.tsx`** — remover cards de Status, Nichos e helpers locais. Manter apenas card "Aparência" (toggle modo escuro).

5. **`src/pages/Responsaveis.tsx`** — deletar.

6. **`src/components/AppSidebar.tsx`** — remover itens "Configurações" e "Responsáveis" do array `items`.

7. **`src/App.tsx`** — remover rota e import de `/responsaveis`. Manter `/configuracoes` acessível por URL direta.