## Objetivo

Adicionar um botão **"Adicionar Tarefa"** visível em todas as abas da página **Projeto Completo** (`/clientes/:clienteId`), permitindo criar uma nova demanda/tarefa para o cliente sem precisar navegar até a aba "Demandas".

## Onde adicionar

No header da página `src/pages/ProjetoCliente.tsx`, dentro do bloco `flex items-start justify-between` (linhas 102–117), no lado direito — atualmente vazio. Assim o botão fica sempre visível, independente da aba ativa.

## Comportamento

- Botão primário com ícone `Plus` e texto "Adicionar Tarefa".
- Ao clicar, abre o componente `<NovaDemandaDialog />` já existente, com `defaultClienteId={clienteId}` pré-preenchido (mesmo padrão usado na aba Demandas, linhas 359–363).
- Estado local `novaTarefaOpen` controla a abertura do dialog.
- A nova demanda criada aparece automaticamente na aba "Demandas" e nos contadores da "Visão Geral" (já reativo via store `useDemandas`).

## Mudanças técnicas

**Arquivo único:** `src/pages/ProjetoCliente.tsx`

1. Adicionar `const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);` no componente `ProjetoCliente`.
2. No header (após o div com avatar/nome do cliente), adicionar:
   ```tsx
   <Button onClick={() => setNovaTarefaOpen(true)}>
     <Plus className="h-4 w-4 mr-1" /> Adicionar Tarefa
   </Button>
   ```
3. Renderizar `<NovaDemandaDialog open={novaTarefaOpen} onOpenChange={setNovaTarefaOpen} defaultClienteId={clienteId!} />` no nível raiz do componente.

Nada mais é alterado — abas, navegação e separação Posts/Demandas permanecem iguais.