## Objetivo

Atualizar a lista curada de modelos do card "OpenAI / GPT — Análise com IA" para refletir os modelos da imagem enviada:

1. GPT-4o mini · rápido e barato
2. GPT-4o · qualidade alta
3. GPT-4.1 mini · contexto longo
4. GPT-4.1 · raciocínio forte
5. GPT-5 mini · novo
6. GPT-5 · top de linha

## Mudança

Editar `supabase/functions/_shared/ai-gateway.ts` — array `CURATED_MODELS.gpt` para conter exatamente esses 6 itens, com `id`, `label` e `descricao` correspondentes.

## Detalhes técnicos

IDs usados (formato Lovable AI Gateway):

```text
openai/gpt-4o-mini   → GPT-4o mini · rápido e barato
openai/gpt-4o        → GPT-4o · qualidade alta
openai/gpt-4.1-mini  → GPT-4.1 mini · contexto longo
openai/gpt-4.1       → GPT-4.1 · raciocínio forte
openai/gpt-5-mini    → GPT-5 mini · novo
openai/gpt-5         → GPT-5 · top de linha
```

`pricing` aproximado mantido para cálculo de custo na sparkline. `defaultModelFor("gpt")` continua retornando o segundo item (agora `gpt-4o`).

Após salvar o arquivo, o usuário deve clicar em **Atualizar Configuração** no card para que `ia-list-models` repopule `ia_config.modelos_disponiveis` com a nova lista.

## Aviso importante

O Lovable AI Gateway oficialmente lista apenas a família **GPT-5** (gpt-5, gpt-5-mini, gpt-5-nano) e variantes 5.x como modelos OpenAI suportados. Os IDs `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini` **podem não estar disponíveis no gateway** — chamadas reais a esses modelos podem retornar erro. Se confirmado que falham, a recomendação é mapeá-los internamente para equivalentes GPT-5 (ex: `gpt-4o-mini` → `gpt-5-nano`, `gpt-4o` → `gpt-5`) mantendo apenas o label visível ao usuário. Posso aplicar esse fallback se preferir.

## Escopo

- 1 arquivo alterado: `supabase/functions/_shared/ai-gateway.ts`
- Sem migração de banco, sem alteração de UI, sem mudança em outras edge functions.
