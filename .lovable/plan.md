# Equiparar "Adicionar em lote" do gerenciador global ao do Projeto Completo

Hoje o "Adicionar em lote" das abas **Documentos padrão para clientes** e **Documentos internos da empresa** é uma textarea simples (uma linha = um título). O do **DocumentacaoTab** (Projeto Completo) é muito mais rico:

- Toggle **"Mensagem completa" / "Lista de itens"** para os blocos `documentos`, `links`, `reunioes`.
- Para `acessos` e `materiais`: modo **mensagem completa fixa** (salva 1 item do tipo `mensagem` com o texto formatado).
- Modo lista: parser inteligente (`parseLoteTexto`) que detecta:
  - Itens separados por linha em branco
  - URLs, `Login:`, `Senha:` automaticamente
  - Bullets (`-`, `•`, `*`) e listas livres
  - Formato pipe `título | url | login | senha | observação`
  - Emojis e prefixos no título (ex.: `🔗 Gmail:` → `Gmail`)
- Select de **Tipo aplicado a todos** os itens da lista.
- Badge "**N item(ns) detectado(s)**" que atualiza ao vivo conforme o usuário cola.
- Botão muda para `Adicionar todos (N)` ou `Salvar mensagem`.

Vou replicar esse mesmo diálogo no manager global, reutilizando o parser para evitar divergência futura.

## Arquivos

### Novo: `src/lib/documentacaoLote.ts`
Extrair `parseLoteTexto`, `LoteItem` e a constante `TITULO_MENSAGEM_PADRAO` do `DocumentacaoTab.tsx` para um arquivo compartilhado. Lógica idêntica, sem mudança de comportamento.

### Editado: `src/components/projeto/DocumentacaoTab.tsx`
- Remover as definições locais de `parseLoteTexto`, `LoteItem` e `tituloMensagemPadrao`.
- Importar do novo `@/lib/documentacaoLote`.
- Nenhuma mudança visível para o usuário.

### Editado: `src/components/configuracoes/DocumentosGlobaisManager.tsx`
- Remover a textarea simples atual + função `salvarLote` antiga + estado `loteTexto`/`loteSalvando`.
- Criar componente local `DocumentoGlobalLoteDialog` (mesma estrutura visual e fluxo do `DocumentacaoLoteDialog`):
  - Mesma UI: toggle de modo (quando aplicável), select de tipo, textarea grande (font-mono), badge de itens detectados, footer com botões dinâmicos.
  - Usa `parseLoteTexto` do helper compartilhado.
  - Em vez de `useDocumentacao.create/createBatch` (que escreve em `documentacao_itens` por cliente), chama `useDocumentosGlobais.create` em loop sequencial, enviando:
    - `escopo` atual (`cliente`/`interno`)
    - `bloco` selecionado
    - `tipo` (do select, ou `mensagem` no modo mensagem completa)
    - `titulo`, `url`, `login`, `senha`, `descricao` (mapeando `observacao → descricao`)
    - `aplicar_automatico = (escopo === "cliente")`
    - `permissao_acesso = (escopo === "interno" ? "admin" : "todos")`
    - `categoria: "Outros"`, `ativo: true`
  - Modo "Mensagem completa": cria 1 item com `tipo: "mensagem"`, `titulo` = `TITULO_MENSAGEM_PADRAO[bloco]`, `descricao` = texto colado integral.
  - Mantém as proteções já implementadas: deduplicação interna do lote, ignorar títulos já existentes (mesmo `escopo+bloco`, case-insensitive), guarda anti-clique-duplo, toast final com contagem.
- Substituir o uso do diálogo antigo por `<DocumentoGlobalLoteDialog>` e simplificar o estado (`loteState` continua, mas sem `loteTexto/loteSalvando` no componente pai — vão para dentro do diálogo, igual ao DocumentacaoTab).

### `public/version.json`
Bump do timestamp.

## Resultado

O botão "Adicionar em lote" em ambas as abas globais abre **exatamente o mesmo diálogo** (visual e comportamento) do "Documentos" do Projeto Completo, com toggle de modo, parser inteligente, badge de detecção e select de tipo — porém persistindo em `documentos_globais` (com escopo correto) em vez de `documentacao_itens` por cliente. Proteções anti-duplicação seguem ativas.
