## Objetivo

Permitir colar texto solto (estilo WhatsApp/e-mail) no "Adicionar em lote" da Documentação e gerar automaticamente um item por acesso/link. Adicionar botão para copiar a "mensagem completa" formatada do bloco Acessos depois de salvo.

## 1. Parser inteligente em `DocumentacaoLoteDialog`

Arquivo: `src/components/projeto/DocumentacaoTab.tsx` (função `DocumentacaoLoteDialog`).

### UI
- Manter o `<Textarea>` com 10 linhas e o select de "Tipo (aplicado a todos)".
- Atualizar a `DialogDescription` para explicar os dois formatos suportados:
  - **Formato simples**: uma linha por item com `título | url | login | senha | observação` (continua funcionando).
  - **Formato livre (novo)**: cole o texto como veio do WhatsApp/e-mail. O sistema detecta automaticamente cada bloco (separado por linha em branco), procurando título, URL, Login: e Senha:.
- Adicionar abaixo do textarea um pequeno preview ("X itens detectados") em tempo real (badge), para o usuário ver antes de salvar.
- Botão principal: "Adicionar todos (X)".

### Lógica de parsing (nova função `parseLoteTexto`)
Heurística aplicada ao texto bruto:

1. **Detectar formato simples**: se ALGUMA linha não vazia contém `|`, usa o parser atual (linha-a-linha por `|`).
2. **Senão, parser livre**:
   - Quebrar o texto em "blocos" separados por linha em branco (`\n\s*\n`).
   - Para cada bloco, extrair:
     - **URL**: primeiro match de regex `https?://\S+` (limpa pontuação final `.,);`).
     - **Login**: regex `/^\s*(?:login|e-?mail|usu[áa]rio)\s*[:\-]\s*(.+)$/im`.
     - **Senha**: regex `/^\s*(?:senha|password|pass)\s*[:\-]\s*(.+)$/im`.
     - **Título**: primeira linha não vazia do bloco, removendo emojis comuns (🔗, 🔑, ✅, ▶, 📎) e dois-pontos finais. Se a primeira linha for só a URL, usa o domínio (ex: `dashboard.adsbr.com.br`) ou o tipo selecionado + nº como fallback.
     - **Observação**: linhas restantes do bloco que não foram URL/Login/Senha/título.
   - Descartar blocos vazios (sem URL nem Login nem Senha nem título "real" — ex: saudações como "Boa tarde Drs...").
3. Resultado: `Array<{ titulo, url, login, senha, observacao }>` que alimenta `createBatch` com `cliente_id`, `bloco`, `tipo`.

### Comportamento extra
- Se o parser livre detectar 0 itens, mostrar toast de erro com instrução, sem fechar o dialog.
- Recalcular o preview ao digitar (useMemo sobre `texto`).

## 2. Botão "Copiar mensagem" no bloco Acessos

Arquivo: `src/components/projeto/DocumentacaoTab.tsx` (renderização de cada bloco em `DOC_BLOCOS.map`).

- Apenas para `bloco === "acessos"`, adicionar na linha de botões (ao lado de "Adicionar item" / "Adicionar em lote") um botão `Copiar mensagem` (ícone `ClipboardCopy`), desabilitado quando a lista do bloco estiver vazia.
- Ao clicar:
  - Gerar texto formatado a partir de `lista` (acessos do cliente):
    ```
    Boa tarde! Segue abaixo as informações de acesso:

    🔗 {titulo}
    {url}
    Login: {login}
    Senha: {senha}

    🔗 {titulo 2}
    ...
    ```
  - Cada item separado por linha em branco. Campos ausentes são omitidos.
  - `navigator.clipboard.writeText(texto)` + `toast.success("Mensagem copiada")`.
- Nova helper local `construirMensagemAcessos(lista: DocumentacaoItem[]): string`.

## 3. Itens fora de escopo

- Não mexer em outros blocos (Links, Reuniões, etc.) — botão "Copiar mensagem" só em Acessos.
- Não alterar `ItemCard`, store, schema, RLS ou exportação TXT.
- Não criar novos componentes/arquivos — tudo dentro de `DocumentacaoTab.tsx`.

## Arquivos alterados

- `src/components/projeto/DocumentacaoTab.tsx`
