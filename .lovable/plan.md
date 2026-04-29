## Objetivo

Corrigir o "Adicionar em lote" do bloco **Acessos** para que o texto colado seja salvo como **um único item** e exibido **exatamente igual ao print do WhatsApp** (com 🔗, links clicáveis, Login/Senha em texto plano), além de migrar os acessos já cadastrados para esse novo formato.

---

## Mudanças

### 1. Novo tipo de item: "Mensagem completa"

No bloco `acessos` passa a existir um item especial identificado por `tipo = "mensagem"` (novo valor adicionado em `TIPOS_POR_BLOCO.acessos` no `src/store/documentacao.ts`).

- O texto colado é salvo **inteiro** no campo `observacao` (preserva quebras de linha, emojis e formatação).
- `titulo` recebe um valor padrão: `"Mensagem de acessos"` (editável).
- `url`, `login`, `senha` ficam `null`.

### 2. Reescrita do "Adicionar em lote" — apenas para Acessos

No `DocumentacaoLoteDialog` (`src/components/projeto/DocumentacaoTab.tsx`):

- Quando `bloco === "acessos"`:
  - Remove o parser que quebra em vários itens (`parseLoteTexto`) e o badge "X itens detectados".
  - Mostra uma textarea grande com placeholder do formato WhatsApp.
  - Ao salvar, cria **1 único item** (`tipo: "mensagem"`, `observacao: <texto colado>`).
- Para os demais blocos (links, materiais, etc.), o comportamento antigo de lote permanece.

### 3. Renderização idêntica ao print do WhatsApp

Novo componente `MensagemAcessosCard` para itens com `tipo === "mensagem"`:

- Cabeçalho com ícone azul + título e badge "Mensagem".
- Botão **"Copiar tudo"** (copia `observacao` para o clipboard).
- Botões editar/excluir.
- Corpo renderiza o texto preservando quebras de linha (`whitespace-pre-wrap`) e:
  - Detecta URLs (`https?://...`) e transforma em **links clicáveis azuis sublinhados**.
  - Linhas iniciadas por 🔗 ganham destaque em negrito.
  - Linhas `Login:` / `Senha:` ficam com label em negrito + valor em texto plano (sem máscara, conforme solicitado).

Esse card substitui completamente os "cards individuais" no bloco Acessos quando o item é do tipo mensagem.

### 4. Migração dos acessos antigos

Migration SQL única que, para cada `cliente_id` que tenha itens no bloco `acessos`:

1. Constrói uma string formatada estilo WhatsApp concatenando os itens existentes:
   ```
   🔗 <titulo>:
   <url>
   Login: <login>
   Senha: <senha>
   ```
2. Insere **um novo registro** em `cliente_documentacao` com `bloco='acessos'`, `tipo='mensagem'`, `titulo='Mensagem de acessos'`, `observacao=<string montada>`, `ordem=0`.
3. **Apaga** os registros antigos do bloco `acessos` daquele cliente.

Tudo dentro de uma função PL/pgSQL executada uma vez na migration.

### 5. Botão "Copiar mensagem" do bloco

O botão "Copiar mensagem" no toolbar do bloco Acessos passa a:
- Se existir um item `tipo === "mensagem"`, copia direto a `observacao` dele (texto fiel ao WhatsApp).
- Caso contrário, mantém o `construirMensagemAcessos` antigo como fallback.

---

## Detalhes técnicos

**Arquivos editados:**
- `src/store/documentacao.ts` — adiciona `{ value: "mensagem", label: "Mensagem completa" }` em `TIPOS_POR_BLOCO.acessos` e em `DOC_TIPO_LABEL`.
- `src/components/projeto/DocumentacaoTab.tsx`:
  - `DocumentacaoLoteDialog` ramificado por bloco (acessos = textarea simples → 1 item; demais = parser atual).
  - Render do bloco `acessos`: para itens `tipo === "mensagem"` usa `MensagemAcessosCard`; demais (legados, se houver) seguem o card atual.
  - Novo helper `renderMensagemFormatada(texto)` que converte texto plano em JSX com URLs clicáveis e linhas 🔗/Login/Senha estilizadas.

**Migration SQL (nova):**
```sql
-- Migra acessos antigos para o novo formato "mensagem"
DO $$
DECLARE r RECORD; msg TEXT; item RECORD;
BEGIN
  FOR r IN SELECT DISTINCT cliente_id FROM cliente_documentacao WHERE bloco='acessos'
  LOOP
    msg := '';
    FOR item IN
      SELECT * FROM cliente_documentacao
      WHERE cliente_id = r.cliente_id AND bloco='acessos'
      ORDER BY ordem, created_at
    LOOP
      msg := msg || E'\n🔗 ' || COALESCE(item.titulo,'') || E':\n';
      IF item.url IS NOT NULL THEN msg := msg || item.url || E'\n'; END IF;
      IF item.login IS NOT NULL THEN msg := msg || 'Login: ' || item.login || E'\n'; END IF;
      IF item.senha IS NOT NULL THEN msg := msg || 'Senha: ' || item.senha || E'\n'; END IF;
    END LOOP;

    IF length(trim(msg)) > 0 THEN
      INSERT INTO cliente_documentacao (cliente_id, bloco, tipo, titulo, observacao, ordem)
      VALUES (r.cliente_id, 'acessos', 'mensagem', 'Mensagem de acessos', trim(msg), 0);

      DELETE FROM cliente_documentacao
      WHERE cliente_id = r.cliente_id AND bloco='acessos' AND tipo <> 'mensagem';
    END IF;
  END LOOP;
END $$;
```

**Sem impacto em:** Briefing, Planejamento, demais blocos da Documentação (Links, Reuniões, Materiais, Documentos, Observações).
