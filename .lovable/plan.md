## Objetivo

Adicionar à seção **"Materiais enviados ao cliente"** (bloco `materiais`) o mesmo padrão de "Mensagem completa" estilo WhatsApp já existente em **"Acessos"**: o usuário cola um texto livre (como uma mensagem de WhatsApp), e ele é salvo como um único item formatado, renderizado preservando quebras de linha, links clicáveis e linhas com 🔗 destacadas.

A funcionalidade atual de cadastrar materiais individualmente (com formato, data, link) continua funcionando lado a lado.

## Escopo / Mudanças

Alterações concentradas em **`src/components/projeto/DocumentacaoTab.tsx`** e **`src/store/documentacao.ts`**.

### 1. `src/store/documentacao.ts`
- Adicionar tipo `{ value: "mensagem", label: "Mensagem completa" }` no topo do array `TIPOS_POR_BLOCO.materiais` (igual ao que já existe em `acessos`).

### 2. `src/components/projeto/DocumentacaoTab.tsx`

**Render do bloco materiais** (loop `lista.map` em ~linha 305): adicionar a mesma condicional usada em acessos para renderizar o card especial:
```
bloco === "materiais" && it.tipo === "mensagem"
  ? <MensagemAcessosCard ... />
  : <ItemCard ... />
```
Renomear/reutilizar o componente `MensagemAcessosCard` como `MensagemDocumentoCard` (genérico) — ou simplesmente continuar usando-o para ambos os blocos, já que o render é idêntico (whitespace-pre-wrap + links + linhas 🔗).

**Header de ações do bloco materiais** (~linha 280): habilitar o botão "Copiar mensagem" também quando `bloco === "materiais"`, usando a mesma lógica:
- Se existir um item com `tipo === "mensagem"`, copia seu `observacao`.
- Caso contrário, monta uma mensagem a partir dos itens existentes (função `construirMensagemMateriais`, análoga a `construirMensagemAcessos`, listando título + link + formato + data + observação).

**`DocumentacaoLoteDialog`** (~linha 690): tratar `materiais` igual a `acessos` na flag de "mensagem única":
- Substituir `const isAcessos = bloco === "acessos"` por `const isMensagemUnica = bloco === "acessos" || bloco === "materiais"`.
- Quando `isMensagemUnica` for verdadeiro, salvar como 1 item único: `tipo: "mensagem"`, `titulo: "Mensagem de materiais"` (para materiais) ou "Mensagem de acessos" (para acessos), e o conteúdo no `observacao`.
- Ajustar textos/placeholders do dialog para referenciar "materiais enviados" no caso `materiais`.

**Botão "Adicionar em lote"** já aparece no bloco `materiais` (a guarda atual é `bloco !== "observacoes"`), então nada a fazer ali — mas o rótulo do botão pode ser ajustado para "Adicionar mensagem completa" quando `bloco === "materiais" || bloco === "acessos"` para refletir melhor o uso.

### 3. Banco de dados
**Nenhuma migração necessária.** A tabela `cliente_documentacao` já tem `tipo text` livre e `observacao text`, e o bloco `materiais` já é suportado. Apenas armazenamos um novo valor de `tipo` ("mensagem") dentro do bloco existente.

## Comportamento final

Na coluna **"Materiais enviados ao cliente"** o usuário verá:
- Botão **"+ Adicionar item"** (cria um material individual com formato/data — igual hoje).
- Botão **"Adicionar mensagem completa"** (abre dialog com textarea grande, salva como 1 item único formatado em estilo WhatsApp).
- Botão **"Copiar mensagem"** (copia a mensagem completa salva, ou monta uma a partir dos itens individuais).
- Itens do tipo "mensagem" são exibidos no card grande estilo WhatsApp (mesmo visual do print de acessos), com botões Copiar / Editar / Excluir.
- Itens individuais continuam aparecendo como cards compactos normais.
