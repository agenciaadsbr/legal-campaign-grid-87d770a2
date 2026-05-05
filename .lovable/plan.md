# Padronizar blocos do gerenciador global como o bloco "Acessos"

## Contexto

Hoje, em **Configurações → Documentos padrão para clientes** e **Documentos internos da empresa**, cada bloco (Acessos, Links, Reuniões, Materiais, Documentos) mostra na barra de ações:

- `+ Adicionar` (abre o diálogo de item único)
- `+ Adicionar em lote`
- `Copiar mensagem` (apenas Acessos e Materiais)

No **Projeto Completo → Documentação**, os blocos têm apenas:

- `+ Adicionar em lote`
- `Copiar mensagem` (apenas Acessos e Materiais)

O bloco "Acessos" do Projeto Completo é a referência: sem botão "Adicionar" individual no bloco. A criação avulsa fica no botão global do topo.

## O que será feito

### `src/components/configuracoes/DocumentosGlobaisManager.tsx`

1. **Remover o botão "+ Adicionar"** que aparece dentro de cada bloco (atualmente linhas 408-421 — o `<Button>` com `onClick={() => setDialog({ open: true, item: null, blocoInicial: bloco as DocGlobalBloco })}`). Ele será removido de **todos** os blocos.
2. Manter:
   - `+ Adicionar em lote` em **todos** os blocos (já abre o `DocumentoGlobalLoteDialog` com toggle "Mensagem completa / Lista de itens", parser inteligente, badge de itens detectados, select de tipo e proteções anti-duplicação).
   - `Copiar mensagem` em **Acessos** e **Materiais** (já existente).
3. Manter intacto o botão global `+ Adicionar` no topo da aba (header da toolbar, linhas 331-337) — é por ele que se cria um item único, com o seletor de bloco já existente.
4. Nenhuma mudança nos cards de item, na seleção múltipla, nas abas, nos filtros ou no diálogo de edição.

### `public/version.json`

Bump do timestamp para forçar atualização do client.

## Resultado

Cada bloco das duas abas globais fica visualmente e funcionalmente **idêntico** ao bloco "Acessos" do Projeto Completo:

```text
[ + Adicionar em lote ]  [ Copiar mensagem (só acessos/materiais) ]
[ ☐ Selecionar todos                                    ... ]
[ item 1 ]
[ item 2 ]
...
```

Para criar um item avulso, o usuário usa o botão `+ Adicionar` do topo da aba (que abre o seletor de bloco e depois o diálogo de item único — fluxo já existente, sem alteração).
