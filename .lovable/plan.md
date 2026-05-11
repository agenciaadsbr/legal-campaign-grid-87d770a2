## Objetivo

Permitir usar a **chave própria da OpenAI** (provedor externo) para o card "OpenAI / GPT", em vez do Lovable AI Gateway. Gemini continua via Lovable AI Gateway.

## Mudanças

### 1. Secret novo
- Adicionar `OPENAI_API_KEY` via tool de secrets (usuário cola a chave `sk-...` da plataforma OpenAI).

### 2. `supabase/functions/_shared/ai-gateway.ts`
- Criar helper `createOpenAIDirectProvider(apiKey)` usando `@ai-sdk/openai` apontando para `https://api.openai.com/v1`.
- Nova função `getProviderClient(provider)` que retorna:
  - `provider === "gpt"` → cliente OpenAI direto com `OPENAI_API_KEY`; se faltar, erro claro "Configure OPENAI_API_KEY".
  - `provider === "gemini"` → Lovable AI Gateway com `LOVABLE_API_KEY`.
- Ajustar IDs dos modelos GPT removendo o prefixo `openai/` quando chamados direto na OpenAI (ex.: `gpt-4o-mini`), mantendo o label e o `id` exibido na UI. Mapeamento interno `id → modelId real`.
- Manter `CURATED_MODELS.gpt` igual (lista da imagem aprovada anteriormente).

### 3. Edge functions afetadas
Trocar a construção do cliente para usar `getProviderClient(cfg.provider)`:
- `ia-test-connection/index.ts`
- `ia-list-models/index.ts`
- `ia-gerar-resumo/index.ts`
- `ia-gerar-tarefas/index.ts`

`ia-test-connection` deve retornar erro 400 amigável quando provider=gpt e `OPENAI_API_KEY` ausente, para a UI mostrar "Configure a chave da OpenAI".

### 4. UI — `IAProviderCard.tsx`
- No card do GPT, adicionar pequeno badge/aviso: "Usando chave própria da OpenAI (`OPENAI_API_KEY`)".
- Se o teste falhar com erro de chave ausente, mostrar CTA textual: "Adicione a secret OPENAI_API_KEY nas configurações do projeto".
- Card do Gemini continua mostrando "Via Lovable AI".

### 5. Sem migração de banco
Estrutura de `ia_config` permanece; só muda o transporte das chamadas.

## Detalhes técnicos

- Pacote: `@ai-sdk/openai` já é compatível com a versão de `ai` em uso (`npm:ai`). Import em Deno: `npm:@ai-sdk/openai`.
- Custos: `estimateCost` continua usando o mesmo `CURATED_MODELS.gpt.pricing` (preços públicos da OpenAI), agora refletindo o gasto real na conta do usuário.
- Segurança: `OPENAI_API_KEY` fica só em edge functions via `Deno.env.get`, nunca exposta ao frontend.
- Rate-limit/erros: respostas 401/429/insufficient_quota da OpenAI são propagadas com mensagem amigável.

## Fluxo após implementação
1. Usuário adiciona `OPENAI_API_KEY` (prompt de secret).
2. Em Configurações → IA, ativa o card GPT, escolhe modelo, clica **Testar Conexão** → chamada vai direto para `api.openai.com`.
3. Resumos e tarefas com IA usam a chave própria.
