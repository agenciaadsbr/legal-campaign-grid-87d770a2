## Problema

Na aba **Documentação**, ao usar **"Adicionar em lote"** nos cards **Documentos**, **Links importantes** e **Reuniões**, o contador mostra sempre `0 item(ns) detectado(s)` e o botão **"Adicionar todos"** fica desabilitado — nada é salvo.

### Causa raiz (confirmada no código)

A função `parseLoteTexto` em `src/components/projeto/DocumentacaoTab.tsx` (linhas 980–1092) foi escrita assumindo que cada item é um **bloco de acesso** (URL + login + senha). Dois pontos a corrigir:

1. **Linha 1067**: `if (!url && !login && !senha) continue;` — descarta qualquer bloco que não tenha URL nem credenciais. Como Documentos, Reuniões e (parcialmente) Links são apenas títulos/anotações sem login/senha, todos os blocos são jogados fora.
2. **Linhas 1004–1008**: blocos são separados **apenas por linha em branco** (`\n\s*\n`). Em listas coladas como bullets contínuos (sem linha em branco entre eles, como o briefing do screenshot) tudo vira **1 único bloco**, que depois é descartado pelo motivo acima.

Resultado: parser detecta 0 itens → `createBatch` nunca é chamado → nada é salvo.

## Correção

Tornar o parser sensível ao **bloco** (`DocBloco`) que está sendo importado, com regras adequadas a cada tipo:

### 1. Passar `bloco` para o parser

Alterar a assinatura para `parseLoteTexto(texto, bloco)` e propagar nas chamadas (`useMemo` em `DocumentacaoLoteDialog`).

### 2. Modo "lista simples" para Documentos, Links e Reuniões

Quando o bloco for `documentos`, `links`, `reunioes` ou `observacoes` **e** o texto **não usar o formato com `|`** **e** **não houver linhas em branco** dividindo blocos (ou o texto for predominantemente bullets), tratar **cada linha não-vazia** como um item:

- `titulo` = a linha inteira limpa (remove `•`, `-`, `*`, emojis no início, `:` no final)
- `url` = primeira URL encontrada na linha (se houver), via `URL_RE`
- `login`, `senha`, `observacao` = `null`
- Linhas que sejam apenas saudações triviais (`Bom dia`, `Boa tarde`, `Olá`, etc.) podem ser mantidas, já que o usuário escolheu colar a lista — preferir **não filtrar** para evitar perdas silenciosas.

### 3. Manter modo "blocos com URL/credenciais" só onde faz sentido

- Para `acessos` e `materiais` o diálogo já usa `isMensagemUnica` (mensagem única, não chama o parser) — sem alteração.
- O modo atual (blocos separados por linha em branco com URL/login/senha) continua disponível como **fallback**: se o texto contém múltiplos blocos separados por linha em branco **e** algum deles tem URL/credenciais, usa-se o parser atual (relaxando a linha 1067 para também aceitar blocos só com título quando o bloco for `documentos`/`links`/`reunioes`/`observacoes`).

### 4. Relaxar o filtro da linha 1067

Substituir `if (!url && !login && !senha) continue;` por:

```ts
const isListaLivre = bloco === "documentos" || bloco === "links" || bloco === "reunioes" || bloco === "observacoes";
if (!url && !login && !senha && !isListaLivre) continue;
// para listas livres: só descarta se o título também estiver vazio
if (isListaLivre && !tituloCandidato && !url) continue;
```

### 5. Atualizar placeholder do textarea

Para Documentos / Links / Reuniões, mostrar exemplo realista (uma linha por item), por exemplo:

```
Briefing
Planejamento de mídia Q1
Contrato assinado
https://drive.google.com/...
```

### Resultado esperado

- Colar uma lista de bullets/linhas em **Documentos**, **Links importantes** ou **Reuniões** → contador mostra N itens → `Adicionar todos (N)` habilitado → `createBatch` salva todos com o tipo selecionado no Select "Tipo (aplicado a todos)".
- Comportamento atual de **Acessos** (mensagem única) e do formato `título | url | login | senha | obs` permanece inalterado.

## Arquivo afetado

- `src/components/projeto/DocumentacaoTab.tsx` (apenas — alterações em `DocumentacaoLoteDialog` e `parseLoteTexto`).
