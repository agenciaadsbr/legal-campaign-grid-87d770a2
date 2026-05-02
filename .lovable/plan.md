
## Nova aba "Documentos" em Configurações

Centralizar templates de documentos da empresa e aplicar automaticamente em novos clientes na aba `Documentação` do Projeto Completo.

---

### 1. Banco de dados (migração)

**Tabela nova: `documentos_globais`** (templates da empresa — não pertence a cliente nenhum)

Colunas:
- `id` uuid PK
- `escopo` text — `"cliente"` (padrão p/ clientes) ou `"interno"` (uso da equipe)
- `titulo` text not null
- `tipo` text — reutiliza valores de `TIPOS_POR_BLOCO` (ex.: `boas_vindas`, `treinamento`, `script`...)
- `bloco` text — `"acessos" | "links" | "reunioes" | "materiais" | "documentos"` (em qual bloco vai cair na Documentação do cliente). Padrão `materiais`.
- `categoria` text — Boas-vindas, Treinamento, Comercial, CRM/Automação, Atendimento, Tráfego Pago, Documentos gerais, Outros
- `descricao` text
- `url` text (link)
- `arquivo_url` text (anexo opcional via bucket `anexos`)
- `login`, `senha` text (opcional, p/ acessos padrão)
- `observacao_interna` text
- `aplicar_automatico` boolean default `true` (só efetivo p/ escopo `cliente`)
- `permissao_acesso` text — `"todos" | "admin"` (default `todos`; usado apenas p/ escopo interno)
- `ativo` boolean default `true`
- `ordem` int default `0`
- `created_at`, `updated_at` timestamptz

RLS:
- SELECT: `authenticated` true (interno filtrado no app pela `permissao_acesso`)
- INSERT/UPDATE/DELETE: somente `has_role(auth.uid(), 'admin')`

Trigger `set_updated_at` no UPDATE.

**Tabela `cliente_documentacao`** — adicionar coluna opcional:
- `origem_global_id` uuid null — referência fraca ao `documentos_globais.id` (rastreia origem; permite marcar "já aplicado")
- `enviado` boolean default `false`
- `data_envio` timestamptz null

Isso permite saber quais documentos padrão já foram copiados para um cliente (evita duplicar ao "Aplicar manualmente").

---

### 2. Frontend — Configurações

**`src/pages/Configuracoes.tsx`**: adicionar nova aba `"Documentos"` (apenas se `isAdmin`), na ordem solicitada (após Demandas).

**Novo componente: `src/components/configuracoes/DocumentosGlobaisManager.tsx`**

Estrutura:
- Sub-tabs: `"Documentos padrão para clientes"` (escopo=`cliente`) | `"Documentos internos da empresa"` (escopo=`interno`)
- Toolbar: busca por título, filtro por categoria, filtro por tipo, botão `Novo documento`
- Lista (cards/tabela) com: título, categoria, tipo, bloco, badge "Auto" se `aplicar_automatico`, badge "Inativo" se `!ativo`
- Ações por item: editar, duplicar, ativar/desativar, excluir, drag para reordenar (ou setas ↑↓)

**Novo componente: `src/components/configuracoes/DocumentoGlobalDialog.tsx`**

Form com todos os campos. Para escopo `cliente` mostra `aplicar_automatico` + `bloco`. Para escopo `interno` mostra `permissao_acesso` (e esconde `aplicar_automatico`, mas permite marcar — quando marcado, vira `aplicar_automatico=true`).

**Novo store: `src/store/documentosGlobais.ts`** — Zustand igual aos outros stores (load, create, update, remove, duplicate, toggleAtivo) + realtime na tabela `documentos_globais`.

---

### 3. Aplicação automática em novos clientes

Em `src/store/crm.ts` → função `addCliente`, após criar o cliente com sucesso, fazer:

```ts
const { data: globais } = await supabase
  .from("documentos_globais")
  .select("*")
  .eq("escopo", "cliente")
  .eq("ativo", true)
  .eq("aplicar_automatico", true)
  .order("ordem");

if (globais?.length) {
  await supabase.from("cliente_documentacao").insert(
    globais.map((g, i) => ({
      cliente_id: inserted.id,
      bloco: g.bloco ?? "materiais",
      tipo: g.tipo ?? "material",
      titulo: g.titulo,
      url: g.url ?? null,
      login: g.login ?? null,
      senha: g.senha ?? null,
      observacao: g.descricao ?? null,
      ordem: i,
      origem_global_id: g.id,
    }))
  );
}
```

Não bloqueia criação de cliente em caso de erro (toast warning).

---

### 4. Aba Documentação do Projeto (cliente)

Em `src/components/projeto/DocumentacaoTab.tsx`:

- **Botão novo no toolbar**: `"Aplicar documentos padrão"` — chama edge function/cliente que busca `documentos_globais` ativos com `aplicar_automatico=true` e cria apenas os que ainda não existem para esse cliente (filtrando por `origem_global_id`). Toast com qtd inserida / qtd já existente.
- **Identificação visual**: itens com `origem_global_id` ganham um badge `"Padrão"` (cor sutil) + tooltip "Vem de Configurações > Documentos".
- Edição/exclusão do item no cliente continua funcionando normalmente — não toca no global (já garantido pela arquitetura: cópia, não referência).
- **Campos novos editáveis** no item: checkbox `Marcado como enviado` + `Data de envio` (preenche `enviado` e `data_envio` em `cliente_documentacao`).

Não criar nova seção visual separada — manter agrupamento atual por bloco; o badge `Padrão` já diferencia. (Se preferirem seção separada "Materiais padrão da empresa", dá pra adicionar — confirmar se quiser; por padrão mantenho agrupamento atual para não duplicar UI.)

---

### 5. Permissões

- Aba `Configurações > Documentos`: visível só para `isAdmin` (já é o padrão das outras abas admin).
- RLS na tabela `documentos_globais`: writes só para admin.
- Documentos internos com `permissao_acesso='admin'`: filtrados no client (lista só admins veem) — RLS adicional não necessária pois a aba inteira é admin-only.

---

### 6. Detalhes técnicos

**Arquivos novos:**
- `src/store/documentosGlobais.ts`
- `src/components/configuracoes/DocumentosGlobaisManager.tsx`
- `src/components/configuracoes/DocumentoGlobalDialog.tsx`
- migração SQL (criar tabela + colunas + RLS + trigger)

**Arquivos editados:**
- `src/pages/Configuracoes.tsx` — adicionar TabTrigger + TabContent
- `src/store/crm.ts` — `addCliente` aplica padrões automáticos
- `src/store/documentacao.ts` — incluir `origem_global_id`, `enviado`, `data_envio` na interface e payloads
- `src/components/projeto/DocumentacaoTab.tsx` — botão "Aplicar documentos padrão", badge "Padrão", campos enviado/data_envio no dialog de item

**Compatibilidade:** Documentos já existentes nos clientes não são tocados. Cliente antigo recebe documentos padrão apenas via ação manual `Aplicar documentos padrão`.

**Validação manual:** seguir o roteiro de 10 passos do briefing após implementação.
