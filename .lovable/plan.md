## Objetivo

Trazer para as seções **Documentos**, **Links importantes** e **Reuniões** o mesmo modo "Mensagem completa" que existe hoje em **Acessos** e **Materiais enviados ao cliente**, sem perder o parser de lista adicionado anteriormente — o usuário escolhe qual modo usar dentro do diálogo de lote.

## Funcionalidade hoje (referência: Acessos / Materiais)

- No diálogo "Adicionar em lote": uma única caixa onde o usuário cola a mensagem inteira (estilo WhatsApp) → salva como **um único item** com `tipo = "mensagem"` e o conteúdo no campo `observacao`.
- Itens com `tipo = "mensagem"` são renderizados pelo `MensagemAcessosCard`: caixa formatada, links clicáveis, botão "Copiar tudo".

## O que muda nos 3 blocos (documentos, links, reunioes)

### 1. `DocumentacaoLoteDialog` — adicionar seletor de modo

Para esses 3 blocos, exibir um toggle no topo do diálogo:

- **Modo A — Mensagem completa** (novo): caixa única, salva 1 item de `tipo = "mensagem"` no `observacao`, com título padrão por bloco:
  - documentos → "Mensagem de documentos"
  - links → "Mensagem de links importantes"
  - reunioes → "Mensagem de reuniões"
- **Modo B — Lista de itens** (atual): mantém o parser livre / formato com `|` já implementado.

Acessos e Materiais continuam exatamente como estão (sempre modo Mensagem, sem toggle).

### 2. `TIPOS_POR_BLOCO` em `src/store/documentacao.ts`

Adicionar `{ value: "mensagem", label: "Mensagem completa" }` no topo dos arrays de `links`, `reunioes` e `documentos` para que o tipo seja reconhecido nos selects e labels.

### 3. Render do card de mensagem

No loop de `lista.map` em `DocumentacaoTab`, estender a condição que escolhe `MensagemAcessosCard` para incluir os novos blocos quando `it.tipo === "mensagem"`:

```text
(bloco === "acessos" || bloco === "materiais" || bloco === "links"
 || bloco === "reunioes" || bloco === "documentos") && it.tipo === "mensagem"
```

O `MensagemAcessosCard` permanece o mesmo (já é genérico — usa `item.titulo` + `item.observacao`).

### 4. Botão "Copiar mensagem" no header do bloco — fora de escopo

Confirmado pelo usuário: não adicionar "Copiar mensagem" no header dos novos blocos. O `MensagemAcessosCard` já tem "Copiar tudo" individual, suficiente.

## Arquivos a alterar

- `src/store/documentacao.ts` — incluir tipo `"mensagem"` em `links`, `reunioes`, `documentos`.
- `src/components/projeto/DocumentacaoTab.tsx`:
  - `DocumentacaoLoteDialog`: novo state `modoLote` ('mensagem' | 'lista'), seletor visível só nos 3 blocos novos, branch de submit que chama `create` com `tipo: "mensagem"` quando modo = mensagem.
  - Loop de render: estender condição do `MensagemAcessosCard`.
  - Placeholder do textarea ajustado por modo.

## Resultado esperado

Em Documentos / Links importantes / Reuniões o usuário verá no diálogo "Adicionar em lote" duas abas (Mensagem completa | Lista de itens). Escolhendo "Mensagem completa", ele cola o texto inteiro e ele aparece como card formatado idêntico ao de Acessos. O parser de lista anterior continua disponível na outra aba.