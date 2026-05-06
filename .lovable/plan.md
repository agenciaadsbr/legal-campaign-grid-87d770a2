## Objetivo

Adicionar um campo no topo do sistema (na header global) onde o usuário pode colar um link de tarefa e ser redirecionado direto para essa tarefa dentro do sistema, contornando a restrição de acesso do preview do Lovable.

## Como funciona

1. Usuário copia o link da tarefa pelo botão "Copiar link" no detalhe da demanda (já existe).
2. Em vez de abrir o link no navegador (que pode pedir login do Lovable no preview), ele cola o link no campo no topo do sistema (já dentro do Dash Tasks, autenticado).
3. O sistema extrai o `clienteId`, a `tab` e o `id` da demanda do link colado e faz `navigate()` interno para a rota correspondente — abrindo o `DemandaDetalheDialog` automaticamente via o deep-link `?demanda={id}` que já está implementado em `ProjetoCliente.tsx`.

Funciona com qualquer formato de URL: preview Lovable, domínio publicado, custom domain ou path relativo. Só importa o trecho `/clientes/:clienteId/projeto?tab=...&demanda=...`.

## Mudanças

### 1. Novo componente `src/components/AbrirTarefaPorLinkInput.tsx`

- Input de busca com placeholder "Colar link da tarefa..." e ícone de lupa à esquerda (visual igual ao da referência: barra escura, arredondada, atalho `Ctrl+K` à direita).
- Largura fixa razoável (~420px no desktop), centralizado na header.
- Ao colar (`onPaste`) ou pressionar Enter:
  - Faz parse do valor com `new URL(valor, window.location.origin)` (tolera path relativo).
  - Valida que o pathname casa com `/clientes/:clienteId/projeto` (ou `/clientes/:clienteId`).
  - Lê `tab` e `demanda` dos search params.
  - Se válido: `navigate(\`/clientes/${clienteId}/projeto?tab=${tab}&demanda=${demandaId}\`)`, limpa o input e mostra `toast.success("Abrindo tarefa...")`.
  - Se inválido: `toast.error("Link de tarefa inválido")`.
- Atalho `Ctrl+K` / `Cmd+K` foca o input (listener global).

### 2. Editar `src/components/AppLayout.tsx`

- Importar e renderizar `<AbrirTarefaPorLinkInput />` na header, posicionado no centro (entre o `Breadcrumb` e o cluster de botões da direita).
- Em telas pequenas (< md), esconder o breadcrumb já é o comportamento atual; o input pode ficar `flex-1` com `max-w-md` e `mx-auto`.

## Layout da header (resultado)

```text
[≡] [Breadcrumb...]      [🔍 Colar link da tarefa...  Ctrl+K]      [🔔] [🌙]
```

## O que NÃO muda

- Botão "Copiar link" no `DemandaDetalheDialog` continua igual.
- Rotas, autenticação, deep-link `?demanda=` em `ProjetoCliente.tsx` (já funciona).
- Nada visual nos cards/dialogs de demanda.

## Observação

Esse campo resolve o problema de "link pede login do Lovable" porque o redirecionamento acontece **dentro do app já autenticado** — o navegador nunca tenta abrir a URL externa do preview.
