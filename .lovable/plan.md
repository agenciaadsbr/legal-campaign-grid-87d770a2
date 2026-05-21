
## Causa raiz da etapa 5 duplicada

No Card Pai `cd2313e3` deste cliente existem 3 linhas "Ativar campanha Meta Ads" como filhas do mesmo cp (deveria ter 1). Origem:

1. Template cria a etapa final correta (`0bb9b76d`, order 3, depends_on null).
2. O efeito de normalização em `OperacionalTab.tsx` rodou ANTES dos `createDemanda` do template terminarem (race com optimistic update). Como `etapasAtivar` estava vazia, `escolherFinal` ficou `undefined` e o backfill criou uma etapa nova (`a1c7dacb`).
3. `backfilledRef.current.add(cp.id)` foi chamado antes do `await`, impedindo qualquer retry corretivo na mesma sessão. Em uma recarga posterior o efeito rodou de novo e criou mais uma (`7bd5f87d`).

## Correções

### 1. Migração de limpeza (somente este cliente / cp)
Em `supabase/migrations/<timestamp>_meta_ads_dedup_<cliente>.sql`:
- `DELETE FROM demandas WHERE id IN ('0bb9b76d-...', 'a1c7dacb-...')` (mantém apenas `7bd5f87d`, que é a etapa final correta — bloqueada, order 3, `process_depends_on = b951614b` (aprovação)).
- Garantir via `UPDATE` que `7bd5f87d` esteja com `process_step_order = 3`, `process_step_status = 'bloqueada'`, `process_step_type = 'tarefa'`, `process_depends_on = b951614b`, `responsavel` = Greice/Gleice (já está).
- Escopo: apenas o cp `cd2313e3-5f0b-406b-b924-bea05f171dac`. Nenhum outro Card Pai/cliente afetado.

### 2. `src/components/projeto/OperacionalTab.tsx` — endurecer normalização
Alterar o `useEffect` que normaliza o cp Meta Ads:

- **Guard de estabilidade**: antes de qualquer operação, exigir que existam as 3 etapas-base filhas do cp (`Criar anúncio de imagem`, `Criar/editar anúncio em vídeo`, `Aguardando aprovação do cliente`). Se faltar qualquer uma, `return` sem marcar `backfilledRef` — assim o efeito tenta de novo após o próximo `reload`.
- **Marcar `backfilledRef` somente após o `await` concluir com sucesso** (mover o `add` para o final do bloco `async`).
- **Nunca criar etapa final nova**: se `etapasAtivar.length === 0` e as 3 base existem, aí sim criar. Caso contrário, apenas escolher a melhor e desvincular/excluir as outras.
- **Excluir duplicatas (não só desvincular)** via `deleteDemanda` quando a duplicata não tiver comentários/anexos (campo `process_step_config.backfill === true` ou `created_at` muito próximo do cp). Isso evita acumular entulho.

### 3. Não alterar
- `src/lib/cardPaiTemplates.ts` (template `meta_ads` já tem 4 etapas corretas).
- Modelo `google_ads`.
- Layout do modal Detalhes da Tarefa.
- Lógica geral do Workflow / outras estruturas de Card Pai.

## Verificação

1. Após migração: abrir o cliente → aba Operacional → Card Pai "Ativar campanha Meta Ads" mostra "Etapas do Processo (4)" com Imagem, Vídeo, Aguardando aprovação, Ativar campanha (bloqueada).
2. Criar um novo Card Pai Meta Ads em outro cliente de teste: nasce com exatamente 4 etapas; recarregar a página não cria 5ª.
3. Confirmar que nenhum dado de cliente/etapa fora do escopo foi tocado.

## Resultado esperado

O Card Pai "Ativar campanha Meta Ads" exibe exatamente 4 etapas, na ordem correta, e a etapa final permanece bloqueada até a aprovação. O bug de duplicação não pode mais ocorrer mesmo em condição de race.
