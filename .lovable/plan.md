## Objetivo

Adicionar a funcionalidade **Copiar link** dentro do modal "Detalhe da Tarefa" (`DemandaDetalheDialog`), gerando uma URL absoluta que reabre exatamente aquela tarefa no Projeto Completo do cliente correspondente — semelhante à opção "Copiar link" da imagem de referência.

## Onde

Arquivo: `src/components/demandas/DemandaDetalheDialog.tsx`

A barra superior do modal (cabeçalho do Card 1 — Informações da Demanda), ao lado dos botões **Urgente**, **Status** e do ícone de **Excluir** (visível apenas para admin).

## Como o link é montado

O projeto já usa esse padrão em `src/lib/minhasTarefas.ts`:

```
/clientes/{cliente_id}/projeto?tab={aba}&demanda={id}
```

Onde `aba` vem da função `categoriaParaAba(demanda.categoria)` já exportada em `src/lib/minhasTarefas.ts`. A rota `/clientes/:id/projeto` já lê o `searchParams.get("demanda")` e abre o modal automaticamente (`src/pages/ProjetoCliente.tsx` linhas 160-164).

A URL final será absoluta:
```
`${window.location.origin}/clientes/${demanda.cliente_id}/projeto?tab=${categoriaParaAba(demanda.categoria)}&demanda=${demanda.id}`
```

## Mudanças

1. **Imports** em `DemandaDetalheDialog.tsx`:
   - Adicionar ícone `Link2` (ou `Link`) de `lucide-react`.
   - Importar `categoriaParaAba` de `@/lib/minhasTarefas`.

2. **Handler `copiarLink`** dentro do componente:
   - Monta a URL absoluta no formato acima.
   - Usa `navigator.clipboard.writeText(url)`.
   - `toast.success("Link da tarefa copiado")` em caso de sucesso e `toast.error("Falha ao copiar link")` no `catch`.
   - Fallback: se `navigator.clipboard` indisponível, usar `document.execCommand("copy")` via textarea temporário.

3. **Botão na UI**: inserir um `Button` no cluster de ações do cabeçalho (linhas ~284-368), entre o botão **Status** e o botão **Excluir**:
   - `variant="ghost"`, `size="icon"`, `title="Copiar link da tarefa"`.
   - Ícone `Link2` (h-4 w-4).
   - Sempre visível (não depende de `canWrite` nem de `isAdmin`) — qualquer usuário que vê a tarefa pode copiar o link.
   - Estilo consistente com os outros botões do header.

## O que NÃO muda

- Layout compacto, single-column e sem barra de rolagem do formulário principal (regras já estabelecidas).
- Nenhum campo, seção, comportamento de salvamento, lógica de rascunho, Card de Atividade ou estrutura existente.
- Sem novos tokens de cor — usa apenas variantes do `Button` já existentes.
- Sem alterações em rotas, store, banco ou tipos.

## Verificação

Após implementar:
- Abrir uma tarefa em qualquer cliente → clicar no botão de link no header → URL é copiada → toast aparece.
- Colar a URL em outra aba/janela → tarefa abre direto no modal correto, no cliente correto, na aba correta.
