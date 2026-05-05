## Objetivo

Atualizar a aba **Documentos** das Configurações ("Documentos da empresa") para usar o **mesmo padrão visual e de UX** do bloco "Documentação" do **Projeto Completo** (cards por bloco, collapsible, busca, filtro por bloco, contadores, "Adicionar em lote"), mantendo:

- O **propósito atual** dos dois escopos:
  - **Documentos padrão para clientes** → continuam sendo replicados nos clientes (via "Aplicar automaticamente" / botão "Aplicar padrão" na aba Documentação do cliente).
  - **Documentos internos da empresa** → uso interno, **restritos a administradores** (aba e dados ficam visíveis apenas para `isAdmin`).

## O que muda visualmente

Hoje a aba mostra uma **lista vertical** simples de cards. Vai virar uma **grade de blocos** (Acessos, Links, Reuniões, Materiais, Documentos), cada um com:

- Cabeçalho colapsável com ícone + título do bloco + contador (badge).
- Botão "Adicionar em lote".
- Lista interna de itens com ações (editar, duplicar, ativar/desativar, excluir, mover ↑/↓).
- Mesmo estilo de cards e tipografia da `DocumentacaoTab.tsx`.

A toolbar superior ganha:

- Busca por título/descrição/URL.
- Filtro "Todos os blocos" + "Categoria".
- Botão "+ Adicionar" que abre primeiro um seletor de bloco (igual ao Projeto Completo) e depois o `DocumentoGlobalDialog`.

```text
[Tabs: Padrão p/ clientes | Internos da empresa (só admin)]
[🔍 Buscar...] [Bloco ▼] [Categoria ▼]                [+ Adicionar]

┌── 🔑 Acessos (3) ─────┐ ┌── 🔗 Links (5) ──────┐ ┌── 🎥 Reuniões (1) ──┐ ┌── 📤 Materiais (2) ──┐
│ + Adicionar em lote   │ │ + Adicionar em lote  │ │ + Adicionar em lote │ │ + Adicionar em lote  │
│ • item ...            │ │ • item ...           │ │ • item ...          │ │ • item ...           │
└───────────────────────┘ └──────────────────────┘ └─────────────────────┘ └──────────────────────┘
┌── 📄 Documentos (4) ──┐
│ ...                    │
└────────────────────────┘
```

## Restrição de acesso (internos só admin)

- A aba "Documentos internos da empresa" só é renderizada se `useAuth().isAdmin === true`.
- Se um não-admin estiver com a aba "interno" ativa (ex.: vindo de URL/estado salvo), forçar fallback para "cliente".
- O `DocumentoGlobalDialog` esconde a opção "Documento interno da empresa" no select de Escopo quando o usuário não é admin.
- A página `Configuracoes.tsx` já restringe a aba "Documentos" a admin no menu lateral — manter. A restrição interna por escopo é uma camada extra de segurança no front.

> Observação de segurança: a separação real continuará dependendo das policies da tabela `documentos_globais` no Supabase. O front oculta, mas se for preciso reforçar no banco, é um passo separado (posso propor depois se ainda não houver policy "interno = admin").

## Comportamento mantido (sem regressão)

- Escopo `cliente`:
  - Flag "Aplicar automaticamente em novos clientes" continua existindo no diálogo.
  - O botão "Aplicar padrão" da `DocumentacaoTab` do cliente continua puxando esses itens via `applyGlobalDefaults(clienteId)`.
- Escopo `interno`:
  - Não é replicado em clientes (já é o comportamento da store).
  - Continua tendo o campo "Permissão de acesso" (todos / admin) dentro do escopo interno.
- Reordenar (`reorder`), duplicar, ativar/desativar e excluir continuam funcionando igual (mesma store `useDocumentosGlobais`).

## Arquivos a editar

1. **`src/components/configuracoes/DocumentosGlobaisManager.tsx`** (reescrita do layout):
   - Substituir `ListaDocumentos` vertical por uma grade de blocos no estilo `DocumentacaoTab`.
   - Agrupar `filtrados` por `bloco` (`DOC_BLOCOS`).
   - Componente interno `BlocoCard` com header colapsável, contador, botão "Adicionar em lote" e lista de `ItemGlobalCard`.
   - Componente `ItemGlobalCard` reaproveitando o visual do `ItemCard` da `DocumentacaoTab` (mas usando os campos de `DocumentoGlobal` + badges "Aplica automático", "Inativo", "Somente admin").
   - Toolbar com busca, filtro de bloco, filtro de categoria e botão "+ Adicionar" → abre `SeletorBlocoDialog` antes do `DocumentoGlobalDialog`.
   - Esconder `TabsTrigger value="interno"` e `TabsContent value="interno"` quando `!isAdmin`. Forçar `escopo = "cliente"` nesse caso.
   - Importar `useAuth` para obter `isAdmin`.

2. **`src/components/configuracoes/DocumentoGlobalDialog.tsx`** (ajuste menor):
   - Receber `bloco` inicial opcional (vindo do seletor) e pré-selecionar.
   - Esconder a opção `"Documento interno da empresa"` no `Select` de escopo se `!isAdmin`.

3. **`src/pages/Configuracoes.tsx`** — sem mudanças (a aba já está protegida por `isAdmin`).

4. **`public/version.json`** — bump de timestamp.

## Itens fora do escopo

- Não vou criar "Adicionar em lote" funcional novo agora se ele não existir para documentos globais — se necessário, ele entra como um diálogo simples (igual o `DocumentacaoLoteDialog`) que cria N itens no mesmo bloco/escopo. **Confirme se quer "Adicionar em lote" funcional já neste passo** ou se ele pode ficar como botão visível desabilitado/"em breve".
- Não vou alterar policies do Supabase nessa etapa — apenas a UI esconde/restringe.

## Detalhes técnicos

- `DOC_BLOCOS` e `DOC_BLOCO_LABEL` reutilizados de `@/store/documentacao`.
- `BLOCO_ICON` (KeyRound, LinkIcon, Video, Send, Files) replicado/local — mesmo mapping de `DocumentacaoTab`.
- `Collapsible` de `@/components/ui/collapsible`, `Card`/`CardContent`, `Badge`, `Button`, `Input`, `Select` — tudo já no projeto.
- Tokens semânticos (`bg-card`, `text-foreground`, `border-border`, `text-primary`) — sem cores hex.
- Reordenar continua via `reorder(id, 'up'|'down')` da store; ordenação é por `ordem` dentro do bloco filtrado (já é o que a store retorna).

Aprovando, eu implemento exatamente isso.