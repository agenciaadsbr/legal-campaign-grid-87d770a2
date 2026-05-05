# Lote sempre salva como 1 item único

## Problema

Hoje no diálogo "Adicionar em lote" das abas globais, o modo "Lista de itens" usa o `parseLoteTexto` para dividir o texto colado em N itens (no exemplo da tela: 3 itens detectados → 3 registros criados). O usuário quer que **cada lote adicionado gere apenas 1 item**, sem split.

## O que muda

### `src/components/configuracoes/DocumentosGlobaisManager.tsx` — `DocumentoGlobalLoteDialog`

1. **Lógica `submit` (modo lista)**: substituir o loop que cria N itens por uma única chamada `create()`:
   - `descricao` = texto colado integral (preserva exatamente como o usuário colou)
   - `titulo` = título do primeiro item detectado pelo parser (ou `TITULO_MENSAGEM_PADRAO[bloco]` como fallback), truncado a 200 chars
   - `url`, `login`, `senha` = do primeiro item detectado (se houver)
   - `tipo` = valor selecionado no select
   - Demais campos (escopo, bloco, categoria, aplicar_automatico, permissao_acesso, ativo) iguais à lógica atual
   - Mantém check anti-duplicação por título dentro do mesmo escopo+bloco
   - Mantém guarda anti-clique-duplo (`if (salvando) return`)

2. **UI**:
   - Remover o badge "N item(ns) detectado(s)" (não faz mais sentido — sempre é 1)
   - Botão muda de `Adicionar todos (N)` para `Adicionar` (no modo lista) e continua `Salvar mensagem` no modo mensagem
   - `disabled` do botão passa a depender só de `texto.trim()` (não mais de `itensDetectados.length`)

3. **Modo "Mensagem completa"** continua exatamente como está (já era 1 item).

### `public/version.json`

Bump do timestamp.

## Resultado

Cada clique em "Adicionar" cria **exatamente 1** item no bloco, independente de quantas URLs, "Login:"/"Senha:" ou linhas em branco existam no texto colado. O conteúdo completo fica preservado no campo descrição do item criado.
